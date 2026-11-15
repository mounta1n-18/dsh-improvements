# mcp-lazy

MCP 渐进披露。源包：`C:\DSH Plugin\dsh-mcp-lazy`（0.1.0，MIT）。

## 构造

- **Host 半身**（`index.js`，约 43K）：
  - 给每个 agent 维护一份「已披露服务器」集合；未披露的 MCP 工具用 `agent.ctx.tools.restrict({ deny })` 挡在工具表外。
  - 稳定目录写进 system prompt：每个服务器一行（名字 + 简介 + 工具数 + token 估算）。
  - 元工具 `mcp(list | load | unload)`：`load` 把某服务器的工具放出来，并回一份精确的工具清单。
  - `ctx.tools.guard()` 兜底：agent 直接点名被隐藏的工具时，回一条「先 mcp(load)」的提示，而不是报 unknown tool。
  - 监听 `tools/change`、`agent/created`、`agent/disposed`、`system-prompt/assemble`，新增 MCP 自动纳入（`minTools: 1`）。
  - 注册表镜像写到 `stateFile`（默认 `~/.dsh/mcp-lazy-state.json`），用于识别「配置文件被整文件重写」；`ctx.loader.entries()` 是唯一未文档化依赖，只影响镜像/健康检查，失效时 fail-open。
  - 配置：`servers` 是「服务器名 → 一句话简介」的映射。
- **Client 半身**（`client.js`）：设置页一个 `settings.section`，`id: 'mcp'`、`order: 16`、`label: () => t('nav')`；展示每个服务器的简介、工具数、token 估算和披露开关；样式走 `style[data-plugin='dsh-mcp-lazy']`。

## 并入时的改造

无源码改动，仅合并进 `dist/client.js`。

**注意一个实测结论**：DSH base 里没有原生 MCP 设置页，设置里的「MCP」就是本插件注册的那一页（简介文字是 `查看当前接入的 MCP……`）。所以 `id: 'mcp'` 不是撞车，不要改成别的 id——改成一个新 id 会多出一项、把原来的 MCP 页顶掉，反而乱。

## 风险

- 依赖 `ctx.loader.entries()`：DSH 若删除/改名，镜像与面板降级，披露本身不受影响。
- 官方未来若内置 MCP 懒加载，会与本模块抢同一批工具；届时优先关掉本模块（`mcpLazy: false`）。
- 目录行会占 system prompt；服务器很多时可调大 `minTools` 或只在 `servers` 里写重点服务器。

## 验证

设置 → MCP 能看到简介、`46 tools`、`≈12.5k tokens` 和开关；让 agent 调一个未披露的 MCP 工具，应收到「先 load」的提示。

## 2026-11-15 上游更新

- 本轮无变化，仍 0.1.0；`settings.section` 的 `id` 保持上游的 `'mcp'`（base 没有原生 MCP 设置页，不撞车）。

