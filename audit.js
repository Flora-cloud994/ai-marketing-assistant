/* =========================================================
   audit.js — 上架体检 · 100 分制（8 维）
   维度与权重取自 GitHub 开源 skill 的 Amazon listing 审计模型
   （nexscope-ai/Amazon-Skills · amazon-listing-optimization）：
     Title 15 / Bullets 15 / Images 15 / A+ 10 / Description 10
     Pricing 10 / Reviews 15 / SEO 10
   开源版靠抓页面 + 大模型判断，这里改成「离线可复算」的版本：
   能算的给实测值，算不了的（图 / A+ / 描述文案）如实标「待核」，不编分。
   ========================================================= */

/* 从词组里删掉核心词：「stainless steel blades portable blender」→「stainless steel blades」 */
function auditStrip(core, s) {
  const v = String(s || '');
  if (!core) return v.trim();
  const re = new RegExp('(^|\\s)' + String(core).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)', 'ig');
  return v.replace(re, ' ').replace(/\s+/g, ' ').trim();
}

/* ---------- 标题骨架 ----------
   顺序按平台实际权重：核心词打头（前 80 字符内必须出现），
   属性词居中，痛点与场景收尾。核心词重复出现只占字符位，不加权，所以全篇去重。 */
function auditTitle(ctx, kw, lim) {
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const core = String(kw.core || '');
  const rows = kw.rows || [];
  const pick = t => (rows.find(r => r.type === t) || {}).k || '';
  const many = t => rows.filter(r => r.type === t).map(r => r.k);
  const strip = s => auditStrip(core, s);
  const toks = s => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const seen = {};
  toks(core).forEach(w => { seen[w] = 1; });
  const fresh = s => toks(s).every(w => !seen[w]);   /* 有一个词重复就换下一条 */
  const take = s => { toks(s).forEach(w => { seen[w] = 1; }); return s; };

  const seg = [];
  if (core) seg.push(take(cap(core)));
  const attrs = many('属性词').map(a => strip(a).replace(/^with\s+/i, '')).filter(a => a && fresh(a));
  attrs.slice(0, 2).forEach(a => { if (fresh(a)) seg.push(take(a)); });

  const pain = strip(pick('痛点词')).replace(/^with\s+/i, '');
  const scene = strip(pick('场景词'));
  const tail = [pain, scene].filter(x => x && fresh(x)).join(' ');
  if (tail) seg.push(take(tail));

  /* 超限就从尾巴上砍，砍到合规为止 —— 标题宁可少一个卖点，也不能被截断 */
  let title = seg.join(', ');
  while (title.length > lim.title && seg.length > 1) {
    seg.pop();
    title = seg.join(', ');
  }
  return { title, len: title.length, seg: seg.length };
}

/* 每个词该落在哪：T 标题 / B 五点 / D 描述 / '' 只投广告（不进 listing） */
function auditPlace(r) {
  switch (r.type) {
    case '核心词': case '精准词': return 'TBD';
    case '属性词': return 'TB';
    case '场景词': return 'BD';
    case '实时词': case '长尾词': return 'BD';
    case '痛点词': return 'TD';
    case '竞品词': return '';       /* 商标风险：只能投广告，不能写进 listing */
    default: return 'B';
  }
}

function auditSection(ctx) {
  const pf = (typeof C !== 'undefined' && C.plat) ? C.plat(ctx) : 'Amazon';
  const lim = LIMIT[pf] || LIMIT['还没定'];
  const kw = kwClusters(ctx);
  const { list, st } = hotOf(ctx);
  const sym = mkOf(ctx.market).sym;

  if (!kw.rows || !kw.rows.length) {
    return `<section class="ch" id="audit">
      <h2><i>上架前</i>Listing 体检 · 100 分</h2>
      <div class="stopbox"><b>没有核心词，体检做不了</b><span>这一节的每一项都是拿「目标词 × 你的标题 / 五点」算出来的。产品名还没识别出品类，词簇是空的 —— 先定品类，回来这节会自动重算。</span></div>
    </section>`;
  }

  const rows = kw.rows;
  const T = auditTitle(ctx, kw, lim);
  const core = String(kw.core || '');
  const lc = T.title.toLowerCase();
  const corePos = core ? lc.indexOf(core.toLowerCase()) : -1;
  const STOP = { for: 1, to: 1, with: 1, and: 1, the: 1, a: 1, of: 1, in: 1, on: 1 };
  const tk = x => String(x || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !STOP[w]);
  const has = k => {
    const need = tk(k);
    return need.length > 0 && need.every(w => lc.indexOf(w) > -1);
  };

  /* ---------- 1. Title /15 ---------- */
  const over = Math.max(0, T.len - lim.title);
  const sLen = over ? Math.max(0, 6 - Math.ceil(over / 15)) : T.len < 60 ? 3 : T.len < 100 ? 5 : 6;
  const sPos = (corePos > -1 && corePos < 80) ? 4 : 0;
  const tTgt = rows.filter(r => auditPlace(r).indexOf('T') > -1);
  const tHit = tTgt.filter(r => has(r.k));
  const covT = tTgt.length ? tHit.length / tTgt.length : 0;
  const sCov = covT >= .8 ? 3 : covT >= .5 ? 2 : covT > 0 ? 1 : 0;
  const banHit = (typeof BAN !== 'undefined' ? BAN : []).filter(b => new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(T.title));
  const sBan = banHit.length ? 0 : 2;
  const titleScore = sLen + sPos + sCov + sBan;

  /* ---------- 2. Bullets /15 ---------- */
  const pts = (typeof toEn === 'function') ? toEn(ctx.points).filter(Boolean) : [];
  const bPool = rows.filter(r => r.type !== '竞品词' && String(r.k).toLowerCase().indexOf(core.toLowerCase()) > -1);
  const usedW = {};
  const bullets = [];
  for (let i = 0; i < 5; i++) {
    const head = pts[i] || ['premium quality', 'easy to use', 'value pack', 'gift ready', 'worry free'][i];
    const w = bPool.find(x => !usedW[x.k] && (pts[i] ? true : i >= pts.length));
    if (w) usedW[w.k] = 1;
    bullets.push({ head, word: w ? w.k : '' });
  }
  const bWith = bullets.filter(b => b.word).length;
  const sBN = Math.min(6, bullets.length * 1.2);
  const sBW = Math.min(5, bWith);
  /* 利益型开头只有在你真填了卖点时才成立，兜底串不算 */
  const sBH = pts.length >= 3 ? 2 : pts.length >= 1 ? 1 : 0;
  const sBD = (new Set(bullets.map(b => b.word).filter(Boolean)).size === bWith) ? 2 : 1;
  const bulletScore = sBN + sBW + sBH + sBD;

  /* ---------- 5. Pricing /10 ---------- */
  const med = st.med || 30;
  const price = num(ctx.price) || med;
  const gap = (price - med) / med;
  const priceScore = gap <= -0.15 ? 6 : gap <= -0.05 ? 10 : Math.abs(gap) <= 0.05 ? 8 : gap <= 0.12 ? 6 : gap <= 0.25 ? 3 : 1;
  const priceWhy = gap <= -0.15 ? `比中位低 ${pct(-gap)}，是价格武器，但毛利会被压到很薄` :
    gap <= -0.05 ? `比中位低 ${pct(-gap)}，进得来又不至于打穿底价` :
      Math.abs(gap) <= 0.05 ? '贴着中位，只能靠差异而不是价格' :
        `比中位高 ${pct(gap)}，主图必须第一眼看出「贵在哪」，否则没有点击理由`;

  /* ---------- 6. Reviews /15（门槛，不是你的评分） ---------- */
  const top3 = list.slice(0, 3);
  const revMed = top3.length ? top3.map(x => x[4]).sort((a, b) => a - b)[Math.floor(top3.length / 2)] : 0;
  const rateMed = top3.length ? top3.reduce((s, x) => s + x[3], 0) / top3.length : 4.2;
  const revScore = revMed < 500 ? 15 : revMed < 2000 ? 11 : revMed < 10000 ? 6 : 2;
  const revWhy = revMed < 500 ? `头部评论中位 ${revMed.toLocaleString('en-US')} 条，90 天追得上` :
    revMed < 2000 ? `头部评论中位 ${revMed.toLocaleString('en-US')} 条，要准备 6–9 个月的内容与测评` :
      revMed < 10000 ? `头部评论中位 ${revMed.toLocaleString('en-US')} 条，正面拼量没戏，只能靠形态差异` :
        `头部评论中位 ${revMed.toLocaleString('en-US')} 条，存量墙已经封死首屏`;

  /* ---------- 7. SEO /10：标题+五点真正装下多少词 + 有没有堆砌 ---------- */
  const tgtAll = rows.filter(r => r.type !== '竞品词');
  const gotWord = tgtAll.filter(r => has(r.k) || usedW[r.k]).length;
  const covAll = tgtAll.length ? gotWord / tgtAll.length : 0;
  const dupList = (() => {
    const m = {}; toksCount(T.title).forEach(w => { m[w] = (m[w] || 0) + 1; });
    return Object.keys(m).filter(w => m[w] > 1);
  })();
  const dupWords = dupList.length;
  const sSeoC = Math.round(covAll * 8);
  const sSeoD = dupWords === 0 ? 2 : dupWords <= 1 ? 1 : 0;
  const seoScore = sSeoC + sSeoD;

  function toksCount(s) { return String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }

  /* ---------- 合计 ---------- */
  const items = [
    { k: 'Title 标题', w: 15, v: titleScore, real: true, m: `${T.len}/${lim.title} 字符 · 核心词在第 ${corePos > -1 ? corePos : '—'} 字符 · 装下 ${tHit.length}/${tTgt.length} 个必进标题的词${banHit.length ? ' · 违禁词 ' + banHit.join('/') : ''}`, why: over ? `超 ${over} 字符，移动端会被截断` : corePos < 0 ? '标题里找不到核心词，等于没打这个词' : T.len < 60 ? '标题偏短：容量 / 数量 / 材质这些能决定搜索命中的信息还没写进去' : '长度、位置、词密度都在合规区' },
    { k: 'Bullets 五点', w: 15, v: bulletScore, real: true, m: `${bullets.length} 条规划 · ${bWith} 条带词 · ${pts.length} 条卖点可用`, why: pts.length < 3 ? '卖点没填够，五条只能靠兜底串，读者看不出差别' : (bWith < 5 ? `${5 - bWith} 条还没落词，等于白写` : '每条都有词，密度合理') },
    { k: 'Images 主图', w: 15, v: 0, real: false, m: '上传后自核', why: '7 张：白底主图 / 场景 / 细节 / 尺码或对比 / 包装清单 / 15 秒视频 / 卖点信息图' },
    { k: 'A+ 内容', w: 10, v: 0, real: false, m: '品牌备案后自核', why: '5 模块：品牌故事 / 对比表 / 使用场景 / 材质工艺 / 售后承诺' },
    { k: 'Description 描述', w: 10, v: 0, real: false, m: '写完自核', why: '问题 → 方案 → 不适合谁 → 清单，末段再收一次核心词（不超过 2000 字符）' },
    { k: 'Pricing 定价', w: 10, v: priceScore, real: true, m: `${sym}${price} vs 中位 ${sym}${med}`, why: priceWhy },
    { k: 'Reviews 评论', w: 15, v: revScore, real: true, m: `头部中位 ${revMed.toLocaleString('en-US')} 条 · 均分 ${rateMed.toFixed(1)}`, why: revWhy },
    { k: 'SEO 覆盖', w: 10, v: seoScore, real: true, m: `标题+五点装下 ${gotWord}/${tgtAll.length} 个词 · 重复词 ${dupWords}`, why: dupWords > 0 ? `标题里重复了 ${dupWords} 个词，占字符位但不加权` : covAll < .6 ? `还有 ${tgtAll.length - gotWord} 个词没进标题或五点，投出去也搜不到你` : '词基本都有落位，也没有堆砌' }
  ];
  const got = items.filter(i => i.real).reduce((s, i) => s + i.v, 0);
  const full = items.filter(i => i.real).reduce((s, i) => s + i.w, 0);
  const wait = items.filter(i => !i.real);
  const rate = full ? got / full : 0;
  const grade = rate >= .9 ? ['结构已经能上架', 'good'] : rate >= .75 ? ['补齐一处就能上', 'mid'] : rate >= .55 ? ['结构有缺口', 'mid'] : ['先重写再谈投放', 'bad'];
  const mark = i => i.real ? `<b>${Math.round(i.v)}</b><em>/${i.w}</em>` : `<b class="sr-est">—</b><em>待核</em>`;

  /* 覆盖矩阵 */
  const matRows = rows.map(r => {
    const p = auditPlace(r);
    const inT = has(r.k), inB = !!usedW[r.k], inD = p.indexOf('D') > -1;
    const cell = ok => ok ? '<td class="ok">✓</td>' : '<td class="no">—</td>';
    const note = !p ? '只投广告 · 商标风险，不进 listing'
      : (inT || inB) ? '已装下'
        : inD ? '待写进描述' : '待排位';
    return `<tr>
      <td>${esc(r.k)}</td>
      <td><span class="tg tg-${r.type === '核心词' ? 'b' : r.type === '痛点词' ? 'r' : 'y'}">${r.type}</span></td>
      ${cell(inT)}${cell(inB)}${cell(inD)}
      <td class="sub2">${note}</td>
    </tr>`;
  }).join('');

  /* 补分建议：按得分率最低的三项 */
  const weak = items.filter(i => i.real && i.v < i.w).sort((a, b) => (a.v / a.w) - (b.v / b.w)).slice(0, 3);
  const FIX = {
    'Title 标题': over
      ? `砍到 ${lim.title} 字符内：先删重复词，再删形容词，规格和核心词不能动`
      : (corePos < 0 ? `核心词「${core}」必须写进标题，而且要在前 80 字符 —— 移动端只显示这一段` : `标题还差 ${tTgt.length - tHit.length} 个必进词：${tTgt.filter(r => !has(r.k)).slice(0, 3).map(r => auditStrip(core, r.k)).join(' / ')}`),
    'Bullets 五点': pts.length < 3
      ? '侧栏「核心卖点」填够 3 条：五点的开头必须是利益短语，兜底串写出来没人看'
      : '每条开头大写利益短语，句子里自然带一个词，别在结尾堆词',
    'Pricing 定价': `定价落在 ${sym}${Math.round(med * 0.9)}–${sym}${Math.round(med * 1.02)}：低于中位但不打穿底价`,
    'Reviews 评论': '首月不追销量追评分：前 20 条评论决定后续转化；把差评高频词做成五点和 FAQ，等于提前拆掉对手的弹药',
    'SEO 覆盖': dupWords > 0 ? `标题里「${dupList.join(' / ')}」重复了，删掉重复的那一处，把字符让给规格` : '每个词只安排一个主战场：标题拿曝光、五点拿转化、描述收长尾'
  };
  const fixHtml = weak.length ? weak.map((i, n) => `
    <div class="afix">
      <div class="afix-n">${n + 1}</div>
      <div class="afix-b">
        <b>${esc(i.k)} · 丢 ${Math.round(i.w - i.v)} 分</b>
        <span>${esc(FIX[i.k] || '按上面的实测值逐条补齐')}</span>
      </div>
    </div>`).join('') : '<p class="pnote">能核的五项全部达标，剩下三项要你上传后自己打勾。</p>';

  return `<section class="ch" id="audit">
    <h2><i>上架前</i>Listing 体检 · 100 分</h2>
    <p class="plead">前面五章决定「做不做」，这一节决定「上架那天能不能直接起量」。八个维度、100 分，权重按平台实际影响排 ——
      <b>标题、五点、评论各 15 分</b>，因为那是买家唯一会读完、也唯一会用来判断你的三块。
      其中<b>图、A+、描述文案</b>要你上传或写完才能核，这里只给清单、不编分：三项共 35 分单列，不进分母。</p>

    <div class="audit-top ${grade[1]}">
      <div class="audit-num">
        <b>${Math.round(got)}</b><em>/${full}</em>
        <span>已核得分 · 折算 ${Math.round(rate * 100)}/100</span>
      </div>
      <div class="audit-t">
        <b>${grade[0]}</b>
        <span>${wait.length} 项共 ${wait.reduce((s, i) => s + i.w, 0)} 分需自核（${wait.map(i => i.k.split(' ')[0]).join(' / ')}），未计入分母。分数只说明「结构对不对」，不预测销量 —— 结构对但选错品，照样卖不动。</span>
      </div>
    </div>

    <div class="tw">
      <table class="stab atab">
        <colgroup><col style="width:100px"><col style="width:34px"><col style="width:34%"><col style="width:52px"><col></colgroup>
        <thead><tr><th>维度</th><th>权重</th><th>实测</th><th>得分</th><th>判断依据</th></tr></thead>
        <tbody>
          ${items.map(i => `<tr class="${i.real ? '' : 'sr-est'}">
            <td><b>${esc(i.k)}</b></td>
            <td>${i.w}</td>
            <td>${esc(i.m)}</td>
            <td class="audit-s">${mark(i)}</td>
            <td class="sub2">${esc(i.why)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <h3>标题骨架（可直接改）</h3>
    <div class="draft">
      <div class="draft-t">${esc(T.title)}</div>
      <div class="draft-m">${T.len} / ${lim.title} 字符 · 核心词在第 ${corePos > -1 ? corePos : '—'} 字符 · 共 ${T.seg} 段 · ${pf}</div>
    </div>

    <h3>埋词覆盖矩阵</h3>
    <p class="fx2">开源版靠抓页面 + 大模型逐词比对，这里换成「先把每个词安排到唯一位置，再查有没有漏」。
      <b>✓ 标题 / 五点 = 当前的骨架里已经装下，✓ 描述 = 排给描述去收</b>。一张表就能看出哪些词还悬着。</p>
    <div class="tw">
      <table class="stab amat">
        <thead><tr><th>关键词</th><th>类型</th><th>标题</th><th>五点</th><th>描述</th><th>说明</th></tr></thead>
        <tbody>${matRows}</tbody>
      </table>
    </div>

    <h3>最该补的三处</h3>
    <div class="afixs">${fixHtml}</div>

    <p class="pnote">方法来源：维度与权重取自 GitHub 开源 skill <b>nexscope-ai/Amazon-Skills</b> 的 amazon-listing-optimization（Title 15 / Bullets 15 / Images 15 / A+ 10 / Description 10 / Pricing 10 / Reviews 15 / SEO 10）。
      原版依赖抓页面与模型判断，本节改为用本地词簇、价格带、头部评论量复算；<b>算不出的三项如实留空</b>。
      评论那一项的口径是「门槛」而不是你的评分 —— 上架前你还没有评分，能判断的只有这道墙有多高。</p>
  </section>`;
}
