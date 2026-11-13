# computer-use

桌面与浏览器操作工具。源包：`C:\DSH Plugin\dsh-computer-use`（1.0.0；源包未写 license 字段，本包统一按 MIT 发布）。

## 构造

- **Host**：`index.js` 注册 `computer_use` 与 `browser_use` 两个工具，其余在 `lib/`：
  - `lib/server-manager.mjs`：找 Python（`DSH_CU_PYTHON` → `py -3` → `python` → `python3`），拉起 `python/cu_server.py` 常驻服务，走 stdio 长连接；宿主退出时子进程一起退出。
  - `lib/pipe-client.mjs`：与 Python 的 JSON 行协议。
  - `lib/cdp*.mjs`：浏览器 CDP 直连，吃可访问性树。
  - `python/cu.py`：CLI/降级路径；`python/overlay.py`：授权横幅、四边琥珀光、光标圆、右下鲸鱼；`uia.py` + `uia_sidecar.ps1`：UIA 元素。
  - `skills/`：computer-use、im-chat 等技能说明。
- **工具体验**：截图直接回图片块；`activate{label}` 才允许动键鼠（30 秒无回应默认同意）；`Ctrl+Shift+Alt` 暂停、`Ctrl+Alt+Shift+Backspace` 急停、点鲸鱼=暂停并留言；`deactivate` 交还控制权。
- **路径**：`lib/server-manager.mjs` 用 `PLUGIN_ROOT` 推导 `python/` 与脚本路径；`overlay.py` 用 `HERE/../assets/whale.png`。因此并入时必须保持 `index.js / lib / python / skills / assets` 的相对布局。

## 并入时的改造

无源码改动；整目录搬运，排除 `__pycache__`、`tests/`、`_preview`、`.tgz`。

## 风险

- 需要 Python 3.10+；没装会在调用时报「找不到可用的 Python」。
- 默认开启。它操作的是真实桌面，终端打字可以绕过命令级护栏；急停键是最后一道。
- 与官方 `@deepseek-ai/dsh-browser-use` 存在潜在工具名冲突（两者都想注册 `browser_use`）。该官方包当前没有随 base 启用；若未来启用，优先关掉本模块或让官方包独占。
- Windows 为主（UIA sidecar 是 PowerShell）；macOS/Linux 只有部分能力。

## 验证

工具表出现 `computer_use`；第一次调用会弹授权横幅；`python/cu_server.py` 进程存在且路径指向本模块的 `python/` 目录。
