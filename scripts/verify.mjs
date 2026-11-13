#!/usr/bin/env node
/**
 * 交付前自检：不启动 DSH，只证明"包是自洽的"。
 *
 * 检查项：
 * 1. 根 ESM 入口能导入，导出 name/apply；
 * 2. dist/client.js 能编译、只有一个 ModuleLoader 调用、包含各模块的痕迹；
 * 3. dist/client.js 与各模块 client.js 的哈希一致（防止忘了 build）；
 * 4. 每个模块的 UPSTREAM.json 与本地文件一致（防止手改模块文件）。
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0

/**
 * @param {boolean} condition - 断言。
 * @param {string} message - 失败信息。
 */
function check(condition, message) {
  if (condition) {
    console.log(`ok   ${message}`)
  } else {
    failures += 1
    console.error(`FAIL ${message}`)
  }
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
check(pkg.type === 'module', 'package.json 是 ESM')
check(pkg.name === 'dsh-improvements', '包名是 dsh-improvements')
check(pkg.dsh?.bundle?.patch === './cordis.patch.yml', '声明了 bundle patch')
check(Array.isArray(pkg.dsh?.client?.inject) && pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-chat'), 'client inject 含 ui-chat')
check(pkg.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-ui-settings'), 'client inject 含 ui-settings')

const entry = await import(pathToFileURL(join(ROOT, 'index.js')).href)
check(entry.name === 'dsh-improvements', '根插件导出 name')
check(typeof entry.apply === 'function', '根插件导出 apply')

const clientFile = join(ROOT, 'dist', 'client.js')
check(existsSync(clientFile), 'dist/client.js 存在')
if (existsSync(clientFile)) {
  const client = readFileSync(clientFile, 'utf8')
  try {
    // 只编译不执行：能抓语法错误，又不会碰 window。
    new Function(client)
    console.log('ok   dist/client.js 语法可编译')
  } catch (error) {
    failures += 1
    console.error(`FAIL dist/client.js 语法错误：${error.message}`)
  }
  check(client.includes("id: 'dsh-improvements'"), 'client bundle id 正确')
  check((client.match(/__ModuleLoader__\.load\(/g) || []).length === 1, 'client bundle 只有一个 ModuleLoader 入口')
  check(client.includes("NS = 'context-usage'"), 'client bundle 含 context-usage')
  check(client.includes("'mcpLazy'"), 'client bundle 含 mcp-lazy')
}

const manifestFile = join(ROOT, 'dist', 'client.manifest.json')
check(existsSync(manifestFile), 'dist/client.manifest.json 存在')
if (existsSync(manifestFile)) {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
  for (const mod of manifest.modules) {
    const source = readFileSync(join(ROOT, mod.file), 'utf8')
    const hash = createHash('sha256').update(source).digest('hex')
    check(hash === mod.sha256, `${mod.dir} 的 client.js 与 dist 快照一致（否则先 npm run build）`)
  }
}

const moduleDirs = ['context-usage', 'mcp-lazy', 'destructive-guard', 'computer-use']
for (const dir of moduleDirs) {
  const upstreamFile = join(ROOT, 'modules', dir, 'UPSTREAM.json')
  check(existsSync(upstreamFile), `${dir} 有 UPSTREAM.json`)
  if (!existsSync(upstreamFile)) continue
  const upstream = JSON.parse(readFileSync(upstreamFile, 'utf8'))
  let localOk = true
  for (const [rel, hash] of Object.entries(upstream.files)) {
    const file = join(ROOT, 'modules', dir, rel)
    if (!existsSync(file)) {
      localOk = false
      console.error(`     缺失：modules/${dir}/${rel}`)
      continue
    }
    const actual = createHash('sha256').update(readFileSync(file)).digest('hex')
    if (actual !== hash) {
      localOk = false
      console.error(`     被改过：modules/${dir}/${rel}`)
    }
  }
  check(localOk, `${dir} 的本地文件与 UPSTREAM.json 一致`)
}

if (failures > 0) {
  console.error(`\n${failures} 项失败`)
  process.exit(1)
}
console.log('\n全部通过。')
