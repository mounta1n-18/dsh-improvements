# dsh-improvements

一个 DeepSeek Harness（DSH）插件，内装五个各自独立的小模块：**破坏性命令护栏**、**会话移库**、**MCP 渐进披露**、**桌面操作**、**上下文占用面板**。

对外只有**一个插件、一个包、一行配置**；升级、卸载、开关都只动这一处。

> 兼容性：在 DSH Desktop **0.2.2-rc.3** 上完成冷启动验收。模块本身按 0.2.2-rc.1 的公开接口编写，但 `index-adjust` 一类的功能会碰到未公开字段，升级 DSH 后请先看 [CHANGELOG](CHANGELOG.md) 和本页的「已知风险」。

## 包含什么

| 模块 | 做什么 | 半身 | 关掉它 |
| --- | --- | --- | --- |
| `destructive-guard` | 在命令执行前拦下删家目录、清盘、改引导、关安全中心等操作；`write`/`edit` 覆盖会话日志、记忆、凭证也拦 | Host | `guard: false` |
| `mcp-lazy` | MCP 工具默认不全部塞进上下文，按需 `mcp(load)`；设置页有每个服务器的简介、工具数、披露开关 | Host + Client | `mcpLazy: false` |
| `computer-use` | `computer_use` / `browser_use` 工具：截屏、点按、输入、开应用；必须 `activate` 才动键鼠，带急停 | Host + Python | `computerUse: false` |
| `context-usage` | 作曲器「上下文用量」按钮、占用面板、`/context` 命令、余额药丸 | Client | `contextUsage: false` |
| `index-adjust` | 会话右键「更改工作区 / 重连工作区」；只对 DSH 0.2.2-rc.3 开放，版本不符时返回 503 且不动会话 | Host + Client | `indexAdjust: false` |

每个模块的构造、依赖、改造点与风险，见 `modules/<name>/NOTES.md`。

各模块也可以单独安装，源仓库分别是：
[destructive-guard](https://github.com/mounta1n-18/dsh-destructive-guard)、
[mcp-lazy](https://github.com/mounta1n-18/dsh-mcp-lazy)、
[computer-use](https://github.com/mounta1n-18/dsh-computer-use)、
[context-usage](https://github.com/mounta1n-18/dsh-context-usage)、
[index-adjust](https://github.com/mounta1n-18/dsh-index-adjust)。

## 运行条件

同一个文件夹搬到另一台机器，满足下面的条件就能用；缺哪项只影响对应模块：

- **DSH Desktop 0.2.2-rc.3**：`index-adjust` 硬锁这个版本，不符时只返回 503、不动会话文件。
- **Windows 10/11**：`computer-use` 依赖 UIA、虚拟桌面和覆盖层，仅 Windows 可用。
- **Python 3.10+ 与 Pillow**：`computer-use` 的常驻服务；`python -m pip install pillow`。
- **Chrome**：`browser_use` 的 CDP 平面；没有它桌面操作仍可用。

完整清单与自检命令见 [INSTALL.md](INSTALL.md#01-运行条件)。


## 安装

见 [INSTALL.md](INSTALL.md)。最短路径（假设包放在 `C:\DSH Plugin\dsh-improvements`）：

1. 在 profile 的 `package.json` 里加依赖 `"dsh-improvements": "link:C:/DSH Plugin/dsh-improvements"`；
2. 把 `dsh-improvements` 加进 `dsh.profile.bundles`；
3. `dsh plugin --profile <profile> install`；
4. 重启 DSH。

装好后「设置 → 插件」里只多一行 `dsh-improvements`，里面是一个总开关。

## 安全边界（务必读）

- **护栏不是沙箱。** 它只审 `pwsh`/`bash`/`terminal`/`shell`/`cmd` 的 `command`，以及 `write`/`edit`/`apply_patch`/`str_replace_editor` 的目标路径；脚本内容、`run_code`、GUI 打字都不在范围内。
- **完全权限下没有文件沙箱。** 官方 `danger-full-access` 预设 = 关沙箱 + 审批 `never`；此时护栏的 `ask` 级规则会被确定性拒绝（1.1.0 起会显式降级为 `deny` 并写清原因），而不是弹确认。
- `computer-use` 默认开启，会操作真实桌面。用 `activate` 授权、`Ctrl+Shift+Alt` 暂停、`Ctrl+Alt+Shift+Backspace` 急停。
- `index-adjust` 会改写会话存储：启动时探测 DSH 版本与私有字段，任一项不符就整组操作返回 503，不动任何会话文件；移动成功后备份保留在 `~/.dsh/.dsh-index-adjust-backups`，由你确认正常后手动删除。

## 目录

```
index.js                 装配层：按配置启用模块、隔离加载失败
cordis.patch.yml         整个包唯一的一行配置
modules/<name>/          各模块源码（上游原样）+ UPSTREAM.json + NOTES.md
scripts/build-client.mjs 把各模块 client.js 合成 dist/client.js
scripts/sync-modules.mjs 从源包同步模块并记哈希
scripts/verify.mjs       交付前自检
dist/client.js           合并后的浏览器半身（提交进仓库）
```

## 开发

```bash
npm run sync          # 从 C:/DSH Plugin/<pkg> 同步全部模块，并重建 client
npm run sync:check    # 只看上游有没有漂移
npm run build         # 只重建 dist/client.js
npm run verify        # 自检：入口、client 合并、哈希
```

源包路径可用 `DSH_IMPROVEMENTS_SOURCES` 覆盖。同步是**整文件搬运**，不改模块代码；需要适配时改装配层或构建脚本，别直接改 `modules/`（会被 `verify` 判脏）。

## 来源与许可

- MIT，见 [LICENSE](LICENSE)。
- 五个模块来自作者自己的独立插件会话，版权归 mounta1n-18。
- `modules/computer-use/assets/whale.png` 取自 DeepSeek Harness 官方应用图标，版权归 DeepSeek，仅用于标识「这是 DSH 的桌面操作」，不随 MIT 授权。
- 图标 `icon.svg` 沿用原 `dsh-index-adjust` 的图形，仅作本包标识。
