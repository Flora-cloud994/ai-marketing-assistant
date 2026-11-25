/* 打包单文件版：把 css 与全部 js 内联进 dist/AI营销助手.html */
const fs = require('fs');
const rd = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

const ORDER = ['core.js', 'net.js', 'infer.js', 'subs.js', 'viz.js', 'reviews-data.js', 'review.js', 'compete.js', 'select.js', 'supply.js', 'audit.js', 'crawler.js', 'media.js', 'aprompt.js', 'doc.js', 'tools.js', 'emotion.js', 'app.js'];

let html = rd('index.html');
const css = rd('styles.css');
const js = ORDER.map(rd);

/* 附录里的 python 源码必须与 scripts/amazon_bridge.py 一致 */
const py = rd('scripts/amazon_bridge.py');
if (!js.join('\n').includes(JSON.stringify(py))) {
  throw new Error('crawler.js 的 PY_BRIDGE 与 scripts/amazon_bridge.py 不同步，先跑 node sync-py.js');
}

html = html.replace('<link rel="stylesheet" href="styles.css">', () => '<style>\n' + css + '\n</style>');

// 把所有 <script src="..."></script> 整段替换为内联脚本
const block = js.map(s => '<script>\n' + s + '\n</' + 'script>').join('\n');
if (!/<script src="/.test(html)) throw new Error('index.html 里没有外链脚本可替换');
html = html.replace(/[ \t]*<script src="[^"]+"><\/script>\r?\n?/g, '');
// 注意：内联后的 js 里可能有 "</body>" 字符串，必须插到最后一个 </body> 之前
const at = html.lastIndexOf('</body>');
if (at < 0) throw new Error('找不到 </body>');
html = html.slice(0, at) + block + '\n' + html.slice(at);

if (/<script src=/.test(html) || /<link rel="stylesheet"/.test(html)) throw new Error('仍有外链资源');

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/AI营销助手.html', html);

/* GitHub Pages 的站点根目录：文件名必须是 index.html，
   不然线上地址会带一串 %E8%90%A5... 的中文编码，分享出去很难看 */
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/index.html', html);
/* 让 Pages 跳过 Jekyll 处理（单文件用不上，但能省掉一次构建失败的风险） */
const nojekyll = 'docs/.nojekyll';
if (!fs.existsSync(nojekyll)) fs.writeFileSync(nojekyll, '');

console.log('打包完成', (html.length / 1024).toFixed(1) + 'KB',
  '| 脚本块', (html.match(/<script>/g) || []).length,
  '| 外链', (html.match(/https?:\/\/[^"']+\.(js|css)/g) || []).length,
  '| docs/index.html 已同步');
