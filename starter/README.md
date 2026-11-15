# starter —— 给新机器的初始化包

给「刚装好 DSH、还没有自己那套规矩」的人用。里面是从本机全局指令里抽出来的可移植部分，以及两份可以直接粘给 agent 的 prompt。

| 文件 | 用途 |
| --- | --- |
| `AGENTS.template.md` | 全局指令模板，`{{...}}` 由初始化流程替换 |
| `collect-env.ps1` | 只读环境采集（Windows），输出给 agent 读 |
| `install-prompt.md` | 第一份 prompt：安装 `dsh-improvements` 并验收 |
| `init-prompt.md` | 第二份 prompt：自检、建工作区、生成自己的 `AGENTS.md` |

## 用法

1. 把 `install-prompt.md` 整段粘给她的 DSH，等它装完并逐项验收。
2. 把 `init-prompt.md` 整段粘过去，按它的提问回答几个偏好。
3. 结束时应得到：一个能用的插件包、一套 `DSH\Plugins|Projects|Learning|Scratch` 目录、一份属于她自己的 `~/.dsh/AGENTS.md`。

## 注意

- 模板里不包含任何原作者的私人路径、账号、密钥或历史事故记录。
- 需要迁移的是规则和目录结构，不是别人的环境。
- 装不上就回滚，别在半成品上继续加东西。
