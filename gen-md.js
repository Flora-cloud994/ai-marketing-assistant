/* 导出完整示例全案（Markdown），用于快速预览每一步的产出 */
const fs = require('fs');
const rd = f => fs.readFileSync(f, 'utf8');

const bundle = rd('core.js') + '\n' + rd('infer.js') + '\n' + rd('viz.js') + '\n' + rd('reviews-data.js') + '\n' + rd('review.js') + '\n' + rd('compete.js') + '\n' + rd('select.js') + '\n' + rd('crawler.js') + '\n' + rd('media.js') + '\n' + rd('aprompt.js') + '\n' + rd('doc.js') + '\n' + rd('tools.js') + '\n' + rd('emotion.js') +
  '\nmodule.exports={STEPS,T,buildReport};';
fs.writeFileSync('.tmp_all.js', bundle);
global.window = {};
const { STEPS, T, buildReport } = require('./.tmp_all.js');

const ctx = {
  product: '便携榨汁杯', category: '厨房小家电', market: '美国', platform: 'Amazon',
  price: '32', audience: '25–35 岁健身与通勤人群',
  points: '无线便携\n6 叶刀头 10 秒出汁\n一键自清洁\nType-C 快充'
};

const vals = {
  aimg: { slot: '全套（主图 + 6 张辅图）', style: '纯白棚拍', mk: '北美', product: '', mat: '' },
  detail: { brand: 'VITAFRESH', price: '32', p1: '一键自清洁，冲水 10 秒', p2: '6 叶不锈钢刀头，冰块也能打', p3: 'Type-C 快充，充满用一周', p4: '350g 超轻，单手可握', p5: '食品级材质，BPA Free' },
  pick: { aov: '32', budget: '3000', content: '中（能用模板）', supply: '稳定货源但无成本优势', brand: '先赚快钱' },
  ads: { cpm: '12', ctr: '1.6', cvr: '2.2', gm: '55', budget: '100' },
  metrics: { imp: '120000', click: '3200', visit: '2600', cart: '320', order: '62' },
  adsreview: { spend: '800', rev: '1600', orders: '45', gm: '55', imp: '60000', clicks: '900' },
  title: { main: 'portable blender', attr: 'USB-C rechargeable, 6 blades, self-cleaning', scene: 'for travel, gym, office' }
};

function toText(html) {
  let s = String(html || '');
  /* SVG 图表：保留 aria-label 作为图注，正文里不塞坐标点 */
  s = s.replace(/<svg[^>]*aria-label="([^"]*)"[\s\S]*?<\/svg>/g,
    (m, l) => '\n     【图】' + l + '（完整图表见应用内）\n');
  s = s.replace(/<svg[\s\S]*?<\/svg>/g, '（图见应用内）');
  s = s.replace(/<iframe[\s\S]*?<\/iframe>/g, '（此处为生成的完整详情页，请在应用内预览 / 下载 HTML）');
  s = s.replace(/<button[\s\S]*?<\/button>/g, '');
  s = s.replace(/<pre class="pcode py">([\s\S]*?)<\/pre>/g, (m, body) =>
    '\n（Python 脚本 ' + body.split('\n').length + ' 行，完整版在应用内「复制 / 下载」）\n');
  s = s.replace(/<br\s*\/?>/g, '\n');
  s = s.replace(/<\/(td|th)>/g, ' | ');
  s = s.replace(/<tr[^>]*>/g, '\n| ');
  s = s.replace(/<\/(p|div|li|h1|h2|h3|h4|section|article|header|footer)>/g, '\n');
  s = s.replace(/<li[^>]*>/g, '\n- ');
  s = s.replace(/<\/i>/g, ' · ');
  s = s.replace(/<\/b>/g, ' ');
  s = s.replace(/<h2[^>]*>/g, '\n## ');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  s = s.replace(/^\s*\|\s*$/gm, '');
  return s.trim();
}

let md = `# ${ctx.product}｜跨境电商 8 步执行全案\n\n`;
md += `> 市场：${ctx.market} ｜ 平台：${ctx.platform} ｜ 价格带：$${ctx.price} ｜ 人群：${ctx.audience}\n`;
md += `> 品类：${ctx.category} ｜ 卖点：${ctx.points.replace(/\n/g, ' / ')}\n`;
md += `> 生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
md += `> 第 01 部分为调研文档（竞品自动匹配），第 02–08 部分为 33 个可计算工具（含情绪三问、标签集合、视觉风格卡、社媒内容日历、日报推送）；商品图部分只产出提示词（按亚马逊官方图规），产品详情页为直接生成的成品，请打开 AI营销助手.html 查看与下载。\n\n---\n\n`;

STEPS.forEach((s, si) => {
  md += `# ${s.n} ${s.name}\n\n`;
  if (s.doc) {
    md += toText(buildReport(ctx)) + '\n\n---\n\n';
    return;
  }
  s.tools.forEach((tid, ti) => {
    const t = T[tid];
    const v = {};
    (t.inputs || []).forEach(i => {
      v[i.k] = (vals[tid] && vals[tid][i.k] !== undefined) ? vals[tid][i.k] : (i.def || '');
    });
    let html = '';
    try { html = (t.out(v, ctx) || {}).html || ''; } catch (e) { html = '（生成失败：' + e.message + '）'; }
    md += `## ${si + 1}.${ti + 1} ${t.name}\n\n${t.desc}\n\n${toText(html)}\n\n`;
  });
  md += `---\n\n`;
});

fs.writeFileSync('示例_便携榨汁杯_全案.md', md);
console.log('字数', md.length, '行数', md.split('\n').length);
