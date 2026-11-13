# -*- coding: utf-8 -*-
"""cu 常驻服务：把"每条命令起一个 Python 进程"换成"一次拉起、长连接收发"。

为什么值得做：
- 冷启动约 150~300ms，每条命令都付一次；常驻后单命令只剩一次管道往返。
- 更要紧的是**状态**：凝视队列、修饰键 latch、静默窗到期时间，以前靠临时文件在
  进程之间传；现在它们就是内存里的对象，语义清楚得多（磁盘那份仍然保留，
  作为 CLI 路径与崩溃恢复的兜底）。

设计要点（对齐豆包 GAC 的传输层，但用我们自己的命名，避免与 CUA_GAC_* 撞车）：
- **三种传输 + 兜底链**：Windows 优先命名管道，其它平台优先 Unix socket，TCP 兜底。
  配置全部来自 DSH_CU_* 环境变量，非法就报**可执行**的错（缺什么、怎么补）。
- **分帧**：`[u32 BE 长度][u8 类型][载荷]`；类型 0=JSON、1=PNG、2=日志。
  图片走独立的二进制帧，不 base64——省 33% 的无谓拷贝。
- **不重发**：一次请求写/读失败后**绝不自动重试**（对端可能已经执行过了，
  重试等于把点击点两次）。只标记为不可恢复，并在下一个请求前重连。
- **单实例**：靠锁文件；第二个进程拿不到锁就退出，由插件复用已在跑的那个。
- **结果信封严格校验**：缺 ok / output.type 未知 / 失败却没带 error 对象，
  一律 CU_PROTOCOL。宁可报错，也不把半成品当结果。
"""
import ctypes
import json
import os
import socket
import struct
import subprocess
import sys
import threading
import time
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

CU_PY = os.path.join(HERE, "cu.py")
# 凝视是**长任务**：它要在后台跑几十分钟盯着画面。这种东西绝不能占用服务的请求锁，
# 否则一条 `watch_start` 会把整个工具链（shot/click/eval…）堵到天荒地老。
# 所以服务端对它特殊处理：起一个独立进程，立刻返回。
WATCH_CMDS = ("盯", "watch")

import cu  # noqa: E402  （cu 在 import 时会设置 DPI 感知与三个流的 UTF-8）

PROTOCOL_VERSION = 1
SERVER_VERSION = "1.0.0"
PIPE_NAME = r"\\.\pipe\dsh-computer-use"

KIND_JSON = 0
KIND_BINARY = 1

MAX_JSON = 8 * 1024 * 1024
MAX_BINARY = 32 * 1024 * 1024

DEFAULT_CONNECT_TIMEOUT = 5.0
DEFAULT_IO_TIMEOUT = 30.0
# 对齐豆包 client.py：主传输有兜底时只给 0.5s 的尝试窗口，免得 5s 全耗在死路上
IPC_CONNECT_TIMEOUT_WITH_FALLBACK = 0.5


# ---------------------------------------------------------------- 传输配置
class TransportConfig:
    """从环境变量解析出的传输配置。字段与豆包 GacTransportConfig 一一对应。"""

    def __init__(self, kind, endpoint, port, fallback_kind="", fallback_port=0,
                 connect_timeout=DEFAULT_CONNECT_TIMEOUT, io_timeout=DEFAULT_IO_TIMEOUT):
        self.kind = kind
        self.endpoint = endpoint
        self.port = port
        self.fallback_kind = fallback_kind
        self.fallback_port = fallback_port
        self.connect_timeout = connect_timeout
        self.io_timeout = io_timeout

    @classmethod
    def from_env(cls):
        def _port(name):
            v = os.environ.get(name)
            if not v:
                return 0
            try:
                p = int(v)
            except (TypeError, ValueError):
                raise SystemExit("GUI 操作不可用：%s 不是合法端口号（收到 %r）" % (name, v))
            if not 0 <= p <= 65535:
                raise SystemExit("GUI 操作不可用：%s 越界（收到 %r）" % (name, v))
            return p

        default_kind = "named_pipe" if os.name == "nt" else "uds"
        kind = (os.environ.get("DSH_CU_TRANSPORT") or default_kind).strip().lower()
        if kind not in ("named_pipe", "uds", "tcp"):
            raise SystemExit(
                "GUI 操作不可用：DSH_CU_TRANSPORT 只支持 named_pipe / uds / tcp（收到 %r）"
                % kind)
        endpoint = (os.environ.get("DSH_CU_ENDPOINT") or "").strip()
        if kind == "named_pipe" and not endpoint:
            endpoint = PIPE_NAME
        if kind == "uds" and not endpoint:
            endpoint = os.path.join(_home_dir(), "cu.sock")
        port = _port("DSH_CU_PORT")
        if kind == "tcp" and not port:
            raise SystemExit("GUI 操作不可用：DSH_CU_TRANSPORT=tcp 时必须给 DSH_CU_PORT")
        fb = (os.environ.get("DSH_CU_FALLBACK_TRANSPORT") or "").strip().lower()
        if fb and fb not in ("", "tcp"):
            raise SystemExit("GUI 操作不可用：DSH_CU_FALLBACK_TRANSPORT 只支持留空或 tcp")
        fb_port = _port("DSH_CU_FALLBACK_PORT")
        if fb == "tcp" and not fb_port:
            raise SystemExit("GUI 操作不可用：有 TCP 兜底时必须有 DSH_CU_FALLBACK_PORT")

        def _f(name, default):
            v = os.environ.get(name)
            if not v:
                return default
            try:
                return float(v)
            except (TypeError, ValueError):
                raise SystemExit("GUI 操作不可用：%s 不是数字（收到 %r）" % (name, v))

        return cls(kind, endpoint, port, fb, fb_port,
                   _f("DSH_CU_CONNECT_TIMEOUT", DEFAULT_CONNECT_TIMEOUT),
                   _f("DSH_CU_IO_TIMEOUT", DEFAULT_IO_TIMEOUT))


def _home_dir():
    base = os.environ.get("DSH_CU_HOME")
    if not base:
        la = os.environ.get("LOCALAPPDATA")
        base = os.path.join(la, "dsh-computer-use") if la else \
            os.path.join(cu.tempfile.gettempdir(), "dsh-computer-use")
    os.makedirs(base, exist_ok=True)
    return base


LOG_FILE = os.path.join(_home_dir(), "server.log")


def log(msg):
    line = "%s [%d] %s" % (time.strftime("%H:%M:%S"), os.getpid(), msg)
    try:
        try:
            if os.path.getsize(LOG_FILE) > 1024 * 1024:
                os.replace(LOG_FILE, LOG_FILE + ".1")
        except OSError:
            pass
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass
    if os.environ.get("DSH_CU_SERVER_STDERR"):
        print(line, file=sys.stderr)


# ---------------------------------------------------------------- 分帧
def write_frame(conn, kind, payload, binary=False):
    if binary:
        if len(payload) > MAX_BINARY:
            raise ValueError("二进制帧超过 %d 字节上限" % MAX_BINARY)
    elif len(payload) > MAX_JSON:
        raise ValueError("JSON 帧超过 %d 字节上限" % MAX_JSON)
    conn.write_all(struct.pack(">IB", len(payload), kind) + payload)


def read_frame(conn):
    head = conn.read_exact(5)
    size, kind = struct.unpack(">IB", head)
    if kind == KIND_BINARY:
        if size > MAX_BINARY:
            raise ValueError("对端声明的二进制帧过大：%d" % size)
    elif size > MAX_JSON:
        raise ValueError("对端声明的 JSON 帧过大：%d" % size)
    return kind, conn.read_exact(size) if size else b""


def send_json(conn, obj, binary_payload=None):
    data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    write_frame(conn, KIND_JSON, data)
    if binary_payload is not None:
        write_frame(conn, KIND_BINARY, binary_payload, binary=True)


def recv_json(conn):
    kind, data = read_frame(conn)
    if kind != KIND_JSON:
        raise ValueError("期待 JSON 帧，收到类型 %d" % kind)
    return json.loads(data.decode("utf-8"))


# ---------------------------------------------------------------- 连接实现
class SockConn:
    def __init__(self, sock):
        self.sock = sock

    def read_exact(self, n):
        buf = b""
        while len(buf) < n:
            chunk = self.sock.recv(n - len(buf))
            if not chunk:
                raise EOFError("对端关闭")
            buf += chunk
        return buf

    def write_all(self, data):
        self.sock.sendall(data)

    def close(self):
        try:
            self.sock.close()
        except OSError:
            pass


class PipeConn:
    """Windows 命名管道。用 pywin32；没装的话服务端会明确报缺依赖。"""

    def __init__(self, handle):
        self.handle = handle

    def read_exact(self, n):
        buf = b""
        while len(buf) < n:
            try:
                _, data = win32file.ReadFile(self.handle, n - len(buf))
            except pywintypes.error as e:      # 109 = ERROR_BROKEN_PIPE
                raise EOFError("管道断开（%s）" % (e.args[2] if len(e.args) > 2 else e,))
            if not data:
                raise EOFError("管道断开")
            buf += data
        return buf

    def write_all(self, data):
        try:
            win32file.WriteFile(self.handle, data)
        except pywintypes.error as e:
            raise EOFError("管道写失败（%s）" % (e.args[2] if len(e.args) > 2 else e,))

    def close(self):
        try:
            win32file.CloseHandle(self.handle)
        except Exception:
            pass


try:
    import win32file
    import win32pipe
    import pywintypes
    _HAVE_PYWIN32 = True
except ImportError:                                   # pragma: no cover
    _HAVE_PYWIN32 = False


def connect(config, timeout=None):
    """按配置连接服务端；主传输失败且有 TCP 兜底时落兜底。"""
    t = config.connect_timeout if timeout is None else timeout
    try:
        return _connect_kind(config.kind, config.endpoint, config.port,
                             min(t, IPC_CONNECT_TIMEOUT_WITH_FALLBACK)
                             if config.fallback_kind else t)
    except (OSError, EOFError, RuntimeError) as primary:
        if config.fallback_kind != "tcp":
            raise
        try:
            return _connect_kind("tcp", "", config.fallback_port, config.connect_timeout)
        except (OSError, EOFError, RuntimeError) as fb:
            raise RuntimeError("主传输 %s 与 TCP 兜底都连不上：%s；%s"
                               % (config.kind, primary, fb))


def _connect_kind(kind, endpoint, port, timeout):
    if kind == "named_pipe":
        if not _HAVE_PYWIN32:
            raise RuntimeError("缺少 pywin32，命名管道不可用。装它：%s -m pip install --user pywin32"
                               % sys.executable)
        deadline = time.monotonic() + timeout
        last = None
        while time.monotonic() < deadline:
            try:
                h = win32file.CreateFile(
                    endpoint, win32file.GENERIC_READ | win32file.GENERIC_WRITE,
                    0, None, win32file.OPEN_EXISTING, 0, None)
                return PipeConn(h)
            except pywintypes.error as e:
                last = e
                time.sleep(0.05)
        raise RuntimeError("连不上命名管道 %s（%s）" % (endpoint, last))
    if kind == "uds":
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.settimeout(timeout)
        try:
            s.connect(endpoint)
        except OSError:
            s.close()
            raise
        s.settimeout(None)
        return SockConn(s)
    if kind == "tcp":
        s = socket.create_connection(("127.0.0.1", port), timeout=timeout)
        s.settimeout(None)
        return SockConn(s)
    raise RuntimeError("未知传输类型 %r" % kind)


# ---------------------------------------------------------------- 桌面提示层
class Overlay:
    """overlay.py 的子进程句柄：按需拉起、崩溃自动重启、stdout 事件回调。"""

    def __init__(self, on_event):
        self.on_event = on_event
        self.proc = None
        self.ready = threading.Event()
        self.lock = threading.Lock()
        self.last_error = None

    def start(self):
        with self.lock:
            if self.proc is not None and self.proc.poll() is None:
                return True
            self.ready.clear()
            path = os.path.join(HERE, "overlay.py")
            flags = 0x08000000 if os.name == "nt" else 0   # CREATE_NO_WINDOW
            try:
                self.proc = subprocess.Popen(
                    [sys.executable, path], cwd=HERE,
                    stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                    text=True, encoding="utf-8", errors="replace", bufsize=1,
                    creationflags=flags)
            except OSError as e:
                self.last_error = "起提示层失败：%s" % e
                log(self.last_error)
                return False
            threading.Thread(target=self._read, args=(self.proc,),
                             name="cu-overlay-read", daemon=True).start()
        ok = self.ready.wait(6.0)
        if not ok:
            self.last_error = "提示层 6 秒内没有就绪"
            log(self.last_error)
        return ok

    def _read(self, proc):
        try:
            for line in proc.stdout:
                line = line.strip()
                if not line:
                    continue
                try:
                    msg = json.loads(line)
                except ValueError:
                    continue
                if msg.get("event") == "ready":
                    self.ready.set()
                elif msg.get("event") == "error":
                    self.last_error = msg.get("message")
                    log("提示层报错：%s" % msg.get("message"))
                else:
                    try:
                        self.on_event(msg)
                    except Exception:                        # noqa: BLE001
                        log("提示层事件处理失败：%s" % traceback.format_exc())
        except (OSError, ValueError):
            pass
        finally:
            self.ready.clear()

    def send(self, **msg):
        for attempt in (1, 2):
            if attempt == 2 and not self.start():
                return False
            proc = self.proc
            if proc is None or proc.poll() is not None:
                if attempt == 1:
                    continue
                return False
            try:
                with self.lock:
                    proc.stdin.write(json.dumps(msg, ensure_ascii=False) + "\n")
                    proc.stdin.flush()
                return True
            except (OSError, ValueError):
                self.stop()
        return False

    # ---- 对话框：独立进程 ----
    # 对话框必须跟渲染进程分开：渲染线程 40fps 一直在 UpdateLayeredWindow 上刷，
    # 同一个进程里再跑一个 Tk 窗口，Windows 那边只给它一块黑底（实测）。
    # 独立进程还顺带解决"用户点完就关"与"渲染层崩溃"互不影响。
    def dialog(self, title, hint, on_message, on_closed=None):
        self.close_dialog()
        path = os.path.join(HERE, "overlay.py")
        flags = 0x08000000 if os.name == "nt" else 0
        spec = json.dumps({"title": title, "hint": hint}, ensure_ascii=False)
        try:
            proc = subprocess.Popen(
                [sys.executable, path, "--dialog", spec], cwd=HERE,
                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                text=True, encoding="utf-8", errors="replace", bufsize=1,
                creationflags=flags)
        except OSError as e:
            self.last_error = "起对话框失败：%s" % e
            log(self.last_error)
            return False
        self.dialog_proc = proc

        def read():
            try:
                for line in proc.stdout:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        msg = json.loads(line)
                    except ValueError:
                        continue
                    if msg.get("event") == "message":
                        on_message(str(msg.get("text") or ""))
                    elif msg.get("event") == "dialog_closed":
                        if on_closed:
                            on_closed()
            except (OSError, ValueError):
                pass

        threading.Thread(target=read, name="cu-dialog-read", daemon=True).start()
        return True

    def close_dialog(self):
        proc = getattr(self, "dialog_proc", None)
        self.dialog_proc = None
        if proc is not None and proc.poll() is None:
            try:
                proc.kill()
            except OSError:
                pass

    def stop(self):
        self.close_dialog()
        proc = self.proc
        self.proc = None
        if proc is None:
            return
        try:
            if proc.poll() is None:
                try:
                    proc.stdin.write(json.dumps({"cmd": "quit"}) + "\n")
                    proc.stdin.flush()
                except (OSError, ValueError):
                    pass
                proc.wait(timeout=1.5)
        except (OSError, subprocess.TimeoutExpired):
            try:
                proc.kill()
            except OSError:
                pass


# ---------------------------------------------------------------- 请求处理
class Server:
    """服务端状态机。所有请求串行处理（桌面操作本来就是串行的）。"""

    def __init__(self, config):
        self.config = config
        self.lock = threading.Lock()
        self.started = time.time()
        self.requests = 0
        self.last_error = None
        self.stopping = False
        self.watchers = []          # 自己拉起的凝视子进程，shutdown 时要带走
        self.listener = None        # 正在 accept 的监听句柄：shutdown 时叫醒主循环用

        # ---- 控制权 ----
        self.control = cu._CONTROL
        self.control.enabled = True         # 服务模式下默认关闸：不激活什么都干不了
        self.control_lock = threading.RLock()
        self.pending = None
        # DSH_CU_CONSENT=auto 仅供自动化测试：不弹横幅直接同意。
        # 默认 user：必须用户按热键/点按钮，30 秒无响应按用户拍板"默认同意"。
        self.consent_mode = (os.environ.get("DSH_CU_CONSENT") or "user").strip().lower()
        self.overlay = Overlay(self._overlay_event)
        self.hotkey_ok = None
        self.input_hook_ok = None
        self._hotkey_prev = {"emergency": False, "agree": False}
        self.notices = []                   # 待推给 agent 的提示（下一条结果里带走）
        self.last_user_input = 0.0
        self._user_input_evt = threading.Event()
        self.session = ""                   # 当前持租约的会话（横幅上告诉用户"是哪个会话"）
        self.cwd = ""                       # 该会话的工作目录（只取末段显示）
        self.dialog_open = False
        threading.Thread(target=self._control_ticker, name="cu-control-ticker",
                         daemon=True).start()
        threading.Thread(target=self._hotkey_loop, name="cu-hotkeys",
                         daemon=True).start()
        threading.Thread(target=self._input_hook_loop, name="cu-input-hook",
                         daemon=True).start()
        threading.Thread(target=self._notice_loop, name="cu-user-input",
                         daemon=True).start()

    # ---- 提示层事件 ----
    def _overlay_event(self, msg):
        ev = msg.get("event")
        if ev in ("agree", "deny"):
            self._resolve_pending(ev)
        elif ev == "logo_click":
            self._on_logo_click()
        elif ev == "message":
            self._on_user_message(str(msg.get("text") or "")[:2000])
        elif ev == "dialog_closed":
            pass

    # ---- 存在感层（边框 / 光晕 / logo / 横幅）----
    def _session_line(self, owner=None):
        """横幅第二行：是哪个会话在手，谁在操作。"""
        s = self.session or ""
        cwd = self.cwd or ""
        bits = []
        if s:
            bits.append("会话 %s" % s[:8])
        if cwd:
            bits.append("目录 %s" % os.path.basename(cwd.rstrip("\\/")) or cwd)
        return " · ".join(bits)

    def _show_active(self, owner, banner_seconds=5):
        self.overlay.send(cmd="border", on=True, color="#FFB000", alpha=0.42)
        self.overlay.send(cmd="halo", on=True)
        self.overlay.send(cmd="logo", on=True)
        sub = self._session_line()
        self.overlay.send(
            cmd="banner",
            text="代理「%s」正在控制这台电脑" % owner,
            sub=sub,
            note="急停 Ctrl+Alt+Shift+Backspace · 暂停 Ctrl+Shift+Alt",
            seconds=int(banner_seconds), buttons=False, tone="active")
        if banner_seconds:
            self._later(banner_seconds + 0.2, lambda: self.overlay.send(cmd="hide_banner"))

    def _show_paused(self):
        self.overlay.send(cmd="border", on=True, color="#8A8F98", alpha=0.32)
        self.overlay.send(cmd="halo", on=False)
        self.overlay.send(cmd="logo", on=True)
        self.overlay.send(
            cmd="banner",
            text="已暂停：agent 不再动鼠标键盘",
            sub=self._session_line(),
            note="按 Ctrl+Shift+Alt 继续 · 点右下角鲸鱼给 agent 留言",
            seconds=0, buttons=False, tone="paused")

    def _show_idle(self):
        """交还/急停之后：所有特效立刻消失，用户可确定现在轮到自己了。"""
        self.overlay.send(cmd="off")

    # ---- 暂停 / logo 留言 ----
    def _pause_toggle(self, why="hotkey"):
        """暂停 = 保留租约但停止注入；再按一次恢复。急停态按这个不起作用。"""
        if self.control.emergency:
            return False
        if not self.control.lease:
            log("暂停键：当前没有控制权，忽略")
            return False
        on = not self.control.paused
        self.control.set_paused(on)
        cu.audit("control", {"owner": (self.control.lease or {}).get("owner"),
                             "why": why}, "paused" if on else "resumed")
        if on:
            self.notices.append("用户按了暂停（Ctrl+Shift+Alt），已停止注入，正在和你直接沟通。"
                                "不要重试刚失败的动作，等用户恢复或看完对话再继续。")
            del self.notices[:-3]
            self._show_paused()
        else:
            owner = (self.control.lease or {}).get("owner") or "代理"
            self._show_active(owner, banner_seconds=3)
        log("控制权%s（%s）" % ("已暂停" if on else "已恢复", why))
        return True

    def _on_logo_click(self):
        """用户点了右下角鲸鱼：先暂停，再让他留言。"""
        with self.control_lock:
            if not self.control.lease or self.control.emergency:
                return
            if not self.control.paused:
                self.control.set_paused(True)
                cu.audit("control", {}, "paused_for_chat")
        self._show_paused()
        self.dialog_open = True
        title = "对「%s」说点什么" % ((self.control.lease or {}).get("owner") or "代理")
        self.overlay.dialog(
            title,
            "已暂停鼠标键盘操作。发出后 agent 会继续，并看到你的这句话。",
            self._on_user_message,
            lambda: setattr(self, "dialog_open", False))

    def _on_user_message(self, text):
        self.dialog_open = False
        if not text.strip():
            return
        self.notices.append("【用户在你操作电脑时留言】%s" % text.strip())
        del self.notices[:-3]
        with cu.control_bypass():
            cu.release_all(force=True)
        cu.audit("control", {"text": text[:200]}, "user_message")
        if self.control.lease and not self.control.emergency:
            self.control.set_paused(False)
            owner = (self.control.lease or {}).get("owner") or "代理"
            self._show_active(owner, banner_seconds=3)
        log("用户留言：%s" % text[:120])

    # ---- 用户同意 ----
    def _resolve_pending(self, decision):
        with self.control_lock:
            p = self.pending
            if not p:
                return False
            if p["decision"] is None:
                p["decision"] = decision
            p["event"].set()
            return True

    def _wait_pending(self, timeout=31.0):
        """等用户决定；等不到按"默认同意"处理（用户 2026-11-09 拍板）。"""
        with self.control_lock:
            p = self.pending
            if p is None:
                return "deny"
        got = p["event"].wait(timeout)
        with self.control_lock:
            decision = p["decision"]
        if decision:
            return decision
        return "agree" if not got else "deny"

    @staticmethod
    def _later(sec, fn):
        """延时动作（横幅自动消失）。必须是 daemon，否则主进程退出会被它拖住。"""
        t = threading.Timer(float(sec), fn)
        t.daemon = True
        t.start()
        return t

    # ---- 控制权 op ----
    def _lease_view(self, lease):
        v = self.control.status()
        v["since"] = round(time.time() - lease["started"], 1) if lease else 0
        return v

    def _activate(self, req):
        owner = str(req.get("owner") or req.get("label") or "").strip()[:80] or "未命名代理"
        owner_id = str(req.get("agent") or req.get("session") or "")[:120]
        self.session = str(req.get("session") or "")[:64]
        self.cwd = str(req.get("cwd") or "")[:260]
        for key, attr, lo, hi in (("idle_ttl", "idle_ttl", 2, 3600),
                                  ("max_ttl", "max_ttl", 60, 14400)):
            if req.get(key) is not None:
                try:
                    setattr(self.control, attr, max(lo, min(hi, float(req[key]))))
                except (TypeError, ValueError):
                    raise cu.CuError("CU_BAD_ARG", "%s 必须是数字" % key)
        with self.control_lock:
            if self.control.emergency:
                raise cu.CuError("CU_EMERGENCY_STOP",
                                 "用户按了急停；先请用户再按一次 Ctrl+Alt+Shift+Backspace 解除")
            L = self.control.lease
            if L:
                if L["owner"] == owner:
                    return dict(self._lease_view(L), activated=True, reused=True)
                raise cu.CuError("CU_BUSY", "正在使用：%s" % L["owner"])
            if self.pending:
                raise cu.CuError("CU_BUSY", "正在等待用户授权：%s" % self.pending["owner"])
            if self.consent_mode == "auto":
                lease = self.control.grant(owner, owner_id)
                self._show_active(owner)
                cu.audit("control", {"owner": owner}, "activated_auto")
                return dict(self._lease_view(lease), activated=True, auto=True)
            ev = threading.Event()
            self.pending = {"owner": owner, "event": ev, "decision": None,
                            "deadline": time.time() + 30}
        t0 = time.time()
        ok = self.overlay.send(
            cmd="banner",
            text="代理「%s」想接管鼠标和键盘" % owner,
            sub=self._session_line(),
            note="同意后它会操作这台电脑；完成后自动交还，空闲 %d 分钟也会收回。"
                 % max(1, int(self.control.idle_ttl // 60)),
            seconds=30, buttons=True, tone="consent")
        if not ok:
            with self.control_lock:
                self.pending = None
            raise cu.CuError("CU_NO_OVERLAY",
                             self.overlay.last_error or "桌面提示层起不来")
        decision = self._wait_pending(31.0)
        waited = round(time.time() - t0, 1)
        with self.control_lock:
            self.pending = None
        self.overlay.send(cmd="hide_banner")
        if decision != "agree":
            cu.audit("control", {"owner": owner}, "activation_denied")
            raise cu.CuError("CU_ACTIVATION_DENIED",
                             "等了 %.1f 秒，用户没有同意；不要立刻重试，先问用户" % waited)
        lease = self.control.grant(owner, owner_id)
        self._show_active(owner)
        cu.audit("control", {"owner": owner, "waited": waited}, "activated")
        log("控制权已授予 %r（用户等待 %.1fs）" % (owner, waited))
        return dict(self._lease_view(lease), activated=True, waited=waited)

    def _deactivate(self, req):
        reason = str(req.get("reason") or "agent 完成")[:160]
        with self.control_lock:
            L = self.control.revoke(reason)
        if not L:
            return {"deactivated": False, "note": "本来就没有激活，无需关闭"}
        with cu.control_bypass():
            cu.release_all(force=True)
        self.overlay.send(cmd="off")
        cu.audit("control", {"owner": L.get("owner"), "reason": reason}, "deactivated")
        log("控制权已交还（%r：%s）" % (L.get("owner"), reason))
        return {"deactivated": True, "owner": L.get("owner"), "reason": reason,
                "note": "已交还用户，用户现在可以正常使用鼠标键盘"}

    def _control(self, req):
        action = (req.get("action") or "status").strip().lower()
        if action == "status":
            running = bool(self.overlay.proc and self.overlay.proc.poll() is None)
            return {"control": self.control.status(),
                    "hotkeys": {"emergency": "Ctrl+Alt+Shift+Backspace",
                                "pause": "Ctrl+Shift+Alt",
                                "agree": "Ctrl+Alt+Shift+Enter",
                                "polling_ok": self.hotkey_ok},
                    "session": self.session,
                    "overlay": {"running": running,
                                "error": self.overlay.last_error},
                    "consent_mode": self.consent_mode}
        # 急停只能由用户的热键触发；下面这几个动作只给自动化测试开一条缝。
        if action == "user_input":
            if os.environ.get("DSH_CU_TEST") != "1":
                raise cu.CuError("CU_BAD_ARG", "只有测试能伪造用户输入")
            self.last_user_input = 0.0
            self._flag_user_input()
            return {"action": action, "control": self.control.status()}
        if action in ("trip", "clear"):
            if os.environ.get("DSH_CU_TEST") != "1":
                raise cu.CuError("CU_BAD_ARG", "急停只能由用户热键触发")
            if action == "trip":
                self._on_emergency_key()
            else:
                self.control.clear_emergency()
                self._show_idle()
            return {"action": action, "control": self.control.status()}
        # 暂停 / 点鲸鱼 / 留言：真机上分别是热键和鼠标事件，测试里由这里触发同一条路径。
        if action == "pause":
            if os.environ.get("DSH_CU_TEST") != "1":
                raise cu.CuError("CU_BAD_ARG", "暂停只能由用户的 Ctrl+Shift+Alt 触发")
            return {"action": action, "toggled": self._pause_toggle("test"),
                    "control": self.control.status()}
        if action == "logo_click":
            if os.environ.get("DSH_CU_TEST") != "1":
                raise cu.CuError("CU_BAD_ARG", "只有测试能伪造点击")
            self._on_logo_click()
            return {"action": action, "control": self.control.status()}
        if action == "message":
            if os.environ.get("DSH_CU_TEST") != "1":
                raise cu.CuError("CU_BAD_ARG", "只有测试能伪造留言")
            self._on_user_message(str(req.get("text") or ""))
            return {"action": action, "control": self.control.status()}
        raise cu.CuError("CU_BAD_ARG", "action 只支持 status / user_input / trip / clear / "
                                       "pause / logo_click / message")

    # ---- 热键：Ctrl+Alt+Shift+Backspace 急停 / Ctrl+Alt+Shift+Enter 同意 / Ctrl+Shift+Alt 暂停 ----
    @staticmethod
    def _down(vk):
        return bool(ctypes.windll.user32.GetAsyncKeyState(vk) & 0x8000)

    # 暂停键是"只有三个修饰键"，没有任何实体键；这份名单用来确认"真的没按别的"
    _PAUSE_GUARD = (tuple(range(0x20, 0x2F)) + tuple(range(0x30, 0x5B)) +
                    (0x5B, 0x5C, 0x5D) + tuple(range(0x60, 0x88)))

    def _hotkey_loop(self):
        # 不用 RegisterHotKey：它会和别的程序抢注册，而且被吞掉的键用户再也用不了。
        # 轮询 GetAsyncKeyState 不注册、不吞键，30ms 足够抓住人的按键。
        keys_em = (0x11, 0x12, 0x10, 0x08)      # Ctrl Alt Shift Backspace
        keys_ag = (0x11, 0x12, 0x10, 0x0D)      # Ctrl Alt Shift Enter
        self.hotkey_ok = True
        pause_since = 0.0
        pause_fired = False
        while not self.stopping:
            try:
                em = all(self._down(k) for k in keys_em)
                ag = all(self._down(k) for k in keys_ag)
                if em and not self._hotkey_prev["emergency"]:
                    self._on_emergency_key()
                if ag and not self._hotkey_prev["agree"]:
                    if self.pending:
                        self._resolve_pending("agree")
                self._hotkey_prev["emergency"] = em
                self._hotkey_prev["agree"] = ag

                # 暂停：只按住 Ctrl+Shift+Alt 三个修饰键，400ms 触发一次
                mods = self._down(0x11) and self._down(0x12) and self._down(0x10)
                other = any(self._down(k) for k in self._PAUSE_GUARD)
                if mods and not other and not em and not ag:
                    now = time.time()
                    if not pause_since:
                        pause_since = now
                    elif not pause_fired and now - pause_since >= 0.4:
                        pause_fired = True
                        self._pause_toggle("hotkey")
                else:
                    pause_since = 0.0
                    pause_fired = False
            except Exception:                                # noqa: BLE001
                self.hotkey_ok = False
            time.sleep(0.03)

    # ---- 真人输入检测：低级钩子能区分"人按的"和"我们注进去的"（INJECTED 标志）----
    # 目的不是拦截，是让 agent 知道"用户正在帮你"，别傻等也别抢回去。
    def _flag_user_input(self):
        now = time.time()
        if now - self.last_user_input < 3.0:     # 节流：一次操作只提示一次
            return
        self.last_user_input = now
        self._user_input_evt.set()

    def _notice_loop(self):
        while not self.stopping:
            if not self._user_input_evt.wait(0.5):
                continue
            self._user_input_evt.clear()
            try:
                if self.control.emergency:
                    continue                      # 急停自己会说话，不重复
                self.control.note_user_input(1.5)
                with cu.control_bypass():
                    cu.release_all(force=True)    # 松开我们按住的键，别和人抢
                cu.audit("control", {"owner": (self.control.lease or {}).get("owner")},
                         "user_input")
                self.notices.append(
                    "检测到用户正在操作（很可能是在帮你，例如点弹窗、扫码登录）。"
                    "已暂停注入 1.5 秒并松开按键。请观察屏幕，等用户停手后继续，"
                    "不要重复点击或抢回控制。")
                del self.notices[:-3]
            except Exception:                     # noqa: BLE001
                pass

    def _input_hook_loop(self):
        from ctypes import wintypes
        try:
            user32 = ctypes.WinDLL("user32", use_last_error=True)
            kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
            HOOKPROC = ctypes.WINFUNCTYPE(ctypes.c_ssize_t, ctypes.c_int,
                                          ctypes.c_ssize_t, ctypes.c_void_p)

            class KBDLLHOOKSTRUCT(ctypes.Structure):
                _fields_ = [("vkCode", ctypes.c_uint32), ("scanCode", ctypes.c_uint32),
                            ("flags", ctypes.c_uint32), ("time", ctypes.c_uint32),
                            ("dwExtraInfo", ctypes.c_size_t)]

            class MSLLHOOKSTRUCT(ctypes.Structure):
                _fields_ = [("pt", wintypes.POINT), ("mouseData", ctypes.c_uint32),
                            ("flags", ctypes.c_uint32), ("time", ctypes.c_uint32),
                            ("dwExtraInfo", ctypes.c_size_t)]

            def kb_proc(nCode, wParam, lParam):
                if nCode == 0:
                    try:
                        info = ctypes.cast(lParam, ctypes.POINTER(KBDLLHOOKSTRUCT)).contents
                        if not (info.flags & 0x10):        # LLKHF_INJECTED
                            self._flag_user_input()
                    except Exception:                      # noqa: BLE001
                        pass
                return user32.CallNextHookEx(None, nCode, wParam, lParam)

            def ms_proc(nCode, wParam, lParam):
                if nCode == 0:
                    try:
                        info = ctypes.cast(lParam, ctypes.POINTER(MSLLHOOKSTRUCT)).contents
                        if not (info.flags & 0x01):        # LLMHF_INJECTED
                            self._flag_user_input()
                    except Exception:                      # noqa: BLE001
                        pass
                return user32.CallNextHookEx(None, nCode, wParam, lParam)

            self._kb_proc = HOOKPROC(kb_proc)
            self._ms_proc = HOOKPROC(ms_proc)
            hmod = kernel32.GetModuleHandleW(None)
            hk = user32.SetWindowsHookExW(13, self._kb_proc, hmod, 0)     # WH_KEYBOARD_LL
            hm = user32.SetWindowsHookExW(14, self._ms_proc, hmod, 0)     # WH_MOUSE_LL
            self.input_hook_ok = bool(hk and hm)
            if not self.input_hook_ok:
                log("真人输入钩子装不上（err=%d）：这项提示停用" % ctypes.get_last_error())
                return
            msg = wintypes.MSG()
            while not self.stopping:
                if user32.GetMessageW(ctypes.byref(msg), 0, 0, 0) <= 0:
                    break
                user32.TranslateMessage(ctypes.byref(msg))
                user32.DispatchMessageW(ctypes.byref(msg))
        except Exception as e:                            # noqa: BLE001
            log("真人输入检测起不来：%s" % e)

    def _on_emergency_key(self):
        with self.control_lock:
            # 正在征求同意时按它 = 拒绝；此时还没有控制权，不必进入急停状态。
            if self.pending:
                self._resolve_pending("deny")
                return
            if self.control.emergency:
                # 解除 = 彻底静默：不弹任何东西、不闪、不留尾巴。
                self.control.clear_emergency()
                self.control.set_paused(False)
                cu.audit("control", {}, "emergency_cleared")
                self.overlay.send(cmd="off")
                log("急停已解除（重新 activate 才会再次接管）")
                return
            self.control.set_paused(False)
            lease = self.control.trip_emergency()
        with cu.control_bypass():
            cu.release_all(force=True)
        cu.audit("control", {"owner": (lease or {}).get("owner")}, "emergency")
        self.overlay.send(cmd="halo", on=False)
        self.overlay.send(cmd="logo", on=False)
        self.overlay.send(cmd="border", on=True, color="#FF3B30", alpha=0.55)
        self.overlay.send(cmd="flash", color="#FF3B30", times=2)
        self.overlay.send(cmd="banner",
                          text="已急停：所有电脑控制被阻断",
                          sub="再按一次 Ctrl+Alt+Shift+Backspace 解除",
                          note="解除后 agent 仍需重新征求你的同意",
                          seconds=4, buttons=False, tone="emergency")
        self._later(4.2, self._show_idle)     # 到点全部撤掉，屏幕恢复干净
        log("急停触发：租约=%r" % (lease or {}).get("owner"))

    def _control_ticker(self):
        """空闲/超时自动收权。1 秒一次，成本可以忽略。"""
        while not self.stopping:
            try:
                with self.control_lock:
                    L = self.control.lease
                    expired = None
                    if L and not self.control.emergency:
                        now = time.time()
                        if now > L["max_deadline"]:
                            expired = "单次激活达到 %d 秒上限" % int(self.control.max_ttl)
                        elif not self.control.paused and now - L["last"] > self.control.idle_ttl:
                            # 暂停时用户正在和 agent 对话，不能因为"没调用工具"就把控制权收走
                            expired = "空闲超过 %d 秒" % int(self.control.idle_ttl)
                        if expired:
                            self.control.revoke("expired")
                    if expired:
                        with cu.control_bypass():
                            cu.release_all(force=True)
                        cu.audit("control", {"reason": expired}, "expired")
                        self._show_idle()
                        log("控制权自动收回：%s" % expired)
            except Exception:                                # noqa: BLE001
                log("收权线程异常：%s" % traceback.format_exc())
            time.sleep(1.0)

    # ---- 凝视：起独立进程，立刻返回 ----
    def _prune_watchers(self):
        self.watchers = [p for p in self.watchers if p.poll() is None]

    def _kill_watchers(self):
        for p in self.watchers:
            try:
                if p.poll() is None:
                    p.terminate()
            except OSError:
                pass
        self.watchers = []

    def _close_listener(self):
        """把阻塞在 accept 上的主循环叫醒。stopping=True 本身唤不醒系统调用。"""
        listener, self.listener = self.listener, None
        if self.config.kind == "named_pipe":
            # Windows 上关闭一个正阻塞在 ConnectNamedPipe 的句柄不会让它返回；
            # 主动连一下这个端点，ConnectNamedPipe 就会成功返回，主循环随即
            # 看到 stopping 并退出（关闭句柄那条路实测无效）。
            def _poke():
                try:
                    import win32file
                    h = win32file.CreateFile(
                        self.config.endpoint,
                        win32file.GENERIC_READ | win32file.GENERIC_WRITE,
                        0, None, win32file.OPEN_EXISTING, 0, None)
                    win32file.CloseHandle(h)
                except Exception:                            # noqa: BLE001
                    pass
            threading.Thread(target=_poke, daemon=True).start()
            return
        if listener is None:
            return
        try:
            listener.close()
        except Exception:                                     # noqa: BLE001
            log("关闭监听句柄失败：%s" % traceback.format_exc())

    def _watch_spawn(self, req):
        argv = req.get("argv")
        line = req.get("line")
        if isinstance(argv, list) and argv:
            cmd_argv = [str(x) for x in argv]
        elif isinstance(line, str) and line.strip():
            import shlex
            cmd_argv = shlex.split(line)
        else:
            raise cu.CuError("CU_BAD_ARG", "凝视需要 argv 数组或 line 字符串")
        # 先本地解析一遍：参数不合法就当场报，别起一个立刻报错的进程让调用方去找日志
        cu.build_parser().parse_args(cmd_argv)
        flags = 0
        if os.name == "nt":
            flags = 0x08000000        # CREATE_NO_WINDOW：不弹黑框
        try:
            proc = subprocess.Popen(
                [sys.executable, CU_PY] + cmd_argv,
                cwd=HERE, stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                creationflags=flags,
            )
        except OSError as e:
            raise cu.CuError("CU_OS", "起凝视进程失败：%s" % e)
        self._prune_watchers()
        self.watchers.append(proc)
        q = "default"
        if "--queue" in cmd_argv:
            i = cmd_argv.index("--queue")
            if i + 1 < len(cmd_argv):
                q = cmd_argv[i + 1]
        return {"spawned": True, "pid": proc.pid, "queue": q, "argv": cmd_argv,
                "lines": [
                    "凝视已在后台启动：pid=%d 队列=%r（它自己按 --timeout 到点退出）"
                    % (proc.pid, q),
                    "取帧用 watch_recv（队列空就等 wait 秒）；看积压用 watch_status。",
                    "**不要**再连续截图代替等待——凝视期间你这边零 token。",
                ]}

    @staticmethod
    def _is_watch(req):
        argv = req.get("argv")
        if isinstance(argv, list) and argv:
            return str(argv[0]) in WATCH_CMDS
        line = req.get("line")
        if isinstance(line, str):
            import shlex
            try:
                parts = shlex.split(line)
            except ValueError:
                return False
            return bool(parts) and parts[0] in WATCH_CMDS
        return False

    # ---- 各 op ----
    def handle(self, conn, req):
        op = (req or {}).get("op")
        rid = (req or {}).get("id")
        t0 = time.time()
        try:
            if op == "ping":
                send_json(conn, self._wrap(rid, self._ping(), t0))
            elif op == "cmd":
                if self._is_watch(req):
                    send_json(conn, self._wrap(rid, self._watch_spawn(req), t0))
                else:
                    send_json(conn, self._wrap(rid, self._cmd(req), t0))
            elif op == "batch":
                send_json(conn, self._wrap(rid, self._batch(req), t0))
            elif op == "eval":
                send_json(conn, self._wrap(rid, self._eval(req), t0))
            elif op == "shot":
                out = self._shot(req)
                send_json(conn, self._wrap(rid, out["meta"], t0),
                          binary_payload=out["png"])
            elif op == "state":
                send_json(conn, self._wrap(rid, self._state(), t0))
            elif op == "activate":
                send_json(conn, self._wrap(rid, self._activate(req), t0))
            elif op == "deactivate":
                send_json(conn, self._wrap(rid, self._deactivate(req), t0))
            elif op == "control":
                send_json(conn, self._wrap(rid, self._control(req), t0))
            elif op == "audit":
                n = int(req.get("n") or 20)
                send_json(conn, self._wrap(rid, {"records": cu.audit_tail(n)}, t0))
            elif op == "shutdown":
                send_json(conn, self._wrap(rid, {"bye": True}, t0))
                self.stopping = True
                self._kill_watchers()     # 自己起的凝视进程不能留成孤儿
                self.overlay.stop()       # 提示层跟着走，别在用户屏幕上留一块琥珀边
                # 主 accept 循环正阻塞在 ConnectNamedPipe/accept 上，不会因为
                # stopping 被唤醒；叫醒它，进程才能走正常 atexit（释放按住的
                # 修饰键、结束 UIA 子进程），也才能赶在宿主 5s 关机预算内退出。
                self._close_listener()
            else:
                send_json(conn, self._wrap(rid, None, t0, error=(
                    "CU_PROTOCOL", "不认识的 op=%r" % op)))
        except cu.CuError as e:
            self.last_error = str(e)
            send_json(conn, self._wrap(rid, None, t0, error=(e.code, str(e))))
        except SystemExit as e:
            # 万一还有没被 _parse_* 拦住的 SystemExit（比如某个子命令自己 sys.exit），
            # 也必须变成一条响应，而不是把会话掐断。
            self.last_error = "SystemExit(%s)" % getattr(e, "code", None)
            send_json(conn, self._wrap(rid, None, t0, error=(
                "CU_BAD_ARG", "参数不合法（退出码 %s）" % getattr(e, "code", None))))
        except Exception as e:                                   # noqa: BLE001
            self.last_error = "%s: %s" % (type(e).__name__, e)
            log("handler 异常：%s" % traceback.format_exc())
            send_json(conn, self._wrap(rid, None, t0, error=(
                "CU_UNEXPECTED", "%s: %s" % (type(e).__name__, e))))

    def _wrap(self, rid, value, t0, error=None):
        """组装响应并**严格自检信封**：缺 ok / 类型未知 / 失败却没带 error 对象，
        一律 CU_PROTOCOL。宁可报协议错，也不把半成品当结果发给模型。"""
        self.requests += 1
        out = {"id": rid, "ok": error is None, "ms": int((time.time() - t0) * 1000)}
        if error:
            out["code"], out["message"] = error
            out["error"] = {"code": error[0], "message": error[1]}
        else:
            out["value"] = value
        # 这里**不做**信封自检：这个字典是我们自己刚拼的，检查它永远通过，
        # 只是"看起来校验过"的假防御。真正该校验的是**消费方**——Node 客户端
        # 会校验响应里的 id 与 ok 字段（见 lib/pipe-client.mjs 的 request()）。
        # 二进制（图片）不进 JSON：只留一个标记，真实字节走紧随其后的二进制帧
        if isinstance(value, dict) and "image" in value:
            out["value"] = {k: v for k, v in value.items() if k != "image"}
            out["hasImage"] = True
        # 用户刚插过手/留过言：把提示挂在这次结果上，agent 下一次调用就能看到。
        # 失败结果也要带——"用户留言了"这种提示，恰恰是因为 agent 撞了 CU_PAUSED
        # 才会去看，只挂在成功结果上等于永远发不出去。
        if self.notices:
            out["notice"] = self.notices.pop(0)
        return out

    def _ping(self):
        vx, vy, vw, vh = cu.screen()
        return {"protocol": PROTOCOL_VERSION, "version": SERVER_VERSION,
                "pid": os.getpid(), "uptime": round(time.time() - self.started, 1),
                "transport": self.config.kind, "endpoint": self.config.endpoint,
                "screen": {"x": vx, "y": vy, "width": vw, "height": vh},
                "queues": _queue_names(), "mute_until": cu._muted_until(),
                "modified_keys": sorted(cu._PRESSED_MODS | cu._HELD),
                "control": self.control.status(),
                "requests": self.requests, "last_error": self.last_error}

    # ---- 解析：把 argparse 的 SystemExit+stderr 统一变成 CuError ----
    # argparse 在参数不合法时会 `sys.exit(2)` 并把用法打到 stderr。SystemExit 是
    # BaseException，`except Exception` 抓不到——它会一路穿出会话循环、把连接掐断，
    # 客户端只看到"管道已结束"，根本不知道是自己参数写错了。必须在边界上拦住。
    @staticmethod
    def _parse_argv(argv):
        import contextlib
        import io as _io
        buf = _io.StringIO()
        try:
            with contextlib.redirect_stderr(buf):
                return cu._parser().parse_args([str(x) for x in argv])
        except SystemExit:
            raise cu.CuError("CU_BAD_ARG", Server._usage_error(argv, buf))

    @staticmethod
    def _parse_line(line):
        import contextlib
        import io as _io
        buf = _io.StringIO()
        try:
            with contextlib.redirect_stderr(buf):
                return cu.make_parser_for(line)
        except SystemExit:
            raise cu.CuError("CU_BAD_ARG", Server._usage_error(line, buf))

    @staticmethod
    def _usage_error(src, buf):
        text = " ".join((buf.getvalue() or "").split())
        if len(text) > 300:
            text = text[:300] + "…"
        return "参数不合法：%s（输入：%s）" % (text or "见各子命令 --help", src)

    def _cmd(self, req):
        argv = req.get("argv")
        line = req.get("line")
        if argv is None and line is not None:
            a = self._parse_line(line)
        elif isinstance(argv, list) and argv:
            a = self._parse_argv(argv)
        else:
            raise cu.CuError("CU_BAD_ARG", "cmd 需要 argv 数组或 line 字符串")
        lines = cu.execute_namespace(a)
        return {"argv": argv or line, "cmd": a.cmd, "lines": lines}

    def _batch(self, req):
        cmds = req.get("cmds") or req.get("commands") or []
        if not isinstance(cmds, list):
            raise cu.CuError("CU_BAD_ARG", "batch 需要 cmds 数组")
        cont = bool(req.get("continueOnError") or req.get("continue_on_error"))
        results = []
        stopped = False
        t0 = time.time()
        for c in cmds:
            line = str(c).strip()
            if not line or line.startswith("#"):
                # 跳过行单独计数：以前它算进 ok_count，于是"3/3 成功"里有一条
                # 根本没执行——模型会据此判断"三步都过了"。
                results.append({"cmd": line, "ok": True, "skipped": True, "lines": []})
                continue
            try:
                a = self._parse_line(line)
                lines = cu.execute_namespace(a)
                results.append({"cmd": line, "ok": True, "lines": lines})
            except cu.CuError as e:
                results.append({"cmd": line, "ok": False, "code": e.code,
                                "message": str(e)})
                if not cont:
                    stopped = True
                    break
            except Exception as e:                               # noqa: BLE001
                results.append({"cmd": line, "ok": False, "code": "CU_UNEXPECTED",
                                "message": "%s: %s" % (type(e).__name__, e)})
                if not cont:
                    stopped = True
                    break
        return {"results": results, "stopped_early": stopped,
                "ok_count": sum(1 for r in results if r.get("ok") and not r.get("skipped")),
                "skipped_count": sum(1 for r in results if r.get("skipped")),
                "ms": int((time.time() - t0) * 1000)}

    def _eval(self, req):
        code = req.get("code")
        if not isinstance(code, str) or not code.strip():
            raise cu.CuError("CU_BAD_ARG", "eval 需要 code 字符串")
        timeout = float(req.get("timeoutMs") or 20000) / 1000.0
        timeout = max(1.0, min(300.0, timeout))
        import ast
        import contextlib
        import io as _io

        ns = {"cu": cu, "os": os, "sys": sys, "time": time, "json": json,
              "re": __import__("re"), "subprocess": __import__("subprocess"),
              "pathlib": __import__("pathlib"), "math": __import__("math")}
        out, err = _io.StringIO(), _io.StringIO()
        box = {}

        def _run():
            try:
                tree = ast.parse(code, "<eval>", "exec")
                last = None
                if tree.body and isinstance(tree.body[-1], ast.Expr):
                    last = ast.Expression(tree.body.pop().value)
                with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                    exec(compile(tree, "<eval>", "exec"), ns)     # noqa: S102
                    if last is not None:
                        r = eval(compile(last, "<eval>", "eval"), ns)   # noqa: S307
                        if r is not None:
                            print(repr(r))
                box["ok"] = True
            except BaseException as e:                           # noqa: BLE001
                box["ok"] = False
                box["code"] = getattr(e, "code", None) or "CU_EVAL"
                box["message"] = str(e)
                box["traceback"] = traceback.format_exc()[-2000:]

        th = threading.Thread(target=_run, name="cu-eval", daemon=True)
        th.start()
        th.join(timeout)
        if th.is_alive():
            # 线程杀不掉：如实说明，并给出口（server_restart）。
            return {"timed_out": True, "stdout": out.getvalue(), "stderr": err.getvalue(),
                    "note": "eval 超过 %gs 未返回；线程无法强杀，可用 server_restart 回收"
                            % timeout}
        res = {"stdout": out.getvalue(), "stderr": err.getvalue()}
        if box.get("ok"):
            res["ok"] = True
        else:
            res["ok"] = False
            res["error"] = {"code": box.get("code"), "message": box.get("message"),
                            "traceback": box.get("traceback")}
        return res

    def _shot(self, req):
        """截图：直接回原始 PNG 帧，**不落盘**。
        后端阶梯（PrintWindow → GDI 屏幕裁剪）统一在 cu.capture_shot 里。"""
        class _A:
            pass
        a = _A()
        a.window = req.get("window")
        a.region = req.get("region")
        a.long = req.get("long")
        a.full = bool(req.get("full"))
        png, meta = cu.capture_shot(a)
        vx, vy, vw, vh = cu.screen()
        meta["screen"] = {"x": vx, "y": vy, "width": vw, "height": vh}
        if meta.get("region"):
            x0, y0 = cu.to_norm(meta["region"][0], meta["region"][1])
            x1, y1 = cu.to_norm(meta["region"][2], meta["region"][3])
            meta["region_normalized"] = [round(x0, 1), round(y0, 1),
                                         round(x1, 1), round(y1, 1)]
        return {"meta": meta, "png": png}

    def _state(self):
        self._prune_watchers()
        return {"queues": _queue_names(), "mute_until": cu._muted_until(),
                "now": time.time(),
                "modified_keys": sorted(cu._PRESSED_MODS | cu._HELD),
                "control": self.control.status(),
                "uptime": round(time.time() - self.started, 1),
                "requests": self.requests, "last_error": self.last_error,
                "watchers": [p.pid for p in self.watchers]}


def _queue_names():
    root = os.path.join(cu.SHOT_DIR, "watchq")
    try:
        return sorted(d for d in os.listdir(root)
                      if os.path.isdir(os.path.join(root, d)))
    except OSError:
        return []


# ---------------------------------------------------------------- 服务端主循环
def _lock_path(config=None):
    """单实例锁的路径**按端点派生**。

    早期版本用固定文件名 `dsh-computer-use.lock`，结果一个进程在测试用的
    \\\\.\\pipe\\dsh-cu-test-xxx 上占着锁，另一个本该独立的实例就被判成"已有实例"。
    锁的语义是"同一个端点只能有一个服务"，所以键就该是端点本身。
    """
    import hashlib
    key = (config.endpoint if config is not None else
           (os.environ.get("DSH_CU_ENDPOINT") or PIPE_NAME))
    if config is not None and config.kind == "tcp":
        key = "tcp:127.0.0.1:%d" % config.port
    tag = hashlib.sha1(str(key).encode("utf-8")).hexdigest()[:12]
    return os.path.join(os.environ.get("TEMP", cu.tempfile.gettempdir()),
                        "dsh-computer-use-%s.lock" % tag)


def acquire_single_instance(config=None):
    """锁文件（第二道防线，**不是主判据**）。

    踩过的坑：Windows 上 `msvcrt.locking` 在 "a+b" 模式的文件上并不可靠——
    实测两个进程都能"锁成功"，然后第二个进程在 `truncate/flush` 时才炸
    PermissionError，最后以一个谁也看不懂的 traceback 退出。
    所以主判据改成"端点探测"：连得上、ping 得通就说明已经有人在服务这个端点。
    这里的锁只用来兜住"探测与 bind 之间的竞态"，而且**任何 OSError 都当成
    '别人占着'**，绝不让它把进程炸掉。
    """
    try:
        path = _lock_path(config)
        f = open(path, "a+b")
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            f.seek(0)
            f.truncate()
            f.write(str(os.getpid()).encode())
            f.flush()
            return f
        except OSError:
            try:
                f.close()
            except OSError:
                pass
            return None
    except OSError:
        # 锁文件本身建不出来（权限/磁盘）不该挡住服务——探测已经在前面把关了。
        return True


def probe_running(config, timeout=0.6):
    """端点是否已经有活着的服务。用短超时，别让启动等 5 秒。"""
    try:
        old = config.connect_timeout
        config.connect_timeout = timeout
        try:
            return ping(config)
        finally:
            config.connect_timeout = old
    except Exception:                                         # noqa: BLE001
        return None


def serve(config, single=True):
    if single:
        alive = probe_running(config)
        if alive:
            log("端点 %s 已有服务在跑（pid=%s），本进程退出"
                % (config.endpoint, alive.get("pid")))
            print(json.dumps({"ok": False, "code": "CU_IPC",
                              "message": "该端点已有服务在跑（pid=%s）" % alive.get("pid")},
                             ensure_ascii=False))
            return 3
    if config.kind == "named_pipe":
        if not _HAVE_PYWIN32:
            raise SystemExit("GUI 操作不可用：缺少 pywin32，命名管道起不来。装它："
                             "%s -m pip install --user pywin32" % sys.executable)
        return _serve_pipe(config, single)
    if config.kind == "uds":
        try:
            os.unlink(config.endpoint)
        except OSError:
            pass
        srv = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        srv.bind(config.endpoint)
        srv.listen(4)
        return _serve_sock(config, srv, single)
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        srv.bind(("127.0.0.1", config.port))
    except OSError as e:
        log("绑定端口 %d 失败：%s" % (config.port, e))
        print(json.dumps({"ok": False, "code": "CU_IPC",
                          "message": "端口 %d 已被占用：%s" % (config.port, e)},
                         ensure_ascii=False))
        return 3
    srv.listen(4)
    return _serve_sock(config, srv, single)


def _session(server, conn):
    """一条连接上的请求循环。

    **不重发**：读/写任何一步失败，本次请求直接结束，不在同一条连接上重试；
    连接就此作废，由客户端在**下一个**请求前重连。
    """
    try:
        while not server.stopping:
            try:
                req = recv_json(conn)
            except (EOFError, OSError, ValueError):
                return
            # 锁只包住"处理"，不包住整条连接——否则一个长连接会把
            # 第二个 DSH 实例的 ping 永远挡在门外。
            with server.lock:
                server.handle(conn, req)
    finally:
        conn.close()


def _serve_sock(config, srv, single):
    lock = acquire_single_instance(config) if single else True
    if lock is None:
        log("已有实例在跑，退出")
        print(json.dumps({"ok": False, "code": "CU_IPC",
                          "message": "已有实例在跑（单实例锁被占）"}, ensure_ascii=False))
        return 3
    # 重启 = 重置：静默窗是"刚刚我自己的注入引起的重绘先别当变化"这种**短期**状态，
    # 它持久化在文件里，是为了让 CLI 路径与服务共享同一份。但服务重启之后还留着它，
    # 就变成"没人知道为什么，反正变化被吞了"——误吞真变化的代价远大于多看一帧。
    # CLI 每次注入会自己续租，该有的保护不会丢。
    cu._unmute()
    log("服务启动 transport=%s endpoint=%s" % (config.kind, config.endpoint))
    server = Server(config)
    server.listener = srv
    try:
        while not server.stopping:
            try:
                conn, _ = srv.accept()
            except OSError:
                break
            conn.settimeout(None)
            threading.Thread(target=_session, args=(server, SockConn(conn)),
                             daemon=True).start()
    finally:
        server.listener = None
        srv.close()
        if config.kind == "uds":
            try:
                os.unlink(config.endpoint)
            except OSError:
                pass
    log("服务退出")
    return 0


def _serve_pipe(config, single):
    lock = acquire_single_instance(config) if single else True
    if lock is None:
        log("已有实例在跑，退出")
        print(json.dumps({"ok": False, "code": "CU_IPC",
                          "message": "已有实例在跑（单实例锁被占）"}, ensure_ascii=False))
        return 3
    # 重启 = 重置（理由同 _serve_sock 里那段：旧的静默窗会无声吞掉真变化）
    cu._unmute()
    log("服务启动 transport=named_pipe endpoint=%s" % config.endpoint)
    server = Server(config)
    # 每个连接一个线程、并**立刻**再建一个管道实例：
    # 只留一个实例的话，第一条长连接会把第二个客户端的 ConnectNamedPipe 堵死。
    while not server.stopping:
        h = win32pipe.CreateNamedPipe(
            config.endpoint,
            win32pipe.PIPE_ACCESS_DUPLEX,
            win32pipe.PIPE_TYPE_BYTE | win32pipe.PIPE_READMODE_BYTE | win32pipe.PIPE_WAIT,
            win32pipe.PIPE_UNLIMITED_INSTANCES, 65536, 65536, 0, None)
        server.listener = h
        try:
            win32pipe.ConnectNamedPipe(h, None)
        except Exception as e:                                # noqa: BLE001
            log("ConnectNamedPipe 失败：%s" % e)
            server.listener = None
            try:
                win32file.CloseHandle(h)
            except Exception:
                pass
            continue
        threading.Thread(target=_session, args=(server, PipeConn(h)),
                         daemon=True).start()
    server.listener = None
    log("服务退出")
    return 0


# ---------------------------------------------------------------- 客户端（测试 / --rpc / 降级用）
class Client:
    def __init__(self, config=None):
        self.config = config or TransportConfig.from_env()
        self.conn = None
        self.seq = 0
        self._unrecoverable = False
        self.lock = threading.Lock()

    def connect(self):
        with self.lock:
            if self.conn is not None:
                return
            self.conn = connect(self.config)

    def close(self):
        with self.lock:
            if self.conn is not None:
                self.conn.close()
                self.conn = None

    def request(self, op, binary=False, timeout=None, **payload):
        with self.lock:
            if self._unrecoverable:
                raise cu.CuError("CU_IPC", "上一次不可恢复的失败之后，本客户端已作废；请新建一个")
            if self.conn is None:
                self.conn = connect(self.config)
            self.seq += 1
            payload["id"] = self.seq
            payload["op"] = op
            try:
                send_json(self.conn, payload)
                resp = recv_json(self.conn)
                png = None
                if binary or payload.get("wantBinary"):
                    kind, data = read_frame(self.conn)
                    if kind == KIND_BINARY:
                        png = data
                return resp, png
            except (EOFError, OSError, ValueError) as e:
                # 写/读失败后**不重发**：对端可能已经执行了。只标记不可恢复并断开。
                self._unrecoverable = True
                try:
                    self.conn.close()
                except Exception:
                    pass
                self.conn = None
                raise cu.CuError("CU_IPC", "与常驻服务通信失败（%s）；本次请求不会重发" % e)


def ping(config=None):
    """探测是否已有服务在跑。返回 ping 字典或 None。"""
    try:
        c = Client(config)
        resp, _ = c.request("ping")
        c.close()
        if resp.get("ok"):
            return resp.get("value") or {}
        return None
    except Exception:                                         # noqa: BLE001
        return None


# ---------------------------------------------------------------- --rpc 降级模式
def rpc_loop():
    """行协议降级模式：一行一个 JSON 请求（stdin），一行一个 JSON 响应（stdout）。
    图片走 base64。给"管道建不起来"的极端情况留一条活路——慢，但能用。"""
    import base64
    server = Server(TransportConfig.from_env())
    out = sys.stdout.buffer

    class _MemoryConn:
        def __init__(self):
            self.frames = []

        def write_all(self, data):
            self.frames.append(data)

    while True:
        raw = sys.stdin.buffer.readline()
        if not raw:
            break
        try:
            req = json.loads(raw.decode("utf-8", "replace"))
        except ValueError:
            out.write(json.dumps({"ok": False, "code": "CU_PROTOCOL",
                                  "message": "请求不是合法 JSON"},
                                 ensure_ascii=False).encode("utf-8") + b"\n")
            out.flush()
            continue
        conn = _MemoryConn()
        try:
            server.handle(conn, req)
        except Exception as e:                                # noqa: BLE001
            log("rpc 异常：%s" % e)
        for frame in conn.frames:
            out.write(base64.b64encode(frame) + b"\n")
        out.flush()
        if server.stopping:
            break
    return 0


# ---------------------------------------------------------------- 入口
def main(argv=None):
    args = list(sys.argv[1:] if argv is None else argv)
    if "--rpc" in args:
        return rpc_loop()
    config = TransportConfig.from_env()
    if "--print-config" in args:
        print(json.dumps({"kind": config.kind, "endpoint": config.endpoint,
                          "port": config.port, "fallback": config.fallback_kind,
                          "fallback_port": config.fallback_port}, ensure_ascii=False))
        return 0
    if "--ping" in args:
        p = ping(config)
        print(json.dumps(p or {"ok": False, "message": "没有在跑的服务"}, ensure_ascii=False))
        return 0 if p else 1
    single = "--allow-multi" not in args
    try:
        return serve(config, single=single)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    sys.exit(main())
