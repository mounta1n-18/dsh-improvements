# context-usage

上下文占用面板。源包：`C:\DSH Plugin\dsh-context-usage`（v1.0.10，MIT）。

## 构造

- **Host 半身**：`index.js` 只导出空 `apply`，没有服务、没有路由。所有逻辑都在浏览器。
- **Client 半身**：`client.js`（约 900 行）。
  - `inject: ['slots', 'locale', 'commandUi']`。
  - 注册 locale `NS = 'context-usage'`；插一份 `style[data-plugin='@local/dsh-context-usage']`。
  - 三个入口：作曲器右侧「上下文用量」按钮、`conversation.input.dock` 上方面板、`/context` 命令；另有余额药丸（`ctx.remote.account.getBalance`）。
  - 数据源：`contextPressure`、`contextBreakdown`、`tokenUsage`、`sessionStats`。
- **隐藏官方底栏**：`HIDE_SHIPPED_DOCK = true` 时插一段 CSS
  `[class$="_dock"]:has([data-context-usage="composer-dock-anchor"]) { display:none !important }`，
  官方 `activity` / `usage` 仍 active，只是不显示。

## 并入时的改造

无源码改动。`scripts/build-client.mjs` 剥掉 `window.__ModuleLoader__.load` 外壳，把 factory 体包进独立作用域后调用。

## 风险

- 官方 DOM 的 `_dock` 类名后缀一旦变化，隐藏失效：表现为官方底栏和本面板同时出现（重复信息，不崩）。
- `CLIENT_VERSION` 硬编码为 `0.2.0-rc.2`，仅用于展示。
- 占用图按「每 token ≈ 4 字符」估算，不是精确计量。
- 新版本若增删 `contextBreakdown` 字段，面板可能显示不全；`apply` 有 try/catch 兜底，但面板内部没有逐块容错。

## 验证

作曲器出现「上下文用量」按钮；点开有分段占用与数字；`/context` 可用。
