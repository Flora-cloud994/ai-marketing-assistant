/* 生成演示产出：调研报告 HTML、产品详情页 HTML、亚马逊商品图提示词（md） */
const fs = require('fs');
const path = require('path');

const rd = f => fs.readFileSync(f, 'utf8');
const bundle = [rd('core.js'), rd('infer.js'), rd('viz.js'), rd('reviews-data.js'), rd('review.js'), rd('compete.js'), rd('select.js'), rd('crawler.js'), rd('media.js'), rd('aprompt.js'), rd('doc.js'), rd('tools.js'), rd('emotion.js')].join('\n')
  + '\nmodule.exports={buildReport,pageHTML,azMain,azNeg,azSlotList,azAplus,azCtx,azAllText};';
fs.writeFileSync('.tmp_bundle.js', bundle);
const { buildReport, pageHTML, azMain, azNeg, azSlotList, azAplus, azCtx, azAllText } = require('./.tmp_bundle.js');

const ctx = {
  product: '便携榨汁杯', category: '厨房小家电', market: '美国', platform: 'Amazon',
  price: '32', audience: '25–35 岁健身与通勤人群',
  points: '无线便携\n6 叶刀头 10 秒出汁\n一键自清洁\nType-C 快充'
};
const V = { style: '纯白棚拍', mk: '北美', slot: '全套（主图 + 6 张辅图）' };

const OUT = '示例产出';
fs.mkdirSync(OUT, { recursive: true });

/* 1. 调研报告（可打印 / 存 PDF） */
const css = rd('styles.css');
const report = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>便携榨汁杯 · 美国市场选品调研报告</title>
<style>${css}
body{background:#fff}
@media print{body{background:#fff}}
</style></head><body>
<div class="main" style="max-width:1020px;margin:0 auto;padding:34px 26px 60px">
${buildReport(ctx)}
</div></body></html>`;
fs.writeFileSync(path.join(OUT, '选品调研报告.html'), report);

/* 2. 产品详情页（英文成品，可直接上传独立站） */
const page = pageHTML(ctx, {
  brand: 'VITAFRESH', price: '$32',
  points: ['一键自清洁，冲水 10 秒', '6 叶不锈钢刀头，冰块也能打', 'Type-C 快充，充满用一周'],
  h1: 'Portable Blender — Rinse it out. Done in 10 seconds.',
  img: ''
});
fs.writeFileSync(path.join(OUT, '产品详情页.html'), page);

/* 3. 亚马逊商品图提示词（主图 + 6 辅图 + A+，md 版方便读） */
const A = azCtx(V, ctx);
const L = azSlotList(A), P = azAplus(A);
const md = [
  `# 亚马逊商品图提示词 · ${ctx.product}`,
  '',
  `> 品类：${A.cat}　风格：${V.style}　市场：${V.mk}　平台：Amazon`,
  '> 官方硬指标：主图纯白底 RGB 255/255/255、商品占画面 85%、完整不裁切、单一角度、无文字水印边框、最长边 ≥1600px（500–10000）、1:1、JPEG ≤10MB。',
  '',
  '## MAIN 主图（搜索结果里显示的就是这张）',
  '',
  '```text',
  azMain(A),
  '```',
  '',
  '### 通用负向提示词',
  '',
  '```text',
  azNeg(),
  '```',
  '',
  '## 六张辅图',
  '',
  ...L.flatMap(x => [`### ${x.no} ${x.name}`, '', `*用途：${x.use}*`, '', '```text', x.en, '```', '', `注意：${x.note}`, '']),
  '## A+ 内容图（这里才允许出现文字）',
  '',
  ...P.flatMap(x => [`### ${x.no} ${x.name}`, '', `*${x.note}*`, '', '```text', x.en, '```', '']),
  '## 出图参数',
  '',
  '| 项目 | 设置 |',
  '|---|---|',
  '| Midjourney | `--ar 1:1 --style raw --s 50 --q 2` |',
  '| Flux / 即梦 / Seedream | 2048×2048，steps 30，guidance 3.5 |',
  '| 导出 | JPEG · sRGB · 质量 90 · 最长边 ≥1600px · ≤10MB |',
  '| 命名 | `B0XXXXXXXX.MAIN.jpg` / `.PT01.jpg` … `.PT06.jpg` |',
  '| 数量 | ≥6 张图 + 1 条视频（官方建议） |',
  '',
  '## 发布前自检',
  '',
  '1. 四角取色必须 255/255/255，254 也会被判非纯白背景',
  '2. 产品外接框面积 ≥85%，四周留白均匀',
  '3. 产品四条边都不出框、不裁切',
  '4. 画面里只有一个产品、一个角度',
  '5. 放大 200% 检查：无小字、无水印、无 logo、无边框、无色块',
  '6. 无道具、无手、无模特（成人服装除外）、无包装（包装本身是卖点除外）',
  '7. 最长边 ≥1600px，JPEG，sRGB，≤10MB',
  '8. 文件名 商品编码.MAIN.jpg，用句点分隔',
  '9. 辅图无竞品品牌、无评价截图、无五星图案、无 free shipping 之类宣称',
  '10. 每张图与标题描述一致：颜色、数量、尺寸、材质',
  '',
  '> 合规提醒：亚马逊要求主图是**实际商品的真实专业照片**，明确排除图形、插画、实物模型、占位图。纯 AI 生成的虚构产品图有被判不合规的风险 —— 主图提示词请当拍摄脚本交给摄影师；辅图的场景可以 AI 出图，再把实拍产品合成上去。',
  ''
].join('\n');
fs.writeFileSync(path.join(OUT, '亚马逊商品图提示词.md'), md);
fs.writeFileSync(path.join(OUT, '亚马逊商品图提示词.txt'), azAllText(V, ctx));

console.log('报告', (report.length / 1024).toFixed(0) + 'KB',
  '| 详情页', (page.length / 1024).toFixed(0) + 'KB',
  '| 提示词 md', (md.length / 1024).toFixed(0) + 'KB',
  '| 主图字符', azMain(A).length);
