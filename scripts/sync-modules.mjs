#!/usr/bin/env node
/**
 * 从各源包同步模块源码，并记录可核对的上游快照。
 *
 * 设计目标：源包在各自的会话里持续更新，这里只做"整文件搬运 + 哈希记账"，
 * 不在搬运时改代码。需要适配的差异留在装配层（根 index.js / 构建脚本）。
 *
 * 用法：
 *   node scripts/sync-modules.mjs                 # 同步全部已接入模块，然后重建 client
 *   node scripts/sync-modules.mjs --check         # 只检查漂移，不写文件
 *   node scripts/sync-modules.mjs --module mcp-lazy
 *   node scripts/sync-modules.mjs --no-build
 *   node scripts/sync-modules.mjs --module index-adjust   # 显式同步尚未接入的模块
 */

import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_ROOT = process.env.DSH_IMPROVEMENTS_SOURCES || 'C:/DSH Plugin'

/**
 * 每个模块：源目录 + 要搬的文件/目录。
 * 目录会递归复制；__pycache__、.git、*.pyc、*.tgz 一律跳过。
 */
const MODULES = {
  'context-usage': {
    source: 'dsh-context-usage',
    include: ['index.js', 'client.js', 'locale'],
  },
  'mcp-lazy': {
    source: 'dsh-mcp-lazy',
    include: ['index.js', 'client.js', 'lib', 'locale'],
  },
  'destructive-guard': {
    source: 'dsh-destructive-guard',
    include: ['index.js', 'rules.mjs', 'package.json'],
  },
  'computer-use': {
    source: 'dsh-computer-use',
    include: ['index.js', 'lib', 'python', 'skills', 'assets/whale.png'],
  },
  'index-adjust': {
    source: 'dsh-index-adjust',
    include: ['index.js', 'client.js', 'icon.svg'],
  },
}

const SKIP_DIRS = new Set(['__pycache__', '.git', 'node_modules', '_preview'])
const SKIP_EXT = new Set(['.pyc', '.tgz'])

/**
 * @param {string} file - 文件路径。
 * @returns {string} 十六进制 sha256。
 */
function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

/**
 * 列出目录下应搬运的文件（相对路径，统一用 /）。
 *
 * @param {string} dir - 绝对目录。
 * @param {string} base - 复制基准目录。
 * @param {string[]} out - 收集器。
 * @returns {string[]} 相对路径列表。
 */
function walk(dir, base, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(full, base, out)
      continue
    }
    if (!entry.isFile()) continue
    if (SKIP_EXT.has(entry.name.slice(entry.name.lastIndexOf('.')))) continue
    out.push(relative(base, full).split('\\').join('/'))
  }
  return out
}

/**
 * @param {string} sourceDir - 源包目录。
 * @param {string} include - 文件或目录（相对源包）。
 * @returns {string[]} 相对路径。
 */
function collect(sourceDir, include) {
  const full = join(sourceDir, include)
  if (!existsSync(full)) throw new Error(`源路径不存在：${full}`)
  const stat = statSync(full)
  if (stat.isFile()) return [include.split('\\').join('/')]
  return walk(full, sourceDir).filter((rel) => rel === include || rel.startsWith(include + '/'))
}

/**
 * 读取源包 package.json 的 name/version（没有就返回 undefined）。
 *
 * @param {string} sourceDir - 源包目录。
 * @returns {{name?: string, version?: string}|undefined} 上游身份。
 */
function upstreamIdentity(sourceDir) {
  const file = join(sourceDir, 'package.json')
  if (!existsSync(file)) return undefined
  try {
    const pkg = JSON.parse(readFileSync(file, 'utf8'))
    return { name: pkg.name, version: pkg.version }
  } catch {
    return undefined
  }
}

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const noBuild = args.includes('--no-build')
const onlyIndex = args.indexOf('--module')
const only = onlyIndex >= 0 ? args[onlyIndex + 1] : undefined

if (only && !MODULES[only]) {
  console.error(`未知模块：${only}（可选：${Object.keys(MODULES).join('、')}）`)
  process.exit(2)
}

let drift = false
let synced = 0

for (const [name, mod] of Object.entries(MODULES)) {
  if (only && only !== name) continue
  if (!only && mod.pending) {
    console.log(`skip  ${name}（尚未接入，修复版落地后加进 MODULES 并移除 pending）`)
    continue
  }

  const sourceDir = resolve(SOURCE_ROOT, mod.source)
  if (!existsSync(sourceDir)) {
    console.error(`missing ${name}: ${sourceDir}`)
    process.exitCode = 1
    continue
  }

  const files = [...new Set(mod.include.flatMap((include) => collect(sourceDir, include)))].sort()
  const localDir = join(ROOT, 'modules', name)
  const manifestFile = join(localDir, 'UPSTREAM.json')
  const previous = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : undefined

  const hashes = {}
  const changed = []
  for (const rel of files) {
    hashes[rel] = sha256File(join(sourceDir, rel))
    if (previous?.files?.[rel] !== hashes[rel]) changed.push(rel)
  }
  const removed = previous ? Object.keys(previous.files).filter((rel) => !(rel in hashes)) : []

  if (checkOnly) {
    const localDrift = []
    for (const [rel, hash] of Object.entries(previous?.files || {})) {
      const local = join(localDir, rel)
      if (!existsSync(local)) localDrift.push(`${rel}（本地缺失）`)
      else if (sha256File(local) !== hash) localDrift.push(`${rel}（本地被改过）`)
    }
    if (changed.length || removed.length || localDrift.length) {
      drift = true
      console.log(`drift ${name}`)
      for (const rel of changed) console.log(`  ~ ${rel}`)
      for (const rel of removed) console.log(`  - ${rel}`)
      for (const rel of localDrift) console.log(`  ! ${rel}`)
    } else {
      console.log(`ok    ${name}（${files.length} 个文件）`)
    }
    continue
  }

  const identity = upstreamIdentity(sourceDir)
  const unchanged =
    previous &&
    previous.source === sourceDir &&
    JSON.stringify(previous.upstream || null) === JSON.stringify(identity || null) &&
    JSON.stringify(previous.files) === JSON.stringify(hashes)
  if (unchanged) {
    console.log(`same  ${name}（${files.length} 个文件）`)
    continue
  }

  mkdirSync(localDir, { recursive: true })
  for (const rel of files) {
    const target = join(localDir, rel)
    mkdirSync(dirname(target), { recursive: true })
    cpSync(join(sourceDir, rel), target)
  }

  writeFileSync(
    manifestFile,
    JSON.stringify(
      {
        module: name,
        source: sourceDir,
        upstream: identity,
        syncedAt: new Date().toISOString(),
        files: hashes,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )
  synced += 1
  console.log(`sync  ${name}  ${files.length} 个文件${changed.length ? `，变更 ${changed.length}` : ''}`)
  for (const rel of changed) console.log(`  ~ ${rel}`)
  for (const rel of removed) console.log(`  - ${rel}`)
}

if (checkOnly) {
  if (drift) {
    console.error('\n有模块与上游快照不一致：先跑 npm run sync 再构建。')
    process.exit(1)
  }
  console.log('\n全部模块与上游快照一致。')
  process.exit(0)
}

if (synced > 0 && !noBuild) {
  const build = spawnSync(process.execPath, [join(ROOT, 'scripts', 'build-client.mjs')], { stdio: 'inherit' })
  if (build.status !== 0) process.exit(build.status ?? 1)
}
