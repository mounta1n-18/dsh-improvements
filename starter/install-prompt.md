# 安装 prompt（粘给她的 DSH）

你是这台电脑上的 DSH agent。用户刚装好 DeepSeek Harness，是新手。请帮她安装 `dsh-improvements`——一个包含五个改进的插件包（破坏性命令护栏、MCP 渐进披露、桌面操作、上下文用量面板、会话移库）。

全程用中文；每一步先用一句话说明要做什么、为什么，再执行；不要一次丢给她一屏命令。

## 目标

装好、逐项验证、能用。装不上就回滚，不留半成品。

## 步骤

1. **摸底**
   - 运行 `dsh --version`，记下版本。
   - 找到正在用的 profile：看 `~/.dsh/profiles/` 下哪个目录有 `package.json`；不确定就问用户「DSH 是从桌面图标打开的吗」。
   - 告诉用户：如果版本不是 `0.2.2-rc.3`，「会话移库」会被版本锁限制，这是设计，不要改代码绕过。

2. **取包**
   - 建目录 `%USERPROFILE%\DSH\Plugins`（没有就创建）。
   - 下载 <https://github.com/mounta1n-18/dsh-improvements/archive/refs/heads/main.zip>，解压，把 `dsh-improvements-main` 改名为 `dsh-improvements`。
   - 下载失败就试 `git clone https://github.com/mounta1n-18/dsh-improvements.git`；再失败就停下来告诉用户，不要自己拼一个包。

3. **备份**
   - 把 profile 的 `package.json` 复制成 `package.json.bak-<日期>`。

4. **改 profile**
   - `dependencies` 里加：`"dsh-improvements": "link:<包目录的绝对路径，用正斜杠>"`。
   - `dsh.profile.bundles` 数组末尾加 `"dsh-improvements"`，保留原有项。
   - 改完把 diff 给用户看一眼，再写回。

5. **安装**
   - 运行 `dsh plugin --profile <profile 名> install`。
   - 如果被沙箱挡住写 `~/.dsh/profiles`：请用户在 GUI 里临时把权限切到完全访问（或点一次批准），装完切回。不要绕过沙箱。

6. **重启**
   - 让用户完全退出 DSH 再打开。Host 插件必须重启，热重载不生效。

7. **验收**（逐项报 pass / fail，不要合并成一句「都好了」）
   - a. 设置 → 插件：只多一行 `dsh-improvements`，点开有总开关。
   - b. 设置 → MCP：能看到 MCP 服务器列表、工具数、开关。
   - c. 作曲器：有「上下文用量」按钮，`/context` 能打开面板。
   - d. 护栏：让 agent 尝试运行下面这条**故意指向不存在目录**的命令：
     `Remove-Item -Recurse -Force "$HOME\.dsh\sessions\__guard_test_nonexistent__"`
     应当被拒，理由里带 `[dsh-guard:FS-HOME]`。即使护栏失效，这条也删不到东西，可以放心测。
   - e. 桌面操作：问 agent「你有哪些 computer_use 工具」，应能列出。
   - f. 会话移库：请用户右键任意会话，应出现「更改工作区」「重连工作区」。

8. **降级说明**
   如果缺 Python 3.10+、Pillow、Chrome 或 pwsh，对应模块会降级（桌面操作 / 浏览器平面 / 护栏审 pwsh），其余模块照常。把缺什么、怎么补告诉用户，不要擅自装一堆东西。

9. **失败回滚**
   如果启动报错或插件页没有这一行：删掉刚加的两处、恢复备份、重跑 `dsh plugin --profile <名字> install`、重启；把日志里以 `[dsh-improvements]` 开头的行原样发给用户。

10. **报告**
    装到哪、版本、六项验收结果、降级项、下一步建议。

## 红线

- 不改 DSH 安装目录。
- 不把包放进 `profiles/<名字>/` 里面。
- 不执行任何删除 `~/.dsh` 的命令。
- 不确定的先问用户，不要猜。
