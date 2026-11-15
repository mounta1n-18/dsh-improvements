/* 由 scripts/build-client.mjs 生成，不要手改。
 * 来源模块：index-adjust、context-usage、mcp-lazy
 * 重新生成：npm run build
 */
window.__ModuleLoader__.load({
  id: 'dsh-improvements',
  factory(require) {
    const __parts = []

    // ---- index-adjust ----
    __parts.push(['index-adjust', (function (require) {

    const React = require('react')
    const h = React.createElement

    /** Client locale namespace. */
    const NS = 'index-adjust'

    const zh = {
      'menu.move': '更改工作区',
      'menu.reconnect': '重连工作区',
      'move.title': '更改工作区',
      'reconnect.title': '重连工作区',
      'move.subtitle': '把会话连接到另一个工作区，历史记录会保留',
      'reconnect.subtitle': '从缺失目录的上一级开始，自动寻找重命名后的位置',
      'target': '目标工作区',
      'current': '当前',
      'newWorkspace': '新建工作区…',
      'newWorkspaceHint': '选择一个本地文件夹并加入工作区',
      'loadingWorkspaces': '正在读取工作区…',
      'noWorkspaces': '还没有工作区，先新建一个吧',
      'loadingState': '正在检查原目录并搜索附近位置…',
      'moveHint': '移动后，会话历史保持不变；工作目录和系统提示词会切换到新位置。',
      'reconnectHint': '重连会保留会话历史，把该会话所属工作区指向找到的新目录。',
      'originalHealthy': '原工作区目录仍然正常',
      'originalMissing': '原工作区目录已不存在',
      'candidateOne': '找到 1 个可能的原始位置',
      'candidateMany': '找到多个可能的位置，请选择正确的一个',
      'noCandidate': '没有在上级目录中找到原始位置。可以手动选择新位置。',
      'manual': '手动选择的位置',
      'pickFolder': '选择新位置…',
      'respawning': '重新搜索',
      'cancel': '取消',
      'close': '关闭',
      'moveAction': '移动会话',
      'reconnectAction': '重新连接',
      'moved': '会话已移动到新的工作区',
      'reconnected': '会话与工作区已重新连接',
      'healthy': '原目录正常，无需重连',
      'failed': '操作失败',
      'noSelection': '请选择一个工作区',
      'pickFailed': '无法打开文件夹选择器',
      'busy': '正在处理…',
      'pathUnavailable': '（原目录未记录）',
      'unsupported': '当前 DSH 版本不支持',
      'unsupportedDetail': '这是安全保护：缺少必要的私有接口时，插件不会改写会话存储。',
      'compatUnknown': '无法确认当前 DSH 版本兼容性，请先重启 DSH。',
    }

    const en = {
      'menu.move': 'Change workspace',
      'menu.reconnect': 'Reconnect workspace',
      'move.title': 'Change workspace',
      'reconnect.title': 'Reconnect workspace',
      'move.subtitle': 'Move this session to another workspace; its history is kept',
      'reconnect.subtitle': 'Search one level wider from the missing folder for the renamed location',
      'target': 'Target workspace',
      'current': 'Current',
      'newWorkspace': 'New workspace…',
      'newWorkspaceHint': 'Choose a local folder and add it as a workspace',
      'loadingWorkspaces': 'Loading workspaces…',
      'noWorkspaces': 'No workspaces yet — create one below.',
      'loadingState': 'Checking the old folder and searching nearby…',
      'moveHint': 'The history stays intact; the working directory and system prompt switch to the new location.',
      'reconnectHint': 'Reconnecting keeps the history and points the Session’s workspace at the found folder.',
      'originalHealthy': 'The original workspace folder still exists',
      'originalMissing': 'The original workspace folder no longer exists',
      'candidateOne': 'Found 1 likely location',
      'candidateMany': 'Found several likely locations; choose the right one',
      'noCandidate': 'No original location was found nearby. You can pick a new location manually.',
      'manual': 'Manually chosen location',
      'pickFolder': 'Choose location…',
      'respawning': 'Search again',
      'cancel': 'Cancel',
      'close': 'Close',
      'moveAction': 'Move session',
      'reconnectAction': 'Reconnect',
      'moved': 'Session moved to the new workspace',
      'reconnected': 'Session reconnected',
      'healthy': 'The original folder is healthy; no reconnect is needed',
      'failed': 'Operation failed',
      'noSelection': 'Choose a workspace first',
      'pickFailed': 'Could not open the folder picker',
      'busy': 'Working…',
      'pathUnavailable': '(no original folder recorded)',
      'unsupported': 'This DSH version is not supported',
      'unsupportedDetail': 'Safety guard: without the required private interfaces, this plugin will not rewrite Session storage.',
      'compatUnknown': 'Cannot confirm DSH compatibility. Restart DSH first.',
    }

    const CSS = `
.dshia-backdrop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--dsw-alias-bg-mask-1,rgba(15,17,21,.38));box-sizing:border-box;animation:dshia-fade .12s ease-out}
.dshia-dialog{width:min(560px,100%);max-height:min(82vh,720px);display:flex;flex-direction:column;box-sizing:border-box;background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-layer-2,#fff));color:var(--dsw-alias-label-primary,#111);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));border-radius:var(--dsw-radius-lg,14px);box-shadow:0 18px 60px rgba(15,17,21,.22);overflow:hidden;animation:dshia-pop .14s ease-out}
.dshia-head{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}
.dshia-headIcon{width:34px;height:34px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-brand-primary,#4d6bfe)}
.dshia-headText{min-width:0;flex:1;padding-top:1px}
.dshia-title{font-size:16px;line-height:24px;font-weight:600;margin:0}
.dshia-sub{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#6b7280);margin:3px 0 0}
.dshia-close{width:30px;height:30px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary,#9ca3af);cursor:pointer;padding:0}
.dshia-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-primary,#111)}
.dshia-body{padding:16px 20px 4px;overflow:auto;min-height:120px}
.dshia-label{font-size:12px;line-height:18px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b7280);margin:0 0 8px}
.dshia-list{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto;padding:1px}
.dshia-ws{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid transparent;border-radius:10px;background:transparent;color:inherit;cursor:pointer;text-align:left;font:inherit}
.dshia-ws:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}
.dshia-ws[data-selected="true"]{background:var(--dsw-alias-interactive-bg-active,rgba(77,107,254,.1));border-color:var(--dsw-alias-state-business-primary,#4d6bfe)}
.dshia-ws:disabled{opacity:.55;cursor:default}
.dshia-wsIcon{width:28px;height:28px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:8px;background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,.04));color:var(--dsw-alias-label-secondary,#6b7280)}
.dshia-wsText{display:flex;flex-direction:column;min-width:0;flex:1;gap:1px}
.dshia-wsTitle{font-size:13px;line-height:19px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshia-wsPath{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#9ca3af);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshia-tag{flex:none;font-size:11px;line-height:18px;padding:0 7px;border-radius:999px;color:var(--dsw-alias-label-secondary,#6b7280);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.dshia-check{flex:none;color:var(--dsw-alias-state-business-primary,#4d6bfe);display:flex}
.dshia-add{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;padding:10px;margin-top:8px;border:1px dashed var(--dsw-alias-border-l2,rgba(0,0,0,.14));border-radius:10px;background:transparent;color:var(--dsw-alias-brand-primary,#4d6bfe);cursor:pointer;text-align:left;font:inherit}
.dshia-add:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}
.dshia-add[disabled]{opacity:.5;cursor:default}
.dshia-addText{display:flex;flex-direction:column;gap:1px}
.dshia-addTitle{font-size:13px;line-height:19px;font-weight:500}
.dshia-addHint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#9ca3af)}
.dshia-hint{font-size:11px;line-height:17px;color:var(--dsw-alias-label-tertiary,#9ca3af);margin:12px 0 0}
.dshia-error{margin:12px 0 0;padding:8px 10px;border-radius:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary,#d33);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d33) 8%,transparent)}
.dshia-card{display:flex;gap:10px;padding:11px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));border-radius:10px;background:var(--dsw-alias-bg-layer-1,rgba(0,0,0,.02));margin-bottom:10px}
.dshia-card[data-tone="warn"]{border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#c98a00) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#c98a00) 7%,transparent)}
.dshia-card[data-tone="ok"]{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary,#1a9b63) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#1a9b63) 7%,transparent)}
.dshia-cardIcon{flex:none;padding-top:1px}
.dshia-cardText{min-width:0;flex:1}
.dshia-cardTitle{font-size:12px;line-height:18px;font-weight:600}
.dshia-cardPath{font-size:11px;line-height:17px;color:var(--dsw-alias-label-secondary,#6b7280);word-break:break-all;margin-top:2px}
.dshia-empty{font-size:12px;line-height:19px;color:var(--dsw-alias-label-secondary,#6b7280);padding:12px 2px}
[data-row-key^="workspace:"]{position:relative}
.dshia-folder-badges{position:absolute;display:inline-flex;align-items:center;gap:2px;white-space:nowrap;pointer-events:none;z-index:2}
.dshia-folder-ball{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;aspect-ratio:1/1;box-sizing:border-box;border-radius:999px;corner-shape:round;font-size:9px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums;color:var(--dsw-specific-sidebar-fill,#fff)}
.dshia-folder-ball--solo{width:7px;height:7px}
.dshia-folder-pill{display:inline-flex;align-items:center;justify-content:center;height:13px;min-width:20px;padding:0 5px;box-sizing:border-box;border-radius:999px;font-size:9px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums;color:var(--dsw-specific-sidebar-fill,#fff)}
.dshia-folder-ball[data-state="done"],.dshia-folder-pill[data-state="done"]{background:var(--dsw-alias-state-success-primary,#1a9b63)}
.dshia-folder-ball[data-state="warning"],.dshia-folder-pill[data-state="warning"]{background:var(--dsw-alias-state-warn-primary,#c98a00)}
.dshia-folder-ball[data-state="error"],.dshia-folder-pill[data-state="error"]{background:var(--dsw-alias-state-error-primary,#d33)}
.dshia-folder-capsule{display:inline-flex;align-items:stretch;height:14px;box-sizing:border-box;border-radius:999px;overflow:hidden;box-shadow:0 0 0 1px var(--dsw-specific-sidebar-fill,transparent)}
.dshia-folder-capsulePart{display:inline-flex;align-items:center;justify-content:center;min-width:22px;padding:0 8px;box-sizing:border-box;font-size:9px;font-weight:600;line-height:1;letter-spacing:.2px;font-variant-numeric:tabular-nums;color:var(--dsw-specific-sidebar-fill,#fff)}
.dshia-folder-capsule[data-parts="3"] .dshia-folder-capsulePart{min-width:25px;padding:0 9px}
.dshia-folder-capsulePart + .dshia-folder-capsulePart{box-shadow:inset 1px 0 0 color-mix(in srgb,var(--dsw-specific-sidebar-fill,#fff) 35%,transparent)}
.dshia-folder-capsulePart[data-state="done"]{background:var(--dsw-alias-state-success-primary,#1a9b63)}
.dshia-folder-capsulePart[data-state="warning"]{background:var(--dsw-alias-state-warn-primary,#c98a00)}
.dshia-folder-capsulePart[data-state="error"]{background:var(--dsw-alias-state-error-primary,#d33)}
.dshia-folder-spinner{flex:none;width:14px;height:14px;margin-left:4px;margin-right:4px;color:var(--dsw-alias-label-tertiary,#81858c)}
.dshia-folder-spinner svg{display:block;width:14px;height:14px}
.dshia-folder-spinnerMotion{transform-origin:center;animation:dshia-state-dot-spin 1.5s linear infinite}
.dshia-folder-spinnerTrack,.dshia-folder-spinnerArc{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
.dshia-folder-spinnerTrack{opacity:.25}
.dshia-folder-spinnerArc{stroke-dasharray:12 150;animation:dshia-state-dot-dash 1.5s ease-in-out infinite}
@keyframes dshia-state-dot-spin{to{transform:rotate(360deg)}}
@keyframes dshia-state-dot-dash{0%{stroke-dasharray:12 150;stroke-dashoffset:0}50%{stroke-dasharray:24 150;stroke-dashoffset:-6}to{stroke-dasharray:12 150;stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.dshia-folder-spinnerMotion,.dshia-folder-spinnerArc{animation:none}.dshia-folder-spinnerArc{stroke-dasharray:18 150;stroke-dashoffset:-3}}
.dshia-spinner{width:15px;height:15px;border:2px solid var(--dsw-alias-border-l2,rgba(0,0,0,.12));border-top-color:var(--dsw-alias-brand-primary,#4d6bfe);border-radius:50%;animation:dshia-spin .75s linear infinite;display:inline-block;vertical-align:-3px;margin-right:7px}
.dshia-loading{font-size:12px;line-height:19px;color:var(--dsw-alias-label-secondary,#6b7280);padding:10px 2px}
.dshia-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:14px 20px 18px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.06))}
.dshia-btn{height:32px;padding:0 14px;border-radius:8px;border:1px solid transparent;font:inherit;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.dshia-btn.ghost{background:transparent;border-color:var(--dsw-alias-border-l2,rgba(0,0,0,.14));color:var(--dsw-alias-label-primary,#111)}
.dshia-btn.ghost:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}
.dshia-btn.primary{background:var(--dsw-alias-brand-primary,#4d6bfe);color:var(--dsw-alias-label-primary-foreground,#fff)}
.dshia-btn.primary:hover{filter:brightness(.96)}
.dshia-btn[disabled]{opacity:.5;cursor:default}
.dshia-btn:focus-visible,.dshia-ws:focus-visible,.dshia-add:focus-visible,.dshia-close:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#4d6bfe));outline-offset:1px}
@keyframes dshia-spin{to{transform:rotate(360deg)}}
@keyframes dshia-fade{from{opacity:0}to{opacity:1}}
@keyframes dshia-pop{from{opacity:0;transform:translateY(6px) scale(.99)}to{opacity:1;transform:none}}
@media (max-width:520px){.dshia-backdrop{padding:10px;align-items:flex-end}.dshia-dialog{max-height:88vh;border-radius:14px 14px 10px 10px}.dshia-head{padding:15px 16px 12px}.dshia-body{padding:14px 16px 2px}.dshia-footer{padding:12px 16px 14px}}
@media (prefers-reduced-motion:reduce){.dshia-backdrop,.dshia-dialog{animation:none}}
`

    const MENU_ICON_STROKE = 1.25

    const PAINT = {
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }

    function svg(children, viewBox = '0 0 16 16') {
      return function Glyph({ size = 16, strokeWidth = PAINT.strokeWidth }) {
        return h(
          'svg',
          {
            width: size,
            height: size,
            viewBox,
            'aria-hidden': 'true',
            style: { display: 'block', flex: 'none' },
            ...PAINT,
            strokeWidth,
          },
          ...children,
        )
      }
    }

    const MoveIcon = svg([
      h('path', { key: 'f', d: 'M2 4.6a1.3 1.3 0 0 1 1.3-1.3h3l1.2 1.5h5.2A1.3 1.3 0 0 1 14 6.1v5.5a1.3 1.3 0 0 1-1.3 1.3H3.3A1.3 1.3 0 0 1 2 11.6Z' }),
      h('path', { key: 'a', d: 'M5.2 9.1h5.4M8.9 7.4l1.7 1.7-1.7 1.7' }),
    ])

    const ReconnectIcon = svg([
      h('path', { key: 'a', d: 'M13.3 8.1a5.3 5.3 0 1 1-1.6-3.8' }),
      h('path', { key: 'b', d: 'M13.4 2.7v3.6H9.8' }),
    ])

    const FolderIcon = svg([
      h('path', { key: 'f', d: 'M2 4.8a1.2 1.2 0 0 1 1.2-1.2h3.1L7.5 5.1h5.3A1.2 1.2 0 0 1 14 6.3v5a1.2 1.2 0 0 1-1.2 1.2H3.2A1.2 1.2 0 0 1 2 11.3Z' }),
    ])

    const PlusIcon = svg([
      h('path', { key: 'a', d: 'M8 3.5v9M3.5 8h9' }),
    ])

    const CheckIcon = svg([
      h('path', { key: 'a', d: 'm3.2 8.3 3.1 3.1 6.5-6.6' }),
    ])

    const CloseIcon = svg([
      h('path', { key: 'a', d: 'm4 4 8 8M12 4l-8 8' }),
    ])

    const WarnIcon = svg([
      h('path', { key: 'a', d: 'M8 2.3 14.2 13H1.8Z' }),
      h('path', { key: 'b', d: 'M8 6.2v3.2M8 11.3h.01' }),
    ])

    const OkIcon = svg([
      h('circle', { key: 'a', cx: 8, cy: 8, r: 6 }),
      h('path', { key: 'b', d: 'm5.2 8.2 1.9 1.9 3.8-4' }),
    ])

    /** @param {any} value */
    function messageOf(value) {
      return value instanceof Error ? value.message : String(value)
    }

    /** @param {string} left @param {string} right */
    function samePath(left, right) {
      return left.replace(/[\\/]+$/, '').toLowerCase() === right.replace(/[\\/]+$/, '').toLowerCase()
    }

    /**
     * DSH's workspace tree is presentation-only: it infers a parent from the
     * longest registered Workspace path that strictly contains the child. Match
     * that rule exactly so the picker uses the same hierarchy as the sidebar.
     * @param {string} path
     */
    function workspaceFolderPath(path) {
      const value = String(path ?? '')
      return (/^[A-Za-z]:[/\\]/.test(value) || value.startsWith('\\\\')
        ? value.replaceAll('\\', '/')
        : value
      ).replace(/\/+$/, '')
    }

    /**
     * Preserve the host's workspace order among siblings while nesting children
     * under the same path-derived parent that the sidebar uses.
     * @param {Array<{workspaceId:string,path:string}>} items
     */
    function buildWorkspaceForest(items) {
      const list = Array.isArray(items) ? items : []
      const byId = new Map(list.map((workspace) => [workspace.workspaceId, workspace]))
      const parentOf = new Map()

      for (const workspace of list) {
        const child = workspaceFolderPath(workspace.path)
        let parentId
        let length = -1
        for (const candidate of list) {
          const root = workspaceFolderPath(candidate.path)
          if (root.length > length && child !== root && child.startsWith(`${root}/`)) {
            parentId = candidate.workspaceId
            length = root.length
          }
        }
        parentOf.set(workspace.workspaceId, parentId)
      }

      const children = new Map()
      const roots = []
      for (const workspace of list) {
        let parentId = parentOf.get(workspace.workspaceId)
        // If an intermediate Workspace was removed, the sidebar promotes the
        // child to the nearest Workspace that is still present.
        const seen = new Set()
        while (parentId !== undefined && !byId.has(parentId)) {
          if (seen.has(parentId)) {
            parentId = undefined
            break
          }
          seen.add(parentId)
          parentId = parentOf.get(parentId)
        }
        if (parentId === undefined) {
          roots.push(workspace)
        } else {
          const siblings = children.get(parentId) ?? []
          siblings.push(workspace)
          children.set(parentId, siblings)
        }
      }

      return { roots, children }
    }

    /** @param {any} workspace */
    function workspaceSessionIds(workspace) {
      const raw = workspace?.sessionIds
      if (Array.isArray(raw)) return raw.filter((id) => typeof id === 'string' && id.length > 0)
      return String(raw ?? '').split(/\s+/).filter(Boolean)
    }

    /** @param {any} statuses @param {string} sessionId */
    function statusFor(statuses, sessionId) {
      if (statuses !== null && typeof statuses?.get === 'function') return statuses.get(sessionId)
      return statuses?.[sessionId]
    }

    /**
     * Match DSH's SessionStatusDots precedence: interaction > live work > unread
     * completion. One Session contributes one native state.
     * @param {any} status @param {any} summary
     */
    function folderDotState(status, summary) {
      const pending = status?.pendingInteraction?.kind ?? summary?.pendingInteraction?.kind
        ?? (typeof status?.pendingInteraction === 'string' ? status.pendingInteraction : undefined)
        ?? (typeof summary?.pendingInteraction === 'string' ? summary.pendingInteraction : undefined)
      if (pending === 'approval' || pending === 'plan-review' || pending === 'question') return 'warning'
      if (status?.running === true || (status?.runningSubagentCount ?? 0) > 0
        || summary?.running === true || (summary?.runningSubagentCount ?? 0) > 0) return 'ongoing'
      if (status?.completionUnread === true || summary?.completed === true) return 'done'
      const state = status?.state
      if (state === 'warning' || state === 'ongoing' || state === 'done' || state === 'error') return state
      return null
    }

    /**
     * Mobile-app badge: a solid state-colored ball overlapping the folder
     * icon. The number is knocked out in the sidebar fill color. A single
     * session is a plain ball; 2–9 show a digit; 10+ becomes a pill.
     * @param {string} state
     * @param {number} count
     * @param {string} title
     * @param {boolean} solo
     * @returns {HTMLSpanElement}
     */
    function createFolderBadge(state, count, title, solo = false) {
      const span = document.createElement('span')
      span.className = count >= 10
        ? 'dshia-folder-pill'
        : `dshia-folder-ball${solo ? ' dshia-folder-ball--solo' : ''}`
      span.dataset.state = state
      span.title = title
      span.setAttribute('aria-hidden', 'true')
      if (count > 1) span.textContent = String(count)
      return span
    }

    /**
     * Two or more state colors are merged into one capsule so they read as a
     * single notification badge. Each segment keeps its own native color and
     * count; with two states this is the requested left/right halved pill.
     * @param {{state: string, count: number}[]} entries
     * @param {string} title
     * @returns {HTMLSpanElement}
     */
    function createFolderCapsule(entries, title) {
      const capsule = document.createElement('span')
      capsule.className = 'dshia-folder-capsule'
      capsule.dataset.parts = String(entries.length)
      capsule.title = title
      capsule.setAttribute('aria-hidden', 'true')
      for (const entry of entries) {
        const part = document.createElement('span')
        part.className = 'dshia-folder-capsulePart'
        part.dataset.state = entry.state
        part.textContent = String(entry.count)
        part.title = title
        capsule.appendChild(part)
      }
      return capsule
    }

    /**
     * The animated running indicator is a real SVG element because SVG
     * animations do not run inside a background image.
     * @returns {HTMLSpanElement}
     */
    function createFolderSpinner() {
      const span = document.createElement('span')
      span.className = 'dshia-folder-spinner'
      span.setAttribute('aria-hidden', 'true')
      span.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" data-state="ongoing"><g class="dshia-folder-spinnerMotion"><circle class="dshia-folder-spinnerTrack" cx="12" cy="12" r="9.5"></circle><circle class="dshia-folder-spinnerArc" cx="12" cy="12" r="9.5"></circle></g></svg>'
      return span
    }

    /**
     * Minimal external store so the dialog can be driven from a menu `run`
     * closure and consumed by the standard `hooks` -> `useAdjust` binding.
     */
    function createAdjustStore() {
      const initial = {
        open: false,
        mode: 'move',
        sessionId: '',
        sessionTitle: '',
        cwd: '',
        cwdExists: true,
        currentWorkspaceId: null,
        candidates: [],
        selectedWorkspaceId: null,
        selectedPath: '',
        seq: 0,
        compat: null,
        loading: false,
        busy: false,
        error: null,
        rev: 0,
      }
      let snapshot = initial
      const listeners = new Set()
      return {
        getSnapshot: () => snapshot,
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        set(patch) {
          snapshot = { ...snapshot, ...patch }
          for (const listener of listeners) listener()
        },
        reset(patch) {
          snapshot = { ...initial, ...patch }
          for (const listener of listeners) listener()
        },
      }
    }

    /** @param {any} ctx @param {any} store @param {string} path @param {any} body */
    async function call(ctx, store, path, body) {
      const response = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          'x-dsh-index-adjust': '1',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      let data
      try {
        data = await response.json()
      } catch {
        data = {}
      }
      if (!response.ok) {
        throw new Error(data.error ?? `${response.status} ${response.statusText}`)
      }
      if (data.ok === false && data.status === undefined) {
        throw new Error(data.error ?? 'request failed')
      }
      return data
    }

    /**
     * @param {import('@deepseek-ai/cordis').Context} ctx
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'index-adjust: dictionaries')
      const t = ctx.locale.bind(NS)

      const style = document.createElement('style')
      style.id = '@local/dsh-index-adjust/dialog.css'
      style.textContent = CSS
      document.head.appendChild(style)
      ctx.effect(() => () => style.remove(), 'index-adjust: styles')

      const store = createAdjustStore()

      /** Re-render the open dialog when the sidebar data it reads changes. */
      const bump = () => {
        if (!store.getSnapshot().open) return
        store.set({ rev: store.getSnapshot().rev + 1 })
      }
      ctx.effect(() => ctx.workspaces.list.subscribe(bump), 'index-adjust: workspace subscription')
      ctx.effect(() => ctx.sessions.list.subscribe(bump), 'index-adjust: session subscription')

      const currentSession = () => {
        const byId = ctx.sessions.list.getSnapshot().byId
        return Object.values(byId).find((row) => (row?.retainedBy?.mainView ?? 0) > 0)
      }

      const workspaceByPath = (path) => {
        if (typeof path !== 'string' || path.length === 0) return undefined
        return ctx.workspaces.list.getSnapshot().items.find((item) => samePath(item.path, path))
      }

      const refreshWorkspaceId = (path) => {
        const item = workspaceByPath(path)
        if (item !== undefined) return item.workspaceId
        return null
      }

      /** @param {'move'|'reconnect'} mode @param {string} sessionId */
      const loadState = async (mode, sessionId, seq) => {
        try {
          const data = await call(
            ctx,
            store,
            `/dsh-index-adjust/state?sessionId=${encodeURIComponent(sessionId)}`,
          )
          if (!store.getSnapshot().open || store.getSnapshot().seq !== seq) return
          const compat = data.compat ?? { supported: false, message: t('compatUnknown') }
          if (compat.supported !== true) {
            store.set({
              loading: false,
              compat,
              cwd: '',
              cwdExists: false,
              currentWorkspaceId: null,
              candidates: [],
              selectedPath: '',
              error: null,
            })
            return
          }
          const workspaceId = data.workspace?.workspaceId ?? refreshWorkspaceId(data.cwd) ?? null
          const candidates = Array.isArray(data.candidates) ? data.candidates : []
          store.set({
            loading: false,
            compat,
            cwd: typeof data.cwd === 'string' ? data.cwd : '',
            cwdExists: data.cwdExists !== false,
            currentWorkspaceId: workspaceId,
            candidates,
            selectedPath: mode === 'reconnect' && candidates.length === 1 ? candidates[0] : '',
          })
        } catch (error) {
          if (!store.getSnapshot().open || store.getSnapshot().seq !== seq) return
          store.set({ loading: false, error: messageOf(error) })
        }
      }

      /** @param {'move'|'reconnect'} mode @param {string} sessionId */
      const openDialog = (mode, sessionId) => {
        const summary = ctx.sessions.list.getSnapshot().byId[sessionId]
        const seq = (store.getSnapshot().seq ?? 0) + 1
        store.reset({
          open: true,
          mode,
          sessionId,
          sessionTitle: summary?.displayTitle ?? summary?.title ?? sessionId,
          cwd: typeof summary?.cwd === 'string' ? summary.cwd : '',
          currentWorkspaceId: refreshWorkspaceId(summary?.cwd ?? ''),
          compat: null,
          loading: true,
          seq,
        })
        void loadState(mode, sessionId, seq)
      }

      const closeDialog = () => {
        if (store.getSnapshot().busy) return
        store.set({ open: false, error: null })
      }

      /**
       * Reload one Session's list projection after its log moved. The Host
       * registry is already updated at this point; without this the sidebar can
       * keep the old title, or omit the Session until it is opened once.
       * @param {string} sessionId
       */
      const refreshListedSession = async (sessionId) => {
        try {
          // refreshProjections() intentionally returns early once a Session's
          // projection is marked ready, so it cannot repair a stale cached row.
          // The full list refresh re-reads summaries and their title blocks.
          await ctx.sessions.refresh?.()
          await ctx.sessions.refreshProjections?.(sessionId)
        } catch {
          // A failed refresh must not turn a successful move into an error.
        }
      }

      // Closing a live Session produces a delayed session/removed event.  The
      // immediate refresh above can therefore land first and be undone by that
      // event, leaving the moved Session missing from the sidebar.  Re-apply
      // the list refresh after the event has settled.
      const refreshListedSessionAfterMove = (sessionId) => {
        void refreshListedSession(sessionId)
        setTimeout(() => { void refreshListedSession(sessionId) }, 300)
        setTimeout(() => { void refreshListedSession(sessionId) }, 1200)
      }

      /** @param {string} text */
      const report = (text) => {
        try {
          ctx.contextMenus?.notify?.(text, true)
        } catch {
          // A notice is best-effort; the sidebar already shows the result.
        }
      }

      /** @param {string} path */
      const pickFolder = async (path) => {
        const state = store.getSnapshot()
        store.set({ busy: true, error: null })
        try {
          if (state.mode === 'move') {
            let workspace = workspaceByPath(path)
            if (workspace === undefined) workspace = await ctx.workspaces.create({ path })
            if (!store.getSnapshot().open) return
            store.set({
              busy: false,
              selectedWorkspaceId: workspace.workspaceId,
              selectedPath: workspace.path,
            })
          } else {
            store.set({ busy: false, selectedPath: path })
          }
        } catch (error) {
          store.set({ busy: false, error: messageOf(error) })
        }
      }

      const chooseFolder = async () => {
        if (store.getSnapshot().busy) return
        store.set({ busy: true, error: null })
        try {
          const path = await ctx.uiWorkspace.pickDirectory()
          if (!path) {
            store.set({ busy: false })
            return
          }
          await pickFolder(path)
        } catch (error) {
          store.set({ busy: false, error: messageOf(error) })
        }
      }

      const move = async () => {
        const state = store.getSnapshot()
        if (state.selectedPath.length === 0) {
          store.set({ error: t('noSelection') })
          return
        }
        const wasCurrent = currentSession()?.id === state.sessionId
        store.set({ busy: true, error: null })
        try {
          const data = await call(ctx, store, '/dsh-index-adjust/move', {
            sessionId: state.sessionId,
            path: state.selectedPath,
          })
          refreshListedSessionAfterMove(state.sessionId)
          store.set({ busy: false, open: false })
          report(t('moved'))
          if (wasCurrent) {
            setTimeout(() => {
              try {
                ctx.uiWorkspace.openSession(state.sessionId)
              } catch {
                // The Session resumes with the new header on the next turn.
              }
            }, 120)
          }
        } catch (error) {
          store.set({ busy: false, error: messageOf(error) })
        }
      }

      const reconnect = async () => {
        const state = store.getSnapshot()
        if (state.selectedPath.length === 0) {
          store.set({ error: t('noSelection') })
          return
        }
        const wasCurrent = currentSession()?.id === state.sessionId
        store.set({ busy: true, error: null })
        try {
          const data = await call(ctx, store, '/dsh-index-adjust/reconnect', {
            sessionId: state.sessionId,
            path: state.selectedPath,
          })
          refreshListedSessionAfterMove(state.sessionId)
          store.set({ busy: false, open: false })
          report(data.status === 'healthy' ? t('healthy') : t('reconnected'))
          if (wasCurrent) {
            setTimeout(() => {
              try {
                ctx.uiWorkspace.openSession(state.sessionId)
              } catch {
                // The Session resumes with the new header on the next turn.
              }
            }, 120)
          }
        } catch (error) {
          store.set({ busy: false, error: messageOf(error) })
        }
      }

      const retrySearch = async () => {
        const state = store.getSnapshot()
        store.set({ loading: true, error: null })
        await loadState(state.mode, state.sessionId, state.seq)
      }

      ctx.slots.inject('contextMenu.icon', function* () {
        for (const [key, Icon] of Object.entries({
          'index-adjust.move': (props) => h(MoveIcon, { ...props, strokeWidth: MENU_ICON_STROKE }),
          'index-adjust.reconnect': (props) => h(ReconnectIcon, { ...props, strokeWidth: MENU_ICON_STROKE }),
        })) {
          yield ctx.slots.register({ name: 'contextMenu.icon', key }, Icon)
        }
      })

      ctx.effect(() => ctx.contextMenus.register({
        id: 'index-adjust.move',
        target: 'session',
        order: 350,
        resolve: ({ sessionId }) => {
          return [{
            id: 'move',
            label: t('menu.move'),
            icon: { key: 'index-adjust.move' },
            separatorBefore: true,
            run: () => openDialog('move', sessionId),
          }]
        },
      }), 'index-adjust: move menu')

      ctx.effect(() => ctx.contextMenus.register({
        id: 'index-adjust.reconnect',
        target: 'session',
        order: 360,
        resolve: ({ sessionId }) => {
          return [{
            id: 'reconnect',
            label: t('menu.reconnect'),
            icon: { key: 'index-adjust.reconnect' },
            run: () => openDialog('reconnect', sessionId),
          }]
        },
      }), 'index-adjust: reconnect menu')

      function Dialog({ useAdjust, t }) {
        const state = useAdjust((current) => current)
        const panelRef = React.useRef(null)

        React.useEffect(() => {
          if (!state.open) return undefined
          const onKey = (event) => {
            if (event.key === 'Escape' && !state.busy) {
              event.preventDefault()
              event.stopPropagation()
              closeDialog()
            }
          }
          window.addEventListener('keydown', onKey, true)
          return () => window.removeEventListener('keydown', onKey, true)
        }, [state.open, state.busy])

        React.useEffect(() => {
          if (state.open) panelRef.current?.focus()
        }, [state.open])

        if (!state.open) return null

        const items = ctx.workspaces.list.getSnapshot().items
        const isMove = state.mode === 'move'
        const unsupported = state.compat !== null && state.compat.supported !== true
        const canConfirm = !unsupported && (isMove
          ? state.selectedWorkspaceId !== null && !state.busy
          : state.selectedPath.length > 0 && !state.busy)

        return h(
          'div',
          {
            className: 'dshia-backdrop',
            onMouseDown: (event) => {
              if (event.target === event.currentTarget) closeDialog()
            },
          },
          h(
            'div',
            {
              ref: panelRef,
              className: 'dshia-dialog',
              role: 'dialog',
              'aria-modal': 'true',
              'aria-labelledby': 'dshia-title',
              tabIndex: -1,
              style: { outline: 'none' },
              onMouseDown: (event) => event.stopPropagation(),
            },
            h(
              'div',
              { className: 'dshia-head' },
              h('div', { className: 'dshia-headIcon' }, isMove ? h(MoveIcon, { size: 18, strokeWidth: 1.5 }) : h(ReconnectIcon, { size: 18, strokeWidth: 1.5 })),
              h(
                'div',
                { className: 'dshia-headText' },
                h('h2', { id: 'dshia-title', className: 'dshia-title' }, isMove ? t('move.title') : t('reconnect.title')),
                h('p', { className: 'dshia-sub' }, isMove ? t('move.subtitle') : t('reconnect.subtitle')),
                h('p', { className: 'dshia-sub', style: { opacity: 0.85 } }, state.sessionTitle),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dshia-close',
                  'aria-label': t('close'),
                  disabled: state.busy,
                  onClick: closeDialog,
                },
                h(CloseIcon, { size: 16 }),
              ),
            ),
            h(
              'div',
              { className: 'dshia-body' },
              unsupported
                ? h(
                    'div',
                    { className: 'dshia-error', role: 'alert' },
                    h('strong', { style: { display: 'block', marginBottom: 3 } }, t('unsupported')),
                    h('span', null, state.compat?.message ?? t('compatUnknown')),
                    h('span', { style: { display: 'block', marginTop: 4, opacity: 0.85 } }, t('unsupportedDetail')),
                  )
                : isMove ? renderMoveBody({ state, items, t, closeDialog, chooseFolder }) : renderReconnectBody({ state, t, chooseFolder, retrySearch }),
              !unsupported && state.error !== null
                ? h('div', { className: 'dshia-error', role: 'alert' }, state.error)
                : null,
            ),
            h(
              'div',
              { className: 'dshia-footer' },
              h(
                'button',
                { type: 'button', className: 'dshia-btn ghost', disabled: state.busy, onClick: closeDialog },
                t('cancel'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dshia-btn primary',
                  disabled: !canConfirm,
                  onClick: isMove ? move : reconnect,
                },
                state.busy ? t('busy') : (isMove ? t('moveAction') : t('reconnectAction')),
              ),
            ),
          ),
        )
      }

      function renderMoveBody({ state, items, t, chooseFolder }) {
        const forest = buildWorkspaceForest(items)

        const renderWorkspace = (workspace, depth) => {
          const isCurrent = workspace.workspaceId === state.currentWorkspaceId
          const selected = workspace.workspaceId === state.selectedWorkspaceId
          const isSamePath = state.cwd.length > 0 && samePath(workspace.path, state.cwd)
          const button = h(
            'button',
            {
              key: workspace.workspaceId,
              type: 'button',
              className: 'dshia-ws',
              'data-selected': selected,
              'data-depth': depth,
              style: depth > 0 ? { paddingLeft: `${10 + depth * 12}px` } : undefined,
              disabled: isCurrent || isSamePath || state.busy,
              onClick: () => {
                if (isCurrent || isSamePath) return
                store.set({ selectedWorkspaceId: workspace.workspaceId, selectedPath: workspace.path, error: null })
              },
            },
            h('span', { className: 'dshia-wsIcon' }, h(FolderIcon, { size: 16 })),
            h(
              'span',
              { className: 'dshia-wsText' },
              h('span', { className: 'dshia-wsTitle' }, workspace.title || workspace.path),
              h('span', { className: 'dshia-wsPath', title: workspace.path }, workspace.path),
            ),
            isCurrent || isSamePath
              ? h('span', { className: 'dshia-tag' }, t('current'))
              : selected
                ? h('span', { className: 'dshia-check' }, h(CheckIcon, { size: 16 }))
                : null,
          )
          const descendants = forest.children.get(workspace.workspaceId) ?? []
          return [button, ...descendants.flatMap((child) => renderWorkspace(child, depth + 1))]
        }

        const rows = forest.roots.flatMap((workspace) => renderWorkspace(workspace, 0))

        return h(
          React.Fragment,
          null,
          h('p', { className: 'dshia-label' }, t('target')),
          state.loading
            ? h('div', { className: 'dshia-loading' }, h('span', { className: 'dshia-spinner' }), t('loadingWorkspaces'))
            : rows.length > 0
              ? h('div', { className: 'dshia-list' }, ...rows)
              : h('div', { className: 'dshia-empty' }, t('noWorkspaces')),
          h(
            'button',
            {
              type: 'button',
              className: 'dshia-add',
              disabled: state.busy,
              onClick: chooseFolder,
            },
            h(PlusIcon, { size: 16 }),
            h(
              'span',
              { className: 'dshia-addText' },
              h('span', { className: 'dshia-addTitle' }, t('newWorkspace')),
              h('span', { className: 'dshia-addHint' }, t('newWorkspaceHint')),
            ),
          ),
          h('p', { className: 'dshia-hint' }, t('moveHint')),
        )
      }

      function renderReconnectBody({ state, t, chooseFolder, retrySearch }) {
        if (state.loading) {
          return h('div', { className: 'dshia-loading' }, h('span', { className: 'dshia-spinner' }), t('loadingState'))
        }
        const candidateRows = state.candidates.map((path) => {
          const selected = samePath(path, state.selectedPath)
          return h(
            'button',
            {
              key: path,
              type: 'button',
              className: 'dshia-ws',
              'data-selected': selected,
              disabled: state.busy,
              onClick: () => store.set({ selectedPath: path, error: null }),
            },
            h('span', { className: 'dshia-wsIcon' }, h(FolderIcon, { size: 16 })),
            h(
              'span',
              { className: 'dshia-wsText' },
              h('span', { className: 'dshia-wsTitle' }, path.split(/[\\/]/).filter(Boolean).pop() ?? path),
              h('span', { className: 'dshia-wsPath', title: path }, path),
            ),
            selected ? h('span', { className: 'dshia-check' }, h(CheckIcon, { size: 16 })) : null,
          )
        })
        const manual = state.selectedPath.length > 0 && !state.candidates.some((path) => samePath(path, state.selectedPath))
        return h(
          React.Fragment,
          null,
          h(
            'div',
            { className: 'dshia-card', 'data-tone': state.cwdExists ? 'ok' : 'warn' },
            h('span', { className: 'dshia-cardIcon' }, state.cwdExists ? h(OkIcon, { size: 16 }) : h(WarnIcon, { size: 16 })),
            h(
              'div',
              { className: 'dshia-cardText' },
              h('div', { className: 'dshia-cardTitle' }, state.cwdExists ? t('originalHealthy') : t('originalMissing')),
              h('div', { className: 'dshia-cardPath' }, state.cwd.length > 0 ? state.cwd : t('pathUnavailable')),
            ),
          ),
          !state.cwdExists
            ? h(
                React.Fragment,
                null,
                h(
                  'p',
                  { className: 'dshia-label' },
                  state.candidates.length === 0
                    ? t('noCandidate')
                    : state.candidates.length === 1
                      ? t('candidateOne')
                      : t('candidateMany'),
                ),
                candidateRows.length > 0 ? h('div', { className: 'dshia-list' }, ...candidateRows) : null,
                manual
                  ? h(
                      'div',
                      { className: 'dshia-card', style: { marginTop: 10 } },
                      h('span', { className: 'dshia-cardIcon' }, h(FolderIcon, { size: 16 })),
                      h(
                        'div',
                        { className: 'dshia-cardText' },
                        h('div', { className: 'dshia-cardTitle' }, t('manual')),
                        h('div', { className: 'dshia-cardPath' }, state.selectedPath),
                      ),
                    )
                  : null,
                h(
                  'div',
                  { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 } },
                  h(
                    'button',
                    { type: 'button', className: 'dshia-btn ghost', disabled: state.busy, onClick: chooseFolder },
                    h(FolderIcon, { size: 14 }),
                    t('pickFolder'),
                  ),
                  h(
                    'button',
                    { type: 'button', className: 'dshia-btn ghost', disabled: state.busy, onClick: retrySearch },
                    t('respawning'),
                  ),
                ),
              )
            : h(
                'div',
                { style: { marginTop: 10 } },
                h(
                  'button',
                  { type: 'button', className: 'dshia-btn ghost', disabled: state.busy, onClick: chooseFolder },
                  h(FolderIcon, { size: 14 }),
                  t('pickFolder'),
                ),
              ),
          h('p', { className: 'dshia-hint' }, t('reconnectHint')),
        )
      }

      /**
       * The sidebar has no folder-header slot. Mount each aggregate directly
       * in its collapsed workspace row so the browser scrolls and fades it
       * with the row. The node is absolutely positioned and cannot affect the
       * scroller's layout; a MutationObserver restores it if React reconciles
       * the row's children. Collapsed parents include their path-derived
       * subtree because DSH hides child groups too.
       */
      function FolderStatusDots({ useWorkspaces, useSessionStatus }) {
        const workspaceSnapshot = useWorkspaces((snapshot) => snapshot)
        const statuses = useSessionStatus((snapshot) => snapshot)
        const items = Array.isArray(workspaceSnapshot)
          ? workspaceSnapshot
          : workspaceSnapshot?.items ?? []
        const dataRef = React.useRef(null)
        dataRef.current = { items, statuses }
        const groupsRef = React.useRef(new Map())
        const rememberedStatuses = React.useRef(new Map())
        const frameRef = React.useRef(0)

        const decorate = React.useCallback(() => {
          if (typeof document === 'undefined') return

          const data = dataRef.current
          // Collapsing a Workspace may briefly drop its rows from the status
          // snapshot. Remember the last value per Session so its aggregate
          // survives that transition instead of blinking out.
          if (data.statuses !== null && typeof data.statuses?.forEach === 'function') {
            data.statuses.forEach((value, id) => {
              if (value !== undefined) rememberedStatuses.current.set(id, value)
            })
          } else if (data.statuses !== null && typeof data.statuses === 'object') {
            for (const [id, value] of Object.entries(data.statuses)) {
              if (value !== undefined) rememberedStatuses.current.set(id, value)
            }
          }
          const workspaceById = new Map(
            data.items.map((workspace) => [workspace.workspaceId, workspace]),
          )
          const forest = buildWorkspaceForest(data.items)
          const collectSessions = (workspace, output, seen) => {
            if (workspace === undefined) return
            for (const id of workspaceSessionIds(workspace)) {
              if (seen.has(id)) continue
              seen.add(id)
              output.push(id)
            }
            for (const child of forest.children.get(workspace.workspaceId) ?? []) {
              collectSessions(child, output, seen)
            }
          }

          const rows = new Map()
          for (const row of document.querySelectorAll('[data-row-key^="workspace:"]')) {
            const key = row.getAttribute('data-row-key') ?? ''
            rows.set(key.slice('workspace:'.length), row)
          }

          const next = new Map()
          for (const [workspaceId, row] of rows) {
            const workspace = workspaceById.get(workspaceId)
            const old = groupsRef.current.get(workspaceId)
            const oldBadges = old?.badges ?? null
            const oldSpinner = old?.spinner ?? null
            if (workspace === undefined || row.getAttribute('aria-expanded') !== 'false') {
              oldBadges?.remove()
              oldSpinner?.remove()
              continue
            }
            const sessionIds = []
            collectSessions(workspace, sessionIds, new Set())
            const byState = new Map()
            const titles = []
            for (const id of sessionIds) {
              const summary = statusFor(data.statuses, id)
                ?? rememberedStatuses.current.get(id)
                ?? null
              const state = folderDotState(summary, null)
              if (state === null) continue
              const entry = byState.get(state) ?? { state, count: 0 }
              entry.count += 1
              byState.set(state, entry)
              const title = summary?.title ?? summary?.name ?? id
              if (typeof title === 'string' && title.length > 0) titles.push(title)
            }
            const entries = [...byState.values()]
            const activeEntries = entries.filter((entry) => entry.state !== 'ongoing')
            const hasOngoing = entries.some((entry) => entry.state === 'ongoing')
            const isSoloBadge = !hasOngoing
              && activeEntries.length === 1
              && activeEntries[0].count === 1
            if (activeEntries.length === 0 && !hasOngoing) {
              oldBadges?.remove()
              oldSpinner?.remove()
              continue
            }
            const rowRect = row.getBoundingClientRect()
            if (rowRect.width === 0) {
              oldBadges?.remove()
              oldSpinner?.remove()
              continue
            }
            // Inline ownership is deliberate: the aggregate is absolutely
            // positioned, and DSH may reconcile the row's class/style after
            // our CSS has loaded. Without a positioned row the badge anchors
            // to the scroller and can appear hundreds of pixels above its row.
            row.style.position = 'relative'

            const titleNode = row.querySelector('.wnFoaW_title')
            let projectText = titleNode?.closest?.('.wnFoaW_projectText')
              ?? titleNode?.parentElement
              ?? null
            while (projectText !== null && projectText.parentElement !== row) {
              projectText = projectText.parentElement
            }

            let badges = oldBadges
            if (activeEntries.length > 0) {
              if (badges === null || badges.parentElement !== row) {
                for (const stale of row.querySelectorAll(':scope > .dshia-folder-badges,:scope > .dshia-folder-dots')) {
                  stale.remove()
                }
                badges = document.createElement('div')
                badges.className = 'dshia-folder-badges'
              }
              const signature = activeEntries.map((entry) => `${entry.state}:${entry.count}`).join('|')
              if (badges.dataset.signature !== signature) {
                if (activeEntries.length > 1) {
                  badges.replaceChildren(createFolderCapsule(activeEntries, titles.join('\n')))
                } else {
                  badges.replaceChildren(createFolderBadge(
                    activeEntries[0].state,
                    activeEntries[0].count,
                    titles.join('\n'),
                    isSoloBadge,
                  ))
                }
                badges.dataset.signature = signature
              }
              badges.title = titles.join('\n')
              if (badges.parentElement !== row) row.appendChild(badges)
            } else {
              badges?.remove()
              badges = null
            }

            let spinner = oldSpinner
            if (hasOngoing) {
              if (spinner === null || spinner.parentElement !== row) {
                for (const stale of row.querySelectorAll(':scope > .dshia-folder-spinner')) {
                  stale.remove()
                }
                spinner = createFolderSpinner()
                spinner.title = titles.join('\n')
              }
              const anchor = projectText?.nextSibling ?? null
              if (spinner.parentElement !== row || spinner.previousElementSibling !== projectText) {
                if (anchor !== null) row.insertBefore(spinner, anchor)
                else row.appendChild(spinner)
              }
            } else {
              spinner?.remove()
              spinner = null
            }

            if (badges !== null) {
              // Home is a special workspace row and does not always expose the
              // folder icon as a direct child; fall back to the descendant
              // icon rather than leaving the badge at its static position.
              const folder = row.querySelector(':scope > .wnFoaW_folder')
                ?? row.querySelector('.wnFoaW_folder')
              const folderRect = folder?.getBoundingClientRect()
              const firstBadge = badges.firstElementChild
              const firstRect = firstBadge?.getBoundingClientRect()
              const badgeWidth = firstRect?.width ?? 14
              const badgeHeight = firstRect?.height ?? 14
              const nudge = isSoloBadge ? 2 : 0
              const anchorLeft = folderRect?.left ?? rowRect.left + 14
              const anchorTop = folderRect?.top ?? rowRect.top + 4
              const desiredLeft = anchorLeft - rowRect.left - 4 - badgeWidth / 2 + nudge
              const maxLeft = rowRect.width - badges.getBoundingClientRect().width - 4
              badges.style.left = `${Math.max(2, Math.min(desiredLeft, maxLeft))}px`
              // Put the badge's center just above the folder icon so it
              // overlaps the icon's top-left corner, not the row center.
              badges.style.top = `${Math.max(2, anchorTop - rowRect.top + 3 - badgeHeight / 2 + nudge)}px`
            }
            next.set(workspaceId, { badges, spinner })
          }

          for (const [workspaceId, node] of groupsRef.current) {
            if (!next.has(workspaceId)) {
              node.badges?.remove()
              node.spinner?.remove()
            }
          }
          groupsRef.current = next
        }, [])

        const schedule = React.useCallback(() => {
          if (frameRef.current !== 0) return
          frameRef.current = requestAnimationFrame(() => {
            frameRef.current = 0
            decorate()
          })
        }, [decorate])

        React.useEffect(() => {
          schedule()
        }, [items, statuses, schedule])

        React.useEffect(() => {
          const host = document.querySelector('.wnFoaW_scrollArea')
            ?? document.querySelector('[class*="scrollArea"]')
            ?? document.body
          window.addEventListener('resize', schedule)
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              const target = mutation.target
              if (mutation.type === 'attributes'
                && mutation.attributeName === 'aria-expanded'
                && target?.getAttribute?.('data-row-key')?.startsWith('workspace:') === true) {
                schedule()
                return
              }
              const inWorkspaceRow = target?.matches?.('[data-row-key^="workspace:"]') === true
                || target?.closest?.('[data-row-key^="workspace:"]') != null
              if (mutation.type === 'childList' && inWorkspaceRow) {
                schedule()
                return
              }
            }
          })
          observer.observe(host, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['aria-expanded'],
          })
          schedule()
          return () => {
            window.removeEventListener('resize', schedule)
            observer.disconnect()
            cancelAnimationFrame(frameRef.current)
            frameRef.current = 0
            for (const group of groupsRef.current.values()) {
              group.badges?.remove()
              group.spinner?.remove()
            }
            groupsRef.current.clear()
          }
        }, [schedule])

        return null
      }

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'index-adjust.dialog',
        locale: NS,
        inject: () => ({ hooks: { adjust: store } }),
      }, Dialog))

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'index-adjust.folder-status-dots',
        locale: NS,
      }, FolderStatusDots))
    }

    return {
      apply,
      inject: ['slots', 'locale', 'contextMenus', 'workspaces', 'sessions', 'uiWorkspace'],
    }
    })(require)])

    // ---- context-usage ----
    __parts.push(['context-usage', (function (require) {

    const React = require('react')
    const reactDom = require('react-dom')
    const h = React.createElement
    const { useEffect, useRef, useState } = React

    /* ---------------------------------------------------------------------- */
    /* Constants                                                              */
    /* ---------------------------------------------------------------------- */

    const NS = 'context-usage'
    const CLIENT_VERSION = '0.2.0-rc.2'
    const BALANCE_REFRESH_MS = 10000
    const HIDE_SHIPPED_DOCK = true
    const DOCK_MARKER = 'composer-dock-anchor'
    const DOCK_STYLE_ID = '@local/dsh-context-usage/dock-override.css'
    const PALETTE_STYLE_ID = '@local/dsh-context-usage/palette.css'

    const RING_RADIUS = 5.2
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

    /* Painted left to right. Four groups only: a bucket so thin that it reads as
     * a scratch is worse than no bucket at all, so user messages, assistant
     * replies and compaction summaries share one "messages" band. Tool
     * definitions and tool results stay adjacent — they are one story. */
    const BUCKETS = [
      { key: 'system', label: 'system', sources: ['system'] },
      { key: 'tools', label: 'tools', sources: ['tools'] },
      { key: 'tool', label: 'tool', sources: ['tool'] },
      { key: 'messages', label: 'messages', sources: ['user', 'assistant', 'compact'] },
    ]

    /** Buckets shown when the Host projection is unavailable (older Host half). */
    const LEGACY_BUCKETS = [
      { key: 'system', label: 'system', sources: ['system'] },
      { key: 'tools', label: 'tools', sources: ['tools'] },
      { key: 'messages', label: 'messages', sources: ['assistant'] },
    ]


    /* ---------------------------------------------------------------------- */
    /* Palette                                                                */
    /* ---------------------------------------------------------------------- */

    /* Every band is painted in a light, low-saturation fill; what the current
     * turn added is painted in that band's `ink` at the band's right edge. The
     * four hues were picked as one sequence — violet → blue → amber → green —
     * so neighbours never fight: the warm amber never lands next to the green,
     * and the red that used to sit beside it is gone entirely. */
    const PALETTE_CSS = `
:root {
  --cu-system: #7c3aed;
  --cu-tools: #2563eb;
  --cu-tool: #0891b2;
  --cu-messages: #059669;
  --cu-track: rgba(0, 0, 0, 0.07);
  --cu-turn: #047857;
  --cu-ring: #4d8df5;
}
body[data-ds-dark-theme] {
  --cu-system: #6d28d9;
  --cu-tools: #1d4ed8;
  --cu-tool: #0e7490;
  --cu-messages: #047857;
  --cu-track: rgba(255, 255, 255, 0.10);
  --cu-turn: #6ee7b7;
  --cu-ring: #7fb2ff;
}
`


    /* ---------------------------------------------------------------------- */
    /* Copy                                                                   */
    /* ---------------------------------------------------------------------- */

    const zh = {
      title: '上下文用量',
      commandDescription: '查看本会话的上下文占用明细',
      running: '统计中…',
      failed: '统计失败',
      system: '系统提示词',
      tools: '工具定义',
      user: '用户消息',
      assistant: '助手回复',
      tool: '工具结果',
      compact: '压缩摘要',
      messages: '对话消息',
      free: '剩余空间',
      noSample: '暂无样本',
      miss: '未命中',
      hit: '命中',
      hitRate: '命中率',
      output: '输出',
      turns: '轮',
      steps: '步',
      tps: 'tok/s',
      turnNew: '本轮',
      estimated: '估算',
      balanceTitle: 'DeepSeek 余额',
      balanceSignedOut: '余额 未登录',
      balanceEmpty: '余额 无钱包',
      balanceFailed: '余额 读取失败',
      balanceError: '余额 接口异常',
    }

    const en = {
      title: 'Context usage',
      commandDescription: 'Show what this session has in context',
      running: 'Measuring…',
      failed: 'Measurement failed',
      system: 'System prompt',
      tools: 'Tool definitions',
      user: 'User messages',
      assistant: 'Assistant replies',
      tool: 'Tool results',
      compact: 'Compaction',
      messages: 'Messages',
      free: 'Free',
      noSample: 'No sample yet',
      miss: 'Uncached',
      hit: 'Cached',
      hitRate: 'Hit rate',
      output: 'Output',
      turns: 'turns',
      steps: 'steps',
      tps: 'tok/s',
      turnNew: 'this turn',
      estimated: 'estimate',
      balanceTitle: 'DeepSeek balance',
      balanceSignedOut: 'balance: signed out',
      balanceEmpty: 'balance: no wallet',
      balanceFailed: 'balance: read failed',
      balanceError: 'balance: call failed',
    }

    /* ---------------------------------------------------------------------- */
    /* Styles                                                                 */
    /* ---------------------------------------------------------------------- */

    const S = {
      /* The band is a flex child of the shipped composer card, inserted between
       * the draft and the button row. Measured against the shipped CSS, the
       * draft text starts 12px below the card's top edge (8px card padding-top
       * + 4px .input padding-top) and the one-line draft box also carries 8px
       * of slack below the text (min-height 36 vs 24px line + 4px pad), so a 0
       * margin still reads as a ~20px gap. -9.8px pulls it to ~10.2px (12px
       * minus the 15% the user asked to trim), and -7.2px keeps 6.8px to the
       * button row (12px gap + 2px row padding). */
      panel: {
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        margin: '-9.8px 0 -7.2px',
        padding: '0 12px 0',
        minWidth: 0,
      },
      panelCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
      },
      card: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 12px',
        border: '1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.1))',
        borderRadius: 'var(--dsw-radius-lg, 10px)',
        minWidth: 0,
      },
      head: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 },
      title: {
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--dsw-alias-label-primary, inherit)',
        whiteSpace: 'nowrap',
      },
      figure: {
        fontSize: 11,
        color: 'var(--dsw-alias-label-secondary, inherit)',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      },
      percent: {
        fontSize: 12,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        color: 'var(--dsw-alias-label-primary, inherit)',
        whiteSpace: 'nowrap',
      },
      turnBadge: {
        fontSize: 11,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        color: 'var(--cu-turn)',
        whiteSpace: 'nowrap',
      },
      spacer: { flex: '1 1 auto', minWidth: 0 },
      stats: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 14,
        flexWrap: 'wrap',
        minWidth: 0,
      },
      statLabel: { fontSize: 13, color: 'var(--dsw-alias-label-secondary, inherit)', whiteSpace: 'nowrap' },
      statValue: {
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--dsw-alias-label-primary, inherit)',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        marginLeft: 5,
      },
      bar: {
        position: 'relative',
        width: '100%',
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
        background: 'var(--cu-track)',
      },
      barLayer: {
        position: 'absolute',
        top: -2,
        bottom: -2,
        left: -2,
        right: -2,
        display: 'flex',
        alignItems: 'stretch',
        filter: 'blur(1px)',
      },
      segment: {
        height: '100%',
        flex: '0 0 auto',
        overflow: 'hidden',
      },
      legend: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        minWidth: 0,
      },
      chip: { display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0, whiteSpace: 'nowrap' },
      chipLabel: { fontSize: 11.5, color: 'var(--dsw-alias-label-secondary, inherit)' },
      chipValue: {
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--dsw-alias-label-primary, inherit)',
        fontVariantNumeric: 'tabular-nums',
      },
      pace: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, inherit)', whiteSpace: 'nowrap' },
      muted: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, inherit)' },
      error: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary, #e5484d)' },
      toggle: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 24,
        padding: '0 6px',
        border: '1px solid transparent',
        borderRadius: 6,
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary, inherit)',
        fontSize: 11,
        fontVariantNumeric: 'tabular-nums',
        cursor: 'pointer',
      },
      toggleActive: {
        background: 'var(--cu-track)',
        color: 'var(--dsw-alias-label-primary, inherit)',
      },
      balance: {
        display: 'inline-flex',
        alignItems: 'center',
        height: 24,
        padding: '0 2px',
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        color: 'var(--dsw-alias-label-secondary, inherit)',
      },
    }

    /* ---------------------------------------------------------------------- */
    /* Formatting                                                             */
    /* ---------------------------------------------------------------------- */

    /**
     * Compact token count: exact below 1000, then `101.4K`, `25.7M`.
     * @param value - the count, possibly undefined.
     * @returns display text, `—` when there is no sample.
     */
    function formatTokens(value) {
      if (value === undefined || value === null || !Number.isFinite(value)) return '—'
      const n = Math.max(0, value)
      if (n < 1000) return String(Math.round(n))
      if (n < 1e6) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
      if (n < 1e9) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`
      return `${(n / 1e9).toFixed(1).replace(/\.0$/, '')}B`
    }

    /**
     * Balance amount as currency text.
     * @param amount - a decimal string or number.
     * @param symbol - `¥` or `$`.
     * @returns display text.
     */
    function formatBalance(amount, symbol) {
      const value = Number(amount)
      if (!Number.isFinite(value)) return `${symbol}—`
      if (value > 0 && value < 0.01) return `<${symbol}0.01`
      return `${symbol}${value.toFixed(2)}`
    }

    /**
     * A ratio clamped to 0..100, undefined when undefined.
     * @param part - numerator.
     * @param whole - denominator.
     * @returns the percentage in 0..100, or undefined.
     */
    function share(part, whole) {
      if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return undefined
      return Math.max(0, Math.min(100, (part / whole) * 100))
    }

    /**
     * One-decimal percentage, without a trailing `.0`.
     * @param value - the percentage.
     * @returns display text.
     */
    function percentText(value) {
      if (value === undefined) return '—'
      return `${value.toFixed(1).replace(/\.0$/, '')}%`
    }

    /**
     * The locale binder handed to every slot.
     * @param props - slot props carrying `t`.
     * @returns the translate function.
     */
    function translator(props) {
      return props && typeof props.t === 'function' ? props.t : (key) => key
    }

    /**
     * The projection reader handed to every slot.
     * @param props - slot props carrying `useProjection`.
     * @returns the read function.
     */
    function projectionReader(props) {
      return props && typeof props.useProjection === 'function'
        ? props.useProjection
        : () => undefined
    }

    /* ---------------------------------------------------------------------- */
    /* Model                                                                  */
    /* ---------------------------------------------------------------------- */

    /**
     * Compose the display model: exact occupancy, six priced buckets rescaled
     * onto it, this turn's additions, and the free remainder.
     *
     * Rescaling exists because two different meters meet here. `contextPressure`
     * reports what the provider actually billed for the last request — exact,
     * compactors and proxies included. The projection prices the session log
     * with a fixed density — honest for proportions, always a little off in
     * absolute terms, and blind to a proxy that rewrites the request in flight.
     * Anchoring the buckets on the reported size keeps every number consistent
     * with the occupancy, which is the number the user is really reading.
     *
     * @param pressure - the `contextPressure` projection value.
     * @param detail - this bundle's `contextUsage` projection value.
     * @param breakdown - the shipped `contextBreakdown` value (legacy fallback).
     * @returns the model, or undefined before the first request.
     */
    function usageModel(pressure, detail, breakdown) {
      const used = pressure === undefined ? undefined : pressure.projectedTokens ?? pressure.pressureTokens
      const capacity = pressure === undefined ? undefined : pressure.contextWindow
      if (!Number.isFinite(capacity) || capacity <= 0) return undefined

      const legacy = detail === undefined || detail === null
      const source = legacy
        ? {
          system: breakdown === undefined ? 0 : breakdown.systemTokens,
          tools: breakdown === undefined ? 0 : breakdown.toolsTokens,
          assistant: breakdown === undefined ? 0 : breakdown.messageTokens,
        }
        : {
          system: count(detail.system),
          tools: count(detail.tools),
          user: count(detail.user),
          assistant: count(detail.assistant),
          tool: count(detail.tool),
          compact: count(detail.compact),
        }

      const budget = Number.isFinite(used) ? Math.max(0, used) : 0
      const fixed = count(source.system) + count(source.tools)
      const messages = count(source.user) + count(source.assistant) + count(source.tool) + count(source.compact)
      const priced = fixed + messages

      let kFixed = 1
      let kMessages = 1
      if (budget > 0 && priced > 0) {
        if (budget <= fixed || messages <= 0) {
          kFixed = budget / priced
          kMessages = kFixed
        } else {
          kMessages = (budget - fixed) / messages
        }
      }

      const turn = legacy || detail.turn === undefined ? undefined : detail.turn
      const scaleOf = (key) => (key === 'system' || key === 'tools' ? kFixed : kMessages)
      const placed = (key) => count(source[key]) * scaleOf(key)
      /* `turn` already holds the delta, not a baseline: the Host folds it as
       * "current minus the value at the last `turn/start`". */
      const added = (key) => (turn === undefined ? 0 : count(turn[key]) * scaleOf(key))

      const buckets = (legacy ? LEGACY_BUCKETS : BUCKETS).map((bucket) => {
        let value = 0
        let raw = 0
        let delta = 0
        for (const key of bucket.sources) {
          value += placed(key)
          raw += count(source[key])
          delta += added(key)
        }
        return {
          key: bucket.key,
          label: bucket.label,
          sources: bucket.sources,
          value,
          raw,
          delta: value > 0 ? Math.min(delta, value) : 0,
        }
      })


      let deltaTotal = 0
      for (const bucket of buckets) deltaTotal += bucket.delta

      return {
        used: budget,
        capacity,
        usedPercent: share(budget, capacity),
        free: Math.max(0, capacity - budget),
        buckets,
        painted: buckets.filter((bucket) => bucket.value > 0),
        deltaTotal,
      }
    }

    /**
     * A non-negative finite count, or 0.
     * @param value - anything.
     * @returns the count.
     */
    function count(value) {
      return Number.isFinite(value) && value > 0 ? value : 0
    }

    /* ---------------------------------------------------------------------- */
    /* Panel state                                                            */
    /* ---------------------------------------------------------------------- */

    /** Session ids whose panel is open. */
    const PANEL_OPEN = new Set()
    /** Render callbacks to wake when that set changes. */
    const PANEL_LISTENERS = new Set()
    /**
     * Route the Host serves the remembered toggles on. The Host, not
     * `localStorage`, owns this: every GUI launch picks a fresh port, and a
     * remembered toggle must survive that.
     */
    const PANEL_ROUTE = '/__context-usage/panels'
    /** Whether the Host copy has been read once in this page. */
    let PANEL_LOADED = false
    /** Shared read, so every band mounting at once costs one request. */
    let PANEL_HYDRATING = null

    function notifyPanels() {
      for (const listener of Array.from(PANEL_LISTENERS)) listener()
    }

    /**
     * Read the remembered toggles from the Host once. A failure leaves the
     * in-memory set alone: the band still works, it just forgets on reload.
     */
    function hydratePanels() {
      if (PANEL_LOADED || PANEL_HYDRATING !== null) return
      let request
      try {
        request = fetch(PANEL_ROUTE, { headers: { accept: 'application/json' } })
      } catch {
        return
      }
      PANEL_HYDRATING = request
        .then((response) => (response.ok ? response.json() : null))
        .then((body) => {
          const panels = body && body.panels
          if (!panels || typeof panels !== 'object') return
          let changed = false
          for (const [sessionId, open] of Object.entries(panels)) {
            if (open === true && typeof sessionId === 'string' && !PANEL_OPEN.has(sessionId)) {
              PANEL_OPEN.add(sessionId)
              changed = true
            }
          }
          PANEL_LOADED = true
          if (changed) notifyPanels()
        })
        .catch(() => {})
        .then(() => {
          PANEL_HYDRATING = null
        })
    }

    /**
     * Send one toggle to the Host. Fire-and-forget: a failed write only costs
     * the memory across a restart.
     * @param sessionId - the session.
     * @param open - the new state.
     */
    function persistPanel(sessionId, open) {
      try {
        void fetch(PANEL_ROUTE, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId, open }),
          keepalive: true,
        }).catch(() => {})
      } catch {
        /* persistence is best effort */
      }
    }

    /**
     * Open or close one session's panel.
     * @param sessionId - the session.
     * @param value - the desired state.
     */
    function setPanelOpen(sessionId, value) {
      if (typeof sessionId !== 'string' || sessionId.length === 0) return
      const open = PANEL_OPEN.has(sessionId)
      if (open === value) return
      if (value) PANEL_OPEN.add(sessionId)
      else PANEL_OPEN.delete(sessionId)
      notifyPanels()
      persistPanel(sessionId, value)
    }

    /** Close every panel (plugin teardown). */
    function closeAllPanels() {
      if (PANEL_OPEN.size === 0) return
      PANEL_OPEN.clear()
      notifyPanels()
    }

    /**
     * Subscribe one component to a session's panel state.
     * @param sessionId - the session.
     * @returns whether its panel is open.
     */
    function usePanelOpen(sessionId) {
      const [open, setOpen] = useState(() => typeof sessionId === 'string' && PANEL_OPEN.has(sessionId))
      useEffect(() => {
        const sync = () => setOpen(typeof sessionId === 'string' && PANEL_OPEN.has(sessionId))
        PANEL_LISTENERS.add(sync)
        sync()
        hydratePanels()
        return () => {
          PANEL_LISTENERS.delete(sync)
        }
      }, [sessionId])
      return open
    }

    /* ---------------------------------------------------------------------- */
    /* Atoms                                                                  */
    /* ---------------------------------------------------------------------- */

    /**
     * Tween the decorative menu glyph.
     * @returns a 16px SVG.
     */
    function ContextGlyph() {
      return h('svg', {
        width: 16,
        height: 16,
        viewBox: '0 0 16 16',
        'aria-hidden': 'true',
        style: { flex: '0 0 auto' },
      }, [
        h('path', {
          key: 'a',
          d: 'M2 4.5A2.5 2.5 0 0 1 4.5 2h7A2.5 2.5 0 0 1 14 4.5v3A2.5 2.5 0 0 1 11.5 10H6l-2.6 2.1A.6.6 0 0 1 2.4 11.6V9.9',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinejoin: 'round',
          strokeLinecap: 'round',
        }),
      ])
    }

    /**
     * The filled occupancy ring.
     * @param props - `percent` in 0..100, or undefined for no sample.
     * @returns a 16px SVG.
     */
    function Ring({ percent }) {
      const value = percent === undefined ? 0 : Math.max(0, Math.min(100, percent))
      const hot = value >= 90
      const stroke = hot ? 'var(--dsw-alias-state-error-primary, #e5484d)' : 'var(--cu-ring, #4d8df5)'
      return h('svg', {
        width: 16,
        height: 16,
        viewBox: '0 0 16 16',
        'aria-hidden': 'true',
        style: { flex: '0 0 auto' },
      }, [
        h('circle', {
          key: 'track',
          cx: 8,
          cy: 8,
          r: RING_RADIUS,
          fill: 'none',
          stroke: 'var(--cu-track)',
          strokeWidth: 2,
        }),
        value > 0 ? h('circle', {
          key: 'value',
          cx: 8,
          cy: 8,
          r: RING_RADIUS,
          fill: 'none',
          stroke,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeDasharray: `${(value / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`,
          transform: 'rotate(-90 8 8)',
        }) : null,
      ])
    }

    /**
     * One legend chip.
     * @param props - label, fill and ink variables, formatted value.
     * @returns the chip.
     */
    /** Compact line icons for the legend, one shape per bucket, drawn in the
     *  bucket's own colour so the chips read like the shipped panel's did. */
    const GLYPHS = {
      system: [
        ['rect', { x: 2.6, y: 2.6, width: 10.8, height: 10.8, rx: 2.2 }],
        ['path', { d: 'M5.4 6.2h5.2' }],
        ['path', { d: 'M5.4 9.4h3.2' }],
      ],
      tools: [
        ['path', { d: 'M2.6 5.2h10.8' }],
        ['path', { d: 'M2.6 10.8h10.8' }],
        ['circle', { cx: 6.2, cy: 5.2, r: 1.7, fill: 'currentColor', stroke: 'none' }],
        ['circle', { cx: 10.2, cy: 10.8, r: 1.7, fill: 'currentColor', stroke: 'none' }],
      ],
      tool: [
        ['rect', { x: 2.6, y: 3.4, width: 10.8, height: 9.2, rx: 2 }],
        ['path', { d: 'M5.4 6.1l1.95 1.85-1.95 1.85' }],
        ['path', { d: 'M9.2 10h2.2' }],
      ],
      messages: [
        ['rect', { x: 2.6, y: 3.4, width: 10.8, height: 7.6, rx: 2 }],
        ['path', { d: 'M5.6 11v2.4l2.8-2.4' }],
      ],
      free: [
        ['rect', { x: 2.6, y: 2.6, width: 10.8, height: 10.8, rx: 2.2, strokeDasharray: '2 2' }],
      ],
    }

    function BucketGlyph({ kind, color }) {
      const shapes = GLYPHS[kind] === undefined ? GLYPHS.system : GLYPHS[kind]
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        style: { flex: '0 0 auto', color },
      }, shapes.map(([tag, attrs], index) => h(tag, Object.assign({ key: index }, attrs))))
    }

    function Chip({ kind, label, color, value, title }) {
      return h('span', { style: S.chip, title }, [
        h(BucketGlyph, { key: 'glyph', kind, color }),
        h('span', { key: 'label', style: S.chipLabel }, label),
        h('span', { key: 'value', style: S.chipValue }, value),
      ])
    }

    /* ---------------------------------------------------------------------- */
    /* Blocks                                                                 */
    /* ---------------------------------------------------------------------- */

    /**
     * The single-band occupancy bar.
     *
     * Each band is painted in its light fill and opens with a short gradient
     * from the band to its left, so neighbours melt instead of abutting. What
     * this turn added is painted in the band's ink at the band's right edge —
     * inside the band, never as a separate segment — with a soft left edge so
     * the reading stays "this block grew", not "here is another block".
     *
     * @param props - the model.
     * @returns the bar.
     */
    function OccupancyBar({ model, t }) {
      const widthOf = (value) => `${Math.max(0, Math.min(100, (value / model.capacity) * 100))}%`
      const painted = model.painted
      const bands = painted.map((bucket) => {
        const percent = share(bucket.value, model.capacity)
        const label = `${t(bucket.label)} ${formatTokens(bucket.value)}${percent === undefined ? '' : ` · ${percentText(percent)}`}`
        return h('div', {
          key: bucket.key,
          style: Object.assign({}, S.segment, {
            width: widthOf(bucket.value),
            background: `var(--cu-${bucket.key})`,
          }),
          title: label,
          'data-bucket': bucket.key,
        })
      })
      return h('div', {
        style: S.bar,
        role: 'img',
        'aria-label': painted.map((bucket) => `${t(bucket.label)} ${formatTokens(bucket.value)}`).join(', '),
      }, h('div', { key: 'layer', style: S.barLayer }, bands))
    }


    /**
     * The token ledger: uncached, cached, hit rate, output.
     * @param props - the `tokenUsage` projection value.
     * @returns the ledger spans, separated by dots.
     */
    function Ledger({ usage, t }) {
      if (usage === undefined) return null
      const hit = share(usage.cacheReadTokens, (usage.cacheReadTokens || 0) + (usage.uncachedInputTokens || 0))
      const cells = [
        ['miss', formatTokens(usage.uncachedInputTokens)],
        ['hit', formatTokens(usage.cacheReadTokens)],
        ['output', formatTokens(usage.outputTokens)],
        ['hitRate', hit === undefined ? '—' : percentText(hit)],
      ]
      const children = []
      cells.forEach((cell, index) => {
        if (index > 0) children.push(h('span', { key: `sep${index}`, style: S.muted }, '·'))
        children.push(h('span', { key: cell[0] }, [
          h('span', { key: 'label', style: S.statLabel }, t(cell[0])),
          h('span', { key: 'value', style: S.statValue }, cell[1]),
        ]))
      })
      return children
    }

    /**
     * The card body.
     * @param props - locale, the three projection values and session stats.
     * @returns the bands.
     */
    function bodyChildren(props) {
      const { t, pressure, detail, breakdown, usage, session } = props
      const model = usageModel(pressure, detail, breakdown)

      if (model === undefined) {
        return [h('div', { key: 'empty', style: S.head }, [
          h('span', { key: 'figure', style: S.figure }, '— / —'),
          h('span', { key: 'hint', style: S.muted }, t('noSample')),
        ])]
      }

      const pace = []
      if (session !== undefined) {
        if (session.turns > 0) pace.push(`${session.turns} ${t('turns')}`)
        if (session.steps > 0) pace.push(`${session.steps} ${t('steps')}`)
        if (session.decodeMs > 0 && session.decodeTokens > 0) {
          pace.push(`${Math.round(session.decodeTokens / (session.decodeMs / 1000))} ${t('tps')}`)
        }
      }

      const head = h('div', { key: 'head', style: S.head }, [
        h('span', { key: 'figure', style: S.figure }, `${formatTokens(model.used)} / ${formatTokens(model.capacity)}`),
        model.deltaTotal > 0
          ? h('span', {
            key: 'turn',
            style: S.turnBadge,
            title: `${t('turnNew')} ${formatTokens(model.deltaTotal)} · ${t('estimated')}`,
          }, `${t('turnNew')} +${formatTokens(model.deltaTotal)}${share(model.deltaTotal, model.capacity) === undefined ? '' : ` (${percentText(share(model.deltaTotal, model.capacity))})`}`)
          : null,
        h('span', { key: 'spacer', style: S.spacer }),
        h('span', { key: 'ledger', style: S.stats }, Ledger({ usage, t })),
      ])

      const chips = model.buckets
        .filter((bucket) => bucket.value > 0)
        .map((bucket) => h(Chip, {
          key: bucket.key,
          kind: bucket.key,
          label: t(bucket.label),
          color: `var(--cu-${bucket.key})`,
          value: formatTokens(bucket.value),
          title: `${t(bucket.label)} ${formatTokens(bucket.value)}${bucket.sources.length > 1 ? ` (${bucket.sources.map((key) => t(key)).join(' + ')})` : ''} · ${t('estimated')} ${formatTokens(bucket.raw)}`,
        }))
      chips.push(h(Chip, {
        key: 'free',
        kind: 'free',
        label: t('free'),
        color: 'rgba(127, 127, 127, 0.55)',
        value: formatTokens(model.free),
        title: `${t('free')} ${formatTokens(model.free)} · ${percentText(share(model.free, model.capacity))}`,
      }))
      chips.push(h('span', { key: 'spacer', style: S.spacer }))
      if (pace.length > 0) chips.push(h('span', { key: 'pace', style: S.pace }, pace.join(' · ')))

      return [
        head,
        h(OccupancyBar, { key: 'bar', model, t }),
        h('div', { key: 'legend', style: S.legend }, chips),
      ]
    }

    /* ---------------------------------------------------------------------- */
    /* Slots                                                                  */
    /* ---------------------------------------------------------------------- */

    /**
     * Seat a band inside the shipped composer card, right above its button row.
     *
     * The card only exposes `conversation.input.overlay` (a zero-height,
     * absolutely positioned anchor for popups) to third parties, so an in-flow
     * seat has to be a portal: an anchored entry reserves a `display:none`
     * marker in the composer stack, finds the neighbouring `[data-composer-card]`,
     * and inserts a `display:contents` host before the card's last child (the
     * `.row` that carries the permission chip and the submit button). Because the
     * host generates no box, the band itself becomes the card's flex child and
     * inherits its 12px column gap.
     * @param props - `open` plus the band children.
     * @returns the invisible marker and, while open, the portal.
     */
    function ComposerBandSeat(props) {
      const { open, children } = props
      const anchorRef = useRef(null)
      const [host, setHost] = useState(undefined)

      useEffect(() => {
        if (!open) return undefined
        const anchor = anchorRef.current
        let scopeNode
        let bandHost
        let observer

        const place = () => {
          if (!anchor || !anchor.isConnected) return
          let node = anchor.parentElement
          let card
          while (node !== null && node !== document.body) {
            card = node.querySelector('[data-composer-card]')
            if (card !== null && card !== undefined) break
            node = node.parentElement
          }
          if (card === null || card === undefined) return
          /* The control row carries the submit button; take the last direct child
           * that does, so a session without one still lands somewhere sane. */
          const children = Array.from(card.children).reverse()
          const row = children.find(child => child.querySelector('button') !== null) ?? card.lastElementChild
          if (row === null) return
          if (bandHost !== undefined && bandHost.parentElement === card && bandHost.nextElementSibling === row) return
          if (bandHost === undefined) {
            bandHost = document.createElement('div')
            bandHost.setAttribute('data-context-usage', 'band-host')
            bandHost.style.display = 'contents'
          }
          card.insertBefore(bandHost, row)
          setHost(bandHost)
          if (node !== scopeNode) {
            scopeNode = node
            if (observer !== undefined) observer.disconnect()
            observer = new MutationObserver(() => {
              place()
            })
            observer.observe(scopeNode, { childList: true })
          }
        }

        place()
        return () => {
          if (observer !== undefined) observer.disconnect()
          if (bandHost !== undefined) bandHost.remove()
        }
      }, [open])

      return h(React.Fragment, null,
        h('span', { key: 'anchor', ref: anchorRef, style: { display: 'none' } }),
        open && host !== undefined ? reactDom.createPortal(
          h('div', { style: S.panel }, children), host) : null)
    }

    /**
     * The occupancy panel the `/context` action and the composer button open.
     * @param props - the dock entry's standard session shares.
     * @returns the band inside the composer card, or null while it is closed.
     */
    function ContextUsagePanel(props) {
      const t = translator(props)
      const read = projectionReader(props)
      const sessionId = props ? props.sessionId : undefined
      const open = usePanelOpen(sessionId)
      const pressure = read('contextPressure')
      const detail = read('contextUsage')
      const breakdown = read('contextBreakdown')
      const usage = read('tokenUsage')
      const session = read('sessionStats')
      return h(ComposerBandSeat, { open },
        h('div', { key: 'panel', style: S.panelCard, 'data-context-usage': 'panel' },
          bodyChildren({ t, pressure, detail, breakdown, usage, session })))
    }

    /**
     * The composer's occupancy button: a live percentage that opens and closes
     * this session's panel. It sits in `conversation.input.right`, the compact
     * control seat immediately before the submit action.
     * @param props - the composer row's standard session shares.
     * @returns the toggle button.
     */
    function ContextToggle(props) {
      const t = translator(props)
      const read = projectionReader(props)
      const sessionId = props ? props.sessionId : undefined
      const open = usePanelOpen(sessionId)
      const [hover, setHover] = useState(false)
      const pressure = read('contextPressure')
      const used = pressure === undefined ? undefined : pressure.projectedTokens ?? pressure.pressureTokens
      const percent = share(used, pressure === undefined ? undefined : pressure.contextWindow)
      return h('button', {
        type: 'button',
        style: open || hover ? Object.assign({}, S.toggle, S.toggleActive) : S.toggle,
        title: t('title'),
        'aria-label': t('title'),
        'aria-pressed': open,
        'data-context-usage': 'toggle',
        onClick: () => setPanelOpen(sessionId, !open),
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
      }, [
        h(Ring, { key: 'ring', percent }),
        percent === undefined ? null : h('span', { key: 'text' }, `${Math.round(percent)}%`),
      ])
    }

    /**
     * A `context` command row logged by the earlier Host-command version of this
     * plugin, rendered with the same body.
     * @param props - the command-row owner share plus the standard session kit.
     * @returns the command card.
     */
    function ContextUsageCard(props) {
      const node = props && props.node
      const t = translator(props)
      const read = projectionReader(props)
      const pressure = read('contextPressure')
      const detail = read('contextUsage')
      const breakdown = read('contextBreakdown')
      const usage = read('tokenUsage')
      const session = read('sessionStats')
      const outcome = node ? node.outcome : null
      const head = h('div', { key: 'head', style: S.head }, [
        h(Ring, { key: 'ring', percent: undefined }),
        h('span', { key: 'title', style: S.title }, t('title')),
      ])
      if (outcome === null || outcome === undefined) {
        return h('div', { style: S.card }, head, h('div', { style: S.muted }, t('running')))
      }
      if (outcome.kind === 'error') {
        return h('div', { style: S.card }, head,
          h('div', { style: S.error }, typeof outcome.text === 'string' && outcome.text.length > 0 ? outcome.text : t('failed')))
      }
      return h('div', { style: S.card, 'data-context-usage': 'card' },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 } },
          bodyChildren({ t, pressure, detail, breakdown, usage, session })))
    }

    /* ---------------------------------------------------------------------- */
    /* Plugin                                                                 */
    /* ---------------------------------------------------------------------- */

    /* Test hook: `scripts/check-client.mjs` renders the body headlessly, so the
     * bar widths and the rescaling can be checked without opening the panel. */
    if (globalThis.__CU_TEST__ === true) {
      globalThis.__CU_EXPORTS__ = { usageModel, bodyChildren, formatTokens, share }
    }

    return {
      inject: ['slots', 'locale', 'commandUi'],
      apply(ctx) {
        const tr = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'context-usage: dictionaries')

        /* The six-bucket palette, in both themes. Scoped to `:root` because the
         * composer toggle draws a ring too, and it lives outside the panel. */
        ctx.effect(() => {
          const tag = document.createElement('style')
          tag.dataset.plugin = '@local/dsh-context-usage'
          tag.dataset.pluginCss = PALETTE_STYLE_ID
          tag.textContent = PALETTE_CSS
          document.head.appendChild(tag)
          return () => {
            tag.remove()
          }
        }, 'context-usage: bucket palette')

        ctx.effect(() => ctx.commandUi.register({
          name: 'context',
          available: () => true,
          label: () => tr('title'),
          description: () => tr('commandDescription'),
          icon: ContextGlyph,
          ui: {
            kind: 'action',
            run: (session) => {
              setPanelOpen(session && session.sessionId, true)
            },
          },
        }), 'context-usage: /context contribution')

        ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
          name: 'conversation.input.dock',
          id: 'context-usage',
          order: 5,
          locale: NS,
        }, ContextUsagePanel))

        ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
          name: 'conversation.input.right',
          id: 'context-usage-toggle',
          order: 0,
          locale: NS,
        }, ContextToggle))

        ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register({
          name: 'conversation.chat.commandview',
          key: 'context',
          locale: NS,
        }, ContextUsageCard))

        /**
         * The composer dock is hidden outright: this bundle carries the session
         * pace the shipped stats pills showed, and the panel above the composer
         * carries the occupancy the shipped ring meter showed. The invisible
         * anchor gives the override a scope of our own, so it can only ever
         * match the dock this bundle renders into.
         */
        if (HIDE_SHIPPED_DOCK) {
          ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
            name: 'conversation.composer.dock',
            id: 'context-usage-anchor',
            order: 1,
            locale: NS,
          }, () => h('span', {
            'data-context-usage': DOCK_MARKER,
            style: { display: 'none' },
          })))
          ctx.effect(() => {
            const tag = document.createElement('style')
            tag.dataset.plugin = '@local/dsh-context-usage'
            tag.dataset.pluginCss = DOCK_STYLE_ID
            tag.textContent = `[class$="_dock"]:has([data-context-usage="${DOCK_MARKER}"]){display:none !important}`
            document.head.appendChild(tag)
            return () => {
              tag.remove()
            }
          }, 'context-usage: hide the shipped composer dock')
        }

        /**
         * The account balance pill, contributed to the composer dock beside the
         * shipped usage pills. It registers in its own account scope (the scope
         * must inject `remote` itself to read a namespace off it), so a
         * composition without the account Remote keeps the command and panel and
         * simply contributes no pill.
         *
         * Polling is visibility-gated, so a hidden or minimized window keeps no
         * loop against the account API.
         */
        ctx.inject(['remote', 'remote.account'], (scope) => {
          function BalancePill() {
            const [state, setState] = useState({ kind: 'pending' })
            useEffect(() => {
              let active = true
              const settle = (next) => {
                if (active) setState(next)
              }
              const read = async () => {
                try {
                  const result = await scope.remote.account.getBalance({
                    version: CLIENT_VERSION,
                    locale: ctx.locale.getSnapshot().active,
                    timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
                  })
                  if (!active) return
                  if (result === undefined || result === null || result.ok !== true) {
                    settle({ kind: 'error', detail: result && result.error ? String(result.error.code) : 'transport' })
                    return
                  }
                  const balance = result.value
                  if (balance === null || balance === undefined) {
                    settle({ kind: 'signedOut' })
                    return
                  }
                  if (balance.status !== 'ready') {
                    settle({ kind: 'failed', detail: typeof balance.reason === 'string' ? balance.reason : '' })
                    return
                  }
                  const normal = balance.value || []
                  const bonus = balance.bonusWallets || []
                  const preferred = normal.find((entry) => entry.currency === 'CNY')
                    || normal[0]
                    || bonus.find((entry) => entry.currency === 'CNY')
                    || bonus[0]
                  if (preferred === undefined) {
                    settle({ kind: 'empty' })
                    return
                  }
                  settle({ kind: 'ready', wallet: preferred, at: Date.now() })
                } catch (error) {
                  settle({ kind: 'error', detail: error && error.message ? String(error.message).slice(0, 60) : 'throw' })
                }
              }
              const tick = () => {
                if (document.visibilityState === 'visible') read()
              }
              read()
              const timer = window.setInterval(tick, BALANCE_REFRESH_MS)
              document.addEventListener('visibilitychange', tick)
              window.addEventListener('focus', tick)
              return () => {
                active = false
                window.clearInterval(timer)
                document.removeEventListener('visibilitychange', tick)
                window.removeEventListener('focus', tick)
              }
            }, [])
            if (state.kind === 'pending') return null
            if (state.kind === 'ready') {
              const at = new Date(state.at)
              return h('span', {
                style: S.balance,
                title: `${tr('balanceTitle')} · ${at.toLocaleTimeString()}`,
                'data-context-usage': 'balance',
              }, formatBalance(state.wallet.balance, state.wallet.currency === 'CNY' ? '¥' : '$'))
            }
            const key = state.kind === 'signedOut' ? 'balanceSignedOut'
              : state.kind === 'empty' ? 'balanceEmpty'
                : state.kind === 'failed' ? 'balanceFailed' : 'balanceError'
            return h('span', {
              style: S.balance, title: state.detail || tr('balanceTitle'), 'data-context-usage': 'balance',
            }, state.detail === undefined ? tr(key) : `${tr(key)}·${state.detail}`)
          }

          /* The dock that used to hold this pill is hidden, so it rides the
           * composer's own control row next to the occupancy button. */
          scope.slots.inject('conversation.input.right', () => scope.slots.register({
            name: 'conversation.input.right',
            id: 'context-usage-balance',
            order: 1,
            locale: NS,
          }, BalancePill))
        })

        ctx.effect(() => () => {
          closeAllPanels()
        }, 'context-usage: panel state')
      },
    }
    })(require)])

    // ---- mcp-lazy ----
    __parts.push(['mcp-lazy', (function (require) {

    const React = require('react')
    const h = React.createElement

    const NS = 'mcpLazy'
    const zh = {
      nav: 'MCP',
      title: 'MCP 服务器',
      intro: '查看当前接入的 MCP。简介与披露给 agent 的目录完全一致；开关只控制向 agent 的披露，不改变 MCP 连接；未连接或未生效渐进式披露的服务器会被标注。',
      loading: '正在读取 MCP 列表…',
      refreshing: '刷新中…',
      refresh: '刷新',
      enable: '启用',
      disable: '停用',
      error: '无法读取 MCP 列表。',
      empty: '当前没有接入任何 MCP 服务器。',
      tools: '个工具',
      tokens: 'tokens',
      abnormal: '披露未生效',
      disclosureInactive: '披露未生效',
      missing: '配置缺失',
      missingHint: '这行 MCP 配置已经不在了（常见于别人整文件重写了 cordis.patch.yml）。把这行加回去即可恢复；行可由 ~/.dsh/mcp-lazy-expected.json 里的记录找回名字与传输方式。',
      forget: '忘记',
      forgetHint: '从登记表里删掉这条已消失服务器的记录。只有既不在配置里、也没有注册工具的条目才能删除。',
      forgetFailed: '无法删除这条记录',
      unavailable: '未连接',
      callFailed: '连接异常',
      noTools: '已连通但无工具',
      connecting: '连接中',
      unconfigured: '未纳入监管',
      unconfiguredHint: '工具已经注册，但插件读不到对应的 MCP 配置行，因此无法控制它的披露、也无法判断它是怎么来的。常见原因：这条服务器由别的插件注册，或配置文件暂时读不到。',
      unknown: '配置不可读',
      unknownHint: '插件读不到 Cordis 的插件行，所以无法判断这台服务器是"被删了"还是"只是看不见"。重启 DSH 后再看；如果一直这样，检查加载器日志。',
      scanFailed: '无法读取 MCP 配置：',
      scanFailedHint: '这不是"没有配置"——插件读不到加载器里的插件行。不要把下面的行当成被删除的配置。',
    }
    const en = {
      nav: 'MCP',
      title: 'MCP servers',
      intro: 'Inspect connected MCP servers. Summaries are exactly what the agent sees; switches control agent disclosure only, not the MCP connection. Servers that are unreachable or lack active progressive disclosure are marked.',
      loading: 'Loading MCP servers…',
      refreshing: 'Refreshing…',
      refresh: 'Refresh',
      enable: 'Enable',
      disable: 'Disable',
      error: 'Could not load MCP servers.',
      empty: 'No MCP servers are connected.',
      tools: 'tools',
      tokens: 'tokens',
      abnormal: 'Disclosure inactive',
      disclosureInactive: 'Disclosure inactive',
      missing: 'Missing',
      missingHint: 'This MCP row is gone from the profile (usually a whole-file rewrite of cordis.patch.yml). Add it back to restore the server; its name and transport are remembered in ~/.dsh/mcp-lazy-expected.json.',
      forget: 'Forget',
      forgetHint: 'Remove this vanished server from the registry mirror. Only entries that are neither configured nor registering tools can be deleted.',
      forgetFailed: 'Could not forget this entry',
      unavailable: 'Unavailable',
      callFailed: 'Connection error',
      noTools: 'Reachable, no tools',
      connecting: 'Connecting',
      unconfigured: 'Not supervised',
      unconfiguredHint: 'Tools are registered, but no MCP loader row matches them, so the plugin cannot control disclosure or explain where they came from. Usually another plugin registered them, or the configuration was unreadable.',
      unknown: 'Config unreadable',
      unknownHint: 'The plugin could not read Cordis loader rows, so it cannot tell "deleted" from "invisible". Restart DSH and look again; if it persists, check the loader log.',
      scanFailed: 'Could not read the MCP configuration: ',
      scanFailedHint: 'This is not an empty configuration — the loader rows were unreadable. Do not read the rows below as removed servers.',
    }

    const CSS = `
.mcp-lazy-page{max-width:760px;display:flex;flex-direction:column;gap:12px;color:var(--dsw-alias-label-primary);font:inherit}
.mcp-lazy-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.mcp-lazy-heading{min-width:0}
.mcp-lazy-title-row{display:flex;align-items:center;gap:8px;min-width:0}
.mcp-lazy-title{margin:0;font-size:18px;font-weight:600;line-height:26px;color:var(--dsw-alias-label-primary);font-family:inherit}
.mcp-lazy-intro{margin:4px 0 0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary);font-family:inherit}
.mcp-lazy-refresh{flex:none;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;color:var(--dsw-alias-label-tertiary);background:transparent;border:0.5px solid transparent;border-radius:var(--dsw-radius-sm,6px);cursor:pointer;font-family:inherit}
.mcp-lazy-refresh:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.mcp-lazy-refresh:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}
.mcp-lazy-refresh:disabled{opacity:.55;cursor:default}
.mcp-lazy-refresh svg{display:block;width:15px;height:15px}
.mcp-lazy-list{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}
.mcp-lazy-card{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;background:var(--dsw-alias-bg-layer-1);border:0.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,10px);min-width:0}
.mcp-lazy-main{min-width:0;display:flex;flex-direction:column;gap:3px}
.mcp-lazy-name{font-size:15px;font-weight:600;line-height:22px;color:var(--dsw-alias-label-primary);font-family:inherit;word-break:break-word}
.mcp-lazy-summary{font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary);font-family:inherit;word-break:break-word}
.mcp-lazy-meta{display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);font-family:inherit}
.mcp-lazy-count,.mcp-lazy-tokens,.mcp-lazy-connecting{white-space:nowrap}
.mcp-lazy-badge{border-radius:999px;padding:1px 8px;font-size:11px;line-height:16px;white-space:nowrap;color:var(--dsw-alias-state-error-primary);border:0.5px solid var(--dsw-alias-state-error-primary)}
.mcp-lazy-badge.warn{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}
.mcp-lazy-switch{position:relative;flex:none;width:32px;height:18px;padding:0;border:0;border-radius:999px;background:var(--dsw-alias-border-l2);cursor:pointer;transition:background .15s ease}
.mcp-lazy-switch::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-bg-layer-1);box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s ease,background .15s ease}
.mcp-lazy-switch[aria-checked="true"]{background:var(--dsw-alias-brand-primary)}
.mcp-lazy-switch[aria-checked="true"]::after{transform:translateX(14px);background:var(--dsw-alias-bg-base)}
.mcp-lazy-switch:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}
.mcp-lazy-switch:disabled{opacity:.5;cursor:default}
.mcp-lazy-card.off .mcp-lazy-name{color:var(--dsw-alias-label-secondary)}
.mcp-lazy-card.off .mcp-lazy-summary{opacity:.7}
.mcp-lazy-muted,.mcp-lazy-error{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary);font-family:inherit}
.mcp-lazy-error{color:var(--dsw-alias-state-error-primary)}
.mcp-lazy-forget{padding:0 2px;background:transparent;border:0;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;line-height:18px;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.mcp-lazy-forget:hover{color:var(--dsw-alias-state-error-primary)}
.mcp-lazy-forget:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}
@media (max-width:560px){.mcp-lazy-card{align-items:flex-start;flex-direction:column;gap:8px}.mcp-lazy-meta{justify-content:flex-start}}
`

    /**
     * Build the page component with the bound translator. The settings shell
     * passes its own `t` when the registration declares a locale namespace;
     * that one wins so live locale switches stay coherent.
     */
    function makePage(t) {
      function formatTokens(tokens) {
        const value = Number.isFinite(tokens) ? Math.max(0, tokens) : 0
        return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value))
      }

      function McpSettingsPage(props) {
        const translate = typeof props?.t === 'function' ? props.t : t
        const [state, setState] = React.useState({ phase: 'loading', servers: [], detail: '', scan: { ok: true, error: null } })
        const [busy, setBusy] = React.useState(false)
        const [toggling, setToggling] = React.useState('')

        const refresh = React.useCallback(async () => {
          setBusy(true)
          try {
            const response = await fetch('/mcp-lazy/servers', {
              cache: 'no-store',
              headers: { accept: 'application/json' },
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const payload = await response.json()
            const servers = Array.isArray(payload?.servers)
              ? payload.servers.filter((server) => server !== null && typeof server === 'object' && typeof server.name === 'string')
              : []
            setState({
              phase: 'ready',
              servers,
              detail: '',
              scan: payload?.scan ?? { ok: true, error: null },
            })
          } catch (error) {
            setState((previous) => ({
              ...previous,
              phase: 'error',
              servers: [],
              detail: String(error?.message ?? error),
            }))
          } finally {
            setBusy(false)
          }
        }, [])

        React.useEffect(() => {
          refresh()
        }, [refresh])

        const setServerEnabled = React.useCallback(async (name, enabled) => {
          setToggling(name)
          try {
            const response = await fetch('/mcp-lazy/toggle', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ name, enabled }),
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            await refresh()
          } catch (error) {
            setState((previous) => ({
              ...previous,
              phase: 'error',
              detail: String(error?.message ?? error),
            }))
          } finally {
            setToggling('')
          }
        }, [refresh])

        // A tombstone is the only thing "forget" may delete; the server refuses
        // anything still configured or still registering tools.
        const forgetServer = React.useCallback(async (name) => {
          if (typeof window.confirm === 'function' && !window.confirm(translate('forgetHint'))) return
          setToggling(name)
          try {
            const response = await fetch('/mcp-lazy/forget', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ name }),
            })
            if (!response.ok) throw new Error(`${translate('forgetFailed')} (HTTP ${response.status})`)
            await refresh()
          } catch (error) {
            setState((previous) => ({
              ...previous,
              phase: 'error',
              detail: String(error?.message ?? error),
            }))
          } finally {
            setToggling('')
          }
        }, [refresh, translate])

        // Health and registry state can change while the page stays open.
        // Poll the loopback route; the interval is cleared on unmount.
        React.useEffect(() => {
          const timer = window.setInterval(() => { refresh() }, 5000)
          return () => window.clearInterval(timer)
        }, [refresh])

        const rows = state.servers.map((server) => {
          // `status` is the single lifecycle verdict from buildInventory. The
          // old code switched on `reason`, which is why every new state used to
          // need a matching change here.
          const status = typeof server.status === 'string' ? server.status : 'active'
          const reason = typeof server.reason === 'string' ? server.reason : ''
          const toolCount = Number(server.toolCount) || 0
          const enabled = server.enabled !== false
          const badges = []
          if (status === 'removed') {
            badges.push(h('span', {
              key: 'removed',
              className: 'mcp-lazy-badge',
              title: translate('missingHint'),
            }, translate('missing')))
          } else if (status === 'down') {
            const text = reason === 'call-failed'
              ? translate('callFailed')
              : reason === 'no-tools' ? translate('noTools') : translate('unavailable')
            badges.push(h('span', {
              key: 'down',
              className: reason === 'no-tools' ? 'mcp-lazy-badge warn' : 'mcp-lazy-badge',
            }, text))
          } else if (status === 'always-visible') {
            badges.push(h('span', { key: 'inactive', className: 'mcp-lazy-badge warn' }, translate('disclosureInactive')))
          } else if (status === 'unconfigured') {
            badges.push(h('span', {
              key: 'unconfigured',
              className: 'mcp-lazy-badge warn',
              title: translate('unconfiguredHint'),
            }, translate('unconfigured')))
          } else if (status === 'unknown') {
            badges.push(h('span', {
              key: 'unknown',
              className: 'mcp-lazy-badge',
              title: translate('unknownHint'),
            }, translate('unknown')))
          }
          if (status === 'connecting') {
            badges.push(h('span', { key: 'connecting', className: 'mcp-lazy-connecting' }, translate('connecting')))
          }
          return h('li', {
            key: server.name,
            className: enabled ? 'mcp-lazy-card' : 'mcp-lazy-card off',
          }, [
            h('div', { key: 'main', className: 'mcp-lazy-main' }, [
              h('div', { key: 'name', className: 'mcp-lazy-name' }, server.name),
              h('div', { key: 'summary', className: 'mcp-lazy-summary' },
                typeof server.summary === 'string' && server.summary.length > 0 ? server.summary : '—'),
            ]),
            h('div', { key: 'meta', className: 'mcp-lazy-meta' }, [
              ...badges,
              h('span', { key: 'count', className: 'mcp-lazy-count' },
                `${toolCount} ${translate('tools')}`),
              toolCount > 0
                ? h('span', { key: 'tokens', className: 'mcp-lazy-tokens' },
                  `≈${formatTokens(server.tokens)} ${translate('tokens')}`)
                : null,
              status === 'removed'
                ? h('button', {
                  key: 'forget',
                  type: 'button',
                  className: 'mcp-lazy-forget',
                  title: translate('forgetHint'),
                  disabled: busy || toggling === server.name,
                  onClick: () => { forgetServer(server.name) },
                }, translate('forget'))
                : null,
              status === 'removed' || status === 'unknown'
                ? null
                : h('button', {
                  key: 'switch',
                  type: 'button',
                  role: 'switch',
                  className: 'mcp-lazy-switch',
                  'aria-checked': enabled ? 'true' : 'false',
                  'aria-label': `${server.name}: ${translate(enabled ? 'disable' : 'enable')}`,
                  title: translate(enabled ? 'disable' : 'enable'),
                  disabled: busy || toggling === server.name,
                  onClick: () => { setServerEnabled(server.name, !enabled) },
                }),
            ]),
          ])
        })

        const refreshIcon = h('svg', {
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        }, [
          h('path', { key: 'arc', d: 'M13.25 8a5.25 5.25 0 1 1-1.54-3.71' }),
          h('path', { key: 'tip', d: 'M13.25 2.6v3.3h-3.3' }),
        ])

        return h('div', { className: 'mcp-lazy-page' }, [
          h('div', { key: 'head', className: 'mcp-lazy-head' }, [
            h('div', { key: 'heading', className: 'mcp-lazy-heading' }, [
              h('div', { key: 'title-row', className: 'mcp-lazy-title-row' }, [
                h('h2', { key: 'title', className: 'mcp-lazy-title' }, translate('title')),
                h('button', {
                  key: 'refresh',
                  type: 'button',
                  className: 'mcp-lazy-refresh',
                  title: translate('refresh'),
                  'aria-label': translate('refresh'),
                  onClick: refresh,
                  disabled: busy || state.phase === 'loading',
                }, refreshIcon),
              ]),
              h('p', { key: 'intro', className: 'mcp-lazy-intro' }, translate('intro')),
            ]),
          ]),
          state.phase === 'error'
            ? h('p', { key: 'error', className: 'mcp-lazy-error', role: 'alert' },
              `${translate('error')}${state.detail === '' ? '' : ` (${state.detail})`}`)
            : null,
          state.phase === 'ready' && state.scan?.ok === false
            ? h('p', { key: 'scan', className: 'mcp-lazy-error', role: 'alert' },
              `${translate('scanFailed')}${state.scan.error ?? ''} — ${translate('scanFailedHint')}`)
            : null,
          state.phase === 'loading'
            ? h('p', { key: 'loading', className: 'mcp-lazy-muted' }, translate('loading'))
            : null,
          state.phase === 'ready' && state.servers.length === 0
            ? h('p', { key: 'empty', className: 'mcp-lazy-muted' }, translate('empty'))
            : null,
          state.phase === 'ready' && state.servers.length > 0
            ? h('ul', { key: 'list', className: 'mcp-lazy-list', role: 'list', 'aria-busy': busy ? 'true' : undefined }, rows)
            : null,
        ])
      }

      return McpSettingsPage
    }

    const inject = ['slots', 'locale']

    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'mcp-lazy: settings dictionaries')
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-mcp-lazy'
        style.dataset.pluginCss = 'dsh-mcp-lazy/settings.css'
        style.textContent = CSS
        document.head.appendChild(style)
        return () => style.remove()
      }, 'mcp-lazy: settings styles')
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'mcp',
        order: 16,
        label: () => t('nav'),
        locale: NS,
      }, makePage(t)))
    }

    return { inject, apply }
    })(require)])

    const __report = (label, error) => {
      const detail = error && error.stack ? error.stack : String(error)
      try {
        console.warn('[dsh-improvements] client module ' + label + ' failed: ' + detail)
      } catch {
        // 控制台不可用时也不能再抛。
      }
    }

    return {
      inject: ["slots","locale","contextMenus","workspaces","sessions","uiWorkspace","commandUi"],
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
