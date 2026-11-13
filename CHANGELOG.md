# Changelog

## 0.1.0 — 2026-11-14

首个融合版本。对外一个插件、一行配置，内装四个模块。

### 新增

- **destructive-guard 1.1.0**：破坏性命令护栏。42 个受保护根、30+ 条规则；命令级 `deny`/`ask`，文件级 `write`/`edit` 保护；`approval=never` 时把 `ask` 显式降级为 `deny` 并写明规则与解除方式。
- **mcp-lazy**：MCP 渐进披露。目录进 system prompt，工具按需 `mcp(load)`；设置页显示每个服务器的简介、工具数、token 估算与披露开关。
- **computer-use**：`computer_use` / `browser_use` 工具；`activate` 授权、暂停/急停热键、`deactivate` 交还。
- **context-usage**：作曲器「上下文用量」按钮、占用面板、`/context`、余额药丸。

### 装配

- 单包单行：`dsh.client` 每包只能有一份，四份 Client 合并为 `dist/client.js` 一个入口；每个模块的 `apply` 独立 try/catch，一个坏不拖垮全部。
- `modules/` 保持上游原样；`UPSTREAM.json` 记录来源与哈希；`scripts/sync-modules.mjs` 支持从各源包重新同步。
- Host 模块按需 `ctx.inject(deps)`，保持原插件的「服务就绪再加载」语义。

### 未包含

- **permission-full-access**：与官方 `danger-full-access` 预设重复，且默认开启风险过高，不并入。
- **index-adjust**：会改写会话存储的私有字段，等上游加上版本探测、备份保留、写后校验、失败回滚后再并入。

### 已知问题

- `context-usage` 用 `[class$="_dock"]` 隐藏官方底栏；DSH 改类名后会失效（表现为双底栏），不崩。
- `mcp-lazy` 依赖一处未文档化的 `ctx.loader.entries()`，仅影响注册表镜像与面板，失效时 fail-open。
- `computer-use` 默认开启；与官方 `@deepseek-ai/dsh-browser-use` 存在潜在的工具名撞车（该包当前未随 base 启用）。
- 护栏不覆盖脚本内容、`run_code` 与 GUI 打字；完全权限下没有文件沙箱。
