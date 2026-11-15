/**
 * Host half of `@local/dsh-index-adjust`.
 *
 * DSH keys a Session's storage directory and its Workspace membership off the
 * immutable `cwd` in the Session header. There is no move endpoint, so this
 * plugin performs the three steps a move actually needs, in one serialized
 * operation:
 *
 *   1. read every event through the official SessionPersistence read handle;
 *   2. re-materialize the same Session id at the new cwd through
 *      `sessionPersistence.create(...)`, which writes a new header frame and the
 *      copied event frames in the layout the reader expects;
 *   3. update the Workspace registry's in-process header/path caches, detach the
 *      id from the old workspace and attach it to the new one.
 *
 * The old session directory is moved to a temporary backup first, so the
 * create-time duplicate-id check cannot see it, and is restored if any step
 * fails. Startup compatibility probing refuses to touch a Session when the
 * verified DSH version or any required private seam is missing. The public
 * registry APIs (`attachSession` / `detachSession`) remain the only writers of
 * workspace membership; cache writes are the private seam DSH 0.2.2-rc.3 does
 * not expose publicly.
 *
 * @module @local/dsh-index-adjust
 */

import { cp, mkdir, readFile, readdir, realpath, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { join, parse, dirname } from 'node:path'

/** Cordis plugin name used by Loader logs. */
export const name = 'index-adjust'

/** Host services this plugin needs. */
export const inject = ['workspaceRegistry', 'sessionPersistence', 'agents']

const ROUTE_STATE = '/dsh-index-adjust/state'
const ROUTE_MOVE = '/dsh-index-adjust/move'
const ROUTE_RECONNECT = '/dsh-index-adjust/reconnect'
const MAX_BODY = 64 * 1024

/**
 * The only DSH build whose private seams this plugin has been verified against.
 * A different version is deliberately refused rather than guessed at.
 */
const SUPPORTED_DSH_VERSION = '0.2.2-rc.3'

class AdjustError extends Error {
  constructor(status, message, details) {
    super(message)
    this.name = 'AdjustError'
    this.status = status
    this.details = details
  }
}

/** @param {unknown} value */
function isSafeId(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 200
    && value !== '.'
    && value !== '..'
    && !value.includes('..')
    && !/[\\/\0]/.test(value)
}

/** @param {string} value */
async function isDirectory(value) {
  try {
    return (await stat(value)).isDirectory()
  } catch {
    return false
  }
}

/** @param {string} left @param {string} right */
function samePath(left, right) {
  return left.toLowerCase() === right.toLowerCase()
}

/**
 * Read the installed desktop package version. Electron's fs understands the
 * `app.asar` path; the service fallbacks cover a plain `dsh web` host.
 * @param {any} ctx
 */
async function readDshVersion(ctx) {
  const fromPackage = async (file) => {
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8'))
      return typeof parsed?.version === 'string' && parsed.version.length > 0
        ? parsed.version
        : undefined
    } catch {
      return undefined
    }
  }

  if (typeof process !== 'undefined' && process.resourcesPath) {
    const packaged = await fromPackage(join(process.resourcesPath, 'app.asar', 'package.json'))
    if (packaged !== undefined) return packaged
  }

  for (const serviceName of ['app', 'desktop', 'dsh', 'runtime']) {
    try {
      const service = ctx.get?.(serviceName)
      const version = service?.version ?? service?.appVersion
      if (typeof version === 'string' && version.length > 0) return version
    } catch {
      // A missing optional service is not an error; try the next source.
    }
  }
  if (typeof process !== 'undefined' && typeof process.env?.DSH_VERSION === 'string') {
    return process.env.DSH_VERSION
  }
  return 'unknown'
}

/** @param {unknown} value */
function isRecord(value) {
  return value !== null && typeof value === 'object'
}

/**
 * Probe every private seam used by a move. Missing fields mean "do not touch
 * the Session log"; a version mismatch means the same.
 * @param {any} ctx
 */
async function probeCompatibility(ctx) {
  const missing = []
  const needFunction = (label, owner, key) => {
    if (!isRecord(owner) || typeof owner[key] !== 'function') missing.push(label)
  }
  const needMap = (label, value) => {
    if (
      !isRecord(value)
      || typeof value.get !== 'function'
      || typeof value.set !== 'function'
      || typeof value.has !== 'function'
    ) {
      missing.push(label)
    }
  }

  const registry = ctx.workspaceRegistry
  for (const method of ['list', 'get', 'resolveByPath', 'create']) {
    needFunction(`workspaceRegistry.${method}()`, registry, method)
  }
  needFunction('workspaceRegistry.table.get()', registry?.table, 'get')
  needFunction('workspaceRegistry.table.update()', registry?.table, 'update')
  needMap('workspaceRegistry.headers', registry?.headers)
  needMap('workspaceRegistry.sessionPaths', registry?.sessionPaths)
  // These two caches are optional in current DSH builds; all writes to them are
  // guarded with optional chaining. Do not make an absent cache disable moves.
  needFunction('workspaceRegistry.rebuildEntities()', registry, 'rebuildEntities')

  let sample
  try {
    sample = registry?.list?.()[0]
  } catch {
    sample = undefined
  }
  // A registry can legitimately be empty before the first workspace exists.
  // If one exists, its entity methods are part of the contract too.
  if (sample !== undefined) {
    needFunction('WorkspaceEntity.attachSession()', sample, 'attachSession')
    needFunction('WorkspaceEntity.detachSession()', sample, 'detachSession')
  }

  const persistence = ctx.sessionPersistence
  needFunction('sessionPersistence.open()', persistence, 'open')
  needFunction('sessionPersistence.create()', persistence, 'create')
  if (typeof persistence?.root !== 'string' || persistence.root.length === 0) {
    missing.push('sessionPersistence.root')
  }
  needMap('sessionPersistence.tracker.writers', persistence?.tracker?.writers)

  let sessions
  try {
    sessions = ctx.get?.('sessions')
  } catch {
    sessions = undefined
  }
  needFunction('sessions.get()', sessions, 'get')
  needFunction('sessions.flush()', sessions, 'flush')
  needFunction('sessions.store.get()', sessions?.store, 'get')

  needFunction('agents.get()', ctx.agents, 'get')

  let projectionCache
  try {
    projectionCache = ctx.get?.('sessionProjectionCache')
  } catch {
    projectionCache = undefined
  }
  needFunction('sessionProjectionCache.coldSnapshot()', projectionCache, 'coldSnapshot')

  const version = await readDshVersion(ctx)
  if (version !== SUPPORTED_DSH_VERSION) {
    missing.push(`DSH ${version}（已验证 ${SUPPORTED_DSH_VERSION}）`)
  }

  const supported = missing.length === 0
  return {
    supported,
    version,
    expectedVersion: SUPPORTED_DSH_VERSION,
    missing,
    message: supported
      ? `已通过 DSH ${version} 兼容性探测`
      : `当前 DSH 版本不支持：${missing.join('；')}`,
  }
}

/** @param {any} compatibility */
function assertCompatible(compatibility) {
  if (compatibility?.supported !== true) {
    throw new AdjustError(
      503,
      compatibility?.message ?? '当前 DSH 版本不支持此操作',
      { compatibility },
    )
  }
}

/**
 * The Workspace record that still owns this Session id, including a record
 * whose folder is currently missing (its filtered `sessionIds` hides it).
 * @param {any} registry
 * @param {string} sessionId
 */
function owningWorkspace(registry, sessionId) {
  for (const workspace of registry.list()) {
    const record = registry.table?.get?.(workspace.id)
    if (record?.sessionIds?.includes(sessionId)) return workspace
  }
  return undefined
}

/** @param {any} registry @param {string} path */
function workspaceAtPath(registry, path) {
  return registry.list().find((workspace) => samePath(workspace.path, path))
}

/** @param {any} registry @param {string} path */
async function ensureWorkspace(registry, path) {
  // resolveByPath returns undefined (not a rejection) for an existing
  // directory that no Workspace owns. Only a missing/invalid path rejects.
  // Treat both cases the same way: register the directory.
  const existing = await registry.resolveByPath(path)
  if (existing !== undefined) return existing
  return await registry.create(path)
}

/**
 * Every stored directory named after this Session id, under the persistence
 * root. Normally exactly one.
 * @param {string} root
 * @param {string} sessionId
 */
async function findSessionDir(root, sessionId) {
  const projects = await readdir(root, { withFileTypes: true })
  const matches = []
  for (const project of projects) {
    if (!project.isDirectory()) continue
    const candidate = join(root, project.name, sessionId)
    if (await isDirectory(candidate)) matches.push(candidate)
  }
  if (matches.length === 0) throw new AdjustError(404, '没有找到该会话的存储目录')
  if (matches.length > 1) throw new AdjustError(409, '该会话在多个项目目录中重复出现，已停止操作')
  return matches[0]
}

/** @param {string} root @param {string} sessionId */
async function removeSessionDir(root, sessionId) {
  try {
    const dir = await findSessionDir(root, sessionId)
    await removeWithRetry(dir)
  } catch {
    // Best-effort cleanup on the failure path.
  }
}

/** @param {string} target */
async function removeWithRetry(target) {
  let last
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await rm(target, { recursive: true, force: true })
      return
    } catch (error) {
      last = error
      const code = error?.code
      if (code !== 'EBUSY' && code !== 'EPERM' && code !== 'EACCES') throw error
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  throw last
}

/**
 * Windows keeps a directory entry locked for a short moment after the Session
 * writer closes. Retry only the transient sharing violations; every other
 * filesystem error is real and should surface immediately.
 * @param {string} from
 * @param {string} to
 */
async function renameWithRetry(from, to) {
  let last
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await rename(from, to)
      return
    } catch (error) {
      last = error
      const code = error?.code
      if (code !== 'EBUSY' && code !== 'EPERM' && code !== 'EACCES') throw error
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  throw last
}

/**
 * Candidate new homes for a workspace path whose folder disappeared.
 *
 * For each path component from the leaf upward, list the siblings of that
 * component and keep a sibling whose subtree still contains the original tail.
 * This is exactly "search one level wider at the first mismatching node".
 * @param {string} oldPath
 */
async function findCandidates(oldPath) {
  const parsed = parse(oldPath)
  const parts = oldPath.slice(parsed.root.length).split(/[\\/]+/).filter(Boolean)
  const found = new Map()
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const parent = join(parsed.root, ...parts.slice(0, index))
    if (!(await isDirectory(parent))) continue
    let children
    try {
      children = await readdir(parent, { withFileTypes: true })
    } catch {
      continue
    }
    const original = parts[index]
    const tail = parts.slice(index + 1)
    for (const child of children) {
      if (!child.isDirectory()) continue
      if (child.name === original) continue
      if (child.name.startsWith('$') || child.name === 'System Volume Information') continue
      const candidate = join(parent, child.name, ...tail)
      if (samePath(candidate, oldPath)) continue
      if (!(await isDirectory(candidate))) continue
      const key = candidate.toLowerCase()
      const lowerOriginal = original.toLowerCase()
      const lowerChild = child.name.toLowerCase()
      const prefix = lowerChild.startsWith(lowerOriginal) || lowerOriginal.startsWith(lowerChild) ? 500 : 0
      const score = index * 1000 + prefix + Math.min(lowerOriginal.length, lowerChild.length)
      if (!found.has(key)) found.set(key, { path: candidate, score, name: child.name })
    }
  }
  return [...found.values()]
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, 24)
    .map(({ path }) => path)
}

/**
 * Read the on-disk header instead of the registry's live-session shortcut.
 * After a move the Session object may briefly outlive its storage; the stored
 * header is the source of truth the client should see.
 * @param {any} ctx
 * @param {string} sessionId
 */
async function readStoredHeader(ctx, sessionId) {
  const handle = await ctx.sessionPersistence.open(sessionId, 'read')
  try {
    return { ...handle.header }
  } finally {
    await handle.close()
  }
}

/**
 * Read a complete Session log through the official handle. Used for the
 * preflight and again for the final expected-count check.
 * @param {any} persistence
 * @param {string} sessionId
 */
async function readSessionLog(persistence, sessionId) {
  const handle = await persistence.open(sessionId, 'read')
  try {
    const events = (await handle.read(0)).events
    return {
      header: { ...handle.header },
      inheritedEventCount: handle.inheritedEventCount ?? 0,
      events: Array.isArray(events) ? events : [],
    }
  } finally {
    await handle.close()
  }
}

/**
 * A real write probe catches ACLs that `access(W_OK)` alone misses. The probe
 * name is unique and removed even when the write fails.
 * @param {string} targetPath
 */
async function assertTargetWritable(targetPath) {
  const probe = join(
    targetPath,
    `.dsh-index-adjust-write-test-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  )
  try {
    await writeFile(probe, '', { flag: 'wx' })
  } catch {
    throw new AdjustError(409, `目标目录不可写：${targetPath}`)
  } finally {
    try {
      await unlink(probe)
    } catch {
      // If the probe was never created, there is nothing to remove.
    }
  }
}

/**
 * Resolve an existing workspace, or register a folder that the user picked as
 * a new workspace. Registration happens during preflight, before any Session
 * file is touched.
 * @param {any} registry
 * @param {string} targetPath
 * @param {string | undefined} workspaceId
 */
async function resolveTargetWorkspace(registry, targetPath, workspaceId) {
  if (typeof workspaceId === 'string' && workspaceId.length > 0) {
    let workspace
    try {
      workspace = registry.get(workspaceId)
    } catch {
      workspace = undefined
    }
    if (workspace === undefined) throw new AdjustError(404, '目标工作区不存在')
    if (!samePath(workspace.path, targetPath)) {
      throw new AdjustError(409, '目标工作区路径与请求路径不一致')
    }
    return workspace
  }
  return await ensureWorkspace(registry, targetPath)
}

/** @param {string} backupDir @param {string} oldDir */
function recoveryCommand(backupDir, oldDir) {
  return `Copy-Item -Recurse -Force '${backupDir}' '${oldDir}'`
}

/**
 * Stop the Session's live writer and owning view before the log is renamed.
 * Closing just the writer would leave the view appending to a dead handle;
 * closing just the SessionStore entry can leave the writer behind. This is the
 * same pair of releases a normal view teardown performs, in the safe order.
 * @param {any} ctx
 * @param {any} persistence
 * @param {string} sessionId
 */
async function releaseLiveSession(ctx, persistence, sessionId) {
  const sessions = ctx.get?.('sessions')
  const agent = ctx.agents.get(sessionId)
  if (agent?.status === 'running') {
    throw new AdjustError(409, '会话正在运行，请等本轮结束后再更改工作区')
  }

  const live = sessions?.get?.(sessionId)
  if (live !== undefined) {
    try {
      await sessions.flush?.(live)
    } catch {
      // A flush failure must not trap the Session in a half-detached state.
    }
    const entry = sessions.store?.get?.(sessionId)
    if (typeof entry?.detach === 'function') {
      entry.detach()
    }
  }

  if (agent !== undefined) {
    try {
      await agent.scope?.dispose?.()
    } catch {
      // The view teardown above is authoritative; a stale scope is harmless.
    }
  }

  const tracker = persistence.tracker
  const writer = tracker?.writers?.get?.(sessionId)
  if (writer !== null && writer !== undefined && typeof writer.close === 'function') {
    await writer.drainLive?.()
    await writer.flush?.()
    await writer.close()
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (tracker?.writers?.has?.(sessionId) !== true) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new AdjustError(409, '会话仍在写入，暂时无法更改工作区，请稍后再试')
}

/**
 * Relocate one Session and re-home it in the Workspace registry.
 * @param {any} ctx
 * @param {string} sessionId
 * @param {string} requestedPath
 * @param {{retarget?: boolean}} [options]
 */
async function moveSession(ctx, sessionId, requestedPath, options = {}) {
  const registry = ctx.workspaceRegistry
  const persistence = ctx.sessionPersistence

  const compatibility = options.compatibility ?? await probeCompatibility(ctx)
  assertCompatible(compatibility)

  if (!isSafeId(sessionId)) throw new AdjustError(400, '无效的会话 ID')
  if (typeof requestedPath !== 'string' || requestedPath.length === 0) {
    throw new AdjustError(400, '缺少目标工作区路径')
  }
  let targetPath
  try {
    targetPath = await realpath(requestedPath)
  } catch {
    throw new AdjustError(404, `目标目录不存在：${requestedPath}`)
  }
  if (!(await isDirectory(targetPath))) throw new AdjustError(400, '目标路径不是文件夹')

  // Check the cheap, non-destructive cases before stopping a live Session:
  // an unchanged path and a Session without a cwd should never close the
  // user's conversation just to report "nothing to do".
  let initialHeader
  try {
    initialHeader = await readStoredHeader(ctx, sessionId)
  } catch {
    throw new AdjustError(404, '没有找到该会话的存储记录')
  }
  const initialCwd = initialHeader.cwd
  if (typeof initialCwd !== 'string' || initialCwd.length === 0) {
    throw new AdjustError(409, '该会话没有记录工作目录，无法移动')
  }
  if (samePath(targetPath, initialCwd)) {
    const workspace = await resolveTargetWorkspace(registry, targetPath, options.workspaceId)
    registry.sessionPaths?.set?.(sessionId, targetPath)
    registry.missingSessionPaths?.delete?.(sessionId)
    await workspace.attachSession(sessionId)
    return {
      changed: false,
      from: initialCwd,
      to: targetPath,
      workspaceId: workspace.id,
      backupDir: null,
      recovery: null,
    }
  }

  // Preflight is deliberately before the live Session is released: if any
  // read, target-workspace, or write probe fails, nothing has changed.
  const oldDir = await findSessionDir(persistence.root, sessionId)
  try {
    const preflight = await readSessionLog(persistence, sessionId)
    if (preflight.header.cwd !== initialCwd) {
      throw new AdjustError(409, '会话头在预检期间发生变化，请重试')
    }
  } catch (error) {
    if (error instanceof AdjustError) throw error
    throw new AdjustError(409, '会话事件不可读，未执行移动')
  }
  // Probe writability before registering a brand-new workspace: a failed
  // preflight must leave no empty workspace behind.
  await assertTargetWritable(targetPath)
  let targetWorkspace = await resolveTargetWorkspace(registry, targetPath, options.workspaceId)

  // A live view owns both a persistence writer and an idle AgentRegistry
  // entry. Release both here so a move can be applied without asking the user
  // to close the conversation first; the client reopens the Session afterwards.
  const sessions = ctx.get?.('sessions')
  const wasLive = persistence.tracker?.writers?.has?.(sessionId) === true
    || sessions?.get?.(sessionId) !== undefined
  const agent = ctx.agents.get(sessionId)
  if (agent?.status === 'running') {
    throw new AdjustError(409, '会话正在运行，请等本轮结束后再更改工作区')
  }
  if (wasLive) {
    await releaseLiveSession(ctx, persistence, sessionId)
  } else if (agent !== undefined) {
    // A stale idle agent without a live view is safe to dispose before the log
    // is read; there is no writer or view to release.
    await agent.scope?.dispose?.()
  }

  const stored = await readSessionLog(persistence, sessionId)
  const oldHeader = stored.header
  const events = stored.events
  const inheritedEventCount = stored.inheritedEventCount

  const oldPath = oldHeader.cwd
  if (typeof oldPath !== 'string' || oldPath.length === 0) {
    throw new AdjustError(409, '该会话没有记录工作目录，无法移动')
  }

  // Keep the backup on the same volume as the sessions root so `rename` stays
  // atomic and never falls back to a cross-volume copy. The sibling directory
  // is outside the scanned sessions root, so it cannot be mistaken for a
  // project directory while the move is in flight. This backup is retained
  // after both success and rollback; the response tells the user where it is.
  const backupRoot = join(dirname(persistence.root), '.dsh-index-adjust-backups')
  const backupDir = join(backupRoot, `${sessionId}-${String(Date.now())}`)
  await mkdir(backupRoot, { recursive: true })

  await renameWithRetry(oldDir, backupDir)

  let created
  let sourceWorkspace
  let detached = false
  let attached = false
  let retargeted = false
  try {
    created = await persistence.create(
      { ...oldHeader, cwd: targetPath },
      { inheritedEventCount },
    )
    if (events.length > 0) await created.append(events)
    // A historical `working-directory/change` would replay the old path after
    // the new header initializes the projection. Append one final change so the
    // effective cwd (and the model-visible `Current working directory`) ends at
    // the new workspace even for sessions that changed cwd earlier.
    let mirroredEvents = events
    if (events.some((event) => event?.type === 'working-directory/change')) {
      const lastSeq = events.length > 0 ? events[events.length - 1].seq : inheritedEventCount - 1
      const finalChange = {
        type: 'working-directory/change',
        seq: lastSeq + 1,
        time: Date.now(),
        data: { cwd: targetPath },
      }
      await created.append([finalChange])
      mirroredEvents = [...events, finalChange]
    }
    await created.flush()
    await created.close()
    created = undefined

    const verification = await readSessionLog(persistence, sessionId)
    if (!samePath(verification.header.cwd ?? '', targetPath)) {
      throw new AdjustError(500, '写入后的会话头没有指向目标目录')
    }
    if (verification.events.length !== mirroredEvents.length) {
      throw new AdjustError(
        500,
        `写入后事件数不匹配（期望 ${mirroredEvents.length}，读到 ${verification.events.length}）`,
      )
    }
    if (mirroredEvents.length > 0) {
      const expectedLast = mirroredEvents[mirroredEvents.length - 1]
      const actualLast = verification.events[verification.events.length - 1]
      if (actualLast?.seq !== expectedLast?.seq || actualLast?.type !== expectedLast?.type) {
        throw new AdjustError(500, '写入后最后一条事件校验失败')
      }
    }

    const newHeader = { ...oldHeader, cwd: targetPath }
    // The durable projection cache is bound to the old header identity (its
    // cwd is part of that identity). Rebuild it from the moved log now, so the
    // Session list can read the existing title and the new working directory
    // without treating the stale record as unrelated.
    const projectionCache = ctx.get?.('sessionProjectionCache')
    if (typeof projectionCache?.coldSnapshot === 'function') {
      try {
        await projectionCache.coldSnapshot(newHeader, inheritedEventCount, mirroredEvents)
      } catch {
        // A cache miss only costs a cold read later; never fail the move.
      }
    }
    if (registry.headers?.set !== undefined) registry.headers.set(sessionId, newHeader)
    registry.sessionPaths?.delete?.(sessionId)
    registry.missingSessionPaths?.delete?.(sessionId)
    registry.invalidSessionPaths?.delete?.(sessionId)

    sourceWorkspace = owningWorkspace(registry, sessionId)
    const sourceRecord = sourceWorkspace === undefined
      ? undefined
      : registry.table?.get?.(sourceWorkspace.id)
    const canRetarget = options.retarget === true
      && sourceRecord !== undefined
      && samePath(sourceRecord.path, oldPath)
      && !samePath(sourceRecord.path, targetPath)
      // Retargeting the whole workspace would hide every other Session whose
      // immutable header still points at the old folder. Only take that branch
      // for a workspace that exists solely for this Session; otherwise create a
      // fresh workspace and leave the old one for its remaining Sessions.
      && (sourceRecord.sessionIds?.length ?? 0) <= 1
      && workspaceAtPath(registry, targetPath) === undefined

    if (canRetarget) {
      // Reconnect keeps the original workspace identity/title and moves its
      // path to the recovered folder. The Session is already listed in that
      // record, so attachSession below is the short-circuit/idempotent branch.
      await registry.table.update(sourceWorkspace.id, (current) => ({
        ...current,
        path: targetPath,
        updatedAt: Date.now(),
      }))
      if (typeof registry.rebuildEntities === 'function') registry.rebuildEntities()
      targetWorkspace = registry.get(sourceWorkspace.id)
      retargeted = true
    } else {
      targetWorkspace = await ensureWorkspace(registry, targetPath)
    }

    if (sourceWorkspace !== undefined && sourceWorkspace.id !== targetWorkspace.id) {
      await sourceWorkspace.detachSession(sessionId)
      detached = true
    }
    // Establish the target path before attachSession mutates the record: its
    // `mutate` filters sessionIds through `candidateMatches`, and the idempotent
    // (record already lists the id) branch does not call rememberSessionPath.
    registry.sessionPaths?.set?.(sessionId, targetPath)
    registry.missingSessionPaths?.delete?.(sessionId)
    try {
      await targetWorkspace.attachSession(sessionId)
      attached = true
      registry.sessionPaths?.set?.(sessionId, targetPath)
      registry.missingSessionPaths?.delete?.(sessionId)
    } catch (error) {
      // A live Session can still expose its old header through the Session
      // store for a moment after dispose. The file is already correct, so
      // update the record directly rather than leaving the move half-applied.
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes('cannot attach session')) throw error
      const record = registry.table?.get?.(targetWorkspace.id)
      if (record === undefined) throw error
      await registry.table.update(targetWorkspace.id, (current) => ({
        ...current,
        sessionIds: [sessionId, ...current.sessionIds.filter((id) => id !== sessionId)],
        updatedAt: Date.now(),
      }))
      registry.sessionPaths?.set?.(sessionId, targetPath)
      registry.missingSessionPaths?.delete?.(sessionId)
      attached = true
    }

    if (typeof registry.rebuildEntities === 'function') registry.rebuildEntities()
    // The backup is intentionally retained. The response carries its path and
    // a recovery command so the user can delete it only after confirming the
    // moved Session works.
    return {
      changed: true,
      from: oldPath,
      to: targetPath,
      workspaceId: targetWorkspace.id,
      retargeted,
      wasLive,
      backupDir,
      recovery: recoveryCommand(backupDir, oldDir),
    }
  } catch (error) {
    if (created !== undefined) {
      try {
        await created.close()
      } catch {
        // Ignore cleanup failure; the original error is the useful one.
      }
    }
    await removeSessionDir(persistence.root, sessionId)
    let restored = true
    try {
      // Copy, do not rename, so the backup remains available even after a
      // successful rollback.
      await cp(backupDir, oldDir, { recursive: true, force: false, errorOnExist: true })
    } catch {
      restored = false
    }
    if (attached && targetWorkspace !== undefined) {
      try {
        await targetWorkspace.detachSession(sessionId)
      } catch {
        // Same as above.
      }
    }
    if (retargeted && sourceWorkspace !== undefined) {
      try {
        await registry.table.update(sourceWorkspace.id, (current) => ({
          ...current,
          path: oldPath,
          updatedAt: Date.now(),
        }))
        if (typeof registry.rebuildEntities === 'function') registry.rebuildEntities()
      } catch {
        // The Session log is already restored; a stale workspace path is
        // recoverable by the next reconnect, so do not mask the original error.
      }
    }
    {
      if (registry.headers?.set !== undefined) registry.headers.set(sessionId, oldHeader)
      registry.sessionPaths?.delete?.(sessionId)
      registry.missingSessionPaths?.delete?.(sessionId)
      registry.invalidSessionPaths?.delete?.(sessionId)
    }
    if ((detached || retargeted) && sourceWorkspace !== undefined) {
      try {
        const source = registry.get?.(sourceWorkspace.id) ?? sourceWorkspace
        await source.attachSession(sessionId)
      } catch {
        // The file is back; the next registry bootstrap re-indexes it.
      }
    }
    const details = {
      backupDir,
      recovery: recoveryCommand(backupDir, oldDir),
      rolledBack: restored,
    }
    if (!restored) {
      throw new AdjustError(
        500,
        `移动失败，原会话未能自动恢复；备份保留在：${backupDir}`,
        details,
      )
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new AdjustError(
      error instanceof AdjustError ? error.status : 500,
      `${message}（已回滚；备份保留在：${backupDir}）`,
      details,
    )
  }
}

/** @param {import('node:http').IncomingMessage} req @param {number} limit */
function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new AdjustError(413, '请求体过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (size === 0) {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new AdjustError(400, '请求体必须是 JSON 对象'))
          return
        }
        resolve(parsed)
      } catch {
        reject(new AdjustError(400, '请求体不是合法 JSON'))
      }
    })
    req.on('error', reject)
  })
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  let compatibilityPromise
  const compatibility = () => {
    if (compatibilityPromise === undefined) {
      compatibilityPromise = probeCompatibility(ctx).then(
        (result) => {
          // A startup probe can race lazy services. Do not cache a negative
          // result forever; the next state request probes again.
          if (result.supported !== true) compatibilityPromise = undefined
          return result
        },
        (error) => {
          compatibilityPromise = undefined
          return {
            supported: false,
            version: 'unknown',
            expectedVersion: SUPPORTED_DSH_VERSION,
            missing: [error instanceof Error ? error.message : String(error)],
            message: `兼容性探测失败：${error instanceof Error ? error.message : String(error)}`,
          }
        },
      )
      // Start the probe at activation, before the first menu click.
      void compatibilityPromise
    }
    return compatibilityPromise
  }

  let tail = Promise.resolve()
  /** @template T @param {() => Promise<T>} task @returns {Promise<T>} */
  const serial = (task) => {
    const run = tail.then(task, task)
    tail = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  // A route-level queue already serializes every move; this second lock makes
  // the same-Session invariant explicit and protects future callers that do not
  // pass through `serial`.
  const sessionLocks = new Map()
  /** @template T @param {string} sessionId @param {() => Promise<T>} task @returns {Promise<T>} */
  const withSessionLock = (sessionId, task) => {
    const previous = sessionLocks.get(sessionId) ?? Promise.resolve()
    let release
    const gate = new Promise((resolve) => { release = resolve })
    const queued = previous.then(() => gate, () => gate)
    sessionLocks.set(sessionId, queued)
    const run = previous.then(task, task)
    return run.finally(() => {
      release()
      if (sessionLocks.get(sessionId) === queued) sessionLocks.delete(sessionId)
    })
  }

  ctx.inject(['webServer'], (webCtx) => {
    /** @param {import('node:http').IncomingMessage} req */
    const isLoopback = (req) => {
      const address = req.socket?.remoteAddress ?? ''
      return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
    }
    /** @param {import('node:http').ServerResponse} res @param {number} status @param {unknown} value */
    const json = (res, status, value) => {
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      })
      res.end(JSON.stringify(value))
    }
    /** @param {import('node:http').ServerResponse} res @param {unknown} error */
    const failure = (res, error) => {
      const status = error instanceof AdjustError ? error.status : 500
      json(res, status, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        ...(error instanceof AdjustError && isRecord(error.details) ? error.details : {}),
      })
    }
    /** @param {import('node:http').IncomingMessage} req */
    const guard = (req) => {
      if (!isLoopback(req)) throw new AdjustError(403, '仅允许本机访问')
      // A custom header makes cross-origin "simple" POSTs impossible without a
      // CORS preflight, which this route intentionally does not answer.
      if (req.headers['x-dsh-index-adjust'] !== '1') {
        throw new AdjustError(403, '缺少本地调用标记')
      }
    }

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: ROUTE_STATE,
      handler: async (req, res) => {
        try {
          guard(req)
          if (req.method !== 'GET') throw new AdjustError(405, '仅支持 GET')
          const url = new URL(req.url ?? '/', 'http://127.0.0.1')
          const sessionId = url.searchParams.get('sessionId') ?? ''
          if (!isSafeId(sessionId)) throw new AdjustError(400, '缺少会话 ID')
          const compat = await compatibility()
          if (!compat.supported) {
            json(res, 200, {
              ok: true,
              sessionId,
              cwd: '',
              cwdExists: false,
              workspace: null,
              candidates: [],
              compat,
            })
            return
          }
          const header = await readStoredHeader(ctx, sessionId)
          const workspace = owningWorkspace(ctx.workspaceRegistry, sessionId)
          const cwd = typeof header.cwd === 'string' ? header.cwd : ''
          const cwdExists = cwd.length > 0 && await isDirectory(cwd)
          const candidates = cwdExists ? [] : await findCandidates(cwd)
          json(res, 200, {
            ok: true,
            sessionId,
            cwd,
            cwdExists,
            workspace: workspace === undefined
              ? null
              : { workspaceId: workspace.id, path: workspace.path, title: workspace.title },
            candidates,
            compat,
          })
        } catch (error) {
          failure(res, error)
        }
      },
    }), 'index-adjust: state route')

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: ROUTE_MOVE,
      handler: async (req, res) => {
        try {
          guard(req)
          if (req.method !== 'POST') throw new AdjustError(405, '仅支持 POST')
          const body = await readJson(req, MAX_BODY)
          const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
          if (!isSafeId(sessionId)) throw new AdjustError(400, '缺少会话 ID')
          const compat = await compatibility()
          assertCompatible(compat)
          const workspaceId = typeof body.workspaceId === 'string' && body.workspaceId.length > 0
            ? body.workspaceId
            : undefined
          let path = typeof body.path === 'string' ? body.path : ''
          if (path.length === 0 && workspaceId !== undefined) {
            let workspace
            try {
              workspace = ctx.workspaceRegistry.get(workspaceId)
            } catch {
              throw new AdjustError(404, '目标工作区不存在')
            }
            if (workspace === undefined) throw new AdjustError(404, '目标工作区不存在')
            path = workspace.path
          }
          if (path.length === 0) throw new AdjustError(400, '请选择目标工作区')
          const result = await serial(() => withSessionLock(
            sessionId,
            () => moveSession(ctx, sessionId, path, { workspaceId, compatibility: compat }),
          ))
          json(res, 200, { ok: true, ...result })
        } catch (error) {
          failure(res, error)
        }
      },
    }), 'index-adjust: move route')

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: ROUTE_RECONNECT,
      handler: async (req, res) => {
        try {
          guard(req)
          if (req.method !== 'POST') throw new AdjustError(405, '仅支持 POST')
          const body = await readJson(req, MAX_BODY)
          const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
          if (!isSafeId(sessionId)) throw new AdjustError(400, '缺少会话 ID')
          const compat = await compatibility()
          assertCompatible(compat)
          const explicit = typeof body.path === 'string' && body.path.length > 0
          if (explicit) {
            const result = await serial(() => withSessionLock(
              sessionId,
              () => moveSession(ctx, sessionId, body.path, { retarget: true, compatibility: compat }),
            ))
            json(res, 200, { ok: true, status: 'moved', ...result, candidates: [] })
            return
          }
          const header = await readStoredHeader(ctx, sessionId)
          const cwd = typeof header.cwd === 'string' ? header.cwd : ''
          if (cwd.length > 0 && await isDirectory(cwd)) {
            json(res, 200, { ok: true, status: 'healthy', cwd })
            return
          }
          const candidates = cwd.length === 0 ? [] : await findCandidates(cwd)
          if (candidates.length === 0) {
            json(res, 200, { ok: false, status: 'not-found', cwd, candidates: [] })
            return
          }
          if (candidates.length > 1) {
            json(res, 200, { ok: false, status: 'ambiguous', cwd, candidates })
            return
          }
          const result = await serial(() => withSessionLock(
            sessionId,
            () => moveSession(ctx, sessionId, candidates[0], { retarget: true, compatibility: compat }),
          ))
          json(res, 200, { ok: true, status: 'moved', ...result, candidates })
        } catch (error) {
          failure(res, error)
        }
      },
    }), 'index-adjust: reconnect route')
  })
}
