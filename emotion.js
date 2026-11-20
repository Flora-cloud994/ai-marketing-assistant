/* =========================================================
   emotion.js — 情绪价值层
     ① 选品三问      卖多少钱 / 有没有定制 / 产品还是情绪
     ② 标签与选题    7 个维度打标签，围着核心卖点出选题 / 定向 / 达人 brief
     ③ 视觉风格卡    6 要素 + 可直接生图的提示词
     ④ 社媒内容日历    选平台 → 4 周排期 + .ics 日历文件
     ⑤ 每日 08:00 日报 飞书 / 企微卡片 + 定时脚本
   所有结论按 ctx.market 计算，默认美国市场（不含日本专项）。
   ========================================================= */

/* ---------- 市场情绪母题库（非日本） ---------- */
const EMO = {
  '美国': {
    core: '效率 + 自我照顾',
    add: 4,
    themes: [
      ['省时间', '不是懒，是不想把周末交给家务', '把时间还给我', 92],
      ['自我照顾', '把日常动作升级成一个小仪式', '我值得被好好对待', 88],
      ['Clean Girl 审美', '干净、无痕、不用力', '看起来有在好好生活', 82],
      ['小空间体面', '租房也要像自己的家', '空间小，生活不能将就', 74],
      ['反智商税', '讨厌被收智商税，只为实测买单', '别骗我，我要看证据', 70]
    ],
    tone: '直白口语、先说结果、敢自嘲；少用形容词，多用对比',
    fear: '被收智商税 / 退货麻烦 / 用两次就闲置',
    trust: '真实 UGC、评论数、30 天退货、开箱实测',
    anchor: '$25–45 是冲动购买甜区，$60 以上必须给出品牌理由',
    ch: [['Amazon', 46], ['TikTok Shop', 28], ['Shopify 独立站', 16], ['Temu', 10]]
  },
  '欧洲': {
    core: '克制 + 可持续',
    add: 6,
    themes: [
      ['可持续', '不想再买用完就扔的东西', '买一件，用五年', 90],
      ['克制美学', '不喧哗，细节说话', '不必让所有人看见', 85],
      ['本地感', '在意是不是欧洲发货、有没有 CE', '别让我等三周', 78],
      ['家庭时间', '周末属于家人，不属于家务', '把周末还给孩子', 76],
      ['品质怀疑', '便宜一定有问题', '贵可以，但要讲清楚为什么', 72]
    ],
    tone: '克制、给依据、少夸张；德语区尤其反感营销腔',
    fear: 'VAT/清关额外收费、退货运费、包装浪费',
    trust: 'CE 与 EPR 标识、材质明细、可维修设计',
    anchor: '€25–55 主流，环保与耐用可以撑起 €20 溢价',
    ch: [['Amazon', 52], ['Shopify 独立站', 22], ['TikTok Shop', 14], ['Temu', 12]]
  },
  '东南亚': {
    core: '性价比 + 热闹',
    add: -4,
    themes: [
      ['划算', '同样的钱要买更多', '这个价我也能拥有', 88],
      ['跟风', '朋友都在买，我也要有', '不想被落下', 82],
      ['小确幸', '生活辛苦，要一点即时的快乐', '今天对自己好一点', 76],
      ['实用主义', '能解决眼前问题就行', '别整虚的', 74],
      ['出片', '要能拍、能发', '买了就要让人看见', 70]
    ],
    tone: '热闹、短句、多感叹；本地语言混说，别用书面语',
    fear: '货不对板、等太久、COD 被拒收',
    trust: '销量数字、达人实测、货到付款',
    anchor: '$8–25 是主战场，超过 $30 需要明显差异化',
    ch: [['Shopee', 40], ['TikTok Shop', 38], ['Lazada', 14], ['Temu', 8]]
  },
  '中东': {
    core: '体面 + 待客',
    add: 2,
    themes: [
      ['待客体面', '家里来客人，要拿得出手', '不能让人看笑话', 88],
      ['家庭优先', '买给家人比买给自己多', '给家人最好的', 84],
      ['金色审美', '喜欢有质感、有光泽的东西', '看起来就贵', 78],
      ['隐私', '在意家里空间不被看到', '不要暴露我的生活', 72],
      ['礼品属性', '送礼是社交刚需', '送出去要有面子', 70]
    ],
    tone: '礼貌、强调品质与身份；阿语素材转化显著更高',
    fear: '劣质、与图片不符、退货无门',
    trust: '礼盒包装、COD、阿语客服',
    anchor: '$20–60 礼品带最好卖，包装溢价可达 25%',
    ch: [['Noon', 34], ['Amazon AE', 30], ['TikTok Shop', 22], ['Shopify 独立站', 14]]
  },
  '拉美': {
    core: '热烈 + 分期',
    add: -2,
    themes: [
      ['分期即自由', '一次付不起，可以分 12 期', '现在就能拥有', 86],
      ['家庭聚会', '买的都是给家里用的', '让家里人开心', 80],
      ['色彩', '喜欢鲜艳、有存在感', '要一眼看见我', 76],
      ['信任熟人', '朋友推荐比广告可信', '我朋友也在用', 72],
      ['即时满足', '等不了太久', '今天就想要', 68]
    ],
    tone: '热情、口语、多感叹号；西语/葡语本地化必须做',
    fear: '清关慢、被税、付款失败',
    trust: 'Mercado Pago 保障、本地仓、分期免息',
    anchor: '$15–40 主流，分期免息能显著拉高客单',
    ch: [['Mercado Libre', 42], ['Shopee', 22], ['Amazon', 20], ['TikTok Shop', 16]]
  }
};

/* ---------- 品类情绪基线 ---------- */
const EMO_CAT = {
  '厨房小家电': {
    base: 46, gift: 2, visual: '台面生活流（晨光 + 木质台面 + 半身入镜）',
    enScene: 'a bright kitchen counter in morning light, half-cut fruit and a glass',
    cn: ['便携榨汁杯', '无线果汁杯', '迷你搅拌机', '随行榨汁机'],
    scene: ['通勤路上', '健身房更衣室', '办公室下午三点', '露营早餐', '宝宝辅食'],
    demos: ['15 秒出汁', '冲水自清洁', '冰块硬测'],
    emo: ['早上多睡 10 分钟', '不用洗杯子', '看起来在好好吃饭']
  },
  '宠物用品': {
    base: 58, gift: 1, visual: '家居实景（地毯 + 沙发 + 宠物入镜）',
    enScene: 'a sunlit living-room sofa with a shedding cat nearby',
    cn: ['宠物除毛器', '猫毛清理刷', '宠物粘毛滚筒', '宠物梳子'],
    scene: ['换季掉毛', '沙发清理', '出门前 3 分钟', '客人来之前'],
    demos: ['一滚到底去毛', '沙发前后对比', '水洗复用'],
    emo: ['不再为猫毛道歉', '家里像没有宠物', '抱它不用先粘毛']
  },
  '家居收纳': {
    base: 42, gift: 1, visual: '空间改造（前/后同机位 + 手部动作）',
    enScene: 'a small bedroom closet with neatly folded clothes',
    cn: ['桌面收纳盒', '抽屉分隔盒', '衣柜收纳架', '床底收纳袋'],
    scene: ['搬家第一周', '换季整理', '小户型卧室', '玄关'],
    demos: ['10 秒装好', '装下原来两倍', '抽拉不卡'],
    emo: ['房间终于像样了', '不用再翻箱倒柜', '住小房子也体面']
  },
  '3C 数码': {
    base: 38, gift: 3, visual: '桌面科技感（深色背景 + 单点光 + 特写）',
    enScene: 'a tidy desk with a laptop, dark background, single key light',
    cn: ['磁吸充电宝', '桌面手机支架', '多口充电器', '数据线收纳'],
    scene: ['出差酒店', '桌面工作台', '通勤地铁', '床头'],
    demos: ['3 秒吸附', '同时充三台', '折叠进兜'],
    emo: ['桌面终于干净了', '不再到处找线', '出门只带一个'],
    visual2: '冷调科技感，必须有参数特写'
  },
  '美妆个护': {
    base: 68, gift: 4, visual: '梳妆台美学（柔光 + 镜面 + 手部特写）',
    enScene: 'a bathroom shelf with a round mirror and soft window light',
    cn: ['美容仪', '护肤套装', '脱毛仪', '头皮按摩梳'],
    scene: ['睡前 10 分钟', '早八出门前', '约会前', '换季爆皮'],
    demos: ['上脸 28 天对比', '一抹吸收', '不搓泥实测'],
    emo: ['素颜也敢出门', '这 10 分钟属于我', '被夸最近状态好'],
    visual2: '必须有无滤镜上脸镜头，否则不转化'
  },
  '户外运动': {
    base: 50, gift: 1, visual: '户外自然光（真实地形 + 全身入镜 + 动作）',
    enScene: 'a campsite at golden hour with a tent and a folding chair',
    cn: ['露营灯', '折叠椅', '充气垫', '登山包'],
    scene: ['周末露营', '徒步中途', '阳台微露营', '后备箱收纳'],
    demos: ['3 秒展开', '承重实测', '淋雨测试'],
    emo: ['周末真的离开了城市', '第一次露营没狼狈', '不用羡慕别人的装备']
  },
  '母婴用品': {
    base: 52, gift: 5, visual: '家的柔光（自然光 + 婴儿入镜 + 低机位）',
    enScene: 'a soft-lit nursery with a crib, natural window light',
    cn: ['婴儿监视器', '哺乳枕', '吸鼻器', '婴儿背带'],
    scene: ['夜奶三点', '第一次出门', '洗澡时间', '哄睡失败'],
    demos: ['单手操作', '夜间画面', '一秒折叠'],
    emo: ['今晚能睡整觉', '第一次当妈也没那么慌', '终于能腾出手吃饭']
  },
  '服饰配饰': {
    base: 62, gift: 3, visual: '街拍（自然光 + 全身 + 走动抓拍）',
    enScene: 'a quiet street corner in soft daylight, walking toward camera',
    cn: ['阔腿卫衣', '斜挎小方包', '亚麻衬衫', '运动内衣'],
    scene: ['通勤穿搭', '周末咖啡', '旅行打包', '约会'],
    demos: ['上身 360 度', '水洗 5 次不变形', '塞进小包'],
    emo: ['今天这身可以发朋友圈', '不用想搭配', '显瘦是真的']
  },
  '家居清洁': {
    base: 38, gift: 0, visual: '污渍对比（同机位前后 + 水冲特写）',
    enScene: 'a tiled bathroom floor with visible grime and a wet scrub brush',
    cn: ['旋转拖把', '浴室刷套装', '玻璃刮', '静电除尘掸'],
    scene: ['周末大扫除', '浴室水垢', '厨房油污', '退租前最后一天'],
    demos: ['一遍过不留水痕', '干湿两用', '水冲即净'],
    emo: ['不用跪着擦', '退租能拿回押金', '十分钟清完一个房间']
  },
  '灯具照明': {
    base: 62, gift: 3, visual: '暗场氛围（只留一盏灯 + 纯黑背景）',
    enScene: 'a dark bedroom lit only by a warm LED strip along the wall',
    cn: ['LED 灯带', '氛围落地灯', '太阳能庭院灯', '感应夜灯'],
    scene: ['出租屋改造', '床头夜读', '露营营地', '节日布置'],
    demos: ['一贴即亮', 'APP 调色', '光感自动亮'],
    emo: ['房间终于像自己的', '回家那一下被治愈', '拍照不用开美颜']
  },
  '汽车用品': {
    base: 34, gift: 2, visual: '车内实拍（仪表台 + 停车场 + 手部操作）',
    enScene: 'inside a parked car, a phone mounted on the air vent at eye level',
    cn: ['车载手机支架', '车用吸尘器', '后备箱收纳箱', '座椅缝隙收纳'],
    scene: ['通勤导航', '自驾出游', '接送孩子', '洗车当天'],
    demos: ['单手取放', '过减速带不晃', '3 秒装好'],
    emo: ['开车不用低头', '车里不再乱', '副驾终于能坐人']
  },
  '玩具益智': {
    base: 52, gift: 5, visual: '俯拍桌面（孩子的手 + 木质桌面 + 自然光）',
    enScene: 'top-down view of wooden montessori toys on a light table with a child hands',
    cn: ['蒙氏忙碌板', '木质拼图', '磁力片', '积木收纳盒'],
    scene: ['周末在家', '长途车上', '等餐时', '睡前 20 分钟'],
    demos: ['一板六种玩法', '单手就能拼', '收进盒子不占地'],
    emo: ['孩子能自己玩半小时', '不再抱着手机', '玩完自己收']
  },
  '办公文具': {
    base: 30, gift: 1, visual: '工位俯拍（键盘 + 显示器 + 咖啡杯）',
    enScene: 'a tidy home office desk seen from above with a laptop stand and a coffee mug',
    cn: ['笔记本支架', '桌面收纳盒', '理线器', '双屏支架'],
    scene: ['居家办公', '咖啡馆', '工位改造', '搬新工位'],
    demos: ['10 秒调好高度', '一拉就收', '线全藏起来'],
    emo: ['脖子不酸了', '桌面终于清爽', '下班能立刻收工']
  },
  '园艺工具': {
    base: 40, gift: 1, visual: '阳台实拍（绿植 + 手部特写 + 逆光）',
    enScene: 'a sunny balcony with potted plants and hands repotting with a small trowel',
    cn: ['园艺三件套', '长嘴浇水壶', '修枝剪', '阳台种植箱'],
    scene: ['换盆翻土', '阳台种菜', '周末养护', '买回新绿植'],
    demos: ['三件套一次到位', '长嘴不洒土', '一剪到底'],
    emo: ['阳台终于像花园', '种活第一棵', '周末有事做了']
  },
  '家用电器': {
    base: 44, gift: 2, visual: '家居实景（夜间卧室 + 数显光 + 呼吸声）',
    enScene: 'a dim bedroom at night with a humidifier misting beside the bed',
    cn: ['卧室加湿器', '桌面净化器', '迷你投影仪', '静音循环扇'],
    scene: ['卧室夜间', '换季过敏', '空调房太干', '租房改造'],
    demos: ['夜间档有多静', '水箱整件拆洗', '湿度数显变化'],
    emo: ['睡觉不再口干', '不开窗也有新鲜空气', '卧室变成小影院']
  },
  '厨房用具': {
    base: 34, gift: 3, visual: '台面实拍（同一机位切同一种食材的前后对比）',
    enScene: 'a clean kitchen counter with a sharp knife slicing a ripe tomato',
    cn: ['主厨刀', '分类砧板', '保鲜盒', '硅胶厨具'],
    scene: ['日常做饭', '周末备菜', '刚搬新家'],
    demos: ['一刀切到底', '汁水不流台面', '冲一下就净'],
    emo: ['做饭终于不费劲', '厨房看着像新的', '请客敢下厨了']
  },
  '健康护理': {
    base: 48, gift: 4, visual: '身体局部实拍（肩颈 / 膝盖 + 手部按压动作）',
    enScene: 'a person massaging their neck with a handheld device on a sofa at home',
    cn: ['筋膜枪', '护腰护膝', '足浴盆', '体脂秤'],
    scene: ['下班回家', '健身后', '久坐办公室'],
    demos: ['力度调到最高', '戴上弯腰试试', '泡 20 分钟水温不降'],
    emo: ['肩膀终于松了', '不用去按摩店', '爸妈用得上']
  },
  '（未填品类）': {
    base: 46, gift: 1, visual: '真实使用场景（自然光 + 手部动作）',
    enScene: 'a clean everyday interior with natural light',
    cn: ['家居好物', '便携小物', '收纳神器'],
    scene: ['日常使用', '出门携带', '送礼'],
    demos: ['前后对比', '10 秒上手'],
    emo: ['生活省事一点', '看起来更体面']
  }
};

const CUSTOM_ADD = { '只能贴标换包装': -7, '可改配色 / 配件 / 套装': 5, '可开私模改结构': 13 };
const CONTENT_ADD = { '每周 < 3 条': -9, '每周 3–8 条': 3, '每周 8 条以上，有人出镜': 11 };
const STORY_ADD = { '没有，就是白牌': -8, '有一句话定位': 4, '有完整叙事 + 视觉体系': 12 };
const FUL = { 'Amazon': 4.2, 'TikTok Shop': 3.2, 'Shopify 独立站': 4.6, 'Temu': 1.2, 'Shein': 1.2, '还没定': 4.2 };

function emoOf(ctx) { return EMO[ctx.market] || EMO['美国']; }
function emoCatOf(ctx) { return EMO_CAT[ctx.category] || EMO_CAT['（未填品类）']; }
function hotOf(ctx) {
  const cat = (ctx.category || '').trim() || '厨房小家电';
  const list = (typeof hotList === 'function') ? hotList(cat) : [];
  return { list, st: list.length ? hotStats(list) : { med: 30, min: 15, max: 60, avg: 30, sales: 0, top1Share: .3, pains: [] } };
}

/* ---------- 情绪占比模型 ---------- */
function emoScore(ctx, v) {
  const c = emoCatOf(ctx), mk = emoOf(ctx);
  const parts = [
    ['品类情绪基线', c.base, c.base >= 55 ? '这个品类本身就在卖感受' : '功能属性偏强，情绪要靠内容补'],
    ['定制深度', CUSTOM_ADD[v.custom] || 0, v.custom || '只能贴标换包装'],
    ['内容产能', CONTENT_ADD[v.content] || 0, v.content || '每周 < 3 条'],
    ['品牌叙事', STORY_ADD[v.story] || 0, v.story || '没有，就是白牌'],
    ['市场溢价', mk.add, mk.core + '（' + (ctx.market || '美国') + '）']
  ];
  const score = clamp(parts.reduce((s, p) => s + p[1], 0), 5, 96);
  return { score, parts, cat: c, mk };
}

function emoPath(score) {
  if (score >= 70) return { k: 'story', name: '情绪品牌', tone: 'good', price: 1.34, mix: [35, 65], why: '你的资源已经够把「感受」做成产品的一部分，价格可以脱离货架比价。' };
  if (score >= 55) return { k: 'mid', name: '半定制腰部品牌', tone: 'mid', price: 1.02, mix: [50, 50], why: '功能要硬、情绪要浅：用一套统一视觉 + 一句话定位，把同款货卖出差别。' };
  if (score >= 40) return { k: 'fn', name: '功能型性价比', tone: 'mid', price: 0.86, mix: [70, 30], why: '先把一个可验证的功能做到第一，情绪只出现在包装和详情页氛围里。' };
  return { k: 'white', name: '白牌冲量', tone: 'bad', price: 0.72, mix: [85, 15], why: '没有定制、没有内容、没有故事，只能拼价格与履约，别在品牌上花钱。' };
}

/* ---------- 价格与毛利模型 ---------- */
function priceModel(price, v, ctx) {
  const rate = num(v.rate, 7.1) || 7.1;
  const costY = num(v.cost, 42), frY = num(v.freight, 9);
  const costUsd = (costY + frY) / rate;
  const pf = pfOf(ctx.platform);
  const fee = price * pf.fee / 100;
  const ful = FUL[ctx.platform] !== undefined ? FUL[ctx.platform] : 4.2;
  const gp = price - costUsd - fee - ful;
  const gm = price > 0 ? gp / price : 0;
  return {
    price, costY, frY, costUsd, fee, ful, gp, gm,
    beRoas: gp > 0 ? price / gp : 99,
    landed: costUsd + fee + ful
  };
}

/* =========================================================
   ① 选品三问
   ========================================================= */
T.emotion = {
  id: 'emotion', step: 0, name: '选品三问', sub: '卖多少钱 · 有没有定制 · 产品还是情绪',
  desc: '把「情绪价值」拆成三个能算的答案：定价落哪一档、定制做到什么深度、产品与情绪各占几成。输入成本与产能，输出可执行的路径。',
  inputs: [
    { k: 'cost', label: '采购成本（元 / 件，含包装）', type: 'num', ph: '42', hint: '1688 报价含税含包装', def: '42' },
    { k: 'freight', label: '头程物流（元 / 件）', type: 'num', ph: '9', hint: '海运分摊到单件', def: '9' },
    { k: 'rate', label: '汇率（本币 / 美元）', type: 'num', ph: '7.1', def: '7.1' },
    { k: 'custom', label: '定制能力', type: 'select', opts: ['只能贴标换包装', '可改配色 / 配件 / 套装', '可开私模改结构'], def: '可改配色 / 配件 / 套装' },
    { k: 'content', label: '内容产能', type: 'select', opts: ['每周 < 3 条', '每周 3–8 条', '每周 8 条以上，有人出镜'], def: '每周 3–8 条' },
    { k: 'story', label: '品牌叙事现状', type: 'select', opts: ['没有，就是白牌', '有一句话定位', '有完整叙事 + 视觉体系'], def: '有一句话定位' }
  ],
  out(v, ctx) {
    const es = emoScore(ctx, v);
    const path = emoPath(es.score);
    const { st } = hotOf(ctx);
    const med = ctx.price ? num(ctx.price, st.med) : st.med;
    const sym = mkOf(ctx.market).sym;

    const pWhite = Math.max(9, Math.round(med * 0.72));
    const pMid = Math.max(12, Math.round(med * 1.0));
    const pStory = Math.max(16, Math.round(med * 1.34));
    const tiers = [
      ['白牌冲量', pWhite, '跟货架比价，靠评论数与价格抢点击', 'white'],
      ['半定制腰部', pMid, '同款货 + 统一视觉 + 一句话定位', 'mid'],
      ['情绪品牌', pStory, '卖场景与身份，价格脱离比价', 'story']
    ].map(t => Object.assign({ name: t[0], why: t[2], k: t[3] }, priceModel(t[1], v, ctx)));

    const pick = tiers.find(t => t.k === path.k) || tiers[1];
    const recPrice = pick.price;

    /* 三问答案 */
    const q1 = {
      v: `${sym}${recPrice}`,
      l: path.k === 'story' ? '情绪定价' : path.k === 'white' ? '贴着中位打' : '中位价 + 微溢价',
      txt: `同类头部中位价 ${sym}${med}，你的位置应落在 ${sym}${Math.round(recPrice * 0.92)}–${sym}${Math.round(recPrice * 1.08)}。`,
      judge: pick.gm >= .45 ? '撑得住' : pick.gm >= .3 ? '偏紧' : '撑不住'
    };
    const q2 = {
      v: v.custom,
      l: emoCatOf(ctx).gift >= 3 ? '包装即产品（礼赠属性强）' : '定制换差异，不改结构',
      txt: v.custom === '只能贴标换包装'
        ? '只能贴标时，把预算全押在「印刷 + 包装结构」：外盒、内衬、说明卡三件套，成本可控在 3–6 元/件。'
        : v.custom === '可改配色 / 配件 / 套装'
          ? '改配色最划算：换一个货架上没有的颜色 + 加一个配件（收纳袋/量杯/替换头），感知差异最大、开模费为零。'
          : '有私模能力就别浪费：只改一个用户能一眼看见的结构（开口、卡扣、握把），比改十个内部件有效。'
    };
    const q3 = {
      v: `${path.mix[0]} : ${path.mix[1]}`,
      l: path.mix[1] > path.mix[0] ? '情绪为主' : '产品为主',
      txt: path.mix[1] >= 60
        ? '内容里每 10 条，6 条在讲「用了之后我变成什么样」，4 条才讲参数。参数是证据，不是卖点。'
        : path.mix[1] >= 45
          ? '内容一半讲效果、一半讲感受；先让人相信有用，再让人想要。'
          : '内容以实测、对比、拆解为主，情绪只放在开头 3 秒的钩子里。'
    };

    const scoreRows = es.parts.map(p => {
      const share = Math.round(Math.abs(p[1]) / Math.max(es.score, 1) * 100);
      return `
      <div class="srow">
        <div class="sname">${p[0]}</div>
        <div class="strack"><i style="width:${clamp(share, 2, 100)}%"></i></div>
        <div class="sval">${p[1] > 0 ? '+' + p[1] : p[1]}</div>
        <div class="sdesc">${esc(p[2])}　<b>占 ${share}%</b></div>
      </div>`;
    }).join('');

    const tierRows = tiers.map(t => [
      `${t.k === path.k ? '<b class="mk">' + t.name + '</b>' : t.name}${t.k === path.k ? ' <span class="tg tg-g">你的位置</span>' : ''}`,
      sym + t.price,
      money(t.landed, sym),
      money(t.gp, sym),
      `<b class="${t.gm >= .4 ? 'okc' : t.gm >= .28 ? 'warnc' : 'badc'}">${pct(t.gm)}</b>`,
      t.beRoas.toFixed(2),
      `<span class="fx">${esc(t.why)}</span>`
    ]);

    const mk = es.mk;
    const themeRows = mk.themes.map(t => [
      `<b>${t[0]}</b>`,
      esc(t[1]),
      `「${esc(t[2])}」`,
      `<div class="tbar"><i style="width:${t[3]}%"></i></div><span class="sub2">${t[3]}</span>`
    ]);

    const c = emoCatOf(ctx);
    const kw1688 = [c.cn[0], c.cn[1]].filter(Boolean);

    return {
      html:
        ui.big([
          { v: es.score + '/100', l: '情绪占比', s: path.name },
          { v: sym + recPrice, l: '建议售价', s: `毛利率 ${pct(pick.gm)}` },
          { v: v.custom === '只能贴标换包装' ? '贴标定制' : v.custom === '可开私模改结构' ? '开模定制' : '轻定制', l: '定制深度', s: q2.l },
          { v: `${path.mix[0]}/${path.mix[1]}`, l: '产品 : 情绪', s: q3.l }
        ]) +

        `<div class="q3">
          ${qCard('问题一', '卖多少钱', q1, 'good')}
          ${qCard('问题二', '有没有定制', q2, 'mid')}
          ${qCard('问题三', '产品还是情绪', q3, 'blue')}
        </div>` +

        ui.card(`结论：走「${path.name}」这条路`, `
          <div class="vd ${path.tone}"><b>${path.name}</b> · 情绪占比 ${es.score}/100<p>${esc(path.why)}</p></div>
          <p class="pnote" style="margin-top:10px">这个分数不是「越高越好」：定制与内容跟不上时，强行卖情绪只会让转化率与评分一起掉。分数低就老实做功能与价格，把情绪留给包装。</p>`) +

        ui.card('三档价格，钱到底赚在哪', ui.tbl(
          ['路径', '售价', '到手成本', '毛利额', '毛利率', '保本 ROAS', '适合谁'],
          tierRows) +
          ui.note(`到手成本 = 采购 ${v.cost || 42} 元 + 头程 ${v.freight || 9} 元，按 ${v.rate || 7.1} 折算，再加平台佣金 ${pfOf(ctx.platform).fee}% 与履约费 ${money(FUL[ctx.platform] !== undefined ? FUL[ctx.platform] : 4.2, sym)}。保本 ROAS = 售价 ÷ 毛利额，广告超过这个数就是亏。`)) +

        ui.card(`情绪占比 ${es.score} 分是怎么凑出来的`, `<div class="slist">${scoreRows}</div>
          <p class="pnote">品类基线来自这个品类「本来卖的是功能还是感受」，是拿不走的起点；其余四项是你自己的资源，能改的就是这四项。条长 = 这一项占最终得分的比例。</p>`) +

        ui.card(`${esc(ctx.market || '美国')}市场的情绪母题`, ui.tbl(
          ['母题', '它真正的意思', '用户会说的话', '强度'],
          themeRows) +
          ui.note(`<b>说话方式：</b>${esc(mk.tone)}<br><b>最大阻力：</b>${esc(mk.fear)}<br><b>凭什么信你：</b>${esc(mk.trust)}<br><b>价格锚：</b>${esc(mk.anchor)}`)) +

        ui.card('定完路径，去哪找货（1688 落地）', `
          ${ui.kv([
            ['搜索词', kw1688.map(k => `<code>${esc(k)}</code>`).join(' ') + '　加限定词：<code>跨境</code> <code>外贸</code> <code>可定制</code>'],
            ['先筛三样', '① 30 天成交 ≥ 100 件　② 回头率 ≥ 30%　③ 有「支持定制」标'],
            ['询价话术', `你好，我做${esc(ctx.market || '美国')}站，预计首单 ${path.k === 'white' ? '500' : '300'} 件，${v.custom === '可开私模改结构' ? '想改一处结构' : v.custom === '可改配色 / 配件 / 套装' ? '想换配色并加一个配件' : '想换包装'}，能否报：改版费、起订量、打样周期、大货价？`],
            ['必问四句', '改版费多少、能不能退？起订量多少？打样几天、打样费能否抵大货？有没有现成 CE/FCC/FDA 报告？'],
            ['验厂看三点', '生产视频（不是样品视频）、同款出货记录、有没有第三方验货报告'],
            ['打样清单', `1 件素样 + 1 件改版样 + 包装样；对照 ${c.demos.slice(0, 2).join(' / ')} 自己拍一遍`]
          ])}`) +

        ui.card('7 天内做完这五件事', ui.ol([
          `把定价定在 ${sym}${Math.round(recPrice * 0.92)}–${sym}${Math.round(recPrice * 1.08)}，先别急着打折——第一波折扣会永久拉低你的价格锚。`,
          v.custom === '只能贴标换包装' ? '找 3 家包装厂比价，做一套「外盒 + 内衬 + 说明卡」，这是你唯一能做的差异化。' : '让工厂出一版改色/加配件的样品，拍「新旧对比」——这张图后面所有素材都要用。',
          `按 ${path.mix[0]}:${path.mix[1]} 的比例写 10 条内容脚本，产品线只讲 ${c.demos.join('、')}。`,
          '把「卖点」改写成「用户会说的话」，用评论里的原句当标题，不要自己造词。',
          '算一次保本 ROAS，写在你自己的表格第一行，投放时天天对照。'
        ]))
    };
  }
};

function qCard(tag, title, q, tone) {
  return `<div class="qcard ${tone}">
    <div class="qcard-t"><span>${tag}</span>${title}</div>
    <div class="qcard-v">${esc(q.v)}</div>
    <div class="qcard-l">${esc(q.l)}</div>
    <p>${esc(q.txt)}</p>
  </div>`;
}

/* =========================================================
   ② 标签集合
   ========================================================= */
const TAGSEL = new Set();
let TAGSEL_INIT = false;

function tagGroups(ctx, focus) {
  const c = emoCatOf(ctx), mk = emoOf(ctx);
  const { st } = hotOf(ctx);
  const pts = lines(ctx.points);
  let aud = lines(String(ctx.audience || '').replace(/\s*\/\s*/g, '\n'));
  if (aud.length < 2) aud = String(ctx.audience || '').split(/与|和|＋|\+/).map(x => x.trim()).filter(Boolean);
  const sym = mkOf(ctx.market).sym;
  const price = num(ctx.price, st.med);

  /* 评论痛点真实占比，用来给功能标签定权重 */
  let painRatio = {};
  try {
    const RVI = rvItems(ctx), RVA = rvAnalyze(RVI.items);
    const neg = RVA.neg || RVA.n || 1;
    RVA.pains.forEach(p => { painRatio[p.k] = p.count / neg; });
  } catch (e) { }

  const g = [];

  /* 1 人群 */
  const audTags = aud.length ? aud.slice(0, 4) : ['25–35 岁都市女性', '租房独居', '新手爸妈', '健身人群'];
  g.push({
    key: '人群', note: '投放定向 + 达人筛选的第一层',
    tags: audTags.map((t, i) => ({ t, w: 88 - i * 6, use: '广告兴趣定向 / 达人画像' }))
  });

  /* 2 场景 */
  g.push({
    key: '场景', note: '短视频前 3 秒必须出现一个',
    tags: c.scene.map((t, i) => ({ t, w: 82 - i * 7, use: '素材标题 / 场景词广告' }))
  });

  /* 3 情绪 */
  g.push({
    key: '情绪', note: '决定文案的语气，不是决定产品',
    tags: mk.themes.map((t, i) => ({
      t: t[0], w: clamp(t[3] - i * 2, 40, 96), use: '主图文字 / 视频钩子 / 品牌主张', q: t[2]
    }))
  });

  /* 4 功能：直接取「核心卖点」的主推 + 支撑，避免和卖点工具两套说法 */
  const fnTags = [];
  const cp = (typeof corePointOf === 'function') ? corePointOf(ctx) : null;
  const fnSrc = cp ? cp.rows.slice(0, 4) : pts.slice(0, 4).map((p, i) => ({ f: p, role: i === 0 ? '主推' : '支撑' }));
  fnSrc.forEach((p, i) => fnTags.push({
    t: p.f.replace(/[，。；;,]/g, ' ').trim().slice(0, 14),
    w: p.role === '主推' ? 92 : 72 - i * 6,
    role: p.role,
    use: p.role === '主推' ? '每条选题都回扣它' : '五点 / 主图 / 详情页'
  }));
  const painTop = Object.entries(painRatio).sort((a, b) => b[1] - a[1]).slice(0, 3);
  painTop.forEach(([k, r]) => fnTags.push({ t: `反${k}`, w: clamp(Math.round(r * 260), 30, 94), use: '差异点 / FAQ / 对比视频', q: `占差评 ${pct(r)}` }));
  if (!fnTags.length) ['耐用', '好清洗', '便携'].forEach((t, i) => fnTags.push({ t, w: 70 - i * 6, use: '五点 / 主图' }));
  g.push({ key: '功能', note: '权重按差评占比算，不是拍脑袋', tags: fnTags });

  /* 5 价格 */
  const bands = [
    ['冲动价', `≤ ${sym}${Math.round(price * 0.7)}`, 40],
    ['甜区', `${sym}${Math.round(price * 0.7)}–${sym}${Math.round(price * 1.3)}`, 88],
    ['品质带', `${sym}${Math.round(price * 1.3)}–${sym}${Math.round(price * 2)}`, 62],
    ['轻奢', `> ${sym}${Math.round(price * 2)}`, 34]
  ];
  g.push({
    key: '价格', note: `同类中位价 ${sym}${st.med}`,
    tags: bands.map((b, i) => ({ t: b[0] + ' ' + b[1], w: b[2] - (i === 1 ? 0 : 0), use: '定价 / 促销节奏 / 套装门槛' }))
  });

  /* 6 视觉 */
  const vs = [c.visual.split('（')[0], mk.core + '调性', c.gift >= 3 ? '礼盒开箱' : '真实生活流', '无滤镜实拍'];
  g.push({
    key: '视觉', note: emoPath(emoScore(ctx, { custom: '可改配色 / 配件 / 套装', content: '每周 3–8 条', story: '有一句话定位' }).score).name,
    tags: vs.map((t, i) => ({ t, w: 76 - i * 8, use: '拍摄 brief / 主图风格 / 详情页' }))
  });

  /* 7 渠道 */
  g.push({
    key: '渠道', note: `${ctx.market || '美国'}的平台结构（%）`,
    tags: mk.ch.map(ch => ({ t: ch[0], w: ch[1] * 2, use: '首发平台 / 内容分发' }))
  });

  /* focus 调整权重 */
  if (focus === '偏情绪') g.forEach(gr => gr.tags.forEach(t => { if (gr.key === '情绪' || gr.key === '视觉') t.w = clamp(t.w + 12, 4, 99); if (gr.key === '功能') t.w = clamp(t.w - 8, 4, 99); }));
  if (focus === '偏功能') g.forEach(gr => gr.tags.forEach(t => { if (gr.key === '功能') t.w = clamp(t.w + 14, 4, 99); if (gr.key === '情绪') t.w = clamp(t.w - 10, 4, 99); }));
  return g;
}

function tagWall(ctx, focus) {
  const groups = tagGroups(ctx, focus);
  const cp = (typeof corePointOf === 'function') ? corePointOf(ctx) : null;
  const total = groups.reduce((s, g) => s + g.tags.length, 0);
  if (!TAGSEL_INIT) {
    groups.forEach(g => { g.tags.slice(0, 1).forEach(t => TAGSEL.add(g.key + '|' + t.t)); });
    TAGSEL_INIT = true;
  }
  const grid = groups.map(g => `
    <div class="tgrp">
      <div class="tgrp-h"><b>${g.key}</b><span>${g.tags.length} 个 · ${esc(g.note)}</span></div>
      <div class="tgwrap">
        ${g.tags.map(t => `<button class="tagg w${t.w >= 80 ? 1 : t.w >= 55 ? 2 : 3}${TAGSEL.has(g.key + '|' + t.t) ? ' on' : ''}"
          data-tag="${esc(g.key + '|' + t.t)}" data-use="${esc(t.use)}"
          title="${esc(t.use)}${t.q ? ' · ' + esc(t.q) : ''}">${t.role === '主推' ? '<b class="tstar">★</b>' : ''}${esc(t.t)}<i>${Math.round(t.w)}</i></button>`).join('')}
      </div>
    </div>`).join('');

  const hero = cp ? `<div class="corept corept-sm">
      <div class="corept-k">核心卖点 · 每条内容都回扣这一条</div>
      <div class="corept-v">${esc(cp.main.f)}</div>
      <div class="corept-s">支撑：${cp.support.map(p => esc(p.f)).join('　·　') || '暂无'}</div>
    </div>` : '';

  return `<div class="blk">
    <div class="blk-h">标签集合 <span>${total} 个标签 · 7 个维度 · 选完直接出选题，不用再拼一遍文案</span></div>
    ${hero}
    <div class="tagsum">
      <div class="tagsum-l">已选 <b id="tagCount">${TAGSEL.size}</b> 个</div>
      <div class="tagsum-r">
        <button class="btn xs" data-copytag="topics">复制选题</button>
        <button class="btn xs" data-copytag="ads">复制广告定向</button>
        <button class="btn xs" data-copytag="kol">复制达人 brief</button>
        <button class="btn xs" data-copytag="csv">下载 CSV</button>
        <button class="btn xs" data-tagclr="1">清空</button>
      </div>
    </div>
    <div class="taggrid">${grid}</div>
    <div id="tagout">${tagOutHtml(ctx)}</div>
  </div>`;
}

function tagPick(dim) {
  return Array.from(TAGSEL).filter(s => s.indexOf(dim + '|') === 0).map(s => s.slice(dim.length + 1));
}

/* 选题：把标签组合成能直接开拍的 5 条，每条回扣核心卖点 */
function ideaTopics(ctx, p) {
  const cp = (typeof corePointOf === 'function') ? corePointOf(ctx) : null;
  const main = cp ? cp.main.f : (lines(ctx.points)[0] || '核心卖点');
  const sup = cp && cp.support.length ? cp.support.map(x => x.f) : lines(ctx.points).slice(1, 3);
  const sc = p.sc.length ? p.sc : ['日常使用'];
  const em = p.em.length ? p.em : ['省事'];
  const au = p.au.length ? p.au : ['目标人群'];
  const fn = p.fn.length ? p.fn : [main];
  const pick = (arr, i) => arr[i % arr.length];
  return [
    ['翻车现场', `用之前最糟的那 3 秒：${pick(em, 0)}`, pick(sc, 0), main],
    ['一镜到底', `不剪辑拍完：${main} 到底做不做到`, pick(sc, 1), main],
    ['买家原话', `把「${pick(em, 1)}」做成字幕卡，配真实画面`, pick(sc, 0), pick(fn, 0)],
    ['一天出现三次', `${pick(au, 0)}的一天，产品出现三次`, pick(sc, 2), pick(fn, 1) || main],
    ['和普通款并排', `左边普通款、右边它：${pick(sup, 0) || main} 差在哪`, pick(sc, 0), pick(sup, 0) || main]
  ];
}

function tagOutHtml(ctx) {
  const emo = tagPick('情绪'), fn = tagPick('功能'), sc = tagPick('场景'), au = tagPick('人群'), pr = tagPick('价格'), vi = tagPick('视觉'), ch = tagPick('渠道');
  const prod = ctx.product || '产品';
  const topics = ideaTopics(ctx, { au, sc, em: emo, fn, vi });
  const topicTxt = topics.map((r, i) => `${i + 1}. 【${r[0]}】钩子：${r[1]}｜场景：${r[2]}｜回扣：${r[3]}`).join('\n');
  const ads = [
    au.length ? `人群：${au.join(' / ')}` : '',
    sc.length ? `场景：${sc.join(' / ')}` : '',
    emo.length ? `情绪钩子：${emo.join(' / ')}` : '',
    pr.length ? `价格带：${pr.join(' / ')}` : ''
  ].filter(Boolean).join('\n');
  const kol = kolBrief(ctx);

  const block = (t, b, go) => `<div class="tagout-b"><div class="tagout-h">${t}${go ? `<button class="btn xs" data-copy="${esc(b)}">复制</button>` : ''}</div><pre class="tagcode">${esc(b)}</pre></div>`;

  return `<div class="tagout">
    ${block('内容选题（每条都回扣核心卖点）', topicTxt, 1)}
    ${ads ? block('广告定向', ads, 1) : ''}
    ${block('达人 brief（可直接发给达人）', kol, 1)}
    <div class="tagout-f">这里只出「选题 + 定向 + brief」；标题去「标题文案」，排期去第 05 步「社媒内容日历」，不重复生成。</div>
  </div>`;
}

T.tagset = {
  id: 'tagset', step: 2, name: '标签集合 · 内容选题', sub: '7 维标签 → 5 条能直接开拍的选题',
  desc: '这一轮内容围着哪条卖点转、对谁讲、在什么场景讲。人群/场景/情绪/功能/价格/视觉/渠道七个维度打标签，功能标签直接取「核心卖点」的主推与支撑，选完即出 5 条选题、广告定向与达人 brief。',
  inputs: [
    { k: 'focus', label: '这一轮偏什么', type: 'select', opts: ['全维度', '偏情绪', '偏功能'], def: '全维度' }
  ],
  out(v, ctx) { return { html: tagWall(ctx, v.focus || '全维度') }; }
};

/* =========================================================
   ③ 品牌视觉风格卡
   ========================================================= */
const STYLES = {
  'Clean Girl 干净感': {
    shape: '圆角、无硬边，曲线为主',
    kw: 'clean, dewy, effortless, no-makeup makeup',
    light: '柔和晨光，侧逆光，阴影极浅',
    comp: '中近景为主，主体居中偏左，大量留白',
    mat: '白 / 米 / 浅木 / 透明玻璃',
    ref: ['Glossier', 'Summer Fridays', 'Ouai'],
    neg: 'no heavy shadow, no saturated colors, no clutter'
  },
  'Quiet Luxury 静奢': {
    shape: '直线与几何，边缘锐利，不做装饰',
    kw: 'quiet luxury, understated, editorial, muted',
    light: '单侧硬光 + 大面积暗部，低对比',
    comp: '中景，严谨对称，主体占画面 1/3',
    mat: '大理石 / 哑光金属 / 深绿 / 驼色',
    ref: ['Aesop', 'Le Labo', 'The Row'],
    neg: 'no logo overlay, no bright pops, no fast-fashion vibe'
  },
  'Warm Minimal 暖极简': {
    shape: '圆润、低重心，厚度感明显',
    kw: 'warm minimal, japandi-adjacent, soft texture',
    light: '窗边漫射光，暖白 4000K',
    comp: '平视，前后景层次，桌面 45 度俯拍',
    mat: '原木 / 亚麻 / 陶土 / 奶白',
    ref: ['Muji', 'Hay', 'Ferm Living'],
    neg: 'no harsh contrast, no plastic gloss, no neon'
  },
  'Retro Y2K 复古': {
    shape: '夸张比例，chunky 块状轮廓',
    kw: 'y2k, retro film, flash photography, playful',
    light: '直闪 + 硬阴影，颗粒感',
    comp: '广角近拍，轻微倾斜，手部入镜',
    mat: '亮银 / 糖果色 / 亚克力',
    ref: ['Starface', 'Diesel', 'Heaven by Marc Jacobs'],
    neg: 'no soft gradient, no muted palette, no studio white'
  },
  'Bold Maximal 高饱和': {
    shape: '大色块、硬边、几何切割',
    kw: 'bold, saturated, graphic, high energy',
    light: '硬光 + 彩色背景反光',
    comp: '正面平视，主体占满画面 80%',
    mat: '纯色背景 / 高饱和撞色',
    ref: ['Liquid Death', 'Olipop', 'Duolingo'],
    neg: 'no beige, no subtle, no empty space'
  },
  'Clinical Pro 专业': {
    shape: '规整对称，细窄线条，无多余结构',
    kw: 'clinical, precise, lab-clean, technical',
    light: '均匀柔光箱，无阴影',
    comp: '正视微距，参数标注位留白',
    mat: '白 / 浅灰 / 冷银 / 蓝',
    ref: ['CeraVe', 'La Roche-Posay', 'Braun'],
    neg: 'no warm tone, no lifestyle props, no decorative'
  },
  'Outdoor Technical 户外': {
    shape: '功能折角，外露结构件与织带',
    kw: 'technical outdoor, rugged, golden hour, real terrain',
    light: '自然光，黄金时刻，逆光轮廓',
    comp: '全身/环境人像，主体占 1/4，环境交代清楚',
    mat: '岩石 / 苔绿 / 沙色 / 磨砂金属',
    ref: ['Patagonia', 'Snow Peak', 'Arc\'teryx'],
    neg: 'no studio background, no perfect symmetry, no city'
  }
};

const COLOR_SETS = {
  '奶白 + 原木': 'off-white #F5F1EA with natural oak #C8A97E',
  '深绿 + 哑金': 'deep forest green #1F3A2E with brushed brass #B08D57',
  '纯白 + 冷银': 'pure white #FFFFFF with cool silver #C9CFD6',
  '黑 + 荧光绿': 'matte black #111111 with acid green #C6F24E',
  '陶土 + 焦糖': 'terracotta #C97B5A with caramel #A8714A',
  '雾蓝 + 米灰': 'misty blue #A9C0CF with warm grey #D9D2C7'
};

T.visual = {
  id: 'visual', step: 2, name: '视觉风格卡', sub: '6 要素定死，才能批量出图不变形',
  desc: '把品牌视觉定成一张卡：品牌名、风格关键词、轮廓线条、镜头景别、材质配色、比例留白。定完之后每张图都按这张卡生成，才不会一条视频一个样。',
  inputs: [
    { k: 'brand', label: '品牌名', ph: 'VITAFRESH', hint: '留空则用产品名' },
    { k: 'style', label: '风格方向', type: 'select', opts: Object.keys(STYLES), def: 'Clean Girl 干净感' },
    { k: 'color', label: '主配色', type: 'select', opts: Object.keys(COLOR_SETS), def: '奶白 + 原木' },
    { k: 'scene', label: '主要拍摄场景', ph: '晨光厨房台面', hint: '写具体地点，不要写「生活场景」' },
    { k: 'model', label: '有没有人出镜', type: 'select', opts: ['只有产品（静物）', '手部出镜', '真人半身出镜'], def: '手部出镜' }
  ],
  out(v, ctx) {
    const s = STYLES[v.style] || STYLES['Clean Girl 干净感'];
    const brand = v.brand || ctx.product || 'YOUR BRAND';
    const sceneRaw = v.scene || emoCatOf(ctx).scene[0] || '晨光厨房台面';
    const catEn = emoCatOf(ctx).enScene || 'a clean everyday interior with natural light';
    const sceneEn = /[^\x00-\x7F]/.test(sceneRaw) ? catEn : sceneRaw;
    const color = COLOR_SETS[v.color] || COLOR_SETS['奶白 + 原木'];
    const model = v.model === '真人半身出镜' ? 'a real person (hands and half body), natural skin texture, no heavy makeup'
      : v.model === '手部出镜' ? 'hands only, natural skin, no jewelry except a thin ring'
        : 'product only, no human presence';

    const card = ui.kv([
      ['① 品牌名', `<b>${esc(brand)}</b>　固定写法：全大写 / 字重 700 / 字距 +4%，只出现在主图右下或视频片尾`],
      ['② 风格关键词', `${esc(s.kw)}`],
      ['③ 轮廓与线条', `${esc(s.shape)}；轮廓必须清晰，不做柔化描边与发光边`],
      ['④ 镜头与景别', `${esc(s.comp)}；焦距 35–50mm，机位与产品同高`],
      ['⑤ 材质与配色', `${esc(s.mat)}；主色 ${esc(color)}`],
      ['⑥ 比例与留白', `主体占画面 ${v.model === '只有产品（静物）' ? '70–80%' : '45–60%'}，上方留 15% 给平台 UI 遮挡区`],
      ['光', esc(s.light)],
      ['参考品牌', s.ref.join(' / ') + '（只学调性，不抄构图）']
    ]);

    const prompt = `Editorial product photograph of ${ctx.product || 'the product'} for ${brand}.
Setting: ${sceneEn}, real texture, lived-in but tidy.
Style: ${s.kw}.
Lighting: ${s.light}.
Composition: ${s.comp}.
Color: ${color}.
Subject: ${model}.
Camera: 50mm lens, f/2.8, eye-level, shallow depth of field.
Output: 4:5 vertical, 2000px, photorealistic, natural film grain.
Negative: ${s.neg}, no text, no watermark, no logo, no extra props, no distorted hands, no plastic CGI look.`;

    const scenePrompts = emoCatOf(ctx).scene.slice(0, 3).map((sc, i) =>
      `${i + 1}. ${sc}｜同一套光与色，只换场景：${sc}，主体位置不变，机位不变，${s.light}。`).join('\n');

    return {
      html:
        ui.card(`${esc(brand)} 视觉风格卡`, card + ui.note('这张卡就是你和摄影师、设计师、AI 之间的合同。任何一张图不符合这 6 条，就是废片，不要因为「好看」而破例。')) +
        `<div class="blk">
          <div class="blk-h">生图提示词 <span>中英混排会掉质量，这里已经全英文</span></div>
          <pre class="tagcode big">${esc(prompt)}</pre>
          <div class="pfoot2">
            <button class="btn sm primary" data-copy="${esc(prompt)}">复制主图提示词</button>
            <button class="btn sm" data-copy="${esc(scenePrompts)}">复制 3 条场景变体</button>
            <span class="sub2">场景写中文时已自动换成英文默认值（${esc(catEn)}），要更精确就自己写英文</span>
          </div>
        </div>` +
        ui.card('同一套卡片下的 3 个场景', `<pre class="tagcode">${esc(scenePrompts)}</pre>`) +
        ui.card('六条一致性红线（违反就不发）', ui.ul([
          `光只允许「${s.light.split('，')[0]}」，混进第二种光就是另一个品牌`,
          `主色只用 ${color}，一次只出现一个强调色`,
          '同一个产品在 10 张图里必须是同一个角度、同一个机身颜色，不允许「这张好看就用这张」',
          '禁止在图上压超过 6 个字的文案；要写字就单独做一张字卡',
          '禁止使用平台白底主图风格做内容图 —— 那是转化图，不是内容图',
          '人出镜时只拍手或半身，不拍正脸，避免换人后品牌感断裂'
        ])) +
        ui.card('一次拍摄要拍够 30 条素材', ui.tbl(
          ['镜头', '数量', '拍什么', '用在哪'],
          [
            ['静物主图位', 6, '正面 / 45 度 / 俯拍 / 带包装 / 尺寸参照', 'Listing 主图 + 详情页'],
            ['使用动作', 8, emoCatOf(ctx).demos.map(d => d).join(' / '), '短视频 + 五点配图'],
            ['场景空镜', 6, emoCatOf(ctx).scene.slice(0, 3).join(' / '), '视频转场 + 故事板'],
            ['对比镜头', 4, '用前 / 用后、旧方案 / 新方案，同机位同角度', '广告素材最强的一类'],
            ['包装与开箱', 4, '外盒 / 内衬 / 说明卡 / 上手第一秒', '礼赠内容 + UGC 模板'],
            ['人物情绪', 2, '使用后的表情（不看镜头）', '情绪型内容的收尾镜头']
          ])) +
        ui.card('参考品牌怎么用', ui.note(
          `把 ${s.ref.join('、')} 的主页各存 6 张图，做成一个文件夹。不要临摹构图，只提取三件事：光从哪来、色温多少、主体占多大。这三件事一致，你的图就成系列了。`))
    };
  }
};

/* =========================================================
   ④ 社媒内容日历（平台化 4 周排期）
   ========================================================= */
const CAL_KINDS = [
  ['痛点对比', '同机位拍「用前 / 用后」，前 3 秒直接放最糟的那一帧', '拍摄', 'fn'],
  ['场景演示', '在真实场景里连续做完一件事，不剪辑', '拍摄', 'sc'],
  ['使用教程', '三步讲完，每步一句话 + 一个字幕卡', '拍摄', 'fn'],
  ['买家原话', '把真实评论做成字幕卡，配使用画面', '剪辑', 'em'],
  ['情绪共鸣', '不出现产品的前 5 秒，先讲一个处境', '拍摄', 'em'],
  ['开箱 / 测评', '从快递盒开始，一镜到底', '拍摄', 'tr'],
  ['幕后 / 答疑', '工厂、打包、回答一个高频问题', '剪辑', 'tr']
];

/* 平台决定「发多密、几点发、偏重哪类内容」——换平台排期真的会变，不是只换个标题 */
const CAL_PLAT = {
  'TikTok': {
    per: 7, slots: ['12:00', '19:00', '21:00'],
    best: '一天 1–2 条，停更 3 天流量就归零',
    order: ['痛点对比', '场景演示', '情绪共鸣', '使用教程', '买家原话', '开箱 / 测评', '幕后 / 答疑'],
    bar: { fin: .28, click: .020, fans: .010 }
  },
  'Instagram Reels': {
    per: 5, slots: ['11:00', '19:00'],
    best: '每周 4–6 条，前 1 秒没有画面就没有完播',
    order: ['情绪共鸣', '场景演示', '痛点对比', '买家原话', '使用教程', '幕后 / 答疑', '开箱 / 测评'],
    bar: { fin: .20, click: .022, fans: .012 }
  },
  'YouTube Shorts': {
    per: 3, slots: ['18:00', '20:00'],
    best: '每周 3 条，一条讲透一件事，靠搜索长尾吃量',
    order: ['使用教程', '开箱 / 测评', '痛点对比', '场景演示', '幕后 / 答疑', '买家原话', '情绪共鸣'],
    bar: { fin: .30, click: .018, fans: .008 }
  },
  '小红书': {
    per: 3, slots: ['12:00', '20:00'],
    best: '每周 3–5 篇，图文也要发，标题带人群词（租房 / 学生 / 宝妈）',
    order: ['买家原话', '痛点对比', '场景演示', '情绪共鸣', '幕后 / 答疑', '使用教程', '开箱 / 测评'],
    bar: { fin: .15, click: .025, fans: .015 }
  }
};

function calPlan(v, ctx) {
  const plat = CAL_PLAT[v.plat] ? v.plat : 'TikTok';
  const P = CAL_PLAT[plat];
  const per = v.per === '每周 3 条' ? 3 : v.per === '每周 5 条' ? 5 : 7;
  const face = v.face === '有人出镜' ? 1 : 0;
  const c = emoCatOf(ctx);
  const start = v.start ? new Date(v.start + 'T00:00:00') : new Date();
  /* 从下一个周一开始 */
  const d0 = new Date(start);
  const wd = (d0.getDay() + 6) % 7;
  d0.setDate(d0.getDate() + (7 - wd) % 7);

  const plan = [];
  for (let w = 0; w < 4; w++) {
    for (let i = 0; i < per; i++) {
      /* 全序列连续轮转（跨周不重置），否则每周都从同一种形态开始，看着像复制粘贴 */
      const kn = P.order[(w * per + i + w) % P.order.length];
      const k = CAL_KINDS.find(x => x[0] === kn) || CAL_KINDS[0];
      const day = new Date(d0);
      const idx = per === 7 ? i : per === 5 ? [0, 1, 3, 5, 6][i] : [0, 3, 5][i];
      day.setDate(day.getDate() + w * 7 + idx);
      const sc = c.scene[(w + i) % c.scene.length];
      const dm = c.demos[(w + i) % c.demos.length];
      const em = c.emo[(w + i) % c.emo.length];
      plan.push({
        w, day,
        kind: k[0], how: k[1], type: k[2],
        scene: sc, demo: dm, emo: em,
        hook: calHook(k[0], sc, dm, em),
        face: face || k[2] === '剪辑' ? (face ? '出镜' : '不出镜') : '不出镜'
      });
    }
  }
  return { plan, per, face, d0, plat, P };
}

function calHook(kind, sc, dm, em) {
  if (kind === '痛点对比') return `用之前 3 秒 vs 用之后：${dm}`;
  if (kind === '场景演示') return `${sc}，从开始到结束一镜到底`;
  if (kind === '使用教程') return `三步讲完：${dm}，每步一句话`;
  if (kind === '买家原话') return `「${em}」—— 一个买了的人这么说`;
  if (kind === '情绪共鸣') return `产品不出现的前 5 秒：${em}`;
  if (kind === '开箱 / 测评') return `拆开快递的第一眼：${dm} 到底做不做到`;
  return `回答被问最多的那个问题：${dm} 麻不麻烦`;
}

T.calendar = {
  id: 'calendar', step: 4, name: '社媒内容日历', sub: '平台化 4 周排期 + .ics 日历',
  desc: '先选平台再排 4 周：平台决定发多密、几点发、偏重哪类内容。每一条给到能直接开拍的钩子、场景与出镜方式，导出 .ics 进手机日历。',
  inputs: [
    { k: 'plat', label: '平台', type: 'select', opts: ['TikTok', 'Instagram Reels', 'YouTube Shorts', '小红书'], def: 'TikTok' },
    { k: 'per', label: '每周发几条', type: 'select', opts: ['每周 3 条', '每周 5 条', '每周 7 条'], def: '每周 5 条' },
    { k: 'face', label: '有没有人出镜', type: 'select', opts: ['不出镜（纯产品）', '有人出镜'], def: '不出镜（纯产品）' },
    { k: 'time', label: '每天发布时间', type: 'select', opts: ['08:00', '10:00', '12:00', '18:00', '20:00'], def: '10:00' },
    { k: 'start', label: '开始日期', type: 'text', ph: '2026-11-23', hint: '留空从下一个周一开始' }
  ],
  out(v, ctx) {
    const { plan, per, plat, P } = calPlan(v, ctx);
    const mix = { fn: 0, sc: 0, em: 0, tr: 0 };
    plan.forEach(p => { const k = CAL_KINDS.find(k => k[0] === p.kind); if (k) mix[k[3]]++; });
    const total = plan.length || 1;
    const off = per !== P.per;
    /* 平台建议只在「跟你选的不一样」时才说，不重复列一遍参数 */
    const tips = [];
    if (off) tips.push(`你选了每周 ${per} 条，${plat} 的经验值是每周 ${P.per} 条——${per > P.per ? '量是够了，但容易摊薄质量，前 4 周宁可少而稳' : '量偏少，起量会慢，前 4 周先保节奏、别中途停'}。`);
    if (v.time && P.slots.indexOf(v.time) < 0) tips.push(`你设的 ${v.time} 不在 ${plat} 的活跃时段（${P.slots.join(' / ')}）内，改到最接近的那个，排期表的时间会一起变。`);

    const weeks = [0, 1, 2, 3].map(w => {
      const rows = plan.filter(p => p.w === w).map(p => [
        `${p.day.getMonth() + 1}/${p.day.getDate()}　${v.time || '10:00'}`,
        `<b>${p.kind}</b><div class="sub2">${esc(p.type)}</div>`,
        esc(p.hook),
        esc(p.scene),
        esc(p.face)
      ]);
      const from = plan.filter(p => p.w === w)[0], to = plan.filter(p => p.w === w).slice(-1)[0];
      return `<div class="calw">
        <div class="calw-h"><b>第 ${w + 1} 周</b><span>${from ? (from.day.getMonth() + 1) + '/' + from.day.getDate() : ''} – ${to ? (to.day.getMonth() + 1) + '/' + to.day.getDate() : ''}　共 ${rows.length} 条</span></div>
        ${ui.tbl(['时间', '形式', '钩子（第一句就这句）', '场景', '出镜'], rows)}
      </div>`;
    }).join('');

    const ics = icsText(plan, v.time || '10:00', ctx);
    const batch = [
      ['第 1 批（拍摄日 1）', '静物 6 + 使用动作 8', '一次拍完 2 周要用的产品镜头'],
      ['第 2 批（拍摄日 2）', '场景空镜 6 + 对比 4', '换场景不换光，同一天拍完'],
      ['第 3 批（剪辑日）', '买家原话 + 幕后', '不用开机，只做字幕与配音'],
      ['备用素材', '3 条竖版 15 秒', '临时断更时顶上，避免节奏断掉']
    ];

    return {
      html:
        ui.big([
          { v: plan.length + ' 条', l: '4 周档期', s: `${plat} · 每周 ${per} 条` },
          { v: pct(mix.fn / total), l: '功能内容', s: `${mix.fn} 条 · 证明有用` },
          { v: pct((mix.em + mix.tr) / total), l: '情绪 + 信任', s: `${mix.em + mix.tr} 条 · 让人想要` },
          { v: '1 天', l: '拍摄批次', s: '集中拍，别天天开机' }
        ]) +
        `<div class="blk">
          <div class="blk-h">排期表 <span>第一列就是闹钟提醒的时间；导出后手机日历会自己叫你</span></div>
          <div class="calbar">
            <button class="btn sm primary" data-raw="${esc(ics)}" data-name="${esc((ctx.product || 'content') + '_' + plat.replace(/\s+/g, '') + '_4周内容日历.ics')}">下载 .ics（${plan.length} 条日程）</button>
            <button class="btn sm" data-copy="${esc(ics)}">复制 ICS 源码</button>
            <span class="sub2">导入方式：Google 日历 → 设置 → 导入；手机上直接点开文件即可</span>
          </div>
          ${weeks}
        </div>` +
        ui.card(`${plat} 怎么发`, ui.ul([
          `${plat} 的稳定节奏是${P.best}`,
          `发布时段：${P.slots.join(' / ')}（当地时间）。固定一个时段比反复试「最佳时间」更有用——算法认的是稳定性`,
          `这个平台吃「${P.order.slice(0, 3).join(' / ')}」，排期按这个顺序轮转，别把七种平均分配`,
          `${plat === '小红书' ? '标题带人群词（租房 / 学生 / 宝妈），首图决定 80% 的点击' : '前 3 秒决定一切：第一帧就要有动作或冲突，不要放 logo 和「新品上市」'}`
        ]) + (tips.length ? `<p class="gcell-f">${tips.join('<br>')}</p>` : '')) +
        ui.card('内容配比怎么定', ui.note(
          `功能内容 ${mix.fn} 条负责「让人相信有用」，情绪与信任 ${mix.em + mix.tr} 条负责「让人想要」。比例失衡的两种死法：全是功能 → 像说明书，没人看；全是情绪 → 好看但不下单。`) +
          `<p class="gcell-f">第 21 天把表现最好的 2 条重剪一版再发（换开头、换 BGM）——同一批素材至少能吃三次流量。</p>`) +
        ui.card('拍摄批次（一次拍够，不要天天开机）', ui.tbl(['批次', '内容', '要点'], batch)) +
        ui.card('看什么 · 及格线 · 什么时候看', ui.tbl(
          ['指标', '及格线', '什么时候看', '不合格怎么办'],
          [
            ['3 秒完播率', `> ${pct(P.bar.fin)}`, '每周一', '钩子不行就换第一帧，别换选题'],
            ['互动率（赞藏评 / 播放）', '> 3%', '每周一', '内容没情绪，加冲突或提问'],
            ['收藏率', '> 2%', '第 14 天', '收藏高说明「有用」，该多拍买家原话与教程'],
            ['主页点击率', `> ${pct(P.bar.click)}`, '每两周', '结尾没引导，加一句明确 CTA'],
            ['涨粉率', `> ${pct(P.bar.fans)}`, '第 30 天', '人设不清晰，固定一个记忆点反复用']
          ]))
    };
  }
};

function icsText(plan, time, ctx) {
  const [hh, mm] = (time || '10:00').split(':');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const clean = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ev = plan.map((p, i) => {
    const y = p.day.getFullYear();
    const mo = String(p.day.getMonth() + 1).padStart(2, '0');
    const d = String(p.day.getDate()).padStart(2, '0');
    const h2 = String((+hh + 1) % 24).padStart(2, '0');
    return `BEGIN:VEVENT
UID:${Date.now()}-${i}@aimkt
DTSTAMP:${stamp}
DTSTART:${y}${mo}${d}T${hh}${mm}00
DTEND:${y}${mo}${d}T${h2}${mm}00
SUMMARY:${clean('[' + (ctx.product || '内容') + '] ' + p.kind + ' · ' + p.scene)}
DESCRIPTION:${clean('钩子：' + p.hook + ' | 形式：' + p.type + ' | 场景：' + p.scene + ' | ' + p.face)}
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:${clean(p.kind)}
END:VALARM
END:VEVENT`;
  }).join('\n');
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//aimkt//content-calendar//CN\nCALSCALE:GREGORIAN\n${ev}\nEND:VCALENDAR`;
}

/* =========================================================
   ⑤ 每日 08:00 日报
   ========================================================= */
const PY_DAILY = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""daily_digest.py — 每天 08:00 把昨日经营数据推成一张卡片

数据源：把平台后台 / ERP 导出的两个 CSV 放进 ./data/
  data/orders.csv  列：date, sku, units, revenue, ad_spend, ad_sales
  data/ads.csv     （可选）列：date, campaign, spend, sales, clicks, orders

跑法：
  export FEISHU_WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/xxxx"
  python daily_digest.py            # 推真实数据
  python daily_digest.py --demo     # 不读文件，先用假数据看卡片长什么样
"""
import csv, json, os, sys, urllib.request
from datetime import date, timedelta

WEBHOOK = os.environ.get("FEISHU_WEBHOOK", "")
SHOP = os.environ.get("SHOP_NAME", "MY STORE")
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
YDAY = date.today() - timedelta(days=1)

# 阈值：超过就变红，写死在这里，比每天凭感觉判断可靠
ACOS_LIMIT = 0.35          # 广告 ACOS 红线
GM_LIMIT = 0.30            # 毛利率下限
DROP_LIMIT = 0.30          # 订单环比跌幅告警线


def read_csv(name):
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def num(row, key, default=0.0):
    try:
        raw = str(row.get(key, "")).replace(",", "").replace("$", "").replace("%", "").strip()
        return float(raw) if raw else default
    except (TypeError, ValueError):
        return default


def sum_by(rows, day):
    hit = [r for r in rows if str(r.get("date", ""))[:10] == str(day)]
    return {
        "orders": len(hit),
        "units": sum(num(r, "units") for r in hit),
        "revenue": sum(num(r, "revenue") for r in hit),
        "ad_spend": sum(num(r, "ad_spend") for r in hit),
        "ad_sales": sum(num(r, "ad_sales") for r in hit),
        "cost": sum(num(r, "cost") for r in hit),
    }


def demo(day):
    """没有数据文件时用的假数据，只为跑通链路"""
    base = 1180 if day == YDAY else 1520
    return {"orders": 42 if day == YDAY else 55, "units": 47, "revenue": base,
            "ad_spend": 196.0, "ad_sales": 742.0, "cost": 512.0}


def metrics(cur, prev):
    rev = cur["revenue"] or 1
    acos = cur["ad_spend"] / cur["ad_sales"] if cur["ad_sales"] else 0
    gm = (rev - cur["cost"] - cur["ad_spend"]) / rev
    roas = cur["ad_sales"] / cur["ad_spend"] if cur["ad_spend"] else 0
    aov = rev / cur["orders"] if cur["orders"] else 0
    dod = (cur["orders"] - prev["orders"]) / prev["orders"] if prev["orders"] else 0
    return {"acos": acos, "gm": gm, "roas": roas, "aov": aov, "dod": dod}


def build_card(cur, m, alerts):
    tone = "red" if any(a[0] == "red" for a in alerts) else "blue"
    lines = [
        "**订单** %d　**销售额** $%.0f　**客单价** $%.1f" % (cur["orders"], cur["revenue"], m["aov"]),
        "**广告花费** $%.0f　**ACOS** %.1f%%　**ROAS** %.2f" % (cur["ad_spend"], m["acos"] * 100, m["roas"]),
        "**毛利率** %.1f%%　**环比订单** %+.1f%%" % (m["gm"] * 100, m["dod"] * 100),
        "",
        "**今日动作**",
    ]
    for a in alerts:
        lines.append(("- " if a[0] == "blue" else "**!** ") + a[1])
    if not alerts:
        lines.append("- 没有异常，按计划推进内容与补货")

    return {
        "msg_type": "interactive",
        "card": {
            "config": {"wide_screen_mode": True},
            "header": {
                "template": tone,
                "title": {"tag": "plain_text", "content": "%s · %s 经营日报" % (SHOP, YDAY.strftime("%m-%d"))},
            },
            "elements": [{"tag": "div", "text": {"tag": "lark_md", "content": "\\n".join(lines)}}],
        },
    }


def judge(cur, m):
    out = []
    if m["acos"] > ACOS_LIMIT:
        out.append(("red", "ACOS %.0f%% 超过 %.0f%% 红线，先降预算 30%%，别加价" % (m["acos"] * 100, ACOS_LIMIT * 100)))
    if m["gm"] < GM_LIMIT:
        out.append(("red", "毛利率 %.0f%% 低于 %.0f%%，检查折扣与运费是否吃掉利润" % (m["gm"] * 100, GM_LIMIT * 100)))
    if m["dod"] < -DROP_LIMIT:
        out.append(("red", "订单环比跌 %.0f%%，先查库存与购物车，再查广告" % (abs(m["dod"]) * 100)))
    if m["acos"] < ACOS_LIMIT * 0.7 and m["roas"] > 3:
        out.append(("blue", "ROAS %.1f 有加预算空间，今日 +20%% 试投" % m["roas"]))
    if m["dod"] > DROP_LIMIT:
        out.append(("blue", "订单涨 %.0f%%，确认库存能撑 14 天再放量" % (m["dod"] * 100)))
    return out


def push(payload):
    if not WEBHOOK:
        print("[skip] 没有配置 FEISHU_WEBHOOK，只打印不推送")
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return
    req = urllib.request.Request(
        WEBHOOK,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        print("[ok]", r.status, r.read().decode("utf-8")[:200])


def main():
    rows = read_csv("orders.csv")
    prev = read_csv("orders.csv")  # 环比用同一份文件里的前一天，按需换成月表
    cur = sum_by(rows, YDAY) if rows else demo(YDAY)
    last = sum_by(rows, YDAY - timedelta(days=1)) if rows else demo(YDAY - timedelta(days=1))
    m = metrics(cur, last)
    push(build_card(cur, m, judge(cur, m)))


if __name__ == "__main__":
    main()
`;

T.daily = {
  id: 'daily', step: 7, name: '每日日报推送', sub: '08:00 自动发到飞书 / 企微',
  desc: '把昨天订单、广告、毛利、库存整理成一张卡片，每天早上固定时间推给你。异常项直接标红并给动作，不用自己去后台翻。',
  inputs: [
    { k: 'time', label: '推送时间', type: 'select', opts: ['07:00', '08:00', '09:00', '10:00'], def: '08:00' },
    { k: 'ch', label: '推到哪里', type: 'select', opts: ['飞书群机器人', '企业微信群机器人', '邮件'], def: '飞书群机器人' },
    { k: 'shop', label: '店铺名', ph: 'MY STORE', hint: '显示在卡片标题上' },
    { k: 'acos', label: 'ACOS 红线 %', type: 'num', ph: '35', def: '35' },
    { k: 'gm', label: '毛利率下限 %', type: 'num', ph: '30', def: '30' }
  ],
  out(v, ctx) {
    const time = v.time || '08:00';
    const tz = 8;
    const utcH = ((+time.split(':')[0] - tz) + 24) % 24;
    const cron = `0 ${utcH} * * *`;
    const sym = mkOf(ctx.market).sym;
    const shop = v.shop || 'MY STORE';

    /* 卡片预览：用当前项目数据造一份，让人看见成品长什么样 */
    const { st } = hotOf(ctx);
    const price = num(ctx.price, st.med) || 30;
    const orders = 42, rev = orders * price, spend = Math.round(rev * 0.17), adSales = Math.round(spend * 3.8);
    const acos = spend / adSales, gm = 0.34, dod = 0.083;
    const acosLimit = num(v.acos, 35) / 100, gmLimit = num(v.gm, 30) / 100;
    const alerts = [];
    if (acos > acosLimit) alerts.push(['r', `ACOS ${pct(acos)} 超过 ${pct(acosLimit)} 红线，先降预算 30%，别加价`]);
    if (gm < gmLimit) alerts.push(['r', `毛利率 ${pct(gm)} 低于 ${pct(gmLimit)}，检查折扣与运费`]);
    if (!alerts.length) alerts.push(['b', `ACOS ${pct(acos)} 在红线内，ROAS ${(adSales / spend).toFixed(2)} 可加投 20%`]);
    alerts.push(['b', `库存可撑 ${Math.round(30 + orders * 0.4)} 天，本周确认补货`]);

    const y = new Date(); y.setDate(y.getDate() - 1);
    const dateStr = (y.getMonth() + 1) + ' 月 ' + y.getDate() + ' 日';

    return {
      html:
        `<div class="pushwrap">
          <div class="pushcard ${alerts[0][0] === 'r' ? 'red' : ''}">
            <div class="pushhd"><b>${esc(shop)} · ${dateStr} 经营日报</b><span>${time} 自动推送</span></div>
            <div class="pushrow">
              <div><em>订单</em><b>${orders}</b></div>
              <div><em>销售额</em><b>${sym}${Math.round(rev)}</b></div>
              <div><em>客单价</em><b>${sym}${price}</b></div>
            </div>
            <div class="pushrow">
              <div><em>广告花费</em><b>${sym}${spend}</b></div>
              <div><em>ACOS</em><b class="${acos > acosLimit ? 'bad' : ''}">${pct(acos)}</b></div>
              <div><em>ROAS</em><b>${(adSales / spend).toFixed(2)}</b></div>
            </div>
            <div class="pushrow">
              <div><em>毛利率</em><b class="${gm < gmLimit ? 'bad' : ''}">${pct(gm)}</b></div>
              <div><em>环比订单</em><b class="up">+${pct(dod)}</b></div>
              <div><em>库存天数</em><b>${Math.round(30 + orders * 0.4)}</b></div>
            </div>
            <div class="pushact">
              <div class="pushact-h">今日动作</div>
              ${alerts.map(a => `<div class="pushli ${a[0]}">${a[0] === 'r' ? '!' : '·'} ${esc(a[1])}</div>`).join('')}
            </div>
          </div>
          <div class="pushside">
            <b>为什么每天推这个</b>
            <ul class="ul">
              <li>异常只在当天可救：ACOS 恶化三天后再降预算，钱已经烧完了。</li>
              <li>固定时间看同一组数字，才能看出趋势；随手翻后台永远只看当天。</li>
              <li>卡片上必须有「动作」，否则只是把后台搬了个地方。</li>
            </ul>
          </div>
        </div>` +

        ui.card('三步接上（10 分钟）', `<div class="steps4">
          <div><b>1</b><span>建机器人</span><code>群设置 → 群机器人<br>→ 添加 → 自定义机器人<br>复制 Webhook 地址</code></div>
          <div><b>2</b><span>放数据</span><code>mkdir data<br>orders.csv 列：<br>date,units,revenue,<br>ad_spend,ad_sales,cost</code></div>
          <div><b>3</b><span>定时跑</span><code>crontab -e<br>${cron} python3<br>daily_digest.py</code></div>
          <div><b>4</b><span>验证</span><code>python3 daily_digest.py<br>--demo<br>先看卡片对不对</code></div>
        </div>
        ${ui.note(`定时写 <code>${cron}</code>（UTC），等于北京时间 ${time}。服务器时区如果是 CST，直接写 <code>${(+time.split(':')[0])} ${time.split(':')[1]} * * *</code>。`)}`) +

        codeBlock('d', PY_DAILY, 'daily_digest.py') +

        ui.card('不想维护服务器？用 GitHub Actions', `<pre class="tagcode">${esc(`name: daily-digest
on:
  schedule:
    - cron: "${cron}"   # UTC，等于北京时间 ${time}
  workflow_dispatch:
jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: 拉昨日数据
        run: python fetch_data.py    # 用 SP-API 或后台导出的 CSV
      - name: 推送
        run: python daily_digest.py
        env:
          FEISHU_WEBHOOK: \${{ secrets.FEISHU_WEBHOOK }}
          SHOP_NAME: ${shop}`)}</pre>
        <div class="pfoot2"><button class="btn sm" data-copy="${esc(`cron: "${cron}"`)}">复制 cron 表达式</button></div>`) +

        ui.card('四个指标的口径（别用错）', ui.tbl(
          ['指标', '算法', '什么时候看'],
          [
            ['ACOS', '广告花费 ÷ 广告销售额', '每天。超过毛利率就是在亏钱买排名'],
            ['毛利率', '（销售额 − 货成本 − 广告费）÷ 销售额', '每周。日波动太大，看 7 日均值'],
            ['保本 ROAS', '1 ÷ 毛利率', '投放前算一次，写进投放表第一行'],
            ['库存天数', '当前库存 ÷ 近 7 日日均销量', '每天。低于 14 天必须下单补货']
          ]) +
          ui.note(`当前参数下，保本 ROAS ≈ ${(1 / Math.max(gm, .05)).toFixed(2)}。广告 ROAS 低于这个数，每一单都在亏。`)) +

        ui.card('别把日报做成第二个后台', ui.ul([
          '只放 6 个数字，多了没人看；想看细节点进链接。',
          '每条异常必须跟一个动作，否则删掉这条告警。',
          '周一那条加一段「上周结论」，否则日报会变成惯性阅读。',
          '连续两周没有因为日报改过任何决策，就说明指标选错了。'
        ]))
    };
  }
};

/* =========================================================
   文档章节：情绪价值定位（第 01 步报告里的第五章）
   ========================================================= */
function emotionSection(ctx, n) {
  const v = Object.assign(
    { cost: '42', freight: '9', rate: '7.1', custom: '可改配色 / 配件 / 套装', content: '每周 3–8 条', story: '有一句话定位' },
    (ctx.__vals && ctx.__vals.emotion) || {}
  );
  const es = emoScore(ctx, v);
  const path = emoPath(es.score);
  const { st } = hotOf(ctx);
  const med = ctx.price ? num(ctx.price, st.med) : st.med;
  const sym = mkOf(ctx.market).sym;
  const price = Math.round(med * path.price);
  const pm = priceModel(price, v, ctx);
  const c = emoCatOf(ctx), mk = es.mk;

  const themeRows = mk.themes.slice(0, 4).map(t => `
    <tr>
      <td><b>${esc(t[0])}</b></td>
      <td>${esc(t[1])}</td>
      <td class="sub2">「${esc(t[2])}」</td>
      <td><div class="tbar"><i style="width:${t[3]}%"></i></div></td>
    </tr>`).join('');

  return `
    <section class="ch" id="ch${n}">
      <h2><i>第${['一', '二', '三', '四', '五', '六', '七', '八', '九'][n - 1]}章</i>情绪与定价</h2>
      <p class="plead">同款货在不同人手里能差出三倍价格，差的不是产品，是「它让人变成什么样」。这一章把情绪拆成三个能算的答案：卖多少钱、有没有定制、产品还是情绪。</p>

      <div class="q3">
        ${qCard('问题一', '卖多少钱', {
    v: sym + price,
    l: path.k === 'story' ? '情绪定价' : path.k === 'white' ? '贴着中位打' : '中位价 + 微溢价',
    txt: `同类头部中位价 ${sym}${med}，落在 ${sym}${Math.round(price * 0.92)}–${sym}${Math.round(price * 1.08)} 之间；扣掉货成本、佣金与履约后毛利 ${pct(pm.gm)}，保本 ROAS ${pm.beRoas.toFixed(2)}。`
  }, 'good')}
        ${qCard('问题二', '有没有定制', {
    v: v.custom,
    l: c.gift >= 3 ? '包装即产品（礼赠属性强）' : '定制换差异，不改结构',
    txt: v.custom === '只能贴标换包装'
      ? '预算全押印刷与包装结构：外盒、内衬、说明卡三件套，单件成本可控在 3–6 元，这是唯一能做的差异。'
      : v.custom === '可改配色 / 配件 / 套装'
        ? '换一个货架上没有的颜色，再加一件配件（收纳袋 / 量杯 / 替换头），感知差异最大、开模费为零。'
        : '只改一个用户一眼能看见的结构（开口 / 卡扣 / 握把），比改十个内部件有效，也更省开模费。'
  }, 'mid')}
        ${qCard('问题三', '产品还是情绪', {
    v: `${path.mix[0]} : ${path.mix[1]}`,
    l: path.mix[1] > path.mix[0] ? '情绪为主' : '产品为主',
    txt: path.mix[1] >= 60
      ? '每 10 条内容，6 条讲「用了之后我变成什么样」，4 条讲参数。参数是证据，不是卖点。'
      : path.mix[1] >= 45
        ? '一半讲效果、一半讲感受：先让人相信有用，再让人想要。'
        : '以实测、对比、拆解为主，情绪只放在开头 3 秒的钩子里。'
  }, 'blue')}
      </div>

      <div class="emtop">
        <div class="emtop-l">${vizGauge(es.score, { max: 100, label: '情绪占比', note: path.name, tone: 'auto' })}</div>
        <div class="emtop-r">
          <div class="cstat">
            <div><b>${sym}${price}</b><span>建议售价</span></div>
            <div><b>${pct(pm.gm)}</b><span>该价位毛利率</span></div>
            <div><b>${pm.beRoas.toFixed(2)}</b><span>保本 ROAS</span></div>
          </div>
          <p class="pconcl">路径是<b>${path.name}</b>：${esc(path.why)}定价不看同行，看用户愿意为「变成什么样」多付多少。</p>
        </div>
      </div>

      <h3>这个价格怎么拆开</h3>
      ${vizStack([
        { k: '货成本+头程', v: Math.max(0, pm.costUsd), c: '#94a3b8' },
        { k: '平台佣金', v: pm.fee, c: '#f0b429' },
        { k: '履约', v: pm.ful, c: '#ef8a3c' },
        { k: '毛利', v: Math.max(0, pm.gp), c: '#0e9f6e' }
      ], { title: '按售价 ' + sym + price + ' 拆解，单位 ' + sym })}
      <p class="pnote">毛利率 ${pct(pm.gm)}，保本 ROAS ${pm.beRoas.toFixed(2)} —— 广告花到这一条线就是在亏货，不是亏钱。</p>

      <h3>${esc(ctx.market || '美国')}市场的人在为什么付钱</h3>
      <div class="mtt">
        ${mk.themes.slice(0, 4).map(t => `
        <div class="mtt-i">
          <div class="mtt-t"><b>${esc(t[0])}</b><span>${esc(t[1])}</span></div>
          <div class="mtt-b"><i style="width:${clamp(t[3], 6, 100)}%"></i></div>
          <div class="mtt-v">${Math.round(t[3])}</div>
        </div>`).join('')}
      </div>
      <p class="pnote">说话方式：${esc(mk.tone)}　最大阻力：${esc(mk.fear)}　凭什么信你：${esc(mk.trust)}</p>

      <p class="pnote">标签墙与内容选题已并入第 03 步「标签集合 · 内容选题」，这里只保留定价与情绪比例——同一件事不写两遍。</p>
    </section>`;
}

function kolBrief(ctx) {
  const prod = ctx.product || '产品';
  const au = tagPick('人群'), sc = tagPick('场景'), em = tagPick('情绪'), fn = tagPick('功能');
  return `【${prod} · 达人 brief】
1. 人设：${au[0] || '真实使用者'}，不要念稿
2. 前 3 秒：出现「${sc[0] || '真实使用场景'}」，先说结果（${em[0] || '省事'}），不说参数
3. 中段：一个可验证的动作 —— ${fn[0] || '实测'}，一镜到底不剪辑
4. 收尾：说出「${em[1] || em[0] || '用了之后的变化'}」这种感受，不要说「推荐购买」
5. 禁区：不写价格、不写绝对化用词、不承诺疗效
6. 交付：竖版 9:16，原片 + 30 秒剪辑各一条`;
}

function tagSync() {
  $$('.tagg').forEach(el => el.classList.toggle('on', TAGSEL.has(el.dataset.tag)));
  const c = $('#tagCount'); if (c) c.textContent = TAGSEL.size;
  const out = $('#tagout'); if (out) out.innerHTML = tagOutHtml(ctxOf());
}

function copyTag(kind) {
  const ctx = ctxOf();
  const prod = ctx.product || '产品';
  const au = tagPick('人群'), sc = tagPick('场景'), em = tagPick('情绪'), fn = tagPick('功能'), pr = tagPick('价格'), vi = tagPick('视觉');

  if (kind === 'topics') {
    const rows = ideaTopics(ctx, { au, sc, em, fn, vi });
    copyText(rows.map((r, i) => `${i + 1}. 【${r[0]}】钩子：${r[1]}｜场景：${r[2]}｜回扣：${r[3]}`).join('\n'));
    toast('5 条选题已复制');
    return;
  }
  if (kind === 'ads') {
    const t = [
      au.length ? '人群：' + au.join(' / ') : '',
      sc.length ? '场景：' + sc.join(' / ') : '',
      em.length ? '情绪钩子：' + em.join(' / ') : '',
      pr.length ? '价格带：' + pr.join(' / ') : ''
    ].filter(Boolean).join('\n');
    if (!t) { toast('先选几个标签再复制'); return; }
    copyText(t); toast('广告定向已复制');
    return;
  }
  if (kind === 'kol') { copyText(kolBrief(ctx)); toast('达人 brief 已复制'); return; }
  if (kind === 'csv') {
    const rows = [['维度', '标签', '权重', '用途']];
    tagGroups(ctx, '全维度').forEach(g => g.tags.forEach(t => {
      if (TAGSEL.has(g.key + '|' + t.t)) rows.push([g.key, t.t, Math.round(t.w), t.use]);
    }));
    if (rows.length < 2) { toast('先选几个标签再导出'); return; }
    const csv = rows.map(r => r.map(x => /[,\"\n]/.test(String(x)) ? '"' + String(x).replace(/"/g, '""') + '"' : x).join(',')).join('\n');
    download((prod || '产品') + '_标签集合.csv', csv);
    return;
  }
}
