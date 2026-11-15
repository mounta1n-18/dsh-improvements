# Changelog

## 0.2.0 — 2026-11-15

同步五个上游的新版本；对外仍是单包单行。

### 模块更新

- **index-adjust 1.3.11**：新增「折叠工作区状态点」——折叠的工作区卡片显示子会话状态（完成/警告/错误/进行中），随行滚动淡出、不改列表高度；「更改工作区 / 重连工作区」不变，仍只认 DSH 0.2.2-rc.3。
- **context-usage 1.1.3**：面板开合状态跨重启保留（Host 写 `~/.local/state/dsh-context-usage/panels.json`）；面板用 React portal 嵌进作曲器卡片内部；Host 半身新增 `contextUsage` 投影，按事件流分段计价并用 `contextPressure` 校正。
- **computer-use**：新增回合守卫——cu 还握着控制权时，回合结束会把会话拽回来继续 `hold`，避免控制权空挂；新增留言轮询，用 `agent.followup()` 把鲸鱼留言送到模型面前（以前会话睡着就永远收不到）。
- `destructive-guard` 1.1.0 与 `mcp-lazy` 0.1.0 本轮无变化（guard 的 ask→deny 降级已在 0.1.0 并入）。

### 装配与文档

- 合并 client 扩到 126249B，三个浏览器模块（index-adjust / context-usage / mcp-lazy）仍共用一个 `ModuleLoader` 入口，各自 `apply` 独立 try/catch。
- `sync-modules.mjs` 在上游无变化时不再重写 `UPSTREAM.json`，减少无意义 diff。
- README / INSTALL 增加「条件收敛」依赖清单：DSH 版本、Windows、Python + Pillow、Chrome，以及缺项时哪个模块降级。

### 已知问题

- 同 0.1.1；`index-adjust` 仍与 DSH 0.2.2-rc.3 强绑定。
- `computer-use` 的回合守卫依赖 `agent.followup` 与 `agent/turn-stopping`，上游改签名时要跟着调。

## 0.1.1 — 2026-11-14

并入 **index-adjust 1.1.0**，五个模块齐了。

### 新增

- **index-adjust 1.1.0**：会话右键「更改工作区」「重连工作区」。启动探测 DSH 版本（只认 0.2.2-rc.3）与私有字段，不符时 503 且不动会话；预检、全局串行 + 每会话锁、写后重开校验、失败回滚；备份保留并附恢复命令。
- `dsh.client.inject` 增加 `dsh-client-locale`、`dsh-client-ui-context-menu`、`dsh-client-ui-workspace`；合并 client 扩到三个模块。

### 已知问题

- index-adjust 与 DSH 版本强绑定：升级后移动/重连自动禁用，需重新验证私有字段再放开。
- 其余同 0.1.0。

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
