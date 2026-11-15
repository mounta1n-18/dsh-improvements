# index-adjust

会话移库：右键会话「更改工作区」「重连工作区」。源包 `C:\DSH Plugin\dsh-index-adjust`（v1.1.0，MIT，Host + Client）。

## 构造

**Host**（`index.js`）

- 导出 `name = 'index-adjust'`、`inject = ['workspaceRegistry', 'sessionPersistence', 'agents']`；
- `apply(ctx)` 内部再 `ctx.inject(['webServer'], ...)`，注册三条只回环可用的路由：
  - `GET /dsh-index-adjust/state?sessionId=…`：读会话头、原目录是否存在、候选目录、`compat`；
  - `POST /dsh-index-adjust/move`：移动；
  - `POST /dsh-index-adjust/reconnect`：目录改名后重连。
- 所有路由要求 `x-dsh-index-adjust: 1`，并校验 `remoteAddress` 是本机；跨站简单请求带不上这个头。
- 移动是一个全局串行队列里的操作：探测版本/私有字段 → 预检 → 释放空闲会话写句柄 → 旧目录进 `~/.dsh/.dsh-index-adjust-backups` → `sessionPersistence.create` 重建日志 → 写事件 → 重开会话校验（头、事件数、最后一条）→ 重建 `sessionProjectionCache` → 更新 `workspaceRegistry.headers`/`sessionPaths` → detach/attach。
- 同一会话另有一把互斥锁，防止并发移动。

**Client**（`client.js`）

- 往 `contextMenus` 注册两项（会话右键），文案内联 zh/en，不读 locale 文件；
- 弹窗注册在 `shell.overlay`，自带轻量 store（`hooks.adjust`），只调三条路由；
- 只使用宿主 CSS token，跟随明暗主题；
- 声明 `inject: ['slots', 'locale', 'contextMenus', 'workspaces', 'sessions', 'uiWorkspace']`。

## 并入改造

**模块代码零改动**，只在装配层接线：

- `scripts/build-client.mjs` 的 `CLIENT_MODULES` 加 `index-adjust`；
- 根 `index.js` 的 `MODULES` 加 `indexAdjust`，依赖自动取自模块导出的 `inject`；
- `package.json` 的 `dsh.client.inject` 增加 `dsh-client-locale`、`dsh-client-ui-context-menu`、`dsh-client-ui-workspace`；
- `cordis.patch.yml` 加 `indexAdjust: true`；
- `scripts/sync-modules.mjs` 的 include 为 `index.js`、`client.js`、`icon.svg`（没有 locale 目录）。

## 1.1.0 相比旧版的防护

- 版本探测：只认 `0.2.2-rc.3`，并逐项探测私有字段（`workspaceRegistry` 的头/路径缓存、`sessionPersistence.tracker.writers`、`sessionProjectionCache.coldSnapshot` 等）；任一缺失返回 503，UI 显示「当前 DSH 版本不支持」，不落盘。
- 预检：原日志可读、目标工作区存在、目标目录可写，失败原样退出。
- 备份：成功后**不再自动删除**，响应返回 `backupDir` 与 PowerShell 恢复命令；失败时也保留。
- 写后校验：重新打开新会话，核对头、事件数、最后事件；失败自动回滚。
- 并发：全局串行队列 + 每会话锁。
- README 安装路径已改成 `C:\DSH Plugin\dsh-index-adjust`。

## 风险

- 与 DSH 版本强绑定：升级到 rc.3 之后的新版，移动/重连会自动禁用，直到重新验证并更新 `SUPPORTED_DSH_VERSION`。
- 仍依赖未公开的 `headers` / `sessionPaths` / `projectionCache` 字段；探测能挡住字段消失，挡不住语义变化。
- 备份要手动删；建议确认新会话能正常续聊后再清。

## 验证

1. `node --check index.js`、`node --check client.js`；
2. 冷启动后 `GET /dsh-index-adjust/state` 带 `x-dsh-index-adjust: 1`，`compat.supported` 为 true；
3. 复制一个会话到另一个工作区，重开 DSH 看历史、标题、时间线；
4. 故意让目标目录不可写，确认原样回滚且备份还在。

## 2026-11-15 上游更新（1.3.11）

- 新增「折叠工作区状态点」：折叠的工作区卡片显示子会话状态，纯 Client 改动（`shell.overlay` 的两个注册不变）。
- Host 的路由、`compat` 字段、版本锁（`SUPPORTED_DSH_VERSION = '0.2.2-rc.3'`）均未变；`client.js` 61726B。

