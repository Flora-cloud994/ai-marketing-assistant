/* 把 scripts/amazon_bridge.py 同步进 crawler.js 的 PY_BRIDGE，避免手写转义出错 */
const fs = require('fs');
const py = fs.readFileSync('scripts/amazon_bridge.py', 'utf8').replace(/\r\n/g, '\n');
const file = 'crawler.js';
let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const lit = '/*PY_BRIDGE_START*/\nconst PY_BRIDGE = ' + JSON.stringify(py) + ';\n/*PY_BRIDGE_END*/';
if (!/\/\*PY_BRIDGE_START\*\/[\s\S]*?\/\*PY_BRIDGE_END\*\//.test(src)) throw new Error('crawler.js 里没有同步标记');
src = src.replace(/\/\*PY_BRIDGE_START\*\/[\s\S]*?\/\*PY_BRIDGE_END\*\//, () => lit);
fs.writeFileSync(file, src);
console.log('已同步 PY_BRIDGE：' + py.split('\n').length + ' 行 / ' + (py.length / 1024).toFixed(1) + 'KB');
