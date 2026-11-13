# index-adjust（尚未并入）

会话移库：右键会话「更改工作区」「重连工作区」。源包：`C:\DSH Plugin\dsh-index-adjust`（MIT，Host + Client）。

## 为什么不在这版里

它直接改写 DSH 的会话存储与工作区注册表：

- 读 `SessionPersistence` 的全部事件；
- 旧会话目录移到 `~/.dsh/.dsh-index-adjust-backups`；
- 以新 header 重建会话日志、写事件并校验；
- 重建 `sessionProjectionCache`；
- 改 `WorkspaceRegistry` 的 `registry.headers` / `sessionPaths`，再 detach/attach；
- 成功后删备份，失败回滚。

其中 `registry.headers`、`sessionPaths`、`sessionProjectionCache` 都是**未公开的进程内字段**，DSH 升级即可能变化。写坏的是会话本身，不是插件自己，所以等上游把防护补齐再并入。

## 上游正在补的防护

1. 启动时探测 DSH 版本与私有字段，缺失就禁用移动并在 UI 说明，绝不半途改；
2. 移动前预检（事件可读、目标目录可写、目标 workspace 存在），失败原样退出；
3. 备份保留到用户确认成功（或保留 N 天），失败时给恢复命令；
4. 写后重开会话校验消息数/最后事件，校验失败自动回滚；
5. 同一会话的移动加互斥锁；
6. 修 README 里过时的安装路径。

## 并入时要做什么

- 把源包的 `index.js`、`client.js`、`locale/` 同步进 `modules/index-adjust/`；
- 在 `scripts/build-client.mjs` 的 `CLIENT_MODULES` 里加 `index-adjust`（它的 Client 有右键菜单与对话框）；
- 在根 `index.js` 的 `MODULES` 里加一项，键名 `indexAdjust`，依赖 `['workspaceController', 'sessions', 'webServer']` 之类，按源包实际声明的注入来；
- 在 `cordis.patch.yml` 里加 `indexAdjust: true`（或默认 false，让用户显式开）；
- 在 `scripts/sync-modules.mjs` 里去掉 `pending: true`；
- 验收：复制一个会话 → 移到另一个工作区 → 重开 DSH → 消息、附件、标题、时间线都在；再故意让目标目录不可写，确认原样回滚。

## 风险

- 最高。宁可少一个功能，也不要丢一个会话。默认值建议先 `false`，等愿意承担风险的用户显式打开。
