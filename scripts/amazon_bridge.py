#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""amazon_bridge.py — 本地抓取桥：让「AI 营销助手」网页自己联网

三个接口（起 --serve 后）
------------------------
    /search?q=产品名   → 联网搜这个词，返回标题+摘要，用来判断这是哪个品类
    /start?kw=…        → 抓 Amazon 竞品与评论（评论页填 review_pages=0 则只取商品）
    /poll?id=…         → 取上面那个任务的进度与结果

两种用法
--------
1) 起桥，然后在网页里点「联网收集」（推荐）
       python amazon_bridge.py --serve
   浏览器打开 dist/AI营销助手.html，只填产品名，点「联网收集」即可。
   品类认不出来时它先联网搜一遍，认清再用英文词去 Amazon 抓竞品。

2) 命令行直接出 CSV
       python amazon_bridge.py "portable blender" --limit 6

抓取引擎（自动择优，装了哪个用哪个）
------------------------------------
    Scrapling  https://github.com/D4Vinci/Scrapling   ← 首选，TLS 指纹伪装，抗封最好
        pip install "scrapling[fetchers]"
    Playwright https://github.com/microsoft/playwright ← 兜底，真浏览器渲染
        pip install playwright && playwright install chromium
    标准库 urllib                                      ← 零依赖，能用就最快

三个都不装也能跑：默认走 urllib，被拦了才提示你装上面两个。
"""
import argparse
import csv
import json
import os
import random
import re
import sys
import threading
import time
import uuid
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote_plus, urlparse
from urllib.request import Request, urlopen

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

MARKETS = {
    "com": ("amazon.com", "en-US"), "co.uk": ("amazon.co.uk", "en-GB"),
    "de": ("amazon.de", "de-DE"), "fr": ("amazon.fr", "fr-FR"),
    "it": ("amazon.it", "it-IT"), "es": ("amazon.es", "es-ES"),
    "nl": ("amazon.nl", "nl-NL"), "se": ("amazon.se", "sv-SE"),
    "pl": ("amazon.pl", "pl-PL"), "ca": ("amazon.ca", "en-CA"),
    "com.mx": ("amazon.com.mx", "es-MX"), "com.br": ("amazon.com.br", "pt-BR"),
    "ae": ("amazon.ae", "en-AE"), "sa": ("amazon.sa", "ar-SA"),
    "com.au": ("amazon.com.au", "en-AU"), "in": ("amazon.in", "en-IN"),
    "sg": ("amazon.sg", "en-SG"),
}
FIELDS = ["asin", "rating", "title", "body", "date", "verified", "helpful"]
SITE_FIELDS = ["asin", "title", "price", "rating", "reviews", "sponsored", "url"]
BLOCK_KEYS = ("Enter the characters you see below", "api-services-support@amazon.com",
              "Type the characters you see in this image", "Robot Check",
              "Sorry, we just need to make sure you", "automated access to Amazon data",
              "Service Unavailable")


# ---------------------------------------------------------------- 迷你 DOM
VOID = {"br", "img", "input", "meta", "link", "hr", "source", "col", "area", "base", "wbr"}


class Node:
    __slots__ = ("tag", "attrs", "kids")

    def __init__(self, tag, attrs):
        self.tag, self.attrs, self.kids = tag, attrs, []


class Dom(HTMLParser):
    """够用的 DOM：只为了按 data-hook 取节点，不追求规范兼容。"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", {})
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        n = Node(tag, dict(attrs))
        self.stack[-1].kids.append(n)
        if tag not in VOID:
            self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].kids.append(Node(tag, dict(attrs)))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        if data.strip():
            self.stack[-1].kids.append(data)


def tree(html):
    d = Dom()
    d.feed(html or "")
    d.close()
    return d.root


def kids_of(n):
    return [k for k in n.kids if isinstance(k, Node)]


def text(n):
    """按文档顺序取纯文本（BFS 会把嵌套片段拼错，必须用 DFS）"""
    if n is None:
        return ""
    out, stack = [], [n]
    while stack:
        x = stack.pop()
        if isinstance(x, str):
            out.append(x)
        elif x.tag in ("script", "style"):
            continue
        elif x.tag == "br":
            out.append(" ")
        else:
            stack.extend(reversed(x.kids))
    return " ".join("".join(out).split())


def pick(root, want):
    """返回第一个属性全部匹配的节点"""
    stack = [root]
    while stack:
        n = stack.pop()
        if isinstance(n, Node):
            if all(n.attrs.get(k) == v for k, v in want.items()):
                return n
            stack.extend(reversed(n.kids))
    return None


def picks(root, want):
    out, stack = [], [root]
    while stack:
        n = stack.pop()
        if isinstance(n, Node):
            if all(n.attrs.get(k) == v for k, v in want.items()):
                out.append(n)
            stack.extend(reversed(n.kids))
    return out


def first_tag(root, tag):
    stack = [root]
    while stack:
        n = stack.pop()
        if isinstance(n, Node):
            if n.tag == tag:
                return n
            stack.extend(reversed(n.kids))
    return None


def picks_tag(root, tag):
    """取全部同名标签（DFS 顺序）"""
    out, stack = [], [root]
    while stack:
        n = stack.pop()
        if isinstance(n, Node):
            if n.tag == tag:
                out.append(n)
            stack.extend(reversed(n.kids))
    return out


def has_class(root, cls):
    stack = [root]
    while stack:
        n = stack.pop()
        if isinstance(n, Node):
            if cls in (n.attrs.get("class") or ""):
                return True
            stack.extend(reversed(n.kids))
    return False


def num(s, d=0.0):
    m = re.search(r"\d[\d,]*\.?\d*", str(s or "").replace(",", ""))
    return float(m.group()) if m else d


# ---------------------------------------------------------------- 解析
def parse_search(html, site):
    rows, seen = [], set()
    for card in picks(tree(html), {"data-component-type": "s-search-result"}):
        asin = (card.attrs.get("data-asin") or "").strip()
        if not asin or asin in seen:
            continue
        seen.add(asin)
        h2 = first_tag(card, "h2")
        price = stars = 0.0
        cnt = 0
        stack = [card]
        while stack:
            n = stack.pop(0)
            if not isinstance(n, Node):
                continue
            cls = n.attrs.get("class") or ""
            if not price and "a-offscreen" in cls:
                price = num(text(n))
            if not stars and "a-icon-alt" in cls:
                stars = num(text(n))
            if not cnt and n.tag == "a" and "customerReviews" in (n.attrs.get("href") or ""):
                cnt = int(num(text(n), 0))
            stack = n.kids + stack
        rows.append({
            "asin": asin, "title": text(h2), "price": price, "rating": stars,
            "reviews": cnt, "sponsored": "Yes" if has_class(card, "puis-sponsored-label-text") else "No",
            "url": f"{site}/dp/{asin}",
        })
    return rows


MONTHS = {}
for _names in (
    "january february march april may june july august september october november december",
    "januar februar märz april mai juni juli august september oktober november dezember",
    "janvier février mars avril mai juin juillet août septembre octobre novembre décembre",
    "gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre",
    "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre",
    "janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro",
    "januari februari maart april mei juni juli augustus september oktober november december",
    "januari februari mars april maj juni juli augusti september oktober november december",
    "styczeń luty marzec kwiecień maj czerwiec lipiec sierpień wrzesień październik listopad grudzień",
):
    for _i, _m in enumerate(_names.split(), 1):
        MONTHS[_m] = _i
for _m, _i in (("jan", 1), ("feb", 2), ("mar", 3), ("apr", 4), ("jun", 6), ("jul", 7),
               ("aug", 8), ("sep", 9), ("sept", 9), ("oct", 10), ("nov", 11), ("dec", 12),
               ("mai", 5), ("okt", 10), ("dez", 12), ("aoû", 8), ("mär", 3), ("fév", 2)):
    MONTHS.setdefault(_m, _i)


def norm_date(raw):
    """"Reviewed in the United States on August 14, 2026" → 2026-08-14
    兼容 DD Month YYYY / Month DD, YYYY，月份名覆盖英德法意西葡荷瑞波 9 种语言。"""
    s = (raw or "").strip()
    if not s:
        return ""
    m = re.search(r"(\d{1,2})\.?\s+([^\W\d_]{3,})\.?,?\s+(\d{4})", s)
    if m:
        d, mon, y = int(m.group(1)), m.group(2), int(m.group(3))
    else:
        m = re.search(r"([^\W\d_]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})", s)
        if m:
            mon, d, y = m.group(1), int(m.group(2)), int(m.group(3))
        else:
            m2 = re.search(r"\d{4}-\d{2}-\d{2}", s)
            return m2.group() if m2 else s[-24:]
    mo = MONTHS.get(mon.lower().strip("."))
    if not mo or not (1 <= d <= 31):
        m2 = re.search(r"\d{4}-\d{2}-\d{2}", s)
        return m2.group() if m2 else s[-24:]
    return f"{y:04d}-{mo:02d}-{d:02d}"


def parse_reviews(html, asin):
    out = []
    for el in picks(tree(html), {"data-hook": "review"}):
        body = pick(el, {"data-hook": "review-body"})
        star = (pick(el, {"data-hook": "review-star-rating"})
                or pick(el, {"data-hook": "cmps-review-star-rating"}))
        title = pick(el, {"data-hook": "review-title"})
        date = pick(el, {"data-hook": "review-date"})
        help_ = pick(el, {"data-hook": "helpful-vote-statement"})
        b = re.sub(r"\s*(Read more|Read less|Mehr anzeigen)\s*$", "", text(body)).strip()
        raw_title = text(title)
        t = re.sub(r"^[\d.]+\s+out of 5 stars\s*", "", raw_title).strip()
        # 评分有两种落点：独立的 star 节点，或塞在标题里的 a-icon-alt
        s = re.search(r"([1-5](?:\.\d)?)\s+out of 5", text(star) or raw_title)
        out.append({
            "asin": asin,
            "rating": s.group(1) if s else "",
            "title": t,
            "body": b,
            "date": norm_date(text(date)),
            "verified": "Yes" if pick(el, {"data-hook": "avp-badge"}) else "No",
            "helpful": int(num(text(help_), 0)),
            "_rid": el.attrs.get("id") or "",
        })
    return out


# ---------------------------------------------------------------- 联网搜品类
def serp_q(kw):
    """中文词里的空格会让 Bing 拆成单字查（「桌垫 硅胶」→ 查「桌」），
    所以纯中文去掉空格，英文保留（portableblender 是搜不到东西的）。"""
    s = str(kw or "").strip()
    if re.search(r"[\u4e00-\u9fa5]", s):
        s = re.sub(r"\s+", "", s)
    return s


def parse_serp(html):
    """Bing 结果页 → [{t, s, w}]。只取标题与摘要，不取 URL 面包屑，
    否则「zhihu.comhttps://…」这种噪音会污染品类判断。
    w 是权重：百科/维基条目往往是定义句，判品类时比普通文章可信。"""
    out, stack = [], [tree(html)]
    while stack:
        n = stack.pop()
        if not isinstance(n, Node):
            continue
        if "b_algo" in (n.attrs.get("class") or ""):
            h2 = first_tag(n, "h2")
            title = text(h2)
            body = " ".join(text(p) for p in picks_tag(n, "p"))
            a = first_tag(n, "a")
            href = (a.attrs.get("href") or "") if a else ""
            w = 2 if re.search(r"baike\.|wikipedia\.|wiki/|zhihu\.com/question", href) else 1
            if title or body:
                out.append({"t": title[:140], "s": body[:400], "w": w})
            continue
        stack.extend(reversed(n.kids))
    return out


def parse_so(html):
    """360 搜索 → [{t, s, w}]。中文产品词只有它给得准：
    Bing 会把「宠物烘干箱」拆成「宠物」，360 能原样命中。"""
    out, stack = [], [tree(html)]
    while stack:
        n = stack.pop()
        if not isinstance(n, Node):
            continue
        if n.tag == "li" and "res-list" in (n.attrs.get("class") or ""):
            h3 = first_tag(n, "h3")
            body = text(n)
            if h3 is None or len(body) < 40:
                continue
            w = 2 if re.search(r"百科|维基|京东|淘宝|天猫|当当", body[:200]) else 1
            out.append({"t": text(h3)[:140], "s": body[:400], "w": w})
            continue
        stack.extend(reversed(n.kids))
    return out


def anchor_ok(kw, snips):
    """搜索退化的自检：结果里连词尾都没出现，说明引擎把词拆开查了单字
    （「桌垫 硅胶」会变成查「桌」），这种结果拿去判品类只会更糟。"""
    s = serp_q(kw)
    body = " ".join((x["t"] + " " + x["s"]) for x in snips)
    if re.search(r"[\u4e00-\u9fa5]", s):
        for L in (3, 2):
            if len(s) >= L and s[-L:] in body:
                return True
        return False
    words = [w for w in s.split() if len(w) > 2]
    return not words or any(w.lower() in body.lower() for w in words)


def web_search(kw, n=8, timeout=12):
    """零依赖网页搜索。只负责把「网上怎么说这个词」取回来，
    是不是某个品类由页面里的画像库判断——判断逻辑只留一份，免得两边词表打架。"""
    q = quote_plus(serp_q(kw))
    if not q:
        return {"ok": False, "msg": "缺关键词"}
    zh = bool(re.search(r"[\u4e00-\u9fa5]", str(kw or "")))
    srcs = [("so.com", "https://www.so.com/s?q=", parse_so),
            ("cn.bing.com", "https://cn.bing.com/search?q=", parse_serp)]
    if not zh:
        srcs.reverse()
    err = ""
    for name, base, fn in srcs:
        try:
            req = Request(base + q + ("&count=20&setlang=zh-CN" if "bing" in name else ""),
                          headers={
                              "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.6",
                              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                          })
            with urlopen(req, timeout=timeout) as r:
                html = r.read().decode(r.headers.get_content_charset() or "utf-8", "ignore")
            got, seen = [], set()
            for x in fn(html):
                k = x["t"][:24]
                if k and k not in seen:
                    seen.add(k)
                    got.append(x)
            if not got:
                err = f"{name} 打开了但没解析出结果"
                continue
            if not anchor_ok(kw, got):
                err = f"{name} 把这个词拆开查了（结果里没有「{serp_q(kw)[-3:]}」），不足为凭"
                continue
            return {"ok": True, "src": name, "q": kw, "snips": got[:n]}
        except Exception as e:
            err = f"{name}: {type(e).__name__} {e}"
    return {"ok": False, "msg": "联网搜索没拿到可用结果 —— " + err}


# ---------------------------------------------------------------- 抓取引擎
class Getter:
    def __init__(self, market="com", engine="auto", timeout=30):
        base = os.environ.get("AMAZON_BASE", "").rstrip("/")
        self.site = base or "https://www." + MARKETS.get(market, MARKETS["com"])[0]
        self.lang = MARKETS.get(market, MARKETS["com"])[1]
        self.timeout = timeout
        self.used = "urllib"
        self.engines = []
        self._pw = None
        order = []
        if engine in ("auto", "scrapling"):
            try:
                import scrapling.fetchers  # noqa: F401
                order.append(("scrapling", self._scrapling))
            except ImportError:
                if engine == "scrapling":
                    sys.exit('没装 Scrapling：pip install "scrapling[fetchers]"')
        if engine in ("auto", "urllib"):
            order.append(("urllib", self._urllib))
        if engine in ("auto", "playwright"):
            try:
                import playwright.sync_api  # noqa: F401
                order.append(("playwright", self._playwright))
            except ImportError:
                if engine == "playwright":
                    sys.exit("没装 Playwright：pip install playwright && playwright install chromium")
        self.engines = order or [("urllib", self._urllib)]

    def get(self, url, need=None):
        """need：页面里必须出现的关键片段。亚马逊现在会给非浏览器请求返回 JS 空壳，
        只判断「没被 503」不够，得确认目标区块真的在，否则升级到下一个引擎。"""
        last = ""
        for name, fn in self.engines:
            try:
                html = fn(url)
            except Exception as e:
                last = f"{name}: {e or type(e).__name__}"
                continue
            if not html or any(k in html for k in BLOCK_KEYS):
                last = f"{name}: 拿到的是反爬页（验证码 / 503）"
                continue
            if need and need not in html:
                last = f"{name}: 页面里没有目标区块（被拦，或这一页真的是空的）"
                continue
            self.used = name
            return html
        raise RuntimeError(last or "抓取失败")

    def _scrapling(self, url):
        from scrapling.fetchers import Fetcher
        r = Fetcher.get(url, impersonate="chrome", stealthy_headers=True, timeout=self.timeout)
        return r.body.decode(r.encoding or "utf-8", "ignore")

    def _urllib(self, url):
        req = Request(url, headers={
            "User-Agent": UA, "Accept-Language": f"{self.lang},en;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Upgrade-Insecure-Requests": "1",
        })
        with urlopen(req, timeout=self.timeout) as r:
            return r.read().decode(r.headers.get_content_charset() or "utf-8", "ignore")

    def _playwright(self, url):
        from playwright.sync_api import sync_playwright
        if self._pw is None:
            self._ctx = sync_playwright().start()
            self._br = self._ctx.chromium.launch(headless=True)
            self._pg = self._br.new_context(locale=self.lang).new_page()
            self._pg.set_extra_http_headers({"Accept-Language": f"{self.lang},en;q=0.8"})
        self._pg.goto(url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(random.uniform(1.2, 2.2))
        return self._pg.content()

    def close(self):
        try:
            if self._pw:
                self._br.close()
                self._pw.stop()
        except Exception:
            pass


# ---------------------------------------------------------------- 主流程
def crawl(kw=None, asins=None, market="com", pages=1, limit=6, review_pages=2,
          sort="recent", min_reviews=0, engine="auto", log=print):
    g = Getter(market, engine)
    comps, rows, seen = [], [], set()
    try:
        if asins:
            log(f"指定 ASIN：{len(asins)} 个")
            comps = [{"asin": a, "title": "", "price": 0, "rating": 0, "reviews": 0,
                      "sponsored": "No", "url": f"{g.site}/dp/{a}"} for a in asins]
        else:
            for p in range(1, pages + 1):
                log(f"搜索第 {p}/{pages} 页…")
                got = parse_search(g.get(f"{g.site}/s?k={quote_plus(kw)}&page={p}",
                                          need='data-component-type="s-search-result"'), g.site)
                have = {c["asin"] for c in comps}
                comps += [r for r in got if r["asin"] not in have]
                if not got:
                    break
                time.sleep(random.uniform(1.5, 3.0))
            comps.sort(key=lambda r: r["reviews"], reverse=True)
            if not comps:
                raise RuntimeError("搜索页能打开但解析不出商品，可能被反爬页挡住。"
                                   '装 Scrapling 更稳：pip install "scrapling[fetchers]"')
            log(f"找到 {len(comps)} 个竞品")
            comps = [c for c in comps if c["reviews"] >= min_reviews][:limit]

        if review_pages <= 0:
            log(f"只取商品信息：{len(comps)} 个 · 引擎 {g.used}")
            return comps, []

        last_err = ""
        for i, c in enumerate(comps, 1):
            asin = c["asin"]
            log(f"抓评论 {i}/{len(comps)} · {asin} {(c['title'] or '')[:28]}")
            for p in range(1, review_pages + 1):
                url = (f"{g.site}/product-reviews/{asin}/?reviewerType=all_reviews"
                       f"&sortBy={sort}&pageNumber={p}")
                try:
                    items = parse_reviews(g.get(url, need='data-hook="review"'), asin)
                except RuntimeError as e:
                    last_err = str(e)
                    log(f"  {asin} 停在第 {p} 页：{e}")
                    break
                if not items:
                    break
                new = 0
                for it in items:
                    rid = asin + "|" + (it.pop("_rid") or it["body"][:40])
                    if rid in seen:
                        continue
                    seen.add(rid)
                    rows.append(it)
                    new += 1
                if new == 0:
                    break
                time.sleep(random.uniform(1.5, 3.0))
    finally:
        g.close()
    if not rows:
        raise RuntimeError(f"一条都没抓到。{last_err}\n"
                           "亚马逊会给非浏览器请求回一个 JS 空壳，评论区渲染不出来。装真浏览器再跑：\n"
                           "    pip install playwright && playwright install chromium\n"
                           '  或者装 Scrapling：pip install "scrapling[fetchers]"')
    log(f"完成：{len(rows)} 条评论 · 引擎 {g.used}")
    return comps, rows


def fail_tip(msg):
    """把常见失败翻译成能照做的下一步"""
    s = str(msg)
    if any(k in s for k in ("503", "反爬", "目标区块", "空壳", "HTTP Error")):
        return (s + "\n出口 IP 多半被亚马逊限流了（机房 IP 很常见）。按顺序试：\n"
                "  1. pip install playwright && playwright install chromium   ← 真浏览器，成功率最高\n"
                '  2. pip install "scrapling[fetchers]"                       ← TLS 指纹伪装\n'
                "  3. 换家用宽带 / 换 --market 站点再试")
    return s


# ---------------------------------------------------------------- 服务模式
JOBS = {}
LOCK = threading.Lock()


def job_worker(jid, p):
    def log(m):
        with LOCK:
            J = JOBS.get(jid)
            if J:
                J["log"].append(m)
                J["log"] = J["log"][-6:]

    try:
        comps, rows = crawl(kw=p.get("kw") or None, asins=p.get("asins") or None,
                            market=p.get("market", "com"), pages=int(p.get("pages", 1)),
                            limit=int(p.get("limit", 6)),
                            review_pages=int(p.get("review_pages", 2)), log=log)
        with LOCK:
            if not rows and int(p.get("review_pages", 2)) > 0:
                JOBS[jid].update(state="empty", msg="抓完了但一条评论都没有：换 --engine playwright 或增大 --review-pages")
            elif not rows:
                JOBS[jid].update(state="done", rows=[],
                                 products=[{k: c.get(k, 0 if k != "title" else "") for k in
                                            ("asin", "title", "price", "rating", "reviews", "sponsored")}
                                           for c in comps])
            else:
                keep = ("asin", "title", "price", "rating", "reviews", "sponsored")
                JOBS[jid].update(state="done", rows=rows[:1000],
                                 products=[{k: c.get(k, 0 if k != "title" else "") for k in keep}
                                           for c in comps])
    except Exception as e:
        with LOCK:
            JOBS[jid].update(state="error", msg=fail_tip(e))


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,OPTIONS")
        self.send_header("Cache-Control", "no-store")

    def reply(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        if u.path == "/health":
            return self.reply({"ok": True, "app": "amazon_bridge", "markets": sorted(MARKETS)})
        if u.path == "/search":
            if not q.get("q"):
                return self.reply({"ok": False, "msg": "缺关键词"}, 400)
            try:
                n = min(20, max(3, int(q.get("n", 8))))
            except ValueError:
                n = 8
            return self.reply(web_search(q["q"], n))
        if u.path == "/start":
            if not q.get("kw") and not q.get("asin"):
                return self.reply({"ok": False, "msg": "缺关键词或 ASIN"}, 400)
            jid = uuid.uuid4().hex[:10]
            p = {"kw": q.get("kw", ""), "market": q.get("market", "com"),
                 "pages": q.get("pages", 1), "limit": q.get("limit", 6),
                 "review_pages": q.get("review_pages", 2),
                 "asins": [a.strip() for a in q.get("asin", "").split(",") if a.strip()]}
            if p["asins"]:
                p["limit"] = str(len(p["asins"]))
            with LOCK:
                JOBS[jid] = {"state": "running", "log": ["已排入队列"], "rows": []}
            threading.Thread(target=job_worker, args=(jid, p), daemon=True).start()
            return self.reply({"ok": True, "id": jid})
        if u.path == "/poll":
            J = JOBS.get(q.get("id", ""))
            if not J:
                return self.reply({"ok": False, "msg": "任务不存在"}, 404)
            return self.reply({"ok": True, "state": J["state"], "log": J["log"][-3:],
                               "n": len(J.get("rows") or []),
                               "msg": J.get("msg", ""), "rows": J.get("rows") if J["state"] == "done" else [],
                               "products": J.get("products", [])})
        self.reply({"ok": False, "msg": "unknown path"}, 404)


def serve(port):
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"\n  抓取桥已启动 ·  http://127.0.0.1:{port}/health")
    print("  回到页面，在「自动补全 → 联网收集」里点一次：先联网认品类，再抓竞品。Ctrl+C 结束。\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("已停止")


def main():
    ap = argparse.ArgumentParser(description="Amazon 竞品 / 评论抓取桥")
    ap.add_argument("keyword", nargs="?")
    ap.add_argument("--asin", default="", help="逗号分隔的 ASIN，跳过搜索")
    ap.add_argument("--market", default="com", choices=sorted(MARKETS))
    ap.add_argument("--pages", type=int, default=1, help="搜索结果页数")
    ap.add_argument("--limit", type=int, default=6, help="抓评论的商品数")
    ap.add_argument("--review-pages", type=int, default=2, help="每个商品抓几页评论（每页 10 条）")
    ap.add_argument("--min-reviews", type=int, default=0)
    ap.add_argument("--engine", default="auto", choices=["auto", "scrapling", "urllib", "playwright"])
    ap.add_argument("--out-dir", default=".")
    ap.add_argument("--serve", action="store_true", help="起本地服务给网页用")
    ap.add_argument("--port", type=int, default=8765)
    a = ap.parse_args()

    if a.serve:
        return serve(a.port)
    if not a.keyword and not a.asin:
        ap.print_help()
        return

    asins = [x.strip() for x in a.asin.split(",") if x.strip()]
    t0 = time.time()
    try:
        comps, rows = crawl(a.keyword, asins, a.market, a.pages, a.limit,
                            a.review_pages, min_reviews=a.min_reviews, engine=a.engine)
    except RuntimeError as e:
        sys.exit("\n抓取失败：" + fail_tip(e))
    os.makedirs(a.out_dir, exist_ok=True)
    if not asins:
        with open(os.path.join(a.out_dir, "competitors.csv"), "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=SITE_FIELDS)
            w.writeheader()
            w.writerows(comps)
    with open(os.path.join(a.out_dir, "reviews.csv"), "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    print(f"\n{len(rows)} 条 → reviews.csv　耗时 {time.time() - t0:.0f}s")
    print("把 reviews.csv 拖回网页，或下次直接用 --serve 让页面自己抓。")


if __name__ == "__main__":
    main()
