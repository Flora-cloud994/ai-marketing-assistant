/* 从 net.js 里的 NETX.workerSrc() 生成 scripts/relay_worker.js，
   保证「面板里复制的源码」和「仓库里的文件」永远一致。改中转代码只改 net.js。 */
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync('net.js', 'utf8');
const sandbox = {
  localStorage: { getItem: () => null, setItem: () => { } },
  fetch: () => Promise.reject(new Error('stub')),
  DOMParser: function () { },
  AbortController: function () { this.abort = () => { }; this.signal = null; },
  setTimeout, clearTimeout, console
};
const ctx = vm.createContext(sandbox);
vm.runInContext(src + '\n;globalThis.__W = NETX.workerSrc();', ctx);

const head = '/* relay_worker.js — 由 sync-worker.js 从 net.js 生成，勿手改\n'
  + ' * 用途：给 file:// 打开的页面做跨域转发（页面只负责取网页，解析在浏览器里做）\n'
  + ' * 部署：Cloudflare Dashboard → Workers & Pages → Create Worker → 粘贴全文 → Deploy\n'
  + ' *      然后把 xxx.workers.dev 填进页面右上角的「中转地址」\n'
  + ' */\n';
fs.mkdirSync('scripts', { recursive: true });
fs.writeFileSync('scripts/relay_worker.js', head + ctx.__W + '\n');
console.log('已生成 scripts/relay_worker.js', ctx.__W.split('\n').length, '行');
