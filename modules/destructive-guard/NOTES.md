# destructive-guard

破坏性命令与文件写入护栏。源包：`C:\DSH Plugin\dsh-destructive-guard`（v1.1.0，MIT）。

## 构造

- **仅 Host**：`index.js`（约 5K）+ `rules.mjs`（约 24K，规则与判定），无 Client 半身。
- 两个钩子：
  - `tools/pre-execute`：对 `pwsh` / `bash` / `terminal` / `shell` / `cmd` 的 `command`，以及 `write` / `edit` / `apply_patch` / `str_replace_editor` 的目标路径，返回 `deny` 或 `ask`。
  - `ctx.tools.guard()`：单调兜底，防止别的路径绕过。
- 规则规模：30+ 条、15 个文件写入目标、42 个受保护根（家目录、`~/.dsh`、`.ssh`、`.aws`、`.gnupg`、凭证文件、盘根、`C:\Windows`、`Program Files` 等）。
- `policyOf(ctx, exec)`：读审批策略；当策略是 `never` 时，把 `ask` 级规则**显式降级为 `deny`**，并在理由里写清规则 id、为什么不能问、怎么解除（切回 `ask` 预设或 `DSH_GUARD=off`）。
- 路由：`GET /dsh-destructive-guard/status`（版本、规则、保护根、fileTools）、`POST /dsh-destructive-guard/check`（纯判定，不执行；支持 `{ toolName, command }` 或 `{ toolName, file_path }`）。
- 关闭：`guard: false` 或环境变量 `DSH_GUARD=off`。

## 并入时的改造

无源码改动。装配层把 `config.guard` 直接传给它的 `apply`（`true` 归一成 `{}`）。

## 风险 / 边界

- **不是沙箱**：只做模式匹配与路径判定，脚本内容、`run_code`、GUI 打字、`-EncodedCommand` 的实际语义都覆盖不了；后者一律拦。
- `-WhatIf` 也会被拦（保守）。
- 判定异常时放行（fail-open），避免护栏自己把 DSH 卡死。
- 完全权限下没有文件沙箱，护栏是唯一一道命令级防线；急停/暂停只属于 computer-use。

## 验证

`POST /dsh-destructive-guard/check` 传 `Remove-Item -Recurse -Force C:\Users\<你>\.dsh\sessions`，应返回 `verdict: "block"`、`rule: "FS-HOME"`。
