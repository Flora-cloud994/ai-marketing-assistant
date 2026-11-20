/* relay_worker.js — 由 sync-worker.js 从 net.js 生成，勿手改
 * 用途：给 file:// 打开的页面做跨域转发（页面只负责取网页，解析在浏览器里做）
 * 部署：Cloudflare Dashboard → Workers & Pages → Create Worker → 粘贴全文 → Deploy
 *      然后把 xxx.workers.dev 填进页面右上角的「中转地址」
 */
export default {
  async fetch(req) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const u = new URL(req.url);
    if (u.pathname === '/health') return json({ ok: true, app: 'relay' }, cors);
    const target = u.searchParams.get('u');
    if (!target) return json({ ok: false, msg: 'need ?u=' }, cors, 400);
    let host = "";
    try { host = new URL(target).hostname; } catch (e) { return json({ ok: false, msg: "bad url" }, cors, 400); }
    const allow = /(^|\.)(amazon\.[a-z.]+|so\.com|bing\.com|baidu\.com|sogou\.com|duckduckgo\.com|wikipedia\.org|datamuse\.com)$/;
    if (!allow.test(host)) return json({ ok: false, msg: 'host not allowed: ' + host }, cors, 403);
    const CUR = {
      'amazon.com': 'USD', 'amazon.co.uk': 'GBP', 'amazon.de': 'EUR', 'amazon.fr': 'EUR',
      'amazon.it': 'EUR', 'amazon.es': 'EUR', 'amazon.nl': 'EUR', 'amazon.se': 'SEK',
      'amazon.pl': 'PLN', 'amazon.ca': 'CAD', 'amazon.com.mx': 'MXN', 'amazon.com.br': 'BRL',
      'amazon.ae': 'AED', 'amazon.sa': 'SAR', 'amazon.com.au': 'AUD', 'amazon.in': 'INR', 'amazon.sg': 'SGD'
    };
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8'
    };
    /* 不加这个 Cookie，亚马逊会按出口 IP 的国家把价格换成当地货币（国内 IP 给人民币），
       算出来的价格带就跟市场对不上 */
    if (/amazon\./.test(host)) headers.Cookie = 'i18n-prefs=' + (CUR[host.replace(/^www\./, '')] || 'USD') + '; lc-main=en_US';
    const r = await fetch(target, { headers, redirect: "follow" });
    const body = await r.text();
    return new Response(body, {
      status: 200, headers: { ...cors, 'Content-Type': r.headers.get('content-type') || 'text/html; charset=utf-8' }
    });
  }
};
function json(o, cors, code) {
  return new Response(JSON.stringify(o), { status: code || 200, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
}
