# 安装（给 agent 看，也给人看）

这是**软安装**：没有安装程序，把包放好、改两处 profile 配置、跑一条安装命令、重启。

## 0. 前提

- 已装 DeepSeek Harness（DSH），并且能跑 `dsh` 命令（桌面版自带；没有就找 DSH 的 bin 目录）。
- Node 由 DSH 自带，不需要另装。
- 本包**不需要** `npm install`；`dist/client.js` 已随仓库提交。

### 0.1 运行条件

这个包可以整目录搬到另一台机器：满足下列条件就能工作；缺哪一项，只有对应模块降级，其余模块照常。

| 条件 | 谁需要 | 缺了会怎样 |
| --- | --- | --- |
| DSH Desktop **0.2.2-rc.3** | `index-adjust` | 版本锁生效：移库/重连按钮仍在，操作返回 503 并提示版本不支持，**不会动会话文件** |
| Windows 10/11 x64 | `computer-use` | 该模块的 Python 服务起不来，`computer_use`/`browser_use` 不可用；其余模块不受影响 |
| Python 3.10+，`py -3` 或 `python` 在 PATH | `computer-use` | 同上 |
| Python 包 **Pillow** | `computer-use` | 截图/覆盖层失败；装法：`python -m pip install pillow` |
| Chrome | `computer-use` 的 `browser_use` | 浏览器平面不可用；`computer_use` 的桌面操作仍可用 |
| PowerShell 7（`pwsh`） | `destructive-guard` | 仍能审 `bash`/`cmd`/`shell`，但审不到 `pwsh` 命令 |

`mcp-lazy`、`context-usage`、`destructive-guard` 没有额外运行时依赖。

自检（不需要启动 DSH）：

```bash
node scripts/verify.mjs          # 包结构、client 合并、哈希
python -c "import PIL; print(PIL.__version__)"   # computer-use 的 Python 依赖
```

## 0.5 从 GitHub 取包

- 直接下载：<https://github.com/mounta1n-18/dsh-improvements/archive/refs/heads/main.zip>，解压后把目录名 `dsh-improvements-main` 改成 `dsh-improvements`。
- 或者 `git clone https://github.com/mounta1n-18/dsh-improvements.git`。

仓库里已经带好 `dist/client.js`，解压即用，不需要构建。

## 1. 放包

把整个 `dsh-improvements` 目录放到一个**不会被升级覆盖**的位置：

- Windows 推荐 `C:\DSH Plugin\dsh-improvements`
- macOS / Linux 推荐 `~/.dsh/plugins/dsh-improvements`

不要放进 `~/.dsh/profiles/<profile>/` 里面：profile 升级或重装时会被清掉。

## 2. 改 profile

编辑 `~/.dsh/profiles/<profile>/package.json`（Windows 是 `C:\Users\<你>\.dsh\profiles\<profile>\package.json`；不确定哪个 profile 就问 DSH「我的 profile 在哪」）。

加两处：

```json
{
  "dependencies": {
    "dsh-improvements": "link:C:/DSH Plugin/dsh-improvements"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-improvements"
      ]
    }
  }
}
```

要点：

- `link:` 后面写**绝对路径**，Windows 用 `/` 或 `\\` 都行；路径有空格也可以。
- `bundles` 里保留原有的项，只在末尾加 `dsh-improvements`。
- 不要把本包同时写进别的 bundle，一行就够。

## 3. 安装

```bash
dsh plugin --profile <profile> install
```

看到 `+ dsh-improvements <版本> <- <你的路径>` 即成功。

> 如果 DSH 当前是「工作区内修改」权限，写 `~/.dsh/profiles` 会被沙箱挡住。两种办法：
> 1. 在 GUI 里用「安装插件」的入口点装（会走一次审批）；
> 2. 临时把权限切到完全访问，装完再切回来。

## 4. 重启并验收

完全退出 DSH 再打开（Host 插件改动必须重启，热重载不生效）。

逐项检查：

1. **设置 → 插件**：只多一行 `dsh-improvements`，点开有总开关。
2. **设置 → MCP**：能看到每个 MCP 服务器的简介、工具数、估算 token，以及披露开关。
3. **作曲器**：输入框上方/右侧出现「上下文用量」按钮；`/context` 能打开面板。
4. **护栏**：让 agent 跑一条 `Remove-Item -Recurse -Force $HOME\.dsh\sessions`，应当被拒，理由里带 `[dsh-guard:FS-HOME]`。
5. **桌面操作**：问 agent「你有哪些 computer_use 工具」，应能列出；第一次动键鼠会弹授权横幅。
6. **会话移库**：右键任意会话，应出现「更改工作区」「重连工作区」；打开弹窗时 `GET /dsh-index-adjust/state?sessionId=…`（带 `x-dsh-index-adjust: 1`）返回 `compat.supported: true`。如果 DSH 不是 0.2.2-rc.3，按钮仍在但操作会返回 503 并显示「当前 DSH 版本不支持」——这是有意的版本锁。

以上 6 项过 5 项即可用；护栏、MCP 页、会话移库是最关键的三项。

## 5. 关掉某个模块

只改 `cordis.patch.yml` 里那一行的 config，不动代码：

```yaml
- insert:
    - id: dsh-improvements
      name: dsh-improvements
      config:
        guard: false
        indexAdjust: true
        mcpLazy: true
        computerUse: false
        contextUsage: true
```

改完重启。护栏也可以用环境变量临时关：`DSH_GUARD=off`。

## 6. 卸载

1. 从 profile 的 `dependencies` 删掉 `dsh-improvements`；
2. 从 `dsh.profile.bundles` 删掉 `dsh-improvements`；
3. `dsh plugin --profile <profile> install`；
4. 重启；确认插件页不再有这一行；
5. 最后再删包目录。

## 7. 排错

| 现象 | 处理 |
| --- | --- |
| 插件页没有这一行 | 看 `dsh --profile <profile> --dump-config` 里有没有 `dsh-improvements`；没有就是 bundles 没加或没 install |
| 有行但设置页没有 MCP | 确认 `mcpLazy` 没被关；看 DSH 日志里有没有 `[dsh-improvements] 模块 mcp-lazy 加载失败` |
| 上下文按钮不出现 | 确认 `contextUsage: true`；刷新页面（Client 改动只需刷新，不用重启） |
| 护栏不拦 | 确认 `guard: true` 且没有 `DSH_GUARD=off`；`/dsh-destructive-guard/status` 应返回 1.1.0 |
| 电脑操作报「找不到 Python」 | 装 Python 3.10+，或设 `DSH_CU_PYTHON` 指向解释器 |
| 装完 DSH 起不来 | 把 `bundles` 里 `dsh-improvements` 去掉、重装、重启；把日志发给维护者 |

## 8. 升级

本包升级 = 覆盖目录 + 重启。`modules/` 与 `dist/` 都是仓库内容，不要手改；手改会被 `npm run verify` 判脏。若同时更新了源插件，先跑 `npm run sync` 再重启。
