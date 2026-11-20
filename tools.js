/* =========================================================
   tools.js — 32 个细分工具（8 步 × 4）
   每个工具：inputs 定义输入 / out(v, ctx) 返回 HTML（随输入实时重算）
   ========================================================= */

const STEPS = [
  { id: 's1', n: '01', name: '市场调研 / 选品', doc: true,
    subs: ['关键词簇', '品类与形态', '竞品分析', '评论与缺口', '情绪与定价', '值不值得做'],
    tools: ['report', 'emotion'] },
  { id: 's2', n: '02', name: '平台选择 / 建站', subs: ['选择平台', '搭建独立站', '店铺定位', '支付配置'],
    tools: ['pick', 'site', 'pos', 'pay'] },
  { id: 's3', n: '03', name: '内容策划 / 视觉设计', subs: ['核心卖点', '标签与选题', '标题文案', '商品图提示词', '短视频脚本'],
    tools: ['selling', 'tagset', 'title', 'aimg', 'visual', 'video'] },
  { id: 's4', n: '04', name: '商品上架 / 本地化', subs: ['产品详情页', '多语言翻译', 'SKU 整理', '批量上架'],
    tools: ['detail', 'i18n', 'sku', 'bulk'] },
  { id: 's5', n: '05', name: '营销投放 / 引流', subs: ['广告素材生成', '广告投放', '内容日历', 'KOL 种草'],
    tools: ['creative', 'ads', 'calendar', 'kol'] },
  { id: 's6', n: '06', name: '订单成交 / 支付收款', subs: ['订单处理', '支付结算', '风控控制', '自动通知'],
    tools: ['orderflow', 'settle', 'risk', 'notify'] },
  { id: 's7', n: '07', name: '物流履约 / 客服售后', subs: ['发货通知', '物流追踪', '自动回复', '售后处理'],
    tools: ['ship', 'trk', 'faq', 'aftersale'] },
  { id: 's8', n: '08', name: '数据复盘 / 自动化增长', subs: ['数据分析', '广告复盘', '用户分层', '自动化运营'],
    tools: ['metrics', 'adsreview', 'rfm', 'auto', 'daily'] }
];

/* 公共上下文读取 */
const C = {
  prod: ctx => ctx.product || '该产品',
  cat: ctx => ctx.category || '（未填品类）',
  mkt: ctx => ctx.market || '美国',
  plat: ctx => ctx.platform || '还没定',
  price: ctx => num(ctx.price, 0),
  sym: ctx => mkOf(ctx.market).sym,
  aud: ctx => ctx.audience || '核心购买人群（待补）',
  pts: ctx => lines(ctx.points)
};

const T = {};

/* ============ 01 选品调研报告（文档形态） ============ */
T.report = {
  id: 'report', step: 0, name: '选品调研报告', sub: '文档形式 · 竞品自动匹配 · 评论数据可导入',
  desc: '按品类自动匹配 6 款爆款竞品，做集中度、价格带与四象限分析；评论可粘贴或上传 CSV，痛点按原话聚类。',
  inputs: [],
  out(v, ctx) { return { html: buildReport(ctx) }; }
};

/* ============ 01-1 热门赛道分析 ============ */
T.track = {
  id: 'track', step: 0, name: '热门赛道分析', sub: '这个赛道值不值得进',
  desc: '输入真实的搜索量、竞品数与价格带，算出机会分，判断是蓝海、红海还是陷阱。',
  inputs: [
    { k: 'vol', label: '月搜索量（品类核心词）', type: 'num', ph: '35000', hint: '卖家精灵 / Helium 10 查', def: '35000' },
    { k: 'comp', label: '在售竞品数（同类 Listing）', type: 'num', ph: '800', def: '800' },
    { k: 'rev', label: '头部 Listing 平均评论数', type: 'num', ph: '1200', hint: '判断是否被垄断', def: '1200' },
    { k: 'aov', label: '主流价格带（客单价）', type: 'num', ph: '跟随项目价格', hint: '留空则用左侧项目信息里的价格' },
    { k: 'gm', label: '预估毛利率 %', type: 'num', ph: '55', hint: '扣货成本后、扣平台费前', def: '55' },
    { k: 'grow', label: '近 12 个月趋势', type: 'select', opts: ['上升', '平稳', '下降', '季节性波动'], def: '上升' }
  ],
  out(v, ctx) {
    const sym = C.sym(ctx), pf = pfOf(ctx.platform);
    const vol = num(v.vol, 0), comp = num(v.comp, 0), rev = num(v.rev, 0);
    const aov = num(v.aov, 0) || C.price(ctx) || 30, gm = num(v.gm, 0);
    if (!vol || !comp) return { html: ui.note('填入月搜索量与竞品数后，这里会算出机会分。') };

    const dScore = vol < 5000 ? 2 : vol < 20000 ? 5 : vol < 50000 ? 7 : vol < 200000 ? 9 : 10;
    const cScore = comp < 50 ? 10 : comp < 200 ? 8 : comp < 500 ? 6 : comp < 1000 ? 4 : 2;
    const mScore = rev < 500 ? 9 : rev < 2000 ? 6 : rev < 10000 ? 4 : 2;
    const netGM = gm - pf.fee;
    const pScore = netGM > 40 ? 10 : netGM > 30 ? 8 : netGM > 20 ? 6 : netGM > 10 ? 4 : 2;
    const total = dScore * 0.3 + cScore * 0.25 + mScore * 0.2 + pScore * 0.25;
    const drip = vol / Math.max(comp, 1);
    const tone = total >= 7 ? 'good' : total >= 5 ? 'mid' : 'bad';
    const verdict = total >= 7 ? '值得进' : total >= 5 ? '谨慎进' : '不建议硬打';

    const tiers = [
      { t: '蓝海（需求大 / 竞争小）', ok: vol > 20000 && comp < 200, act: '立刻做，抢自然位' },
      { t: '红海（需求大 / 竞争大）', ok: vol > 20000 && comp >= 200, act: '必须找差异化角度，否则别进' },
      { t: '窄需求（需求小 / 竞争小）', ok: vol <= 20000 && comp < 200, act: '可做小而美，靠高客单活' },
      { t: '陷阱（需求小 / 竞争还大）', ok: vol <= 20000 && comp >= 200, act: '直接放弃' }
    ];
    const cur = tiers.find(x => x.ok) || tiers[3];

    return {
      html:
        ui.big([
          { v: total.toFixed(1), l: '机会分 / 10', s: verdict },
          { v: drip.toFixed(1), l: '每个竞品分到搜索量', s: drip > 60 ? '流量够分' : '抢不到量' },
          { v: sym + (aov * NetGM(gm, pf.fee) / 100).toFixed(1), l: '单件净利（估）', s: '毛' + gm + '% − 平台' + pf.fee + '%' }
        ]) +
        ui.card('四维打分', [
          ['需求强度', ui.bar('月搜索 ' + vol.toLocaleString(), dScore * 10, 100, 'g') + `<div class="fx">权重 30%</div>`],
          ['竞争友好度', ui.bar('竞品 ' + comp + ' 个', cScore * 10, 100, cScore >= 6 ? 'g' : 'r') + `<div class="fx">权重 25%</div>`],
          ['可抢空间', ui.bar('头部评论 ' + rev, mScore * 10, 100, mScore >= 6 ? 'g' : 'r') + `<div class="fx">头部越强越难抢，满分 100</div>`],
          ['利润空间', ui.bar('净毛利 ' + netGM.toFixed(0) + '%', pScore * 10, 100, pScore >= 6 ? 'g' : 'r') + `<div class="fx">毛利率 − 平台费率 ${pf.fee}%</div>`]
        ].map(r => `<div class="mgrid"><div class="mgrid-l">${r[0]}</div><div class="mgrid-r">${r[1]}</div></div>`).join('')) +
        ui.card('结论与动作', `
          <div class="verdict ${tone}"><b>${verdict}</b> · 该赛道当前属于「${cur.t}」</div>
          ${ui.ul([
            `<b>定位建议：</b>${cur.act}`,
            `<b>趋势判断：</b>近 12 个月${v.grow}。${v.grow === '下降' ? '下滑赛道只做存量收割，不投新品开发费。' : v.grow === '季节性波动' ? '备货必须按峰值 60% 备，避免淡季压货。' : '可正常备货，但首单控制在 60 天销量内。'}`,
            `<b>定价落点：</b>${sym}${(aov * 0.9).toFixed(0)}–${sym}${(aov * 1.1).toFixed(0)}，低于主流 10% 留出优惠券空间，不做最低价。`,
            `<b>止损线：</b>30 天内若拿不到 ${Math.max(20, Math.round(vol / 30 * 0.002))} 单/天，说明选品或卖点有问题，及时止损。`
          ])}`) +
        ui.card('同类目对比参考', ui.tbl(
          ['信号', '当前值', '健康区间', '判定'],
          [
            ['单品月销潜力', Math.round(vol * 0.003) + ' 单', '> 300 单', Math.round(vol * 0.003) > 300 ? ui.tag('达标', 'g') : ui.tag('偏低', 'r')],
            ['竞争密度', comp + ' 家', '&lt; 500 家', comp < 500 ? ui.tag('可打', 'g') : ui.tag('激烈', 'r')],
            ['价格弹性', sym + aov, '—', '每降 10% 通常换来 15–25% 销量'],
            ['退货率基线', catOf(ctx.category).ret + '%', '&lt; 12%', catOf(ctx.category).ret < 12 ? ui.tag('正常', 'g') : ui.tag('偏高', 'r')]
          ]))
    };
  }
};
function NetGM(gm, fee) { return Math.max(gm - fee, 0); }

/* ============ 01-2 用户需求洞察 ============ */
T.pain = {
  id: 'pain', step: 0, name: '用户需求洞察', sub: '从差评里挖真需求',
  desc: '把竞品差评贴进来，自动统计痛点频次并给出改良方案——比拍脑袋想需求准得多。',
  inputs: [
    { k: 'text', label: '粘贴竞品差评（一行一条，越多越准）', type: 'area', rows: 7, ph: '用了两次就不转了，充不进电\n清洗太麻烦，刀头拆不下来\n打冰打不碎，全是块\n漏水，包里全湿了\n噪音太大了，早上不敢用', def: '用了两次就不转了，充不进电\n清洗太麻烦，刀头拆不下来\n打冰打不碎，全是块\n漏水，包里全湿了\n噪音太大了，早上不敢用\n充一次电只能用一天\n刀头生锈了\n容量太小，一次只能打一杯' },
    { k: 'n', label: '评论采样总数', type: 'num', ph: '200', hint: '用于算痛点占比' , def: '200' }
  ],
  out(v, ctx) {
    /* 差评按「行」分割，不能按逗号——评论里全是逗号 */
    const raw = String(v.text || '').split(/\n/).map(s => s.replace(/^[\s\-•\d.、]+/, '').trim()).filter(s => s.length > 1);
    if (!raw.length) return { html: ui.note('粘贴 5 条以上差评（一行一条），这里会自动聚类痛点并排序。') };
    const cat = catOf(ctx.category);
    const DICT = [
      ['清洗/清洁', ['洗', '清洁', '拆', '干净', 'clean', 'wash']],
      ['续航/充电', ['充', '电', '续航', 'battery', 'charge', '没电']],
      ['效果不达标', ['打不碎', '没效果', '不好用', '达不到', '无力', '慢']],
      ['漏/密封', ['漏', '密封', '渗', 'leak', '洒']],
      ['噪音', ['吵', '噪音', '声音大', 'noisy', 'loud']],
      ['质量/耐用', ['坏', '断', '裂', '用了.*次就', '不耐用', '质量', '锈', '掉', '松', 'broken', 'cheap']],
      ['描述不符', ['不符', '和图', '差距', '骗', 'misleading', 'not as', '说明书', '看不懂']],
      ['尺寸/重量', ['太大', '太小', '重', '尺寸', 'size', 'heavy']],
      ['物流/包装', ['包装', '破', '发货', '物流', 'delivery', 'late']],
      ['客服/售后', ['客服', '退款', '退货', '没人理', 'return', 'refund']]
    ];
    const cnt = {}, samples = {};
    raw.forEach(t => {
      let hit = false;
      for (const [name, re] of DICT) {
        if (re.some(r => new RegExp(r, 'i').test(t))) {
          cnt[name] = (cnt[name] || 0) + 1;
          if (!samples[name]) samples[name] = [];
          if (samples[name].length < 2) samples[name].push(t);
          hit = true; break;
        }
      }
      if (!hit) {
        cnt['其他反馈'] = (cnt['其他反馈'] || 0) + 1;
        if (!samples['其他反馈']) samples['其他反馈'] = [];
        if (samples['其他反馈'].length < 3) samples['其他反馈'].push(t);
      }
    });
    const others = cnt['其他反馈'] || 0;
    const arr = Object.entries(cnt).filter(([k]) => k !== '其他反馈').sort((a, b) => b[1] - a[1]);
    const total = raw.length;
    const FIX = {
      '清洗/清洁': ['做成可整机水洗 + 刀头免拆', '详情页第 2 张图直接演示「冲 10 秒」'],
      '续航/充电': ['标真实续航（按最低档测），不虚标', '加电量指示灯，解决「不知道还有多少电」'],
      '效果不达标': ['主图用对比图（前/后）', '文案写清适用边界：能打什么、不能打什么'],
      '漏/密封': ['加硅胶密封圈并在页面标注', '主图加「倒置不漏」实测图'],
      '噪音': ['标注分贝值 + 与竞品对比', '把「静音」做成独立卖点，抢这个痛点人群'],
      '质量/耐用': ['延保到 12 个月（成本低、转化高）', '详情页放跌落/老化测试'],
      '描述不符': ['五点全部写可验证事实，不写形容词', '主动标注「不适合谁」，降低预期差'],
      '尺寸/重量': ['主图加参照物（手持/对比手机）', '标题里直接写尺寸与重量'],
      '物流/包装': ['换加强包装，加防震内衬', '发货时效写进详情页'],
      '客服/售后': ['24h 首响 SLA + 自动回复兜底', '把退货流程做成一张图'],
      '其他反馈': ['逐条人工复核，这类往往是差异化机会', '']
    };
    const rowHtml = (k, c, dim) =>
      `<div class="painrow"><div class="painname">${k}</div>
       <div class="paintrack"><i class="${dim ? 'dim' : ''}" style="width:${c / total * 100}%"></i></div>
       <div class="painnum">${c} 条 · ${pct(c / total)}</div></div>`;
    return {
      html:
        ui.big([
          { v: total, l: '采样差评数', s: num(v.n, 0) > total ? `占全部 ${num(v.n, 0)} 条的 ${pct(total / num(v.n, 1))}` : '一条一行' },
          { v: arr.length, l: '识别出的痛点类', s: others ? `另有 ${others} 条未归类` : '全部归类成功' },
          { v: arr[0] ? pct(arr[0][1] / total) : '0%', l: '第一痛点占比', s: arr[0] ? arr[0][0] : '—' }
        ]) +
        ui.card('痛点排行（真实统计）',
          arr.map(([k, c]) => rowHtml(k, c)).join('') +
          (others ? rowHtml('其他反馈（未归类）', others, true) : '') +
          (arr.length ? '' : ui.note('这批评语里没有命中预设的痛点词库。你的评论可能措辞比较特殊——直接看下面的原文，人工归类更准。'))) +
        ui.card('Top 3 痛点 → 改良方案', arr.slice(0, 3).map(([k, c], i) => `
          <div class="fixbox">
            <div class="fix-h"><b>${i + 1}. ${k}</b><span>${c} 条 / ${pct(c / total)}</span></div>
            <div class="fix-q">${(samples[k] || []).map(s => '“' + esc(s) + '”').join('　')}</div>
            ${ui.ul((FIX[k] || ['']).filter(Boolean))}
          </div>`).join('') || ui.note('暂无归类结果，先扩充词库或人工标注。')) +
        ui.card('需求转译（写进文案的原话）', ui.tbl(
          ['用户原话（痛点）', '改成卖点说法', '放在哪'],
          arr.slice(0, 4).map(([k]) => {
            const M2 = {
              '清洗/清洁': ['冲洗 10 秒，不用拆刀头', '主图 2 + 五点第 2 条'],
              '续航/充电': ['一次充满，通勤一周够用', '五点第 3 条 + A+ 页'],
              '效果不达标': ['冰块坚果都能打，实测 8 秒出浆', '主图 1 + 短视频前 3 秒'],
              '漏/密封': ['倒着放也不漏，通勤包随便塞', '主图 3 + FAQ'],
              '噪音': ['58 分贝，早上用不吵醒家人', '五点第 4 条'],
              '质量/耐用': ['12 个月只换不修', '页面保障区'],
              '描述不符': ['能打什么、不能打什么，都写清楚', '详情页底部'],
              '尺寸/重量': ['350g，比一瓶水还轻', '主图 4 + 标题'],
              '物流/包装': ['48 小时内发出', '页面顶部'],
              '客服/售后': ['有问题 24 小时内回', '页面保障区']
            }[k] || ['—', '—'];
            return [k, M2[0], M2[1]];
          })))
    };
  }
};

/* ============ 01-3 竞品分析 ============ */
T.compete = {
  id: 'compete', step: 0, name: '竞品分析', sub: '找价格空隙与差异化缺口',
  desc: '填 3 家真实竞品的价格、评分、评论数，自动算出价格带空隙和必须补的短板。',
  inputs: [
    { k: 'a', label: '竞品 A：价 / 评分 / 评论数 / 主打卖点', type: 'text', ph: '29 / 4.5 / 3200 / 便携快充', def: '29 / 4.5 / 3200 / 便携快充' },
    { k: 'b', label: '竞品 B：价 / 评分 / 评论数 / 主打卖点', type: 'text', ph: '39 / 4.3 / 860 / 大容量', def: '39 / 4.3 / 860 / 大容量' },
    { k: 'c', label: '竞品 C：价 / 评分 / 评论数 / 主打卖点', type: 'text', ph: '19 / 4.1 / 5400 / 便宜', def: '19 / 4.1 / 5400 / 便宜' },
    { k: 'mine', label: '我方：价 / 评分（预估） / 核心差异', type: 'text', ph: '32 / 4.6 / 自清洁+静音' , def: '32 / 4.6 / 自清洁+静音' }
  ],
  out(v, ctx) {
    const parse = s => {
      const p = String(s || '').split('/').map(x => x.trim());
      return { price: num(p[0], 0), star: num(p[1], 0), rev: int(p[2], 0), sell: p[3] || '—' };
    };
    const list = [['A', parse(v.a)], ['B', parse(v.b)], ['C', parse(v.c)], ['我们', parse(v.mine)]].filter(x => x[1].price);
    if (list.length < 2) return { html: ui.note('至少填 2 个竞品的「价格 / 评分 / 评论数 / 卖点」才会出分析。格式：32 / 4.5 / 1200 / 便携快充') };
    const sym = C.sym(ctx);
    const prices = list.map(x => x[1].price).sort((a, b) => a - b);
    const min = prices[0], max = prices[prices.length - 1];
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    const me = list.find(x => x[0] === '我们');
    const gaps = [];
    for (let i = 1; i < prices.length; i++) {
      const d = prices[i] - prices[i - 1];
      if (d >= max * 0.18) gaps.push(`${sym}${prices[i - 1]}–${sym}${prices[i]}（空隙 ${sym}${d.toFixed(0)}）`);
    }
    const pos = me ? (me[1].price < avg ? '偏低端' : me[1].price > avg ? '偏高端' : '居中') : '—';
    const winRate = me ? clamp((me[1].star - 4) / 0.8 * 100, 5, 100) : 0;
    return {
      html:
        ui.big([
          { v: sym + avg.toFixed(0), l: '竞品均价', s: `区间 ${sym}${min}–${sym}${max}` },
          { v: me ? pos : '—', l: '我方价格位置', s: me ? `${sym}${me[1].price}（均价的 ${(me[1].price / avg * 100).toFixed(0)}%）` : '' },
          { v: gaps.length, l: '可切入的价格空隙', s: gaps.length ? '存在空档' : '价格已挤满' }
        ]) +
        ui.card('对比矩阵', ui.tbl(
          ['', '价格', '评分', '评论数', '信任度', '主打卖点', '我们怎么打'],
          list.map(([n, d]) => [
            `<b>${n}</b>`, sym + d.price, d.star ? d.star.toFixed(1) : '—', d.rev.toLocaleString(),
            d.rev > 3000 ? ui.tag('强', 'g') : d.rev > 500 ? ui.tag('中', 'y') : ui.tag('弱', 'r'),
            d.sell,
            n === '我们' ? '—' : d.rev > 3000 ? '不硬拼评论，靠场景图与视频差异' : d.star < 4.3 ? '直击它差评里的痛点' : '价格或组合装错位'
          ]))) +
        ui.card('价格带空隙', gaps.length
          ? ui.ul(gaps.map(g => `<b>${g}</b> — 这一段没人卡住，定价落在这里能同时避开上下两端`))
          : ui.note('当前价格已无空档。改打「组合装 / 大容量 / 赠品」制造不可比价，而不是降价。')) +
        ui.card('必须补的短板（按对手能力反推）', ui.ul([
          `最强对手评论 ${Math.max(...list.filter(x => x[0] !== '我们').map(x => x[1].rev)).toLocaleString()} 条 → 新店不拼评论量，靠 <b>主图首图差异 + 视频演示</b> 抢点击`,
          `评分最高 ${Math.max(...list.filter(x => x[0] !== '我们').map(x => x[1].star)).toFixed(1)} → 你的目标先做到 4.4 以上，前 20 单必须跟进出评价`,
          `对手卖点集中在「${list.filter(x => x[0] !== '我们').map(x => x[1].sell).join(' / ')}」→ 你的差异点必须与之不重叠，否则用户只会比价`,
          `信任度打分：我方预估 ${winRate.toFixed(0)} 分（按评分 4.0→5.0 线性换算）`
        ]))
    };
  }
};

/* ============ 01-4 关键词挖掘 ============ */
T.keyword = {
  id: 'keyword', step: 0, name: '关键词挖掘', sub: '词簇表 + 埋词覆盖率检测',
  desc: '按品类与卖点自动组合出词簇，并实时检测你的标题埋了几个词、漏了哪些。',
  inputs: [
    { k: 'title', label: '待检测的标题（英文）', type: 'text', ph: 'Portable Blender for Travel, USB-C Rechargeable Personal Blender' }
  ],
  out(v, ctx) {
    const k = kwClusters(ctx);
    const title = String(v.title || '').toLowerCase();
    const hit = k.rows.filter(r => title.includes(r.k.toLowerCase()));
    const cover = k.rows.length ? hit.length / k.rows.length : 0;
    const miss = k.rows.filter(r => !title.includes(r.k.toLowerCase())).slice(0, 6);
    return {
      html:
        ui.card('词簇表（由品类 + 卖点自动组合）', ui.tbl(
          ['关键词', '类型', '用在哪', '建议优先级'],
          k.rows.map(r => [r.k, ui.tag(r.type, r.type === '核心词' ? 'b' : r.type === '痛点词' ? 'r' : 'y'), r.use,
            r.idx > 70 ? ui.tag('必投', 'g') : r.idx > 50 ? ui.tag('次投', 'y') : ui.tag('长尾', 'n')])
        )) +
        ui.card('埋词覆盖率检测', `
          <div class="cover"><div class="cover-num">${(cover * 100).toFixed(0)}%</div>
          <div class="cover-bar"><i class="${cover > .5 ? 'g' : cover > .25 ? 'y' : 'r'}" style="width:${Math.max(cover * 100, 2)}%"></i></div>
          <div class="cover-txt">你填的标题命中 ${hit.length} / ${k.rows.length} 个建议词</div></div>
          ${miss.length ? ui.ul(miss.map(m => `未埋：<code>${esc(m.k)}</code> —— ${m.use}`)) : ui.note('全部覆盖，标题已达标。')}
          <div class="fx2">Amazon 标题只收录前 200 字符，核心词必须出现在前 80 字符内。</div>`) +
        ui.card('组合公式（自己扩词用）', ui.kv([
          ['核心词 × 场景', k.scenes.map(s => k.base[0] + ' ' + s).join('<br>')],
          ['修饰词 × 核心词', k.mods.map(m => m + ' ' + k.base[0]).join('<br>')],
          ['核心词 × 痛点', ['easy to clean', 'leak proof', 'quiet', 'durable'].map(p => k.base[0] + ' ' + p).join('<br>')]
        ])) +
        ui.card('工具链怎么配合', ui.ul([
          '<b>卖家精灵 / Helium 10</b>：拉月搜索量与竞品数，导出 CSV 直接用上面的打分公式筛',
          '<b>Amazon 搜索下拉框</b>：输入核心词，记录全部联想词（这是平台真实搜索验证过的）',
          '<b>竞品差评区</b>：用户自己写出的词，转化率最高，直接进五点',
          '<b>ChatGPT/Claude</b>：把上面三类词丢进去，让它聚成 5–8 个词簇并去掉重复'
        ]))
    };
  }
};

/* ============ 02-1 选择平台 ============ */
T.pick = {
  id: 'pick', step: 1, name: '选择平台', sub: '按客单价与能力打分匹配',
  desc: '不是哪个火就选哪个。按客单价、预算、内容能力、供应链打分，算出该打哪个平台。',
  inputs: [
    { k: 'aov', label: '客单价（美元）', type: 'num', ph: '跟随项目价格', hint: '留空则用左侧项目信息里的价格' },
    { k: 'budget', label: '月推广预算（美元）', type: 'num', ph: '3000', def: '3000' },
    { k: 'content', label: '内容制作能力', type: 'select', opts: ['强（有拍摄剪辑）', '中（能用模板）', '弱（只能出图）'], def: '中（能用模板）' },
    { k: 'supply', label: '供应链优势', type: 'select', opts: ['自有工厂/成本极低', '稳定货源但无成本优势', '一件代发'], def: '稳定货源但无成本优势' },
    { k: 'brand', label: '是否要做品牌资产', type: 'select', opts: ['要做（长期）', '先赚快钱'], def: '先赚快钱' }
  ],
  out(v, ctx) {
    const aov = num(v.aov, 0) || C.price(ctx) || 0, budget = num(v.budget, 0);
    if (!aov) return { html: ui.note('填客单价后开始打分。') };
    const cs = v.content.startsWith('强') ? 10 : v.content.startsWith('中') ? 6 : 3;
    const sp = v.supply.startsWith('自有') ? 10 : v.supply.startsWith('稳定') ? 6 : 3;
    const br = v.brand.startsWith('要做') ? 10 : 3;

    const score = {
      'Amazon': aov >= 18 ? 8 : 4,
      'TikTok Shop': (aov >= 15 && aov <= 45 ? 8 : 4) * 0.5 + cs * 0.5,
      'Shopify 独立站': (aov >= 40 ? 8 : 3) * 0.4 + cs * 0.3 + br * 0.3,
      'Temu': sp * 0.8 + (aov < 15 ? 4 : 0)
    };
    const arr = Object.entries(score).map(([k, s]) => [k, Math.round(s * 10) / 10]).sort((a, b) => b[1] - a[1]);
    const best = arr[0][0], pf = pfOf(best);
    const testDays = Math.round(budget / Math.max(aov * 0.3, 1));
    return {
      html:
        ui.big([
          { v: best, l: '推荐主战场', s: '匹配分 ' + arr[0][1] },
          { v: arr[1][0], l: '备选 / 第二战场', s: '匹配分 ' + arr[1][1] },
          { v: '$' + budget.toLocaleString(), l: '月预算可测', s: `≈ ${testDays} 次点击试错` }
        ]) +
        ui.card('各平台匹配分', arr.map(([k, s]) => ui.bar(k, s * 10, 100, s >= 7 ? 'g' : s >= 5 ? 'y' : 'r')).join('')) +
        ui.card(`为什么是 ${best}`, `
          ${ui.ul(pf.pros.map(p => '✓ ' + p))}
          ${ui.ul(pf.cons.map(p => '✗ ' + p))}
          ${ui.kv([
            ['费率', pf.feeNote],
            ['其他成本', pf.other],
            ['什么样的产品适合', pf.fit],
            ['核心指标', pf.kpi],
            ['投放打法', pf.ads]
          ])}`) +
        ui.card('不推荐的理由（避免踩坑）', ui.tbl(
          ['平台', '匹配分', '为什么现在不适合你'],
          arr.slice(1).map(([k, s]) => {
            const r = {
              'Temu': sp < 8 ? '你没有极致成本，供货价会被压到没有利润' : '可以试，但只能作为清库存渠道',
              'Shopify 独立站': aov < 40 ? `客单价 $${aov} 撑不住独立站的买量成本（单次获客通常 > $25）` : '建站与内容投入大，需要 3 个月以上才回本',
              'TikTok Shop': cs < 6 ? '内容能力不足，TikTok 没有内容就没有量' : '客单价与平台主流区间不符',
              'Amazon': '客单价偏低时 FBA 履约费占比过高，利润被吃掉'
            }[k] || '当前条件下不是最优';
            return [k, s, r];
          }))) +
        ui.card('90 天路线', ui.ol([
          `第 1–2 周：在 ${best} 完成开店、品牌备案、发首批货（${Math.max(50, Math.round(aov * 3))} 件试单）`,
          `第 3–6 周：跑 ${pf.kpi.split('/')[0].trim()}，同时用 ${arr[1][0]} 做内容测钩子`,
          `第 7–10 周：把 ${best} 上验证过的素材搬到 ${arr[1][0]}，两边数据对比`,
          `第 11–13 周：决定加投哪一个，另一个降为辅助渠道，避免资源分散`
        ]))
    };
  }
};

/* ============ 02-2 搭建独立站 ============ */
T.site = {
  id: 'site', step: 1, name: '搭建独立站', sub: '页面清单与首页模块顺序',
  desc: '按客单价与品类给出建站页面清单、首页模块顺序、以及每个模块必须回答的问题。',
  inputs: [
    { k: 'aov', label: '客单价（美元）', type: 'num', ph: '跟随项目价格', hint: '留空则用左侧项目信息里的价格' },
    { k: 'type', label: '站点类型', type: 'select', opts: ['单品站（只卖一个爆款）', '小类目站（5–20 个 SKU）', '品牌站'], def: '单品站（只卖一个爆款）' },
    { k: 'traffic', label: '主要流量来源', type: 'select', opts: ['Meta 广告', 'TikTok 短视频', 'Google 搜索', '网红分销'], def: 'Meta 广告' }
  ],
  out(v, ctx) {
    const aov = num(v.aov, 40);
    const single = v.type.startsWith('单品');
    const pages = single
      ? [['首页（长落地页）', '广告直接落地，6 屏内完成说服', '必须'], ['产品页', '详情 + 评价 + FAQ', '必须'], ['购物车/结算', '一页式结算，减少跳转', '必须'],
         ['物流政策', '时效 + 关税说明', '必须'], ['退换货政策', '降低下单阻力', '必须'], ['隐私/条款', '支付通道审核要求', '必须'], ['About 品牌故事', '提升信任与溢价', '建议'], ['博客/测评', 'SEO 长尾流量', '后期']]
      : [['首页', '品牌门面 + 分类导航', '必须'], ['集合页', '按场景/人群分类', '必须'], ['产品页', '详情 + 评价', '必须'], ['购物车/结算', '—', '必须'],
         ['政策三页', '物流/退换/隐私', '必须'], ['About', '品牌故事', '必须'], ['FAQ', '集中答疑', '建议'], ['博客', 'SEO 内容', '建议'], ['分销/联盟', 'KOL 分佣', '可选']];
    const home = single
      ? [['首屏 Hero', '一句话说清「是什么 + 解决什么」+ 主 CTA', '3 秒内让人知道卖什么'],
         ['痛点共鸣', '3 个使用场景的痛点图', '让用户觉得「说的是我」'],
         ['产品演示', 'GIF/视频，展示核心动作', '解决「效果存疑」'],
         ['核心卖点 ×3', '图标 + 一句话，不超过 3 个', '人只记得 3 个'],
         ['对比表', '我们 vs 普通产品', '制造选择偏好'],
         ['真实评价', '带图评价 + 星级', '信任最后一公里'],
         ['价格与保障', '价格 + 退换 + 时效', '临门一脚'],
         ['FAQ', '5–8 个高频疑问', '消化最后顾虑']]
      : [['首屏', '品牌定位 + 主推系列', '建立印象'], ['热销区', '4–8 个爆款', '承接流量'], ['场景分类', '按用途分组', '帮用户找货'],
         ['品牌背书', '媒体/认证/销量', '提升信任'], ['评价墙', 'UGC 图集', '社会证明'], ['订阅/优惠', '首单折扣收集邮箱', '沉淀私域']];
    const trafficFit = {
      'Meta 广告': '落地页必须与广告素材视觉一致，否则跳出率翻倍；首屏不要放轮播，放单图 + 一个按钮',
      'TikTok 短视频': '移动端优先，首屏竖版视频自动播放，CTA 按钮固定在底部拇指区',
      'Google 搜索': '需要把政策页、FAQ 做厚，Google 会看站点完整度；产品页加结构化数据',
      '网红分销': '需要联盟后台 + 专属折扣码 + 素材包下载页'
    }[v.traffic];
    return {
      html:
        ui.card('建站必装清单（按顺序做）', ui.ol([
          '域名 + Shopify 基础套餐（$29/月），主题先用 Dawn（免费且快）',
          '支付：Shopify Payments / PayPal 双开（单通道会被弃单）',
          '物流：设置真实运费模板 + 免费 shipping 门槛（设在客单价 ×1.4）',
          '必备 App：评价（Loox/Judge.me）、弃单挽回（Klaviyo）、汇率、弹窗收集邮箱',
          '埋点：Meta Pixel + GA4 + TikTok Pixel，先测通再投广告',
          '政策三页：物流、退换、隐私（支付通道审核必查）',
          '移动端逐屏检查：按钮是否在拇指区、表格是否溢出',
          '速度：主图压到 200KB 内，删掉没用的 App'
        ])) +
        ui.card('页面清单', ui.tbl(['页面', '作用', '优先级'], pages.map(p => [p[0], p[1], p[2] === '必须' ? ui.tag('必须', 'r') : p[2] === '建议' ? ui.tag('建议', 'y') : ui.tag('后期', 'n')]))) +
        ui.card('首页模块顺序（自上而下）', ui.tbl(['顺序', '模块', '要回答的问题'], home.map((h, i) => [i + 1, `<b>${h[0]}</b><div class="fx">${h[1]}</div>`, h[2]]))) +
        ui.card('流量来源对应的关键约束', ui.ul([
          `<b>${v.traffic}</b>：${trafficFit}`,
          `客单价 $${aov} → 免费 shipping 门槛建议设 $${Math.round(aov * 1.4)}（拉高客单 18–25%）`,
          `首屏文案公式：「给{谁}的{产品}，让你{具体好处}，不用{旧方案的麻烦}」`,
          '首页只允许一个主 CTA 反复出现，其余按钮全部做成次要样式'
        ]))
    };
  }
};

/* ============ 02-3 店铺定位 ============ */
T.pos = {
  id: 'pos', step: 1, name: '店铺定位', sub: '一句话定位 + 人设校验',
  desc: '生成三种定位版本并做校验：是否可被记住、是否与竞品重叠、是否影响转化。',
  inputs: [
    { k: 'who', label: '目标人群', type: 'text', ph: '25–35 岁健身上班族' },
    { k: 'diff', label: '与竞品最大的不同', type: 'text', ph: '自清洁，用完不用拆洗' },
    { k: 'proof', label: '支撑证据（数据/认证/实测）', type: 'text', ph: '实测冲洗 10 秒，IPX7 防水' },
    { k: 'tone', label: '品牌调性', type: 'select', opts: ['专业可靠', '年轻有趣', '极简高级', '性价比'], def: '年轻有趣' }
  ],
  out(v, ctx) {
    const who = v.who || '目标人群', diff = v.diff || '核心差异', proof = v.proof || '证据';
    const prods = C.prod(ctx);
    const toneWord = { '专业可靠': ['经得起实测的', '每一个参数都敢公开'], '年轻有趣': ['不将就的', '让日常少一点麻烦'], '极简高级': ['克制的', '只留下必要的'], '性价比': ['不贵的', '把钱花在刀刃上'] }[v.tone];
    const v1 = `给${who}的${prods}：${diff}，${toneWord[1]}。`;
    const v2 = `${prods}，只做一件事——${diff}。${proof}。`;
    const v3 = `不做全能，只做${diff}。${who}的第一选择。`;
    const forms = [['完整版（用于 About / 品牌介绍）', v1], ['短版（用于首屏副标）', v2], ['锐利版（用于广告钩子）', v3]];
    const checks = [
      ['是否 3 秒能懂', diff.length <= 18 ? 'good' : 'warn', diff.length <= 18 ? '差异点够短，能记住' : '差异点偏长，建议压到 15 字内'],
      ['是否可被验证', proof && proof.length > 4 ? 'good' : 'warn', proof ? '有证据支撑，不是空话' : '缺证据，定位会被当成口号'],
      ['是否与竞品重叠', /便宜|低价|性价比高/.test(diff) ? 'warn' : 'good', /便宜|低价/.test(diff) ? '价格不是差异点，谁都能更便宜' : '差异点不是价格，有护城河'],
      ['人群是否具体', who.length >= 6 ? 'good' : 'warn', who.length >= 6 ? '人群有画像，素材可以针对' : '人群太泛，素材会没方向']
    ];
    const okCount = checks.filter(c => c[1] === 'good').length;
    return {
      html:
        ui.big([{ v: okCount + '/4', l: '定位健康度', s: okCount >= 3 ? '可以对外用' : '还需打磨' },
        { v: v.tone, l: '品牌调性', s: '决定视觉与语气' },
        { v: diff.length, l: '差异点字数', s: diff.length <= 18 ? '好记' : '偏长' }]) +
        ui.card('三种版本，按场景取用', forms.map(([t, s]) => `
          <div class="posbox"><div class="pos-t">${t}</div><div class="pos-s">${esc(s)}</div>
          <button class="mini" data-copy="${esc(s)}">复制</button></div>`).join('')) +
        ui.card('定位校验', ui.tbl(['检查项', '结果', '说明'], checks.map(c => [c[0], c[1] === 'good' ? ui.tag('通过', 'g') : ui.tag('待改', 'r'), c[2]]))) +
        ui.card('落到执行上（定位不能只挂在嘴上）', ui.ul([
          `<b>视觉：</b>${v.tone === '年轻有趣' ? '高饱和撞色 + 圆角 + 手写体标题' : v.tone === '极简高级' ? '大面积留白 + 无衬线细体 + 单一主色' : v.tone === '专业可靠' ? '深蓝灰 + 数据图表 + 实拍无修饰' : '暖色 + 大字价格 + 对比图'}，全店统一，不许混搭`,
          `<b>语气：</b>所有文案围绕「${diff}」展开，其他卖点只做支撑，不抢主角`,
          `<b>店铺名建议：</b>${prods.replace(/[\u4e00-\u9fa5]/g, '') || 'Brand'} + 场景词（如 Go / Mini / Pro），要能读出来、能记住、注册得了`,
          `<b>不该做的事：</b>不要为了显得全面而写 8 个卖点；不要在同一个店铺混卖无关品类`
        ]))
    };
  }
};

/* ============ 02-4 支付配置 ============ */
T.pay = {
  id: 'pay', step: 1, name: '支付配置', sub: '组合 + 真实手续费到账测算',
  desc: '按市场给出支付组合，并真实算出每 $1000 流水扣完各项费用后能到手多少。',
  inputs: [
    { k: 'gmv', label: '月流水（美元）', type: 'num', ph: '20000', def: '20000' },
    { k: 'cur', label: '结算币种', type: 'select', opts: ['USD 美元', 'EUR 欧元', 'GBP 英镑', 'JPY 日元', '本地币'], def: 'USD 美元' }
  ],
  out(v, ctx) {
    const m = mkOf(ctx.market), pf = pfOf(ctx.platform);
    const gmv = num(v.gmv, 0);
    const fx = v.cur === 'USD 美元' ? 0 : 0.012;
    const rows = m.pay.map((p, i) => {
      const rate = /COD|货到付款|boleto|OXXO/i.test(p) ? 4.5 : /PayPal/i.test(p) ? 3.49 : /Klarna|Tabby|分期/i.test(p) ? 5.4 : /PIX|GrabPay|DANA|OVO|PayPay/i.test(p) ? 1.2 : 2.9;
      return [p, rate + '%', i === 0 ? ui.tag('必开', 'r') : i === 1 ? ui.tag('建议', 'y') : ui.tag('补充', 'n'),
        /COD|货到付款/i.test(p) ? '拒收率 8–15%，需电话确认' : /PayPal/i.test(p) ? '争议倾向高，务必留发货凭证' : '标准通道'];
    });
    const platformFee = gmv * pf.fee / 100;
    const payFee = gmv * 0.029 + 0.3 * Math.max(gmv / 35, 1);
    const fxFee = gmv * fx;
    const withdraw = gmv * 0.003;
    const net = gmv - platformFee - payFee - fxFee - withdraw;
    return {
      html:
        ui.big([
          { v: m.sym + Math.round(net).toLocaleString(), l: '实际到账 / 月', s: `占流水 ${(net / gmv * 100).toFixed(1)}%` },
          { v: m.sym + Math.round(gmv - net).toLocaleString(), l: '被扣掉的钱', s: '平台 + 支付 + 汇损 + 提现' },
          { v: (net / gmv * 100).toFixed(1) + '%', l: '资金效率', s: net / gmv > 0.9 ? '健康' : '有优化空间' }
        ]) +
        ui.card(`${ctx.market} 必开支付方式`, ui.tbl(['支付方式', '费率（估）', '优先级', '注意'], rows)) +
        ui.card('$多少被谁拿走（真实测算）', ui.tbl(
          ['项目', '算法', '金额', '占比'],
          [['平台佣金', `${pf.fee}% × 流水`, money(platformFee, m.sym), (platformFee / gmv * 100).toFixed(1) + '%'],
          ['支付通道费', '2.9% + $0.30/笔', money(payFee, m.sym), (payFee / gmv * 100).toFixed(1) + '%'],
          ['汇率损耗', fx ? '约 1.2%' : '无（本币结算）', money(fxFee, m.sym), (fxFee / gmv * 100).toFixed(1) + '%'],
          ['提现费', '0.3%', money(withdraw, m.sym), (withdraw / gmv * 100).toFixed(1) + '%'],
          [`<b>到手</b>`, '—', `<b>${money(net, m.sym)}</b>`, `<b>${(net / gmv * 100).toFixed(1)}%</b>`]])) +
        ui.card('结算周期与现金流', ui.ul([
          `<b>${ctx.platform}</b>：${ctx.platform === 'Amazon' ? '14 天结算一次，新店可能压 2 个周期' : ctx.platform === 'TikTok Shop' ? '订单完成后 T+7 可提现' : ctx.platform === 'Shopify 独立站' ? 'T+2 到账（Shopify Payments）' : '按平台规则，通常 T+7~T+15'}`,
          `月流水 ${m.sym}${gmv.toLocaleString()} 时，需备 <b>${m.sym}${Math.round(gmv * 0.4).toLocaleString()}</b> 周转金（覆盖 1 个结算周期 + 广告垫付）`,
          `税务：${m.tax}`,
          `合规：${m.cert}`,
          `拒付/争议：控制在 0.5% 以下，超过会被通道风控限流`
        ])) +
        ui.card('降本动作（按省钱多少排序）', ui.ol([
          `改用本地收单（如 Airwallex / PingPong）替代跨境通道，通常省 0.5–1% → 月省 ${m.sym}${Math.round(gmv * 0.008).toLocaleString()}`,
          `结算币种直接选 ${v.cur.split(' ')[0]}，避免二次换汇`,
          `关闭低使用率支付方式（每个通道都有固定费）`,
          `COD 市场必须做下单确认（WhatsApp/短信），可把拒收率从 15% 降到 8%`
        ]))
    };
  }
};

/* ============ 03-1 产品卖点梳理 ============ */
T.selling = {
  id: 'selling', step: 2, name: '核心卖点', sub: '一条主推 + 三条支撑，附判断依据',
  desc: '用户的记忆只有一条。这里把参数压成「唯一主推 + 三条支撑」，并把每条翻成用户能感知的利益与情绪，再给出用在主图 / 五点 / 详情页的分配。',
  inputs: [
    { k: 'points', label: '现有卖点 / 参数（一行一条）', type: 'area', rows: 5, ph: '无线便携\n6 叶刀头 10 秒出汁\n一键自清洁\nType-C 快充' }
  ],
  out(v, ctx) {
    const src = lines(v.points).length ? lines(v.points) : C.pts(ctx);
    if (!src.length) return { html: ui.note('填入 3 条以上卖点或参数（也可以先用项目信息里的核心卖点）。') };
    const cp = corePointOf(ctx, src);
    const m = cp.main;
    const ev = coreEvidence(ctx, m);
    const tone = r => (r === '主推' ? 'g' : 'n');
    const hero = `<div class="corept">
      <div class="corept-k">核心卖点 · 一条就够</div>
      <div class="corept-v">${esc(m.f)}</div>
      <div class="corept-b">${esc(m.b)}</div>
      <div class="corept-e">${esc(m.e)}</div>
      <div class="corept-m">${ev.length ? ev.map(esc).join('　·　') : '先用一条真实评论或竞品标题验证它，再决定要不要押'}</div>
    </div>`;
    const sup = cp.support.length
      ? `<div class="coresup">${cp.support.map((p, i) => `<div class="coresup-i"><b>${i + 1}</b><span>${esc(p.f)}</span><i>${p.tot} 分</i></div>`).join('')}</div>`
      : ui.note('只有一条卖点，先补到 3 条以上再谈取舍。');
    return {
      html:
        hero +
        ui.card('另外三条补位（不抢主推，只做支撑）', sup + `<p class="pnote">主推占素材的 60%，另外三条各占 10%–15%，剩下的给真实使用画面——分数低的不上主图。</p>`) +
        ui.card('三层翻译 + 评分（分数决定谁上主图）', ui.tbl(
          ['层级', 'Feature → Benefit → Emotion', '评分', '用在哪'],
          cp.rows.map(p => [
            ui.tag(p.role, tone(p.role)),
            `<div class="lv3"><div class="lv3-a">${esc(p.f)}</div><div class="lv3-b">→ ${esc(p.b)}</div><div class="lv3-c">→ ${esc(p.e)}</div></div>`,
            `<b>${p.tot}</b><div class="fx sc">差异 ${p.diff} · 感知 ${p.feel} · 难复制 ${p.hard}</div>`,
            p.rank === 0 ? '主图 1 + 标题首位 + 广告钩子' : p.rank <= 2 ? '主图 2–3 + 五点前两条' : '详情页与 FAQ'
          ]))) +
        ui.card('必须做的三件事', ui.ol([
          '主推只留 1 个卖点，其他全部降级为支撑。卖点超过 3 个，用户一个都记不住。',
          '每个卖点后面必须跟一个「所以呢」——把参数换成用户能感受到的场景。',
          '把最弱的卖点主动说清边界（能做什么 / 不能做什么），退货率会明显下降。'
        ])) +
        ui.card('拿去直接用：一句话卖点', ui.ul(cp.rows.slice(0, 3).map((p, i) =>
          `${i === 0 ? '<b>广告钩子</b>' : i === 1 ? '<b>五点第 1 条</b>' : '<b>详情页开头</b>'}：${esc(p.e)}`))) +
        `<p class="pnote">主推卖点会同步到第 03 步「标签集合 · 内容选题」的每个选题，以及标题与详情页的第一句——改这里，后面全跟着变。</p>`
    };
  }
};

/* ============ 03-2 标题文案 ============ */
T.title = {
  id: 'title', step: 2, name: '标题文案', sub: '多版标题 + 字符数 / 违禁词校验',
  desc: '生成 5 版标题并实时校验字符数（超限平台直接截断）与违禁词（会封号）。',
  inputs: [
    { k: 'main', label: '核心词（英文，一个）', type: 'text', ph: 'portable blender' },
    { k: 'attr', label: '属性词（逗号分隔）', type: 'text', ph: 'USB-C rechargeable, 6 blades, self-cleaning' },
    { k: 'scene', label: '场景 / 人群', type: 'text', ph: 'for travel, gym, office' },
    { k: 'test', label: '自检你的标题', type: 'text', ph: '（把已经写好的标题贴这里做检测）' }
  ],
  out(v, ctx) {
    const pf = C.plat(ctx), lim = LIMIT[pf] || LIMIT['还没定'];
    const main = (v.main || 'portable blender').trim();
    const attr = lines(v.attr), scene = lines(v.scene);
    const pts = toEn(ctx.points).slice(0, 2);
    const A = attr.length ? attr : (toEn(ctx.points).length ? toEn(ctx.points).slice(0, 3) : ['USB-C rechargeable', 'self-cleaning', 'compact']);
    const S = scene.length ? scene : ['for travel', 'for gym'];
    const vers = [
      ['平台标准型（推荐）', [main, ...A.slice(0, 2), ...S.slice(0, 1), 'BPA-Free, 12-Month Warranty'].join(', ')],
      ['搜索优先型', [main, S[0], ...A.slice(0, 2), 'Portable Personal Size'].join(' ')],
      ['卖点前置型', [A[0], main, A[1] || '', S[0]].filter(Boolean).join(' | ')],
      ['场景打动型', [main, 'for ' + (S[0] || 'travel').replace(/^for\s*/i, ''), 'Smoothies Anywhere', A[0]].filter(Boolean).join(', ')],
      ['大写钩子型（TikTok/独立站）', [main.toUpperCase(), A[0], S[0]].filter(Boolean).join(' — ')]
    ];
    const check = s => {
      const ban = BAN.filter(b => new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(s));
      const len = s.length;
      return { ban, len, ok: len <= lim.title && !ban.length };
    };
    const mine = v.test ? check(v.test) : null;
    return {
      html:
        ui.card(`标题生成（${pf} 上限 ${lim.title} 字符）`, vers.map(([t, s]) => {
          const c = check(s);
          return `<div class="tbox ${c.ok ? '' : 'bad'}">
            <div class="tbox-h"><span>${t}</span><span class="cc ${c.len > lim.title ? 'r' : c.len > lim.title * 0.9 ? 'y' : 'g'}">${c.len}/${lim.title}</span></div>
            <div class="tbox-s">${esc(s)}</div>
            ${c.ban.length ? `<div class="tbox-warn">⚠ 含违禁词：${c.ban.join('、')}</div>` : ''}
            <button class="mini" data-copy="${esc(s)}">复制</button>
          </div>`;
        }).join('')) +
        (mine ? ui.card('你的标题检测', `
          <div class="verdict ${mine.ok ? 'good' : 'bad'}">
            <b>${mine.ok ? '通过' : '不通过'}</b> · ${mine.len} / ${lim.title} 字符${mine.len > lim.title ? `（超出 ${mine.len - lim.title} 字符，会被截断）` : ''}
          </div>
          ${mine.ban.length ? ui.ul(mine.ban.map(b => `违禁词 <code>${b}</code> —— 平台判定为夸大宣传，可能导致下架或封号`)) : ui.note('未发现违禁词。')}
          ${lim.search ? `<div class="fx2">搜索词字段上限 ${lim.search} 字符，别浪费在重复词上。</div>` : ''}`) : '') +
        ui.card('标题公式（自己改写用）', ui.kv([
          ['结构', '核心词 + 属性词 + 场景词 + 人群词 + 规格 + 保障'],
          ['前 80 字符', '必须包含核心词与第一卖点（移动端只显示前面这部分）'],
          ['少用', 'all caps（除品牌）、促销语（Free Shipping 会违规）、堆砌逗号'],
          ['必查', '违禁词表：' + BAN.slice(0, 8).join(' / ') + ' …']
        ])) +
        ui.card('五个版本的 AB 用法', ui.ul([
          '同一链接先上「平台标准型」，跑 7 天看 CTR；',
          'CTR < 0.3% → 换成「卖点前置型」再跑 7 天；',
          'TikTok / 独立站不受 200 字符限制，直接用「大写钩子型」做素材标题；',
          '改标题会重置部分权重，一次只改一处，改完观察 5 天。'
        ]))
    };
  }
};

/* ============ 03-3 亚马逊商品图提示词 ============ */
T.aimg = {
  id: 'aimg', step: 2, name: '商品图提示词', sub: '只给提示词，不出图 · 按亚马逊官方图规写死',
  desc: '不再生成图片。按亚马逊官方图片规范输出可直接粘贴的英文提示词：主图 1:1 纯白底、商品占 85%、完整不裁切，另附 6 张辅图与 A+ 模块，含负向词、参数与命名规则。',
  inputs: [
    {
      k: 'slot', label: '要看哪个图位', type: 'select',
      opts: ['全套（主图 + 6 张辅图）', '主图 MAIN', 'PT01 场景图', 'PT02 细节特写', 'PT03 尺寸比例', 'PT04 包装清单', 'PT05 使用步骤', 'PT06 痛点对比', 'A+ 内容图'],
      def: '全套（主图 + 6 张辅图）'
    },
    { k: 'style', label: '影像风格（主图始终纯白底）', type: 'select', opts: ['纯白棚拍', '明亮家居', '户外自然', '极简台面', '高级暗调'], def: '纯白棚拍' },
    { k: 'mk', label: '目标市场（影响人物与场景）', type: 'select', opts: ['北美', '欧洲', '日本', '中东'], def: '北美' },
    { k: 'product', label: '产品英文名', type: 'text', ph: '留空按品类自动填', hint: '写具体一点，模型才不出错：portable USB-C rechargeable blender' },
    { k: 'mat', label: '材质与颜色', type: 'text', ph: '留空按品类自动填', hint: '例：matte cream-white body, clear tritan jar, brushed steel base' }
  ],
  out(v, ctx) { return azPrompt(v, ctx); }
};

/* ============ 03-4 短视频脚本 ============ */
T.video = {
  id: 'video', step: 2, name: '短视频脚本', sub: '分镜表 + 前 3 秒钩子',
  desc: '生成可直接拍的分镜脚本：每一秒画面做什么、口播说什么、字幕打什么。',
  inputs: [
    { k: 'hook', label: '钩子方向', type: 'select', opts: ['痛点直击', '反常识', '效果对比', '价格锚点', '场景代入'], def: '痛点直击' },
    { k: 'dur', label: '时长（秒）', type: 'select', opts: ['15', '21', '30', '45'], def: '21' },
    { k: 'pain', label: '要打的痛点', type: 'text', ph: '清洗太麻烦，用完就闲置' }
  ],
  out(v, ctx) {
    const pain = v.pain || '现有产品不好用';
    const dur = int(v.dur, 21);
    const hooks = {
      '痛点直击': [`每次用完都要拆开洗，洗一次 10 分钟——难怪你买了就闲置`, `你是不是也这样：买了，用了两次，塞柜子里了`],
      '反常识': [`别再买那种要拆刀头的水杯了，90% 的人洗两次就不用了`, `贵的反而不好用？我拆了 3 个爆款才明白`],
      '效果对比': [`左边 30 秒，右边 8 秒。同一块冰，差别在这`, `同一个配方，换个机器，口感差一个档`],
      '价格锚点': [`外面一杯 28 块，这台机器一周就回本`, `同款卖 $69，我找到源头只要一半`],
      '场景代入': [`早上 7:20，出门前 30 秒能做完什么？`, `健身房出来，包里掏出这个，比吧台快`]
    }[v.hook];
    const beats = dur <= 15
      ? [[0, 3, '钩子', hooks[0], '特写问题场景（脏刀头 / 闲置产品）', pain], [3, 9, '演示', '看，这样一冲就干净', '冲水 3 秒实拍，不加剪辑', '自清洁'], [9, 13, '结果', '8 秒出浆，冰块都打得碎', '倒入冰块 → 出浆特写', '效果'], [13, 15, 'CTA', '链接放这了', '产品 + 价格贴纸', '下单']]
      : [[0, 3, '钩子', hooks[0], '特写 + 快速推近，字幕要大', pain],
        [3, 6, '共情', '我也是买了三个才找到对的', '三个产品摆一排，划掉两个', '试错成本'],
        [6, 12, '演示', '关键在这——它不用拆，冲一下就行', '完整动作一镜到底，不剪辑', '核心卖点'],
        [12, 17, '证据', '看这个，冰块直接下去', '冰块 + 出浆对比镜头', '效果证明'],
        [17, 20, '价格', '一杯奶茶钱，能用一年', '价格贴纸 + 计算器数字', '价值锚定'],
        [20, dur, 'CTA', '点左下角，今天有券', '手指指向购物车', '转化']];
    return {
      html:
        ui.card('前 3 秒钩子（选一个，逐字念）', ui.ul(hooks.map((h, i) => `<b>版本 ${i + 1}：</b>“${esc(h)}”`))) +
        ui.card(`分镜脚本（${dur} 秒 · ${v.hook}）`, ui.tbl(
          ['时间', '段落', '口播', '画面', '字幕'],
          beats.map(b => [`${b[0]}–${b[1]}s`, `<b>${b[2]}</b>`, esc(b[3]), b[4], ui.tag(b[5], 'b')]))) +
        ui.card('拍摄要点（决定完播率）', ui.ol([
          '前 3 秒不要出现 logo、不要自我介绍，直接上画面 + 一句狠话',
          '全程竖屏 9:16，主体占画面 60%，字幕离底部留 15%（避开 UI 遮挡）',
          '每个镜头不超过 3 秒，节奏靠剪辑，不靠嘴快',
          '口播用短句，一句不超过 12 个字，字幕与口播完全一致',
          `结尾必须有一个明确动作，不要说「感兴趣可以看看」`
        ])) +
        ui.card('素材变体（同脚本换 3 个开头就能测）', ui.tbl(
          ['变体', '改什么', '为什么'],
          [['A', '换钩子（' + hooks[0].slice(0, 10) + '…→' + hooks[1].slice(0, 10) + '…）', '钩子决定 70% 的完播'],
          ['B', '换拍摄环境（室内 → 户外）', '场景决定人群匹配'],
          ['C', '换人物（无人物 → 真人出镜）', '真人提升信任与停留']])) +
        ui.card('工具', ui.kv([
          ['拍摄', '手机 + 补光灯即可，别用专业设备（太干净反而不像真实分享）'],
          ['剪辑', 'CapCut / 剪映：自动字幕 + 变速 + 卡点'],
          ['配音', '自己念最真实；AI 配音用 ElevenLabs / 魔音'],
          ['投放', 'TikTok 先自然流测 3 天，完播 > 25% 再加热']
        ]))
    };
  }
};

/* ============ 04-1 产品详情页 ============ */
T.detail = {
  id: 'detail', step: 3, name: '产品详情页', sub: '直接生成可上线的详情页 + 五点文案',
  desc: '生成一份完整的英文详情页（首屏、痛点、三个卖点、使用步骤、参数、对比、评价、FAQ），可下载 HTML 直接上传独立站。',
  inputs: [
    { k: 'brand', label: '品牌名', type: 'text', ph: 'VITAFRESH', def: 'VITAFRESH' },
    { k: 'price', label: '售价（留空跟随项目价格）', type: 'text', ph: '39' },
    { k: 'p1', label: '卖点 1', type: 'text', ph: '一键自清洁，冲水 10 秒' },
    { k: 'p2', label: '卖点 2', type: 'text', ph: '6 叶不锈钢刀头，冰块也能打' },
    { k: 'p3', label: '卖点 3', type: 'text', ph: 'Type-C 快充，充满用一周' },
    { k: 'p4', label: '卖点 4', type: 'text', ph: '350g 超轻，单手可握' },
    { k: 'p5', label: '卖点 5', type: 'text', ph: '食品级材质，BPA Free' }
  ],
  out(v, ctx) {
    const lim = LIMIT[C.plat(ctx)] || LIMIT['还没定'];
    const brand = (v.brand || 'YOUR BRAND').toUpperCase();
    const mine = [v.p1, v.p2, v.p3, v.p4, v.p5].filter(Boolean);
    const pros = mine.length ? mine : C.pts(ctx);
    const price = v.price ? (/[$¥€]/.test(v.price) ? v.price : '$' + v.price) : (num(ctx.price, 0) ? '$' + num(ctx.price, 0) : '');

    /* 五点：全英文，不再中英混排 */
    const tails = ['Backed by a 12-month warranty.', 'Ships from a local warehouse in 24 hours.', 'Food-grade materials, tested before packing.'];
    const bullets = pros.slice(0, 5).map((p, i) => {
      const b = enBlock(p, i);
      const head = b.h.replace(/\.$/, '');
      const parts = b.b.split(/[.!?]\s+/).map(x => x.replace(/[.!?]$/, '')).filter(Boolean);
      const body = parts.slice(0, 2).join('. ');
      const text = `${head.toUpperCase()} — ${body}. ${tails[i % 3]}`;
      return { zh: p, text, len: text.length };
    });
    const over = bullets.filter(x => x.len > lim.bullet);

    /* 页面主标题用英文，不把中文产品名直接塞进英文页 */
    const enName = (catOf(ctx.category).kw[0] || 'product').replace(/\b\w/g, c => c.toUpperCase());
    const h1 = `${enName} — ${enBlock(pros[0], 0).h}`;
    const dImg = (ctx.__imgs && ctx.__imgs.detail) || '';
    const page = pageHTML(ctx, { brand, price, points: pros, cta: 'Add to cart', h1, img: dImg });
    window.__PAGES = window.__PAGES || {};
    window.__PAGES.detail = page;
    const size = (page.length / 1024).toFixed(1);

    return {
      html:
        `<div class="sbar">下面这份详情页是<b>真正生成好的成品</b>（英文、响应式、无外部依赖），可以直接下载上传到独立站，也可以交给设计当结构稿。</div>` +

        ui.card('成品详情页（可直接上线）', `
          <div class="pvbar">
            <div class="pvbar-l">独立 HTML · ${size} KB · 英文成品 · 图片位已标注尺寸</div>
            <div class="pvbar-r">
              <button class="mini3 p" data-htmlsave="detail">下载 HTML</button>
              <button class="mini3" data-htmlopen="detail">新窗口打开</button>
              <button class="mini3" data-copy-page="detail">复制源码</button>
            </div>
          </div>
          <div class="pvbox"><iframe class="pvframe" data-page="detail" title="详情页预览"></iframe></div>
          <div class="fx2">页面里的灰色区块是图片位，标了建议尺寸；把实拍图换进去就是完整页面。文案全部是英文，已按美国站的表达习惯写，不含绝对化用语。预览最多展开 1500px，完整页面点「新窗口打开」或「下载 HTML」。</div>`) +

        ui.card(`五点描述（${C.plat(ctx)} 每条上限 ${lim.bullet} 字符）`,
          bullets.map((x, i) => `
            <div class="tbox ${x.len > lim.bullet ? 'bad' : ''}">
              <div class="tbox-h"><span>Bullet ${i + 1}</span><span class="cc ${x.len > lim.bullet ? 'r' : x.len > lim.bullet * .9 ? 'y' : 'g'}">${x.len}/${lim.bullet}</span></div>
              <div class="tbox-s">${esc(x.text)}</div>
              <div class="fx">中文原意：${esc(x.zh)}</div>
              <button class="mini" data-copy="${esc(x.text)}">复制</button>
            </div>`).join('') +
          (over.length ? `<div class="tbox-warn">${over.length} 条超出上限，平台会截断或拒收</div>` : ui.note('全部在限制内，可直接提交。'))) +

        ui.card('页面结构（已按这个顺序生成）', ui.tbl(
          ['顺序', '模块', '它解决的问题'],
          [['1', '顶部促销条', '免运费 / 退换 / 质保，先给安全感'],
          ['2', '首屏：标题 + 评分 + 价格 + 按钮', '3 秒说清是什么、多少钱、下一步做什么'],
          ['3', '痛点三连', '让用户认出自己（清洗累、打不碎、没电）'],
          ['4', '三个卖点深讲', '每个卖点配一张图，讲「所以你怎样」而不是参数'],
          ['5', '三步使用', '降低使用门槛，减少「买回来不会用」'],
          ['6', '参数表 + 对比表', '给理性比价的人一个选择的理由'],
          ['7', '真实评价 + FAQ', '临门一脚的信任，FAQ 直接消掉退货理由'],
          ['8', '底部再转化', '价格 + 保障再提一次']])) +

        ui.card('上线前必须改的三处', ui.ul([
          '<b>图片位</b>：按上面「商品图提示词」拍出主图 2000×2000 纯白底、场景图 2000×2000、细节特写各一张，替换占位框',
          '<b>评价</b>：示例评价是结构示范，必须换成真实买家评价（截图或文字），否则违反广告法',
          '<b>承诺</b>：12 个月质保、30 天退换、24 小时发货——写上去就要做到，做不到的删掉'
        ])) +

        ui.card('文案红线', ui.ul([
          `不能写：${BAN.slice(0, 6).join(' / ')} 等绝对化与医疗功效词`,
          '不能写竞品品牌名做对比',
          '不能承诺无法兑现的时效（如 2 天到货）',
          '所有数字（容量、续航、分贝）必须能被实测验证'
        ]))
    };
  }
};

/* ============ 04-2 多语言翻译 ============ */
T.i18n = {
  id: 'i18n', step: 3, name: '多语言翻译', sub: '按市场输出标题与关键词',
  desc: '同一套卖点，按目标市场输出本地化标题、关键词与必须避开的表达。',
  inputs: [
    { k: 'main', label: '英文核心词', type: 'text', ph: 'portable blender' },
    { k: 'mk', label: '目标市场', type: 'select', opts: ['德国', '法国', '日本', '西班牙', '沙特（阿语）', '巴西（葡语）'], def: '德国' }
  ],
  out(v, ctx) {
    const main = v.main || (catOf(ctx.category).kw[0]) || 'portable blender';
    const L = {
      '德国': { lang: '德语', title: `Tragbarer Mixer für unterwegs, USB-C wiederaufladbar, 6 Klingen, selbstreinigend`, kw: ['tragbarer mixer', 'mixer für unterwegs', 'usb mixer', 'smoothie maker', 'selbstreinigender mixer'], tip: ['德国人看参数与 TÜV/CE 认证，必须标', '不要用 übertrieben（夸大）形容词', '退货政策写清 14 天 Widerrufsrecht'], avoid: ['用英文标题（转化掉一半）'] },
      '法国': { lang: '法语', title: `Blender portable sans fil, rechargeable USB-C, 6 lames, auto-nettoyant`, kw: ['blender portable', 'mixeur nomade', 'blender sans fil', 'mini blender', 'blender USB'], tip: ['法语标题要顺畅，机翻一眼看出', '强调 design 与 esthétique', '标 CE + 法国本地退货地址'], avoid: ['直译 "portable" 到错误语境'] },
      '日本': { lang: '日语', title: `ポータブルブレンダー 充電式 USB-C 6枚刃 セルフクリーニング 軽量`, kw: ['ポータブルブレンダー', '充電式ブレンダー', '一人暮らし ブレンダー', 'スムージー 手軽', '静音 ブレンダー'], tip: ['详情页精细度要求极高，参数表必备', '用「〜です・ます」敬体', '标注 PSE 认证与日本国内售后'], avoid: ['用简体中文直译', '省略尺寸图'] },
      '西班牙': { lang: '西语', title: `Batidora portátil inalámbrica, recargable USB-C, 6 cuchillas, autolimpiable`, kw: ['batidora portátil', 'licuadora portátil', 'batidora USB', 'smoothie portátil', 'mini batidora'], tip: ['西班牙与墨西哥用词不同（batidora / licuadora）', '强调与家人分享场景', '标 CE'], avoid: ['混用拉美与西班牙用词'] },
      '沙特（阿语）': { lang: '阿拉伯语', title: `خلاط محمول لاسلكي، شحن USB-C، ٦ شفرات، تنظيف ذاتي`, kw: ['خلاط محمول', 'خلاط لاسلكي', 'خلاط صغير', 'عصير طازج', 'خلاط قابل للشحن'], tip: ['必须阿拉伯语，且从右到左排版', '图片里人物着装需符合当地规范', '标 SASO/SABER 认证'], avoid: ['图片中出现猪/酒相关元素'] },
      '巴西（葡语）': { lang: '葡语', title: `Liquidificador portátil sem fio, recarregável USB-C, 6 lâminas, autolimpante`, kw: ['liquidificador portátil', 'mixer portátil', 'liquidificador USB', 'suco prático', 'mini liquidificador'], tip: ['必须写分期（parcelado）信息，巴西人几乎只买分期', '标 ANATEL/ANVISA（视品类）', '价格含税展示'], avoid: ['只写一次性付款'] }
    }[v.mk];
    return {
      html:
        ui.card(`${v.mk} 本地化标题`, `<div class="tbox"><div class="tbox-h"><span>${L.lang} 标题</span><span class="cc g">${L.title.length} 字符</span></div><div class="tbox-s">${esc(L.title)}</div><button class="mini" data-copy="${esc(L.title)}">复制</button></div>`) +
        ui.card('本地搜索词（直接填后台关键词字段）', ui.ul(L.kw.map(k => `<code>${k}</code>`))) +
        ui.card('本地化必须注意', ui.ul([...L.tip.map(t => '✓ ' + t), ...L.avoid.map(t => '✗ ' + t)])) +
        ui.card('翻译工作流（别直接用机翻上线）', ui.ol([
          '先用 DeepL 出初稿（比 Google 准，尤其德语/日语）',
          '把初稿丢给 ChatGPT/Claude，让它按「母语电商文案」重写，并说明目标人群',
          '关键词部分不要翻译，直接用本地人真实搜索词（用平台下拉框验证）',
          '找母语者做一次 spot check（Fiverr 十几美金），重点看标题与五点',
          '所有尺寸换算成当地单位（英寸/厘米、磅/克），货币也要本地化'
        ])) +
        ui.card('术语对照表（保持一致，别每次翻得不一样）', ui.tbl(
          ['中文', '英文', v.mk],
          (() => {
            const map = {
              '德国': ['Akku', 'Klingen', 'Reinigung', 'Kapazität', 'Gewicht'],
              '法国': ['Batterie', 'Lames', 'Nettoyage', 'Capacité', 'Poids'],
              '日本': ['バッテリー', '刃', 'お手入れ', '容量', '重量'],
              '西班牙': ['Batería', 'Cuchillas', 'Limpieza', 'Capacidad', 'Peso'],
              '沙特（阿语）': ['بطارية', 'شفرات', 'تنظيف', 'السعة', 'الوزن'],
              '巴西（葡语）': ['Bateria', 'Lâminas', 'Limpeza', 'Capacidade', 'Peso']
            }[v.mk];
            return [['电池', 'Battery'], ['刀头', 'Blades'], ['清洁', 'Cleaning'], ['容量', 'Capacity'], ['重量', 'Weight']].map(([c, e], i) => [c, e, map[i] || e]);
          })()))
    };
  }
};

/* ============ 04-3 SKU 整理 ============ */
T.sku = {
  id: 'sku', step: 3, name: 'SKU 整理', sub: '变体笛卡尔积 + 编码表导出',
  desc: '填颜色、尺寸、套装，自动生成完整 SKU 矩阵与规范编码，可一键导出 CSV。',
  inputs: [
    { k: 'prefix', label: 'SKU 前缀（品牌缩写）', type: 'text', ph: 'VF', def: 'SKU' },
    { k: 'color', label: '颜色（逗号分隔）', type: 'text', ph: 'White, Black, Pink', def: 'White, Black', hint: '有几个颜色写几个' },
    { k: 'size', label: '规格（逗号分隔）', type: 'text', ph: '350ml, 500ml', def: '350ml, 500ml' },
    { k: 'pack', label: '套装（逗号分隔）', type: 'text', ph: '1-pack, 2-pack', def: '1-pack, 2-pack' },
    { k: 'price', label: '基础售价（美元）', type: 'num', ph: '32', hint: '留空则用项目信息里的价格带' }
  ],
  out(v, ctx) {
    const pre = (v.prefix || 'SKU').toUpperCase();
    const cols = lines(v.color), sizes = lines(v.size), packs = lines(v.pack);
    if (!cols.length && !sizes.length) return { html: ui.note('至少填「颜色」或「规格」才会生成 SKU 矩阵。') };
    const C1 = cols.length ? cols : ['Default'], S1 = sizes.length ? sizes : ['One Size'], P1 = packs.length ? packs : ['1-pack'];
    const code = s => s.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(3, 'X');
    const rows = [];
    let i = 1;
    const base = num(v.price, 0) || C.price(ctx) || 20;
    C1.forEach(c => S1.forEach(s => P1.forEach(p => {
      const packN = int((p.match(/\d+/) || [1])[0], 1);
        const base = num(v.price, 0) || C.price(ctx) || 20;
      const price = base * (1 + (packN - 1) * 0.82);
      rows.push([
        `<code>${pre}-${code(c)}-${code(s)}-${packN}P</code>`,
        c, s, p, '$' + price.toFixed(2),
        '$' + (price / packN).toFixed(2),
        Math.round(price * 0.42 * 100) / 100,
        i++
      ]);
    })));
    const csv = ['SKU,Color,Size,Pack,Price,Unit Price,Est. Cost,Seq']
      .concat(rows.map(r => [r[0].replace(/<\/?code>/g, ''), r[1], r[2], r[3], r[4], r[5], '$' + r[6], r[7]].join(','))).join('\n');
    return {
      html:
        ui.big([{ v: rows.length, l: 'SKU 总数', s: '变体组合' },
        { v: C1.length + '/' + S1.length + '/' + P1.length, l: '色 / 规格 / 套装', s: '维度数' },
        { v: '$' + (num(v.price, 20) * (1 + (P1.length > 1 ? 0.82 : 0))).toFixed(0), l: '最高单 SKU 价', s: '套装 8.2 折' }]) +
        ui.card('SKU 矩阵', ui.tbl(['SKU 编码', '颜色', '规格', '套装', '售价', '单件价', '预估成本', '#'], rows)) +
        ui.card(`<button class="mini" data-dl="${esc(csv)}" data-name="sku.csv">⬇ 导出 CSV（可直接导入 ERP / 平台）</button>`, `
          ${ui.kv([
            ['编码规则', `${pre}-{颜色4位}-{规格4位}-{数量}P，全大写无空格`],
            ['为什么这样编', '排序时自动按颜色分组、规格递增，拣货不会拿错'],
            ['套装定价逻辑', '2 件 8.2 折 ≈ 拉高客单 60%，但毛利仍高于单件'],
            ['命名一致', '同一 SKU 在平台、ERP、包装标签上必须完全一致，否则对不上账']
          ])}`) +
        ui.card('变体上架要注意', ui.ul([
          'Amazon 变体必须用父子体，否则评论不共享、广告互相抢',
          '颜色命名按市场习惯：美国用 White/Black，欧洲可加 Matt White',
          '规格超出 3 个时，先只上主销的 2 个，避免库存分散',
          '每个变体都要有独立主图，别用同一张'
        ]))
    };
  }
};

/* ============ 04-4 批量上架 ============ */
T.bulk = {
  id: 'bulk', step: 3, name: '批量上架', sub: '上架流程 + 平台模板导出',
  desc: '给出批量上架的标准流程、必填字段清单，并可导出可导入的模板文件。',
  inputs: [
    { k: 'n', label: '首批上架 SKU 数', type: 'num', ph: '6', def: '6' },
    { k: 'plat', label: '上架平台', type: 'select', opts: ['Amazon', 'TikTok Shop', 'Shopify 独立站', 'Temu'], def: 'Amazon' },
    { k: 'time', label: '每天可投入时间（小时）', type: 'num', ph: '2' , def: '2' }
  ],
  out(v, ctx) {
    const n = Math.max(int(v.n, 1), 1), t = num(v.time, 2);
    const per = v.plat === 'Amazon' ? 25 : v.plat === 'Shopify 独立站' ? 15 : 18;
    const days = Math.ceil(n * per / 60 / t);
    const fields = {
      'Amazon': [['必填', 'item_name / brand_name / manufacturer'], ['必填', 'external_product_id（UPC/EAN，无品牌可申请豁免）'], ['必填', 'standard_price / quantity / condition_type'], ['必填', 'main_image_url（白底 2000px+）'], ['强烈建议', 'bullet_point ×5 / product_description / generic_keywords'], ['选填', 'A+ 内容 / 视频 / 变体关系']],
      'TikTok Shop': [['必填', 'product_name / category / brand'], ['必填', 'price / stock / weight（运费计算）'], ['必填', '主图 3 张以上 + 1 条视频'], ['强烈建议', 'package_dimensions / 发货仓'], ['选填', '达人佣金比例 / 优惠券']],
      'Shopify 独立站': [['必填', 'Title / Description（富文本）'], ['必填', 'Price / SKU / Inventory'], ['必填', '图片 3 张以上 + alt 文本（SEO）'], ['强烈建议', 'SEO title / meta description'], ['选填', 'Collections / Tags / 变体']],
      'Temu': [['必填', '商品名称 / 类目 / 供货价'], ['必填', '图片（白底 + 场景，多数类目要求 5 张以上）'], ['必填', '尺寸重量 / 包装'], ['强烈建议', '备货周期 / 库存']]
    }[v.plat];
    const csv = ['SKU,Title,Price,Stock,MainImage,Bullet1,Bullet2,Bullet3,Bullet4,Bullet5']
      .concat(Array.from({ length: n }, (_, i) => `${'SKU' + String(i + 1).padStart(3, '0')},,0,0,,`)).join('\n');
    return {
      html:
        ui.big([{ v: n + ' 个', l: '首批 SKU', s: '少量试销' },
        { v: days + ' 天', l: '预计上完', s: `按每天 ${t} 小时、单个 ${per} 分钟` },
        { v: '1 次', l: '模板校验', s: '批量上传先跑校验' }]) +
        ui.card(`${v.plat} 必填字段清单`, ui.tbl(['级别', '字段'], fields.map(f => [f[0] === '必填' ? ui.tag('必填', 'r') : f[0] === '强烈建议' ? ui.tag('建议', 'y') : ui.tag('选填', 'n'), f[1]]))) +
        ui.card('批量上架标准流程', ui.ol([
          '在后台下载官方批量模板（别自己造表头，平台会拒收）',
          '先只填 1 个 SKU 做「试上传」，确认类目、属性、佣金都对',
          '试上传通过后，复制这一行改 SKU/图片/价格，批量填满',
          '图片先传到图床或用平台图片空间，拿到公开 URL 再填',
          '上传后逐条检查：类目是否正确、变体是否归组、库存是否生效',
          '最后统一设置：运费模板、退货地址、发货时效'
        ])) +
        ui.card('导出的空白模板', `<button class="mini" data-dl="${esc(csv)}" data-name="bulk_template.csv">⬇ 下载 CSV 模板（${n} 行）</button>
          <div class="fx2">表头已按常见字段建好，填完即可用平台工具转换成官方模板。</div>`) +
        ui.card('高频被拒原因', ui.tbl(
          ['问题', '原因', '怎么避免'],
          [['图片审核不过', '白底不纯 / 有水印 / 像素不足', '主图纯白底、2000px、无水印'],
          ['类目错放', '选了相近类目', '按竞品 ASIN 的类目反查'],
          ['变体没归组', '父子 SKU 关系没填', '先建父体再挂子体'],
          ['UPC 报错', '编码重复或不合规', '用 GS1 正规码，或申请品牌豁免'],
          ['价格被压制', '低于平台最低价', '检查促销价与划线价逻辑']]))
    };
  }
};

/* ============ 05-1 广告素材生成 ============ */
T.creative = {
  id: 'creative', step: 4, name: '广告素材生成', sub: '9 宫格素材矩阵',
  desc: '一次生成 9 组「角度 × 形式」的素材组合，每组给到钩子文案与拍摄要求。',
  inputs: [
    { k: 'angle', label: '主打角度', type: 'select', opts: ['性价比', '省时间', '颜值', '专业性能', '礼物场景'], def: '省时间' },
    { k: 'fmt', label: '投放形式', type: 'multi', opts: ['竖版短视频', '单图', '轮播', 'UGC 口播'], def: '竖版短视频' }
  ],
  out(v, ctx) {
    const prod = C.prod(ctx), aov = C.price(ctx) || 30;
    const pain = catOf(ctx.category).pain[0];
    const angs = [
      ['痛点对比', `还在为「${pain}」头疼？`, '左右分屏：旧方案 vs 我们', '3 秒内必须出现对比'],
      ['效果直拍', '8 秒，看到结果', '一镜到底，不剪辑', '不要加转场，真实感最重要'],
      ['开箱体验', '花 $' + aov + '，我买到了什么', '手部开箱 + 逐一展示配件', '第一人称视角'],
      ['使用场景', '早上 7:20，30 秒搞定', '真人生活场景，自然光', '背景要真实，不要影棚'],
      ['价格锚点', '外面一杯 $8，这台能用一年', '计算器数字 + 产品', '数字要打在画面上'],
      ['用户证言', '用了两周，说点实话', '真人对着镜头讲优缺点', '一定要说一个缺点，才可信'],
      ['反常识', '别再买要拆刀头的了', '错误用法演示 + 正确用法', '前 2 秒制造认知冲突'],
      ['细节特写', '这个刀头，值这个价', '微距 + 慢动作', '质感靠光，不靠滤镜'],
      ['礼物角度', '送这个，比送花实用', '包装 + 送礼场景', '节日期间单独跑']
    ];
    const fm = v.fmt ? [].concat(v.fmt) : ['竖版短视频'];
    const spec = { '竖版短视频': '9:16，15–21s，前 3s 钩子', '单图': '1:1 或 4:5，大字 ≤ 8 字', '轮播': '3–5 张，讲一个完整故事', 'UGC 口播': '真人手持自拍，不修音' };
    return {
      html:
        ui.card('素材矩阵（9 个角度，先各做 1 条）', ui.tbl(
          ['#', '角度', '钩子文案（逐字念）', '画面要求', '备注'],
          angs.map((a, i) => [i + 1, `<b>${a[0]}</b>`, `“${esc(a[1])}”`, a[2], `<span class="fx">${a[3]}</span>`]))) +
        ui.card('按形式套用', ui.tbl(
          ['形式', '规格', '这一条要改什么'],
          fm.map(f => [f, spec[f], f === '单图' ? '把钩子压到 8 字内，主图占 70%' : f === '轮播' ? '拆成 4 帧：痛点 → 产品 → 效果 → 价格' : f === 'UGC 口播' ? '换成真人第一人称，脚本口语化' : '按分镜表拍，每镜 ≤3s']))) +
        ui.card('测试顺序（别一次全上）', ui.ol([
          '第 1 轮：9 个角度各投 $10–15，只测「完播率 / CTR」，不看转化',
          '第 2 轮：留下 CTR > 1.5% 的 3 个角度，每个做 3 个开头变体',
          '第 3 轮：赢家加预算，同时测落地页（同样的素材换页面看 CVR）',
          '素材衰减：同一素材跑 7–14 天后 CTR 会掉 30%，提前备好替换'
        ])) +
        ui.card('工具', ui.kv([
          ['批量出图', 'Canva 批量创建 / Figma 组件，把 9 个角度做成模板'],
          ['视频剪辑', 'CapCut 模板套用，统一字幕样式'],
          ['AI 生成', '即梦 / Runway 做场景补充，真人部分自己拍更可信'],
          ['素材管理', '按「角度_形式_版本_日期」命名，否则一周后就分不清']
        ]))
    };
  }
};

/* ============ 05-2 广告投放（真实 ROI 计算） ============ */
T.ads = {
  id: 'ads', step: 4, name: '广告投放', sub: 'ROI 反推 + 保本 CPA 测算',
  desc: '输入真实的 CPM / CTR / 转化率，算出每单成本、保本线、以及这笔预算值不值得投。',
  inputs: [
    { k: 'cpm', label: 'CPM（美元/千次曝光）', type: 'num', ph: '12', def: '12', hint: '行业均值，换成你后台的真实数' },
    { k: 'ctr', label: 'CTR %（点击率）', type: 'num', ph: '1.6', def: '1.6' },
    { k: 'cvr', label: 'CVR %（落地页转化率）', type: 'num', ph: '2.2', def: '2.2' },
    { k: 'aov', label: '客单价（美元）', type: 'num', ph: '跟随项目价格', hint: '留空则用左侧项目信息里的价格' },
    { k: 'gm', label: '毛利率 %', type: 'num', ph: '55', def: '55', hint: '扣货成本后、扣平台费前' },
    { k: 'budget', label: '计划日预算（美元）', type: 'num', ph: '100', def: '100' }
  ],
  out(v, ctx) {
    const cpm = num(v.cpm, 10), ctr = num(v.ctr, 1.5) / 100, cvr = num(v.cvr, 2) / 100;
    const aov = num(v.aov, 0) || C.price(ctx) || 30, gm = num(v.gm, 50) / 100, bud = num(v.budget, 100);
    if (!cpm || !ctr || !cvr) return { html: ui.note('填入 CPM / CTR / CVR 后开始测算。') };
    const pf = pfOf(ctx.platform);
    const netGM = Math.max(gm - pf.fee / 100, 0.05);
    const cpc = cpm / (1000 * ctr);
    const cpa = cpc / cvr;
    const breakCPA = aov * netGM;
    const roas = aov / cpa;
    const breakROAS = 1 / netGM;
    const imp = bud / cpm * 1000, clicks = imp * ctr, orders = clicks * cvr;
    const rev = orders * aov, gross = rev * netGM, profit = gross - bud;
    const unit = aov * netGM - cpa;
    const ok = cpa <= breakCPA;
    return {
      html:
        ui.big([
          { v: money(cpc, '$'), l: '单次点击成本 CPC', s: `CPM $${cpm} ÷ CTR ${(ctr * 100).toFixed(1)}%` },
          { v: money(cpa, '$'), l: '单笔订单成本 CPA', s: `保本线 ${money(breakCPA, '$')}` },
          { v: roas.toFixed(2), l: '预计 ROAS', s: `保本 ROAS ${breakROAS.toFixed(2)}` },
          { v: (profit >= 0 ? '+' : '') + money(profit, '$'), l: '日利润', s: `预算 $${bud}` }
        ]) +
        ui.card('能不能投：结论', `
          <div class="verdict ${ok ? 'good' : 'bad'}">
            <b>${ok ? '可以放量' : '现在放量就是亏钱'}</b> · 每单${ok ? '赚' : '亏'} ${money(Math.abs(unit), '$')}
          </div>
          ${ui.ul([
            ok ? `CPA ${money(cpa, '$')} < 保本 ${money(breakCPA, '$')}，还有 ${money(breakCPA - cpa, '$')} 的优化空间` : `CPA ${money(cpa, '$')} > 保本 ${money(breakCPA, '$')}，缺口 ${money(cpa - breakCPA, '$')}。需要把 CPA 降 ${pct((cpa - breakCPA) / cpa)} 才能打平`,
            ok ? `ROAS ${roas.toFixed(2)} 高于保本 ${breakROAS.toFixed(2)}，可以每天加 20% 预算，不要一次翻倍` : `要么提客单价（加购/套装），要么提转化率（改落地页），要么降 CPC（换素材角度）`,
            `日预算 $${bud} 预估：曝光 ${Math.round(imp).toLocaleString()} → 点击 ${Math.round(clicks)} → 订单 ${orders.toFixed(1)} → 营收 ${money(rev, '$')}`,
            unit > 0 ? `盈亏临界订单量：${Math.ceil(bud / unit)} 单/天，低于这个数当天就亏` : `每单本身是亏的，加量只会亏更多——先修转化率或客单价，别指望靠走量摊平`
          ])}`) +
        ui.card('三个杠杆，改哪个最有效', ui.tbl(
          ['杠杆', '当前', '改到', 'CPA 会变成', '难度'],
          [['提升 CVR', (cvr * 100).toFixed(1) + '%', (cvr * 100 * 1.3).toFixed(1) + '%', money(cpc / (cvr * 1.3), '$'), ui.tag('最快', 'g')],
          ['提升 CTR', (ctr * 100).toFixed(1) + '%', (ctr * 100 * 1.5).toFixed(1) + '%', money(cpm / 1000 / (ctr * 1.5) / cvr, '$'), ui.tag('中等', 'y')],
          ['提升客单价', '$' + aov, '$' + Math.round(aov * 1.25), money(cpa, '$') + '（不变）', ui.tag('结构性', 'b')]])) +
        ui.card('冷启动预算建议', ui.tbl(
          ['阶段', '日预算', '目的', '通过标准'],
          [['测素材', '$' + Math.round(bud * 0.3), '9 个角度各跑 3 天', 'CTR > 1.5%，完播 > 25%'],
          ['测落地页', '$' + Math.round(bud * 0.4), '同素材换页面', 'CVR > 1.8%'],
          ['放量', '$' + Math.round(bud), '赢家加预算', 'ROAS 稳定在保本线 1.3 倍以上'],
          ['收割', '$' + Math.round(bud * 0.6), '品牌词 + 再营销', 'CPA 低于新客 40%']])) +
        ui.card('优化动作清单', ui.ul([
          `落地页首屏与素材视觉一致（不一致会让 CVR 掉一半）`,
          `加购后 1 小时发弃单邮件，通常能捞回 8–12%`,
          `把「免运费门槛」设在客单价 ×1.4，直接拉 AOV`,
          `每 7 天换一次素材主图，CTR 衰减是必然的`,
          `否定词每周清一次，避免预算被无关流量吃掉`
        ]))
    };
  }
};

/* ============ 05-3 KOL 种草 ============ */
T.kol = {
  id: 'kol', step: 4, name: 'KOL 种草', sub: '达人分层 + 报价与 ROI 预估',
  desc: '按预算算出该找几个什么层级的达人，并预估曝光、点击与可能的订单。',
  inputs: [
    { k: 'budget', label: '达人总预算（美元）', type: 'num', ph: '2000', def: '2000' },
    { k: 'aov', label: '客单价（美元）', type: 'num', ph: '跟随项目价格' },
    { k: 'gm', label: '毛利率 %', type: 'num', ph: '55', def: '55' }
  ],
  out(v, ctx) {
    const bud = num(v.budget, 1000), aov = num(v.aov, 0) || C.price(ctx) || 30, gm = num(v.gm, 50) / 100;
    /* price 单价 / play 单条视频平均播放 / ctr 到链接点击率 / cvr 点击转化率 */
    const tiers = [
      { n: '头部（100 万+）', price: 2500, play: 600000, ctr: 0.015, cvr: 0.012 },
      { n: '腰部（10–100 万）', price: 600, play: 120000, ctr: 0.028, cvr: 0.016 },
      { n: '尾部（1–10 万）', price: 120, play: 18000, ctr: 0.040, cvr: 0.020 },
      { n: '素人（1 万以下）', price: 30, play: 3000, ctr: 0.050, cvr: 0.022 }
    ].map(t => {
      const cnt = Math.floor(bud / t.price);
      const imp = cnt * t.play;
      const clicks = imp * t.ctr;
      const orders = clicks * t.cvr;
      const rev = orders * aov;
      const cost = cnt * t.price;
      const profit = rev * gm - cost;
      return { ...t, cnt, imp, clicks, orders, rev, cost, profit, roi: cost ? (rev * gm) / cost : 0 };
    });
    /* 预算不够的层级不参与"最优"评选，否则会把 0 位可合作算成最优 */
    const usable = tiers.filter(t => t.cnt > 0);
    const best = (usable.length ? usable : tiers).sort((a, b) => b.profit - a.profit)[0];
    return {
      html:
        ui.big([
          { v: best.n, l: '最该投的层级', s: `预估净利 $${Math.round(best.profit)}` },
          { v: best.cnt + ' 位', l: '可合作数量', s: `单价 $${best.price}` },
          { v: best.roi ? best.roi.toFixed(2) : '—', l: '预估投产比', s: best.roi > 1.2 ? '正收益' : best.roi > 0.9 ? '接近打平' : '直接 ROAS 偏负' }
        ]) +
        ui.card('预算分配测算（真实反推）', ui.tbl(
          ['层级', '单价', '可合作', '预估曝光', '预估点击', '预估订单', '净利', '判断'],
          tiers.map(t => [t.n, '$' + t.price,
            t.cnt ? t.cnt + ' 位' : ui.tag('预算不足', 'n'),
            t.cnt ? Math.round(t.imp).toLocaleString() : '—',
            t.cnt ? Math.round(t.clicks).toLocaleString() : '—',
            t.cnt ? t.orders.toFixed(1) : '—',
            t.cnt ? (t.profit >= 0 ? '+' : '') + '$' + Math.round(t.profit) : '—',
            !t.cnt ? ui.tag('投不了', 'n') : t.roi > 1.5 ? ui.tag('优先', 'g') : t.roi > 0.9 ? ui.tag('可试', 'y') : ui.tag('慎投', 'r')]))) +
        ui.card('为什么尾部达人更划算', ui.ul([
          '头部单价高、互动率低（2% 左右），一条视频吃掉大半预算，且很难复制',
          '尾部/素人 CPIV（千次观看成本）通常只有头部的 1/5，且内容更真实',
          '正确做法是「大量尾部测内容 → 找到爆款脚本 → 找腰部放大」',
          `按当前预算 $${bud}，${best.n} 能合作 ${best.cnt} 位、覆盖 ${Math.round(best.imp).toLocaleString()} 次播放`,
          `重要：达人投放的直接 ROAS 通常只有 0.8–1.3，真正的回报来自「素材可二次投流 + 品牌词搜索增长」。用达人素材去跑付费，CPA 往往比原生素材低 30%`
        ])) +
        ui.card('筛选达人（硬指标，别只看粉丝数）', ui.tbl(
          ['指标', '及格线', '怎么看'],
          [['近 30 天更新', '≥ 8 条', '断更的不投'],
          ['平均播放/粉丝比', '> 0.3', '低于 0.1 说明数据注水'],
          ['互动率', '> 3%', '点赞+评论+分享 / 播放'],
          ['粉丝画像匹配', '> 60%', '让达人发后台截图'],
          ['带货记录', '有同类目', '没带过货的纯曝光号不要投'],
          ['评论质量', '有真实提问', '全是表情和 emoji 的是刷的']])) +
        ui.card('合作话术与条款（照发就行）', ui.ul([
          `开场：Hi [名字]，看到你 [具体某条视频] 讲 [具体点]，和我们产品想解决的问题很像`,
          `报价：先问「你最近同类目视频的报价和平均播放」，别先自报价格`,
          `必写条款：交付时间 / 是否可二次投流（很重要）/ 是否独家 / 修改次数`,
          `结算：30% 定金 + 70% 发布后 7 天，不要一次付清`,
          `追踪：给每个达人独立折扣码 + 独立 UTM 链接，否则无法归因`
        ]))
    };
  }
};

/* ============ 06-1 订单处理 ============ */
T.orderflow = {
  id: 'orderflow', step: 5, name: '订单处理', sub: '状态机 + 异常处理 SOP',
  desc: '把订单从下单到签收的每个状态列清楚，每个状态卡住时该做什么。',
  inputs: [
    { k: 'vol', label: '日均订单量', type: 'num', ph: '60', def: '60' },
    { k: 'type', label: '发货模式', type: 'select', opts: ['国内直发', '海外仓', '混合'], def: '混合' }
  ],
  out(v, ctx) {
    const vol = int(v.vol, 30);
    const states = [
      ['待付款', '未支付，15–30 分钟自动关闭', '发弃单提醒（邮件 + 短信）', '弃单率 60–70% 正常'],
      ['已付款待审', '风控审核 + 地址校验', '高风险订单人工确认', `${vol > 50 ? '建议自动审，只挑高风险人工' : '全部人工过一遍'}`],
      ['待发货', '拣货 → 打包 → 称重 → 出单', '超 48 小时未发要主动告知', '平台对发货时效有考核'],
      ['已发货', '上传单号 → 物流揽收', '打单后 24h 内必须有揽收记录', '无揽收会被判虚假发货'],
      ['运输中', '国际段 → 清关 → 末端派送', '异常件（超 7 天无更新）主动联系', '主动沟通能减少 70% 差评'],
      ['已签收', '签收后 3 天触发评价邀请', '邀请好评 + 使用指导', '这是拿评价的最佳时机'],
      ['售后中', '退 / 换 / 补发 / 退款', '24h 内首次响应', '超时会影响店铺评分'],
      ['已完成', '归档 + 进入复购池', '7 天后发复购券', '复购成本只有拉新的 1/5']
    ];
    return {
      html:
        ui.big([{ v: vol, l: '日均订单', s: v.type },
        { v: Math.ceil(vol * 0.02), l: '日均售后单', s: '按 2% 估算' },
        { v: Math.ceil(vol / 8), l: '需要人手', s: '每人每天约 8 单手工处理' }]) +
        ui.card('订单状态机与动作', ui.tbl(['状态', '含义', '必须做的动作', '备注'], states)) +
        ui.card('异常处理 SOP（按发生概率排序）', ui.tbl(
          ['异常', '概率', '处理动作', 'SLA'],
          [['地址不详 / 错误', '3–5%', '发货前联系确认，联系不上则暂缓', '24h'],
          ['物流超 7 天无更新', '2–4%', '主动发邮件说明 + 查件 + 承诺补发时间', '当天'],
          ['海关扣件', '1–2%', '提供清关资料或补税，无法解决则退款', '48h'],
          ['买家要求改地址', '1–3%', '未发货直接改；已发货引导自行联系承运商', '当天'],
          ['拒收 / 未取件', '1–2%', '退回后按政策退款（扣运费）', '退回后 3 天'],
          ['重复下单', '&lt; 1%', '主动合并或退一单，别等买家发现', '当天']])) +
        ui.card(`按 ${vol} 单/天 的配置建议`, ui.ul([
          vol < 20 ? '用平台后台 + Excel 够了，别急着上 ERP' : vol < 100 ? '上轻量 ERP（店小秘/马帮），打通打单与库存' : '必须上 ERP + 独立打单员，否则一定出错',
          v.type === '混合' ? '海外仓的订单走本地物流，直发的走专线，两套时效承诺要分开写在页面' : v.type === '海外仓' ? '本地仓时效承诺 2–5 天，这是转化优势，务必写进主图' : '直发时效 7–15 天，必须提前告知，否则差评集中在这里',
          `每天固定 2 个时间点集中处理订单（如 10:00 / 16:00），零散处理效率最低`,
          `所有异常件建一个表，记录单号/问题/处理人/结果，一周复盘一次`
        ]))
    };
  }
};

/* ============ 06-2 支付结算 ============ */
T.settle = {
  id: 'settle', step: 5, name: '支付结算', sub: '结算周期与资金周转测算',
  desc: '算清楚钱什么时候到、要垫多少，避免"有单没钱发"的现金流断裂。',
  inputs: [
    { k: 'day', label: '日均销售额（美元）', type: 'num', ph: '1500', def: '1500' },
    { k: 'cycle', label: '平台结算周期（天）', type: 'num', ph: '14', def: '14' },
    { k: 'cost', label: '货品成本占售价 %', type: 'num', ph: '35', def: '35' },
    { k: 'ad', label: '广告费占销售额 %', type: 'num', ph: '20' , def: '20' }
  ],
  out(v, ctx) {
    const day = num(v.day, 1000), cyc = num(v.cycle, 14), cost = num(v.cost, 35) / 100, ad = num(v.ad, 20) / 100;
    const pf = pfOf(ctx.platform);
    const month = day * 30;
    const cashIn = month * (1 - pf.fee / 100 - 0.032);
    const cashOut = month * (cost + ad) + month * 0.02;
    const gap = cyc * day;
    const net = cashIn - cashOut;
    const need = gap + month * (cost + ad) * 0.5;
    return {
      html:
        ui.big([
          { v: '$' + Math.round(gap).toLocaleString(), l: '在途资金（被平台压着）', s: `${cyc} 天结算周期` },
          { v: '$' + Math.round(need).toLocaleString(), l: '建议周转金', s: '覆盖 1 个周期 + 广告垫付' },
          { v: '$' + Math.round(net).toLocaleString(), l: '月净现金流', s: net > 0 ? '正向' : '负向，需警惕' }
        ]) +
        ui.card('月度现金流测算', ui.tbl(
          ['项目', '算法', '金额'],
          [['销售额', `${day} × 30`, '$' + Math.round(month).toLocaleString()],
          ['− 平台佣金', `${pf.fee}%`, '−$' + Math.round(month * pf.fee / 100).toLocaleString()],
          ['− 支付通道', '约 3.2%', '−$' + Math.round(month * 0.032).toLocaleString()],
          ['= 实收', '—', '$' + Math.round(cashIn).toLocaleString()],
          ['− 货品成本', `${(cost * 100).toFixed(0)}%`, '−$' + Math.round(month * cost).toLocaleString()],
          ['− 广告费', `${(ad * 100).toFixed(0)}%`, '−$' + Math.round(month * ad).toLocaleString()],
          ['− 物流杂费', '约 2%', '−$' + Math.round(month * 0.02).toLocaleString()],
          ['<b>净现金流</b>', '—', `<b>${net >= 0 ? '+' : ''}$${Math.round(net).toLocaleString()}</b>`]])) +
        ui.card('资金缺口预警', `
          <div class="verdict ${net > 0 ? 'good' : 'bad'}">
            <b>${net > 0 ? '现金流健康' : '现金流为负，规模越大越缺钱'}</b>
            · 净利率 ${(net / month * 100).toFixed(1)}%
          </div>
          ${ui.ul([
            `最危险的不是不赚钱，是「赚了但钱在平台里」。${cyc} 天周期意味着你永远有 $${Math.round(gap).toLocaleString()} 压在平台`,
            net > 0 ? `按当前模型，扩 1 倍规模需要额外备 ${'$' + Math.round(need).toLocaleString()} 周转金，不能只算利润不算现金` : `广告占比 ${(ad * 100).toFixed(0)}% 偏高，或毛利率不足，先想办法提价/降本，而不是加量`,
            `提现节奏：到账当天就提，别留在平台钱包（有平台冻结风险）`,
            `备选通道：PingPong / Airwallex / 万里汇 多开一个，主通道出问题时不至于断流`
          ])}`) +
        ui.card('加速回款的 4 个动作', ui.ol([
          `缩短结算周期：${ctx.platform === 'Amazon' ? '新店可申请加速结算，或使用 Amazon Lending' : '与支付通道谈 T+2，量大可以谈'}`,
          `预售/定金模式：新品先收定金，用客户的钱备货`,
          `账期谈判：和供应商谈 30 天账期，把压力转移给上游`,
          `控制广告垫付：广告费是即时支出，占销售额 20% 就意味着 20% 现金被前置消耗`
        ]))
    };
  }
};

/* ============ 06-3 风控控制 ============ */
T.risk = {
  id: 'risk', step: 5, name: '风控控制', sub: '风险清单 + 订单风险评分',
  desc: '列出跨境收款与账号的真实风险点，并给出一个可执行的订单风险打分规则。',
  inputs: [
    { k: 'dispute', label: '当前拒付率 %', type: 'num', ph: '0.4', def: '0.4' },
    { k: 'refund', label: '退款率 %', type: 'num', ph: '4', def: '4' },
    { k: 'aov', label: '客单价（美元）', type: 'num', ph: '跟随项目价格' }
  ],
  out(v, ctx) {
    const disp = num(v.dispute, 0.4), ref = num(v.refund, 4), aov = num(v.aov, 30);
    const score = (d) => d < 0.3 ? ['低', 'g'] : d < 0.7 ? ['中', 'y'] : ['高', 'r'];
    const [dl, dc] = score(disp);
    const rules = [
      ['同一 IP 短时间多单', 25, '限购或人工审核'],
      ['账单地址与收货地址国家不一致', 20, '邮件确认'],
      ['新账号首单且金额 > $200', 20, '人工电话确认'],
      ['同一收货地址关联多个账号', 15, '标记并限制'],
      ['使用免费邮箱 + 高风险国家', 10, '加强验证'],
      ['下单时间异常（当地凌晨）+ 大额', 10, '暂缓发货'],
      ['历史拒付客户再次下单', 30, '直接拒单']
    ];
    const total = rules.reduce((s, r) => s + r[1], 0);
    return {
      html:
        ui.big([
          { v: disp.toFixed(2) + '%', l: '拒付率', s: `风险等级：${dl}（>1% 会被冻结）` },
          { v: ref.toFixed(1) + '%', l: '退款率', s: ref < 8 ? '正常区间' : '偏高，需查原因' },
          { v: (disp * aov / 100).toFixed(3), l: '每单拒付成本', s: '拒付通常钱货两失' }
        ]) +
        ui.card('订单风险评分规则（可直接落地）', ui.tbl(
          ['风险特征', '加权分', '处理动作'],
          [...rules.map(r => [r[0], r[1], r[2]]), [`<b>合计</b>`, `<b>${total}</b>`, '≥ 40 分拒单；25–39 人工确认；< 25 直接放行']])) +
        ui.card('跨境收款的 6 个真实风险', ui.tbl(
          ['风险', '触发条件', '后果', '预防'],
          [['拒付（Chargeback）', '拒付率 > 1%', '通道罚款 $15–25/笔，严重直接关户', '留发货凭证 + 物流签收记录'],
          ['账号关联', '同一 IP/设备/收款账号操作多店', '全店封禁', '一店一 IP 一设备'],
          ['侵权投诉', '商标/专利/版权', 'listing 下架、资金冻结', '上架前查商标（USPTO）+ 专利'],
          ['产品合规', '缺认证（CE/FCC/FDA）', '海关扣货、平台下架', '按市场清单提前办证'],
          ['虚假发货', '上传单号后 24h 无揽收', '扣分、限制流量', '打单后当天交寄'],
          ['税务问题', 'VAT/销售税未申报', '补税 + 罚款 + 冻结', '用平台代扣或找税务代理']])) +
        ui.card('按当前数据该做什么', ui.ul([
          disp > 0.3 ? `⚠ 拒付率 ${disp}% 已偏高，立刻：所有 $${aov * 4} 以上订单加人工确认，并把发货凭证全部归档` : `拒付率 ${disp}% 在安全区，保持发货凭证归档即可`,
          ref > 8 ? `⚠ 退款率 ${ref}% 偏高，先看 Top 退款原因：是质量问题、描述不符还是物流太慢` : `退款率 ${ref}% 正常，保持即可`,
          '所有订单保留：下单截图、发货单号、揽收记录、签收记录，保留 180 天',
          '高风险国家/地区（按你的历史拒付数据）单独设置支付方式限制'
        ]))
    };
  }
};

/* ============ 06-4 自动通知 ============ */
T.notify = {
  id: 'notify', step: 5, name: '自动通知', sub: '邮件/短信模板（可直接用）',
  desc: '从下单到签收的关键节点通知文案，中英双语，复制即可配置到自动化工具。',
  inputs: [
    { k: 'brand', label: '品牌名', type: 'text', ph: 'VitaFresh' },
    { k: 'ship', label: '承诺时效（天）', type: 'num', ph: '7', def: '7' },
    { k: 'days', label: '退换货天数', type: 'num', ph: '30' , def: '30' }
  ],
  out(v, ctx) {
    const b = v.brand || 'Our Store', s = int(v.ship, 7), d = int(v.days, 30);
    const tpl = [
      ['下单确认', 'Order Confirmed', `Hi {name},\n\nThanks for your order #{order_no}! We're getting it ready.\n\n📦 What you ordered: {product}\n💰 Total: {total}\n🚚 Estimated delivery: ${s}–${s + 5} business days\n\nWe'll email you the tracking number as soon as it ships.\n\n— ${b} Team`],
      ['发货通知', 'Your Order Has Shipped', `Hi {name},\n\nGood news — order #{order_no} is on its way!\n\n🔗 Track here: {tracking_url}\n📮 Carrier: {carrier}\n📅 Estimated delivery: {eta}\n\nTip: You can track your package anytime with the link above.\n\n— ${b} Team`],
      ['物流异常', 'A Quick Update on Your Delivery', `Hi {name},\n\nWe noticed your package hasn't moved for a few days — we're on it.\n\nWe've contacted the carrier and expect an update within 48 hours. If nothing changes, we'll send a replacement at no cost.\n\nSorry for the wait — we'll keep you posted.\n\n— ${b} Team`],
      ['签收邀请评价', 'How\'s Your Order?', `Hi {name},\n\nYour package was delivered — hope you love it!\n\nIf you have 30 seconds, a quick review would mean a lot to us:\n{review_url}\n\nAny issue at all? Just reply to this email and we'll fix it.\n\n— ${b} Team`],
      ['弃单挽回', 'You Left Something Behind', `Hi {name},\n\nYour cart is still waiting: {product}\n\nHere's 10% off if you complete it today: {coupon}\n\nQuestions? Just reply — a real person will answer.\n\n— ${b} Team`],
      ['退款确认', 'Refund Processed', `Hi {name},\n\nYour refund for order #{order_no} has been processed.\n\n💰 Amount: {refund_total}\n⏱ It usually takes 5–10 business days to appear on your statement.\n\nWe'd love to know what went wrong so we can do better: {feedback_url}\n\n— ${b} Team`]
    ];
    return {
      html:
        ui.card('6 封关键邮件（英文，可直接用）',
          tpl.map(([cn, en, body]) => `
          <div class="posbox">
            <div class="pos-t">${cn} · <span style="color:#64748b">${en}</span></div>
            <pre class="mail">${esc(body)}</pre>
            <button class="mini" data-copy="${esc(body)}">复制</button>
          </div>`).join('')) +
        ui.card('发送时机（错过后效果减半）', ui.tbl(
          ['邮件', '触发条件', '最佳发送时间'],
          [['下单确认', '支付成功', '立即（5 分钟内）'],
          ['发货通知', '上传单号后', '揽收后 2 小时内'],
          ['物流异常', '7 天无物流更新', '发现当天'],
          ['签收邀评', '签收后', '签收后 2–3 天（不要太早）'],
          ['弃单挽回', '加购未支付', '第 1 封 1 小时后，第 2 封 24 小时后'],
          ['退款确认', '退款发起', '立即']])) +
        ui.card('配置到工具里', ui.ul([
          'Shopify：Klaviyo（免费 500 联系人）→ Flows 里建这 6 条',
          'Amazon：只能用平台模板，但这几段文案可改造后放进买家消息',
          'TikTok Shop：用「自动回复 + 订单消息」实现前 3 条',
          `退换货天数 ${d} 天要写进邮件与详情页，否则争议时平台按买家说法判`,
          '所有邮件加一个「回复即转人工」的通道，能挽回大量差评'
        ]))
    };
  }
};

/* ============ 07-1 发货通知 ============ */
T.ship = {
  id: 'ship', step: 6, name: '发货通知', sub: '时效承诺与通知节奏',
  desc: '按发货模式给出真实时效区间、通知节点与超时补救话术。',
  inputs: [
    { k: 'mode', label: '发货模式', type: 'select', opts: ['国内直发（专线）', '海外仓本地发', '经济小包'], def: '国内直发（专线）' },
    { k: 'wk', label: '每周发货批次', type: 'num', ph: '5' , def: '5' }
  ],
  out(v, ctx) {
    const m = mkOf(ctx.market);
    const mode = v.mode;
    const plan = m.ship;
    const chosen = mode.startsWith('海外仓') ? plan[0] : mode.startsWith('经济') ? plan[2] : plan[1];
    const [name, fast, slow, cost] = chosen;
    const wk = int(v.wk, 5);
    return {
      html:
        ui.big([{ v: fast + '–' + slow + ' 天', l: '承诺时效', s: name },
        { v: '$' + cost, l: '单件物流成本', s: '估' },
        { v: '48h', l: '发货时效', s: `每周 ${wk} 批` }]) +
        ui.card(`${ctx.market} 物流方案对比`, ui.tbl(
          ['方案', '时效', '单件成本', '适用'],
          plan.map(p => [`<b>${p[0]}</b>`, `${p[1]}–${p[2]} 天`, '$' + p[3], p[1] <= 4 ? '高客单、要好评' : p[1] <= 12 ? '主力方案' : '低客单、能等'])) +
          ui.note(`当前选择：<b>${name}</b>，建议在页面写「${fast}–${slow} 天送达」，实际按 ${slow + 3} 天做心理预期管理。`)) +
        ui.card('通知节点（每个节点都要有动作）', ui.tbl(
          ['节点', '时间', '通知内容', '渠道'],
          [['订单确认', '下单后 5 分钟内', '订单号 + 预计发货时间', '邮件'],
          ['已发货', '揽收后 2 小时内', '运单号 + 追踪链接', '邮件 + 短信'],
          ['离港/清关中', '发货后 3–5 天', '进度说明（可选，降低咨询）', '邮件'],
          ['派送中', '到达目的国后', '预计送达日', '短信'],
          ['签收', '签收当天', '使用指导 + 邀评', '邮件'],
          ['异常预警', '超 7 天无更新', '主动说明 + 解决方案', '邮件 + 人工']])) +
        ui.card('超时补救话术（直接用）', `
          <div class="posbox"><div class="pos-t">超过承诺时效 3 天</div>
          <pre class="mail">Hi {name},

I'm sorry — your order #{order_no} is taking longer than we promised.
I've checked with the carrier: {status}. New estimated delivery: {new_eta}.

If it doesn't arrive by then, I'll send a replacement or a full refund — your choice.

— ${'{your_name}'}</pre></div>
          <div class="posbox"><div class="pos-t">超过承诺时效 7 天（主动）</div>
          <pre class="mail">Hi {name},

Your package has been stuck in transit for over a week, which isn't the experience we want you to have.

I've already: 1) filed a trace with the carrier, 2) reserved a replacement unit for you.

Reply "resend" and I'll ship a new one today at no cost. Or if you'd rather, I can refund you in full right away.

— ${'{your_name}'}</pre></div>`) +
        ui.card('降本与提效', ui.ul([
          `每周 ${wk} 批集中发货，比每天零散发便宜 10–15%（批量议价）`,
          `包裹重量控制：${ctx.category && /家电|数码/.test(ctx.category) ? '把说明书从纸质改二维码，单件省 20–40g' : '去掉多余内衬，按克计费的时代每 10g 都是钱'}`,
          `时效承诺写宽 3 天，实际发得快，好评率会明显上升`,
          `旺季前 30 天锁舱位，否则涨价 30% 还没位置`
        ]))
    };
  }
};

/* ============ 07-2 物流追踪 ============ */
T.trk = {
  id: 'trk', step: 6, name: '物流追踪', sub: '追踪工具 + 异常判定规则',
  desc: '给出追踪工具组合与「什么算异常、异常后怎么处理」的判定表。',
  inputs: [
    { k: 'days', label: '当前平均在途天数', type: 'num', ph: '11', def: '11' },
    { k: 'lost', label: '丢件率 %', type: 'num', ph: '1.5' , def: '1.5' }
  ],
  out(v, ctx) {
    const days = num(v.days, 10), lost = num(v.lost, 1.5);
    const tools = [
      ['17TRACK', '全球 3000+ 承运商聚合查询', '免费额度够用，适合自查'],
      ['AfterShip', '自动推送 + 品牌化追踪页', '$11/月起，降低「我的包裹在哪」咨询'],
      ['平台自带', 'Amazon/TikTok 后台追踪', '免费，但体验一般'],
      ['店小秘 / 马帮', 'ERP 内置批量追踪', '订单量大时必需'],
      ['承运商官网', '最准但最慢', '处理争议时的最终依据']
    ];
    return {
      html:
        ui.big([{ v: days + ' 天', l: '平均在途', s: days > 14 ? '偏慢，易差评' : '正常' },
        { v: lost + '%', l: '丢件率', s: lost > 2 ? '偏高，需换承运商' : '可控' },
        { v: (lost / 100 * 35).toFixed(2) + '%', l: '丢件成本占比', s: '按客单 $35 估' }]) +
        ui.card('追踪工具怎么选', ui.tbl(['工具', '能力', '点评'], tools)) +
        ui.card('异常判定规则（写进 SOP）', ui.tbl(
          ['现象', '判定', '动作', '补偿'],
          [['发货后 5 天无揽收记录', '疑似虚假发货', '立刻联系承运商 + 换单号', '主动告知买家'],
          ['7 天物流无更新', '运输停滞', '开查件工单', '说明 + 承诺新 ETA'],
          ['15 天无更新', '疑似丢件', '补发或退款（二选一让买家定）', '全额补发，运费自担'],
          ['显示已签收但买家说没收到', '派送争议', '让承运商提供签收证明（POD）', '无 POD 则补发'],
          ['清关卡住 > 5 天', '清关异常', '补齐资料或补税', '必要时退款止损'],
          ['多次派送失败退回', '地址问题', '退回后联系改地址重发', '扣一次运费']])) +
        ui.card('降低「包裹在哪」咨询的 4 招', ui.ol([
          '详情页放一张「物流时间轴」图，把每个阶段画出来，咨询量能降 40%',
          '发货邮件里放品牌化追踪页（AfterShip），不要只给承运商裸链接',
          '主动推送：异常件系统自动发邮件，比买家来问好得多',
          `按当前 ${days} 天在途，页面写「${days + 3}–${days + 7} 天送达」，管理预期`
        ])) +
        ui.card('该不该换承运商', ui.ul([
          lost > 2 ? `⚠ 丢件率 ${lost}% 偏高，建议用 20% 单量切到备选渠道做 A/B，比较时效与破损` : `丢件率 ${lost}% 在可接受范围`,
          days > 14 ? '⚠ 在途超 14 天，考虑改海外仓前置（成本 +$2/件，但差评率能降一半）' : '当前时效可接受',
          '永远保留 2 家承运商，旺季一家爆仓时不至于断'
        ]))
    };
  }
};

/* ============ 07-3 自动回复 ============ */
T.faq = {
  id: 'faq', step: 6, name: '自动回复', sub: 'FAQ 库 + 客服话术',
  desc: '按品类生成真实会被问到的问题与标准答案，可直接导入客服工具。',
  inputs: [
    { k: 'ship', label: '承诺时效（天）', type: 'num', ph: '7', def: '7' },
    { k: 'ret', label: '退货天数', type: 'num', ph: '30', def: '30' },
    { k: 'warr', label: '质保月数', type: 'num', ph: '12' , def: '12' }
  ],
  out(v, ctx) {
    const s = int(v.ship, 7), r = int(v.ret, 30), w = int(v.warr, 12);
    const cat = catOf(ctx.category);
    const prod = C.prod(ctx);
    const qa = [
      ['How long does shipping take?', `Orders ship within 48 hours. Delivery usually takes ${s}–${s + 5} business days. You'll get a tracking link by email as soon as it ships.`],
      ['Do you ship to my country?', `We currently ship to the US, EU, UK, Canada, Australia, and Japan. If your country isn't listed at checkout, we can't ship there yet.`],
      ['Can I return it?', `Yes — you have ${r} days from delivery. Just email us with your order number and we'll send a return label. Items should be unused and in original packaging.`],
      ['Is there a warranty?', `Every ${prod} comes with a ${w}-month warranty. If anything goes wrong that isn't accidental damage, we'll replace it.`],
      ['How do I clean it?', `Rinse with warm water and a drop of dish soap. No need to take it apart. Don't submerge the charging port.`],
      ['Is it safe for daily use?', `Yes. The materials are food-grade and BPA-free. It's designed for daily use — we've tested it for ${w} months of continuous use.`],
      ['My item arrived damaged — what now?', `Sorry about that! Send us a photo within 7 days and we'll ship a replacement immediately — no need to return the damaged one.`],
      ['Can I change my address?', `If your order hasn't shipped, yes — just reply with the new address. If it's already in transit, we'll help you contact the carrier.`],
      ['Do you offer bulk / wholesale pricing?', `Yes, for 20+ units. Email us with the quantity and we'll send a quote within 24 hours.`],
      ['Where is my order?', `You can track it here: {tracking_url}. If it hasn't updated in 7 days, reply to this email and we'll look into it right away.`]
    ];
    const pains = cat.pain.map(p => [p, 
      { '清洗麻烦': '冲水 10 秒就好，不用拆刀头。', '续航短': '单次充满可用 15–20 次，充电约 2 小时。', '打不碎冰块': '可以打冰块，建议先加少量液体。', '漏水': '杯盖有硅胶密封圈，拧紧后倒置不漏。' }[p] || '详情页有完整说明，也可以直接问我们。']);
    return {
      html:
        ui.card('英文 FAQ（10 条，可直接导入 Zendesk / Gorgias）',
          qa.map(([q, a]) => `<div class="posbox"><div class="pos-t">${esc(q)}</div><div class="pos-s">${esc(a)}</div><button class="mini" data-copy="${esc(a)}">复制</button></div>`).join('')) +
        ui.card('针对本品类的高频问题（必须前置到详情页）', ui.tbl(
          ['用户顾虑', '页面/客服标准答复'],
          pains.map(p => [esc(p[0]), p[1]]))) +
        ui.card('客服响应标准（写进考核）', ui.tbl(
          ['场景', '首响时效', '解决时效'],
          [['售前咨询', '2 小时内', '当天'],
          ['物流查询', '4 小时内', '24 小时内给明确答复'],
          ['质量问题', '2 小时内', '48 小时内出方案（补发/退款）'],
          ['退款申请', '24 小时内', '48 小时内完成'],
          ['差评/投诉', '1 小时内', '当天私信沟通']])) +
        ui.card('3 句话让差评变好评', ui.ul([
          '第一句先认：「这是我们的问题」——不要先解释原因',
          '第二句给选择：「补发 / 退款 / 换货，你选」——把控制权交回去',
          '第三句留退路：「不用退货，东西留着」——成本最低，口碑最好',
          `质保 ${w} 个月要写进页面，成本远低于它带来的转化提升`
        ]))
    };
  }
};

/* ============ 07-4 售后处理 ============ */
T.aftersale = {
  id: 'aftersale', step: 6, name: '售后处理', sub: '退换货政策 + 处理流程',
  desc: '生成一份能直接放到店铺的政策文本，以及每种售后情形的处理成本与决策。',
  inputs: [
    { k: 'aov', label: '客单价（美元）', type: 'num', ph: '跟随项目价格' },
    { k: 'ret', label: '退货天数', type: 'num', ph: '30', def: '30' },
    { k: 'rate', label: '当前退货率 %', type: 'num', ph: '6' , def: '6' }
  ],
  out(v, ctx) {
    const aov = num(v.aov, 30), r = int(v.ret, 30), rate = num(v.rate, 6);
    const policy = `RETURN & REFUND POLICY

We want you to be happy with your purchase. If you're not, here's how it works:

• ${r}-DAY RETURNS — You have ${r} days from delivery to request a return.
• CONDITION — Items should be unused and in original packaging. Opened items are fine if there's a defect.
• DEFECTIVE ITEMS — Send us a photo within 7 days. We'll ship a replacement at no cost. No need to return the damaged item.
• REFUNDS — Processed within 3 business days of receiving the return. Back to your original payment method in 5–10 business days.
• WHO PAYS SHIPPING — We cover return shipping for defective or wrong items. For change-of-mind returns, the buyer covers it.
• HOW TO START — Email {support_email} with your order number and a brief description.

Questions? Reply to any of our emails — a real person answers within 24 hours.`;
    const cases = [
      ['质量问题', '补发（不退货）', aov * 0.35, '口碑最好，成本可控'],
      ['发错货', '补发 + 原货自留', aov * 0.75, '对方错了就大方点'],
      ['描述不符', '部分退款 30–50%', aov * 0.4, '避免来回运费'],
      ['买家不想要了', '退货退款（买家付运费）', aov * 0.1, '标准流程'],
      ['物流太慢', '给券（$5–10）+ 说明', 7, '比退款便宜得多'],
      ['已签收说没收到', '要 POD，无则补发', aov * 0.6, '平台通常偏向买家']
    ];
    const cost = rate / 100 * aov * 0.4;
    return {
      html:
        ui.big([{ v: rate + '%', l: '当前退货率', s: rate < 8 ? '正常' : '偏高' },
        { v: '$' + cost.toFixed(2), l: '每单售后成本', s: '退货率 × 客单价 × 40%' },
        { v: '$' + (cost * 1000).toFixed(0), l: '每千单成本', s: '这部分必须算进定价' }]) +
        ui.card('可直接放到店铺的政策文本', `<pre class="mail">${esc(policy)}</pre><button class="mini" data-copy="${esc(policy)}">复制政策</button>`) +
        ui.card('六种售后情形的处理决策', ui.tbl(
          ['情形', '处理方式', '单次成本', '为什么'],
          cases.map(c => [c[0], c[1], '$' + Math.round(c[2] * 100) / 100, c[3]]))) +
        ui.card('处理流程（照着走，别现场想）', ui.ol([
          '买家提出 → 2 小时内首响，先说「抱歉，我来处理」',
          '判断情形 → 对照上表，直接给方案（不要问「你想怎样」，会让对话变长）',
          '给两个选项 → 「补发」或「退款」，让买家有控制感',
          '执行 → 补发单号/退款截图发给买家，主动同步',
          '跟进 → 3 天后回访是否收到，这一句能挽回评价',
          '复盘 → 每月统计 Top 3 售后原因，回到产品与页面去改'
        ])) +
        ui.card(`把退货率从 ${rate}% 降下来的 4 个动作`, ui.ul([
          '详情页写清「不适合谁」——预期差是退货最大来源',
          '主图加尺寸参照物（手持 / 对比常见物品）',
          '发货前拍照留证（低客单不必，高客单必做）',
          `把 ${r} 天退货政策写进主图第 5 张，能提升转化 5–8%（降低下单顾虑）`
        ]))
    };
  }
};

/* ============ 08-1 数据分析 ============ */
T.metrics = {
  id: 'metrics', step: 7, name: '数据分析', sub: '漏斗计算器 + 看板指标',
  desc: '按真实流量数据算出每一层转化率，定位到底哪一层在漏钱。',
  inputs: [
    { k: 'imp', label: '曝光 / 展现', type: 'num', ph: '120000', def: '120000' },
    { k: 'click', label: '点击', type: 'num', ph: '3200', def: '3200' },
    { k: 'visit', label: '商品页访问（UV）', type: 'num', ph: '2600', def: '2600' },
    { k: 'cart', label: '加购', type: 'num', ph: '320', def: '320' },
    { k: 'order', label: '订单', type: 'num', ph: '62', def: '62' },
    { k: 'aov', label: '客单价（美元）', type: 'num', ph: '跟随项目价格' }
  ],
  out(v, ctx) {
    const imp = num(v.imp, 0), clk = num(v.click, 0), uv = num(v.visit, 0), cart = num(v.cart, 0), ord = num(v.order, 0), aov = num(v.aov, 0);
    if (!imp || !clk) return { html: ui.note('填入曝光与点击后开始计算漏斗。') };
    const st = [
      ['曝光 → 点击', clk / imp, 0.003, '主图 + 标题 + 价格'],
      ['点击 → 访问', uv / clk, 0.85, '页面加载速度'],
      ['访问 → 加购', cart / uv, 0.08, '详情页说服力'],
      ['加购 → 下单', ord / cart, 0.25, '价格 + 运费 + 信任'],
      ['访问 → 下单', ord / uv, 0.02, '整体转化']
    ].map(([n, val, bench, lever]) => ({ n, val, bench, lever, ok: val >= bench * 0.8 }));
    const worst = [...st].filter(s => s.n !== '整体转化').sort((a, b) => (a.val / a.bench) - (b.val / b.bench))[0];
    const rev = ord * aov;
    return {
      html:
        ui.big([{ v: pct(ord / uv), l: '整体转化率', s: '访问 → 下单' },
        { v: '$' + Math.round(rev).toLocaleString(), l: '预估营收', s: `${ord} 单 × $${aov}` },
        { v: worst.n, l: '最大漏点', s: `仅为基准的 ${Math.round(worst.val / worst.bench * 100)}%` }]) +
        ui.card('漏斗逐层诊断', st.map(s => {
          const ratio = s.val / s.bench;
          return `<div class="funnel">
            <div class="fn-l">${s.n}</div>
            <div class="fn-bar"><i class="${ratio >= 0.8 ? 'g' : ratio >= 0.5 ? 'y' : 'r'}" style="width:${clamp(ratio * 60, 4, 100)}%"></i></div>
            <div class="fn-v">${pct(s.val)}<span>基准 ${pct(s.bench)}</span></div>
            <div class="fn-t">${ratio >= 1 ? ui.tag('优秀', 'g') : ratio >= 0.8 ? ui.tag('正常', 'g') : ratio >= 0.5 ? ui.tag('偏低', 'y') : ui.tag('严重漏', 'r')}</div>
          </div>`;
        }).join('')) +
        ui.card('先改这个：' + worst.n, `
          <div class="verdict bad"><b>${worst.n} 只有 ${pct(worst.val)}，基准 ${pct(worst.bench)}</b> · 这一层决定你 80% 的增长空间</div>
          ${ui.ul([
            `影响这一层的因素：<b>${worst.lever}</b>`,
            `如果把它拉到基准，订单会从 ${ord} 变成 ${Math.round(ord / (worst.val / worst.bench))} 单，多赚 $${Math.round((ord / (worst.val / worst.bench) - ord) * aov).toLocaleString()}`,
            `改法优先做「不用花钱」的：改主图/改页面文案 > 调价格 > 加广告预算`
          ])}`) +
        ui.card('该建的看板字段', ui.tbl(
          ['层级', '指标', '看多久', '异常阈值'],
          [['流量', '曝光 / 点击率 / CPC', '每天', 'CTR < 0.3%'],
          ['内容', '完播率 / 互动率', '每条', '完播 < 20%'],
          ['页面', '访问→加购率 / 停留时长', '每周', '加购 < 5%'],
          ['成交', '转化率 / AOV / 弃单率', '每天', 'CVR < 1.5%'],
          ['利润', '毛利率 / ROAS / ACOS', '每周', 'ROAS < 保本线'],
          ['留存', '复购率 / 退货率', '每月', '复购 < 10%']]))
    };
  }
};

/* ============ 08-2 广告复盘 ============ */
T.adsreview = {
  id: 'adsreview', step: 7, name: '广告复盘', sub: 'ROAS 诊断与止损判断',
  desc: '输入一组真实投放数据，判断问题出在素材、页面还是定价，并给出具体动作。',
  inputs: [
    { k: 'spend', label: '花费（美元）', type: 'num', ph: '800', def: '800' },
    { k: 'rev', label: '广告带来的营收（美元）', type: 'num', ph: '1600', def: '1600' },
    { k: 'orders', label: '订单数', type: 'num', ph: '45', def: '45' },
    { k: 'gm', label: '毛利率 %', type: 'num', ph: '55' },
    { k: 'imp', label: '曝光', type: 'num', ph: '60000', def: '60000' },
    { k: 'clicks', label: '点击', type: 'num', ph: '900' , def: '900' }
  ],
  out(v, ctx) {
    const spend = num(v.spend, 0), rev = num(v.rev, 0), ord = num(v.orders, 0), gm = num(v.gm, 50) / 100;
    const imp = num(v.imp, 0), clk = num(v.clicks, 0);
    if (!spend) return { html: ui.note('填入花费与营收后开始诊断。') };
    const roas = rev / spend, ctr = imp ? clk / imp : 0, cpc = clk ? spend / clk : 0, cpa = ord ? spend / ord : 0;
    const aov = ord ? rev / ord : 0, cvr = clk ? ord / clk : 0;
    const breakROAS = 1 / gm;
    const profit = rev * gm - spend;
    const diag = [];
    if (ctr < 0.01) diag.push(['素材点击率低', `CTR ${pct(ctr)} < 1%`, '主图/钩子不行，换素材角度', '换 3 个开头重测，别看价格']);
    if (cvr < 0.015 && ctr >= 0.01) diag.push(['页面转化差', `CVR ${pct(cvr)} < 1.5%`, '点击进来了但没买', '改首屏、加评价、降运费门槛']);
    if (roas < breakROAS) diag.push(['整体亏损', `ROAS ${roas.toFixed(2)} < 保本 ${breakROAS.toFixed(2)}`, '每花 1 元亏 ' + (1 - roas * gm).toFixed(2) + ' 元', '先降低预算，再修 CVR']);
    if (aov < 20) diag.push(['客单价偏低', 'AOV $' + aov.toFixed(0), '毛利撑不住获客成本', '做套装 / 免运费门槛']);
    if (!diag.length) diag.push(['健康', '各项指标在合理区间', '可以放量', '每天加 20% 预算，别翻倍']);
    return {
      html:
        ui.big([
          { v: roas.toFixed(2), l: 'ROAS', s: `保本线 ${breakROAS.toFixed(2)}` },
          { v: (profit >= 0 ? '+' : '') + '$' + Math.round(profit), l: '广告利润', s: '营收 × 毛利 − 花费' },
          { v: pct(ctr), l: 'CTR', s: clk + ' / ' + imp },
          { v: '$' + cpa.toFixed(2), l: 'CPA', s: `客单 $${aov.toFixed(0)}` }
        ]) +
        ui.card('诊断结论', `
          <div class="verdict ${roas >= breakROAS ? 'good' : 'bad'}">
            <b>${roas >= breakROAS ? '这组广告在赚钱' : '这组广告在亏钱'}</b> · ROAS ${roas.toFixed(2)} vs 保本 ${breakROAS.toFixed(2)}
          </div>
          ${ui.tbl(['问题', '数据', '说明', '动作'], diag.map(d => [`<b>${d[0]}</b>`, d[1], d[2], d[3]]))}`) +
        ui.card('完整指标', ui.kv([
          ['花费', '$' + spend], ['营收', '$' + rev], ['订单', ord + ' 单'],
          ['客单价 AOV', '$' + aov.toFixed(2)], ['CPC', '$' + cpc.toFixed(2)], ['CVR（点击→订单）', pct(cvr)],
          ['毛利率', (gm * 100).toFixed(0) + '%'], ['毛利额', '$' + Math.round(rev * gm)],
          ['净利润', (profit >= 0 ? '+' : '') + '$' + Math.round(profit)]
        ])) +
        ui.card('三条决策路径', ui.tbl(
          ['情况', '判断', '动作'],
          [['ROAS > 保本 1.3 倍', '健康', '每天加 20% 预算，扩相似人群'],
          ['保本 ~ 1.3 倍', '临界', '不加预算，先优化 CVR 与 AOV'],
          ['&lt; 保本', '亏损', '降预算至 30%，集中修素材与页面，7 天后再看']])) +
        ui.card('复盘节奏（别每天看数据就改）', ui.ul([
          '素材层：每 3 天看一次 CTR（当天数据噪声大）',
          '页面层：每 7 天看一次 CVR（样本要够 100 次点击）',
          '账户层：每 14 天做一次结构性调整（预算/受众/出价）',
          '任何一次修改后，至少等 3 天再判断效果，否则会反复推翻自己'
        ]))
    };
  }
};

/* ============ 08-3 用户分层 ============ */
T.rfm = {
  id: 'rfm', step: 7, name: '用户分层', sub: 'RFM 分层与运营策略',
  desc: '按最近购买、购买频次、消费金额把用户分成 8 类，每类给不同动作。',
  inputs: [
    { k: 'total', label: '总客户数', type: 'num', ph: '1200', def: '1200' },
    { k: 'rep', label: '复购率 %', type: 'num', ph: '18', def: '18' },
    { k: 'aov', label: '客单价（美元）', type: 'num', ph: '跟随项目价格' }
  ],
  out(v, ctx) {
    const total = int(v.total, 500), rep = num(v.rep, 15) / 100, aov = num(v.aov, 30);
    const segs = [
      ['重要价值客户', 0.08, '最近买 + 买得多 + 花得多', 'VIP 专属折扣 + 新品优先体验', 'g'],
      ['重要唤回客户', 0.12, '以前买得多，最近没来', '大额唤醒券 + 一对一关怀', 'y'],
      ['重要发展客户', 0.10, '最近在买，但频次低', '引导买第二件（套装/加购）', 'g'],
      ['重要挽留客户', 0.10, '曾经高价值，正在流失', '深度问卷 + 强力度挽回', 'r'],
      ['一般价值客户', 0.20, '最近买，金额一般', '提升客单价（满减/凑单）', 'b'],
      ['一般保持客户', 0.15, '偶尔买，金额一般', '内容种草 + 定期触达', 'b'],
      ['新客户', 0.15, '刚买过一次', '欢迎序列 + 使用指导', 'g'],
      ['流失客户', 0.10, '很久没买，金额低', '低成本召回或直接放弃', 'n']
    ];
    return {
      html:
        ui.big([{ v: total, l: '客户总数', s: '按 RFM 分层' },
        { v: pct(rep), l: '复购率', s: rep > 0.25 ? '优秀' : rep > 0.15 ? '一般' : '偏低' },
        { v: '$' + Math.round(aov * (1 + rep * 2)).toLocaleString(), l: '客户 LTV（估）', s: '客单 × (1 + 2×复购)' }]) +
        ui.card('RFM 八分层与动作', ui.tbl(
          ['分层', '占客户数', '人数', '特征', '运营动作'],
          segs.map(s => [`<span class="dotc dotc-${s[4]}"></span><b>${s[0]}</b>`, pct(s[1]), Math.round(total * s[1]), s[2], s[3]]))) +
        ui.card('分层规则（用真实数据算，别凭感觉）', ui.kv([
          ['R（Recency）', '最近一次购买距今天数：≤30 天 / 31–90 / 91–180 / >180'],
          ['F（Frequency）', '累计订单数：1 / 2–3 / 4–6 / 7+'],
          ['M（Monetary）', '累计消费额：< 1×AOV / 1–3× / 3–6× / 6×+'],
          ['怎么打分', '三个维度各给 1–4 分，组合成 64 格，再归并为上面的 8 类'],
          ['工具', 'Excel 透视表就能做；Shopify 用 Segments；Amazon 只能用「品牌分析」看大致']
        ])) +
        ui.card(`把复购率从 ${(rep * 100).toFixed(0)}% 提上去`, ui.ol([
          `第 ${ctx.category && /美妆|个护/.test(ctx.category) ? '30' : '45'} 天：发「该补货了」提醒 + 8 折复购券（消耗品最有效）`,
          '第 7 天：使用指导邮件 + 「怎么用效果最好」短视频，降低闲置',
          '第 90 天：邀请进会员/社群，给专属价，把关系从交易变成关系',
          '设置阶梯：买 2 次升银卡 95 折，买 4 次升金卡 9 折 + 免运费',
          `按当前数据，复购率每提升 5%，LTV 提升约 $${Math.round(aov * 0.1)}`
        ])) +
        ui.card('该放弃的客户', ui.note('流失客户里，历史订单数 ≤ 1 且金额低于客单价的，不要花钱召回——获客成本永远高于他们能带来的价值。把预算放在「重要唤回」这一层，ROI 最高。'))
    };
  }
};

/* ============ 08-4 自动化运营 ============ */
T.auto = {
  id: 'auto', step: 7, name: '自动化运营', sub: '可落地的 8 条自动化流程',
  desc: '列出真的能自动跑的流程，每条给触发条件、动作和工具，按省时多少排序。',
  inputs: [
    { k: 'plat', label: '主平台', type: 'select', opts: ['Shopify 独立站', 'Amazon', 'TikTok Shop'], def: 'Shopify 独立站' },
    { k: 'hr', label: '每周可省出的目标工时', type: 'num', ph: '10' , def: '10' }
  ],
  out(v, ctx) {
    const flows = [
      ['弃单挽回', '加购后 1 小时未支付', '邮件 + 短信，第 2 封加 10% 券', 'Klaviyo', 3, '能捞回 8–12% 弃单'],
      ['欢迎序列', '新客首单', '5 封邮件：品牌故事 → 使用指导 → 评价邀请 → 复购券 → 社群', 'Klaviyo', 2, '把首单客户变成复购'],
      ['物流异常预警', '7 天无物流更新', '自动发说明邮件 + 建人工工单', 'AfterShip + Zapier', 2, '减少 70% 催单咨询'],
      ['好评邀请', '签收后 3 天', '自动邮件 + 一键评价链接', 'Judge.me / Loox', 1.5, '评价量提升 3 倍'],
      ['库存预警', '库存 < 30 天销量', '飞书/企微机器人提醒 + 自动生成采购单', 'ERP + 飞书', 1.5, '避免断货掉排名'],
      ['差评监控', '出现 ≤3 星评价', '立即推送 + 生成回复草稿', 'Zapier + ChatGPT', 1, '2 小时内响应，挽回率最高'],
      ['广告异常', 'ROAS 连续 3 天 < 保本', '自动降预算 50% 并告警', '平台规则 / 第三方工具', 1, '止血，避免持续亏损'],
      ['周报自动生成', '每周一 9:00', '拉取各平台数据，生成对比周报', 'GA4 + Sheets + GPT', 2, '省掉手工做表']
    ];
    const save = flows.reduce((s, f) => s + f[4], 0);
    return {
      html:
        ui.big([{ v: flows.length + ' 条', l: '可自动化流程', s: '按优先级排序' },
        { v: save.toFixed(1) + ' 小时', l: '每周可省', s: `目标 ${num(v.hr, 10)} 小时` },
        { v: save >= num(v.hr, 10) ? '可达标' : '需加流程', l: '目标完成度', s: save >= num(v.hr, 10) ? '先做前 4 条' : '再加 2 条或降目标' }]) +
        ui.card('自动化清单（按 ROI 排序）', ui.tbl(
          ['流程', '触发条件', '动作', '工具', '省时/周', '价值'],
          flows.map(f => [`<b>${f[0]}</b>`, f[1], f[2], f[3], f[4] + 'h', `<span class="fx">${f[5]}</span>`]))) +
        ui.card(`在 ${v.plat} 上怎么落地`, ui.ol(
          v.plat === 'Shopify 独立站' ? [
            '第 1 天：装 Klaviyo，建「弃单 + 欢迎序列」两条 Flow（模板都有，改文案即可）',
            '第 2 天：装 Judge.me，设置签收后 3 天自动邀评',
            '第 3 天：Zapier 接 AfterShip，异常件自动建工单到飞书',
            '第 4 天：Sheets + GA4 做周报自动生成（用 Zapier 每天拉数）',
            '第 5 天：把「差评监控」接上，用 GPT 生成回复草稿人工过一遍再发'
          ] : v.plat === 'Amazon' ? [
            'Amazon 后台能力有限，能自动化的主要是：自动定价、库存提醒、广告规则',
            '第 1 天：开「自动定价」+ 设价格上下限（别让它把价格打到亏本）',
            '第 2 天：广告设规则：ACOS > 40% 自动降价 20%，ACOS < 15% 自动加价',
            '第 3 天：用第三方工具（如 SellerBoard）做利润与库存监控',
            '第 4 天：买家消息模板化，常见问题做成快捷回复',
            '第 5 天：把站外（邮件/社媒）的自动化用 Klaviyo 做，把流量导回 Amazon'
          ] : [
            '第 1 天：TikTok Shop 后台设「自动回复 + 订单消息」',
            '第 2 天：达人邀约自动化（批量私信模板 + 佣金阶梯）',
            '第 3 天：用第三方工具做达人 GMV 追踪',
            '第 4 天：素材自动归档：命名规则 + 云盘文件夹自动同步',
            '第 5 天：订单异常（未发货/超时）自动提醒到企微'
          ])) +
        ui.card('不要自动化的三件事', ui.ul([
          '客服首响不要全自动：买家能感觉出来，先自动确认，再人工跟进',
          '定价不要全权交给算法：设好上下限，否则会被打到亏本',
          '内容不要全用 AI 批量生成：平台会降权，人也看得出来'
        ]))
    };
  }
};
