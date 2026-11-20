/* =========================================================
   core.js — 知识库 + 真实计算 / 校验 / 生成 基础能力
   ========================================================= */

/* ---------- 市场库 ---------- */
const MK = {
  '美国': {
    cur: 'USD', sym: '$', vat: 0,
    tax: '销售税由平台代扣（各州 0–10.25%，无联邦 VAT）',
    pay: ['Visa / Mastercard', 'PayPal', 'Apple Pay', 'Google Pay', 'Klarna 分期'],
    ship: [['海外仓派送', 2, 4, 4.2], ['国际专线', 7, 12, 2.1], ['E邮宝/平邮', 12, 20, 1.2], ['商业快递', 3, 5, 9.5]],
    comp: 'CPC 4–9 元，素材生命周期 7–14 天',
    cert: 'FDA（食品接触/个护）、FCC（电子）、CPSC（儿童品）',
    best: 'Amazon', peak: 'Q4（黑五网一 + 圣诞）'
  },
  '欧洲': {
    cur: 'EUR', sym: '€', vat: 21,
    tax: 'VAT 19–27%，需 IOSS 或平台代扣代缴，EPR 需注册',
    pay: ['Visa / Mastercard', 'PayPal', 'Klarna', 'SEPA 转账', 'iDEAL'],
    ship: [['欧洲海外仓', 2, 5, 4.8], ['中欧铁路', 18, 28, 1.8], ['卡航/专线', 9, 15, 2.6], ['商业快递', 3, 6, 11]],
    comp: 'CPC 3–7 元，德语区转化高于英语区',
    cert: 'CE、WEEE、包装法、EPR、REACH',
    best: 'Amazon', peak: 'Q4 + 7 月夏季促销'
  },
  '日本': {
    cur: 'JPY', sym: '¥', vat: 10,
    tax: '消费税 10%，需 JCT 注册号',
    pay: ['信用卡', '便利店支付', 'PayPay', '代引き（货到付款）'],
    ship: [['日本海外仓', 1, 3, 5.2], ['海运', 12, 20, 1.5], ['空运专线', 4, 8, 3.4]],
    comp: 'CPC 5–8 元，对详情页精细度要求极高',
    cert: 'PSE（电器）、食品卫生法、药机法',
    best: 'Amazon JP / 乐天', peak: '12 月 + お中元/お歳暮'
  },
  '东南亚': {
    cur: 'USD', sym: '$', vat: 10,
    tax: '各国 GST/SST 6–12%，低货值多免税',
    pay: ['COD 货到付款', '信用卡', 'GrabPay', 'DANA / OVO', '银行转账'],
    ship: [['本地仓', 2, 4, 2.4], ['海运', 10, 18, 0.9], ['空运专线', 4, 8, 2.2]],
    comp: 'CPC 0.5–2 元，极度价格敏感',
    cert: 'SNI（印尼）、SIRIM（马来）部分品类',
    best: 'Shopee / TikTok Shop', peak: '双 9、双 11、双 12'
  },
  '中东': {
    cur: 'USD', sym: '$', vat: 5,
    tax: 'VAT 5%（沙特/阿联酋），需 VAT 注册',
    pay: ['COD 货到付款（占比最高）', 'Mada 卡', 'Apple Pay', 'Tabby 分期'],
    ship: [['迪拜海外仓', 2, 5, 4.6], ['空运专线', 6, 12, 3.2], ['海运', 20, 30, 1.6]],
    comp: 'CPC 2–5 元，阿语素材转化显著更高',
    cert: 'SASO / SABER（沙特）、ESMA（阿联酋）',
    best: 'Noon / Amazon AE', peak: '斋月 + 白色星期五'
  },
  '拉美': {
    cur: 'USD', sym: '$', vat: 16,
    tax: '进口税 60% 起 + 州税，巴西雷亚尔结算',
    pay: ['信用卡分期（boleto）', 'PIX（巴西）', 'OXXO（墨西哥现金）', 'Mercado Pago'],
    ship: [['本地仓', 3, 7, 4.5], ['空运专线', 10, 18, 3.6], ['海运', 30, 45, 1.8]],
    comp: 'CPC 1–3 元，分期是转化关键',
    cert: 'ANMAT（巴西）、NOM（墨西哥）',
    best: 'Mercado Libre / Shopee', peak: '黑五 + 圣诞'
  }
};

/* ---------- 平台库（费率真实口径） ---------- */
const PF = {
  'Amazon': {
    fee: 15, feeNote: '佣金 8–15%（多数品类 15%）',
    other: 'FBA 履约费 $3.2–$6.8/件 + 月度仓储 $0.87/立方英尺',
    pros: ['搜索流量最大，用户带着购买意图来', 'FBA 带来 Prime 标，转化率高 20–40%', '无需自建信任'],
    cons: ['比价透明，价格战激烈', '广告 CPM 逐年上涨', '封店风险高，申诉周期长'],
    fit: '客单价 $18 以上、有差异化、能压住 FBA 成本',
    kpi: 'BSR / 转化率 10–15% / ACOS < 30%',
    ads: 'SP 自动 + 手动精准，ACOS 打平线 = 毛利率'
  },
  'TikTok Shop': {
    fee: 8, feeNote: '佣金 2–8%（新店有减免期）',
    other: '达人佣金 10–25% + 运费补贴 + 平台活动让利',
    pros: ['内容驱动，爆款可 3 天起量', '自然流量红利仍在', '年轻用户接受新品牌'],
    cons: ['素材生命周期极短（3–7 天）', '退货率高（冲动消费）', '达人依赖强，不稳定'],
    fit: '客单价 $15–45、视觉冲击强、有使用演示价值',
    kpi: 'GPM（千次观看成交）/ 完播率 > 25% / CTR > 3%',
    ads: 'GMV Max + 达人短视频加热，先跑素材再放量'
  },
  'Shopify 独立站': {
    fee: 3, feeNote: '订阅 $29/月起 + 支付 2.9%+30¢（或第三方 1%）',
    other: '建站人力 + 广告费（占营收 25–40%）+ 插件月费',
    pros: ['数据与用户资产归自己', '可做品牌溢价，不受比价', '复购与私域可运营'],
    cons: ['零自然流量，全靠买量', '信任成本高，需评价与保障', '冷启动烧钱'],
    fit: '客单价 $40 以上、有品牌故事、能做内容',
    kpi: 'CVR 1.5–3% / AOV / 首单 ROAS > 1.6',
    ads: 'Meta 兴趣 + 相似人群，TikTok 素材测钩子，再上 Google 品牌词'
  },
  'Temu': {
    fee: 0, feeNote: '平台全托管，供货价模式（无佣金，直接报供货价）',
    other: '平台定价，卖家只供货；需备货到国内仓',
    pros: ['零运营门槛，只管供货', '起量快，无需广告', '现金流稳定'],
    cons: ['无定价权，利润极薄', '无法积累品牌与用户', '随时被比价淘汰'],
    fit: '工厂型卖家、标品、极致成本优势',
    kpi: '供货价竞争力 / 履约及时率',
    ads: '无（平台统一投放）'
  },
  'Shein': {
    fee: 0, feeNote: '平台自营/半托管，供货或代运营模式',
    other: '要求快返单、小单快反',
    pros: ['时尚品类流量精准', '上新即测款', '供应链协同'],
    cons: ['账期长', '款式要求高频迭代', '利润受制于平台'],
    fit: '服饰/配饰/快时尚供应链',
    kpi: '上新频率 / 动销率',
    ads: '无（平台分发）'
  },
  '还没定': {
    fee: 10, feeNote: '按行业均值估算 10%',
    other: '待定',
    pros: ['尚未锁定'], cons: ['尚未锁定'],
    fit: '先完成品类与客单价判断再选平台',
    kpi: '—', ads: '—'
  }
};

/* ---------- 品类库 ---------- */
const CAT = {
  '厨房小家电': { kw: ['portable blender', 'personal blender', 'usb rechargeable blender'], pain: ['清洗麻烦', '续航短', '打不碎冰块', '漏水'], season: 'Q2 健身季 + Q4 礼品季', ret: 6 },
  '宠物用品': { kw: ['pet hair remover', 'dog grooming brush', 'cat litter mat'], pain: ['清理不干净', '宠物抗拒', '不耐咬', '掉毛'], season: '全年平稳，Q4 略高', ret: 8 },
  '家居收纳': { kw: ['storage organizer', 'closet organizer', 'under bed storage'], pain: ['尺寸不合', '承重不够', '异味', '难组装'], season: 'Q1 整理季 + Q4', ret: 7 },
  '3C 数码': { kw: ['wireless charger', 'phone stand', 'usb c hub'], pain: ['发热', '兼容性差', '断连', '做工粗糙'], season: 'Q4 + 新品发布期', ret: 9 },
  '美妆个护': { kw: ['skincare set', 'hair removal device', 'led face mask'], pain: ['过敏', '没效果', '包装漏液', '味道刺鼻'], season: 'Q4 + 情人节', ret: 5 },
  '户外运动': { kw: ['camping gear', 'hiking backpack', 'portable chair'], pain: ['太重', '不稳', '不防水', '收纳麻烦'], season: 'Q2–Q3 旺季', ret: 10 },
  '母婴用品': { kw: ['baby monitor', 'breast pump', 'baby carrier'], pain: ['安全性存疑', '材质味大', '不好用', '尺寸偏小'], season: '全年，Q4 礼赠', ret: 11 },
  '服饰配饰': { kw: ['oversized hoodie', 'crossbody bag', 'linen shirt'], pain: ['尺码不准', '色差', '起球', '线头'], season: '换季前 1 个月', ret: 16 },
  '家居清洁': { kw: ['cleaning brush', 'mop and bucket', 'lint remover'], pain: ['清洁力不够', '用两次就坏', '不好收纳', '伤表面'], season: 'Q1 大扫除 + Q4', ret: 6 },
  '灯具照明': { kw: ['led strip lights', 'sunset lamp', 'solar garden light'], pain: ['色温偏冷', '寿命短', '粘贴不牢', '不够亮'], season: 'Q4 + 搬家季', ret: 5 },
  '汽车用品': { kw: ['car phone mount', 'car vacuum', 'seat gap filler'], pain: ['夹不稳', '挡视线', '尺寸不合', '吸力弱'], season: '全年，Q2 自驾季', ret: 7 },
  '玩具益智': { kw: ['montessori toys', 'building blocks', 'busy board'], pain: ['小零件危险', '味道大', '玩两天就腻', '说明书看不懂'], season: 'Q4 礼赠 + 儿童节', ret: 9 },
  '办公文具': { kw: ['desk organizer', 'laptop stand', 'planner notebook'], pain: ['承重不够', '做工毛糙', '尺寸不合', '不好清洁'], season: 'Q3 开学 + Q1 开工', ret: 4 },
  '园艺工具': { kw: ['garden tools set', 'plant watering can', 'raised bed liner'], pain: ['生锈', '手柄断裂', '太小不实用', '漏水'], season: 'Q1–Q2 春季', ret: 6 },
  '家用电器': { kw: ['air purifier', 'humidifier for bedroom', 'mini projector'], pain: ['噪音大', '水箱难洗', '亮度虚标', '滤芯贵'], season: 'Q4 + 换季（过敏季）', ret: 12 },
  '厨房用具': { kw: ['kitchen knife set', 'cutting board for kitchen', 'nonstick frying pan'], pain: ['生锈', '涂层脱落', '手柄松动', '尺寸偏小'], season: 'Q4（送礼）+ 日常刚需', ret: 7 },
  '健康护理': { kw: ['massage gun', 'knee brace support', 'foot spa bath'], pain: ['力度虚标', '噪音大', '不透气', '用几次就没电'], season: 'Q4 + 5 月（母亲节 / 父亲节）', ret: 11 },
  '（未填品类）': { kw: ['portable blender', 'storage organizer', 'phone stand'], pain: ['不好用', '质量差', '和描述不符', '太贵'], season: '待观察', ret: 8 }
};

/* =========================================================
   工具函数
   ========================================================= */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (x, d) => { const n = parseFloat(String(x).replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : (d === undefined ? 0 : d); };
const int = (x, d) => Math.round(num(x, d));
const money = (n, sym) => (sym || '$') + (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = n => (Math.round(n * 1000) / 10) + '%';
const lines = x => String(x || '').split(/[\n,，、;；|]/).map(s => s.trim()).filter(Boolean);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

function mkOf(v) { return MK[v] || MK['美国']; }
function pfOf(v) { return PF[v] || PF['还没定']; }
function catOf(v) { return CAT[v] || CAT['（未填品类）']; }

/* 中英词库：把中文卖点转成英文卖点短语（关键词挖掘/标题生成用） */
const EN_LEX = [
  [/(无线|便携)/, 'cordless portable'], [/(快充|充电)/, 'USB-C fast charging'],
  [/(清洗|自清洁)/, 'self-cleaning'], [/(刀头|刀片)/, 'stainless steel blades'],
  [/(大容量|容量)/, 'large capacity'], [/(防水)/, 'waterproof / IPX7'],
  [/(轻|重量)/, 'lightweight'], [/(静音|噪音)/, 'quiet operation'],
  [/(折叠|可折)/, 'foldable design'], [/(不锈钢)/, 'food-grade stainless steel'],
  [/(安全|认证)/, 'BPA-free & certified safe'], [/(续航|电池)/, 'long battery life'],
  [/(宠物|猫|狗)/, 'pet-friendly'], [/(除毛|粘毛)/, 'hair removal'],
  [/(收纳|整理)/, 'space-saving storage'], [/(耐用)/, 'durable build'],
  [/(多档|调速)/, 'adjustable speed settings'], [/(一键)/, 'one-touch operation'],
  /* 服装 / 纺织：原表全偏小家电，「肩带可调」「高腰直筒」这类卖点一条都翻不出来 */
  [/(肩带|背带|吊带)/, 'adjustable straps'], [/(高腰|腰线)/, 'high waist'],
  [/(直筒|阔腿|宽松|版型)/, 'relaxed fit'], [/(口袋)/, 'with pockets'],
  [/(牛仔|丹宁)/, 'denim'], [/(不透|防走光)/, 'not see through'],
  [/(弹力|弹)/, 'stretch fabric'], [/(透气)/, 'breathable'],
  [/(纯棉|全棉|棉)/, 'cotton'], [/(加绒|绒|抓绒)/, 'fleece lined'],
  [/(大码|加大)/, 'plus size'], [/(收腹|显瘦|修身)/, 'slimming']
];
function toEn(points) {
  const out = [];
  lines(points).forEach(p => {
    let hit = null;
    for (const [re, en] of EN_LEX) if (re.test(p)) { hit = en; break; }
    out.push(hit || p.replace(/[\u4e00-\u9fa5]/g, '').trim() || 'premium quality');
  });
  return out.filter(Boolean);
}

/* 卖点金字塔：功能 → 利益 → 情绪 */
const BENEFIT_MAP = [
  [/(无线|便携|cordless|portable)/i, '随时随地能用，不用找插座', '把「想用」变成「马上用」——通勤、出差、健身房里都不将就'],
  [/(快充|充电|charging|battery)/i, '充一次用一周，出门不怕没电', '摆脱电量焦虑，行程不用为充电让路'],
  [/(清洗|self-cleaning|clean)/i, '用水冲 10 秒就干净，不用拆', '用完不用「等有空再洗」，闲置率直线下降'],
  [/(刀头|blade|打碎|blend)/i, '冰块坚果都能打，口感细腻无渣', '每一口都值得拍下来，自传播的起点'],
  [/(静音|quiet)/i, '早上用不吵醒家人', '在合租房、婴儿房也能安心用'],
  [/(轻|lightweight)/i, '单手能拿，包里不占位', '让「带出门」不再是负担'],
  [/(安全|certified|BPA)/i, '食品级材质，入口放心', '给孩子、给父母用都不犹豫'],
  [/(收纳|storage|space)/i, '一折就收，抽屉里塞得下', '小户型也能保持台面干净'],
  [/(防水|waterproof)/i, '整机可水洗，不藏污', '看不见的地方也干净，用着心里舒坦']
];
function pyramid(points) {
  const ps = lines(points);
  const src = ps.length ? ps : ['便携', '易清洗', '快充'];
  return src.map((p, i) => {
    let b = null;
    for (const [re, ben, emo] of BENEFIT_MAP) if (re.test(p)) { b = { ben, emo }; break; }
    return {
      f: p,
      b: b ? b.ben : '解决一个具体的小麻烦，用起来比旧方案省事',
      e: b ? b.emo : '让日常少一点将就，多一点顺手',
      w: i === 0 ? '主推' : (i === 1 ? '次推' : '支撑')
    };
  });
}

/* 核心卖点：从所有卖点里选出唯一主推 + 3 条支撑（全篇共用同一套判定） */
function coreScore(p, total) {
  const hard = /专利|认证|技术|算法|材料|结构|刀头|芯片/.test(p.f) ? 4 : 2;
  const feel = (p.e || '').length > 12 ? 4 : 3;
  const diff = total > 3 ? 3 : 2;
  const tot = hard + feel + diff + (p.w === '主推' ? 1 : 0);
  return { hard, feel, diff, tot, role: tot >= 10 ? '主推' : tot >= 8 ? '次推' : '支撑' };
}

function corePointOf(ctx, src) {
  const ps = src && src.length ? src : lines(ctx.points);
  if (!ps.length) return null;
  const py = pyramid(ps.join('\n'));
  const rows = py.map((p, i) => Object.assign({ i, f: p.f, b: p.b, e: p.e }, coreScore(p, ps.length)));
  rows.sort((a, b) => b.tot - a.tot);
  /* 主推只能有一条：其余统一叫「补位」，不再分次推/支撑这种假精度 */
  rows.forEach((r, i) => { r.role = i === 0 ? '主推' : '补位'; r.rank = i; });
  return { main: rows[0], rows, support: rows.slice(1, 4) };
}

/* 主推卖点的证据：竞品标题提及次数 / 差评覆盖，没有数据就不编 */
function coreEvidence(ctx, main) {
  const out = [];
  try {
    const auto = ctx.__auto || {};
    const hit = auto.net && auto.net.hit;
    if (hit && hit.length) {
      const k = hit.find(h => h.keys && h.keys.some(x => main.f.indexOf(x) > -1));
      out.push(k ? `竞品标题 ${k.n}/${k.of} 提到同类卖点` : '竞品标题基本没提，是差异化位');
    }
    if (auto.net && auto.net.comp) out.push(`竞争${auto.net.comp}（评论中位 ${auto.net.medianReviews || 0}）`);
  } catch (e) { }
  try {
    const items = rvItems(ctx);
    if (items && items.items && items.items.length) {
      const neg = rvAnalyze(items.items).pains || [];
      const m = neg.sort((a, b) => b.count - a.count)[0];
      if (m) out.push(`差评最集中的是「${m.k}」，主推要能压住它`);
    }
  } catch (e) { }
  return out;
}

/* 关键词簇生成：真实组合，不是写死的示例 */
function kwClusters(ctx) {
  const c = catOf(ctx.category);
  const pf = (ctx.__auto && ctx.__auto.profile) || null;
  let S = null;
  try { S = (typeof subRows === 'function') ? subRows(ctx) : null; } catch (e) { S = null; }

  const EN = k => (/[a-z]/i.test(String(k || '')) ? String(k).toLowerCase().trim() : '');
  const subEn = (S && S.cur) ? EN(S.cur.kw) : '';
  const prodEn = pf ? EN(pf.en) : '';

  /* 核心词只认「这个产品」的词：细分款英文 > 形态英文 > 品类通用词。
     原来直接取品类词库，卖背带裤会给出 oversized hoodie —— 那是同大类里别人的生意。 */
  const base = [];
  /* 核心词放「形态大词」（overalls），精准词放「细分款」（womens denim overalls）——
     投放时大词拿曝光、细分词拿转化，顺序反了会先烧钱 */
  [prodEn, subEn].forEach(k => { if (k && base.indexOf(k) < 0) base.push(k); });
  if (!base.length) c.kw.slice().forEach(k => { if (base.indexOf(k) < 0) base.push(k); });
  const core = base[0];
  /* 「product」是兜底画像的占位词，拿它拼出来的词一条都投不出去 —— 宁可空着 */
  if (!core || core === 'product') {
    return { rows: [], base: [], en: [], scenes: [], mods: [], core: '', subEn, prodEn, live: [], empty: true };
  }

  /* 属性词：从本品卖点里挑能翻成英文的；翻不出来就空着，不拿 'premium quality' 凑数。
     与核心词重复的要去掉 ——「cordless portable + portable blender」拼出来是病句。 */
  const wset = t => new Set(String(t).toLowerCase().split(/\s+/));
  const dup = (a, b) => { const A = wset(a), B = wset(b); let n = 0; A.forEach(w => { if (B.has(w)) n++; }); return n > 0; };
  const attrs = [];
  (pf && pf.pts ? pf.pts : []).forEach(p => {
    for (const [re, en] of EN_LEX) {
      if (re.test(p)) {
        const selfPet = /\b(cat|dog|pet|puppy)\b/i.test(core);
        const bad = (selfPet && en === 'pet-friendly');   // 猫砂盆再挂 pet-friendly 是废话
        if (!bad && attrs.indexOf(en) < 0 && !dup(en, core) && !dup(en, base[1] || '')) attrs.push(en);
        break;
      }
    }
  });

  const scenes = ['for travel', 'for work', 'for home', 'for beginners', 'for daily wear', 'for gifting'];
  const mods = ['best', 'affordable', 'upgraded', '2026'];
  /* 实时搜索建议：亚马逊下拉框里真实存在的词。买家今天就在这么搜，
     比「best + 核心词」这类模板拼出来的长尾词新，也更值得直接投。 */
  const liveSug = [];
  ((ctx.__auto && ctx.__auto.live && ctx.__auto.live.sug) || []).forEach(x => {
    const y = String(x || '').toLowerCase().trim();
    if (!y || y === core || liveSug.indexOf(y) > -1) return;
    if (!base.some(b => b && y.indexOf(String(b).toLowerCase()) > -1)) return;
    if (liveSug.length < 3) liveSug.push(y);
  });
  /* 痛点词要的是「用户真会拿去搜的说法」，所以按本品类的差评翻译，不用通用词表 */
  const PAIN_EN = [
    [/尺码|号小|偏小|不合身/, 'true to size'], [/色差|掉色|褪色/, 'color accurate'],
    [/起球|pilling/, 'no pilling'], [/线头|做工|开线/, 'clean stitching'],
    [/漏水|渗水|漏/, 'leak proof'], [/噪音|吵/, 'quiet'],
    [/难洗|清洗|残留/, 'easy to clean'], [/续航|电池|充电/, 'long battery life'],
    [/变形|塌/, 'keeps shape'], [/异味|气味/, 'no odor'],
    [/重|偏重/, 'lightweight'], [/卡|不顺/, 'smooth']
  ];
  const painWord = [];
  c.pain.forEach(p => {
    for (const [re, en] of PAIN_EN) if (re.test(p)) { if (painWord.indexOf(en) < 0) painWord.push(en); break; }
  });
  ['durable', 'easy to use'].forEach(k => { if (painWord.indexOf(k) < 0) painWord.push(k); });

  const rows = [];
  base.slice(0, 2).forEach((k, i) => rows.push({
    k, type: i ? '精准词' : '核心词',
    use: i ? '标题前 80 字符 + 手动精准' : '标题首位 + 精准广告', idx: 100 - i * 7
  }));
  attrs.slice(0, 3).forEach((k, i) => rows.push({
    k: (/^with /.test(k) ? core + ' ' + k : k + ' ' + core),
    type: '属性词', use: '标题/五点 + 详情页', idx: 86 - i * 5
  }));
  scenes.slice(0, 3).forEach((sc2, i) => rows.push({ k: core + ' ' + sc2, type: '场景词', use: '短视频标题 + 素材文案', idx: 70 - i * 4 }));
  const longs = liveSug.length >= 3 ? liveSug : mods.slice(0, 3).map(m => m + ' ' + core);
  const isLive = liveSug.length >= 3;
  longs.forEach((k, i) => rows.push({
    k, type: isLive ? '实时词' : '长尾词',
    use: isLive ? '亚马逊下拉框真实存在 · 直接进手动精准' : '博客/测评选题 + 手动广泛',
    idx: 60 - i * 3
  }));
  c.pain.slice(0, 2).forEach((p, i) => rows.push({ k: core + ' ' + painWord[i], type: '痛点词', use: '标题后半段 + FAQ', idx: 54 - i * 4 }));
  rows.push({ k: 'competitor brand + ' + core, type: '竞品词', use: '广告抢量（注意商标合规）', idx: 40 });

  return { rows, base, en: attrs, scenes, mods, core, subEn, prodEn, live: liveSug };
}

/* 字符数校验规则（真实平台限定） */
const LIMIT = {
  'Amazon': { title: 200, bullet: 500, bulletN: 5, desc: 2000, search: 250 },
  'TikTok Shop': { title: 255, bullet: 0, bulletN: 0, desc: 4000, search: 0 },
  'Shopify 独立站': { title: 70, bullet: 0, bulletN: 0, desc: 5000, search: 160 },
  'Temu': { title: 120, bullet: 0, bulletN: 0, desc: 2000, search: 0 },
  'Shein': { title: 120, bullet: 0, bulletN: 0, desc: 2000, search: 0 },
  '还没定': { title: 200, bullet: 500, bulletN: 5, desc: 2000, search: 250 }
};

/* 违禁/合规词（真实高频封号词） */
const BAN = ['best', 'No.1', 'number one', '#1', 'guaranteed', '100%', 'cure', 'treat', 'prevent disease', 'FDA approved', 'eco-friendly', 'non-toxic', 'antibacterial', 'medical grade', 'instant', 'miracle', '永久', '第一', '最好', '治疗', '抗癌'];

/* 界面文案 */
const ui = {
  card: (t, body, cls) => `<div class="blk ${cls || ''}"><div class="blk-h">${t}</div>${body}</div>`,
  tbl: (head, rows, cls) => `<div class="tw"><table class="${cls || ''}"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
  kv: (rows) => `<div class="kv">${rows.map(([k, v]) => `<div class="kv-r"><div class="kv-k">${k}</div><div class="kv-v">${v}</div></div>`).join('')}</div>`,
  ul: (arr) => `<ul class="ul">${arr.map(x => `<li>${x}</li>`).join('')}</ul>`,
  ol: (arr) => `<ol class="ol">${arr.map(x => `<li>${x}</li>`).join('')}</ol>`,
  tag: (t, c) => `<span class="tg tg-${c || 'b'}">${t}</span>`,
  note: (t) => `<div class="note">${t}</div>`,
  bar: (label, v, max, tone) => `<div class="mbar"><div class="mbar-l">${label}</div><div class="mbar-t"><i class="${tone || ''}" style="width:${clamp(v / (max || 100) * 100, 2, 100)}%"></i></div><div class="mbar-v">${Math.round(v)}</div></div>`,
  big: (items) => `<div class="bigrow">${items.map(i => `<div class="big"><div class="big-v">${i.v}</div><div class="big-l">${i.l}</div><div class="big-s">${i.s || ''}</div></div>`).join('')}</div>`
};
