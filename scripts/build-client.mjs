#!/usr/bin/env node
/**
 * 把各模块自带的 Client 半身合并成**一个** `dist/client.js`。
 *
 * 为什么必须合并：DSH 的 `dsh.client` 是"每个包一份"，浏览器模块 id 就是解析后的
 * 包名；subpath、相对路径的 client.js 都不能各自注册。所以六个（现在是三个有 UI 的）
 * Client 插件只能共用一个入口。
 *
 * 做法：每个模块的 client.js 仍是上游原样的
 * `window.__ModuleLoader__.load({ id, factory(require) { ... } })`；
 * 这里只剥掉外层壳，把 factory 体包进一个独立函数作用域，逐个调用，
 * 最后返回一个聚合插件。这样：
 * - 模块之间不会发生顶层变量冲突（各自有函数作用域）；
 * - 一个模块的 apply 抛错不影响其他模块；
 * - 模块文件保持上游原样，sync 脚本可以整文件覆盖。
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 有 Client 半身的模块，按页面挂载顺序排列。 */
const CLIENT_MODULES = [
  { dir: 'index-adjust', inject: ['slots', 'locale', 'contextMenus', 'workspaces', 'sessions', 'uiWorkspace'] },
  { dir: 'context-usage', inject: ['slots', 'locale', 'commandUi'] },
  { dir: 'mcp-lazy', inject: ['slots', 'locale'] },
]

/** 聚合插件的浏览器模块 id（与包名一致最不容易混淆）。 */
const CLIENT_ID = 'dsh-improvements'

/**
 * 从上游 client.js 里剥出 factory 函数体。
 *
 * @param {string} file - 源文件绝对路径。
 * @returns {string} factory 体源码。
 */
function extractFactoryBody(file) {
  const src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const head = /factory\s*\(\s*require\s*\)\s*\{/.exec(src)
  if (!head) throw new Error(`${relative(ROOT, file)}: 找不到 factory(require) {`)

  const start = head.index + head[0].length
  // 包装壳的最后三行固定是 "  }," + "})"；用最后出现的位置，避开函数体里的花括号。
  const tail = '\n  },\n})'
  const end = src.lastIndexOf(tail)
  if (end < 0) throw new Error(`${relative(ROOT, file)}: 找不到结尾的 "  },\\n})"`)
  if (src.slice(end + tail.length).trim() !== '') {
    throw new Error(`${relative(ROOT, file)}: 结尾之外还有内容，拒绝猜测`)
  }
  const body = src.slice(start, end)
  if (!body.includes('apply')) throw new Error(`${relative(ROOT, file)}: factory 体里没有 apply`)
  return body
}

/**
 * @param {string} text - 任意文本。
 * @returns {string} 十六进制 sha256。
 */
function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

const parts = []
const manifest = []
const inject = []

for (const mod of CLIENT_MODULES) {
  const file = join(ROOT, 'modules', mod.dir, 'client.js')
  const body = extractFactoryBody(file)
  const source = readFileSync(file, 'utf8')
  parts.push({ dir: mod.dir, body })
  manifest.push({ dir: mod.dir, file: relative(ROOT, file), bytes: Buffer.byteLength(source), sha256: sha256(source) })
  for (const service of mod.inject) {
    if (!inject.includes(service)) inject.push(service)
  }
}

const partBlocks = parts.map(({ dir, body }) => [
  `    // ---- ${dir} ----`,
  `    __parts.push(['${dir}', (function (require) {`,
  body,
  `    })(require)])`,
].join('\n')).join('\n\n')

const out = `/* 由 scripts/build-client.mjs 生成，不要手改。
 * 来源模块：${parts.map((p) => p.dir).join('、')}
 * 重新生成：npm run build
 */
window.__ModuleLoader__.load({
  id: '${CLIENT_ID}',
  factory(require) {
    const __parts = []

${partBlocks}

    const __report = (label, error) => {
      const detail = error && error.stack ? error.stack : String(error)
      try {
        console.warn('[dsh-improvements] client module ' + label + ' failed: ' + detail)
      } catch {
        // 控制台不可用时也不能再抛。
      }
    }

    return {
      inject: ${JSON.stringify(inject)},
      apply(ctx) {
        for (const [label, plugin] of __parts) {
          try {
            const result = plugin && typeof plugin.apply === 'function' ? plugin.apply(ctx) : undefined
            if (result && typeof result.then === 'function') {
              result.then(undefined, (error) => __report(label, error))
            }
          } catch (error) {
            __report(label, error)
          }
        }
      },
    }
  },
})
`

mkdirSync(join(ROOT, 'dist'), { recursive: true })
writeFileSync(join(ROOT, 'dist', 'client.js'), out, 'utf8')
writeFileSync(
  join(ROOT, 'dist', 'client.manifest.json'),
  JSON.stringify({ clientId: CLIENT_ID, modules: manifest }, null, 2) + '\n',
  'utf8',
)

console.log(`built dist/client.js (${Buffer.byteLength(out)} bytes) from ${parts.length} module(s)`)
for (const mod of manifest) console.log(`  - ${mod.dir}  ${mod.bytes}B  ${mod.sha256.slice(0, 12)}`)
