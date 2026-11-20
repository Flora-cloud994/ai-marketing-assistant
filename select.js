/* =========================================================
   select.js — 选品决策层（把「调研」变成「放行 / 不放行」）
   ① 产品地图：同一类目下有哪些形态，本品站在哪一格
   ② 结构指标：头部评价体量分层（竞争是量的问题还是质的问题）
   ③ 四关放行：需求 / 竞争 / 利润 / 风险，短板一票
   ④ 风险闸门：认证、专利、侵权、退货，过不了就别投钱
   ========================================================= */

/* ---------- ① 产品地图 ---------- */
/* 先细分，再比价。
   认出「背带裤」之后，再列同品类里的连衣裙、T恤、鞋就是废话——那是别人的生意，
   不做同一批搜索词。真正抢同一批点击的是「背带裤」内部的款式差异（牛仔/工装/阔腿/
   孕妇/大码），再往下是功能差异（显高、遮肚、防走光）。这两层才是选品的颗粒度。 */

/* 尺码 / 孕产是人群维度，比款式硬：写了「大码」就不该按牛仔款算 */
const SIZE_DIM_RE = /大码|加大|加肥|胖|plus.?size|孕妇|孕期|maternity/i;

function subRows(ctx) {
  const prof = (ctx.__auto && ctx.__auto.profile) || null;
  const table = (prof && prof.id && SUBS[prof.id]) || null;
  if (!table || table.length < 2) return null;   /* null → 调用方退回品类形态矩阵 */
  const fx = MK_FX[ctx.market] == null ? 1 : MK_FX[ctx.market];
  const p0 = num(ctx.price, 0);
  const name = String(ctx.product || '');

  let idx = table.findIndex(r => r[1] && r[1].test(name));
  if (SIZE_DIM_RE.test(name)) {
    const j = table.findIndex(r => SIZE_DIM_RE.test(r[0]) && r[1] && r[1].test(name));
    if (j > -1) idx = j;
  }
  const autoPick = idx < 0;
  if (autoPick) idx = 0;   /* 没写款式 → 按表内第一行（该类目的基础款）处理，并明说 */

  const rows = table.map((r, i) => {
    const lo = Math.round(r[3] * fx), hi = Math.round(r[4] * fx);
    const mid = (lo + hi) / 2;
    const isCur = i === idx;
    /* 用「细分价位中位 vs 本品价」的价差分级，而不是「本品价落在区间里」——
       区间本来就宽，逐点判断会让七八个细分全都「重叠」，等于没判。 */
    const d = p0 > 0 ? Math.abs(mid - p0) / p0 : 1;
    let rel = '高处一档 · 不同批人', tone = 'blue';
    if (isCur) { rel = '本品'; tone = 'good'; }
    /* 没写款式时这是「暂按这款算」，不能标成本品，否则用户以为系统认得他的货 */

    else if (p0 && d <= 0.10) { rel = '价格重叠 · 抢位'; tone = 'bad'; }
    else if (p0 && d <= 0.25) { rel = mid > p0 ? '略高 · 同批人比价' : '略低 · 同批人比价'; tone = 'mid'; }
    else if (p0 && mid < p0) { rel = '低价款 · 抢预算'; tone = 'blue'; }
    return { zh: r[0], form: r[2], lo, hi, mid, aud: r[5], kw: r[6], rel, tone, isCur, d };
  });
  return { rows, cur: rows[idx], autoPick, n: rows.length, prof };
}

function funcRows(ctx) {
  const prof = (ctx.__auto && ctx.__auto.profile) || null;
  const id = prof && prof.id;
  const list = (id && FUNCS[id]) || FUNCS_CAT[(ctx.category || '').trim()] || [];
  return list.map(r => ({ f: r[0], who: r[1], kw: r[2], gap: r[3], act: r[4] }));
}

function subSection(ctx) {
  const S = subRows(ctx);
  if (!S) return '';
  const { rows, cur, autoPick } = S;
  const sym = mkOf(ctx.market).sym;
  const cat = (ctx.category || '').trim();
  const formName = String((S.prof && S.prof.zh) || '').split(/\s*\/\s*/)[0] || '本品';
  const others = ALL_PROFILES.filter(p => p.cat === cat && p.id !== (S.prof && S.prof.id));
  const overlap = rows.filter(r => r.rel.indexOf('价格重叠') > -1);
  const fs = funcRows(ctx);

  const head = autoPick
    ? `形态细分：${esc(formName)}这一类收录了 ${S.n} 种款，本品名<b>只到形态这一级</b>，先按主流款「${esc(cur.zh)}」算`
    : `形态细分：${esc(formName)}这一类有 ${S.n} 种款，本品落在「${esc(cur.zh)}」`;

  return `
    <h3>${head}</h3>
    <p class="plead">搜同一个词时，这 ${S.n} 种款会挤在<b>同一页结果里互相抢点击</b>——它们才是你的直接对手。
      ${others.length ? `同品类里的其它形态（${esc(others.slice(0, 3).map(p => String(p.zh).split(/\s*\/\s*/)[0]).join('、'))}等 ${others.length} 个）不做这批搜索词，不在这里展开。` : ''}
      款式差的是<b>结构和价位</b>，不是名字。</p>
    <div class="ptable">
      <table>
        <thead><tr><th>细分款</th><th>结构 / 做法差异</th><th class="c">主流价位</th><th>核心人群</th><th>核心搜索词</th><th class="c">与本品关系</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr${r.isCur ? ' class="trcur"' : ''}>
            <td><b>${esc(r.zh)}</b>${r.isCur ? `<i class="tg tg-good">${autoPick ? '暂按此款' : '本品'}</i>` : ''}</td>
            <td class="sub2">${esc(r.form)}</td>
            <td class="c nw">${sym}${r.lo}–${sym}${r.hi}</td>
            <td class="sub2">${esc(r.aud)}</td>
            <td class="sub2">${esc(r.kw)}</td>
            <td class="c"><i class="tg tg-${r.tone}">${esc(r.rel)}</i></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="pnote">${autoPick
      ? `只写「${esc(formName)}」等于还没选战场：搜索词 <b>${esc(cur.kw)}</b> 的主体就是${esc(cur.zh)}，所以先按它算。你要卖的是别的款，在产品名里补一个款式词（「工装」「阔腿」「大码」都行），整张表会重排。`
      : `${esc(cur.zh)}的主流价位是 ${sym}${cur.lo}–${sym}${cur.hi}，同价位还有 ${overlap.length} 个细分款在抢同一批人——它们才是主图要打的对手，其余只是「换个款式买」。`}</p>

    ${fs.length ? `
    <h3>功能细分：同一条${esc(formName)}，卖的是 ${fs.length} 种不同的「为什么买」</h3>
    <p class="plead">款式决定你和谁抢，<b>功能决定你在详情页第一屏说什么</b>。同一件货，主打「显高」和主打「遮肚」是两个人群、两组搜索词、两套图。</p>
    <div class="ptable">
      <table>
        <thead><tr><th>功能主张</th><th>谁在买</th><th>买家会搜</th><th>现有货的短板</th><th class="c">可下手的地方</th></tr></thead>
        <tbody>
          ${fs.map(f => `<tr>
            <td><b>${esc(f.f)}</b></td>
            <td class="sub2">${esc(f.who)}</td>
            <td class="sub2">${esc(f.kw)}</td>
            <td class="sub2">${esc(f.gap)}</td>
            <td class="sub2">${esc(f.act)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="pnote">功能轴是从该类目的<b>差评共性 + 搜索词结构</b>推出来的，不是拍脑袋：每一条都能在竞品详情页找到「没写」的证据。
      抓完真实竞品后，把「现有货的短板」换成真实差评原句，这张表就能直接当详情页大纲用。
      先挑 <b>1–2 条</b>打，全打等于没打——首屏只放得下一个主张。</p>` : ''}`;
}

/* 同品类下的形态由知识库带出：中文形态名 + 使用方式 + 价位 + 人群 + 核心词 */
function formRows(ctx) {
  /* 品类没定就没有「同形态」可言，不要拿厨房小家电的形态去凑 */
  const cat = (ctx.category || '').trim();
  if (!cat) return [];
  const prof = (ctx.__auto && ctx.__auto.profile) || null;
  const curId = (prof && prof.id) || inferCat(ctx.product || '').hit || '';
  const fx = MK_FX[ctx.market] == null ? 1 : MK_FX[ctx.market];
  const p0 = num(ctx.price, 0);
  const pool = ALL_PROFILES.filter(p => p.cat === cat);
  if (!pool.length) return [];

  return pool.map(p => {
    const lo = Math.round(p.band[0] * fx), hi = Math.round(p.band[1] * fx);
    const isCur = p.id === curId;
    let rel = '同形态不同款', tone = 'blue';
    if (isCur) { rel = '本品'; tone = 'good'; }
    else if (p0 >= lo && p0 <= hi) { rel = '价格重叠 · 抢位'; tone = 'bad'; }
    else if (lo > p0 && p0 > 0) { rel = '向上替代'; tone = 'mid'; }
    else if (p0 > 0) { rel = '向下替代'; tone = 'mid'; }
    return {
      zh: p.zh || p.en, form: p.form || '—', lo, hi,
      aud: String(p.aud).split(/[;；]/)[0].replace(/；$/, ''),
      en: p.en, rel, tone, isCur
    };
  });
}

function formMapSection(ctx) {
  const rows = formRows(ctx);
  if (rows.length < 2) return '';
  const sym = mkOf(ctx.market).sym;
  const cur = rows.find(r => r.isCur);
  const cat = (ctx.category || '').trim();

  return `
    <h3>先归类：${esc(cat)}里有 ${rows.length} 种形态</h3>
    <p class="plead">同一个小类目下，「形态」比「品类」更能决定竞争：用法不同＝搜索词不同＝对手不同。先把货归到格子里，再看格子里的对手。</p>
    <div class="ptable">
      <table>
        <thead><tr><th>形态</th><th>怎么用（结构）</th><th class="c">主流价位</th><th>核心人群</th><th>核心搜索词</th><th class="c">与本品关系</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr${r.isCur ? ' class="trcur"' : ''}>
            <td><b>${esc(r.zh)}</b>${r.isCur ? '<i class="tg tg-good">本品</i>' : ''}</td>
            <td class="sub2">${esc(r.form)}</td>
            <td class="c nw">${sym}${r.lo}–${sym}${r.hi}</td>
            <td class="sub2">${esc(r.aud)}</td>
            <td class="sub2">${esc(r.en)}</td>
            <td class="c"><i class="tg tg-${r.tone}">${esc(r.rel)}</i></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="pnote">${cur
      ? `本品落在一「<b>${esc(cur.zh)}</b>」（${sym}${cur.lo}–${sym}${cur.hi}），价格重叠的形态有 ${rows.filter(r => r.rel.indexOf('价格重叠') > -1).length} 个——它们才是真对手，其它形态只是「替代品」。`
      : `还没识别出本品形态，按价位判断：与本品价格重叠的那几行，就是首屏上真正抢你点击的对手。`} 
      归类只做三件事：搜索意图（买家搜什么词）、功能用途（解决什么动作）、目标人群（谁在用）。三者都不同，就是两个类目；只差一个，就是同一战场里的两个位置。</p>`;
}

/* ---------- ② 头部评价体量分层 ---------- */
function structStats(list) {
  const rs = list.map(p => p[4]).sort((a, b) => b - a);
  const tot = rs.reduce((a, b) => a + b, 0) || 1;
  const t = (lo, hi) => {
    const arr = rs.filter(r => r >= lo && (hi == null || r < hi));
    return { n: arr.length, share: arr.reduce((a, b) => a + b, 0) / tot };
  };
  return {
    top: t(20000), mid: t(5000, 20000), low: t(0, 5000),
    top3: rs.slice(0, 3).reduce((a, b) => a + b, 0) / tot,
    max: rs[0], min: rs[rs.length - 1]
  };
}

function structBlock(list, st) {
  const ss = structStats(list);
  const thin = ss.low.n >= 2;
  return `
      <div class="cstat cstat-4">
        <div><b>${ss.top.n}</b><span>评价 &gt; 2 万（重壁垒）</span></div>
        <div><b>${ss.mid.n}</b><span>5 千–2 万（可追平）</span></div>
        <div><b>${ss.low.n}</b><span>&lt; 5 千（新品位）</span></div>
        <div><b>${Math.round(ss.max / Math.max(1, ss.min))}×</b><span>头尾评价差</span></div>
      </div>
      <p class="gcell-f">评价存量分层看的是「壁垒厚度」：${ss.low.n >= 2
      ? `样本里有 ${ss.low.n} 款低于 5 千条，说明这个类目<b>还能让新品挤进首屏</b>，不必等三年。`
      : ss.low.n === 1
        ? `样本里只有 1 款低于 5 千条，首屏几乎全被评价量锁死，新品只能靠<b>站外流量或差异化词</b>绕开正面比价。`
        : `样本里没有低于 5 千条的款，首屏已被评价量锁死，新品只能靠<b>站外流量或差异化词</b>绕开正面比价。`}</p>`;
}

/* ---------- ③ 需求成色 ---------- */
function demandTone(cat) {
  const c = catOf(cat);
  const s = c.season || '', ret = c.ret || 8;
  let k = '季节驱动', why = `销量集中在 ${s}，淡季要靠新品与套装续命`;
  if (/全年/.test(s)) { k = '刚需'; why = '全年可卖、没有明显淡季，需求不靠节日推动'; }
  else if (/Q4/.test(s) && /Q[123]/.test(s)) { k = '双峰'; why = `${s}，两次高峰之间要靠内容维持排名`; }
  else if (/Q4/.test(s)) { k = '礼赠驱动'; why = '销量压在 Q4，1–3 月会掉一半以上，现金流要提前排'; }
  if (ret >= 12) why += `；退货率约 ${ret}%，实际毛利要再打折`;
  return { k, why, ret };
}

/* ---------- ④ 风险闸门 ---------- */
const RISK = {
  '厨房小家电': { cert: 'FDA 食品接触 + FCC + UL/ETL 电气安全', c: 2, p: 2, i: 1, spec: '必须 110V/60Hz 美规插头；带锂电池另需 UN38.3 + MSDS' },
  '宠物用品': { cert: '无强制认证，但需无毒材料声明与 CPSIA 兜底', c: 1, p: 3, i: 2, spec: '刷头 / 滚轮 / 卡扣结构专利密集，先查外观专利再开模' },
  '家居收纳': { cert: '无强制认证；接触食品才需 FDA', c: 0, p: 1, i: 1, spec: '结构一眼能抄，壁垒在模具精度与套装组合，不在外形' },
  '3C 数码': { cert: 'FCC + UL/ETL + UN38.3；无线充需 Qi / MFi', c: 2, p: 2, i: 2, spec: 'MagSafe、MFi 是商标与授权双门槛，标题里出现即违规' },
  '美妆个护': { cert: 'FDA 化妆品注册 / OTC 需 NDC；成分按 INCI 标注', c: 3, p: 1, i: 1, spec: '「治疗 / 修复 / 祛斑 / 消炎」等功效词会触发 FDA 警告信' },
  '户外运动': { cert: 'CPSC 一般安全；儿童款需 CPC', c: 1, p: 2, i: 1, spec: '承重类必须第三方实测；帐篷阻燃需 CPAI-84' },
  '母婴用品': { cert: 'CPC + ASTM F963 + CPSIA 铅镉测试', c: 3, p: 2, i: 2, spec: '入口与贴身件没有第三方报告＝上架即下架，别省这笔钱' },
  '服饰配饰': { cert: 'CPSIA + 加州 Prop 65（化学物质）', c: 1, p: 1, i: 2, spec: '图案 / 印花 / 角色形象是最高频下架原因，原创或授权二选一' },
  '家居清洁': { cert: '无强制；宣称杀菌消毒需 EPA 注册', c: 2, p: 1, i: 1, spec: '「杀菌 / 消毒 / 除菌 99.9%」一旦写进文案就落入农药类监管' },
  '灯具照明': { cert: 'FCC + UL/ETL；含电池需 UN38.3', c: 2, p: 2, i: 1, spec: 'LED 驱动与插头无认证会卡清关，别用「通用适配器」凑' },
  '汽车用品': { cert: '无强制；电子件需 FCC', c: 1, p: 2, i: 1, spec: '不得宣称「不影响安全气囊」，涉及安全件的责任无法兜底' },
  '玩具益智': { cert: 'CPC + ASTM F963 + CPSIA；3 岁以下禁小零件', c: 3, p: 2, i: 2, spec: '卡通形象无授权即侵权，比质量问题的封店概率更高' },
  '办公文具': { cert: '无强制；儿童文具需 CPSIA', c: 0, p: 1, i: 1, spec: '门槛低＝对手多，靠设计套装与内容而非专利' },
  '园艺工具': { cert: '无强制；电动工具需 FCC / UL', c: 1, p: 1, i: 1, spec: '刃口与承重需实拍说明，避免「割伤」类投诉' },
  '家用电器': { cert: 'FCC + UL/ETL；水箱类需 FDA 食品接触或 NSF', c: 3, p: 2, i: 1, spec: '插头必须美规 110V；带压缩机的另需 EPA 制冷剂备案' },
  '厨房用具': { cert: '食品接触材料需 FDA 21 CFR；不粘涂层需 PFOA-free 声明', c: 2, p: 2, i: 2, spec: '刀类在部分州/平台属限制品，刀刃长度与包装警示要写清；「抗菌 / 医用级」不能随便标' },
  '健康护理': { cert: 'FCC（带电）；宣称缓解疼痛可能触发 FDA 器械或 FTC 功效监管', c: 2, p: 2, i: 2, spec: '别写「治疗 / 治愈 / 医疗级」；护具类若声称矫正需 510(k)，只讲支撑与体感' },
  '（未填品类）': { cert: '按具体品类逐项确认，不要默认「不用认证」', c: 1, p: 1, i: 1, spec: '先填品类，否则风险只能给区间，不能给结论' }
};

/* 医疗 / 功效红线：命中即视为强监管 */
const MED_RE = /(矫正|护具|治疗|康复|医|止痛|消炎|杀菌|消毒|助眠|血压|血糖|按摩|功效|疗程)/;

function riskGates(ctx) {
  const cat = (ctx.category || '').trim();
  const r = RISK[cat] || RISK['（未填品类）'];
  const ret = catOf(cat).ret || 8;
  const med = MED_RE.test(String(ctx.product || '') + ' ' + String(ctx.points || ''));
  const lv = n => n >= 3 ? 'bad' : n >= 2 ? 'mid' : 'good';

  const gates = [
    {
      k: '认证准入', t: lv(med ? 3 : r.c),
      v: med ? '强监管' : r.c >= 3 ? '门槛高' : r.c >= 2 ? '需认证' : '门槛低',
      why: med ? '产品名/卖点里出现矫正、治疗、杀菌这类词，会被按医疗器械或功效产品监管' : r.cert,
      act: med ? '先删掉所有疗效表述，只讲结构与体感；再确认是否需 510(k) 或 OTC 备案' : '把认证清单发给工厂要证书编号与检测报告，缺一项就不上架'
    },
    {
      k: '专利 / 结构', t: lv(r.p),
      v: r.p >= 3 ? '密集' : r.p >= 2 ? '中等' : '稀疏',
      why: r.p >= 2 ? '这个类目的结构专利与外观专利重叠度高，开模前必须检索' : '结构简单，撞专利的概率低，但仍需查一次外观',
      act: r.p >= 2 ? '用 Google Patents 按结构特征检索 3 个关键词，再让工厂出「规避设计」版本' : '记录自家结构与竞品的差异点，作为被投诉时的证据'
    },
    {
      k: '侵权 / 品牌', t: lv(r.i),
      v: r.i >= 3 ? '高危' : r.i >= 2 ? '注意' : '低',
      why: r.i >= 3 ? '图案、形象、商标词是这个类目最常见的下架原因' : '侵权主要来自图片与文案，控制好素材来源即可',
      act: r.i >= 2 ? '不碰角色形象与品牌词；主图全部自拍，文案不用「兼容 XX」以外的商标' : '素材自制或购买商用授权，保留授权凭证'
    },
    {
      k: '退货 / 质量', t: ret >= 15 ? 'bad' : ret >= 10 ? 'mid' : 'good',
      v: `约 ${ret}%`,
      why: ret >= 15 ? '退货率最高的类目之一：尺码与预期落差会吃掉全部毛利' : ret >= 10 ? '退货会吃掉 1/10 的营收，必须把预期管理写进详情页' : '退货可控，重点在首次使用的体验',
      act: ret >= 15 ? '先做尺码表与真人试穿图；把「不合身可退」写进详情页，降低纠纷率' : '主图标注真实尺寸/克重，参数表逐项对应实物'
    }
  ];
  const rank = t => t === 'bad' ? 0 : t === 'mid' ? 1 : 2;
  const worst = gates.slice().sort((a, b) => rank(a.t) - rank(b.t))[0];
  const badN = gates.filter(g => g.t === 'bad').length;
  /* 「四个中等」不该比「一个红灯」还惨：bad 扣得多，mid 只扣一点 */
  const score = clamp(10 - badN * 3.4 - gates.filter(g => g.t === 'mid').length * 0.9, 1, 10);
  return { gates, score: Math.round(score * 10) / 10, badN, worst, med, spec: r.spec };
}

function riskSection(ctx, n) {
  const R = riskGates(ctx);
  return `
    <h3>风险闸门：这四关过不了，后面的钱都别投</h3>
    <p class="plead">合规与专利是「一票否决」，不是评分项——被下架一次，前面的排名与评论全部清零。</p>
    <div class="gates">
      ${R.gates.map(g => `
      <div class="gate gt-${g.t}">
        <div class="gate-h"><b>${esc(g.k)}</b><i>${esc(g.v)}</i></div>
        <p class="gate-w">${esc(g.why)}</p>
        <p class="gate-a"><em>怎么过</em>${esc(g.act)}</p>
      </div>`).join('')}
    </div>
    ${R.spec ? `<p class="gate-spec"><b>类目特有红线</b>${esc(R.spec)}</p>` : ''}
    <p class="pnote">${R.med
      ? `<b>红线：</b>本品涉及医疗 / 功效表述，先确认是否落入 FDA 器械或 OTC 监管，再谈卖点——这一条不解决，其它分析都作废。`
      : `四关里最该先动的是「${esc(R.worst.k)}」（${esc(R.worst.v)}）。合规成本是可以算进定价的，专利与侵权成本不能。`}</p>`;
}

/* ---------- ⑤ 四关放行 ---------- */
function selGates(ctx, list, st, sc) {
  const price = num(ctx.price, 0) || st.med;
  const em = (ctx.__vals && ctx.__vals.emotion) || {};
  /* 与「选品三问」用同一套成本口径（默认 42 元货值 + 9 元头程），两章的数字才对得上 */
  const costY = num(em.cost, 42), frY = num(em.freight, 9);
  const rate = num(em.rate, 7.1) || 7.1;
  const costUsd = (costY + frY) / rate;
  const pf = pfOf(ctx.platform);
  const fee = price * pf.fee / 100;
  const ful = FUL[ctx.platform] !== undefined ? FUL[ctx.platform] : 4.2;
  const gp = price - costUsd - fee - ful;
  const gm = price > 0 ? gp / price : 0;
  const beRoas = gp > 0 ? price / gp : 0;

  const dq = demandTone(ctx.category);
  const R = riskGates(ctx);

  const demand = clamp((sc.demand * .7) + (dq.k === '刚需' ? 3 : dq.k === '双峰' ? 2.4 : 1.6), 1, 10);
  const profit = gm >= .45 ? 10 : gm >= .38 ? 8 : gm >= .30 ? 6 : gm >= .22 ? 4 : 2;

  const parts = [
    { k: '需求真实', v: Math.round(demand * 10) / 10, veto: true, tone: demand >= 7 ? 'good' : demand >= 5 ? 'mid' : 'bad', why: `${dq.k} · ${dq.why}`, note: dq.k },
    { k: '竞争可插', v: sc.comp, veto: false, tone: sc.comp >= 7 ? 'good' : sc.comp >= 5 ? 'mid' : 'bad', why: `第一名占 ${pct(st.top1Share)} 的评论存量，首屏位基本被锁`, note: sc.comp >= 7 ? '有空位' : sc.comp >= 5 ? '要绕' : '锁死' },
    { k: '利润够撑', v: profit, veto: true, tone: profit >= 8 ? 'good' : profit >= 6 ? 'mid' : 'bad', why: `按 ${symOf(ctx)}${Math.round(price)} 算，毛利 ${pct(gm)}，保本 ROAS ${beRoas ? beRoas.toFixed(2) : '—'}`, note: pct(gm) },
    { k: '风险可解', v: Math.round(R.score), veto: true, tone: R.score >= 7 ? 'good' : R.score >= 5 ? 'mid' : 'bad', why: R.badN ? `${R.badN} 项红灯（${R.worst.k}）` : '四道闸都是「需要注意」，单关能过但叠加起来成本高', note: R.badN ? '有红线' : '叠加偏高' }
  ];
  const weakest = parts.slice().sort((a, b) => a.v - b.v)[0];
  return { parts, weakest, gm, beRoas, price, demand: dq, risk: R };
}

const symOf = ctx => mkOf(ctx.market).sym;

function gateBarHtml(G) {
  return `<div class="gbar">
    ${G.parts.map(p => `<div class="gbar-i gb-${p.tone}">
      <div class="gbar-t"><b>${esc(p.k)}</b><em>${p.v}</em></div>
      <span>${esc(p.why)}</span>
    </div>`).join('')}
  </div>`;
}
