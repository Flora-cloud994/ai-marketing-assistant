/* =========================================================
   review.js — 评论数据：解析 / 统计 / 痛点聚类 / 章节渲染
   支持三种数据来源：
     1) 内置样本（reviews-data.js），按品类自动匹配
     2) 粘贴文本（Amazon 页面直接复制）
     3) 上传 CSV（卖家精灵 / Helium 10 / 自己的脚本导出）
   ========================================================= */

/* ---------- 痛点词典（中英双语） ----------
   顺序即优先级：先匹配具体问题，再匹配泛化的「质量差」。
   一条评论允许多类命中（「杯子裂了还漏水」= 质量 + 密封）。 */
const RV_PAIN = [
  ['物流破损', /(破损|压坏|包装|缺件|没收到|碎)/,
    /(damaged|broken in (transit|shipping)|arrived (broken|damaged|cracked)|dented box|missing (part|piece|pieces)|packaging (was|is) (bad|poor|thin))/i,
    '加固包装：改用蜂窝纸内衬 + 独立隔层，并在详情页写明「破损免举证补发」。'],

  ['售后 / 客服', /(客服|售后|退|保修|响应|订阅)/,
    /(customer service|no response|never (replied|heard back)|return|refund|warranty|support (was|is) (useless|terrible)|subscription)/i,
    '把售后变成卖点：首页固定「30 天无理由 + 12 个月换新」，并在包裹内放一张售后二维码卡片。'],

  ['漏水 / 密封', /(漏水|漏气|漏|密封|渗|卡扣|拉链)/,
    /(leak|leaked|leaking|spill|spilled|seal|gasket|not sealed|lid (does not|will not|would not) (seal|close)|zipper (split|broke|stuck))/i,
    '密封是最容易验证的差异点：拍「装满倒置 24 小时」实拍，并把密封圈做成可拆换耗材。'],

  ['续航 / 充电', /(续航|充电|电池|电量|充不进|断连)/,
    /(battery|charge|charging|will not charge|does not charge|dies (so |too )?(fast|quick)|lasts? only|run time|deflet|drain)/i,
    '用真实场景替代毫安时：标注「混合场景连续 X 杯 / X 天」，并把充电接口统一为 USB-C。'],

  ['清洗麻烦', /(清洗|难洗|洗后|残留|异味|味道|发霉|发臭)/,
    /(hard to clean|difficult to clean|cannot clean|impossible to clean|residue|mold|mould|smell|smelly|odor|odour|stuck (under|in)|gunk|scrub)/i,
    '把「好洗」拍成一个动作：加水、按一下、冲掉，10 秒内完成，做成主图第 2 张与短视频前三秒。'],

  ['噪音 / 发热', /(噪音|吵|声音|发热|烫)/,
    /(loud|noisy|overheat|too hot|hot to (the )?touch|screech|sounds like|humming)/i,
    '给可测量指标：实测分贝写进五点（≤62dB），并拍「清晨在婴儿房使用」的场景。'],

  ['尺寸 / 容量', /(容量|尺寸|太小|偏小|偏大|体积|占位|不合|偏重|重)/,
    /(too small|too big|smaller than|larger than|heavier than|bulky|does not fit|takes up|size chart)/i,
    '尺寸最容易退货：主图放「与常见物品同框」比例图，参数表逐项标注实测长宽高与克重。'],

  ['描述不符', /(不符|与描述|差距|说明|误|骗|色差|透)/,
    /(not as described|misleading|different from (the )?(picture|photo|description)|looks nothing like|colour|color (is|was) (off|different))/i,
    '落差来自过度修图：改用真实使用场景拍摄，色差控制在 ΔE<3，减少「收到就退」。'],

  ['效果不达标', /(打不碎|不转|没效果|无感|吸力不足|亮度衰减|掉色|不稳|掉档|卡|松脱|无效)/,
    /(does not work|did not work|not work|weak|not powerful|ineffective|useless|barely|no suction|will not blend|not strong enough|stopped spinning)/i,
    '把效果做成对比：同角度「用前/用后」+ 三组硬测试（冰块、冻果、坚果），比形容词有效十倍。'],

  ['质量 / 耐用', /(坏|烧|裂|断|生锈|松|掉漆|不耐用|质量|变形|塌|发黄|起球|勾丝|虚标)/,
    /(broke|broken|stopped working|died|dead|crack|cracked|snapped|fell apart|flimsy|cheap(ly)? (made|plastic)|rust|peel|chipped|bent|worn out|not durable|poor quality|shrank|pilling)/i,
    '把耐用做成可验证承诺：公开电机/结构测试次数，给 12 个月只换不修，第 4 张主图放内部结构实拍。']
];

const RV_STOP = new Set(`the and for with this that from have has had was were are is be been being it its it's my me our your their they them we you i a an of to in on at as or but not no so very really just too much more most can could would should will did do does done than then there here when what which who how all any some out up down off over after before again also about into only own same such if because while during both few other more most own too s t don now`.split(/\s+/).filter(Boolean));

/* ---------- 通用小工具 ---------- */
const RV_MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad2 = n => (n < 10 ? '0' : '') + n;

/* 日期 → YYYY-MM，支持 2026-08-14 / August 14, 2026 / 14 August 2026 / 8/14/2026 */
function rvDate(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  let m = t.match(/(\d{4})[-\/](\d{1,2})(?:[-\/](\d{1,2}))?/);
  if (m) return m[1] + '-' + pad2(+m[2]);
  m = t.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) { const mo = RV_MON[m[1].slice(0, 3).toLowerCase()]; if (mo) return m[3] + '-' + pad2(mo); }
  m = t.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (m) { const mo = RV_MON[m[2].slice(0, 3).toLowerCase()]; if (mo) return m[3] + '-' + pad2(mo); }
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + pad2(+m[1]);
  m = t.match(/(\d{4})/);
  if (m) return m[1] + '-01';
  return '';
}

/* 星级解析："5.0 out of 5 stars" / "4" / "五星" / "" */
function rvStar(s) {
  const t = String(s || '');
  const m = t.match(/([1-5])(?:\.\d)?\s*(?:out of 5|星|\/5|stars?)/i) || t.match(/^\s*([1-5])(?:\.\d)?\s*$/);
  if (m) return +m[1];
  const n = parseFloat(t.replace(/[^\d.]/g, ''));
  return n >= 1 && n <= 5 ? Math.round(n) : 0;
}

function rvClassify(text) {
  const s = String(text || '');
  const hit = [];
  for (const [k, cn, en] of RV_PAIN) if (cn.test(s) || en.test(s)) hit.push(k);
  return hit;
}

function rvNorm(x) {
  return { prod: String(x.prod || x.asin || '').trim(), rating: rvStar(x.rating), date: rvDate(x.date), title: String(x.title || '').trim(), body: String(x.body || '').trim(), verified: x.verified, helpful: +x.helpful || 0 };
}

/* ---------- CSV 解析（支持引号内逗号与换行） ---------- */
function rvCSV(text) {
  const src = String(text || '').replace(/^\ufeff/, '');
  const head = (src.split(/\r?\n/)[0] || '');
  const delim = (head.split('\t').length > head.split(',').length) ? '\t' : (head.split(';').length > head.split(',').length ? ';' : ',');
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim()));
}

const RV_COL = [
  [['rating', 'stars', 'star', 'score', '星级', '评分'], 'rating'],
  [['title', 'headline', 'summary', '标题'], 'title'],
  [['body', 'review', 'content', 'text', 'reviewbody', 'review_text', '评论', '内容', '正文'], 'body'],
  [['date', 'review_date', 'reviewdate', 'time', '日期', '时间'], 'date'],
  [['asin', 'product', 'product_name', 'productname', 'sku', 'title_asin', '产品', '商品'], 'prod'],
  [['verified', 'verified_purchase', 'verifiedpurchase', '已验证'], 'verified'],
  [['helpful', 'votes', 'helpful_votes', '有用'], 'helpful']
];

function rvMapCols(header) {
  const hs = header.map(h => String(h || '').trim().toLowerCase().replace(/\s+/g, '_'));
  const map = {};
  RV_COL.forEach(([names, key]) => {
    let idx = hs.findIndex(h => names.indexOf(h) > -1);
    if (idx < 0) idx = hs.findIndex(h => names.some(n => n.length > 3 && h.indexOf(n) > -1));
    if (idx > -1) map[key] = idx;
  });
  return map;
}

function rvFromCSV(text) {
  const rows = rvCSV(text);
  if (!rows.length) return { items: [], note: '文件是空的' };
  const map = rvMapCols(rows[0]);
  const hasHeader = !!(map.body || map.rating);
  const body = hasHeader ? rows.slice(1) : rows;
  if (!map.body && !map.title) {
    /* 没有可识别的正文列：退化为「每行一条评论」 */
    const items = rows.map(r => rvNorm({ body: r.join(' ') })).filter(x => x.body.length > 8);
    return { items, note: items.length ? '未识别到标准列名，已按「每行一条评论」读取' : '没读到有效内容' };
  }
  const items = body.map(r => {
    const o = {};
    for (const k in map) o[k] = r[map[k]];
    const it = rvNorm(o);
    if (!it.body && it.title) it.body = it.title;
    return it;
  }).filter(x => (x.body || x.title) && (x.body.length + x.title.length) > 6);
  return { items, note: hasHeader ? '' : '未检测到表头，已按位置读取' };
}

/* ---------- 粘贴文本解析 ----------
   兼容两种常见形态：
   A) Amazon 页面复制：星级行 + "Reviewed in ... on August 14, 2026" + 标题 + 正文（空行分隔）
   B) 管道行：5|2026-08-14|标题|正文|产品名                        */
function rvFromText(text) {
  const src = String(text || '').trim();
  if (!src) return { items: [], note: '没有内容' };
  const lines = src.split(/\r?\n/);
  const pipe = lines.filter(l => (l.match(/\|/g) || []).length >= 2);
  if (pipe.length >= Math.max(2, lines.length * .5)) {
    const items = [];
    pipe.forEach(l => {
      const p = l.split('|').map(s => s.trim());
      const si = p.findIndex(x => /^[1-5](\.\d)?$/.test(x));
      const di = p.findIndex(x => /\d{4}/.test(x) && /[-/年月]/.test(x));
      const rating = si > -1 ? rvStar(p[si]) : 0;
      const date = di > -1 ? rvDate(p[di]) : '';
      const rest = p.filter((x, i) => i !== si && i !== di && x);
      const o = { rating, date, body: rest.join(' ') };
      if (rest.length > 1) { o.title = rest[0]; o.body = rest.slice(1).join(' '); }
      const it = rvNorm(o);
      if (it.body || it.title) items.push(it);
    });
    return { items, note: '按管道分隔读取' };
  }

  const blocks = src.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const items = [];
  blocks.forEach(b => {
    const bm = b.match(/([1-5])(?:\.\d)?\s*out of 5\s*stars?/i) || b.match(/([1-5])\s*星/);
    const dm = b.match(/on\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/) || b.match(/(\d{4}-\d{1,2}(?:-\d{1,2})?)/) || b.match(/([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/);
    const ls = b.split(/\r?\n/).map(x => x.replace(/^\s*[›>·•-]\s*/, '').trim())
      .filter(x => x && !/out of 5\s*stars?/i.test(x) && !/^Reviewed in/i.test(x) && !/helpful|report|verified purchase/i.test(x));
    if (!ls.length) return;
    const it = rvNorm({ rating: bm ? +bm[1] : 0, date: dm ? dm[1] : '', title: ls[0].length < 90 ? ls[0] : '', body: (ls[0].length < 90 ? ls.slice(1) : ls).join(' ') });
    if ((it.body || it.title).length > 8) items.push(it);
  });
  if (items.length) return { items, note: '按空行分段读取' };
  const one = src.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 10).map(s => rvNorm({ body: s }));
  return { items: one, note: '按每行一条读取' };
}

/* ---------- 取数据：真实导入优先，否则内置样本 ---------- */
function rvItems(ctx) {
  const u = ctx.__reviews;
  if (u && u.items && u.items.length >= 2) {
    return { items: u.items.map(rvNorm), source: 'user', at: u.at || '', name: u.name || '' };
  }
  const cat = (ctx.category || '').trim();
  const raw = RV[cat] || RV['厨房小家电'];
  const items = raw.map((x, i) => rvNorm({
    prod: x[0], rating: x[1], date: x[2], title: x[3], body: x[4],
    verified: i % 7 !== 0, helpful: (i * 7) % 23
  }));
  return { items, source: 'sample', at: '', name: cat + ' · 头部 6 款' };
}

/* ---------- 统计 ---------- */
function rvAnalyze(items) {
  const n = items.length;
  const dist = [0, 0, 0, 0, 0];
  let sum = 0, rated = 0, verified = 0, verifiable = 0, helpful = 0;
  const painMap = {};
  const wordMap = {};
  const monthMap = {};
  const prodMap = {};
  const usedQ = {};   /* 同一条原话只在一个痛点下出现，避免跨类重复 */

  items.forEach(it => {
    const r = it.rating;
    if (r >= 1 && r <= 5) { dist[r - 1]++; sum += r; rated++; }
    if (it.verified === true || it.verified === 'true' || it.verified === 'Y' || it.verified === 'y' || it.verified === '1') { verified++; verifiable++; }
    else if (it.verified === false || it.verified === 'false' || it.verified === 'N' || it.verified === 'n' || it.verified === '0') verifiable++;
    helpful += it.helpful || 0;

    const text = (it.title + ' ' + it.body);
    /* 只把 ≤3 星的内容算作痛点来源，避免好评里的「不漏水」被误判 */
    if (r >= 4) return;
    const hits = rvClassify(text);
    hits.forEach(k => {
      if (!painMap[k]) painMap[k] = { count: 0, quotes: [] };
      painMap[k].count++;
      if (painMap[k].quotes.length < 2 && it.body.length > 40 && !usedQ[it.body]) {
        painMap[k].quotes.push({ t: it.body, r, p: it.prod });
        usedQ[it.body] = 1;
      }
    });

    const key = it.prod || '未标注产品';
    if (!prodMap[key]) prodMap[key] = { name: key, n: 0, neg: 0, sum: 0, rated: 0, pains: {} };
    hits.forEach(k => { prodMap[key].pains[k] = (prodMap[key].pains[k] || 0) + 1; });
  });

  /* 月度趋势 */
  items.forEach(it => {
    if (!it.date) return;
    const ym = it.date;
    if (!monthMap[ym]) monthMap[ym] = { ym, n: 0, sum: 0, rated: 0 };
    monthMap[ym].n++;
    if (it.rating) { monthMap[ym].sum += it.rating; monthMap[ym].rated++; }
  });

  /* 产品维度：总条数、差评条数、均分 */
  items.forEach(it => {
    const key = it.prod || '未标注产品';
    if (!prodMap[key]) prodMap[key] = { name: key, n: 0, neg: 0, sum: 0, rated: 0, pains: {} };
    const p = prodMap[key];
    p.n++;
    if (it.rating && it.rating <= 2) p.neg++;
    if (it.rating) { p.sum += it.rating; p.rated++; }
  });

  /* 高频词 */
  items.forEach(it => {
    if (it.rating >= 4) return;
    const ws = (it.title + ' ' + it.body).toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
    ws.forEach(w => {
      const t = w.replace(/'s$/, '').replace(/(ing|ed|es|s)$/, '');
      if (t.length < 4 || RV_STOP.has(t) || RV_STOP.has(w)) return;
      wordMap[t] = (wordMap[t] || 0) + 1;
    });
  });

  const neg = dist[0] + dist[1];
  const pos = dist[3] + dist[4];
  const pains = Object.entries(painMap)
    .map(([k, v]) => ({ k, count: v.count, quotes: v.quotes, share: neg ? v.count / neg : 0 }))
    .sort((a, b) => b.count - a.count);
  const words = Object.entries(wordMap).map(([w, c]) => ({ w, c })).filter(x => x.c > 1).sort((a, b) => b.c - a.c).slice(0, 20);
  const months = Object.values(monthMap).sort((a, b) => a.ym < b.ym ? -1 : 1);
  const prods = Object.values(prodMap).map(p => Object.assign({}, p, {
    avg: p.rated ? p.sum / p.rated : 0,
    negRate: p.n ? p.neg / p.n : 0,
    topPain: Object.entries(p.pains).sort((a, b) => b[1] - a[1])[0]
  })).sort((a, b) => b.neg - a.neg);

  return {
    n, dist, rated, neg, pos,
    avg: rated ? sum / rated : 0,
    negRate: rated ? neg / rated : 0,
    posRate: rated ? pos / rated : 0,
    verified, verifiable, verifiedRate: verifiable ? verified / verifiable : 0,
    helpful, pains, words, months, prods,
    hasDate: months.length > 0,
    span: months.length ? months[0].ym.replace('-', '.') + ' – ' + months[months.length - 1].ym.replace('-', '.') : ''
  };
}

/* ---------- 渲染 ---------- */
function rvStars(r) {
  const full = Math.round(r);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function rvMonthsSvg(months, W) {
  const w = W || 640, h = 190, padL = 34, padR = 8, padT = 14, padB = 30;
  const dat = months.slice(-12);
  if (!dat.length) return '';
  const max = Math.max.apply(null, dat.map(d => d.n)) || 1;
  const iw = w - padL - padR, ih = h - padT - padB;
  const step = iw / dat.length;
  const bw = Math.max(8, step * .52);
  let s = `<svg class="msvg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="按月评论量趋势">`;
  s += `<line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="#dfe5ef" stroke-width="1"/>`;
  [0, .5, 1].forEach(t => {
    const y = padT + ih - ih * t;
    s += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}" stroke="#eef2f8" stroke-width="1"/>`;
    s += `<text x="${padL - 8}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#8b95a3">${Math.round(max * t)}</text>`;
  });
  dat.forEach((d, i) => {
    const bh = Math.max(2, d.n / max * ih);
    const x = padL + step * i + (step - bw) / 2;
    const y = padT + ih - bh;
    const tone = d.n === max ? '#1e4fd8' : '#b9c8e8';
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${tone}"/>`;
    if (dat.length <= 14) s += `<text x="${(x + bw / 2).toFixed(1)}" y="${h - padB + 14}" text-anchor="middle" font-size="9.5" fill="#8b95a3">${d.ym.slice(5)}</text>`;
  });
  s += `<text x="${padL}" y="${h - 4}" font-size="9.5" fill="#8b95a3">按月评论量（${dat[0].ym} 起，最近 ${dat.length} 个月）</text>`;
  return s + '</svg>';
}

function reviewSection(ctx, rva, meta, n) {
  const src = meta.source === 'user';
  const badge = src
    ? `<span class="rvtg ok">真实数据</span>已导入 ${rva.n} 条${meta.name ? ' · ' + esc(meta.name) : ''}`
    : `<span class="rvtg">内置样本</span>${rva.n} 条 · ${esc(meta.name)}`;

  /* 星级环形：5→1 由绿到红 */
  const dist = [5, 4, 3, 2, 1].map(st => {
    const c = rva.dist[st - 1] || 0;
    const col = st >= 4 ? '#0e9f6e' : st === 3 ? '#f0b429' : (st === 2 ? '#ef8a3c' : '#dc2626');
    return { v: c, c: col, k: st + ' 星', n: c };
  });
  const starLegend = dist.map(d => `<span><i style="background:${d.c}"></i>${d.k} ${pct(rva.n ? d.n / rva.n : 0)}</span>`).join('');

  /* 痛点条形 */
  const pains = rva.pains.slice(0, 6);
  const pmax = Math.max.apply(null, pains.map(p => p.count).concat([1]));
  const painRows = pains.map(p => ({
    k: p.k, v: p.count,
    t: rva.neg ? `${p.count} 条 · ${pct(p.share)}` : `${p.count} 条`,
    c: p.count === pmax ? VZ.red : VZ.blue
  }));
  const topPain = pains[0];
  const topQuote = topPain && topPain.quotes && topPain.quotes[0];

  const worst = rva.prods.filter(p => p.n >= 2)[0];
  const words = rva.words.length
    ? rva.words.slice(0, 18).map(w => `<span class="wtag">${esc(w.w)}<b>${w.c}</b></span>`).join('')
    : '<span class="sub2">评论量不足或为非英文内容，词频从略。</span>';

  const fixes = pains.slice(0, 3).map((p, i) => `
    <div class="fix3-i">
      <div class="fix3-h"><b>${i + 1}. ${esc(p.k)}</b><span>${p.count} 条 · ${rva.neg ? pct(p.share) : '—'}</span></div>
      <p>${PAIN_FIX[p.k] || '把这一项做成可验证的承诺，并用实拍证明。'}</p>
    </div>`).join('');

  return `
    <section class="ch" id="ch${n}">
      <h2><i>第${['一','二','三','四','五','六','七','八','九'][n - 1]}章</i>评论与需求缺口</h2>
      <div class="rvinfo">
        <div class="rvsrc">${badge}${rva.span ? ' · 覆盖 ' + rva.span : ''}</div>
        <div class="rvhint">${src
      ? `结论全部由导入的评论重算，换数据整章自动更新。${rva.n < 20 ? '　当前仅 ' + rva.n + ' 条，占比易失真，建议抓到 50 条以上。' : ''}`
      : '样本按该品类头部产品分布重写，用于跑通分析链路；导入真实评论后整章替换。样本刻意放大了差评密度（真实头部通常 4.2–4.5 分、差评率 8–15%），不要拿这里星级的绝对值下结论。'}</div>
      </div>

      <div class="revtop">
        <div class="revtop-g">
          ${vizDonut(dist, { v: pct(rva.negRate), l: '差评率（≤2 星）', c: rva.negRate > .3 ? VZ.red : VZ.ink })}
          <div class="revleg">${starLegend}</div>
        </div>
        <div class="revtop-t">
          <div class="cstat">
            <div><b>${rva.n}</b><span>评论条数</span></div>
            <div><b>${rva.avg ? rva.avg.toFixed(2) : '—'}</b><span>平均星级</span></div>
            <div><b>${rva.neg}</b><span>差评条数</span></div>
          </div>
          <p class="gcell-f">差评率是选品第一道过滤器：高于 30% 说明现有玩家普遍做不好，是机会；低于 8% 说明体验已被做满，只能拼价格与内容。${src ? '' : '（此处为样本值。）'}</p>
          ${rva.hasDate ? rvMonthsSvg(rva.months) : ''}
        </div>
      </div>

      <h3>差评痛点：${rva.neg} 条差评拆出 ${rva.pains.length} 类问题${rva.pains.length > 6 ? '（列前 6 类）' : ''}</h3>
      ${vizHbar(painRows, { max: pmax, rh: 27, nameW: 118, showVal: true })}
      ${topQuote ? `<div class="qbox"><i>“${esc(topQuote.t.length > 160 ? topQuote.t.slice(0, 160) + '…' : topQuote.t)}”</i><span>${esc(topQuote.p)} · ${topQuote.r} 星</span></div>` : ''}
      <p class="pnote">一条评论可命中多类（「杯子裂了还漏水」＝ 质量 + 密封），占比之和会大于 100%。</p>

      <h3>Top 3 缺口 → 怎么改成卖点</h3>
      <div class="fix3">${fixes}</div>
      ${worst ? `<p class="pconcl">最该被接走的是「${esc(worst.name)}」的用户：${worst.neg} 条差评、占其评论 ${pct(worst.negRate)}，把他们的原话逐条做成对比素材，比凭空讲卖点有效。</p>` : ''}

      <h3>差评高频词</h3>
      <div class="wcloud">${words}</div>
      <p class="pnote">只统计 ≤3 星评论并剔除停用词。这些词是用户的原生语言，可直接搬进广告痛点段与 FAQ 标题。</p>
    </section>`;
}
