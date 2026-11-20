/* =========================================================
   compete.js — 竞品深度分析：集中度 / 价格带 / 四象限 / 威胁矩阵
   输入为 doc.js 的 HOT 样本（[名称,品牌,价格,评分,评论数,月销,卖点,差评]）
   ========================================================= */

/* 集中度：HHI 与 CR3，用评论存量代表市场份额（评论≈累计销量代理） */
function compIndex(list) {
  const total = list.reduce((a, p) => a + p[4], 0) || 1;
  const shares = list.map(p => p[4] / total).sort((a, b) => b - a);
  const hhi = Math.round(shares.reduce((a, s) => a + s * s, 0) * 10000);
  const cr3 = shares.slice(0, 3).reduce((a, s) => a + s, 0);
  const cr1 = shares[0];
  let tone, label;
  if (hhi > 3200) { tone = 'bad'; label = '高度集中'; }
  else if (hhi > 2000) { tone = 'mid'; label = '中度集中'; }
  else { tone = 'good'; label = '相对分散'; }
  return { hhi, cr1, cr3, label, tone, shares };
}

/* 价格带：等宽 5 档（浮点切分，避免最后一档区间反转），返回每档款数 */
function priceBands(list, sym) {
  const ps = list.map(p => p[2]).sort((a, b) => a - b);
  const lo = Math.floor(ps[0]), hi = Math.ceil(ps[ps.length - 1]);
  const step = (hi - lo) / 5 || 1;
  const bands = [];
  for (let i = 0; i < 5; i++) {
    const a = lo + step * i, b = lo + step * (i + 1);
    const items = list.filter(p => p[2] >= a && (i === 4 ? p[2] <= b + .001 : p[2] < b));
    bands.push({ a: Math.round(a), b: Math.round(b), n: items.length, items });
  }
  const med = ps.length % 2 ? ps[(ps.length - 1) / 2] : (ps[ps.length / 2 - 1] + ps[ps.length / 2]) / 2;
  return { bands, lo, hi, step, med, ps };
}

function priceBandSvg(pb, sym) {
  const W = 640, H = 232, padL = 10, padR = 10, padT = 18, padB = 54;
  const max = Math.max.apply(null, pb.bands.map(b => b.n)) || 1;
  const iw = W - padL - padR, ih = H - padT - padB;
  const step = iw / 5, bw = step * .46;
  let s = `<svg class="msvg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="价格带分布">`;
  s += `<line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#dfe5ef"/>`;
  pb.bands.forEach((b, i) => {
    const x = padL + step * i + (step - bw) / 2;
    const bh = b.n ? Math.max(10, b.n / max * ih) : 0;
    const y = padT + ih - bh;
    if (b.n) {
      const tone = b.n === max ? '#1e4fd8' : '#b9c8e8';
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="${tone}"/>`;
      s += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="#1e4fd8">${b.n}</text>`;
    } else {
      s += `<rect x="${x.toFixed(1)}" y="${(padT + ih - 26).toFixed(1)}" width="${bw.toFixed(1)}" height="26" rx="4" fill="#fff" stroke="#d94a3d" stroke-dasharray="4 3"/>`;
      s += `<text x="${(x + bw / 2).toFixed(1)}" y="${(padT + ih - 8).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#d94a3d">空档</text>`;
    }
    s += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - padB + 17}" text-anchor="middle" font-size="10" fill="#5b6675">${sym}${b.a}</text>`;
    s += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - padB + 30}" text-anchor="middle" font-size="9" fill="#98a2b3">–${sym}${b.b}</text>`;
  });
  /* 中位线 */
  const medBand = clamp(Math.floor((pb.med - pb.lo) / (pb.step || 1)), 0, 4);
  const mx = padL + step * medBand + step / 2;
  s += `<line x1="${mx.toFixed(1)}" y1="${padT - 4}" x2="${mx.toFixed(1)}" y2="${(H - padB).toFixed(1)}" stroke="#f0a020" stroke-width="1.4" stroke-dasharray="5 4"/>`;
  s += `<text x="${mx.toFixed(1)}" y="${padT - 8}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#b8730a">中位 ${sym}${pb.med}</text>`;
  s += `<text x="${padL}" y="${H - 7}" font-size="9.5" fill="#8b95a3">横轴为价格带，柱高为该价位在售款数；红色虚线框为无人占据的空档</text>`;
  return s + '</svg>';
}

/* 四象限：x = 评论存量（对数），y = 评分，圆面积 = 月销 */
function quadSvg(list, sym) {
  const W = 640, H = 330, padL = 46, padR = 28, padT = 26, padB = 44;
  const iw = W - padL - padR, ih = H - padT - padB;
  const xs = list.map(p => Math.log10(Math.max(100, p[4])));
  const xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
  const ys = list.map(p => p[3]);
  const ymin = Math.min.apply(null, ys) - .08, ymax = Math.max.apply(null, ys) + .08;
  const maxS = Math.max.apply(null, list.map(p => p[5]));
  const X = v => { const t = (Math.log10(Math.max(100, v)) - xmin) / ((xmax - xmin) || 1); return padL + iw * (.09 + .82 * t); };
  const Y = v => { const t = (v - ymin) / ((ymax - ymin) || 1); return padT + ih * (.92 - .84 * t); };
  const mx = padL + iw * .5, my = padT + ih * .5;

  let s = `<svg class="msvg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="评论存量与评分四象限">`;
  s += `<rect x="${padL}" y="${padT}" width="${iw}" height="${ih}" rx="6" fill="#fafbfe"/>`;
  s += `<line x1="${mx}" y1="${padT}" x2="${mx}" y2="${padT + ih}" stroke="#d5dded" stroke-dasharray="4 4"/>`;
  s += `<line x1="${padL}" y1="${my}" x2="${padL + iw}" y2="${my}" stroke="#d5dded" stroke-dasharray="4 4"/>`;

  /* 四角短标签，避免压住气泡 */
  const qs = [
    ['守擂区', padL + 8, padT + 15, 'start'],
    ['潜力区', padL + iw - 8, padT + 15, 'end'],
    ['可攻击区', padL + 8, padT + ih - 9, 'start'],
    ['淘汰区', padL + iw - 8, padT + ih - 9, 'end']
  ];
  qs.forEach(([t, x, y, an]) => {
    s += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${an}" font-size="10" font-weight="700" fill="#9aa5b5">${t}</text>`;
  });

  /* y 轴刻度 */
  for (let i = 0; i <= 2; i++) {
    const v = ymin + (ymax - ymin) * i / 2;
    const y = Y(v);
    s += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${padL + iw}" y2="${y.toFixed(1)}" stroke="#edf1f8"/>`;
    s += `<text x="${padL - 7}" y="${(y + 3.4).toFixed(1)}" text-anchor="end" font-size="9" fill="#98a2b3">${v.toFixed(2)}</text>`;
  }

  list.forEach(p => {
    const cx = X(p[4]), cy = Y(p[3]);
    const r = 6 + Math.sqrt(Math.max(0, p[5]) / maxS) * 13;
    const weak = p[3] < 4.35;
    s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${weak ? '#d94a3d' : '#1e4fd8'}" fill-opacity=".14" stroke="${weak ? '#d94a3d' : '#1e4fd8'}" stroke-width="1.3"/>`;
  });

  /* 标签后画：大圆内嵌，小圆按「上方 → 右上 → 下方 → 左上」找空位，
     同时避开其他标签与其他气泡（否则会压在别人的圆上） */
  const placed = [];
  const circles = list.map(p => ({
    x: X(p[4]), y: Y(p[3]),
    r: 6 + Math.sqrt(Math.max(0, p[5]) / maxS) * 13
  }));
  list.forEach((p, pi) => {
    const cx = X(p[4]), cy = Y(p[3]);
    const r = circles[pi].r;
    const weak = p[3] < 4.35;
    const nm = String(p[1]).slice(0, 10);
    const w = nm.length * 4.5;

    if (r >= 15) {
      placed.push({ x: cx, y: cy + 2.6, w });
      s += `<text x="${cx.toFixed(1)}" y="${(cy + 2.6).toFixed(1)}" text-anchor="middle" font-size="7.8" font-weight="700" fill="${weak ? '#a83226' : '#173a9c'}">${esc(nm)}</text>`;
      return;
    }

    const cands = [
      { x: cx, y: cy - r - 4, an: 'middle' },
      { x: cx + r + 4, y: cy - r + 2, an: 'start' },
      { x: cx, y: cy + r + 11, an: 'middle' },
      { x: cx - r - 4, y: cy - r + 2, an: 'end' }
    ];
    let use = null;
    for (const c of cands) {
      const cxp = c.an === 'middle' ? c.x : (c.an === 'start' ? c.x + w / 2 : c.x - w / 2);
      const hitLabel = placed.some(L => Math.abs(L.y - c.y) < 9 && Math.abs(L.x - cxp) < (L.w + w) / 2 + 4);
      const hitCircle = circles.some((C, ci) => {
        if (ci === pi) return false;
        return Math.abs(C.x - cxp) < C.r + w / 2 + 2 && Math.abs(C.y - c.y) < C.r + 5;
      });
      if (!hitLabel && !hitCircle) { use = { x: c.x, y: c.y, an: c.an, cx: cxp }; break; }
    }
    if (!use) use = { x: cx, y: cy + 2.6, an: 'middle', cx };
    placed.push({ x: use.cx, y: use.y, w });
    s += `<text x="${use.x.toFixed(1)}" y="${use.y.toFixed(1)}" text-anchor="${use.an}" font-size="7.8" font-weight="700" fill="${weak ? '#a83226' : '#173a9c'}">${esc(nm)}</text>`;
  });

  /* 坐标轴 */
  s += `<line x1="${padL}" y1="${padT + ih}" x2="${padL + iw}" y2="${padT + ih}" stroke="#c9d3e3"/>`;
  s += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + ih}" stroke="#c9d3e3"/>`;
  s += `<text x="${padL + iw / 2}" y="${H - 10}" text-anchor="middle" font-size="9.5" fill="#8b95a3">评论存量（对数刻度）→</text>`;
  s += `<text x="10" y="${padT - 8}" font-size="9.5" fill="#8b95a3">评分 ↑</text>`;
  s += `<text x="${padL + iw}" y="${padT - 8}" text-anchor="end" font-size="9" fill="#aab4c2">圆面积 = 月销</text>`;
  return s + '</svg>';
}

/* 威胁矩阵：谁最该被绕开 */
function threats(list) {
  const prices = list.map(p => p[2]);
  const pmin = Math.min.apply(null, prices), pmax = Math.max.apply(null, prices);
  const maxRev = Math.max.apply(null, list.map(p => p[4]));
  return list.map(p => {
    const moat = Math.round(p[4] / maxRev * 100);
    const health = Math.round(clamp((p[3] - 3.9) / 1.1, 0, 1) * 100);
    const cheap = Math.round(clamp(1 - (p[2] - pmin) / (pmax - pmin || 1), 0, 1) * 100);
    const price = Math.round(clamp(1 - (p[2] - pmin) / (pmax - pmin || 1), 0, 1) * 100);
    const threat = Math.round(moat * .42 + health * .33 + price * .25);
    return { p, moat, health, cheap, threat };
  }).sort((a, b) => b.threat - a.threat);
}

/* ---------- 第二章：品类与形态（先定格子，不看对手） ---------- */
function catSection(ctx, n, extra) {
  const hasCat = !!(ctx.category || '').trim();
  const S = hasCat && typeof subRows === 'function' ? subRows(ctx) : null;
  return `
  <section class="ch" id="ch${n}">
    <h2><i>第${['一','二','三','四','五','六','七','八','九'][n - 1]}章</i>品类与形态细分</h2>
    ${hasCat
      ? `<p class="plead">${S
        ? `词抓完了，第二步是<b>给这个词定格子</b>：大类 › 款式 › 功能。同一个搜索词底下，这 ${S.n} 款会挤在一页结果里互相抢点击 —— 你的对手是同一格里的那几款，不是整个大类。`
        : `第二步是<b>把货归到格子里</b>（形态）。格子站错了，后面的五维、价格带、四象限看的全是别人的战场。`}</p>`
      : `<p class="plead">品类还没定，下面是跨类目通用样本的形状。<b>定完品类这一章才有意义</b>：同样叫「支架」，车载、桌面、床头是三个战场，对手、价格、搜索词全都不一样。</p>`}

    ${subSection(ctx) || formMapSection(ctx)}
    ${extra || ''}

    <p class="pconcl">${S
      ? `格子画完才轮到算对手。下一章只看<b>「${esc(S.cur.zh)}」这一格</b>里的人：同款不同价、同价不同款，都是直接对手。`
      : `格子画完才轮到算对手。下一章看的是同一形态里的头部产品：谁把首屏锁死了，谁在漏人。`}</p>
  </section>`;
}

/* ---------- 第三章：竞品分析（只看同一格里的对手） ---------- */
function compSection(ctx, list, st, n, notice) {
  const sym = mkOf(ctx.market).sym;
  const ci = compIndex(list);
  const pb = priceBands(list, sym);
  const th = threats(list);
  const sc = hotScore(list, st, ctx);
  const empty = pb.bands.filter(b => b.n === 0);
  const dense = pb.bands.slice().sort((a, b) => b.n - a.n)[0];
  const top = th[0];
  const weakest = list.find(p => p[3] === Math.min.apply(null, list.map(x => x[3]))) || list[list.length - 1];
  const parts = [
    { k: '需求强度', v: sc.demand }, { k: '竞争友好', v: sc.comp }, { k: '利润空间', v: sc.profit },
    { k: '差异空间', v: sc.diff }, { k: '内容可拍', v: sc.content }
  ];
  const low = parts.slice().sort((a, b) => a.v - b.v)[0];

  const thRows = th.slice(0, 5).map(t => ({
    k: t.p[1], v: t.threat, t: String(t.threat),
    c: t.threat > 62 ? VZ.red : t.threat > 44 ? VZ.amber : VZ.blue,
    s: `${sym}${t.p[2]} · ${(t.p[4] / 1000).toFixed(1)}k 评论 · 护城河 ${t.moat}`
  }));

  const chips = list.map(p => `<span class="clist-i">${esc(p[1])}<i>${sym}${p[2]}</i><a class="lk" href="https://www.amazon.com/s?k=${encodeURIComponent(p[1] + ' ' + (catOf(ctx.category).kw[0] || ''))}" target="_blank" rel="noopener">核实</a></span>`).join('');

  return `
  <section class="ch" id="ch${n}">
    <h2><i>第${['一','二','三','四','五','六','七','八','九'][n - 1]}章</i>竞品分析</h2>
    <p class="plead">格子定完了，这一章只回答一件事：<b>这一格里已经站着谁，你挤得进去吗</b>。四个角度看同一件事 —— 五维看短板、集中度看首屏锁得多死、价格带看钱挤在哪、四象限看谁在漏人。</p>
    ${notice || ''}

    <div class="grid2">
      <div class="gcell">
        <div class="gcell-h">五维评分 · 短板决定成败</div>
        ${vizRadar(parts)}
        <p class="gcell-f">最低项是<b>${low.k}</b>（${low.v}/10），它决定这一单能不能成，平均分好看没有意义。</p>
      </div>
      <div class="gcell">
        <div class="gcell-h">集中度 · 首屏锁得多死</div>
        <div class="cstat">
          <div><b>${ci.hhi}</b><span>HHI${ci.hhi > 3200 ? ' · 高度集中' : ci.hhi > 2000 ? ' · 中度' : ' · 分散'}</span></div>
          <div><b>${pct(ci.cr3)}</b><span>CR3 前三份额</span></div>
          <div><b>${pct(ci.cr1)}</b><span>第一名独占</span></div>
        </div>
        <p class="gcell-f">第一名用 ${(list[0][4] / 1000).toFixed(0)}k 条评论换来的首屏，等于新店 12–18 个月的自然积累，正面拼量没有胜算。</p>
        <div class="gcell-h" style="margin-top:10px">评价体量分层 · 壁垒有多厚</div>
        ${structBlock(list, st)}
      </div>
    </div>

    <h3>价格带：钱挤在哪，空在哪</h3>
    ${priceBandSvg(pb, sym)}
    <p class="pnote">最密档位 ${sym}${dense.a}–${sym}${dense.b}（${dense.n} 款在售）；${empty.length
      ? `空档 ${empty.map(b => sym + b.a + '–' + sym + b.b).join('、')} 要先确认是「没人想到」还是「做了卖不动」。`
      : '没有完全空档，每个价位都有人卡位，只能靠差异点切入。'}</p>

    <h3>评论存量 × 评分：谁在漏人</h3>
    ${quadSvg(list, sym)}
    <p class="pnote">左下「可攻击区」＝有量但体验差，是首选切入点。样本里最典型的是「${esc(weakest[0])}」：${weakest[3].toFixed(1)} 分、${(weakest[4] / 1000).toFixed(1)}k 条评论——它的差评就是你的广告文案。</p>

    <h3>威胁榜：先绕开谁</h3>
    ${vizHbar(thRows, { max: 100, unit: ' 分', rh: 30 })}
    <p class="pnote">威胁 = 评论护城河 42% + 评分健康 33% + 价格杀伤 25%。看的是「追平它要多久」，不是「它现在多强」。</p>

    <div class="clist">${chips}</div>
    <p class="pconcl">站位只有一句：绕开「${esc(top.p[0])}」，对标「${esc(weakest[0])}」，价格落在 ${sym}${Math.round(pb.med * .82)}–${sym}${Math.round(pb.med * 1.05)}——低于中位形成价差，高于白牌保住毛利。<b>下面两步是验证：这些人的评论里，用户到底在骂什么。</b></p>
  </section>`;
}
