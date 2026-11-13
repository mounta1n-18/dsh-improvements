/**
 * dsh-destructive-guard — 破坏性命令护栏（Host 半）。
 *
 * 管道位置：
 * - `tools/pre-execute`：返回 deny / ask，给出模型可读的理由；
 * - `tools.guard`：单调守卫，拦截 block 级命令，后续监听器无法把它改回允许。
 *
 * 只审查 shell 类工具（pwsh / bash / terminal / shell）的 command 参数；不注册工具，
 * 不注入提示词，不读写文件（除自身模块加载外）。判定是纯字符串分析，见 rules.mjs。
 */

import { createRequire } from 'node:module'

import { classify, classifyFileWrite, RULES, PROTECTED_ROOTS, WRITE_PROTECTED_COUNT } from './rules.mjs'

export const name = 'dsh-destructive-guard'

// 版本号只认 package.json，避免三处手写漂移。
const { version: VERSION } = createRequire(import.meta.url)('./package.json')
const GUARDED_TOOLS = new Set(['pwsh', 'bash', 'terminal', 'shell', 'cmd'])
const FILE_TOOLS = new Set(['write', 'edit', 'apply_patch', 'str_replace_editor'])
const STATUS_ROUTE = '/dsh-destructive-guard/status'
const CHECK_ROUTE = '/dsh-destructive-guard/check'

function commandOf(exec) {
  const args = exec?.arguments
  if (!args || typeof args !== 'object') return ''
  const raw = args.command ?? args.cmd ?? args.script
  return typeof raw === 'string' ? raw : ''
}

/**
 * @returns {{verdict:'block'|'ask'|'allow', rule?:string, reason?:string}}
 */
function inspect(exec) {
  if (process.env.DSH_GUARD === 'off') return { verdict: 'allow' }
  const name = String(exec?.name || '')
  if (FILE_TOOLS.has(name)) return classifyFileWrite(name, exec?.arguments ?? {})
  if (!GUARDED_TOOLS.has(name)) return { verdict: 'allow' }
  const command = commandOf(exec)
  if (!command) return { verdict: 'allow' }
  return classify(command)
}

/**
 * 当前会话的有效 approval policy：会话日志里的最后一次切换 > approval 插件的配置默认值 > `'ask'`。
 * 读不到时按 `'ask'` 处理（只影响 ask 是否降级，不影响 block 拦截本身）。
 * @returns {'ask'|'never'}
 */
function policyOf(ctx, exec) {
  try {
    const approval = ctx.get?.('approval')
    if (!approval) return 'ask'
    const sessions = ctx.get?.('sessions')
    const agent = exec?.agent
    const session = agent && typeof sessions?.get === 'function' ? sessions.get(agent.id) : undefined
    if (session && typeof approval.overrideOf === 'function') {
      const override = approval.overrideOf(session)
      if (override === 'never' || override === 'ask') return override
    }
    return approval.config?.policy === 'never' ? 'never' : 'ask'
  } catch (error) {
    ctx.logger?.warn?.(`dsh-guard: 读取 approval policy 失败，按 ask 处理：${String(error)}`)
    return 'ask'
  }
}

function sendJson(res, code, value) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 200_000) {
        reject(new Error('body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

export function apply(ctx) {
  ctx.inject(['tools'], (toolCtx) => {
    // 可读的拒绝/确认理由（模型能看到 reason）。
    toolCtx.effect(
      () =>
        toolCtx.on('tools/pre-execute', async (exec, next) => {
          try {
            const result = inspect(exec)
            if (result.verdict === 'block') {
              ctx.logger?.warn?.(`dsh-guard: 拦截 ${result.rule}（${exec?.name}）`)
              return { kind: 'deny', reason: result.reason }
            }
            if (result.verdict === 'ask') {
              // policy=never 时 DSH 会把 ask 确定性拒绝，模型只看到“工具失败”，
              // 不知道是哪条规则、为什么。这里显式降级成 deny，把理由写全。
              if (policyOf(ctx, exec) === 'never') {
                ctx.logger?.warn?.(`dsh-guard: ${result.rule} 需要确认，但 policy=never，降级为拒绝（${exec?.name}）`)
                return {
                  kind: 'deny',
                  reason: `${result.reason} 当前会话 approval policy = never：不会弹出确认，ask 会被确定性拒绝，因此这里显式降级为 deny。要执行请把权限预设切回 ask 档后重试。`,
                }
              }
              ctx.logger?.info?.(`dsh-guard: 需要确认 ${result.rule}（${exec?.name}）`)
              return { kind: 'ask', reason: result.reason }
            }
          } catch (error) {
            // 判定失败必须放行，不能把整个工具链卡死。
            ctx.logger?.warn?.(`dsh-guard: 判定异常，放行：${String(error)}`)
          }
          return next()
        }),
      'destructive guard pre-execute',
    )

    // 单调守卫：兜住 block 级，防止后续 pre-execute 监听器改回允许。
    if (typeof toolCtx.tools?.guard === 'function') {
      toolCtx.effect(
        () =>
          toolCtx.tools.guard((exec) => {
            try {
              const result = inspect(exec)
              return result.verdict === 'block' ? result.reason : undefined
            } catch {
              return undefined
            }
          }),
        'destructive guard monotonic',
      )
    }
  })

  // 只读状态 / 判定接口：check 不执行命令，只跑纯函数，供人工与测试用。
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => {
      const disposers = [
        webCtx.webServer.register({
          kind: 'exact',
          path: STATUS_ROUTE,
          handler: (_req, res) => {
            sendJson(res, 200, {
              version: VERSION,
              enabled: process.env.DSH_GUARD !== 'off',
              guardedTools: [...GUARDED_TOOLS],
              fileTools: [...FILE_TOOLS],
              protectedRoots: PROTECTED_ROOTS.length,
              fileWriteTargets: WRITE_PROTECTED_COUNT,
              rules: RULES.map(([id, level, description]) => ({ id, level, description })),
            })
          },
        }),
        webCtx.webServer.register({
          kind: 'exact',
          path: CHECK_ROUTE,
          handler: async (req, res) => {
            if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' })
            try {
              const body = JSON.parse(await readBody(req))
              if (body?.file_path) {
                return sendJson(res, 200, classifyFileWrite(String(body.tool || 'write'), body))
              }
              const command = String(body?.command ?? '')
              if (!command) return sendJson(res, 400, { error: 'command required' })
              sendJson(res, 200, classify(command))
            } catch (error) {
              sendJson(res, 400, { error: String(error?.message || error) })
            }
          },
        }),
      ]
      return () => {
        for (const dispose of disposers) dispose()
      }
    }, 'destructive guard routes')
  })
}
