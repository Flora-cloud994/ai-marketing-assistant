#!/usr/bin/env node
/* relay_node.js — 零依赖转发器（本地版，备用）
 *
 * 和 Cloudflare Worker 版（relay_worker.js）功能完全一样：只代取网页，不做解析。
 * 用途：手上只有 Node、又不想注册云账号时，先跑这个，页面右上角「中转地址」填
 *       http://127.0.0.1:8787
 *
 * 启动：node scripts/relay_node.js
 * 自检：浏览器打开 http://127.0.0.1:8787/health 应返回 {"ok":true,...}
 */
const http = require('http');

const PORT = Number(process.env.PORT || 8787);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const ALLOW = /(^|\.)(amazon\.[a-z.]+|so\.com|bing\.com|baidu\.com|sogou\.com|duckduckgo\.com|wikipedia\.org|datamuse\.com)$/;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
};

function json(res, o, code) {
  res.writeHead(code || 200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors));
  res.end(JSON.stringify(o));
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/health') return json(res, { ok: true, app: 'relay' });

  const target = u.searchParams.get('u');
  if (!target) return json(res, { ok: false, msg: 'need ?u=' }, 400);
  let host = '';
  try { host = new URL(target).hostname; } catch (e) { return json(res, { ok: false, msg: 'bad url' }, 400); }
  if (!ALLOW.test(host)) return json(res, { ok: false, msg: 'host not allowed: ' + host }, 403);

  const CUR = {
    'amazon.com': 'USD', 'amazon.co.uk': 'GBP', 'amazon.de': 'EUR', 'amazon.fr': 'EUR',
    'amazon.it': 'EUR', 'amazon.es': 'EUR', 'amazon.nl': 'EUR', 'amazon.se': 'SEK',
    'amazon.pl': 'PLN', 'amazon.ca': 'CAD', 'amazon.com.mx': 'MXN', 'amazon.com.br': 'BRL',
    'amazon.ae': 'AED', 'amazon.sa': 'SAR', 'amazon.com.au': 'AUD', 'amazon.in': 'INR', 'amazon.sg': 'SGD'
  };
  const headers = {
    'User-Agent': UA,
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8'
  };
  /* 按出口 IP 亚马逊会给国内 IP 报人民币，必须显式钉住市场货币 */
  if (/amazon\./.test(host)) headers.Cookie = 'i18n-prefs=' + (CUR[host.replace(/^www\./, '')] || 'USD') + '; lc-main=en_US';

  try {
    const r = await fetch(target, { headers });
    const body = await r.text();
    res.writeHead(200, Object.assign({
      'Content-Type': r.headers.get('content-type') || 'text/html; charset=utf-8'
    }, cors));
    res.end(body);
  } catch (e) {
    json(res, { ok: false, msg: String(e && e.message || e) }, 502);
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log('  转发器已启动 · http://127.0.0.1:' + PORT + '/health');
  console.log('  回到页面右上角「联网」→ 中转地址填 http://127.0.0.1:' + PORT);
});
