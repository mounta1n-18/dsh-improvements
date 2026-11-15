/**
 * dsh-improvements — 一个 DSH 插件，内装多个各自独立的小模块。
 *
 * 装配层只做三件事：
 * 1. 按配置逐个启用模块；
 * 2. 用 `ctx.inject(deps, ...)` 复现各模块原本的"等服务就绪再加载"语义，
 *    依赖表直接取模块自己导出的 `inject`，不在这里手抄第二份；
 * 3. 把每个模块的加载隔离起来——一个模块坏了，其余照常工作。
 *
 * 模块代码本身保持上游原样，方便 `scripts/sync-modules.mjs` 从各源包重新同步。
 *
 * @module dsh-improvements
 */

import * as computerUse from './modules/computer-use/index.js'
import * as contextUsage from './modules/context-usage/index.js'
import * as destructiveGuard from './modules/destructive-guard/index.js'
import * as indexAdjust from './modules/index-adjust/index.js'
import * as mcpLazy from './modules/mcp-lazy/index.js'

/** Cordis 插件身份（Loader 诊断与插件页显示用）。 */
export const name = 'dsh-improvements'

/**
 * 模块清单。顺序有意义：护栏先挂上，后面的模块出错也不会绕过它。
 */
const MODULES = [
  { key: 'guard', label: 'destructive-guard', plugin: destructiveGuard },
  { key: 'indexAdjust', label: 'index-adjust', plugin: indexAdjust },
  { key: 'mcpLazy', label: 'mcp-lazy', plugin: mcpLazy },
  { key: 'computerUse', label: 'computer-use', plugin: computerUse },
  { key: 'contextUsage', label: 'context-usage', plugin: contextUsage },
]

/**
 * 把行配置里的一个键归一成「是否启用 + 传给模块的配置」。
 *
 * 接受三种写法：
 * - `false` / `{ enabled: false }` → 关闭；
 * - `true` / 缺省 → 开启，模块收到 `{}`；
 * - 对象 → 开启，对象原样传入。
 *
 * @param {unknown} config - 整行 config。
 * @param {string} key - 模块键。
 * @returns {{enabled: boolean, value: object}}
 */
function resolveModule(config, key) {
  const raw = config !== null && typeof config === 'object' ? config[key] : undefined
  if (raw === false) return { enabled: false, value: {} }
  if (raw === true || raw === undefined || raw === null) return { enabled: true, value: {} }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.enabled === false) return { enabled: false, value: raw }
    return { enabled: true, value: raw }
  }
  return { enabled: true, value: {} }
}

/**
 * 跑一个模块，吞掉它自己的加载错误。
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - 目标上下文。
 * @param {{label: string, plugin: object}} mod - 模块描述。
 * @param {object} value - 模块配置。
 * @param {(message: string) => void} log - 统一日志。
 */
function runModule(ctx, mod, value, log) {
  try {
    const result = mod.plugin.apply(ctx, value)
    if (result && typeof result.then === 'function') {
      result.then(undefined, (error) => log(`模块 ${mod.label} 异步加载失败：${describe(error)}`))
    }
  } catch (error) {
    log(`模块 ${mod.label} 加载失败，已跳过：${describe(error)}`)
  }
}

/**
 * @param {unknown} error - 任意异常。
 * @returns {string} 可读描述。
 */
function describe(error) {
  if (error && typeof error === 'object' && typeof error.stack === 'string') return error.stack
  return String(error)
}

/**
 * 模块自己声明的 Host 服务依赖；没有导出就当作无依赖。
 *
 * @param {object} plugin - 模块命名空间。
 * @returns {string[]} 服务名列表。
 */
function dependenciesOf(plugin) {
  const declared = plugin?.inject
  if (Array.isArray(declared)) return declared.filter((name) => typeof name === 'string')
  if (declared && Array.isArray(declared.required)) return declared.required.filter((name) => typeof name === 'string')
  return []
}

/**
 * 挂载整个改进包。
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host 插件上下文。
 * @param {object} [config] - 行配置，按模块键分组。
 */
export function apply(ctx, config = {}) {
  const log = (message) => {
    try {
      ctx.logger?.warn?.(`[dsh-improvements] ${message}`)
    } catch {
      // 日志失败不能影响加载。
    }
  }

  for (const mod of MODULES) {
    const { enabled, value } = resolveModule(config, mod.key)
    if (!enabled) {
      log(`模块 ${mod.label} 已按配置关闭`)
      continue
    }
    const deps = dependenciesOf(mod.plugin)
    if (deps.length === 0) {
      runModule(ctx, mod, value, log)
      continue
    }
    try {
      ctx.inject(deps, (scoped) => runModule(scoped, mod, value, log))
    } catch (error) {
      log(`模块 ${mod.label} 等待依赖失败，已跳过：${describe(error)}`)
    }
  }
}
