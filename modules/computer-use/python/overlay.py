#!/usr/bin/env python
"""overlay.py — cu 的「存在感层」独立进程。

协议：stdin 每行一个 JSON 命令，stdout 每行一个 JSON 事件。

命令
  {"cmd":"state","mode":"active|paused|consent|emergency|idle",
   "owner":"lab","session":"4f2a9c","cwd":"dsh-computer-use",
   "text":"...","sub":"...","seconds":30,"buttons":true}
  {"cmd":"banner","text":...,"sub":...,"seconds":N,"buttons":B,"tone":"consent"}
  {"cmd":"hide_banner"}
  {"cmd":"halo","on":true}
  {"cmd":"border","on":true,"color":"#FFB000","alpha":0.5}
  {"cmd":"logo","on":true}
  {"cmd":"dialog","on":true}
  {"cmd":"flash","color":"#FF3B30","times":2}
  {"cmd":"off"}                  全部淡出隐藏（交还/急停后调用）
  {"cmd":"quit"}

事件
  {"event":"ready","screen":[x,y,w,h]}
  {"event":"agree"} / {"event":"deny"}
  {"event":"message","text":"..."}
  {"event":"logo_click"}

实现要点（踩过的坑都在这里）：
  * 渐变的半透明只有 UpdateLayeredWindow 能画（Tk 的 -alpha 只能整窗一个值、边缘是硬的），
    所以边框/光晕/横幅/logo 都是 WS_EX_LAYERED 窗口 + PIL 逐像素 alpha。
  * Tk 的 -transparentcolor / geometry 会被 Tk 自己覆盖，故装饰层不用 Tk；
    只有需要文字输入的对话框用 Tk。
  * UpdateLayeredWindow 要求预乘 alpha，颜色要先乘 alpha/255。
"""
from __future__ import annotations

import ctypes
import json
import math
import os
import sys
import threading
import time
import traceback
from ctypes import wintypes as wt

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------- win32 基元

user32 = ctypes.WinDLL("user32", use_last_error=True)
gdi32 = ctypes.WinDLL("gdi32", use_last_error=True)

WS_POPUP = 0x80000000
WS_EX_LAYERED = 0x00080000
WS_EX_TRANSPARENT = 0x00000020
WS_EX_NOACTIVATE = 0x08000000
WS_EX_TOOLWINDOW = 0x00000080
ULW_ALPHA = 0x00000002
AC_SRC_OVER = 0x00
AC_SRC_ALPHA = 0x01
SWP_NOSIZE = 0x0001
SWP_NOMOVE = 0x0002
SWP_NOACTIVATE = 0x0010
SWP_SHOWWINDOW = 0x0040
HWND_TOPMOST = -1
WM_DESTROY = 0x0002
WM_LBUTTONUP = 0x0202
WM_SETCURSOR = 0x0020
WM_NCHITTEST = 0x0084
HTTRANSPARENT = -1
SPI_GETWORKAREA = 0x0030
SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN = 76, 77
SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN = 78, 79

WNDPROC = ctypes.WINFUNCTYPE(ctypes.c_ssize_t, wt.HWND, wt.UINT, wt.WPARAM, wt.LPARAM)


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ("biSize", wt.DWORD), ("biWidth", ctypes.c_long), ("biHeight", ctypes.c_long),
        ("biPlanes", wt.WORD), ("biBitCount", wt.WORD), ("biCompression", wt.DWORD),
        ("biSizeImage", wt.DWORD), ("biXPelsPerMeter", ctypes.c_long),
        ("biYPelsPerMeter", ctypes.c_long), ("biClrUsed", wt.DWORD), ("biClrImportant", wt.DWORD),
    ]


class BITMAPINFO(ctypes.Structure):
    _fields_ = [("bmiHeader", BITMAPINFOHEADER), ("bmiColors", wt.DWORD * 3)]


class BLENDFUNCTION(ctypes.Structure):
    _fields_ = [("BlendOp", ctypes.c_ubyte), ("BlendFlags", ctypes.c_ubyte),
                ("SourceConstantAlpha", ctypes.c_ubyte), ("AlphaFormat", ctypes.c_ubyte)]


class WNDCLASSW(ctypes.Structure):
    _fields_ = [("style", wt.UINT), ("lpfnWndProc", WNDPROC), ("cbClsExtra", ctypes.c_int),
                ("cbWndExtra", ctypes.c_int), ("hInstance", wt.HINSTANCE), ("hIcon", wt.HICON),
                ("hCursor", wt.HANDLE), ("hbrBackground", wt.HBRUSH), ("lpszMenuName", wt.LPCWSTR),
                ("lpszClassName", wt.LPCWSTR)]


class MSG(ctypes.Structure):
    _fields_ = [("hwnd", wt.HWND), ("message", wt.UINT), ("wParam", wt.WPARAM),
                ("lParam", wt.LPARAM), ("time", wt.DWORD), ("pt", wt.POINT)]


user32.CreateWindowExW.restype = wt.HWND
user32.CreateWindowExW.argtypes = [wt.DWORD, wt.LPCWSTR, wt.LPCWSTR, wt.DWORD, ctypes.c_int,
                                   ctypes.c_int, ctypes.c_int, ctypes.c_int, wt.HWND, wt.HMENU,
                                   wt.HINSTANCE, wt.LPVOID]
user32.DefWindowProcW.restype = ctypes.c_ssize_t
user32.DefWindowProcW.argtypes = [wt.HWND, wt.UINT, wt.WPARAM, wt.LPARAM]
user32.UpdateLayeredWindow.restype = wt.BOOL
user32.UpdateLayeredWindow.argtypes = [wt.HWND, wt.HDC, ctypes.POINTER(wt.POINT),
                                       ctypes.POINTER(wt.SIZE), wt.HDC, ctypes.POINTER(wt.POINT),
                                       wt.DWORD, ctypes.POINTER(BLENDFUNCTION), wt.DWORD]
user32.GetDC.restype = wt.HDC
user32.GetDC.argtypes = [wt.HWND]
user32.ReleaseDC.argtypes = [wt.HWND, wt.HDC]
user32.PeekMessageW.argtypes = [ctypes.POINTER(MSG), wt.HWND, wt.UINT, wt.UINT, wt.UINT]
user32.TranslateMessage.argtypes = [ctypes.POINTER(MSG)]
user32.DispatchMessageW.argtypes = [ctypes.POINTER(MSG)]
user32.SetWindowPos.argtypes = [wt.HWND, wt.HWND, ctypes.c_int, ctypes.c_int, ctypes.c_int,
                                ctypes.c_int, wt.UINT]
gdi32.CreateCompatibleDC.restype = wt.HDC
gdi32.CreateCompatibleDC.argtypes = [wt.HDC]
gdi32.CreateDIBSection.restype = wt.HBITMAP
gdi32.CreateDIBSection.argtypes = [wt.HDC, ctypes.POINTER(BITMAPINFO), wt.UINT,
                                   ctypes.POINTER(ctypes.c_void_p), wt.HANDLE, wt.DWORD]
gdi32.SelectObject.restype = wt.HGDIOBJ
gdi32.SelectObject.argtypes = [wt.HDC, wt.HGDIOBJ]
gdi32.DeleteObject.argtypes = [wt.HGDIOBJ]
gdi32.DeleteDC.argtypes = [wt.HDC]
gdi32.CreateRoundRectRgn.restype = wt.HRGN
gdi32.CreateRoundRectRgn.argtypes = [ctypes.c_int] * 6
user32.SetWindowRgn.argtypes = [wt.HWND, wt.HRGN, wt.BOOL]
user32.GetAncestor.restype = wt.HWND
user32.GetAncestor.argtypes = [wt.HWND, wt.UINT]
user32.GetParent.restype = wt.HWND
user32.GetParent.argtypes = [wt.HWND]


def _screen_rect():
    u = user32
    return (u.GetSystemMetrics(SM_XVIRTUALSCREEN), u.GetSystemMetrics(SM_YVIRTUALSCREEN),
            u.GetSystemMetrics(SM_CXVIRTUALSCREEN), u.GetSystemMetrics(SM_CYVIRTUALSCREEN))


def _work_area():
    r = wt.RECT()
    if user32.SystemParametersInfoW(SPI_GETWORKAREA, 0, ctypes.byref(r), 0):
        return r.left, r.top, r.right - r.left, r.bottom - r.top
    return _screen_rect()


def _cursor():
    p = wt.POINT()
    user32.GetCursorPos(ctypes.byref(p))
    return p.x, p.y


def _dpi_scale():
    try:
        return user32.GetDpiForSystem() / 96.0
    except Exception:
        return 1.0


def _premultiply(img: Image.Image) -> bytes:
    """RGBA -> 预乘 BGRA 字节串（UpdateLayeredWindow 要求）。"""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    out = bytearray(w * h * 4)
    i = 0
    for y in range(h):
        for x in range(w):
            pr, pg, pb, pa = px[x, y]
            out[i] = (pb * pa) // 255
            out[i + 1] = (pg * pa) // 255
            out[i + 2] = (pr * pa) // 255
            out[i + 3] = pa
            i += 4
    return bytes(out)


class LayerWindow:
    """一个 WS_EX_LAYERED 窗口，内容是一张 RGBA 图。"""

    _class_atom = None
    _class_name = "DshCuOverlay"
    _lock = threading.Lock()
    _keepalive = []      # 注册时用到的 WNDCLASSW / WNDPROC 必须一直活着，否则窗口创建即崩溃

    def __init__(self, name, click_through=True, on_click=None):
        self.name = name
        self.on_click = on_click
        self.hwnd = None
        self._memdc = None
        self._bmp = None
        self._bits = None
        self._old = None
        self._size = (0, 0)
        self._pos = (0, 0)
        self._visible = False
        self._proc = WNDPROC(self._wndproc)
        self._ensure_class()
        ex = WS_EX_LAYERED | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW
        if click_through:
            ex |= WS_EX_TRANSPARENT
        self.hwnd = user32.CreateWindowExW(
            ex, self._class_name, name, WS_POPUP, 0, 0, 1, 1, None, None, None, None)
        if not self.hwnd:
            raise OSError("CreateWindowExW failed: %s" % ctypes.get_last_error())
        user32.SetWindowPos(self.hwnd, HWND_TOPMOST, 0, 0, 1, 1,
                            SWP_NOACTIVATE | SWP_SHOWWINDOW)

    @classmethod
    def _ensure_class(cls):
        with cls._lock:
            if cls._class_atom:
                return
            wc = WNDCLASSW()
            wc.style = 0x0002 | 0x0001
            proc = WNDPROC(_global_wndproc)
            wc.lpfnWndProc = proc
            wc.hInstance = None
            wc.lpszClassName = "DshCuOverlay"
            atom = user32.RegisterClassW(ctypes.byref(wc))
            cls._class_atom = atom or True
            cls._class_name = "DshCuOverlay"
            cls._keepalive.append((wc, proc))

    def _wndproc(self, hwnd, msg, wparam, lparam):
        if msg == WM_LBUTTONUP and self.on_click:
            try:
                x = ctypes.c_short(lparam & 0xFFFF).value
                y = ctypes.c_short((lparam >> 16) & 0xFFFF).value
                self.on_click(self, x, y)
            except Exception:
                pass
            return 0
        if msg == WM_SETCURSOR and self.on_click:
            return 1
        return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

    def present(self, img: Image.Image, x: int, y: int):
        # 同一张图 + 同一位置 + 已经显示着：不需要重新上传（每帧重画 52x1600 的渐变太贵）
        if (img is getattr(self, "_last_img", None) and (x, y) == self._pos
                and self._visible):
            return
        self._last_img = img
        w, h = img.size
        if (w, h) != self._size:
            self._size = (w, h)
            self._release_surface()
            screen_dc = user32.GetDC(None)
            self._memdc = gdi32.CreateCompatibleDC(screen_dc)
            bmi = BITMAPINFO()
            bmi.bmiHeader.biSize = ctypes.sizeof(BITMAPINFOHEADER)
            bmi.bmiHeader.biWidth = w
            bmi.bmiHeader.biHeight = -h
            bmi.bmiHeader.biPlanes = 1
            bmi.bmiHeader.biBitCount = 32
            bmi.bmiHeader.biCompression = 0  # BI_RGB
            bits = ctypes.c_void_p()
            self._bmp = gdi32.CreateDIBSection(
                screen_dc, ctypes.byref(bmi), 0, ctypes.byref(bits), None, 0)
            self._bits = bits
            self._old = gdi32.SelectObject(self._memdc, self._bmp)
            user32.ReleaseDC(None, screen_dc)
        data = _premultiply(img)
        ctypes.memmove(self._bits, data, len(data))
        screen_dc = user32.GetDC(None)
        pt_dst = wt.POINT(x, y)
        size = wt.SIZE(w, h)
        pt_src = wt.POINT(0, 0)
        blend = BLENDFUNCTION(AC_SRC_OVER, 0, 255, AC_SRC_ALPHA)
        user32.UpdateLayeredWindow(self.hwnd, screen_dc, ctypes.byref(pt_dst),
                                   ctypes.byref(size), self._memdc, ctypes.byref(pt_src),
                                   0, ctypes.byref(blend), ULW_ALPHA)
        user32.ReleaseDC(None, screen_dc)
        # 这里必须无条件 SetWindowPos(SWP_SHOWWINDOW)：窗口初建是 1x1，hide() 会把它藏起来，
        # 而左/上两条边的坐标正好是 (0,0)（与初始 _pos 相同），只按"位置变了才摆"判断
        # 会让它们永远藏在那儿 —— 表现就是"只有右边和下边有边框"。
        self._pos = (x, y)
        self._visible = True
        user32.SetWindowPos(self.hwnd, HWND_TOPMOST, x, y, 0, 0,
                            SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW)

    def move(self, x: int, y: int):
        if (x, y) == self._pos and self._visible:
            return
        self._pos = (x, y)
        self._visible = True
        user32.SetWindowPos(self.hwnd, HWND_TOPMOST, x, y, 0, 0,
                            SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW)

    def hide(self):
        if not self._visible:
            return
        self._visible = False
        user32.ShowWindow(self.hwnd, 0)

    def _release_surface(self):
        try:
            if self._old:
                gdi32.SelectObject(self._memdc, self._old)
                self._old = None
            if self._bmp:
                gdi32.DeleteObject(self._bmp)
                self._bmp = None
            if self._memdc:
                gdi32.DeleteDC(self._memdc)
                self._memdc = None
            self._bits = None
        except Exception:
            pass


def _global_wndproc(hwnd, msg, wparam, lparam):
    return user32.DefWindowProcW(hwnd, msg, wparam, lparam)


# ---------------------------------------------------------------- 视觉素材

AMBER = (255, 176, 0)
RED = (255, 59, 48)
GREY = (150, 155, 165)
LOGO_BLUE = (77, 107, 254)      # DeepSeek 品牌蓝，鲸鱼用它
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
_cache_font = {}


def _font(px: int, bold: bool = False):
    key = (px, bold)
    if key in _cache_font:
        return _cache_font[key]
    for name in (("msyhbd.ttc" if bold else "msyh.ttc"), "msyh.ttf", "simhei.ttf"):
        path = os.path.join(FONT_DIR, name)
        if os.path.exists(path):
            try:
                idx = 0
                f = ImageFont.truetype(path, px, index=idx)
                _cache_font[key] = f
                return f
            except Exception:
                continue
    f = ImageFont.load_default()
    _cache_font[key] = f
    return f


def _text_w(font, text):
    try:
        return int(font.getlength(text))
    except Exception:
        return font.getbbox(text)[2]


def _wrap(font, text, max_w):
    lines, cur = [], ""
    for ch in text:
        if ch == "\n":
            lines.append(cur)
            cur = ""
            continue
        if _text_w(font, cur + ch) > max_w and cur:
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines or [""]


def halo_image(d: int = 44, color=AMBER, strength: float = 0.55):
    """指针下方那颗半透明实心圆：中心浓、边缘柔和渐隐。"""
    ss = 3
    big = Image.new("RGBA", (d * ss, d * ss), (0, 0, 0, 0))
    px = big.load()
    cx = cy = (d * ss - 1) / 2.0
    r = (d * ss) / 2.0
    core = r * 0.52
    for y in range(d * ss):
        for x in range(d * ss):
            dist = math.hypot(x - cx, y - cy)
            if dist >= r:
                continue
            if dist <= core:
                t = strength
            else:
                k = (dist - core) / max(1e-6, (r - core))
                t = strength * (1.0 - k) ** 2.2
            if t <= 0.004:
                continue
            px[x, y] = (color[0], color[1], color[2], int(255 * t))
    return big.resize((d, d), Image.LANCZOS)


def edge_image(size, color, peak: float, horizontal: bool, from_start: bool):
    """一条向内柔和渐隐的边。

    horizontal=True 表示渐变沿 x 走（左右边），否则沿 y 走（上下边）。
    用一维 alpha 斜坡拉伸实现，避免逐像素 Python 循环（2560x78 也只要毫秒级）。
    """
    w, h = size
    span = w if horizontal else h
    alpha = bytearray(span)
    for i in range(span):
        d = i if from_start else span - 1 - i
        k = d / max(1, span - 1)
        a = peak * (1.0 - k) ** 1.7
        alpha[i] = max(0, min(255, int(255 * a)))
    ramp = Image.frombytes("L", (span, 1) if horizontal else (1, span), bytes(alpha))
    if horizontal:
        alpha_img = ramp.resize((span, h), Image.NEAREST)
    else:
        alpha_img = ramp.resize((w, span), Image.NEAREST)
    img = Image.new("RGBA", (w, h), (color[0], color[1], color[2], 0))
    img.putalpha(alpha_img)
    return img


def _round_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return m


def panel_image(content: Image.Image, radius: int, shadow: int = 18):
    """给内容图加圆角、1px 描边和柔和投影，返回更大的 RGBA 图。"""
    w, h = content.size
    pad = shadow
    body = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    body.paste(content, (0, 0))
    body.putalpha(_round_mask((w, h), radius))

    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        (pad, pad + 3, pad + w - 1, pad + h + 3), radius=radius, fill=(0, 0, 0, 130))
    sh = sh.filter(ImageFilter.GaussianBlur(pad * 0.7))
    canvas.alpha_composite(sh)
    canvas.alpha_composite(body, (pad, pad))
    return canvas


def banner_image(title, sub, note, seconds, buttons, tone, scale):
    """横幅：标题 / 会话来源 / 说明 / 倒计时 / 按钮。返回 (图, 命中框, 边距)。"""
    s = scale
    f_title = _font(int(17 * s), True)
    f_sub = _font(int(12.5 * s))
    f_note = _font(int(12 * s))
    pad_x = int(22 * s)
    pad_y = int(18 * s)
    # 宽度跟着内容走：固定 430pt 时 "Ctrl+Alt+Shift+Backspace" 这种长串会在词中间
    # 被硬折成两行，看着像截断。上限 560pt，再长才换行。
    natural = _text_w(f_title, title)
    for t, f in ((sub, f_sub), (note, f_note)):
        for seg in (t or "").split(" · "):
            natural = max(natural, _text_w(f, seg))
    max_text_w = max(int(360 * s), min(int(560 * s), natural + int(4 * s)))

    color = {"consent": AMBER, "active": AMBER, "paused": GREY, "emergency": RED}.get(tone, AMBER)
    title_h = int(26 * s)
    sub_lines = _wrap(f_sub, sub, max_text_w) if sub else []
    note_lines = _wrap(f_note, note, max_text_w) if note else []
    line_h = int(19 * s)

    btn_h = int(38 * s) if buttons else 0
    content_h = pad_y + title_h + (line_h * len(sub_lines)) + int(8 * s) + \
        (line_h * len(note_lines)) + (int(14 * s) + btn_h + pad_y if buttons else pad_y)
    w = max_text_w + pad_x * 2
    content_h = max(content_h, int(96 * s))

    content = Image.new("RGBA", (w, content_h), (16, 16, 18, 244))
    d = ImageDraw.Draw(content)
    d.rounded_rectangle((0, 0, w - 1, content_h - 1), radius=int(14 * s),
                        outline=(color[0], color[1], color[2], 70), width=max(1, int(s)))

    y = pad_y
    d.text((pad_x, y), title, font=f_title, fill=(245, 246, 248, 255))
    y += title_h
    for ln in sub_lines:
        d.text((pad_x, y), ln, font=f_sub, fill=(160, 166, 176, 255))
        y += line_h
    y += int(8 * s)
    for ln in note_lines:
        d.text((pad_x, y), ln, font=f_note, fill=(205, 210, 218, 255))
        y += line_h

    hits = {}
    if buttons:
        by = content_h - pad_y - btn_h
        bw_ok, bw_no = int(118 * s), int(84 * s)
        gap = int(12 * s)
        x_no = w - pad_x - bw_no
        x_ok = x_no - gap - bw_ok
        d.rounded_rectangle((x_ok, by, x_ok + bw_ok, by + btn_h), radius=int(9 * s),
                            fill=(color[0], color[1], color[2], 255))
        d.text((x_ok + bw_ok / 2, by + btn_h / 2), "同意", font=_font(int(13.5 * s), True),
               fill=(20, 20, 20, 255), anchor="mm")
        d.rounded_rectangle((x_no, by, x_no + bw_no, by + btn_h), radius=int(9 * s),
                            outline=(90, 96, 106, 255), width=max(1, int(1.4 * s)))
        d.text((x_no + bw_no / 2, by + btn_h / 2), "拒绝", font=_font(int(13.5 * s)),
               fill=(196, 202, 212, 255), anchor="mm")
        hits["agree"] = (x_ok, by, bw_ok, btn_h)
        hits["deny"] = (x_no, by, bw_no, btn_h)

    img = panel_image(content, int(14 * s))
    return img, hits, int(18 * s)


def _whale_source():
    """真正的 DeepSeek 鲸鱼：直接用程序自带的 icon.png（深色鲸鱼、白底圆角方）。

    之前手画的"椭圆 + 两片鳍"被用户一眼认出是条鱼，别再手画了。
    """
    global _WHALE
    if _WHALE is not None:
        return _WHALE
    cand = [os.path.join(HERE, "..", "assets", "whale.png"),
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs",
                         "DeepSeek Harness", "resources", "icon.png")]
    for p in cand:
        try:
            src = Image.open(p).convert("RGBA")
        except (OSError, ValueError):
            continue
        # 白底黑鲸 → 抠出鲸鱼。先摊平到白底（图标四角是透明的，直接取亮度会变成黑），
        # 再用硬阈值；线性抠图会在鲸鱼外面留一圈方形边。
        flat = Image.alpha_composite(Image.new("RGBA", src.size, (255, 255, 255, 255)), src)
        g = flat.convert("L")
        mask = g.point(lambda v: 255 if v < 120 else 0)
        bbox = mask.getbbox()
        if bbox:
            src = src.crop(bbox)
            mask = mask.crop(bbox)
        _WHALE = (src, mask)
        return _WHALE
    return None


_WHALE = None


def _logo_core(d: int, color):
    """logo 静态部分：白底圆盘 + 官方鲸鱼（蓝）。"""
    ss = 3
    size = d * ss
    c = size / 2.0
    body_r = c - 5.0 * ss

    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    disc = Image.new("L", (size, size), 0)
    ImageDraw.Draw(disc).ellipse((c - body_r, c - body_r, c + body_r, c + body_r), fill=255)
    white = Image.new("RGBA", (size, size), (250, 251, 255, 246))
    base.paste(white, (0, 0), disc)
    ImageDraw.Draw(base).ellipse(
        (c - body_r, c - body_r, c + body_r, c + body_r),
        outline=(color[0], color[1], color[2], 130), width=max(1, int(ss)))

    whale = _whale_source()
    if whale is not None:
        src, mask = whale
        box = int(size * 0.70)
        sw, sh = src.size
        k = min(box / sw, box / sh)
        nw, nh = max(1, int(sw * k)), max(1, int(sh * k))
        wm = mask.resize((nw, nh), Image.LANCZOS)
        blue = Image.new("RGBA", (nw, nh), LOGO_BLUE + (255,))
        blue.putalpha(wm)
        base.alpha_composite(blue, (int(c - nw / 2), int(c - nh / 2)))
    return base, (size, c)


def logo_frames(d: int, color, n: int = 24):
    """呼吸帧：静态核心 + 每帧两层柔光环，返回 n 张已缩好的图。"""
    core, (size, c) = _logo_core(d, color)
    out = []
    ring_r = c - 3
    for i in range(n):
        pulse = 0.5 + 0.5 * math.sin((i / n) * math.tau)
        img = core.copy()
        for rr, aa, blur in ((1.0, 0.62, 2.2), (1.10, 0.28, 3.0)):
            ring = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            rd = ImageDraw.Draw(ring)
            rad = ring_r * rr
            rd.ellipse((c - rad, c - rad, c + rad, c + rad),
                       outline=(color[0], color[1], color[2], int(255 * aa * (0.35 + 0.65 * pulse))),
                       width=max(2, int(1.8 * 3)))
            ring = ring.filter(ImageFilter.GaussianBlur(blur * 3))
            img.alpha_composite(ring)
        out.append(img.resize((d, d), Image.LANCZOS))
    return out


# ---------------------------------------------------------------- 渲染器

class Renderer(threading.Thread):
    """所有 WS_EX_LAYERED 窗口都在这个线程里画，也在这个线程里收鼠标消息。"""

    def __init__(self, emit):
        super().__init__(name="cu-overlay-render", daemon=True)
        self.emit = emit
        self.scale = _dpi_scale()
        self.lock = threading.Lock()
        self.running = True
        self.mode = "idle"
        self.border_on = False
        self.halo_on = False
        self.logo_on = False
        self.banner = None          # dict(text/sub/note/seconds/buttons/tone/deadline)
        self.flash_until = 0.0
        self.flash_color = RED
        self.border_peak = 0.5
        self.border_color = AMBER
        self._border_imgs = None
        self._halo_img = None
        self._halo_pos = None
        self._logo_frames = None
        self._logo_phase = 0.0
        self._last_banner_key = None
        self._last_border_key = None

        self.w_border = [LayerWindow("cu-border-%d" % i) for i in range(4)]
        self.w_halo = LayerWindow("cu-halo")
        self.w_banner = LayerWindow("cu-banner", click_through=False,
                                    on_click=self._banner_click)
        self.w_logo = LayerWindow("cu-logo", click_through=False,
                                  on_click=lambda *a: self.emit({"event": "logo_click"}))
        for w in self.w_border + [self.w_halo, self.w_banner, self.w_logo]:
            w.hide()

    # ---- 外部入口（线程安全，只改状态，不直接画）
    def apply(self, cmd: dict):
        with self.lock:
            k = cmd.get("cmd")
            if k == "off":
                self.mode = "idle"
                self.border_on = self.halo_on = self.logo_on = False
                self.banner = None
                self.flash_until = 0.0
                self.w_banner.hide()
                self.w_logo.hide()
                self.w_halo.hide()
                for w in self.w_border:
                    w.hide()
                return
            if k == "border":
                self.border_on = bool(cmd.get("on", True))
                if cmd.get("color"):
                    self.border_color = _hex(cmd["color"])
                if cmd.get("alpha") is not None:
                    self.border_peak = float(cmd["alpha"])
                if not self.border_on:
                    for w in self.w_border:
                        w.hide()
            elif k == "halo":
                self.halo_on = bool(cmd.get("on", True))
                if not self.halo_on:
                    self.w_halo.hide()
            elif k == "logo":
                self.logo_on = bool(cmd.get("on", True))
                if not self.logo_on:
                    self.w_logo.hide()
            elif k == "banner":
                self.banner = {
                    "text": cmd.get("text", ""),
                    "sub": cmd.get("sub", ""),
                    "note": cmd.get("note", ""),
                    "seconds": int(cmd.get("seconds", 0) or 0),
                    "buttons": bool(cmd.get("buttons", False)),
                    "tone": cmd.get("tone", "consent"),
                    "deadline": time.time() + int(cmd.get("seconds", 0) or 0),
                }
                self.mode = cmd.get("tone", "consent")
            elif k == "hide_banner":
                self.banner = None
                self.w_banner.hide()
            elif k == "flash":
                self.flash_until = time.time() + 0.45 * int(cmd.get("times", 2) or 2)
                self.flash_color = _hex(cmd.get("color", "#FF3B30"))
            elif k == "quit":
                self.running = False

    # ---- 渲染循环
    def run(self):
        while self.running:
            try:
                self._pump()
                self._draw()
            except Exception:
                traceback.print_exc()
            time.sleep(1 / 40.0)

    def _pump(self):
        msg = MSG()
        while user32.PeekMessageW(ctypes.byref(msg), None, 0, 0, 1):
            if msg.message == WM_DESTROY:
                break
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))

    def _draw(self):
        now = time.time()
        with self.lock:
            mode = self.mode
            border_on, halo_on, logo_on = self.border_on, self.halo_on, self.logo_on
            banner = dict(self.banner) if self.banner else None
            flashing = now < self.flash_until
            peak = self.border_peak
            color = self.flash_color if flashing else self.border_color
            if flashing:
                peak = 0.55 + 0.25 * math.sin(now * 26.0)

        sx, sy, sw, sh = _screen_rect()
        thick = int(52 * self.scale)

        if border_on and peak > 0.01:
            key = (round(peak, 2), color, (sw, sh), thick)
            if key != self._last_border_key:
                self._last_border_key = key
                self._border_imgs = [
                    edge_image((thick, sh), color, peak, True, True),
                    edge_image((thick, sh), color, peak, True, False),
                    edge_image((sw, thick), color, peak, False, True),
                    edge_image((sw, thick), color, peak, False, False),
                ]
            imgs = self._border_imgs
            self.w_border[0].present(imgs[0], sx, sy)
            self.w_border[1].present(imgs[1], sx + sw - thick, sy)
            self.w_border[2].present(imgs[2], sx, sy)
            self.w_border[3].present(imgs[3], sx, sy + sh - thick)
        else:
            for w in self.w_border:
                w.hide()

        if halo_on:
            if self._halo_img is None:
                self._halo_img = halo_image(int(72 * self.scale))
            cx, cy = _cursor()
            # 贴住指针：水平居中，上沿留 10pt 空隙，既不压住箭头又像"光标自带的光"。
            d = self._halo_img.size[0]
            pos = (cx - d // 2, cy + int(6 * self.scale))
            self.w_halo.present(self._halo_img, *pos)
        else:
            self.w_halo.hide()

        if logo_on:
            d = int(62 * self.scale)
            self._logo_phase += 0.02
            if self._logo_frames is None:
                self._logo_frames = logo_frames(d, LOGO_BLUE)
            img = self._logo_frames[int(self._logo_phase * len(self._logo_frames)) %
                                    len(self._logo_frames)]
            wx, wy, ww, wh = _work_area()
            self.w_logo.present(img, wx + ww - d - int(16 * self.scale),
                                wy + wh - d - int(16 * self.scale))
        else:
            self.w_logo.hide()

        if banner:
            key = (banner["text"], banner["sub"], banner["note"], banner["buttons"],
                   banner["tone"], max(0, int(banner["deadline"] - now)))
            if key != self._last_banner_key:
                self._last_banner_key = key
                left = max(0, int(banner["deadline"] - now))
                img, hits, pad = banner_image(
                    banner["text"], banner["sub"], banner["note"], left,
                    banner["buttons"], banner["tone"], self.scale)
                self._banner_hits = hits
                self._banner_pad = pad
                wx, wy, ww, wh = _work_area()
                self.w_banner.present(img, wx + (ww - img.size[0]) // 2, wy + int(6 * self.scale))
        else:
            self.w_banner.hide()

    def _banner_click(self, win, x, y):
        with self.lock:
            hits = getattr(self, "_banner_hits", {})
            pad = getattr(self, "_banner_pad", 0)
        for name, (hx, hy, hw, hh) in hits.items():
            if hx <= x - pad <= hx + hw and hy <= y - pad <= hy + hh:
                self.emit({"event": name})
                return


def _hex(s):
    s = str(s or "#FFB000").lstrip("#")
    if len(s) == 6:
        return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))
    return AMBER


# ---------------------------------------------------------------- 对话框（Tk）

def run_dialog(spec, emit, root):
    """临时对话框：用户把话写进来，回车发出去，同时告诉 server 暂停。"""
    import tkinter as tk

    scale = _dpi_scale()
    # 直接拿 Tk 的 root 当窗口，不用 Toplevel(root)：
    # 这台机器上 "root 先 withdraw、再开 overrideredirect Toplevel" 的对话框
    # 窗口是 visible 的，但客户区永远不绘制（PrintWindow 全黑，2026-11-13 实测）；
    # 改用 root 本身 + overrideredirect 就正常。
    win = root
    win.overrideredirect(True)
    win.attributes("-topmost", True)
    # 不要给对话框加 -alpha：overrideredirect + 整窗半透明时，这台机器（Win11 +
    # 150% DPI）会把客户区画成黑块，子控件一个都不显示（2026-11-13 实测，
    # 去掉 -alpha 立刻正常）。要半透明就让面板底色自己带透明，别动整窗 alpha。
    # 也不要在开窗前 withdraw 再 deiconify：那样窗口 visible 却永远不绘制。
    win.configure(bg="#121216")

    w, h = int(430 * scale), int(212 * scale)
    frame = tk.Frame(win, bg="#121216", highlightthickness=1,
                     highlightbackground="#2A2F38")
    frame.pack(fill="both", expand=True)

    tk.Label(frame, text=spec.get("title") or "对 agent 说点什么", bg="#121216", fg="#F3F4F6",
             font=("Microsoft YaHei UI", max(10, int(11 * scale)), "bold"),
             anchor="w").pack(fill="x", padx=int(16 * scale), pady=(int(14 * scale), int(2 * scale)))
    hint = spec.get("hint") or "它会照你说的调整；发送后自动继续。"
    tk.Label(frame, text=hint, bg="#121216", fg="#8B93A1",
             font=("Microsoft YaHei UI", max(8, int(9 * scale))),
             anchor="w", justify="left", wraplength=w - int(34 * scale)).pack(
        fill="x", padx=int(16 * scale))

    var = tk.StringVar()
    entry_frame = tk.Frame(frame, bg="#0D0F13", highlightthickness=1,
                           highlightbackground="#333A45")
    entry_frame.pack(fill="x", padx=int(16 * scale), pady=(int(10 * scale), int(10 * scale)))
    entry = tk.Entry(entry_frame, textvariable=var, bg="#0D0F13", fg="#E9ECF1",
                     insertbackground="#FFB000", relief="flat",
                     font=("Microsoft YaHei UI", max(9, int(10 * scale))))
    entry.pack(fill="x", padx=int(10 * scale), pady=int(8 * scale))

    row = tk.Frame(frame, bg="#121216")
    row.pack(fill="x", padx=int(16 * scale), pady=(0, int(14 * scale)))
    btn_send = tk.Button(row, text="发送  ⏎", command=lambda: _send(), bg="#FFB000", fg="#141414",
                         relief="flat", bd=0, activebackground="#FFC43D",
                         font=("Microsoft YaHei UI", max(9, int(9.5 * scale)), "bold"),
                         padx=int(16 * scale), pady=int(5 * scale))
    btn_send.pack(side="right")
    btn_cancel = tk.Button(row, text="取消", command=lambda: _close(False), bg="#1B1F26",
                           fg="#C6CCD6", relief="flat", bd=0, activebackground="#242A33",
                           font=("Microsoft YaHei UI", max(9, int(9.5 * scale))),
                           padx=int(14 * scale), pady=int(5 * scale))
    btn_cancel.pack(side="right", padx=(0, int(8 * scale)))

    win.geometry("%dx%d" % (w, h))
    wx, wy, ww, wh = _work_area()
    win.geometry("+%d+%d" % (wx + ww - w - int(20 * scale), wy + wh - h - int(96 * scale)))
    # 圆角等窗口真正映射之后再切，太早切区域会让它画不出来。
    win.after(180, lambda: _round_window(win, int(12 * scale)))

    def _send():
        text = var.get().strip()
        if not text:
            return
        emit({"event": "message", "text": text})
        _close(True)

    def _close(_sent):
        try:
            win.destroy()
        finally:
            emit({"event": "dialog_closed"})

    entry.bind("<Return>", lambda e: _send())
    win.bind("<Escape>", lambda e: _close(False))
    win.after(60, lambda: (entry.focus_force(), win.lift()))
    return win


def _round_window(win, radius):
    try:
        hwnd = user32.GetParent(win.winfo_id()) or win.winfo_id()
        GA_ROOT = 2
        hwnd = user32.GetAncestor(hwnd, GA_ROOT)
        w = win.winfo_width()
        h = win.winfo_height()
        rgn = gdi32.CreateRoundRectRgn(0, 0, w + 1, h + 1, radius * 2, radius * 2)
        user32.SetWindowRgn(hwnd, rgn, True)
    except Exception:
        pass


# ---------------------------------------------------------------- 主进程

def dialog_main(spec_json):
    """--dialog 模式：只开一个对话框，用户发完就退出，stdout 回一行 JSON。

    和渲染进程分居两个进程是必须的：渲染线程 40fps 在 UpdateLayeredWindow 上刷，
    同进程里再开 Tk 窗口，Windows 只给它一块黑底（2026-11-13 实测）。
    """
    try:
        user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))
    except Exception:
        pass
    spec = json.loads(spec_json)

    def emit(obj):
        sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
        sys.stdout.flush()

    import tkinter as tk
    root = tk.Tk()
    run_dialog(spec, emit, root)
    root.mainloop()


def main():
    if "--dialog" in sys.argv:
        idx = sys.argv.index("--dialog")
        spec = sys.argv[idx + 1] if len(sys.argv) > idx + 1 else "{}"
        dialog_main(spec)
        return
    try:
        user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))
    except Exception:
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            pass

    out_lock = threading.Lock()

    def emit(obj):
        line = json.dumps(obj, ensure_ascii=False)
        with out_lock:
            sys.stdout.write(line + "\n")
            sys.stdout.flush()

    renderer = Renderer(emit)
    renderer.start()

    import queue
    cmds: "queue.Queue[dict]" = queue.Queue()

    def reader():
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                cmds.put(json.loads(line))
            except Exception:
                pass
        cmds.put({"cmd": "quit"})

    threading.Thread(target=reader, name="cu-overlay-stdin", daemon=True).start()

    import tkinter as tk
    root = tk.Tk()
    root.withdraw()

    def pump():
        try:
            while True:
                cmd = cmds.get_nowait()
                k = cmd.get("cmd")
                if k == "quit":
                    renderer.apply({"cmd": "off"})
                    root.quit()
                    return
                renderer.apply(cmd)
        except queue.Empty:
            pass
        root.after(40, pump)

    emit({"event": "ready", "screen": list(_screen_rect()), "scale": renderer.scale})
    root.after(40, pump)
    try:
        root.mainloop()
    finally:
        renderer.running = False
        renderer.apply({"cmd": "off"})
        time.sleep(0.15)


if __name__ == "__main__":
    main()
