/* =========================================================
   app.js — 框架：文档模式（第 01 部分）+ 工具模式（其余 7 步）
   ========================================================= */

const LS = 'aimkt.v4';

const DEFAULTS = {
  product: '', category: '', market: '美国', platform: 'Amazon',
  price: '', audience: '', points: ''
};

/* 示例按钮用的一套完整数据（不是默认值） */
const DEMO = {
  product: '便携榨汁杯', category: '厨房小家电', market: '美国', platform: 'Amazon',
  price: '32', audience: '25–35 岁健身与通勤人群',
  points: '无线便携\n6 叶刀头 10 秒出汁\n一键自清洁\nType-C 快充'
};

let S = {
  project: Object.assign({}, DEFAULTS),
  vals: {},
  cur: { step: 0, tool: 'report' },
  seen: {},
  auto: { profile: null, manual: {}, source: '', at: '' },
  reviews: null   /* { items:[], at:'YYYY-MM-DD', name:'' } 用户导入的评论 */
};

/* 上传的图片只放内存，不写 localStorage（体积太大） */
const IMGS = {};

function load() {
  try {
    const raw = localStorage.getItem(LS) || localStorage.getItem('aimkt.v3');
    if (raw) {
      const d = JSON.parse(raw);
      if (d.project) S.project = Object.assign({}, DEFAULTS, d.project);
      if (d.vals) S.vals = d.vals;
      if (d.cur && typeof d.cur.step === 'number') S.cur = d.cur;
      if (d.seen) S.seen = d.seen;
      if (d.auto) S.auto = Object.assign({ profile: null, manual: {}, source: '', at: '' }, d.auto);
      if (d.reviews && d.reviews.items) S.reviews = d.reviews;
    }
  } catch (e) { }
}
function save() {
  const base = { project: S.project, vals: S.vals, cur: S.cur, seen: S.seen };
  /* 画像只存摘要，场景/痛点/标签由产品名重算，避免 localStorage 里塞一大坨 */
  if (S.auto && (S.auto.profile || S.auto.manual)) {
    base.auto = {
      manual: S.auto.manual || {}, source: S.auto.source || '', at: S.auto.at || '',
      net: S.auto.net ? { band: S.auto.net.band, price: S.auto.net.price, comp: S.auto.net.comp, n: S.auto.net.n } : null,
      /* 联网成果单独存一份：换设备/重开页面时，最近一次实时数据还在，可以按 TTL 判断该不该刷 */
      liveAt: S.auto.liveAt || 0,
      live: S.auto.live ? {
        at: S.auto.live.at, kw: S.auto.live.kw, mk: S.auto.live.mk, g: S.auto.live.g,
        sug: (S.auto.live.sug || []).slice(0, 12),
        products: (S.auto.live.products || []).slice(0, 6),
        results: S.auto.live.results || {}, vol: S.auto.live.vol || {}
      } : null,
      hist: (S.auto.hist || []).slice(-36),
      netCat: S.auto.netCat ? { forName: S.auto.netCat.forName, cat: S.auto.netCat.cat, id: S.auto.netCat.id, n: S.auto.netCat.n, of: S.auto.netCat.of, src: S.auto.netCat.src } : null
    };
  }
  /* 评论只留最近 600 条，超了先丢评论再丢整包，保证项目信息不丢 */
  if (S.reviews) base.reviews = {
    items: S.reviews.items.slice(0, 600),
    at: S.reviews.at || '',
    name: S.reviews.name || ''
  };
  try { localStorage.setItem(LS, JSON.stringify(base)); }
  catch (e) {
    try { delete base.reviews; localStorage.setItem(LS, JSON.stringify(base)); } catch (e2) { }
  }
}
function ctxOf() { return Object.assign({}, S.project, { __imgs: IMGS, __reviews: S.reviews, __vals: S.vals, __auto: S.auto }); }

/* 取某工具的全部输入值 */
function valsOf(tool) {
  const own = S.vals[tool.id] || {};
  const out = {};
  (tool.inputs || []).forEach(i => {
    out[i.k] = own[i.k] !== undefined ? own[i.k] : (i.def || '');
  });
  return out;
}

/* =========================================================
   只填产品：其余自动补全（本地知识库 + 联网校正）
   ========================================================= */
const NET_MK = { '美国': 'com', '欧洲': 'de', '日本': 'co.jp', '东南亚': 'sg', '中东': 'ae', '拉美': 'com.mx' };

/* 联网认出来的品类（跟当前产品名绑死，换产品就作废；手改过品类就以手改为准） */
function netCatOf(name) {
  if (S.auto && S.auto.manual && S.auto.manual.category) return null;
  const n = S.auto && S.auto.netCat;
  return (n && n.forName === name && n.cat) ? n : null;
}

function curProfile() {
  const name = (S.project.product || '').trim();
  if (!name) return null;
  const cached = S.auto && S.auto.profile;
  if (cached && cached.name === name && cached.market === S.project.market) return cached;
  return inferProfile(name, S.project.market, netCatOf(name));
}

/* 把推断写进项目字段（手改过的字段不覆盖） */
function applyInfer(force) {
  const name = (S.project.product || '').trim();
  if (!name) {
    S.auto = Object.assign({}, S.auto, { profile: null });
    renderAuto(); save();
    return;
  }
  const prof = inferProfile(name, S.project.market, netCatOf(name));
  const man = (S.auto = Object.assign({ profile: null, manual: {} }, S.auto)).manual || {};
  if (force) { delete man.category; delete man.price; delete man.audience; delete man.points; }
  if (!man.category) S.project.category = prof.cat;
  if (!man.price) S.project.price = String(prof.price);
  if (!man.audience) S.project.audience = prof.aud;
  if (!man.points) S.project.points = prof.pts.join('\n');
  S.auto.profile = prof;
  S.auto.source = 'local';
  S.auto.net = null;
  S.auto.at = new Date().toISOString().slice(0, 10);
  S.auto.manual = man;
  syncProjInputs();
  save(); renderAuto(); renderMain();
}

function syncProjInputs() {
  $$('#proj [data-pk]').forEach(el => {
    const k = el.dataset.pk;
    if (k === 'product') return;
    el.value = S.project[k] || '';
  });
}

let inferTimer = null;
function scheduleInfer() {
  clearTimeout(inferTimer);
  inferTimer = setTimeout(() => applyInfer(false), 420);
}

function renderAuto() {
  const box = $('#auto');
  if (!box) return;
  const name = (S.project.product || '').trim();
  if (!name) {
    box.innerHTML = `<div class="auto-empty">只填产品名就行 —— 品类、价格带、人群、核心卖点会自动补齐；
      用内置类目画像与样本，不联网也能出完整一篇。接了抓取桥可再换成真实竞品价格。</div>`;
    return;
  }
  const p = curProfile() || inferProfile(name, S.project.market);
  const man = (S.auto && S.auto.manual) || {};
  const nc = netCatOf(name);
  const net = (S.auto && S.auto.source === 'net') ? S.auto.net : null;
  const sym = (mkOf(S.project.market) || {}).sym || '$';
  const band = (net && net.band) || p.band;
  const price = S.project.price || p.price;
  const pts = lines(S.project.points || p.pts.join('\n'));
  const hit = (net && net.hit) || [];
  const editOpen = ($('#autoEdit') && !$('#autoEdit').hidden);

  const isBase = !!(S.auto && S.auto.source === 'base');
  const liveAt = (S.auto && S.auto.liveAt) ? fmtTime(S.auto.liveAt) : '';
  const srcHtml = net
    ? `<span class="auto-src net">实时校正 · ${net.n} 个竞品${net.comp ? ` · 竞争 ${net.comp}` : ''}${liveAt ? ` · ${liveAt}` : ''}</span>`
    : (isBase
      ? `<span class="auto-src">内置基线 · ${esc(p.cat || '同类目')}头部 6 款</span>`
      : (nc
        ? `<span class="auto-src net">联网识别品类 · ${nc.n} 分</span>`
        : `<span class="auto-src">本地知识库推断</span>`));

  const tagOf = x => {
    if (!hit.length) return '';
    const h = hit.find(k => k.keys.some(kk => x.indexOf(kk) > -1));
    return h ? `<i class="auto-net">标题 ${h.n}/${h.of}</i>` : '';
  };

  box.innerHTML = `
    <div class="auto-h"><span class="auto-t">自动补全</span>${srcHtml}</div>
    <div class="auto-r"><span class="auto-k">品类</span>
      <span class="auto-v">${esc(S.project.category || p.cat || '待确认')}${man.category ? '<i class="auto-m">手改</i>'
      : (p.hit === 'net' ? `<i class="auto-m net">联网识别 · ${nc ? nc.n + ' 分' : '可信度中等'}</i>`
        : p.hit === 'none' ? '<i class="auto-m bad">未识别 · 请选品类</i>'
          : (p.hit === 'guess' ? '<i class="auto-m">按关键词推断 · 建议核对</i>' : ''))}</span></div>
    <div class="auto-r"><span class="auto-k">价格带</span>
      <span class="auto-v">${sym}${band[0]}–${band[1]}<i class="auto-x">建议定价 ${sym}${price}</i></span></div>
    <div class="auto-r"><span class="auto-k">人群</span>
      <span class="auto-v">${esc(S.project.audience || p.aud)}${man.audience ? '<i class="auto-m">手改</i>' : ''}</span></div>
    <div class="auto-r pts"><span class="auto-k">卖点</span>
      <ul>${pts.slice(0, 5).map(x => `<li>${esc(x)}${tagOf(x)}</li>`).join('')}</ul></div>
    <div class="auto-tags">${(p.tags || []).slice(0, 6).map(t => `<span>${esc(t)}</span>`).join('')}</div>
    <div class="auto-f">
      <button class="btn xs" id="autoRun">重新推断</button>
      <button class="btn xs" id="autoNet">${NET_MODE === 'off' || NET_ON === false ? '联网设置'
        : ((p.hit === 'none' || p.hit === 'guess') ? '联网核实品类' : '联网收集')}</button>
      <button class="btn xs ghost" id="autoEditBtn">${editOpen ? '收起手改' : (p.hit === 'guess' ? '手动改品类' : '手动修改')}</button>
    </div>
    <div class="auto-st" id="autoSt">${net
      ? `价格带取自${liveAt ? ' ' + liveAt + ' 抓的' : ''} ${net.n} 个在售竞品，卖点已按标题出现频次重排${(S.auto.live && S.auto.live.sug) ? `；已同步 ${S.auto.live.sug.length} 个亚马逊实时建议词` : ''}`
      : (isBase
        ? `当前用内置基线出结论：${esc(p.cat || '同类目')}头部 6 款的价格带 + 该类目差评共性。点右上角联网状态换一次中转，同一套算法就换成实时竞品。`
        : (nc
          ? `联网查了 ${nc.of} 条「${name}」的相关内容，「${nc.cat}」得分最高（${nc.n}）${nc.second ? `，次选「${nc.second}」${nc.secondN} 分` : ''}`
          : esc(p.note || '')))}</div>`;
}

/* ---- 联网：先认品类，再抓竞品 ----
   三档自适应（net.js）：自建中转 → 公开源 → 离线基线。
   认品类一律先联网问一遍；抓不到实时数据就明说，不硬凑。 */
async function autoNet(silent) {
  const name = (S.project.product || '').trim();
  if (!name) { toast('先填产品名'); return; }
  const say = m => { const el = $('#autoSt'); if (el && !silent) el.textContent = m; };
  let p = curProfile() || inferProfile(name, S.project.market);

  /* 0) 先探一次：中转 / 公开源 / 断开。没网不是错误，只是换数据源 */
  if (NET_ON === null) { say('正在检查联网能力…'); await probeNet(); }
  if (!NET_ON) { useBaseline(p, say); return; }

  /* 1) 品类没定，或只是按关键词猜的 → 联网核实一遍 */
  const manCat = (S.auto && S.auto.manual && S.auto.manual.category) || '';
  const unsure = !manCat && (p.hit === 'none' || p.hit === 'guess');
  if (unsure) {
    say(`正在联网查「${name}」是什么…`);
    const j = await NETX.search(name, 10).catch(e => ({ ok: false, msg: e.message || '联网失败' }));
    if (j && j.ok) {
      const v = voteCategory(j.snips || []);
      /* 票数够，或者联网独立得出了和本地一样的结论，都可以采用 */
      const agree = !!(v && p.cat && v.cat === p.cat);
      if (v && (v.ok || agree)) {
        S.auto.netCat = Object.assign({ forName: name, src: j.src || '', at: new Date().toISOString().slice(0, 10) }, v);
        p = inferProfile(name, S.project.market, S.auto.netCat);
        applyInfer(false);
        p = curProfile() || p;
        toast(v.ok ? `联网确认：${name} → ${p.cat}（${v.n} 分）` : `联网结果与本地一致：${p.cat}`);
      } else if (v) {
        say(`联网查了 ${v.of} 条，最像「${v.cat}」但证据不够`
          + (v.second ? `（「${v.second}」也有 ${v.secondN} 分）` : '')
          + ' —— 建议手动选品类，别拿猜的当结论');
      } else {
        say(`联网查了 ${(j.snips || []).length} 条，没找到能判断品类的线索 —— 请手动选品类`);
      }
    } else {
      say((j && j.msg) || '联网搜索失败');
    }
    /* 还是没定品类，就别往下抓竞品了：抓回来也是别的类目的数据 */
    if (!S.project.category && p.hit === 'none') return;
  }

  /* 2) 抓在售竞品，校正价格带与卖点顺序 */
  /* 抓竞品的词要带人群限定：只搜「overalls」抓回来一半是男款，
     价格带和卖点全被带偏。名字里已经写了性别，就把它拼进英文词。 */
  let kw = p.en || name;
  const g0 = GENDER(name);
  if (g0 === 'f' && !/\b(women|womans|womens|lady|ladies|girl)\b/i.test(kw)) kw = 'womens ' + kw;
  if (g0 === 'm' && !/\b(men|mens|man|mans|male|boy)\b/i.test(kw)) kw = 'mens ' + kw;
  const mk = NET_MK[S.project.market] || 'com';
  say(`正在抓「${kw}」的在售竞品…`);
  /* 建议词这条线最便宜也最稳：不管商品页抓没抓到，都先拉一次，关键词章节立刻是今天的词 */
  liveKw(kw, mk, name);

  /* 2a) 本地 python 桥：走它的抓取任务（能顺带翻评论页） */
  if (NETX.st.legacy) {
    try {
      const q = new URLSearchParams({ kw, market: mk === 'co.jp' ? 'com' : mk, pages: '1', limit: '6', review_pages: '0' });
      const k = await netFetch(NETX.base + '/start?' + q.toString(), 15000);
      if (!k || !k.ok) throw new Error((k && k.msg) || '启动失败');
      autoPoll(k.id, p, 0, silent, kw);
      return;
    } catch (e) {
      say('本地桥这次没跑通（' + (e.message || '无响应') + '）—— 改走公开源');
    }
  }

  /* 2b) 中转 / 公开源：直接在浏览器里解析亚马逊在售页，一套代码两档共用 */
  const r = await NETX.amazon(kw, mk, 6).catch(e => ({ ok: false, msg: e.message }));
  if (!r.ok || !r.products || !r.products.length) {
    say('没抓到实时竞品（' + ((r && r.msg) || '未知原因') + '）—— 先用内置基线；接一次中转就能换成实时');
    useBaseline(p, say, true);
    return;
  }
  autoNetApply(p, r.products, silent, r.results, kw);
}

/* 亚马逊的真实下拉建议词 = 当前这批买家正在搜的说法，比任何词表都新。
   但下拉框会把「overalls for men」也算给女士背带裤 —— 性别相反的词要剔掉，
   否则投放时一半预算在替别人拉客。 */
const GENDER = s => {
  const t = String(s || '');
  if (/女士|女装|女款|women|woman|ladies|lady|girl/i.test(t)) return 'f';
  if (/男士|男装|男款|\bmen\b|\bman\b|male|\bboy/i.test(t)) return 'm';
  return '';
};
let liveSeq = 0;
async function liveKw(kw, mk, hint) {
  const my = ++liveSeq;
  const list = await NETX.sug(kw, mk).catch(() => null);
  if (!list || !list.length || my !== liveSeq) return;
  const toks = String(kw).toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const g = GENDER(kw) || GENDER(hint);
  const pick = [];
  list.forEach(x => {
    const y = String(x).toLowerCase().trim();
    if (!y || y.length > 60 || pick.indexOf(y) > -1) return;
    if (g === 'f' && /\b(men|man|male|boys?)\b/.test(y)) return;
    if (g === 'm' && /\b(women|woman|ladies|lady|girls?)\b/.test(y)) return;
    if (toks.some(w => y.indexOf(w) > -1)) pick.push(y);
  });
  if (pick.length < 3) return;
  /* 合并而不是覆盖：竞品清单可能比建议词先回来 */
  S.auto.live = Object.assign({}, S.auto.live, { at: Date.now(), kw, mk, sug: pick.slice(0, 12), g });
  save();
  renderNetPill();
  if (S.cur && S.cur.tool === 'report') renderMain();
}

/* 拿不到实时数据的落点：把本地画像确认为「内置基线」。
   不硬凑数据、不冒充实时 —— 说清楚这批数是什么，怎么换成真的。
   keepNet：这次抓取失败，但上次的实时数据还在 → 沿用上次的，标清时间，别退回基线。 */
function useBaseline(p, say, keepNet) {
  const name = (S.project.product || '').trim();
  const man = (S.auto && S.auto.manual) || {};
  const cat = man.category || S.project.category || p.cat || '';

  if (keepNet && S.auto && S.auto.net && S.auto.liveAt) {
    S.auto.source = 'net';
    save(); renderAuto(); renderMain();
    say(`这次没抓到新数据 —— 先沿用 ${fmtTime(S.auto.liveAt)} 那批实时竞品，稍后点「联网收集」再刷一次`);
    return;
  }

  /* 产品名没认出来、也没手改品类：这一篇的结论没有意义，先让人定品类 */
  if (!cat) {
    const st = $('#autoSt');
    if (st) st.textContent = '这个产品本地没认出、联网也没查实：点「手动改品类」选一个，选完内置样本立刻能出全篇';
    const ed = $('#autoEdit'); if (ed) ed.hidden = false;
    const b = $('#autoEditBtn'); if (b) b.textContent = '收起手改';
    return;
  }

  applyInfer(false);
  S.auto = Object.assign({ profile: null, manual: {} }, S.auto, {
    source: 'base', net: null, at: new Date().toISOString().slice(0, 10)
  });
  save(); renderAuto(); renderMain();
  const st = $('#autoSt');
  if (st) st.textContent = `当前用内置基线（${cat} 头部 6 款）：价格带与卖点取自类目画像，不假装实时。点右上角联网状态可以换数据源`;
  toast('内置基线：' + cat + ' · 6 款头部');
}

function autoPoll(id, prof, n, silent, kw) {
  const st = $('#autoSt');
  if (n > 30) { if (st && !silent) st.textContent = '任务超时，稍后再试'; return; }
  netFetch(NETX.base + '/poll?id=' + id, 12000).then(j => {
    if (!j || !j.ok) throw new Error((j && j.msg) || '查询失败');
    if (j.state === 'running') {
      if (st && !silent && j.log && j.log.length) st.textContent = j.log[j.log.length - 1];
      setTimeout(() => autoPoll(id, prof, n + 1, silent, kw), 1200);
      return;
    }
    if (j.state === 'done' && j.products && j.products.length) return autoNetApply(prof, j.products, silent, j.results, kw);
    if (st) st.textContent = j.msg || '搜到了，但没解析出商品';
  }).catch(e => { if (st) st.textContent = '联网收集中断：' + (e.message || ''); });
}

function autoNetApply(prof, products, silent, results, kw) {
  const r = refineByProfile(prof, products);
  const st = $('#autoSt');
  if (!r) { if (st) st.textContent = '搜到了商品，但标题解析为空'; return; }
  const man = (S.auto.manual = S.auto.manual || {});
  if (!man.price) S.project.price = String(r.price);
  if (!man.points) S.project.points = r.pts.join('\n');
  if (!man.category && !S.project.category && prof.cat) S.project.category = prof.cat;
  S.auto.profile = prof;
  S.auto.source = 'net';
  S.auto.net = r;
  S.auto.at = new Date().toISOString().slice(0, 10);
  S.auto.liveAt = Date.now();
  /* 报告第三章要列出这批真实在售款，所以把标题/价/评分/评论数存下来 */
  S.auto.live = Object.assign({ at: Date.now(), mk: (NET_MK[S.project.market] || 'com') }, S.auto.live, {
    at: Date.now(),
    products: products.slice(0, 6).map(x => ({
      t: String(x.title || '').replace(/\s+/g, ' ').slice(0, 90),
      a: x.asin || '', p: Number(x.price) || 0,
      r: Number(x.rating) || 0, c: Number(x.reviews) || 0
    }))
  });
  /* 供需账：把这次抓到的「搜索结果总数」记下来当分母（它就是这批词下的全部在售），
     并按月留一条记录 —— 趋势只能这样攒，没有捷径 */
  if (kw && results > 0) {
    const L = S.auto.live;
    L.results = Object.assign({}, L.results, { [kw]: results });
    const d = new Date().toISOString().slice(0, 10);
    const mon = d.slice(0, 7);
    const vol = num(S.project.volume, 0);
    const hist = (S.auto.hist = S.auto.hist || []).filter(x => !(x && x.kw === kw && String(x.d || '').slice(0, 7) === mon));
    hist.push({ d, kw, n: results, v: vol });
    while (hist.length > 48) hist.shift();
  }
  renderNetPill();
  syncProjInputs();
  save(); renderAuto(); renderMain();
  toast(`已用 ${r.n} 个实时竞品校正：价格带 ${r.band[0]}–${r.band[1]} · 竞争${r.comp}`);
}


/* ---------- 侧栏 ---------- */
function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = STEPS.map((s, si) => {
    if (s.doc) {
      const extra = s.tools.filter(t => t !== 'report');
      return `<div class="grp ${si === S.cur.step ? 'on' : ''}">
        <button class="grp-h" data-step="${si}">
          <span class="grp-n">${s.n}</span>
          <span class="grp-t">${s.name}</span>
          <span class="grp-c">${s.subs.length} 章</span>
        </button>
        <div class="grp-b">
          <button class="sub ${S.cur.tool === 'report' ? 'on' : ''}" data-tool="report" data-step="${si}"><span class="sub-i">R</span>选品调研报告</button>
          ${extra.map(tid => `<button class="sub ${tid === S.cur.tool ? 'on' : ''} ${S.seen[tid] ? 'done' : ''}" data-tool="${tid}" data-step="${si}"><span class="sub-i new">新</span>${T[tid].name}</button>`).join('')}
          <div class="sub-sep">文档章节</div>
          ${s.subs.map((x, i) => `<button class="sub sub-a" data-anchor="ch${i + 1}"><span class="sub-i">${i + 1}</span>${x}</button>`).join('')}
        </div>
      </div>`;
    }
    return `<div class="grp ${si === S.cur.step ? 'on' : ''}">
      <button class="grp-h" data-step="${si}">
        <span class="grp-n">${s.n}</span>
        <span class="grp-t">${s.name}</span>
        <span class="grp-c">${s.tools.filter(t => S.seen[t]).length}/${s.tools.length}</span>
      </button>
      <div class="grp-b">
        ${s.tools.map((tid, ti) => {
      const t = T[tid];
      return `<button class="sub ${tid === S.cur.tool ? 'on' : ''} ${S.seen[tid] ? 'done' : ''}" data-tool="${tid}" data-step="${si}">
              <span class="sub-i">${ti + 1}</span>${t.name}
            </button>`;
    }).join('')}
      </div>
    </div>`;
  }).join('');
}

/* 移动端：把 8 步折叠成一个下拉，避免侧栏把正文挤到屏幕外 */
function mstepHtml() {
  return `<div class="mstep"><span>步骤</span>
    <select id="mStep">${STEPS.map((s, i) =>
      `<option value="${i}" ${i === S.cur.step ? 'selected' : ''}>${s.n} ${s.name}</option>`).join('')}
    </select></div>`;
}

/* ---------- 主区 ---------- */
function renderMain() {
  const step = STEPS[S.cur.step];
  if (step.doc) {
    const extra = step.tools.filter(t => t !== 'report');
    if (S.cur.tool === 'report' || extra.indexOf(S.cur.tool) < 0) {
      S.cur.tool = 'report';
      return renderDoc(step);
    }
  }

  let tool = T[S.cur.tool];
  if (!tool || step.tools.indexOf(tool.id) < 0) {
    tool = T[step.tools[0]];
    S.cur.tool = tool.id;
  }
  const v = valsOf(tool);
  const outHtml = renderOut(tool, v);

  $('#main').innerHTML = mstepHtml() + `
    <div class="stepbar">
      <div class="stepbar-l">
        <div class="crumb">第 ${step.n} 步 · ${step.name}</div>
        <h2>${tool.name}</h2>
        <p class="desc">${tool.desc}</p>
      </div>
      <div class="stepbar-r">
        <button class="btn sm" id="btnPrompt">复制 AI 提示词</button>
        <button class="btn sm primary" id="btnCopyAll">复制本页结论</button>
      </div>
    </div>

    <div class="subnav">
      ${step.tools.map((tid, i) => `<button class="subnav-i ${tid === tool.id ? 'on' : ''}" data-tool="${tid}" data-step="${S.cur.step}">
        <b>${i + 1}</b>${T[tid].name}
      </button>`).join('')}
    </div>

    <div class="work">
      <div class="panel">
        <div class="panel-h">参数 <span>改一下，结果立刻重算</span></div>
        <div class="fields">
          ${tool.inputs.map(inp => fieldHtml(tool, inp, v[inp.k])).join('')}
        </div>
        <div class="panel-f">
          <button class="btn sm" data-reset="${tool.id}">恢复默认</button>
        </div>
      </div>
      <div class="result" id="result">${outHtml}</div>
    </div>`;

  bindTool(tool);
  hydrate();
  S.seen[tool.id] = true;
  save();
}

/* 文档模式：整篇文档，无参数面板 */
function renderDoc(step) {
  $('#main').innerHTML = mstepHtml() + `
    <div class="stepbar">
      <div class="stepbar-l">
        <div class="crumb">第 ${step.n} 步 · ${step.name}</div>
        <h2>选品调研报告</h2>
        <p class="desc">6 章 · 10 张图 · 四关放行。竞品按品类自动匹配，评论可粘贴或上传 CSV，导入后整篇图表重算。</p>
      </div>
      <div class="stepbar-r">
        <button class="btn sm" id="btnDocWord">导出 Word</button>
        <button class="btn sm" id="btnDocPrint">打印 / PDF</button>
        <button class="btn sm primary" id="btnDocCopy">复制全文</button>
      </div>
    </div>
    <div class="subnav">
      <button class="subnav-i on" data-tool="report" data-step="${S.cur.step}"><b>R</b>调研报告</button>
      ${step.tools.filter(t => t !== 'report').map((tid, i) => `<button class="subnav-i" data-tool="${tid}" data-step="${S.cur.step}"><b>${i + 1}</b>${T[tid].name}</button>`).join('')}
    </div>
    <div class="subnav docsub">
      ${step.subs.map((x, i) => `<button class="subnav-i" data-anchor="ch${i + 1}"><b>${i + 1}</b>${x}</button>`).join('')}
    </div>
    ${buildReport(ctxOf())}`;
  S.seen.report = true;
  save();
}

/* ---------- 评论数据接入 ---------- */
function openRvDock(mode) {
  const d = $('#rvdock');
  if (!d) return;
  stopNet();
  d.hidden = false;
  if (mode === 'paste') {
    d.innerHTML = `
      <div class="rvdock-h">
        <b>粘贴评论</b>
        <span>从 Amazon 商品页直接复制评论粘进来，空行分隔即可；也支持每行一条 <code>星级|日期|标题|正文</code></span>
      </div>
      <textarea id="rvText" rows="9" placeholder="5.0 out of 5 stars&#10;Reviewed in the United States on August 14, 2026&#10;Motor died after three months&#10;Worked fine at first, then it started smoking and stopped working…"></textarea>
      <div class="rvdock-f">
        <span class="sub2" id="rvMsg">会自动识别星级、日期、标题与正文</span>
        <button class="btn sm" data-rv="cancel">取消</button>
        <button class="btn sm primary" id="btnRvApply">解析并应用</button>
      </div>`;
    const ta = $('#rvText'); if (ta) ta.focus();
  } else if (mode === 'file') {
    d.innerHTML = `
      <div class="rvdock-h">
        <b>上传评论 CSV</b>
        <span>支持卖家精灵 / Helium 10 导出，或附录脚本产出的 reviews.csv。列名含 rating、body、title、date、asin 即可（大小写、中英文均可）</span>
      </div>
      <div class="rvdrop" id="rvDrop">
        <input type="file" id="rvFile" accept=".csv,.tsv,.txt" hidden>
        <button class="btn sm primary" data-rv="pick">选择文件</button>
        <span class="sub2">或把文件拖到这里</span>
      </div>
      <div class="rvdock-f"><span class="sub2" id="rvMsg"></span><button class="btn sm" data-rv="cancel">取消</button></div>`;
    const fi = $('#rvFile');
    if (fi) fi.addEventListener('change', () => { const f = fi.files[0]; if (f) readRvFile(f); });
    const drop = $('#rvDrop');
    if (drop) {
      ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, x => { x.preventDefault(); drop.classList.add('on'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, x => { x.preventDefault(); drop.classList.remove('on'); }));
      drop.addEventListener('drop', x => { const f = x.dataTransfer.files[0]; if (f) readRvFile(f); });
    }
  } else if (mode === 'net') {
    const def = { '美国': 'com', '欧洲': 'de', '东南亚': 'sg', '中东': 'ae', '拉美': 'com.mx', '日本': 'com' }[(S.project || {}).market] || 'com';
    d.innerHTML = `
      <div class="rvdock-h">
        <b>联网抓取<i class="opt">可选</i></b>
        <span>不跑任何本地脚本也能联网：中转或公开源都能直接读亚马逊在售页；全断时用该类目头部 6 款的内置样本，报告里会标明来源。<a href="javascript:void 0" data-netopen>换数据源 →</a></span>
      </div>
      <div class="netb" id="netB"><i></i><span id="netS">正在检查采集能力…</span></div>
      <div class="netf">
        <input id="netKw" placeholder="品类关键词，或直接贴 ASIN（多个用逗号隔开）">
        <select id="netMkt">${NET_SITES.map(([v, t]) => `<option value="${v}" ${v === def ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
      <div class="netf2">
        <label>抓几个竞品<input id="netLim" type="number" value="6" min="1" max="12"></label>
        <label>每个抓几页<input id="netRp" type="number" value="2" min="1" max="10"></label>
        <span class="sub2">每页 10 条，6×2 约 120 条，一般 1–2 分钟</span>
      </div>
      <div class="netcmd" id="netCmd" hidden>
        <code>python scripts/amazon_bridge.py --serve</code>
        <button class="btn xs" data-copy="python scripts/amazon_bridge.py --serve">复制命令</button>
      </div>
      <div class="rvdock-f">
        <span class="sub2" id="rvMsg"></span>
        <button class="btn sm" data-rv="cancel">取消</button>
        <button class="btn sm" id="netRetry">重新检测</button>
        <button class="btn sm primary" id="netGo" disabled>开始抓取</button>
      </div>`;
    netHealth();
  }
  d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* ---------- 联网：三档自适应（中转 / 公开源 / 离线），实现见 net.js ---------- */
const NET_SITES = [
  ['com', '美国 amazon.com'], ['co.uk', '英国 amazon.co.uk'], ['de', '德国 amazon.de'],
  ['fr', '法国 amazon.fr'], ['it', '意大利 amazon.it'], ['es', '西班牙 amazon.es'],
  ['nl', '荷兰 amazon.nl'], ['se', '瑞典 amazon.se'], ['pl', '波兰 amazon.pl'],
  ['ca', '加拿大 amazon.ca'], ['com.mx', '墨西哥 amazon.com.mx'], ['com.br', '巴西 amazon.com.br'],
  ['ae', '阿联酋 amazon.ae'], ['sa', '沙特 amazon.sa'], ['com.au', '澳洲 amazon.com.au'],
  ['in', '印度 amazon.in'], ['sg', '新加坡 amazon.sg']
];
let netTimer = null, netSeq = 0;

/* null=还没探过；true/false=探过了能不能拿实时数据。
   探到一次就缓存，避免每点一下都等超时。 */
let NET_ON = null;
let NET_MODE = '';
function probeNet(force) {
  return NETX.probe(force).then(s => {
    const on = NETX.canCrawl();
    const changed = (on !== NET_ON) || (NET_MODE !== s.mode);
    NET_ON = on; NET_MODE = s.mode;
    document.documentElement.dataset.net = s.mode;
    renderNetPill();
    if (changed && $('#auto') && (S.project.product || '').trim()) renderAuto();
    return on;
  });
}

function stopNet() {
  if (netTimer) clearTimeout(netTimer);
  netTimer = null;
  netSeq++;
}

function netFetch(url, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 6000);
  return fetch(url, { signal: ctl.signal, cache: 'no-store' })
    .then(r => r.json()).finally(() => clearTimeout(t));
}

function netHealth() {
  const s = $('#netS'), b = $('#netB'), go = $('#netGo'), cmd = $('#netCmd');
  if (!s) return;
  s.textContent = '正在检查联网能力…';
  if (b) b.className = 'netb';
  probeNet(true).then(() => {
    if (!$('#netS')) return;
    if (NET_MODE !== 'off') {
      $('#netB').className = 'netb on';
      $('#netS').textContent = '可联网 · ' + NETX.label().t + '（' + (NETX.st.note || '已连通') + '）：竞品价格、评分、实时词能取；评论正文要粘贴导入或走本机桥';
      if ($('#netGo')) { $('#netGo').textContent = '开始抓取'; $('#netGo').disabled = false; }
      if ($('#netCmd')) $('#netCmd').hidden = (NET_MODE === 'relay');
    } else {
      $('#netB').className = 'netb off';
      $('#netS').textContent = '当前断网 · 可以直接用内置样本；也可以在右上角配一次中转，之后永久在线';
      if ($('#netGo')) { $('#netGo').textContent = '用内置样本'; $('#netGo').disabled = false; }
      if ($('#netCmd')) $('#netCmd').hidden = false;
    }
  });
}

async function netStart() {
  /* 断网时这个按钮等于「就用内置样本」：数据本来就是内置的，只需说清楚 */
  if (!NET_ON) {
    const d = $('#rvdock'); if (d) { d.hidden = true; d.innerHTML = ''; }
    const cat = S.project.category || '（未定品类）';
    toast('已用内置样本：' + cat + ' · 头部 6 款');
    renderMain();
    return;
  }
  const kw = ($('#netKw') || {}).value || '';
  const val = kw.trim();
  const msg = $('#rvMsg');
  if (!val) { if (msg) msg.textContent = '先填关键词或 ASIN'; return; }
  const toks = val.split(/[,，\s]+/).filter(Boolean);
  const isAsin = toks.every(t => /^[A-Z0-9]{10}$/i.test(t));
  const mk = ($('#netMkt') || {}).value || 'com';
  const lim = Math.max(1, Math.min(12, +($('#netLim') || {}).value || 6));
  const rep = Math.max(1, Math.min(10, +($('#netRp') || {}).value || 2));
  const go = $('#netGo');
  if (go) go.disabled = true;
  if (msg) msg.textContent = '';

  /* 本地 python 桥：任务式接口，能指定站点与页数 */
  if (NETX.st.legacy) {
    const q = new URLSearchParams({
      market: mk, pages: '1', limit: String(lim), review_pages: String(rep)
    });
    if (isAsin) q.set('asin', toks.join(',')); else q.set('kw', val);
    netFetch(NETX.base + '/start?' + q.toString(), 15000).then(j => {
      if (!j || !j.ok) throw new Error(j && j.msg || '启动失败');
      $('#netS').textContent = '已开始，正在抓取…';
      netPoll(j.id, isAsin ? toks.join(',') : val);
    }).catch(e => {
      if (go) go.disabled = false;
      if ($('#netS')) $('#netS').textContent = '本地桥没响应：' + (e.message || '检查终端窗口是否还开着');
    });
    return;
  }

  /* 中转 / 公开源：先拿 ASIN 列表，再逐页翻评论页（浏览器自己解析） */
  const s = $('#netS');
  try {
    let asins = isAsin ? toks : [];
    if (!asins.length) {
      if (s) s.textContent = '正在打开在售页取 ASIN…';
      const list = await NETX.amazon(val, mk, lim);
      if (!list.ok) throw new Error(list.msg || '没拿到商品');
      asins = list.products.slice(0, lim).map(p => p.asin).filter(Boolean);
    }
    if (!asins.length) throw new Error('没拿到 ASIN');
    const all = [];
    for (let i = 0; i < asins.length; i++) {
      for (let pg = 1; pg <= rep; pg++) {
        if (s) s.textContent = `评论 ${i + 1}/${asins.length} · 第 ${pg}/${rep} 页 · 已收 ${all.length} 条`;
        const rows = await NETX.reviews(asins[i], pg).catch(() => []);
        all.push(...rows);
        if (!rows.length) break;
      }
      /* 第一个商品就一条都没有，说明这条路整体走不通（亚马逊现在要登录才给评论页），
         别再一个接一个空跑，直接把话说清楚 */
      if (i === 0 && !all.length) {
        throw new Error('评论正文取不到：亚马逊现在要登录才给评论页。价格与评分已在「联网收集」里拿到；正文请在「粘贴导入」里贴，或用本机桥');
      }
      if (all.length > 900) break;
    }
    if (!all.length) throw new Error('评论页没解析出内容，换个时段再试，或改走粘贴导入');
    netApply(all, val);
  } catch (e) {
    if (s) s.textContent = '抓取失败：' + (e.message || '');
    if (go) go.disabled = false;
  }
}

function netPoll(id, label) {
  const my = ++netSeq;
  const go = $('#netGo');
  netFetch(NETX.base + '/poll?id=' + id, 15000).then(j => {
    if (my !== netSeq || !$('#netS')) return;
    if (!j || !j.ok) throw new Error(j && j.msg || '查询失败');
    if (j.log && j.log.length) {
      $('#netS').textContent = j.log[j.log.length - 1] + (j.n ? ` · 累计 ${j.n} 条` : '');
    }
    if (j.state === 'running') { netTimer = setTimeout(() => netPoll(id, label), 1300); return; }
    if (j.state === 'done') return netApply(j.rows, label);
    $('#netS').textContent = j.msg || '抓取结束，但没有数据';
    if (go) go.disabled = false;
  }).catch(e => {
    if (my !== netSeq) return;
    if ($('#netS')) $('#netS').textContent = '连接中断：' + (e.message || '');
    if (go) go.disabled = false;
  });
}

/* ---------- 联网状态灯 + 数据源面板 ---------- */
function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts), z = n => (n < 10 ? '0' : '') + n;
  const same = d.toDateString() === new Date().toDateString();
  return (same ? '' : (d.getMonth() + 1) + '/' + d.getDate() + ' ') + z(d.getHours()) + ':' + z(d.getMinutes());
}

function renderNetPill() {
  const b = $('#netPill');
  if (!b) return;
  const L = NETX.label();
  b.className = 'netpill ' + L.tone;
  const at = (NET_MODE !== 'off' && S.auto && S.auto.liveAt) ? ' · ' + fmtTime(S.auto.liveAt) : '';
  const t = $('#netPillT');
  if (t) t.textContent = L.t + at;
  b.title = L.tone === 'off'
    ? '当前没有可用的联网通道 · 点这里配置（一次配置，之后一直在线）'
    : `${L.t}（${NETX.st.note || '已连通'}）· 点这里换数据源`;
}

function netDlgHtml() {
  const c = NETX.cfg, cur = NET_MODE;
  const card = (k, t, d) => `<button class="netcard ${cur === k ? 'on' : ''}" data-netmode="${k}">
      <b>${t}</b><span>${d}</span></button>`;
  return `
    <div class="dlg-h">
      <div><b>联网方式</b><span>数据从哪来、什么时候取的，都会写在页面上</span></div>
      <button class="dlg-x" data-netclose>✕</button>
    </div>
    <div class="dlg-b">
      <div class="netst ${NETX.label().tone}">
        <i></i>
        <div><b>${NETX.label().t}</b><span>${cur === 'off' ? '所有通道都没通，全篇用内置基线' : (NETX.st.note || '已连通') + ` · 探测 ${NETX.st.ms}ms`}</span></div>
        <button class="btn xs" data-nettest>重新检测</button>
      </div>

      <div class="netcards">
        ${card('relay', '自建中转 · 推荐', '浏览器只负责取网页，转发交给一个 20 行的云函数。部署一次永久有效，换电脑、换手机都能用，没有限流。')}
        ${card('public', '公开代理 · 免部署', '借第三方的跨域代理直接读网页。现在就能用，但会被限流、偶尔被拦，适合临时看看。')}
        ${card('off', '离线 · 内置基线', '完全断网。全篇照样出结论，但价格带与竞品是类目画像，不是今天的真实数据。')}
      </div>

      <div class="netrow">
        <label class="neturl">中转地址
          <input id="netBase" value="${esc(c.base || '')}" placeholder="https://xxx.workers.dev">
        </label>
        <button class="btn sm primary" data-netsave>保存并检测</button>
      </div>
      <div class="nethint" id="netHint">没部署也能用：选「公开代理」立刻生效。想稳，就把下面的中转部署一次。</div>

      <details class="netdep">
        <summary>部署自建中转（一次，之后不用再开电脑跑任何脚本）</summary>
        <ol>
          <li>打开 <code>dash.cloudflare.com</code> → Workers &amp; Pages → Create → Worker，随便起个名字。</li>
          <li>点 Edit code，把下面这段源码整个粘进去，Deploy。</li>
          <li>复制它给的地址（形如 <code>xxx.workers.dev</code>），填到上面「中转地址」，点保存并检测。</li>
        </ol>
        <div class="netdep-a">
          <button class="btn xs" data-netcopysrc>复制中转源码</button>
          <button class="btn xs ghost" data-netdl>下载 relay.js</button>
        </div>
        <div class="fx">说明：中转只做「代取网页」，解析全在本页做，所以它不含任何业务逻辑，也不用数据库。云函数出口是机房 IP，亚马逊偶尔会弹人机验证——搜索与建议词不受影响，商品页换个时段再试。</div>
      </details>

      <div class="netsw">
        <label><input type="checkbox" id="netProxy" ${c.proxy ? 'checked' : ''}> 允许公开 CORS 代理（免部署，可能被限流）</label>
        <label><input type="checkbox" id="netAuto" ${c.auto ? 'checked' : ''}> 打开页面自动刷新（缓存 ${c.ttl} 分钟）</label>
        <button class="btn xs ghost" data-netclear>清空联网缓存</button>
      </div>
    </div>`;
}

function refreshNetDlg() {
  const body = $('#netDlgBody');
  if (body && !$('#netDlg').hidden) body.innerHTML = netDlgHtml();
}

function openNetDlg() {
  const d = $('#netDlg');
  if (!d) return;
  $('#netDlgBody').innerHTML = netDlgHtml();
  d.hidden = false;
}

async function netPick(m) {
  if (m === 'relay') {
    const i = $('#netBase');
    if (i) { i.focus(); i.select(); }
    const h = $('#netHint');
    if (h) h.textContent = '把中转地址粘在这里（形如 https://xxx.workers.dev），保存后立刻生效。';
    return;
  }
  NETX.cfg.base = '';
  NETX.cfg.proxy = (m === 'public');
  NETX.saveCfg();
  await probeNet(true);
  refreshNetDlg();
}

/* 首次打开：有产品名、且上次实时数据已过期 → 静默刷一遍，页面上的时间戳会跟着变 */
function autoRefresh() {
  const name = (S.project.product || '').trim();
  if (!name || !NETX.cfg.auto) return;
  const age = Date.now() - ((S.auto && S.auto.liveAt) || 0);
  if (age < NETX.cfg.ttl * 60000) return;
  setTimeout(() => { autoNet(true); }, 900);
}

/* 状态灯与设置面板的事件：全部走事件委托，面板重渲染后也不会失效 */
function bindNet() {
  const d = $('#netDlg');
  if (d) {
    d.addEventListener('click', e => {
      if (e.target.closest('[data-netclose]')) { d.hidden = true; return; }
      const m = e.target.closest('[data-netmode]');
      if (m) { netPick(m.dataset.netmode); return; }
      if (e.target.closest('[data-nettest]')) {
        const h = $('#netHint'); if (h) h.textContent = '正在检测…';
        probeNet(true).then(() => { refreshNetDlg(); });
        return;
      }
      if (e.target.closest('[data-netsave]')) {
        const v = (($('#netBase') || {}).value || '').trim().replace(/\/+$/, '');
        NETX.cfg.base = v; NETX.saveCfg();
        const h = $('#netHint');
        if (h) h.textContent = v ? '正在检测中转…' : '没填地址：改用公开代理…';
        probeNet(true).then(() => {
          refreshNetDlg();
          const j = $('#netHint');
          if (!j) return;
          j.textContent = NET_MODE === 'relay'
            ? '中转已连通。之后打开页面就是实时数据，换电脑换手机同样有效。'
            : '这个地址没连上（/health 无响应）。确认已 Deploy、地址没写错、浏览器能直接打开「地址/health」。';
        });
        return;
      }
      if (e.target.closest('[data-netcopysrc]')) { copyText(NETX.workerSrc()); toast('中转源码已复制'); return; }
      if (e.target.closest('[data-netdl]')) {
        dlBlob('relay.js', new Blob([NETX.workerSrc()], { type: 'text/javascript;charset=utf-8' }));
        return;
      }
      if (e.target.closest('[data-netclear]')) {
        S.auto.liveAt = 0; S.auto.live = null; S.auto.net = null;
        if (S.auto.source === 'net') S.auto.source = 'base';
        save(); renderAuto(); renderMain(); refreshNetDlg();
        toast('已清空联网缓存，下次收集会重新拉');
        return;
      }
    });
    d.addEventListener('change', async e => {
      if (e.target.id === 'netProxy') {
        NETX.cfg.proxy = e.target.checked; NETX.saveCfg();
        await probeNet(true); refreshNetDlg();
      }
      if (e.target.id === 'netAuto') {
        NETX.cfg.auto = e.target.checked; NETX.saveCfg();
        toast(e.target.checked ? '已开启：打开页面自动刷新' : '已关闭自动刷新');
      }
    });
  }
  const pill = $('#netPill');
  if (pill) pill.addEventListener('click', openNetDlg);
  document.addEventListener('click', e => {
    if (e.target.closest('[data-netopen]')) { e.preventDefault(); openNetDlg(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && d && !d.hidden) d.hidden = true;
  });
}

function netApply(rows, label) {
  const cell = v => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = ['asin,rating,title,body,date,verified,helpful']
    .concat((rows || []).map(r => [r.asin, r.rating, r.title, r.body, r.date, r.verified, r.helpful].map(cell).join(',')))
    .join('\n');
  const res = ingestReviews(csv, '联网抓取 · ' + label, true);
  const s = $('#netS');
  const go = $('#netGo');
  if (!res.ok) {
    if (s) s.textContent = '抓到了 ' + (rows || []).length + ' 条，但解析失败：' + res.msg;
    if (go) go.disabled = false;
    return;
  }
  renderMain();
  toast(`已从亚马逊抓到 ${res.n} 条评论，全篇已按真实数据重算`);
}

function readRvFile(f) {
  const msg = $('#rvMsg');
  if (msg) msg.textContent = '读取中…';
  const fr = new FileReader();
  fr.onload = () => {
    const res = ingestReviews(String(fr.result || ''), f.name, /\.(csv|tsv)$/i.test(f.name));
    if (!res.ok) { if (msg) msg.textContent = res.msg; return; }
    renderMain();
    toast(`已导入 ${res.n} 条评论，全篇已按真实数据重算`);
  };
  fr.onerror = () => { if (msg) msg.textContent = '文件读不出来，换个编码试试（UTF-8 / GBK）'; };
  fr.readAsText(f, 'utf-8');
}

function ingestReviews(text, name, forceCsv) {
  const src = String(text || '').trim();
  if (!src) return { ok: false, msg: '内容为空' };
  const first = src.split(/\r?\n/)[0] || '';
  const looksCsv = /[,\t;]/.test(first) && first.split(/[,\t;]/).length >= 3;
  const r = (forceCsv || looksCsv) ? rvFromCSV(src) : rvFromText(src);
  if (!r.items.length) return { ok: false, msg: '没解析出评论，检查是否把页面其他文字一起复制进来了' };
  S.reviews = {
    items: r.items.slice(0, 1500),
    at: new Date().toISOString().slice(0, 10),
    name: name || '手动导入'
  };
  save();
  return { ok: true, n: r.items.length, note: r.note };
}

function fieldHtml(tool, inp, val) {
  const id = `f_${tool.id}_${inp.k}`;
  let ctl = '';
  if (inp.type === 'area') ctl = `<textarea id="${id}" rows="${inp.rows || 4}" placeholder="${esc(inp.ph || '')}">${esc(val)}</textarea>`;
  else if (inp.type === 'select') ctl = `<select id="${id}">${inp.opts.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (inp.type === 'num') ctl = `<input id="${id}" type="number" step="any" value="${esc(val)}" placeholder="${esc(inp.ph || '')}">`;
  else if (inp.type === 'multi') ctl = `<div class="chips" id="${id}">${inp.opts.map(o => `<button class="chip ${String(val).indexOf(o) > -1 ? 'on' : ''}" data-multi="1" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  else if (inp.type === 'image') {
    const has = IMGS[tool.id];
    ctl = `<div class="imgpick" id="${id}">
      <label class="imgbtn">${has ? '重新选择' : '上传图片'}<input type="file" accept="image/*" hidden></label>
      ${has ? `<img class="imgprev" src="${has}" alt=""><button class="imgclr" data-imgclr="${tool.id}">移除</button>` : '<span class="imgnone">未上传 · 用图位占位</span>'}
    </div>`;
  }
  else ctl = `<input id="${id}" value="${esc(val)}" placeholder="${esc(inp.ph || '')}">`;
  return `<div class="fld">
    <label for="${id}">${inp.label}</label>
    ${ctl}
    ${inp.hint ? `<div class="fhint">${inp.hint}</div>` : ''}
  </div>`;
}

/* 空状态：告诉用户这个工具需要填什么 */
function guideHtml(tool, v) {
  const miss = (tool.inputs || []).filter(i => i.type !== 'image' && !String(v[i.k] || '').trim());
  if (!miss.length) return '';
  return `<div class="blk guide">
    <div class="blk-h">这个工具需要 ${miss.length} 项数据</div>
    <ul class="ul">${miss.map(i => `<li><b>${i.label}</b>${i.hint ? '<span class="fx"> — ' + i.hint + '</span>' : ''}</li>`).join('')}</ul>
    <div class="fx2">填进左侧参数区，结果会自动算出来。不确定数字时，先点右上角「填入示例」看一遍完整效果。</div>
  </div>`;
}

/* 全部参数仍是预填默认值时，明确告诉用户这是示例 */
function sampleBar(tool, v) {
  const defs = (tool.inputs || []).filter(i => i.def);
  if (!defs.length) return '';
  const untouched = tool.inputs.every(i => i.type === 'image' || String(v[i.k] || '') === String(i.def || ''));
  if (!untouched) return '';
  return `<div class="sbar">下面用的是示例数据（已预填）—— 把左侧参数换成你的真实数字，结论会立刻跟着变。</div>`;
}

function renderOut(tool, v) {
  let out;
  try { out = tool.out(v, ctxOf()) || { html: '' }; } catch (e) { out = { html: `<div class="note err">计算出错：${esc(e.message)}</div>` }; }
  let html = out.html || '';
  /* 兜底：文本里的裸 "<"（如 "CTR < 0.3%"）会被浏览器当成标签吞掉，统一转义 */
  html = html.replace(/<(?![/a-zA-Z!?])/g, '&lt;');
  if (!/class="blk"/.test(html) && !/class="docwrap"/.test(html)) html += guideHtml(tool, v);
  return sampleBar(tool, v) + html;
}

function recompute(tool) {
  const el = $('#result');
  if (el) { el.innerHTML = renderOut(tool, valsOf(tool)); hydrate(); }
}

/* iframe 预览：把生成好的整页塞进 srcdoc */
function hydrate() {
  $$('iframe[data-page]').forEach(f => {
    const html = (window.__PAGES || {})[f.dataset.page];
    if (!html) return;
    const box = f.parentElement;
    const fit = () => {
      try {
        const d = f.contentDocument;
        const DW = 1200;                       /* 按桌面宽度渲染，再等比缩小 */
        const s = Math.max(box.clientWidth / DW, .2);
        const h = d.documentElement.scrollHeight;
        f.style.width = DW + 'px';
        f.style.height = h + 'px';
        f.style.transform = `scale(${s})`;
        box.style.height = Math.min(Math.max(h * s, 380), 1560) + 'px';
      } catch (e) { }
    };
    f.addEventListener('load', () => { fit(); setTimeout(fit, 120); });
    f.srcdoc = html;
    setTimeout(fit, 60);
  });
}

function bindTool(tool) {
  (tool.inputs || []).forEach(inp => {
    const id = `f_${tool.id}_${inp.k}`;
    const el = document.getElementById(id);
    if (!el) return;

    if (inp.type === 'image') {
      const file = el.querySelector('input[type=file]');
      if (file) file.addEventListener('change', () => {
        const f = file.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          const img = new Image();
          img.onload = () => {
            const max = 1000;
            const s = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * s);
            c.height = Math.round(img.height * s);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            IMGS[tool.id] = c.toDataURL('image/jpeg', 0.86);
            renderMain();
            toast('图片已嵌入，海报自动合成');
          };
          img.src = rd.result;
        };
        rd.readAsDataURL(f);
      });
      return;
    }

    if (inp.type === 'multi') {
      $$('.chip', el).forEach(c => c.addEventListener('click', () => {
        c.classList.toggle('on');
        const cur = $$('.chip.on', el).map(x => x.dataset.v);
        setVal(tool.id, inp.k, cur.join(','));
        recompute(tool);
      }));
      return;
    }
    const ev = (inp.type === 'select') ? 'change' : 'input';
    el.addEventListener(ev, () => {
      setVal(tool.id, inp.k, el.value);
      recompute(tool);
    });
  });
  const r = $('[data-reset]');
  if (r) r.addEventListener('click', () => {
    S.vals[tool.id] = {};
    delete IMGS[tool.id];
    save();
    renderMain();
  });
}

function setVal(tid, k, v) {
  S.vals[tid] = S.vals[tid] || {};
  S.vals[tid][k] = v;
  save();
}

/* ---------- 下载 ---------- */
function dlBlob(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('已下载 ' + name);
}

/* ---------- 事件 ---------- */
function bindGlobal() {
  document.addEventListener('click', e => {
    const toolBtn = e.target.closest('[data-tool]');
    if (toolBtn) {
      S.cur = { step: +toolBtn.dataset.step, tool: toolBtn.dataset.tool };
      save(); renderNav(); renderMain();
      window.scrollTo(0, 0);
      return;
    }
    const stepBtn = e.target.closest('[data-step]');
    if (stepBtn) {
      const si = +stepBtn.dataset.step;
      S.cur = { step: si, tool: STEPS[si].tools[0] };
      save(); renderNav(); renderMain();
      window.scrollTo(0, 0);
      return;
    }

    /* 文档内跳转 */
    const anc = e.target.closest('[data-anchor]');
    if (anc) {
      const el = document.getElementById(anc.dataset.anchor);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: 'smooth' });
      return;
    }

    /* 详情页导出 */
    const htmlSave = e.target.closest('[data-htmlsave]');
    if (htmlSave) {
      const html = (window.__PAGES || {})[htmlSave.dataset.htmlsave];
      if (html) dlBlob(`${(S.project.product || '产品')}_详情页.html`, new Blob([html], { type: 'text/html;charset=utf-8' }));
      return;
    }

    const htmlOpen = e.target.closest('[data-htmlopen]');
    if (htmlOpen) {
      const html = (window.__PAGES || {})[htmlOpen.dataset.htmlopen];
      if (html) window.open(URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })), '_blank');
      return;
    }

    const copyPage = e.target.closest('[data-copy-page]');
    if (copyPage) {
      const html = (window.__PAGES || {})[copyPage.dataset.copyPage];
      if (html) { copyText(html); toast('页面源码已复制'); }
      return;
    }

    const imgClr = e.target.closest('[data-imgclr]');
    if (imgClr) { delete IMGS[imgClr.dataset.imgclr]; renderMain(); return; }

    /* 标签集合 */
    const tg = e.target.closest('.tagg');
    if (tg) {
      const k = tg.dataset.tag;
      if (TAGSEL.has(k)) TAGSEL.delete(k); else TAGSEL.add(k);
      tagSync();
      return;
    }
    if (e.target.closest('[data-tagclr]')) { TAGSEL.clear(); tagSync(); return; }
    const ct = e.target.closest('[data-copytag]');
    if (ct) { copyTag(ct.dataset.copytag); return; }

    /* 日历 .ics：不带 BOM，直接 CRLF */
    const raw = e.target.closest('[data-raw]');
    if (raw) {
      const txt = raw.getAttribute('data-raw').replace(/\r?\n/g, '\r\n');
      dlBlob(raw.getAttribute('data-name') || 'export.ics', new Blob([txt], { type: 'text/calendar;charset=utf-8' }));
      return;
    }
    const txtDl = e.target.closest('[data-txtname]');
    if (txtDl) { download(txtDl.getAttribute('data-txtname'), txtDl.getAttribute('data-txt')); return; }

    /* 评论数据接入 */
    const rvBtn = e.target.closest('[data-rv]');
    if (rvBtn) {
      const m = rvBtn.dataset.rv;
      if (m === 'paste' || m === 'file' || m === 'net') { openRvDock(m); return; }
      if (m === 'cancel') { stopNet(); const d = $('#rvdock'); if (d) { d.hidden = true; d.innerHTML = ''; } return; }
      if (m === 'reset') { S.reviews = null; save(); renderMain(); toast('已改回内置样本'); return; }
      if (m === 'pick') { const fi = $('#rvFile'); if (fi) fi.click(); return; }
    }
    if (e.target.closest('#netGo')) { netStart(); return; }
    if (e.target.closest('#netRetry')) { netHealth(); return; }
    if (e.target.closest('#btnRvApply')) {
      const ta = $('#rvText');
      const res = ingestReviews(ta ? ta.value : '', '粘贴导入');
      if (!res.ok) { const m = $('#rvMsg'); if (m) m.textContent = res.msg; return; }
      renderMain();
      toast(`已导入 ${res.n} 条评论，全篇已按真实数据重算`);
      return;
    }

    /* 文档工具条 */
    if (e.target.closest('#btnDocWord')) { exportWord(); return; }
    if (e.target.closest('#btnDocPrint')) { window.print(); return; }
    if (e.target.closest('#btnDocCopy')) {
      const p = $('#paper');
      if (p) { copyText(p.innerText); toast('全文已复制'); }
      return;
    }

    const cp = e.target.closest('[data-copy]');
    if (cp) { copyText(cp.getAttribute('data-copy')); toast('已复制'); return; }

    const dl = e.target.closest('[data-dl]');
    if (dl) { download(dl.getAttribute('data-name') || 'export.csv', dl.getAttribute('data-dl')); return; }

    if (e.target.closest('#btnCopyAll')) {
      const t = T[S.cur.tool];
      if (t) { copyText(toolText(t)); toast('本页结论已复制'); }
      return;
    }
    if (e.target.closest('#btnPrompt')) {
      copyText(buildPrompt(T[S.cur.tool]));
      toast('提示词已复制，粘到 ChatGPT / DeepSeek 即可');
      return;
    }
    if (e.target.closest('#btnExportAll')) { exportAll(); return; }
    if (e.target.closest('#btnClear')) {
      if (confirm('清空所有输入，恢复默认示例？')) { localStorage.removeItem(LS); location.reload(); }
      return;
    }
    if (e.target.closest('#btnDemo')) { applyDemo(); return; }
    if (e.target.closest('#autoRun')) {
      if (!(S.project.product || '').trim()) { toast('先填产品名'); return; }
      applyInfer(true); toast('已按产品名重新推断');
      return;
    }
    if (e.target.closest('#autoNet')) {
      /* 断网时这个按钮不是「跑一遍没用的」，而是把联网配置打开 */
      if (NET_MODE === 'off') openNetDlg(); else autoNet();
      return;
    }
    if (e.target.closest('#autoEditBtn')) {
      const box = $('#autoEdit'), pts = $('#autoEditPts');
      const open = box && box.hidden;
      if (box) box.hidden = !open;
      if (pts) pts.hidden = !open;
      e.target.closest('#autoEditBtn').textContent = open ? '收起手改' : '手动修改';
      return;
    }
    if (e.target.closest('#projToggle')) { $('#proj').classList.toggle('fold'); return; }
  });

  document.addEventListener('change', e => {
    if (e.target && e.target.id === 'mStep') {
      const si = +e.target.value;
      S.cur = { step: si, tool: STEPS[si].tools[0] };
      save(); renderNav(); renderMain();
      window.scrollTo(0, 0);
    }
  });

  const bindProj = () => {
    $$('#proj [data-pk]').forEach(el => {
      const k = el.dataset.pk;
      const fire = () => {
        S.project[k] = el.value;
        if (k === 'product') {
          /* 换了产品就是换一套推断：品类/人群/卖点必须跟着重推，
             否则之前「手改」的旧品类会被一直锁住，报告整篇还在用上一个品类的竞品 */
          S.auto = S.auto || { manual: {} };
          S.auto.manual = {};
          save();
          renderAuto();
          scheduleInfer();
          return;
        }
        if (k === 'market') { applyInfer(false); return; }
        /* 其余字段：用户改过就不再被自动覆盖 */
        S.auto = S.auto || { manual: {} };
        S.auto.manual = Object.assign({}, S.auto.manual, { [k]: true });
        save(); renderAuto(); renderMain();
      };
      el.addEventListener('input', fire);
      el.addEventListener('change', () => { if (k === 'market') fire(); });
    });
  };
  bindProj();
  window.__bindProj = bindProj;
}

/* ---------- 文本化 / 导出 ---------- */
function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll('button, .bar, i, .mbar-t').forEach(x => x.remove());
  /* SVG 图表在纯文本里只留图注，否则会拼出一堆坐标文字 */
  d.querySelectorAll('svg').forEach(sv => {
    const cap = document.createElement('div');
    cap.textContent = '【图】' + (sv.getAttribute('aria-label') || '') + '（完整图表见应用内）';
    sv.replaceWith(cap);
  });
  /* 长脚本在 Markdown 里只留开头，避免把全案撑成代码仓库 */
  d.querySelectorAll('pre.pcode.py').forEach(pre => {
    const L = (pre.textContent || '').split('\n');
    if (L.length > 8) pre.textContent = L.slice(0, 6).join('\n') + '\n…（共 ' + L.length + ' 行，完整脚本在应用内可复制 / 下载）';
  });
  let t = d.innerText || d.textContent || '';
  return t.replace(/\n{3,}/g, '\n\n').trim();
}
function toolText(t) {
  const el = $('#result');
  return `## ${t.name}\n\n${el ? (el.innerText || '').trim() : ''}`;
}
function buildPrompt(t) {
  const p = S.project, v = valsOf(t);
  const pins = (t.inputs || []).map(i => `- ${i.label}：${v[i.k] || '（未填）'}`).join('\n');
  return `你是资深跨境电商操盘手。请针对以下产品，完成「${t.name}」这一环节，输出必须具体到可直接执行，不要泛泛而谈。

【产品信息】
- 产品：${p.product || '（未填）'}
- 品类：${p.category || '（未填）'}
- 目标市场：${p.market}
- 主推平台：${p.platform}
- 价格带：${p.price || '（未填）'}
- 目标人群：${p.audience || '（未填）'}
- 核心卖点：${p.points || '（未填）'}

【本环节参数】
${pins}

【要求】
1. 先给结论，再给依据；
2. 所有文案给到可直接复制使用的成品（英文文案需地道，符合目标市场习惯）；
3. 涉及数字的地方给出具体数值与算法，不要写"大约""可能"；
4. 指出这一环节最容易踩的 2 个坑；
5. 用 Markdown 表格与清单组织，不要长段落。`;
}

function exportWord() {
  const paper = $('#paper');
  if (!paper) return;
  /* Word 对内联 SVG 支持不稳，换成图注，避免打开后是一片空白 */
  const clone = paper.cloneNode(true);
  clone.querySelectorAll('svg').forEach(sv => {
    const cap = document.createElement('p');
    cap.setAttribute('style', 'color:#666;font-size:9pt;margin:4pt 0');
    cap.textContent = '【图】' + (sv.getAttribute('aria-label') || '') + '（图表请在应用内或 PDF 版查看）';
    sv.replaceWith(cap);
  });
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>选品调研报告</title><style>${DOC_WORD_CSS}</style></head>
<body>${clone.innerHTML}</body></html>`;
  dlBlob(`${(S.project.product || '产品')}_选品调研报告.doc`, new Blob(['\ufeff' + html], { type: 'application/msword' }));
}

function exportAll() {
  const now = new Date().toLocaleString('zh-CN');
  let md = `# ${S.project.product || '未命名产品'}｜跨境电商 8 步执行全案\n\n`;
  md += `> 市场：${S.project.market} ｜ 平台：${S.project.platform} ｜ 价格带：${S.project.price || '—'} ｜ 人群：${S.project.audience || '—'}\n`;
  md += `> 品类：${S.project.category || '—'} ｜ 卖点：${S.project.points || '—'}\n> 生成时间：${now}\n\n---\n\n`;
  STEPS.forEach((s, si) => {
    md += `# ${s.n} ${s.name}\n\n`;
    if (s.doc) {
      md += `${stripHtml(buildReport(ctxOf()))}\n\n---\n\n`;
      return;
    }
    s.tools.forEach((tid, ti) => {
      const t = T[tid];
      const v = valsOf(t);
      let html = '';
      try { html = (t.out(v, ctxOf()) || {}).html || ''; } catch (e) { html = ''; }
      md += `## ${si + 1}.${ti + 1} ${t.name}\n\n${stripHtml(html)}\n\n`;
    });
    md += `---\n\n`;
  });
  download(`${(S.project.product || '营销全案').replace(/[\\/:*?"<>|]/g, '')}_8步执行全案.md`, md);
}
function download(name, text) {
  dlBlob(name, new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' }));
}
function copyText(t) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(t).catch(() => fallbackCopy(t));
  } else fallbackCopy(t);
}
function fallbackCopy(t) {
  const ta = document.createElement('textarea');
  ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) { }
  document.body.removeChild(ta);
}
let toastT;
function toast(m) {
  const el = $('#toast');
  el.textContent = m; el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 1800);
}

/* ---------- 示例数据 ---------- */
function applyDemo() {
  S.project = Object.assign({}, DEMO);
  S.auto = { profile: inferProfile(DEMO.product, DEMO.market), manual: {}, source: 'demo', at: '' };
  S.vals = {
    track: { vol: '35000', comp: '800', rev: '1200', aov: '32', gm: '55', grow: '上升' },
    pain: { text: '用了两次就不转了，充不进电\n清洗太麻烦，刀头拆不下来\n打冰打不碎，全是块\n漏水，包里全湿了\n噪音太大了，早上不敢用\n充一次电只能用一天\n刀头生锈了\n容量太小，一次只能打一杯\n硅胶圈掉了找不到\n说明书看不懂', n: '200' },
    compete: { a: '29 / 4.5 / 3200 / 便携快充', b: '39 / 4.3 / 860 / 大容量', c: '19 / 4.1 / 5400 / 便宜', mine: '32 / 4.6 / 自清洁+静音' },
    keyword: { title: 'Portable Blender for Travel, USB-C Rechargeable Personal Blender with 6 Blades, Self-Cleaning, 350ml' },
    pick: { aov: '32', budget: '3000', content: '中（能用模板）', supply: '稳定货源但无成本优势', brand: '先赚快钱' },
    ads: { cpm: '12', ctr: '1.6', cvr: '2.2', aov: '32', gm: '55', budget: '100' },
    metrics: { imp: '120000', click: '3200', visit: '2600', cart: '320', order: '62', aov: '32' },
    adsreview: { spend: '800', rev: '1600', orders: '45', gm: '55', imp: '60000', clicks: '900' },
    title: { main: 'portable blender', attr: 'USB-C rechargeable, 6 blades, self-cleaning', scene: 'for travel, gym, office', test: '' },
    hero: { title: '便携榨汁杯', sub: '一冲即净 · 30 秒现榨', brand: 'VITAFRESH', p1: '10 秒自清洁', p2: '6 叶刀头打冰', p3: 'Type-C 快充', cta: '立即抢购', price: '$32', pal: '深蓝科技' },
    emotion: { cost: '42', freight: '9', rate: '7.1', custom: '可改配色 / 配件 / 套装', content: '每周 3–8 条', story: '有一句话定位' },
    visual: { brand: 'VITAFRESH', style: 'Clean Girl 干净感', color: '奶白 + 原木', scene: '晨光厨房台面', model: '手部出镜' },
    calendar: { per: '每周 5 条', face: '不出镜（纯产品）', time: '10:00', start: '' },
    daily: { time: '08:00', ch: '飞书群机器人', shop: 'VITAFRESH', acos: '35', gm: '30' },
    detail: { brand: 'VITAFRESH', price: '32', p1: '一键自清洁，冲水 10 秒', p2: '6 叶不锈钢刀头，冰块也能打', p3: 'Type-C 快充，充满用一周', p4: '350g 超轻，单手可握', p5: '食品级材质，BPA Free' }
  };
  $$('#proj [data-pk]').forEach(el => { el.value = S.project[el.dataset.pk] || ''; });
  save();
  renderAuto(); renderNav(); renderMain();
  toast('示例数据已填入');
}

/* ---------- 启动 ---------- */
function init() {
  load();
  if (window.innerWidth <= 960) $('#proj').classList.add('fold');
  $$('#proj [data-pk]').forEach(el => { el.value = S.project[el.dataset.pk] || ''; });
  /* 老数据只有产品名 / 从未补全过：进来就补一次 */
  if ((S.project.product || '').trim() && (!S.project.category || !S.project.points)) {
    const prof = inferProfile(S.project.product, S.project.market);
    const man = (S.auto && S.auto.manual) || {};
    S.auto = Object.assign({ profile: prof, manual: man, source: 'local', at: '' }, S.auto, { profile: prof });
    if (!man.category) S.project.category = prof.cat;
    if (!man.price) S.project.price = String(prof.price);
    if (!man.audience) S.project.audience = prof.aud;
    if (!man.points) S.project.points = prof.pts.join('\n');
    $$('#proj [data-pk]').forEach(el => { el.value = S.project[el.dataset.pk] || ''; });
  }
  renderAuto();
  renderNav();
  renderMain();
  bindGlobal();
  bindNet();
  /* 后台探一次联网能力：只影响状态灯与按钮文案，不阻塞首屏；
     探完再决定要不要按 TTL 自动刷一次实时数据 */
  probeNet().then(() => { renderNetPill(); autoRefresh(); });
  const q = new URLSearchParams(location.search);
  if (q.get('demo') === '1') {
    applyDemo();
    const want = q.get('tool');
    if (want && T[want]) {
      const si = STEPS.findIndex(s => s.tools.indexOf(want) > -1);
      if (si > -1) { S.cur = { step: si, tool: want }; renderNav(); renderMain(); }
    }
  }
}

/* 工具总数只在这里算一次：新增/合并工具后，标题与侧栏数字自动跟上，不用去改三处文案 */
const TC = STEPS.reduce((a, s) => a + s.tools.length, 0);
document.addEventListener('DOMContentLoaded', () => {
  document.title = document.title.replace(/\d+ 个细分工具/, TC + ' 个细分工具');
  $$('[data-tc]').forEach(el => { el.textContent = TC; });
  /* 品类可手改：把内置类目做成候选，既避免打错字，也允许填库外的 */
  const dl = $('#catList');
  if (dl && typeof CAT !== 'undefined') {
    dl.innerHTML = Object.keys(CAT).filter(k => k !== '（未填品类）').map(k => `<option value="${k}">`).join('');
  }
  init();
});
