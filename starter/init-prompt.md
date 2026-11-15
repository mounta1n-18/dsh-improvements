# 初始化 prompt（装好插件之后粘给她的 DSH）

你是这台电脑上的 DSH agent。用户刚装好 DSH 和 `dsh-improvements`，是新手。现在做一次「家目录初始化」：自检这台电脑、建一套工作区、把全局指令改成适合她的版本。

全程中文；先解释再动手；**任何写文件之前先备份，并把 diff 给她看**。

## 准备

读取模板：
<https://raw.githubusercontent.com/mounta1n-18/dsh-improvements/main/starter/AGENTS.template.md>

如果下载失败，请用户把 `starter/AGENTS.template.md` 发给你。这是可移植的通用规则，**不要照抄任何别人的路径、人名、软件**。

## 第一步：家目录自检（只读）

- 运行 `pwsh -File "$env:USERPROFILE\DSH\Plugins\dsh-improvements\starter\collect-env.ps1"`（不是 Windows 就手动收集等价信息；找不到脚本就问用户要）。
- 检查 `~/.dsh`：有哪些 profile、`AGENTS.md` 是否存在、`memory` / `skills` / `plugins` 是否存在、占多大、磁盘剩多少。
- 检查 `dsh-improvements` 是否装好：插件页有没有那一行。
- 给用户一张小表：系统、DSH 版本、profile、Python / Node / Chrome / pwsh、已装插件、剩余空间。
- 标出异常：多个 profile、缺 Python 或 Pillow、没 Chrome、`~/.dsh` 异常大、旧备份堆积。

## 第二步：建工作区

- 建目录：
  - `%USERPROFILE%\DSH\Plugins`（插件源码）
  - `%USERPROFILE%\DSH\Projects`（项目）
  - `%USERPROFILE%\DSH\Learning`（学习与资料）
  - `%USERPROFILE%\DSH\Scratch`（临时产物，可随时清空）
- 如果 `dsh-improvements` 还在下载目录或临时目录：移到 `DSH\Plugins` 下，改 profile 里的 `link:` 路径，重跑 `dsh plugin --profile <名字> install`，重启。
- 在 DSH GUI 里把 `Projects`、`Learning` 加成工作区：引导用户点「添加工作区」，或者用 computer_use 帮她点。**不要直接改 `~/.dsh/storages/workspace.json`。**
- 用一句话告诉用户每个目录放什么。

## 第三步：问偏好（一次问完，最多 5 个）

1. 怎么称呼你？
2. 平时用 DSH 做什么（学习、工作、生活）？
3. 回答末尾要不要加一句固定的口头禅或称呼？
4. 电脑上常用的软件和浏览器是什么？
5. 有没有「绝对不要动」的目录或习惯？

没问到的不要编；宁可不写。

## 第四步：写全局指令

- 备份现有 `~/.dsh/AGENTS.md` 为 `AGENTS.md.bak-<时间>`（没有就跳过）。
- 按模板逐项替换 `{{...}}`：
  - 环境段全部用自检结果；
  - 称呼、语言、结尾语气用她刚才的回答；
  - 工作区路径用第二步实际建的目录；
  - 没装记忆插件就删掉「记忆」整节。
- 「你的定位」「三大纪律」「八项注意」这三节是通用规则，**原样保留**：只替换占位符，不要改写、不要合并或删减条目（三大纪律 3 条、八项注意 8 条都要在）。
- 写完先给她看全文，确认后再落盘到 `~/.dsh/AGENTS.md`。
- 落盘用 UTF-8 无 BOM。

## 第五步：验证

- 全文搜 `{{`，应为 0 处。
- 确认「你的定位」「三大纪律」「八项注意」三节仍在，条数分别是 3 条和 8 条。
- 新开一个会话，问：「按新的全局规则，用一句话介绍你自己。」检查语言、称呼、结尾是否符合。
- 确认 `~/.dsh/AGENTS.md` 能正常读取、没有乱码。

## 第六步：报告

- 改了什么、建了哪些目录、注册了哪些工作区；
- 还缺什么（Python / Pillow / Chrome / pwsh）；
- 建议下一步：备份 `~/.dsh`、按需装记忆插件、把常用项目放进 `Projects`。

## 红线

- 不删 `~/.dsh` 里的任何东西。
- 不改 DSH 安装目录。
- 不把密钥写进 `AGENTS.md`。
- 不确定的先问。
