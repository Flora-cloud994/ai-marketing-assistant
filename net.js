/* =========================================================
   net.js — 联网层
   ---------------------------------------------------------
   问题：页面是 file:// 打开的，浏览器的同源策略（CORS）不允许它直接读
        so.com / amazon.com 的 HTML，所以「联网」必须有一个人帮忙转发。

   解法：把「转发」和「解析」拆开。
        转发只做一件事——把目标网页原样取回来（20 行代码，可部署一次永久用）；
        解析全部留在浏览器里（DOMParser），一套代码三档共用。

   三档自适应（probe 按顺序探测，谁通用谁）
     relay  ：自建中转（Cloudflare Worker 一行命令部署 / 本地 python 桥 8765）→ 全功能
     public ：公开 CORS 代理（免部署，第三方，可能被限流）→ 搜索结果 + 亚马逊在售页 + 建议词
     off    ：全断 → 内置基线，明说不是实时

   统一接口（全部 async，失败抛错，调用方决定降级）
     NETX.probe()            探测并返回 {mode, base, note}
     NETX.search(q, n)       联网搜一个词 → {ok, src, snips:[{t,s,w}]}
     NETX.amazon(kw, mk, n)  亚马逊在售页 → {ok, products:[{asin,title,price,rating,reviews}]}
     NETX.sug(prefix, mk)    亚马逊真实搜索建议词 → [string]
     NETX.reviews(asin, pg)  评论页 → [{asin,rating,title,body,date,verified,helpful}]
     NETX.workerSrc()        中转源码（面板里一键复制去部署）
   ========================================================= */
const NETX = (function () {
  const KEY = 'aimkt.net.v2';
  const DEF = { base: '', proxy: true, ttl: 30, auto: true, local: 'http://127.0.0.1:8765' };
  const cfg = Object.assign({}, DEF);
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }

  /* mode: relay | public | off ; base: 生效的中转地址 ; legacy: 本地 python 桥（接口不同） */
  const st = { mode: 'off', base: '', note: '', at: 0, legacy: false, ms: 0 };
  let probing = null;

  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { } }

  /* ---------- 底层取文本 ---------- */
  function rawFetch(url, ms, type) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms || 12000);
    return fetch(url, {
      signal: ctl.signal, cache: 'no-store', credentials: 'omit',
      headers: type === 'json' ? { Accept: 'application/json' } : {}
    }).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).finally(() => clearTimeout(t));
  }

  /* 公开代理：第三方转发服务，免部署但会被限流。直连排在最前，因为它失败得最快。 */
  const PROXY = [
    u => u,
    u => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
    u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    u => 'https://api.cors.lol/?url=' + encodeURIComponent(u)
  ];

  /* 取一个网页：中转 → 直连 → 各家公开代理，谁先给谁。maxTry 用来给探测限速 */
  async function txt(url, ms, maxTry) {
    const tries = [];
    if (st.mode === 'relay' && st.base && !st.legacy) {
      tries.push(st.base.replace(/\/+$/, '') + '/?u=' + encodeURIComponent(url));
    }
    if (cfg.proxy || !tries.length) PROXY.forEach(f => tries.push(f(url)));
    const list = maxTry ? tries.slice(0, maxTry) : tries;
    let err = '';
    for (const u of list) {
      try {
        const t = await rawFetch(u, ms || 12000);
        if (!t || t.length < 30) { err = '空响应'; continue; }
        return t;
      } catch (e) { err = (e && (e.name === 'AbortError' ? '超时' : e.message)) || '网络错误'; }
    }
    throw new Error(err || '取不到网页');
  }

  async function jget(url, ms, maxTry) {
    const t = await txt(url, ms, maxTry);
    const i = t.search(/[{\[]/);            /* 有的代理会塞进度提示前缀 */
    return JSON.parse(i > 0 ? t.slice(i) : t);
  }

  /* ---------- 探测 ---------- */
  function health(b, ms) {
    return rawFetch(b.replace(/\/+$/, '') + '/health', ms || 3500, 'json')
      .then(t => JSON.parse(t)).catch(() => null);
  }

  async function probe(force) {
    if (!force && st.mode !== 'off' && Date.now() - st.at < 120000) return st;
    if (probing) return probing;
    probing = (async () => {
      const t0 = Date.now();
      const reset = () => { st.base = ''; st.note = ''; st.legacy = false; };

      /* 1) 自建中转（云端 Worker 或本地桥），优先级最高：稳定、不限流 */
      const bases = [];
      /* https 页面（GitHub Pages）访问 http://127.0.0.1 会被浏览器当混合内容拦掉，
         探它只会白等一段超时，所以本地口只在 file:// 或 http:// 下才探 */
      const localOk = location.protocol !== 'https:';
      if (cfg.base && (localOk || /^https:/i.test(cfg.base))) bases.push(cfg.base);
      if (localOk) {
        if (cfg.local) bases.push(cfg.local);
        /* 8787 是 relay_node.js 的默认口：本机跑过它就自动接上，不用手填 */
        if (bases.indexOf('http://127.0.0.1:8787') < 0) bases.push('http://127.0.0.1:8787');
      }
      for (const b of bases) {
        const j = await health(b);
        if (j && j.ok) {
          st.mode = 'relay'; st.base = b.replace(/\/+$/, '');
          st.legacy = (j.app === 'amazon_bridge');
          st.note = st.legacy ? '本地抓取桥' : '自建中转';
          st.at = Date.now(); st.ms = st.at - t0;
          return st;
        }
      }

      /* 2) 公开源：能不能真拿到数据，用亚马逊建议接口试一下（小、快、无登录）。
            只用前两个代理、每个 4 秒，保证首屏最多等 8 秒就出结论 */
      reset();
      st.mode = 'public';
      try {
        const s = await sug('blender', 'com', 4000, 2);
        if (s && s.length >= 3) { st.note = '公开代理'; st.at = Date.now(); st.ms = st.at - t0; return st; }
      } catch (e) { }
      try {
        const w = await wiki('blender', 'en', 4000, 2);
        if (w && w.length >= 2) { st.note = '维基直连'; st.at = Date.now(); st.ms = st.at - t0; return st; }
      } catch (e) { }
      st.mode = 'off'; st.at = Date.now(); st.ms = st.at - t0;
      return st;
    })();
    /* 探测最多等 9.5 秒：宁可先按离线渲染，也不让首屏挂在一个不通的代理上 */
    const hard = new Promise(r => setTimeout(() => r(null), 9500));
    try {
      const r = await Promise.race([probing, hard]);
      if (!r) { st.mode = 'off'; st.base = ''; st.note = '探测超时'; st.at = Date.now(); }
      return st;
    } finally { probing = null; }
  }

  /* ---------- 搜索引擎（浏览器里解析，权重规则与 python 桥一致） ---------- */
  const ANCHOR = (q, snips) => {
    const s = String(q || '').trim();
    const body = snips.map(x => x.t + ' ' + x.s).join(' ');
    if (/[\u4e00-\u9fa5]/.test(s)) {
      const z = s.replace(/\s+/g, '');
      for (const L of [3, 2]) if (z.length >= L && body.indexOf(z.slice(-L)) > -1) return true;
      return false;
    }
    const ws = s.split(/\s+/).filter(w => w.length > 2);
    return !ws.length || ws.some(w => body.toLowerCase().indexOf(w.toLowerCase()) > -1);
  };

  function parseSerp(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out = [], seen = {};
    /* 一家一个结构：360 是 li.res-list，Bing 是 li.b_algo，百度是 div.result / div.c-container */
    const nodes = doc.querySelectorAll('li.res-list, li.b_algo, div.result, div.result-op, div.c-container');
    nodes.forEach(n => {
      const h = n.querySelector('h3') || n.querySelector('h2');
      if (!h) return;
      const t = (h.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length < 2) return;
      const ab = n.querySelector('.c-abstract, [class*="abstract"], p');
      const s = ((ab ? ab.textContent : n.textContent) || '').replace(/\s+/g, ' ').trim();
      if (s.length < 8) return;
      const key = t.slice(0, 26);
      if (seen[key]) return;
      seen[key] = 1;
      const a = n.querySelector('a[href]');
      const blob = ((a && a.getAttribute('href')) || '') + ' ' + s.slice(0, 160);
      /* 百科/词条/电商详情页往往是定义句或商品标题，判品类时权重更高 */
      const w = /baike|wikipedia|wiki\/|zhihu|jd\.com|taobao|tmall|soku|baike\.sogou/.test(blob) ? 2 : 1;
      out.push({ t: t.slice(0, 140), s: s.slice(0, 400), w });
    });
    return out;
  }

  async function serp(q, n) {
    const zh = /[\u4e00-\u9fa5]/.test(q);
    const clean = zh ? String(q).replace(/\s+/g, '') : String(q).trim();
    const enc = encodeURIComponent;
    /* 中文先百度（国内唯一稳定给结果的），再 360 / Bing；
       英文先 Bing，再 DuckDuckGo。谁先给就先信谁，但都要过「没被我拆词」自检 */
    const urls = zh
      ? [['baidu.com', 'https://www.baidu.com/s?wd=' + enc(clean)],
         ['so.com', 'https://www.so.com/s?q=' + enc(clean)],
         ['bing.com', 'https://cn.bing.com/search?q=' + enc(clean)]]
      : [['bing.com', 'https://www.bing.com/search?q=' + enc(clean) + '&setlang=en'],
         ['duckduckgo.com', 'https://html.duckduckgo.com/html/?q=' + enc(clean)]];
    let err = '';
    for (const [name, u] of urls) {
      try {
        const snips = parseSerp(await txt(u, 14000));
        if (snips.length < 3) { err = name + ' 没解析出结果'; continue; }
        if (!ANCHOR(clean, snips)) { err = name + ' 把这个词拆开查了，不足为凭'; continue; }
        return { ok: true, src: name + ' · ' + (st.mode === 'relay' ? '中转' : '公开代理'), snips: snips.slice(0, n || 10) };
      } catch (e) { err = name + '：' + (e.message || '打不开'); }
    }
    /* 搜索页全都打不开时的兜底：维基条目本身就是定义句，判品类够用 */
    try {
      const w = await wiki(clean, zh ? 'zh' : 'en', 8000);
      if (w.length >= 2) return { ok: true, src: '维基百科 · 条目', snips: w.slice(0, n || 10) };
    } catch (e) { }
    return { ok: false, msg: '没拿到可用结果（' + err + '）' };
  }

  async function wiki(q, lang, ms, maxTry) {
    const u = 'https://' + (lang || 'zh') + '.wikipedia.org/w/api.php?action=query&list=search'
      + '&srsearch=' + encodeURIComponent(q) + '&srlimit=8&srprop=snippet&format=json&origin=*';
    const j = await jget(u, ms || 8000, maxTry);
    return ((j && j.query && j.query.search) || []).map(x => ({
      t: x.title,
      s: String(x.snippet || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      w: 2
    }));
  }

  async function search(q, n) {
    if (!String(q || '').trim()) return { ok: false, msg: '缺关键词' };
    /* 本地 python 桥自带搜索接口（解析更稳），优先用它 */
    if (st.mode === 'relay' && st.legacy) {
      try {
        const j = await jget(st.base + '/search?q=' + encodeURIComponent(q) + '&n=' + (n || 10), 25000);
        if (j && j.ok) return { ok: true, src: (j.src || '本地桥') + ' · 本地桥', snips: j.snips || [] };
        if (j && j.msg) return { ok: false, msg: j.msg };
      } catch (e) { }
    }
    return serp(q, n);
  }

  /* ---------- 亚马逊 ---------- */
  const MID = {
    com: 'ATVPDKIKX0DER', 'co.uk': 'A1F83G8C2ARO7P', de: 'A1PA6795UKMFR9', fr: 'A13V1IB3VIYZZH',
    it: 'APJ6JRA9NG5V4', es: 'A1RKKUPIHCS9HS', nl: 'A1805IZSGTT6HS', se: 'A2NODRKZP88ZB9',
    pl: 'A1C3SOZRARQ6R3', ca: 'A2EUQ1WTGCTBG2', 'com.mx': 'A1AM78C64UM0Y8', 'com.br': 'A2Q3Y263D00KWC',
    ae: 'A2VIGQ35RCS4UG', sa: 'A17E79C6D8DWNP', 'com.au': 'A39IBJ37TRP1C6', in: 'A21TJRUUN4KGV',
    sg: 'A19VAU5U5O7RUS'
  };

  async function sug(prefix, market, ms, maxTry) {
    const mid = MID[market] || MID.com;
    const loc = (market === 'de' || market === 'fr' || market === 'it' || market === 'es') ? 'en_US' : 'en_US';
    const u = 'https://completion.amazon.com/api/2017/suggestions?session-id=1&customer-id=&request-id=1'
      + '&page-type=Gateway&lop=' + loc + '&site-variant=desktop&client-info=amazon-search-ui'
      + '&mid=' + mid + '&alias=aps&b2b=0&fresh=0&ks=71&prefix=' + encodeURIComponent(prefix)
      + '&event=onKeyPress&limit=11&suggestion-type=WIDGET&suggestion-type=KEYWORD';
    const j = await jget(u, ms || 8000, maxTry);
    return ((j && j.suggestions) || []).map(x => String(x.value || '').trim()).filter(Boolean);
  }

  function num(v) {
    const s = String(v == null ? '' : v).replace(/[^\d.,]/g, '').replace(/,/g, '');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  function parseAmazon(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out = [], seen = {};
    doc.querySelectorAll('div[data-component-type="s-search-result"], div.s-result-item[data-asin]').forEach(el => {
      const asin = (el.getAttribute('data-asin') || '').trim();
      if (!asin || seen[asin]) return;
      const h2 = el.querySelector('h2');
      const title = h2 ? (h2.textContent || '').replace(/\s+/g, ' ').trim() : '';
      if (!title) return;
      const pEl = el.querySelector('.a-price .a-offscreen') || el.querySelector('.a-price-whole');
      const rEl = el.querySelector('span.a-icon-alt') || el.querySelector('[aria-label*="out of 5"]');
      const cEl = el.querySelector('a[aria-label*="ratings"], a[href*="#customerReviews"] span, span.s-underline-text');
      seen[asin] = 1;
      out.push({
        asin, title: title.slice(0, 180),
        price: num(pEl ? pEl.textContent : ''),
        rating: num((rEl ? (rEl.getAttribute('aria-label') || rEl.textContent) : '').replace(/out of 5/i, '')),
        reviews: Math.round(num(cEl ? cEl.textContent : ''))
      });
    });
    return out;
  }

  /* 亚马逊的三种「空壳」：人机验证、机器人页、直接 503。
     认出来才好给准确提示 —— 说「没解析出商品」等于没说。 */
  const BLOCKED = /bm-verify|api-services-support|Enter the characters you see|Robot Check|captcha|To discuss automated access/i;

  /* 搜索结果总数 = 「在售卖家数」的真实来源（供需账的分母）。
     页头写法：1-16 of over 2,000 results for "xxx" ，
     也见过 1-16 of 2,000 results / 5.000 Ergebnisse（欧式千分位点）。 */
  function resultCount(html) {
    const t = String(html || '');
    let m = t.match(/of\s+(?:over\s+)?([\d.,\u00a0\s]+)\s*results?/i);
    if (!m) m = t.match(/([\d.,\u00a0\s]+)\s*results?\s+for/i);
    if (!m) return 0;
    const digits = (m[1] || '').replace(/[^\d]/g, '');
    const n = parseInt(digits, 10);
    return isFinite(n) && n > 0 ? n : 0;
  }

  async function amazon(kw, market, limit) {
    const mk = market || 'com';
    const u = 'https://www.amazon.' + mk + '/s?k=' + encodeURIComponent(kw) + '&language=en_US';
    let html = '';
    /* 机房的 IP 常被抽查：给一次重试，很多情况下第二次就放行了 */
    for (let i = 0; i < 2; i++) {
      try { html = await txt(u, 16000); }
      catch (e) { return { ok: false, msg: '打不开亚马逊在售页（' + e.message + '）' }; }
      if (parseAmazon(html).length || !BLOCKED.test(html)) break;
      await new Promise(r => setTimeout(r, 1400));
    }
    const rows = parseAmazon(html).slice(0, limit || 6);
    if (!rows.length) {
      const blocked = BLOCKED.test(html);
      return { ok: false, msg: blocked ? '亚马逊要人机验证（出口 IP 被抽查，过一会儿再来或改用本机桥）' : '页面打开了但没解析出商品' };
    }
    return { ok: true, products: rows, results: resultCount(html), src: st.mode === 'relay' ? '中转' : '公开代理' };
  }

  function parseReviews(html, asin) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out = [];
    doc.querySelectorAll('[data-hook="review"]').forEach(el => {
      const q = s => el.querySelector(s);
      const body = (q('[data-hook="review-body"]') || {}).textContent || '';
      const ttl = (q('[data-hook="review-title"]') || {}).textContent || '';
      const star = (q('[data-hook="review-star-rating"], i.a-icon-star') || {}).textContent || '';
      const d = (q('[data-hook="review-date"]') || {}).textContent || '';
      if (!body && !ttl) return;
      out.push({
        asin,
        rating: (star.match(/([1-5](?:\.\d)?)/) || [])[1] || '',
        title: ttl.replace(/^\s*[\d.]+\s*out of 5 stars\s*/i, '').slice(0, 120),
        body: body.replace(/\s*(Read more|Read less)\s*$/, '').trim().slice(0, 1200),
        date: d.replace(/^.*on\s+/i, '').trim(),
        verified: q('[data-hook="avp-badge"]') ? 'Yes' : 'No',
        helpful: Math.round(num((q('[data-hook="helpful-vote-statement"]') || {}).textContent || ''))
      });
    });
    return out;
  }

  async function reviews(asin, page) {
    const u = 'https://www.amazon.com/product-reviews/' + encodeURIComponent(asin)
      + '/?pageNumber=' + (page || 1) + '&reviewerType=all_reviews&sortBy=recent';
    const html = await txt(u, 16000);
    return parseReviews(html, asin);
  }

  /* ---------- 中转源码：面板里一键复制，粘到 Cloudflare Workers 就能永久在线 ---------- */
  function workerSrc() {
    return [
      'export default {',
      '  async fetch(req) {',
      '    const cors = {',
      "      'Access-Control-Allow-Origin': '*',",
      "      'Access-Control-Allow-Headers': '*',",
      "      'Access-Control-Allow-Methods': 'GET,OPTIONS'",
      '    };',
      "    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });",
      '    const u = new URL(req.url);',
      "    if (u.pathname === '/health') return json({ ok: true, app: 'relay' }, cors);",
      "    const target = u.searchParams.get('u');",
      "    if (!target) return json({ ok: false, msg: 'need ?u=' }, cors, 400);",
      '    let host = "";',
      '    try { host = new URL(target).hostname; } catch (e) { return json({ ok: false, msg: "bad url" }, cors, 400); }',
      '    const allow = /(^|\\.)(amazon\\.[a-z.]+|so\\.com|bing\\.com|baidu\\.com|sogou\\.com|duckduckgo\\.com|wikipedia\\.org|datamuse\\.com)$/;',
      "    if (!allow.test(host)) return json({ ok: false, msg: 'host not allowed: ' + host }, cors, 403);",
      '    const CUR = {',
      "      'amazon.com': 'USD', 'amazon.co.uk': 'GBP', 'amazon.de': 'EUR', 'amazon.fr': 'EUR',",
      "      'amazon.it': 'EUR', 'amazon.es': 'EUR', 'amazon.nl': 'EUR', 'amazon.se': 'SEK',",
      "      'amazon.pl': 'PLN', 'amazon.ca': 'CAD', 'amazon.com.mx': 'MXN', 'amazon.com.br': 'BRL',",
      "      'amazon.ae': 'AED', 'amazon.sa': 'SAR', 'amazon.com.au': 'AUD', 'amazon.in': 'INR', 'amazon.sg': 'SGD'",
      '    };',
      '    const headers = {',
      "      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',",
      "      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',",
      "      'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8'",
      '    };',
      '    /* 不加这个 Cookie，亚马逊会按出口 IP 的国家把价格换成当地货币（国内 IP 给人民币），',
      '       算出来的价格带就跟市场对不上 */',
      "    if (/amazon\\./.test(host)) headers.Cookie = 'i18n-prefs=' + (CUR[host.replace(/^www\\./, '')] || 'USD') + '; lc-main=en_US';",
      '    const r = await fetch(target, { headers, redirect: "follow" });',
      '    const body = await r.text();',
      '    return new Response(body, {',
      "      status: 200, headers: { ...cors, 'Content-Type': r.headers.get('content-type') || 'text/html; charset=utf-8' }",
      '    });',
      '  }',
      '};',
      'function json(o, cors, code) {',
      "  return new Response(JSON.stringify(o), { status: code || 200, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });",
      '}'
    ].join('\n');
  }

  return {
    cfg, st, saveCfg, probe,
    get mode() { return st.mode; },
    get base() { return st.base; },
    canCrawl() { return st.mode === 'relay' || st.mode === 'public'; },
    label() {
      if (st.mode === 'relay') return { t: st.legacy ? '实时 · 本地桥' : '实时 · 中转', tone: 'on' };
      if (st.mode === 'public') return { t: '实时 · 公开源', tone: 'pub' };
      return { t: '离线 · 内置基线', tone: 'off' };
    },
    search, amazon, sug, reviews, wiki, workerSrc, txt
  };
})();
