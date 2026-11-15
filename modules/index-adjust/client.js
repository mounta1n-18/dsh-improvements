/**
 * Client half of `@local/dsh-index-adjust`.
 *
 * Adds two entries to the Session context menu in the sidebar:
 *
 * - 更改工作区: pick an existing Workspace or create one from a local folder;
 * - 重连工作区: after a folder (or one of its ancestors) was renamed, look one
 *   level wider at the first missing path component and re-home the Session.
 *
 * Both entries open the same self-drawn dialog in `shell.overlay`. The dialog
 * uses only host CSS tokens, so it follows the active light/dark theme without
 * importing the shipped UI primitives (which are build-time virtual modules and
 * are not resolvable from a profile plugin).
 *
 * All data-changing work happens in the Host half (`index.js`); this file only
 * collects a target and talks to its loopback routes.
 *
 * @module @local/dsh-index-adjust/client
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-index-adjust',
  factory(require) {
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
  },
})
