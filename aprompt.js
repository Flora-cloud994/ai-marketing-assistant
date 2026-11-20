/* =========================================================
   aprompt.js — 亚马逊商品图提示词
   不出图。只按亚马逊官方图片规范生成可直接粘贴的英文提示词。
   官方口径（Seller Central 商品图片指南 G1881）：
   · 主图纯白背景 RGB 255,255,255
   · 商品占画面 85%，完整不裁切，只展示一次、单一角度
   · 不得有文字、logo、边框、色块、水印、内嵌图
   · 不得出现不随商品出售的配件、道具、人体模型
   · 最长边 500–10,000px，≥1600px 才开启放大镜，JPEG 首选
   · 全站推荐 ≥6 张图 + 1 条视频
   · 图片命名：商品编码.MAIN.jpg / .PT01.jpg
   · 所有图片（含辅图）都不得带文字与价格
   ========================================================= */

/* 每个品类的拍摄要素 */
const AZ_CAT = {
  '厨房小家电': {
    en: 'portable USB-C rechargeable blender',
    mat: 'matte cream-white ABS body, clear tritan jar, brushed stainless steel blade base',
    scene: 'a bright modern kitchen counter with fresh strawberries, half a banana and a glass of berry smoothie',
    person: 'a woman in her early 30s in a casual linen shirt, hands and forearms only in frame',
    detail: 'the six-blade stainless steel base and the locking lid thread',
    access: 'the blender, a short USB-C charging cable and a spare travel lid',
    steps: ['fresh fruit and liquid go in up to the fill line', 'one press on the single button, blending for 30 seconds', 'the jar rinsed under the tap without removing the blade base'],
    pain: 'a bulky countertop blender with a messy clean-up'
  },
  '宠物用品': {
    en: 'self-cleaning pet grooming brush',
    mat: 'sage green soft-touch handle, fine stainless steel pins with rounded tips, one-touch hair release pad',
    scene: 'a light living-room rug next to a calm golden retriever lying down',
    person: 'a woman in her 30s in a knit sweater, hands and forearms only in frame',
    detail: 'the rounded pin tips and the push-button hair release mechanism',
    access: 'the brush, a cleaning comb and a printed quick-start card',
    steps: ['the brush glides along the coat in the direction of hair growth', 'loose hair collects on the pins', 'one press retracts the pins and the hair pad lifts away'],
    pain: 'a brush that fills up with hair and has to be picked clean by hand'
  },
  '家居收纳': {
    en: 'set of three foldable fabric storage bins',
    mat: 'oatmeal-beige linen-blend fabric with dark leather handles and a rigid base insert',
    scene: 'an open closet shelf with folded towels and a neutral bedroom behind',
    person: 'a woman in her 30s in a soft grey sweater, hands only in frame',
    detail: 'the stitched leather handle and the reinforced base seam',
    access: 'three bins of different sizes stacked together',
    steps: ['the bin pops open from flat in one motion', 'items are loaded and the handles carry the weight', 'the bin folds flat again for storage'],
    pain: 'cardboard boxes that sag, smell and fall apart within a season'
  },
  '3C 数码': {
    en: '3-in-1 foldable wireless charging station',
    mat: 'matte space-grey aluminium with a soft-touch fabric top and a folding phone arm',
    scene: 'a tidy wooden desk with a laptop edge, a notebook and a warm lamp out of focus',
    person: 'a man in his 30s in a plain tee, hands only in frame',
    detail: 'the folding hinge and the anti-slip silicone pad on the charging surface',
    access: 'the charging station, a USB-C cable and a power adapter',
    steps: ['the arm folds up to the preferred angle', 'the phone drops onto the pad and starts charging', 'the whole stand folds flat into a bag'],
    pain: 'three separate chargers and a tangle of cables on the desk'
  },
  '美妆个护': {
    en: 'LED light therapy face mask',
    mat: 'matte charcoal shell with a thin rose-gold trim and a soft silicone inner rim',
    scene: 'a bright bathroom vanity with a folded towel and a small plant',
    person: 'a woman in her early 30s with bare skin, no makeup, relaxed expression',
    detail: 'the inner LED array and the soft silicone rim that sits on the cheekbones',
    access: 'the mask, a USB-C charging cable and a storage pouch',
    steps: ['the mask is charged and switched on', 'it is worn for the session while reading or resting', 'it is wiped clean and stored in the pouch'],
    pain: 'salon appointments that cost a fortune and eat an entire evening'
  },
  '户外运动': {
    en: 'portable folding camping chair',
    mat: 'olive-drab ripstop fabric seat with a black aluminium alloy frame and a side pocket',
    scene: 'a lakeside campsite at golden hour with a tent edge and pine trees out of focus',
    person: 'a man in his 30s in outdoor clothing, hands only in frame',
    detail: 'the aluminium hub joint, the ripstop weave and the stitched side pocket',
    access: 'the chair folded into its carry bag with a strap',
    steps: ['the frame unfolds with one pull', 'the seat locks into place', 'the chair folds back into the carry bag'],
    pain: 'camp chairs that wobble, sink into soft ground and weigh a ton'
  },
  '母婴用品': {
    en: 'silicone baby feeding set',
    mat: 'dusty-pink food-grade silicone with a suction base and soft-tip spoon',
    scene: 'a warm kitchen table with a wooden bowl of fruit and soft morning light',
    person: 'a mother in her early 30s, hands only in frame',
    detail: 'the suction base underside and the soft-tip spoon edge',
    access: 'the divided suction bowl, the spoon and the handled sippy cup',
    steps: ['the bowl is pressed onto the tray until the suction locks', 'food is loaded with the soft-tip spoon', 'everything goes straight into the dishwasher'],
    pain: 'plastic bowls that slide across the tray and end up on the floor'
  },
  '服饰配饰': {
    en: 'minimal leather crossbody bag',
    mat: 'cognac tan smooth full-grain leather with gold-tone hardware and an adjustable strap',
    scene: 'a sunlit stone wall with a linen shirt sleeve entering the frame',
    person: 'a woman in her late 20s, standing, wearing the bag across the body',
    detail: 'the edge stitching, the gold-tone clasp and the adjustable strap holes',
    access: 'the bag with its detachable strap and a cotton dust bag',
    steps: ['the strap is adjusted to the preferred drop', 'the flap clasp opens with one hand', 'the bag sits flat when set down'],
    pain: 'bags that lose their shape after a month and scratch at the first bump'
  },
  '（未填品类）': {
    en: 'the product',
    mat: 'the exact material and colour of the real product',
    scene: 'a clean bright interior with a neutral surface',
    person: 'a person in their early 30s, hands only in frame',
    detail: 'the most distinctive construction detail',
    access: 'the product and everything included in the box',
    steps: ['step one', 'step two', 'step three'],
    pain: 'the common frustration this product removes'
  }
};

/* 打光与氛围：只改照片的质感，主图永远是纯白底 */
const AZ_STYLE = {
  '纯白棚拍': { light: 'large softbox key light from the upper left with an even fill from the right', mood: 'bright clean interior, natural colour balance' },
  '明亮家居': { light: 'soft natural window light from the side, airy and bright', mood: 'light interior, warm neutral palette' },
  '户外自然': { light: 'late-afternoon sunlight with soft open shade', mood: 'natural outdoor setting, golden rim light' },
  '极简台面': { light: 'one directional soft light with a long gentle falloff', mood: 'minimal styled surface, muted palette' },
  '高级暗调': { light: 'low-key lighting with a single rim light and soft fill', mood: 'dark charcoal backdrop, moody contrast' }
};

const AZ_MKT_PERSON = {
  '北美': 'a North American',
  '欧洲': 'a European',
  '日本': 'a Japanese',
  '中东': 'a Middle Eastern'
};

/* 官方硬指标 → 提示词里写死的那一句 → 出图后怎么验 */
const AZ_RULES = [
  ['背景', '主图纯白背景，RGB 255 / 255 / 255', 'seamless pure white background (RGB 255 255 255)', '取色器点四角，必须 255/255/255；254 也会被判非纯白'],
  ['占比', '商品占画面 85%', 'product fills 85% of the frame', '量产品外接框，面积 ≥85%，四周留白均匀'],
  ['完整', '不可裁切任何部位', 'entire product fully inside the frame', '四条边都要留白，不能被画框切到'],
  ['单一', '只展示一次、单一角度', 'front three-quarter view, shown once', '不能正反面同框、不能出现第二件'],
  ['无附加', '无文字 / logo / 边框 / 色块 / 水印 / 内嵌图', '见负向提示词', '放大 200% 扫一遍边缘，找小字与水印'],
  ['无道具', '不出现不随商品出售的配件、道具、人体模型', 'no props, no hands, no mannequin', '画面里只有商品本身（服装类除外）'],
  ['尺寸', '最长边 500–10,000px，≥1600px 才有放大镜', '2000 × 2000 px', '导出后看像素，1600 以下没有放大功能'],
  ['格式', 'JPEG 首选，sRGB，单张 ≤10MB', 'export JPEG, sRGB', '不要用动图 GIF，不要用 CMYK']
];

/* ---------------- 提示词拼装 ---------------- */
const azCap = t => String(t || "").charAt(0).toUpperCase() + String(t || "").slice(1);

function azCtx(v, ctx) {
  const X = AZ_CAT[ctx.category] || AZ_CAT['（未填品类）'];
  const S = AZ_STYLE[v.style] || AZ_STYLE['纯白棚拍'];
  const who = AZ_MKT_PERSON[v.mk] || AZ_MKT_PERSON['北美'];
  return {
    prod: (v.product || X.en).trim(),
    mat: (v.mat || X.mat).trim(),
    scene: X.scene,
    who: (who + ' ' + X.person.replace(/^(a|an)\s+/i, '')).replace(/\s+/g, ' '),
    detail: X.detail,
    access: X.access,
    steps: X.steps,
    pain: X.pain,
    light: S.light,
    mood: S.mood,
    cat: ctx.category || '（未填品类）'
  };
}

function azSlotList(A) {
  return [
    {
      key: 'pt01', no: 'PT01', name: '场景图', use: '让人第一眼看到「我用在哪」，是六张辅图里最该先做的一张',
      en: `Lifestyle photograph of the ${A.prod} on location — ${A.scene}. ${azCap(A.who)}, caught in the middle of using it. ${azCap(A.light)}, ${A.mood}, product tack sharp and clearly recognisable, true real-world scale, background softly out of focus, no text, no logo, no watermark, no other brand visible, 1:1, 2000 x 2000 px`,
      note: '辅图允许出现人物与场景，但不许出现竞品、其他品牌 logo、任何文字。人物只露手或半身，别抢产品。'
    },
    {
      key: 'pt02', no: 'PT02', name: '细节特写', use: '证明做工，打消「一看就是便宜货」的疑虑',
      en: `Extreme close-up of ${A.detail} on the ${A.prod}, ${A.mat}, raking side light to reveal surface texture and material quality, shallow depth of field, clean neutral background, the detail fills 70% of the frame, macro lens, no text, no logo, no watermark, 1:1, 2000 x 2000 px`,
      note: '一张图只讲一个细节。想讲三个细节就做成三格拼图，但每格都要清晰，不能糊成一片。'
    },
    {
      key: 'pt03', no: 'PT03', name: '尺寸比例', use: '解决「到底多大」——退货率最高的一类疑问',
      en: `The ${A.prod} held in one adult hand for scale, plain light grey seamless background, natural relaxed hand, whole product visible and unobstructed, soft even light, no measuring tape, no numbers, no text, no logo, 1:1, 2000 x 2000 px`,
      note: '尺寸数字不能画在图上（商品图一律禁文字）。要做带数字的尺寸表，放到 A+ 内容或产品描述里。'
    },
    {
      key: 'pt04', no: 'PT04', name: '包装与清单', use: '让买家确认「买回来盒子里都有什么」',
      en: `Top-down flat lay of everything included in the box: ${A.access}, spaced evenly on a light neutral backdrop, soft even lighting, each item fully visible and not overlapping, no text on the packaging, no logos, no price tags, 1:1, 2000 x 2000 px`,
      note: '主图不能出现包装，辅图可以。清单里凡是画出来的东西，必须真的随货发出，否则是「与描述不符」。'
    },
    {
      key: 'pt05', no: 'PT05', name: '使用步骤', use: '降低「买回来不会用」的心理门槛',
      en: `Three-panel step sequence shot from the same camera angle and lighting: panel 1 ${A.steps[0]}, panel 2 ${A.steps[1]}, panel 3 ${A.steps[2]}, hands only, consistent framing, clean bright background, no text, no arrows, no numbers, 1:1, 2000 x 2000 px`,
      note: '步骤数字和箭头属于文字，商品图里不能有。要标注就走 A+ 的图文模块。'
    },
    {
      key: 'pt06', no: 'PT06', name: '痛点对比', use: '把「为什么需要换掉现在这个」讲清楚',
      en: `Side-by-side comparison inside one square frame: left half shows ${A.pain}, right half shows the ${A.prod} solving it, identical camera angle, lens and lighting on both sides, no brand names, no text, no logos, 1:1, 2000 x 2000 px`,
      note: '左边那个「旧方案」不能是竞品品牌，也不能长得像某个竞品，否则会被判贬低对手。'
    }
  ];
}

function azMain(A) {
  return `Professional e-commerce product photograph of a ${A.prod}, ${A.mat}, entire product fully inside the frame, front three-quarter view, product fills 85% of the frame, perfectly centred with even white margins, seamless pure white background (RGB 255 255 255), large softbox key light from the upper left with an even fill from the right, one soft contact shadow directly under the base only, no props, no packaging, no hands, no mannequin, no text, no logo, no watermark, no border, no inset, no reflection of the light stands, tack sharp edge to edge, true-to-life colour, 100 mm macro lens at f/11, 1:1 square, 2000 x 2000 px, commercial catalogue quality`;
}

function azNeg() {
  return 'text, letters, numbers, watermark, logo, brand name, packaging label, border, frame, colour block, inset image, collage, grey background, off-white background, gradient background, checkerboard transparency grid, floor line, horizon line, props, extra accessories, hands, model, mannequin, duplicate product, multiple angles, back view in the same frame, cropped product, cut-off edges, hard cast shadow, light stand reflection, vignette, oversaturated colour, plastic CGI look, 3d render, illustration, cartoon, blurry, low resolution, jpeg artifacts';
}

function azAplus(A) {
  return [
    {
      no: 'A+ 970×600', name: '标准图文模块',
      en: `Wide lifestyle banner of the ${A.prod} on location — ${A.scene} — composition weighted to the right with clean empty space on the left third for a headline, ${A.light}, ${A.mood}, no text, no logo, generous negative space, 970 x 600 px, high resolution`,
      note: '左三分之一留空是留给标题的。图片本身依然不放字，字在后台模块里单独填。'
    },
    {
      no: 'A+ 1464×600', name: '全宽横幅',
      en: `Full-width brand banner of the ${A.prod} placed on a styled surface with ${A.access}, cinematic deep focus, ${A.light}, ${A.mood}, generous margin at the top and bottom for safe cropping on mobile, no text, no logo, 1464 x 600 px, high resolution`,
      note: '全宽图在手机上会被裁成窄条，产品必须落在中间安全区，别贴边。'
    },
    {
      no: 'A+ 300×300', name: '四宫格单图',
      en: `Square detail tile, close crop of ${A.detail} on a soft neutral background, lighting matched to a set of four tiles, subject centred, no text, no logo, 300 x 300 px, high resolution`,
      note: '四宫格要成套出图，用同一次对话连续生成四张，光和色温才一致。'
    }
  ];
}

/* 全部提示词导出成 txt */
function azAllText(v, ctx) {
  const A = azCtx(v, ctx);
  const L = azSlotList(A), P = azAplus(A);
  const bar = '='.repeat(60);
  let s = `亚马逊商品图提示词 · ${ctx.product || A.prod}\n品类：${A.cat}　风格：${v.style || '纯白棚拍'}　市场：${v.mk || '北美'}\n${bar}\n\n`;
  s += `[MAIN 主图 · 1:1 · 2000x2000 · 纯白底]\n${azMain(A)}\n\n`;
  L.forEach(x => { s += `[${x.no} ${x.name}]\n${x.en}\n\n`; });
  P.forEach(x => { s += `[${x.no} ${x.name}]\n${x.en}\n\n`; });
  s += `${bar}\n[通用负向提示词 / Negative prompt]\n${azNeg()}\n\n`;
  s += `${bar}\n参数：Midjourney --ar 1:1 --style raw --s 50 --q 2\nFlux / 即梦 / Seedream：2048x2048，steps 30，guidance 3.5\n导出：JPEG · sRGB · 最长边 1600px 以上 · 单张 ≤10MB\n命名：B0XXXXXXXX.MAIN.jpg / .PT01.jpg … .PT06.jpg\n`;
  return s;
}

/* ---------------- 渲染 ---------------- */
function azCode(text, i) {
  return `<div class="pcode" id="azp${i}">${esc(text)}</div>
    <div class="prow-b"><button class="mini3 p" data-copy="${esc(text)}">复制提示词</button>
    <span class="prow-s">${text.length} 字符</span></div>`;
}

function azPrompt(v, ctx) {
  const A = azCtx(v, ctx);
  const slot = v.slot || '全套（主图 + 6 张辅图）';
  const all = slot.indexOf('全套') === 0;
  const L = azSlotList(A), P = azAplus(A);
  const main = azMain(A), neg = azNeg();

  const showMain = all || slot === '主图 MAIN';
  const showAplus = all || slot.indexOf('A+') === 0;
  const one = L.filter(x => slot.indexOf(x.no) === 0);
  const list = all ? L : (one.length ? one : []);

  let html = `<div class="sbar">这个工具<b>不出图</b>，只给提示词。每一条都按亚马逊官方图片规范写死：主图纯白底 RGB 255、商品占 85%、完整不裁切、单一角度、无文字水印边框，长边 2000px、1:1、JPEG。直接粘到 Midjourney / Flux / 即梦就能出图。</div>`;

  if (showMain) {
    html += ui.card('MAIN 主图 · 决定点击率的那一张', `
      <div class="azmeta">${ui.tag('1:1 方图')}${ui.tag('2000 × 2000 px')}${ui.tag('RGB 255 纯白底', 'g')}${ui.tag('商品占 85%')}${ui.tag('无文字水印', 'g')}</div>
      ${azCode(main, 1)}
      <div class="fx">负向提示词（一起粘，模型才不会乱加东西）：</div>
      ${azCode(neg, 2)}`);
  }

  if (list.length) {
    html += ui.card(all ? '六张辅图 · 按这个顺序排转化最好' : `${list[0].no} ${list[0].name}`, list.map((x, i) => `
      <div class="azslot">
        <div class="azslot-h"><b>${x.no}</b>${x.name}<span>${x.use}</span></div>
        ${azCode(x.en, 10 + i)}
        <div class="fx">${x.note}</div>
      </div>`).join(''));
  }

  if (showAplus) {
    html += ui.card('A+ 内容图 · 这里才允许出现文字', P.map((x, i) => `
      <div class="azslot">
        <div class="azslot-h"><b>${x.no}</b>${x.name}<span>${x.note}</span></div>
        ${azCode(x.en, 30 + i)}
      </div>`).join('') +
      ui.note('A+ 的尺寸与模块以后台当前提供的为准（图文模块常见 970×600，全宽 1464×600，四宫格 300×300）。A+ 里的文字由后台单独填写，图片本身依然不要烤字，改文案时不用重做图。'));
  }

  html += ui.card('出图参数（照着填）', ui.kv([
    ['Midjourney', '后缀加 --ar 1:1 --style raw --s 50 --q 2；要 2K 再加 --v 7 并用 upscale'],
    ['Flux / 即梦 / Seedream', '尺寸 2048×2048，steps 30，guidance 3.5；风格强度调低，否则产品会变形'],
    ['出图后', '缩到 2000×2000，导出 JPEG（sRGB，质量 90），单张 ≤10MB'],
    ['放大镜', '最长边必须 ≥1600px，亚马逊才给放大功能；这条直接影响转化'],
    ['文件命名', 'B0XXXXXXXX.MAIN.jpg / .PT01.jpg … .PT06.jpg，用句点分隔，用空格或横线会传不上去'],
    ['数量', '官方建议 ≥6 张图 + 1 条视频；主图 1 张，辅图 6 张正好'],
    ['视频', '1080p 以上，15–30 秒，首帧就别放文字']
  ])) +
  ui.card('官方硬指标 → 提示词怎么落实', ui.tbl(
    ['项目', '亚马逊官方要求', '出图后怎么验'],
    AZ_RULES.map(r => [`<b>${r[0]}</b>`, `${r[1]}<div class="mono" style="margin-top:3px">${esc(r[2])}</div>`, r[3]]))) +
  ui.card('发布前自检（一条一条打勾）', ui.ol([
    '四角取色必须 255/255/255，254 也会被判非纯白背景',
    '产品外接框面积 ≥85%，四周留白均匀，不能一边贴边',
    '产品四条边都不出框、不裁切，配件也算在商品里',
    '画面里只有一个产品、一个角度，不同时出现正反面',
    '放大到 200% 扫一遍：无小字、无水印、无 logo、无边框、无色块',
    '无道具、无手、无模特（成人服装除外）、无包装（包装本身是卖点除外）',
    '最长边 ≥1600px，JPEG，sRGB，单张 ≤10MB',
    '文件名是 商品编码.MAIN.jpg 这种格式，用句点分隔',
    '辅图里没有竞品品牌、没有买家评价截图、没有五星图案、没有 free shipping 这类宣称',
    '每张图都与标题描述一致：颜色、数量、尺寸、材质'
  ])) +
  ui.card('红线（这几条最容易导致 Listing 被抑制）', ui.ul([
    '<b>主图必须是实际商品的真实专业照片</b>：官方明确排除图形、插画、实物模型、占位图。纯 AI 生成的虚构产品图有被判不合规的风险 —— 主图这条提示词请当<b>拍摄脚本</b>交给摄影师，辅图的场景可以 AI 出图、再把实拍产品合成上去',
    '所有商品图（含辅图）都不得出现文字与价格 —— 尺寸数字、步骤序号、卖点短语都属于文字，要放就放 A+',
    '主图不得出现包装，除非包装本身是卖点（比如礼盒、收纳包）',
    '服装类：成人服装主图必须模特站立，不能坐、靠、躺；儿童与婴儿服装必须平铺、不用模特',
    '鞋类：主图单只鞋、45° 朝左；配饰与多件装平铺、不用模特',
    '不得出现裸体或性暗示；美妆个护类不要暗示医疗功效',
    '不得出现亚马逊 logo 或其变体，也不得出现 Prime、Alexa 之类标志'
  ])) +
  ui.card('导出全部提示词', `
    <div class="fx2">一次拿走七张商品图 + 三张 A+ 图的提示词、负向词、参数与命名规则，存成 txt 交给设计或摄影师。</div>
    <div class="prow-b" style="margin-top:8px">
      <button class="mini3 p" data-dl="${esc(azAllText(v, ctx))}" data-name="${esc((ctx.product || 'product') + '_亚马逊商品图提示词.txt')}">下载全部提示词 .txt</button>
    </div>`);

  return { html };
}
