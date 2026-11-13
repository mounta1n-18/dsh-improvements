/* 由 scripts/build-client.mjs 生成，不要手改。
 * 来源模块：context-usage、mcp-lazy
 * 重新生成：npm run build
 */
window.__ModuleLoader__.load({
  id: 'dsh-improvements',
  factory(require) {
    const __parts = []

    // ---- context-usage ----
    __parts.push(['context-usage', (function (require) {

    const React = require('react')
    const h = React.createElement

    /** Client locale namespace for this bundle's visible text. */
    const NS = 'context-usage'

    /**
     * The UI build identity this installation ships, carried as the requesting
     * client of an account call. A Client plugin cannot read the shell's own
     * build version at runtime; a stale value only costs this pill, which shows
     * its own reason whenever the balance outcome is not ready.
     */
    const CLIENT_VERSION = '0.2.0-rc.2'

    /** How often a visible page re-reads the balance. */
    const BALANCE_REFRESH_MS = 10000

    /**
     * Whether this bundle hides the shipped composer dock (the row under the
     * composer card) while it is mounted. That row carries the shipped occupancy
     * meter and the session stats pills; this bundle shows the occupancy in its
     * own panel and the turn/step/pace figures in the panel's overview, and the
     * shell exposes no switch for it (`ui-conversation`'s Config has no such
     * field, and occupying `conversation.input.activity` — which does suppress
     * the meter — also hides the model selector through `hidden: activity`).
     *
     * The override is an owned stylesheet scoped by our own marker inside that
     * dock, so it can only ever match the dock this bundle renders into.
     */
    const HIDE_SHIPPED_DOCK = true

    /** Marker attribute on this bundle's composer-dock anchor entry. */
    const DOCK_MARKER = 'composer-dock-anchor'

    /** This bundle's own stylesheet identity, cleaned up with the plugin. */
    const DOCK_STYLE_ID = '@local/dsh-context-usage/dock-override.css'

    const zh = {
      title: '上下文用量',
      commandDescription: '查看当前会话的上下文用量与构成',
      running: '正在统计上下文用量…',
      failed: '上下文用量统计失败',
      system: '系统提示词',
      tools: '工具定义',
      messages: '对话消息',
      free: '剩余空间',
      noSample: '暂无用量样本',
      totals: '本会话累计',
      miss: '未命中',
      hit: '命中',
      hitRate: '命中率',
      output: '输出',
      turns: '轮',
      steps: '步',
      tps: 'tok/s',
      balanceTitle: 'DeepSeek 余额',
      balanceSignedOut: '余额 未登录',
      balanceEmpty: '余额 无钱包',
      balanceFailed: '余额 读取失败',
      balanceError: '余额 接口异常',
    }

    const en = {
      title: 'Context usage',
      commandDescription: "Show this session's context usage and composition",
      running: 'Measuring context usage…',
      failed: 'Context usage failed',
      system: 'System prompt',
      tools: 'Tools',
      messages: 'Messages',
      free: 'Free space',
      noSample: 'No usage sample',
      totals: 'Session totals',
      miss: 'Uncached',
      hit: 'Cached',
      hitRate: 'Hit rate',
      output: 'Output',
      turns: 'turns',
      steps: 'steps',
      tps: 'tok/s',
      balanceTitle: 'DeepSeek balance',
      balanceSignedOut: 'balance: signed out',
      balanceEmpty: 'balance: no wallet',
      balanceFailed: 'balance: read failed',
      balanceError: 'balance: call failed',
    }

    /** Composition rows and the free remainder, in display order. */
    const ROWS = [
      { key: 'systemTokens', label: 'system', kind: 'system', color: 'var(--dsw-alias-brand-primary)' },
      { key: 'toolsTokens', label: 'tools', kind: 'tools', color: 'var(--dsw-alias-state-warn-primary)' },
      { key: 'messageTokens', label: 'messages', kind: 'messages', color: 'var(--dsw-alias-state-success-primary)' },
    ]

    /** Unoccupied-cell tint. */
    const FREE_COLOR = 'var(--dsw-alias-state-idle-primary)'

    /** Occupancy grid geometry: a filled area, wrapped row by row. */
    const GRID_COLUMNS = 36
    const GRID_ROWS = 5
    const GRID_CELLS = GRID_COLUMNS * GRID_ROWS

    /** Ring geometry: 16px viewBox, 5.2px radius. */
    const RADIUS = 5.2
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS

    const S = {
      /** The legacy command row's card: a chat-flow surface with its own width. */
      card: {
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 560, boxSizing: 'border-box',
        padding: '10px 12px', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 12,
        background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)',
        fontSize: 13, lineHeight: '20px',
      },
      /** Composer-dock wrapper: the shipped docks' geometry, aligned with the composer card. */
      panel: {
        boxSizing: 'border-box', flex: 'none',
        width: 'calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset))',
        maxWidth: 'calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset))',
        margin: '0 auto',
        padding: '0 var(--dsh-composer-dock-inset)',
      },
      /** The dock panel's surface: the same menu material the shipped docks use. */
      panelCard: {
        display: 'flex', flexDirection: 'column', gap: 6, boxSizing: 'border-box',
        padding: '8px 10px', borderRadius: 'var(--dsw-radius-lg)',
        background: 'var(--dsw-specific-menu)', backdropFilter: 'var(--dsw-menu-backdrop-filter)',
        boxShadow: 'var(--dsw-elevation-panel)', color: 'var(--dsw-alias-label-primary)',
        fontSize: 13, lineHeight: '20px',
      },
      head: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
      title: { fontWeight: 600, flex: 'none' },
      spacer: { flex: 'auto' },
      figure: { color: 'var(--dsw-alias-label-secondary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
      percent: { color: 'var(--dsw-alias-brand-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', flex: 'none' },
      grid: { display: 'grid', gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`, gap: 2 },
      cell: { height: 5, borderRadius: 1, background: FREE_COLOR },
      /**
       * The widest arrangement: one band holding the overview, the occupancy
       * area and the legend, with the four gaps `space-evenly` leaves around and
       * between them equal to the four `1fr` slack columns this replaced.
       *
       * It wraps rather than shrinking without limit, because the grid this
       * replaced overlapped: a container narrower than the blocks' combined
       * minimum collapsed its `1fr` slack columns to zero while the `auto`
       * columns kept their content, so the occupancy area was pushed over the
       * legend the moment a side pane narrowed the chat column.
       */
      main: {
        display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'space-evenly',
      },
      /**
       * The overview stack — title, figures, pace — centered on one axis, so the
       * longest line (the pace) reads as the block's own width rather than
       * hanging past the lines above it.
       */
      headLeft: { flex: '0 1 auto', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' },
      headRow: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
      /** The turn/step/pace line the shipped composer dock no longer shows. */
      pace: { color: 'var(--dsw-alias-label-secondary)', fontSize: 11, lineHeight: '16px', whiteSpace: 'nowrap' },
      /**
       * The occupancy area in the one-band arrangement: a preferred `30em` band
       * that may shrink — never grow, so `main`'s gaps stay even — down to the
       * width its own stats need.
       */
      viz: {
        flex: '0 1 30em', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
      },
      /** The same area once it holds a band of its own. */
      vizFull: { display: 'flex', flexDirection: 'column', gap: 8, width: '100%' },
      /**
       * A three-column legend grid: names, values, and shares align on content
       * width. It sizes to its content wherever it sits beside something, and
       * centers in the full-width seat the stacked arrangement gives it.
       */
      legendBox: {
        flex: '0 0 auto', display: 'grid', gridTemplateColumns: 'auto auto auto',
        gap: '3px 6px', alignItems: 'center', justifyContent: 'center',
      },
      /** The two narrower arrangements: a stack, and the pair it starts with. */
      stack: { display: 'flex', flexDirection: 'column', gap: 8 },
      pair: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-evenly' },
      legendName: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 },
      legendLabel: { color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap' },
      legendValue: { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'right' },
      legendPercent: { color: 'var(--dsw-alias-label-secondary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'right' },
      stats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 14px' },
      statCell: { display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 },
      statLabel: { color: 'var(--dsw-alias-label-secondary)', fontSize: 11, lineHeight: '16px', flex: 'none' },
      statValue: { fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
      muted: { color: 'var(--dsw-alias-label-secondary)' },
      error: { color: 'var(--dsw-alias-state-error-primary)' },
      toggle: {
        display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 8px',
        border: 'none', borderRadius: 999, background: 'transparent', cursor: 'pointer',
        color: 'var(--dsw-alias-label-secondary)', fontFamily: 'inherit', fontSize: 12,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      },
      toggleActive: { background: 'var(--dsw-alias-interactive-bg-hover-solid)', color: 'var(--dsw-alias-label-primary)' },
      balance: {
        display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--dsw-alias-label-secondary)',
        fontSize: 12, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
      },
    }

    /**
     * Body widths, in CSS pixels, at which the arrangement changes.
     *
     * `WIDE_MIN` is what the one-band arrangement needs before it starts
     * squeezing the occupancy area; it must stay below the narrowest body the
     * host actually gives the panel. The shipped shell pins
     * `--dsh-chat-content-width` at `clamp(680px, …)` and the panel body is
     * that width minus the composer insets (~687px at 150% scaling), so the
     * old 720 threshold could never be reached and every window fell into the
     * stacked `medium` arrangement. 660 leaves room for the pair layout while
     * staying under that floor.
     */
    const WIDE_MIN = 660
    const MEDIUM_MIN = 440

    /**
     * Pick the body's arrangement for a measured width.
     * @param width - the body's content width, `0` before it is first measured.
     * @returns `wide`, `medium` or `narrow`.
     */
    function layoutFor(width) {
      if (!(width > 0)) return 'wide'
      if (width >= WIDE_MIN) return 'wide'
      if (width >= MEDIUM_MIN) return 'medium'
      return 'narrow'
    }

    /**
     * Track one element's content width, because the panel lives in the chat
     * column: a side pane narrowing that column resizes the panel without moving
     * any viewport breakpoint.
     * @returns a ref to attach to the measured element, and its width.
     */
    function useMeasuredWidth() {
      const ref = React.useRef(null)
      const [width, setWidth] = React.useState(0)
      React.useLayoutEffect(() => {
        const node = ref.current
        if (node === null) return undefined
        setWidth(node.clientWidth)
        if (typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(() => {
          setWidth(node.clientWidth)
        })
        observer.observe(node)
        return () => {
          observer.disconnect()
        }
      }, [])
      return [ref, width]
    }

    /**
     * Format one token count compactly.
     * @param value - token count, possibly unknown.
     * @returns an exact small integer, `1.2K`, `3.4M`, or `—`.
     */
    function formatTokens(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return '—'
      if (value < 1e3) return String(Math.round(value))
      if (value < 1e6) return `${Math.round(value / 100) / 10}K`
      return `${Math.round(value / 1e5) / 10}M`
    }

    /**
     * Format one wallet amount the way the account page does.
     * @param amount - validated decimal balance string.
     * @param symbol - currency symbol.
     * @returns currency text, `<¥0.01` for sub-cent amounts.
     */
    function formatBalance(amount, symbol) {
      const value = Number(amount)
      if (!Number.isFinite(value)) return `${symbol}—`
      if (value === 0) return `${symbol}0.00`
      if (value < 0) return `-${symbol}${value > -0.01 ? '0.01' : Math.abs(value).toFixed(2)}`
      if (value < 0.01) return `<${symbol}0.01`
      return `${symbol}${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
    }

    /**
     * One part-of-whole percentage, absent when the whole is unknown or not positive.
     * @param part - numerator, possibly unknown.
     * @param whole - denominator, possibly unknown.
     * @returns a percentage clamped to 0..100, or undefined.
     */
    function share(part, whole) {
      if (typeof part !== 'number' || !Number.isFinite(part)) return undefined
      if (typeof whole !== 'number' || !Number.isFinite(whole) || whole <= 0) return undefined
      return Math.max(0, Math.min(100, (part / whole) * 100))
    }

    /** Round one percentage to a single decimal place for display. */
    function percentText(percent) {
      return `${Math.round(percent * 10) / 10}%`
    }

    /** One registered component's locale seat, or a key-echoing stand-in. */
    function translator(props) {
      return props && typeof props.t === 'function' ? props.t : (key) => key
    }

    /** One registered component's projection reader, or an always-empty hook. */
    function projectionReader(props) {
      return props && typeof props.useProjection === 'function' ? props.useProjection : () => undefined
    }

    /** Read one session's occupancy numbers from the page's own projections. */
    function occupancyOf(read) {
      const pressure = read('contextPressure')
      const used = pressure === undefined ? undefined : pressure.projectedTokens ?? pressure.pressureTokens
      const capacity = pressure === undefined ? undefined : pressure.contextWindow
      return { pressure, used, capacity, usedPercent: share(used, capacity) }
    }

    //#region panel state

    /** Sessions whose occupancy panel the user opened, by `/context` or the button. */
    const PANEL_OPEN = new Set()

    /** Panel-state subscribers (one per mounted dock entry and toggle). */
    const PANEL_LISTENERS = new Set()

    /**
     * Open or close one session's panel and notify its mounted entries.
     * @param sessionId - the session owning the panel.
     * @param value - whether the panel should be open.
     */
    function setPanelOpen(sessionId, value) {
      if (typeof sessionId !== 'string') return
      const changed = value ? !PANEL_OPEN.has(sessionId) : PANEL_OPEN.has(sessionId)
      if (!changed) return
      if (value) PANEL_OPEN.add(sessionId)
      else PANEL_OPEN.delete(sessionId)
      for (const listener of PANEL_LISTENERS) listener()
    }

    /** Close every panel; the plugin's own teardown. */
    function closeAllPanels() {
      if (PANEL_OPEN.size === 0) return
      PANEL_OPEN.clear()
      for (const listener of PANEL_LISTENERS) listener()
    }

    /**
     * Subscribe one mounted entry to its session's panel state.
     * @param sessionId - the entry's session.
     * @returns whether that session's panel is open.
     */
    function usePanelOpen(sessionId) {
      const [open, setOpen] = React.useState(() => PANEL_OPEN.has(sessionId))
      React.useEffect(() => {
        const sync = () => setOpen(PANEL_OPEN.has(sessionId))
        sync()
        PANEL_LISTENERS.add(sync)
        return () => {
          PANEL_LISTENERS.delete(sync)
        }
      }, [sessionId])
      return open
    }

    //#endregion

    /**
     * One legend glyph, drawn in the current text color.
     * @param props - glyph kind and tint.
     * @returns a 14px decorative SVG.
     */
    function Glyph(props) {
      const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round', strokeLinecap: 'round' }
      let shape
      if (props.kind === 'system') {
        shape = [
          h('rect', Object.assign({ key: 'sheet', x: 3.4, y: 2.8, width: 9.2, height: 10.4, rx: 1.6 }, stroke)),
          h('path', Object.assign({ key: 'lines', d: 'M5.8 6.2h4.4M5.8 8.6h4.4M5.8 11h2.6' }, stroke)),
        ]
      } else if (props.kind === 'tools') {
        shape = [
          h('path', Object.assign({ key: 'track', d: 'M3.4 5.4h9.2M3.4 10.6h9.2' }, stroke)),
          h('circle', Object.assign({ key: 'knob-a', cx: 6.4, cy: 5.4, r: 1.5 }, stroke)),
          h('circle', Object.assign({ key: 'knob-b', cx: 9.6, cy: 10.6, r: 1.5 }, stroke)),
        ]
      } else if (props.kind === 'free') {
        shape = [h('rect', Object.assign({ key: 'free', x: 3.4, y: 3.4, width: 9.2, height: 9.2, rx: 1.6, strokeDasharray: '2.4 2.4' }, stroke))]
      } else {
        shape = [h('path', Object.assign({ key: 'bubble', d: 'M3.2 3.4h9.6v6.4H7.4L4.2 12.2V9.8H3.2z' }, stroke))]
      }
      return h('svg', {
        viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true,
        style: { flex: 'none', color: props.color || 'var(--dsw-alias-label-secondary)' },
      }, shape)
    }

    /**
     * The composer-menu glyph: the bundle icon's three arcs in the row's own
     * text color, sized by the menu's icon slot.
     * @param props - menu slot size.
     * @returns the decorative menu glyph.
     */
    function ContextGlyph(props) {
      const size = typeof props.size === 'number' ? props.size : 14
      const arc = (key, fraction, offset) => h('circle', {
        key,
        cx: 8, cy: 8, r: RADIUS, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
        strokeDasharray: `${CIRCUMFERENCE * fraction} ${CIRCUMFERENCE * (1 - fraction)}`,
        strokeDashoffset: -CIRCUMFERENCE * offset,
        transform: 'rotate(-90 8 8)',
      })
      return h('svg', { viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': true, style: { flex: 'none' } }, [
        h('circle', { key: 'track', cx: 8, cy: 8, r: RADIUS, fill: 'none', stroke: 'currentColor', strokeOpacity: 0.22, strokeWidth: 1.6 }),
        arc('system', 0.15, 0),
        arc('tools', 0.3, 0.19),
        arc('messages', 0.1, 0.53),
      ])
    }

    /**
     * The header occupancy ring.
     * @param props - occupancy percentage, absent before a sample exists.
     * @returns a 16px decorative SVG.
     */
    function Ring(props) {
      const percent = typeof props.percent === 'number' ? Math.max(0, Math.min(100, props.percent)) : 0
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, style: { flex: 'none' },
      }, [
        h('circle', { key: 'track', cx: 8, cy: 8, r: RADIUS, fill: 'none', stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1.6 }),
        h('circle', {
          key: 'fill', cx: 8, cy: 8, r: RADIUS, fill: 'none', stroke: 'var(--dsw-alias-brand-primary)',
          strokeWidth: 1.6, strokeLinecap: 'round',
          strokeDasharray: `${(CIRCUMFERENCE * percent) / 100} ${CIRCUMFERENCE}`, transform: 'rotate(-90 8 8)',
        }),
      ])
    }

    /**
     * One legend row: it contributes three grid items to {@link S.legendBox} —
     * the named glyph, the value, and the share — so the grid sizes each column
     * to its widest content and no row stretches over its own text.
     * @param props - glyph kind, label, tint, value text, and optional share.
     * @returns the row's three grid items.
     */
    function LegendCell(props) {
      return h(React.Fragment, null, [
        h('div', { key: 'name', style: S.legendName }, [
          h(Glyph, { key: 'glyph', kind: props.kind, color: props.color }),
          h('span', { key: 'label', style: S.legendLabel }, props.label),
        ]),
        h('span', { key: 'value', style: S.legendValue }, props.value),
        h('span', { key: 'percent', style: S.legendPercent }, props.percent === undefined ? '' : `(${percentText(props.percent)})`),
      ])
    }

    /**
     * One whole-session figure: a small label beside a larger value.
     * @param props - label and the large value text.
     * @returns the stat cell.
     */
    function StatCell(props) {
      return h('div', { style: S.statCell }, [
        h('span', { key: 'label', style: S.statLabel }, props.label),
        h('span', { key: 'value', style: S.statValue }, props.value),
      ])
    }

    /**
     * The occupancy area: one cell per share of the window, tinted by the
     * composition share it falls in, with unoccupied cells in the idle tint.
     * @param usedPercent - occupancy of the window, absent before a sample.
     * @param breakdown - heuristic composition, absent before a sample.
     * @param total - the composition total.
     * @returns one cell element per grid position.
     */
    function gridCells(usedPercent, breakdown, total) {
      const cells = []
      for (let index = 0; index < GRID_CELLS; index += 1) {
        let color
        if (usedPercent !== undefined && total > 0) {
          const fraction = ((index + 0.5) / GRID_CELLS) * 100
          if (fraction <= usedPercent) {
            let cursor = 0
            color = ROWS[ROWS.length - 1].color
            for (const row of ROWS) {
              cursor += ((breakdown[row.key] || 0) / total) * usedPercent
              if (fraction <= cursor) {
                color = row.color
                break
              }
            }
          }
        }
        cells.push(h('div', {
          key: index,
          style: color === undefined ? S.cell : Object.assign({}, S.cell, { background: color }),
        }))
      }
      return cells
    }

    /**
     * The shared card body, so the composer panel and a legacy command row
     * cannot drift apart: the overview, the occupancy area and the composition
     * legend, arranged for the width {@link Body} measured, with the session's
     * turn/step pace in the overview (this bundle hides the shipped dock that
     * used to carry it).
     * @param props - locale seat, the projection values, the session stats, the
     * chosen arrangement, and the ref its container is measured from.
     * @returns the card's children.
     */
    function bodyChildren(props) {
      const { t, pressure, breakdown, usage, session, layout, innerRef } = props
      const used = pressure === undefined ? undefined : pressure.projectedTokens ?? pressure.pressureTokens
      const capacity = pressure === undefined ? undefined : pressure.contextWindow
      const usedPercent = share(used, capacity)
      const total = breakdown === undefined ? 0 : breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens

      const pace = []
      if (session !== undefined) {
        if (session.turns > 0) pace.push(`${session.turns} ${t('turns')}`)
        if (session.steps > 0) pace.push(`${session.steps} ${t('steps')}`)
        if (session.decodeMs > 0 && session.decodeTokens > 0) {
          pace.push(`${Math.round(session.decodeTokens / (session.decodeMs / 1000))} ${t('tps')}`)
        }
      }

      const legend = []
      for (const row of ROWS) {
        const value = breakdown === undefined ? undefined : breakdown[row.key]
        legend.push(h(LegendCell, {
          key: row.key, kind: row.kind, label: t(row.label), color: row.color,
          value: formatTokens(value), percent: share(value, capacity),
        }))
      }
      if (used !== undefined && capacity !== undefined) {
        const free = Math.max(0, capacity - used)
        legend.push(h(LegendCell, { key: 'free', kind: 'free', label: t('free'), color: FREE_COLOR, value: formatTokens(free), percent: share(free, capacity) }))
      }

      const stats = []
      if (usage !== undefined) {
        const hitRate = share(usage.cacheReadTokens, usage.cacheReadTokens + usage.uncachedInputTokens)
        stats.push(h(StatCell, { key: 'miss', label: t('miss'), value: formatTokens(usage.uncachedInputTokens) }))
        stats.push(h(StatCell, { key: 'hit', label: t('hit'), value: formatTokens(usage.cacheReadTokens) }))
        stats.push(h(StatCell, { key: 'hitRate', label: t('hitRate'), value: hitRate === undefined ? '—' : percentText(hitRate) }))
        stats.push(h(StatCell, { key: 'output', label: t('output'), value: formatTokens(usage.outputTokens) }))
      }

      const overview = h('div', { key: 'overview', style: S.headLeft }, [
        h('div', { key: 'titleRow', style: S.headRow }, [
          h(Ring, { key: 'ring', percent: usedPercent }),
          h('span', { key: 'title', style: S.title }, t('title')),
        ]),
        h('div', { key: 'figures', style: S.headRow }, [
          h('span', { key: 'figure', style: S.figure }, `${formatTokens(used)} / ${formatTokens(capacity)}`),
          usedPercent === undefined ? null : h('span', { key: 'percent', style: S.percent }, String(Math.round(usedPercent)) + '%'),
        ]),
        pace.length === 0 ? null : h('div', { key: 'pace', style: S.pace }, pace.join(' · ')),
      ])

      // 新会话还没有任何请求样本：一行紧凑占位，不渲染零值网格/统计/图例。
      if (capacity === undefined) {
        return [
          h('div', {
            key: 'main',
            ref: innerRef,
            style: {
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0,
            },
          }, [
            h(Ring, { key: 'ring', percent: undefined }),
            h('span', { key: 'title', style: S.title }, t('title')),
            h('span', { key: 'figure', style: S.figure }, '— / —'),
            h('span', { key: 'hint', style: S.muted }, t('noSample')),
          ]),
        ]
      }

      const viz = h('div', { key: 'viz', style: layout === 'wide' ? S.viz : S.vizFull }, [
        h('div', { key: 'grid', style: S.grid }, gridCells(usedPercent, breakdown, total)),
        stats.length === 0 ? null : h('div', { key: 'stats', style: S.stats }, stats),
      ])
      const legendBox = breakdown === undefined
        ? h('div', { key: 'legend', style: S.legendBox }, h('div', { style: S.muted }, t('noSample')))
        : h('div', { key: 'legend', style: S.legendBox }, legend)

      /* One band where it fits; otherwise the overview pairs with the legend and
       * the occupancy area takes the band below them; otherwise all three stack. */
      if (layout === 'medium') {
        return [
          h('div', { key: 'main', ref: innerRef, style: S.stack }, [
            h('div', { key: 'pair', style: S.pair }, [overview, legendBox]),
            viz,
          ]),
        ]
      }
      return [h('div', { key: 'main', ref: innerRef, style: layout === 'wide' ? S.main : S.stack }, [overview, viz, legendBox])]
    }

    /**
     * The measurable body: it owns the ref its arrangement is measured from, and
     * re-renders the blocks for the width that ref reports.
     * @param props - locale seat and the projection values.
     * @returns the card's children.
     */
    function Body(props) {
      const [innerRef, width] = useMeasuredWidth()
      return bodyChildren(Object.assign({ innerRef, layout: layoutFor(width) }, props))
    }

    /**
     * The occupancy panel the `/context` action and the composer button open,
     * docked above the composer card with the shipped full-width docks.
     * @param props - the dock entry's standard session shares.
     * @returns the panel, or null while it is closed.
     */
    function ContextUsagePanel(props) {
      const t = translator(props)
      const read = projectionReader(props)
      const sessionId = props ? props.sessionId : undefined
      const open = usePanelOpen(sessionId)
      const pressure = read('contextPressure')
      const breakdown = read('contextBreakdown')
      const usage = read('tokenUsage')
      const session = read('sessionStats')
      if (!open) return null
      return h('div', { style: S.panel },
        h('div', { style: S.panelCard, 'data-context-usage': 'panel' },
          h(Body, { t, pressure, breakdown, usage, session })))
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
      const [hover, setHover] = React.useState(false)
      const { usedPercent } = occupancyOf(read)
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
        h(Ring, { key: 'ring', percent: usedPercent }),
        usedPercent === undefined ? null : h('span', { key: 'text' }, `${Math.round(usedPercent)}%`),
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
      const breakdown = read('contextBreakdown')
      const usage = read('tokenUsage')
      const session = read('sessionStats')
      const outcome = node ? node.outcome : null
      const head = (right) => h('div', { key: 'head', style: S.head }, [
        h(Ring, { key: 'ring', percent: right === undefined ? 0 : right }),
        h('span', { key: 'title', style: S.title }, t('title')),
        h('span', { key: 'spacer', style: S.spacer }),
      ])
      if (outcome === null || outcome === undefined) {
        return h('div', { style: S.card },
          head(undefined),
          h('div', { style: S.muted }, t('running')))
      }
      if (outcome.kind === 'error') {
        return h('div', { style: S.card },
          head(undefined),
          h('div', { style: S.error }, typeof outcome.text === 'string' && outcome.text.length > 0 ? outcome.text : t('failed')))
      }
      return h('div', { style: S.card }, h(Body, { t, pressure, breakdown, usage, session }))
    }

    return {
      inject: ['slots', 'locale', 'commandUi'],
      apply(ctx) {
        const tr = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'context-usage: dictionaries')

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
            const [state, setState] = React.useState({ kind: 'pending' })
            React.useEffect(() => {
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
      inject: ["slots","locale","commandUi"],
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
