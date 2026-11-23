/* =========================================================
   supply.js — 供需账
   ---------------------------------------------------------
   月搜索量 ÷ 在售卖家数 = 每个卖家能分到的自然流量

   ≥ 1.0   基础曝光不错，进得去
   0.8–1.0 可进，但要有差异化（用户方法的优先线）
   0.3–0.8 偏挤，得靠长尾词和广告
   < 0.3   红海，自然流量分不到，很难出单

   分子来自关键词月搜索量，分母取亚马逊搜索结果总数
   （比逐款数链接更准，因为它就是这一批词下的全部在售）。
   两个数都能被真实值替换：分母联网即真值，分子填一次就行。
   ========================================================= */

/* 类目核心词的月搜索量基准（次/月）—— 这是估算，不是抓来的。
   换真值的方法写在表格下面：卖家精灵 / Helium10 的「月搜索量」抄一个进来。 */
const CAT_VOL = {
  '厨房小家电': [22000, 85000],
  '家用电器': [18000, 70000],
  '3C 数码': [35000, 140000],
  '服饰配饰': [30000, 120000],
  '美妆个护': [28000, 110000],
  '宠物用品': [14000, 58000],
  '母婴用品': [16000, 62000],
  '家居收纳': [15000, 52000],
  '家居清洁': [12000, 46000],
  '户外运动': [16000, 65000],
  '汽车用品': [13000, 50000],
  '玩具益智': [17000, 68000],
  '办公文具': [8000, 32000],
  '灯具照明': [9000, 38000],
  '园艺工具': [7000, 28000]
};

/* 亚马逊搜索结果总数基准（≈ 在售链接数）。
   实测校准：womens overalls 返回「over 50,000 results」，所以量级是万级不是千级 ——
   早先按几千条给基准，估出来的比值会普遍虚高两三倍。 */
const CAT_SELLERS = {
  '3C 数码': [12000, 90000], '服饰配饰': [20000, 150000], '美妆个护': [15000, 80000],
  '厨房小家电': [8000, 45000], '家用电器': [9000, 55000], '宠物用品': [6000, 30000],
  '母婴用品': [7000, 40000], '家居收纳': [6000, 35000], '家居清洁': [5000, 28000],
  '户外运动': [8000, 45000], '汽车用品': [6000, 32000], '玩具益智': [8000, 50000],
  '办公文具': [4000, 20000], '灯具照明': [5000, 25000], '园艺工具': [3000, 18000]
};

/* 细分款在形态内部的相对搜索权重：第一行是主流款，往后是长尾。
   只用于「没联网也没填数」时的兜底估算，联网后整列换成真值。 */
const SUB_W = [1, 0.58, 0.46, 0.36, 0.29, 0.23, 0.18, 0.14];

const bandOf = r =>
  r >= 1.0 ? { k: 'good', t: '供不应求', s: '基础曝光不错，进去就有自然流量' } :
  r >= 0.8 ? { k: 'good', t: '可进', s: '过了优先线，但要有一个明确差异点' } :
  r >= 0.3 ? { k: 'mid', t: '偏挤', s: '自然流量薄，得靠长尾词和广告撑' } :
             { k: 'bad', t: '红海', s: '每个卖家分不到几分流量，很难出单' };

/* 分子是估的时候，比值只能用来排序 —— 不能套绝对阈值。
   否则一个 3 倍误差的估算会告诉你「这个类目供不应求」，那是害人。 */
const relBand = (r, all) => {
  const s = all.slice().sort((a, b) => b.r - a.r);
  const i = s.findIndex(x => x.r === r);
  const q = s.length ? i / s.length : 0;
  if (q < 0.3) return { k: 'good', t: '相对松', s: '同组里最松的一档，先看这几款' };
  if (q < 0.7) return { k: 'mid', t: '居中', s: '组内居中，要靠差异点才进得去' };
  return { k: 'bad', t: '相对紧', s: '同组里最挤的一档，别当主攻' };
};

const numFmt = n => (n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '万' : String(n));

function catRange(tbl, cat, dflt) {
  const k = String(cat || '').trim();
  return tbl[k] || dflt;
}

/* 一行：搜索量 S / 卖家数 N / 比值 r / 数据来源 */
function supplyRows(ctx) {
  const S = subRows(ctx);
  if (!S) return null;
  const A = ctx.__auto || {};
  const live = A.live || {};
  const resMap = live.results || {};        /* { 英文词: 搜索结果数 } */
  const volMap = live.vol || {};            /* { 英文词: 月搜索量 } */
  const [vLo, vHi] = catRange(CAT_VOL, ctx.category, [12000, 45000]);
  const [sLo, sHi] = catRange(CAT_SELLERS, ctx.category, [1800, 9000]);
  const userVol = num(ctx.volume, 0);       /* 侧栏手填的月搜索量，优先于一切估算 */

  const rows = S.rows.map((r, i) => {
    const w = SUB_W[i] || 0.14;
    const kw = r.kw || '';

    /* 分子：手填 > 抓到的实时词量 > 类目基准 × 细分权重 */
    let v = 0, vsrc = 'est', vlo = Math.round(vLo * w), vhi = Math.round(vHi * w);
    if (i === 0 && userVol > 0) { v = userVol; vsrc = 'user'; vlo = vhi = v; }
    else if (volMap[kw] > 0) { v = volMap[kw]; vsrc = 'net'; vlo = vhi = v; }
    else { v = Math.round(((vlo + vhi) / 2)); }

    /* 分母：抓到的真实结果数 > 类目基准 × 细分修正（长尾款卖家少） */
    let n = 0, nsrc = 'est';
    if (resMap[kw] > 0) { n = resMap[kw]; nsrc = 'net'; }
    else { n = Math.round(((sLo + sHi) / 2) * (0.62 + i * 0.07)); }

    const rr = n > 0 ? v / n : 0;
    return {
      zh: r.zh, kw, isCur: r.isCur, v, n, r: rr,
      vsrc, nsrc, w, lo: vlo, hi: vhi,
      real: vsrc !== 'est'          /* 分子真实，比值才能套绝对阈值 */
    };
  });

  /* 分档：分子实测/手填 → 套绝对阈值；分子是估的 → 只做同组内相对排序 */
  const pool = rows.map(x => ({ r: x.r }));
  rows.forEach(x => { x.band = x.real ? bandOf(x.r) : relBand(x.r, pool); });

  return {
    rows, cur: rows.find(x => x.isCur) || rows[0], n: rows.length,
    anyNet: rows.some(x => x.nsrc === 'net'),
    anyReal: rows.some(x => x.real)
  };
}

/* 趋势：只看「同一个月在不同日期记的同一组数」没意义，
   所以按月份归并，取最近三个月比较。不足三个月就老实说不够。 */
function trendOf(ctx, kw) {
  const h = (ctx.__auto && ctx.__auto.hist) || [];
  const mine = h.filter(x => x && x.kw === kw);
  const byMon = {};
  mine.forEach(x => { const m = String(x.d || '').slice(0, 7); if (m) byMon[m] = x; });
  const ms = Object.keys(byMon).sort();
  if (ms.length < 2) {
    return { ok: false, need: 2 - ms.length, mon: ms.length, pts: ms.map(m => byMon[m].v) };
  }
  const last = ms.slice(-3);
  const pts = last.map(m => byMon[m].v);
  const chg = [];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i - 1] > 0) chg.push((pts[i] - pts[i - 1]) / pts[i - 1]);
  }
  const up = chg.length && chg.every(c => c > 0);
  const flat = chg.length && chg.every(c => Math.abs(c) < 0.05);
  const avg = chg.length ? chg.reduce((a, b) => a + b, 0) / chg.length : 0;
  return {
    ok: true, mon: ms.length, pts, chg, avg, last,
    state: up ? 'up' : (flat ? 'flat' : (avg < 0 ? 'down' : 'mix'))
  };
}

function supplySection(ctx, n) {
  const A = ctx.__auto || {};
  const D = supplyRows(ctx);
  if (!D) {
    return `<h3>供需账：这个细分挤不挤</h3>
      <p class="plead">算这张账要两个数：<b>月搜索量</b>和<b>在售卖家数</b>。目前产品名只到形态一级、还没落到具体款式，
        账就无从算起 —— 在产品名里补一个款式词（「工装」「阔腿」「大码」），这一节会自动出现。</p>`;
  }

  const cur = D.cur;
  /* 每行的档位在 supplyRows 里已经按各自的数据源判过：
     分子真实的套绝对阈值，分子是估的只给组内相对位。这里只汇总，不重判。 */
  const curReal = !!(cur && cur.real);
  const realMode = curReal;
  const estRows = D.rows.filter(x => !x.real).length;
  /* 过线/红线只认真实的行：拿估值去凑「有 3 款过 0.8」是骗人的 */
  const pass = realMode
    ? D.rows.filter(x => x.real && x.r >= 0.8).sort((a, b) => b.r - a.r)
    : D.rows.filter(x => x.band.k === 'good');
  const dead = realMode
    ? D.rows.filter(x => x.real && x.r < 0.3)
    : D.rows.filter(x => x.band.k === 'bad');
  const tr = cur ? trendOf(ctx, cur.kw) : { ok: false, need: 2, mon: 0 };
  const live = A.live || {};
  const hasNet = D.anyNet;
  const srcTag = x => x === 'net' ? '<i class="sg sg-net">实测</i>'
    : (x === 'user' ? '<i class="sg sg-user">手填</i>' : '<i class="sg sg-est">估</i>');

  const trCell = () => {
    if (!tr.ok) {
      return `<span class="tr-need">需 ${tr.need} 次月度记录</span>`;
    }
    const arrow = tr.state === 'up' ? '↑' : (tr.state === 'down' ? '↓' : '→');
    const tone = tr.state === 'up' ? 'good' : (tr.state === 'down' ? 'bad' : 'mid');
    const pct = (tr.avg * 100).toFixed(1).replace('-', '');
    return `<i class="tg tg-${tone}">${arrow} ${tr.state === 'up' ? '+ ' : (tr.state === 'down' ? '- ' : '± ')}${pct}%/月</i>`;
  };

  return `
    <h3>供需账：先算每个卖家能分到多少流量</h3>
    <p class="plead">选品不是「这个类目大不大」，是<b>这块饼分给多少人</b>。用<b>月搜索量 ÷ 在售卖家数</b>，
      得到的是每个卖家能分到的自然流量份额。这一步做完，才知道后面四关值不值得过。</p>

    <div class="sflow">
      <div class="sf">
        <em>① 定范围</em>
        <b>锁到细分款，不是大类</b>
        <span>「${esc(String((ctx.category || '品类')).split(' › ')[0])}」里的不同款式不做同一批词，混在一起算等于没算。这一节锁在<b>${esc(cur ? cur.zh : '本品细分')}</b>这一类 ${D.n} 款上。</span>
      </div>
      <div class="sf">
        <em>② 算比值</em>
        <b>月搜索量 ÷ 卖家数</b>
        <span>分母取亚马逊搜索结果总数（这一批词下的全部在售），比逐款数链接更准。优先挑 <b>≥ 0.8</b> 的款，<b>&lt; 0.3</b> 直接放弃。</span>
      </div>
      <div class="sf">
        <em>③ 看趋势</em>
        <b>连续三个月往上就够</b>
        <span>哪怕每月只涨 5%，说明需求在长；连续跌的款，比值再高也是接盘。趋势靠本页按月累计，第一次打开时为基准月。</span>
      </div>
    </div>

    <div class="ptable stab">
      <table>
        <thead><tr>
          <th>细分款</th>
          <th class="c">月搜索量</th>
          <th class="c">在售卖家</th>
          <th class="c">供需比</th>
          <th class="c">档位</th>          <th>怎么读</th>
          <th class="c">近三月趋势</th>
        </tr></thead>
        <tbody>
          ${D.rows.map((x, i) => `<tr${x.isCur ? ' class="trcur"' : ''}>
            <td><b>${esc(x.zh)}</b>${x.isCur ? '<i class="tg tg-good">本品</i>' : ''}
              ${x.kw ? `<div class="sub2 kwx">${esc(x.kw)}</div>` : ''}</td>
            <td class="c nw">${numFmt(x.v)} ${srcTag(x.vsrc)}</td>
            <td class="c nw">${numFmt(x.n)} ${srcTag(x.nsrc)}</td>
            <td class="c"><b class="sr ${x.real ? 'sr-' + x.band.k : 'sr-est'}">${x.real ? '' : '≈'}${x.r.toFixed(2)}</b></td>
            <td class="c"><i class="tg tg-${x.band.k}">${x.band.t}</i></td>
            <td class="sub2">${esc(x.band.s)}</td>
            <td class="c">${i === (D.rows.findIndex(y => y.isCur)) ? trCell() : '<span class="tr-need">—</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="stopbox ${realMode ? (cur && cur.band.k === 'bad' ? 'warn' : 'ok') : ''}">
      <b>${!realMode
        ? `先排序，别急着定生死：最松的是 ${esc(pass[0] ? pass[0].zh : (D.rows[0] || {}).zh || '—')}（比值 ${(pass[0] || D.rows[0] || {}).r ? (pass[0] || D.rows[0]).r.toFixed(2) : '—'}）`
        : (cur ? (cur.band.k === 'good' ? `这个细分能进：供需比 ${cur.r.toFixed(2)}` : cur.band.k === 'mid' ? `偏挤但能做：供需比 ${cur.r.toFixed(2)}` : `不建议硬进：供需比 ${cur.r.toFixed(2)}，低于 0.3 的红线`) : '数据不足')}</b>
      <span>${!realMode
        ? `分子（月搜索量）是估算的，误差可能有几倍，所以这一档只做<b>同组横向排序</b>，不套绝对阈值——估值算出来的「供不应求」不作数。
           把真实的月搜索量填进侧栏「手动修改 › 月搜索量」，或联网补上卖家数，这张表立刻改成按 <b>≥1.0 / 0.8 / 0.3</b> 判档。`
        : (pass.length
          ? `这 ${D.n} 款里比值 ≥ 0.8 的有 <b>${pass.length}</b> 款（${pass.slice(0, 3).map(x => esc(x.zh)).join('、')}${pass.length > 3 ? ' 等' : ''}），优先从这里面挑。`
          : `这 ${D.n} 款里<b>没有一款过 0.8</b> —— 要么换形态，要么换类目，在这个细分里拼价格没有出路。`)
          + (estRows ? ` 其余 ${estRows} 款的数据还没换成真值，不能用这条线判，只做组内排序。` : '')
          + (dead.length ? ` 另有 <b>${dead.length}</b> 款已跌破 0.3（${dead.slice(0, 2).map(x => esc(x.zh)).join('、')}${dead.length > 2 ? ' 等' : ''}），别碰。` : '')}</span>
    </div>

    <p class="pnote">${hasNet
      ? `卖家数那一列标「实测」的，是<b>刚从亚马逊搜索页抓到的原值</b>；标「估」的是类目基准推算。`
      : `这张表的两个数<b>目前都是估算</b>：卖家数按类目基准推、搜索量按核心词基准 × 细分权重推。量级和相对高低可以参考，<b>绝对值不要当真</b>。`}
      ${!realMode ? '<b>所以这一档只排序、不判档</b>：真正的「供不应求 / 红海」必须分子分母都真才成立，估值套阈值只会给出过度乐观的结论。'
        : (estRows ? `本品那两个数已经真实，所以按 <b>≥1.0 / 0.8 / 0.3</b> 判档；另外 ${estRows} 行标「估」的分子还是推算的，只给<b>组内相对位</b>，不套阈值。` : '')}
      换真值的办法：卖家精灵 / Helium10 里搜同一个词，把「月搜索量」抄进侧栏「手动修改」；亚马逊搜索结果数联网即真值。
      两个数都换成真实的，这张表才有决策价值。</p>

    <p class="pnote"><b>为什么用搜索结果总数当分母：</b>逐款抓前 100 名再数链接，既慢又会漏掉广告位和变体；
      搜索页那一行「1-16 of over N results」本身就是这个细分下的在售总量，误差更小，也更快。</p>`;
}
