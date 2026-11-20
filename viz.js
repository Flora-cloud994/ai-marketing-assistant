/* =========================================================
   viz.js — 文档用内联 SVG 图表（零外链、随容器自适应）
   统一配色与字号，供 doc / compete / review / emotion 调用
   ========================================================= */

const VZ = {
  blue: '#1e4fd8', blue2: '#2f6bef', blueL: '#dbe6fb',
  green: '#0e9f6e', amber: '#d97706', red: '#dc2626',
  grey: '#c9d3e3', greyL: '#eef2f8', ink: '#0f1a2e', sub: '#7688a3'
};
const vzArc = (cx, cy, r, a0, a1) => {
  const p = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const big = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${big} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

/* ---------- 半环仪表盘：机会分 / 情绪分 ---------- */
function vizGauge(v, opt) {
  const o = Object.assign({ max: 10, label: '机会分', note: '', w: 250, tone: 'auto' }, opt || {});
  const W = o.w, H = 138, cx = W / 2, cy = 106, R = 74, r = 54;
  /* 浮点求和会带出 3.4000000000000004，统一取整后再显示 */
  v = o.max >= 100 ? Math.round(v) : (Math.round(v * 10) / 10);
  const t = clamp(v / o.max, 0, 1);
  const mid = (R + r) / 2, sw = R - r;
  /* 上半圆：SVG 里 π 在左、2π 在右（y 轴向下，角度增加即顺时针） */
  const a0 = Math.PI, a1 = Math.PI + Math.PI * t;
  let col = VZ.blue;
  if (o.tone === 'auto') col = t >= .7 ? VZ.green : t >= .54 ? VZ.amber : VZ.red;
  else if (o.tone === 'good') col = VZ.green;
  else if (o.tone === 'mid') col = VZ.amber;
  else if (o.tone === 'bad') col = VZ.red;

  let s = `<svg class="msvg vz-gauge" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${o.label} ${v}">`;
  s += `<path d="${vzArc(cx, cy, mid, Math.PI, Math.PI * 2)}" fill="none" stroke="${VZ.greyL}" stroke-width="${sw}" stroke-linecap="round"/>`;
  if (t > .008) {
    s += `<path d="${vzArc(cx, cy, mid, a0, a1)}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }
  s += `<text x="${cx}" y="${cy - 18}" text-anchor="middle" font-size="32" font-weight="800" fill="${col}" letter-spacing="-1">${v}</text>`;
  s += `<text x="${cx}" y="${cy + 1}" text-anchor="middle" font-size="9.5" fill="${VZ.sub}">${o.label} · 满分 ${o.max}</text>`;
  s += `<text x="${cx - mid}" y="${cy + 15}" text-anchor="middle" font-size="8.5" fill="#a9b6c9">0</text>`;
  s += `<text x="${cx + mid}" y="${cy + 15}" text-anchor="middle" font-size="8.5" fill="#a9b6c9">${o.max}</text>`;
  if (o.note) s += `<text x="${cx}" y="${cy + 27}" text-anchor="middle" font-size="10" fill="${col}" font-weight="700">${esc(o.note)}</text>`;
  return s + '</svg>';
}

/* ---------- 五维雷达：短板一眼可见 ---------- */
function vizRadar(parts, opt) {
  const o = Object.assign({ max: 10, size: 300, label: '各维度得分' }, opt || {});
  const S = o.size, cx = S / 2, cy = S / 2 + 2, R = S * .28, n = parts.length;
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
  const pt = (i, k) => [cx + R * k * Math.cos(ang(i)), cy + R * k * Math.sin(ang(i))];

  /* 标签画在 1.32R 处，5 轴时左右会超出 0..S，viewBox 左右各留 36 避免被裁 */
  let s = `<svg class="msvg vz-radar" viewBox="-36 2 ${S + 72} ${S - 4}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${o.label}">`;
  [.25, .5, .75, 1].forEach(k => {
    const pts = parts.map((_, i) => pt(i, k).map(x => x.toFixed(1)).join(',')).join(' ');
    s += `<polygon points="${pts}" fill="${k === 1 ? '#fafcff' : 'none'}" stroke="${k === 1 ? '#dde5f2' : '#eef2f8'}"/>`;
  });
  parts.forEach((_, i) => {
    const [x, y] = pt(i, 1);
    s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eef2f8"/>`;
  });
  /* 短板连线用红色填充提示 */
  const weak = parts.map((p, i) => [p.v, i]).sort((a, b) => a[0] - b[0])[0][1];
  const shape = parts.map((p, i) => pt(i, clamp(p.v / o.max, .04, 1)).map(x => x.toFixed(1)).join(',')).join(' ');
  s += `<polygon points="${shape}" fill="${VZ.blue}" fill-opacity=".16" stroke="${VZ.blue}" stroke-width="1.6"/>`;
  parts.forEach((p, i) => {
    const [x, y] = pt(i, clamp(p.v / o.max, .04, 1));
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === weak ? 4 : 2.8}" fill="${i === weak ? VZ.red : VZ.blue}"/>`;
    const [lx, ly] = pt(i, 1.32);
    const an = Math.abs(lx - cx) < 8 ? 'middle' : (lx > cx ? 'start' : 'end');
    s += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${an}" font-size="10.2" font-weight="700" fill="${i === weak ? VZ.red : '#41506b'}">${esc(p.k)}<tspan dx="3" font-size="9.2" font-weight="600" fill="#9aa5b5">${p.v}</tspan></text>`;
  });
  return s + '</svg>';
}

/* ---------- 环形占比：星级 / 差评结构 ---------- */
function vizDonut(slices, center) {
  const S = 186, cx = S / 2, cy = S / 2, R = 74, r = 50;
  const total = slices.reduce((a, x) => a + x.v, 0) || 1;
  let a = -Math.PI / 2, s = `<svg class="msvg vz-donut" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="占比环形图">`;
  slices.forEach(sl => {
    const span = sl.v / total * 2 * Math.PI;
    if (span > .002) {
      s += `<path d="${vzArc(cx, cy, (R + r) / 2, a, a + span)}" fill="none" stroke="${sl.c}" stroke-width="${R - r}"${span < Math.PI * .98 ? '' : ''}/>`;
    }
    a += span;
  });
  s += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="24" font-weight="800" fill="${center.c || VZ.ink}">${center.v}</text>`;
  s += `<text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="9.5" fill="${VZ.sub}">${center.l}</text>`;
  return s + '</svg>';
}

/* ---------- 堆叠条：价格拆成成本 / 佣金 / 履约 / 毛利 ---------- */
function vizStack(parts, opt) {
  const o = Object.assign({ w: 640, unit: '$', title: '' }, opt || {});
  const W = o.w, H = 86, padL = 0, padR = 0, bh = 30, top = 24;
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  let x = padL, s = `<svg class="msvg vz-stack" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="成本结构">`;
  if (o.title) s += `<text x="0" y="12" font-size="10" font-weight="700" fill="#41506b">${esc(o.title)}</text>`;
  parts.forEach((p, i) => {
    const w = p.v / total * (W - padL - padR);
    const first = i === 0, last = i === parts.length - 1;
    s += `<rect x="${x.toFixed(1)}" y="${top}" width="${Math.max(w, .6).toFixed(1)}" height="${bh}" fill="${p.c}"${first ? ' rx="5"' : ''}${last ? ' rx="5"' : ''}/>`;
    const pctv = p.v / total;
    if (w > 42) {
      s += `<text x="${(x + w / 2).toFixed(1)}" y="${top + 15}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff">${o.unit}${p.v.toFixed(1)}</text>`;
      s += `<text x="${(x + w / 2).toFixed(1)}" y="${top + 26}" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,.85)">${pct(pctv)}</text>`;
    }
    x += w;
  });
  /* 图例：中文字宽按 9.4、其余按 5.2 估算，超出宽度自动换行 */
  const tw = t => String(t).split('').reduce((a, ch) => a + (/[\u4e00-\u9fa5]/.test(ch) ? 9.4 : 5.2), 0);
  let lx = 0, ly = top + bh + 15, rows = 0;
  parts.forEach(p => {
    const t = `${p.k} ${o.unit}${p.v.toFixed(1)}`;
    const w = tw(t);
    if (lx + w > W && lx > 0) { lx = 0; ly += 14; rows++; }
    s += `<rect x="${lx}" y="${ly - 7}" width="8" height="8" rx="2" fill="${p.c}"/>`;
    s += `<text x="${lx + 12}" y="${ly}" font-size="9" fill="#7688a3">${esc(t)}</text>`;
    lx += 12 + w + 16;
  });
  s = s.replace('viewBox="0 0 ' + W + ' ' + H + '"', 'viewBox="0 0 ' + W + ' ' + (H + rows * 14) + '"');
  return s + '</svg>';
}

/* ---------- 横向条形榜：威胁度 / 关键词热度 ---------- */
function vizHbar(rows, opt) {
  const o = Object.assign({ max: 100, unit: '', w: 640, rh: 26, label: '', showVal: true, tone: VZ.blue }, opt || {});
  const W = o.w, n = rows.length, padB = 6;
  const H = n * o.rh + padB + (o.label ? 10 : 0);
  const nameW = o.nameW || 150, valW = o.showVal ? 34 : 0;
  const barX = nameW + 8, barW = W - barX - valW - 5;
  let s = `<svg class="msvg vz-hbar" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${o.label || '条形榜'}">`;
  rows.forEach((r, i) => {
    const y = (o.label ? 10 : 0) + i * o.rh;
    const w = clamp(r.v / o.max, 0, 1) * barW;
    const c = r.c || o.tone;
    s += `<text x="0" y="${y + 15}" font-size="11" font-weight="600" fill="#374151">${esc(String(r.k).slice(0, 18))}</text>`;
    s += `<rect x="${barX}" y="${y + 6}" width="${barW}" height="9" rx="4.5" fill="${VZ.greyL}"/>`;
    s += `<rect x="${barX}" y="${y + 6}" width="${Math.max(w, 2).toFixed(1)}" height="9" rx="4.5" fill="${c}"/>`;
    if (o.showVal) s += `<text x="${W}" y="${y + 14}" text-anchor="end" font-size="10.5" font-weight="700" fill="${c}">${r.t || Math.round(r.v)}${o.unit}</text>`;
    if (r.s) s += `<text x="${barX}" y="${y + 26}" font-size="9" fill="#a3b0c4">${esc(r.s)}</text>`;
  });
  if (o.label) s += `<text x="0" y="8" font-size="9" fill="#a3b0c4">${esc(o.label)}</text>`;
  return s + '</svg>';
}

/* ---------- 小微条：表格内嵌热度（不用 SVG，纯 div，省体积） ---------- */
function vizChip(v, max, tone) {
  const w = clamp(v / (max || 100) * 100, 3, 100);
  return `<span class="vchip"><i class="${tone || ''}" style="width:${w.toFixed(0)}%"></i></span>`;
}
