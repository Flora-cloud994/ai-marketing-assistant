/* =========================================================
   subs.js — 形态内部细分 + 功能细分
   ---------------------------------------------------------
   上一版「先归类」拿的是品类（服饰配饰）下的全部画像：
   背带裤旁边站着连衣裙、T恤、鞋、内衣——那不是细分，那是别的生意。
   真正决定对手的是「形态」里再切一刀：
     背带裤 → 牛仔 / 工装 / 阔腿 / 背带短裤 / 孕妇 / 大码 / 灯芯绒
   再往下一层是「功能」：同样是背带裤，卖的是显高、减龄、
   哺乳方便、遮肚、防走光——六种不同的人、六组不同的搜索词。

   数据格式
   形态：[细分名, 识别正则, 结构/做法差异, 价位低, 价位高, 核心人群, 英文搜索词]
   功能：[功能主张, 谁在买, 英文搜索词, 现有货的短板, 可下手的地方]
   ========================================================= */

const SUBS = {
  /* ---------------- 服饰配饰 ---------------- */
  overalls: [
    ['牛仔背带裤', /牛仔|丹宁|denim/i, '12oz 硬挺丹宁，直筒或微阔，前胸方袋', 26, 46, '18–28 学生、通勤新人', 'womens denim overalls'],
    ['工装背带裤', /工装|多袋|utility|cargo/i, '多口袋、抽绳腰、防泼水混纺', 28, 52, '20–32 街头 / 户外风', 'womens cargo overalls'],
    ['阔腿背带裤', /阔腿|宽松|wide|baggy/i, '裤管 60cm 以上，垂感面料，高腰线', 30, 55, '22–35 显瘦刚需', 'wide leg overalls'],
    ['背带短裤', /短裤|热裤|shorts/i, '膝上 8–12cm，裆位短，露腿', 18, 34, '16–26 夏季 / 度假', 'overall shorts women'],
    ['孕妇背带裤', /孕妇|孕期|maternity/i, '腹围可放 20cm，侧边暗扣，托腹剪裁', 32, 58, '孕中期–产后 6 个月', 'maternity overalls'],
    ['大码背带裤', /大码|胖|plus|加大/i, 'XXL–5XL，臀围放量，肩带加宽防勒', 30, 56, 'US14–24，被版型劝退的人', 'plus size overalls'],
    ['灯芯绒背带裤', /灯芯绒|绒|corduroy|velvet/i, '条绒 8–11 坑，秋冬厚度，保暖', 29, 49, '秋冬换季、复古穿搭', 'corduroy overalls'],
    ['连体工装裤', /连体|jumpsuit|romper/i, '无背带扣，全身一体，腰带收腰', 32, 62, '25–38 通勤 / 约会', 'utility jumpsuit women']
  ],
  apparel: [
    ['T恤 / 打底', /T恤|恤|短袖|tee|t-shirt/i, '棉或混纺，克重 160–220g，走量款', 12, 26, '全年龄，价格决定一切', 'oversized t shirt women'],
    ['卫衣 / 帽衫', /卫衣|帽衫|hoodie|sweatshirt/i, '抓绒 280–400g，落肩，印花或素色', 24, 48, '16–30 学生 / 街头', 'oversized hoodie women'],
    ['衬衫', /衬衫|衬衣|shirt|blouse/i, '棉麻 / 雪纺，版型从修身到 oversize', 22, 46, '25–40 通勤', 'linen shirt women'],
    ['连衣裙', /连衣裙|裙|dress/i, '一片式，长度与腰线决定人群', 20, 52, '18–40，场景驱动', 'midi dress women'],
    ['长裤 / 阔腿裤', /长裤|阔腿裤|西裤|裤(?!架)/i, '腰型 + 裤长 + 面料垂感三要素', 22, 48, '22–40 通勤 / 日常', 'wide leg pants women'],
    ['外套 / 夹克', /外套|夹克|风衣|大衣|jacket|coat/i, '防风防水或保暖，季节性强', 38, 92, '换季前 1 个月集中买', 'lightweight jacket women']
  ],
  shoes: [
    ['运动鞋 / 跑鞋', /运动鞋|跑鞋|球鞋|sneaker|running/i, '缓震中底 + 透气网面，尺码误差小', 32, 78, '18–45 通勤 / 健身', 'running shoes women'],
    ['帆布鞋', /帆布|canvas/i, '硫化底，薄，百搭，复购靠颜色', 22, 48, '16–28 学生', 'canvas sneakers women'],
    ['靴子', /靴|boot/i, '筒高 12–40cm，跟高决定场景', 45, 120, '秋冬换季', 'ankle boots women'],
    ['拖鞋 / 凉鞋', /拖鞋|凉鞋|slipper|sandal/i, 'EVA 或皮革，轻量，家居 / 外出两分', 15, 42, '夏季 + 居家全年', 'slide sandals women'],
    ['鞋垫 / 配件', /鞋垫|鞋带|撑|insoles|laces/i, '功能件，靠参数说服（足弓、厚度）', 9, 24, '有足部问题的人', 'arch support insoles']
  ],
  underwear: [
    ['文胸', /文胸|内衣|bra/i, '尺码体系复杂，无钢圈 / 聚拢 / 运动三分', 18, 46, '全年龄，尺码痛点极强', 'seamless bra women'],
    ['内裤', /内裤|三角|平角|underwear|panties/i, '面料（棉 / 冰丝）+ 版型（中腰 / 高腰）', 12, 30, '复购品，5 条起买', 'cotton underwear women'],
    ['家居服 / 睡衣', /睡衣|家居服|pajama|sleepwear/i, '套装或连体，面料软度决定评价', 22, 52, 'Q4 礼赠 + 换季', 'satin pajama set women'],
    ['袜子', /袜|sock/i, '厚度 + 长度 + 是否防滑，走量', 8, 20, '凑单 / 复购', 'cotton socks women']
  ],
  swimwear: [
    ['连体泳衣', /连体|one.?piece/i, '包覆性强，遮肚，竞速或度假两路', 26, 58, '25–45 遮肉需求', 'one piece swimsuit women'],
    ['分体比基尼', /比基尼|分体|bikini/i, '上衣 + 下装分开卖，尺码可混搭', 22, 52, '18–30 度假拍照', 'high waisted bikini'],
    ['泳裤 / 冲浪服', /泳裤|冲浪|rash|boardshort/i, '防晒 UPF50+，防磨，运动向', 24, 56, '冲浪 / 亲子水上活动', 'rash guard swim shirt'],
    ['大码泳衣', /大码|plus|加大/i, '胸围到 4XL，内置定型，遮副乳', 32, 66, 'US14–24 被尺码劝退', 'plus size swimsuit']
  ],
  accessory: [
    ['围巾 / 披肩', /围巾|披肩|scarf/i, '材质（羊绒 / 仿羊绒）+ 尺寸', 14, 42, 'Q4 礼赠', 'pashmina scarf women'],
    ['帽子', /帽(?!架|柜|钩|夹)/i, '帽围可调 + 帽檐形状', 12, 34, '防晒 / 造型', 'bucket hat women'],
    ['腰带', /腰带|皮带|belt/i, '宽度 + 扣型，尺寸表是关键', 12, 36, '通勤 / 连衣裙配套', 'leather belt women'],
    ['首饰', /项链|耳环|手链|戒指|jewelry|necklace|earring/i, '材质（925 / 合金）+ 是否过敏', 10, 38, '礼赠 + 自用叠戴', 'gold plated necklace'],
    ['包袋', /包|bag|tote|purse/i, '容量 + 背法 + 面料，通勤 / 出游两路', 18, 62, '通勤 / 学生', 'crossbody bag women']
  ],

  /* ---------------- 3C 数码 ---------------- */
  charge: [
    ['氮化镓多口充电器', /氮化镓|gan|多口|pd/i, 'GaN 三代，65–140W，2C1A', 22, 58, '出差带一机多用', 'gan charger 100w'],
    ['磁吸充电宝', /磁吸|magsafe|无线充电宝/i, '磁吸 + 5000–10000mAh，贴背即充', 19, 45, 'iPhone 用户，通勤', 'magsafe battery pack'],
    ['大容量充电宝', /20000|大容量|充电宝|power bank/i, '20000mAh 以上，可上飞机，双口', 26, 55, '旅行 / 户外', '20000mah power bank'],
    ['车载充电器', /车载|车充|car charger/i, '点烟口，双口 30–65W', 12, 29, '车主，一次买两个', 'usb c car charger']
  ],
  cable: [
    ['编织快充线', /编织|尼龙|braided/i, '尼龙编织 + 尼龙芯，抗折 1 万次', 8, 19, '换线刚需，复购 2–3 条', 'braided usb c cable'],
    ['磁吸 / 收纳线', /磁吸|收纳|magnetic/i, '自卷或磁吸收纳，桌面整洁', 11, 26, '桌面党 / 车内', 'magnetic charging cable'],
    ['多合一短线', /多合一|三合一|短线|short/i, '10–30cm，钥匙扣 / 包里备用', 9, 22, '随身携带', 'short usb c cable'],
    ['排插 / 桌面电源', /排插|插座|插线板|power strip/i, '带 USB，线长 1.5–3m，防雷', 18, 42, '租房 / 桌面改造', 'power strip surge protector']
  ],
  earbud: [
    ['开放式耳机', /开放|骨传导|open.?ear|bone/i, '不入耳，挂耳，运动中听环境音', 29, 78, '跑步 / 骑行 / 耳道敏感', 'open ear headphones'],
    ['TWS 入耳', /蓝牙耳机|tws|earbud/i, '入耳 + 充电仓，ANC 主动降噪', 22, 62, '通勤 / 通话', 'wireless earbuds anc'],
    ['头戴耳机', /头戴|over.?ear|headphone/i, '包耳，续航 30h+，棉套可换', 35, 92, '办公 / 长时间佩戴', 'over ear headphones'],
    ['便携音箱', /音箱|speaker/i, 'IPX7 防水，10–20W，挂绳', 24, 62, '户外 / 浴室', 'portable bluetooth speaker']
  ],
  stand: [
    ['桌面支架', /桌面|床上|折叠|desk/i, '铝合金折叠，角度 0–135°', 12, 32, '桌面办公 / 追剧', 'adjustable phone stand desk'],
    ['车载支架', /车载|出风口|car mount/i, '出风口 / 吸盘，单手取放', 13, 34, '车主，看重夹持力', 'car phone holder mount'],
    ['磁吸支架', /磁吸|magsafe/i, '磁环 + 引磁片，横竖两用', 11, 28, 'iPhone 12 以上', 'magsafe phone stand'],
    ['平板 / 显示器支架', /平板|ipad|显示器|tablet/i, '承重 1kg 以上，阻尼可调', 22, 56, 'iPad 生产力 / 床上', 'tablet stand aluminum']
  ],
  phoneCase: [
    ['透明防黄壳', /透明|防黄|clear/i, 'TPU + 抗黄变涂层，0.8mm', 9, 22, '想露手机原色', 'clear phone case anti yellow'],
    ['磁吸壳', /磁吸|magsafe/i, '内置磁环，兼容磁吸配件', 12, 28, '磁吸生态用户', 'magsafe case iphone'],
    ['防摔壳', /防摔|军规|rugged/i, '四角气囊，2m 跌落', 13, 30, '手滑 / 户外', 'rugged phone case'],
    ['钢化膜', /膜|钢化|screen protector/i, '9H，2.5D 边，贴膜工具包', 7, 18, '一次买 2–3 片', 'tempered glass screen protector']
  ],
  keyboard: [
    ['机械键盘', /机械|mechanical|轴/i, '68/87/104 配列，热插拔，三模', 35, 88, '码字 / 游戏，愿为手感付费', 'hot swap mechanical keyboard'],
    ['矮轴 / 便携', /矮轴|便携|low.?profile/i, '厚度 <15mm，蓝牙三设备', 32, 78, '差旅 / iPad', 'low profile wireless keyboard'],
    ['人体工学', /人体工学|ergonomic|分体/i, '负角度 / 分体，护腕托', 42, 98, '手腕痛的人', 'ergonomic split keyboard'],
    ['鼠标 / 外设', /鼠标|mouse|触控板/i, '静音 / 垂直 / 轻量，回报率', 16, 49, '办公静音 + 游戏两路', 'vertical ergonomic mouse']
  ],
  monitor: [
    ['便携屏', /便携|portable/i, '15.6"，USB-C 单线，400g', 62, 148, '差旅 / Switch 副屏', 'portable monitor 15.6'],
    ['办公显示器', /办公|2k|4k|27/i, '27" 2K/4K，低蓝光，升降', 118, 268, '居家办公', '27 inch 4k monitor'],
    ['便携三屏', /三屏|双屏|dual/i, '成套三屏，磁吸或支架', 148, 320, '金融 / 程序员', 'triple portable monitor'],
    ['显示器支架臂', /支架臂|悬臂|显示器支架|mount arm/i, '承重 9kg，气弹簧', 32, 78, '桌面改造', 'monitor arm gas spring']
  ],
  audioGear: [
    ['USB 麦克风', /麦克风|mic/i, '心形指向，即插即用，防震架', 32, 88, '播客 / 直播 / 会议', 'usb condenser microphone'],
    ['声卡 / 混音器', /声卡|混音|mixer|audio interface/i, '多路输入，监听返送', 45, 128, '直播 / 录音入门', 'usb audio interface'],
    ['桌面音箱', /桌面音箱|监听|speaker/i, '2.0 有源，3–5 寸', 52, 138, '桌面听音', 'desktop speakers powered'],
    ['领夹麦', /领夹|lavalier|无线麦/i, '无线 2.4G，降噪，30m', 26, 68, '短视频口播', 'wireless lavalier microphone']
  ],
  network: [
    ['家用路由', /路由|router|mesh/i, 'WiFi6 / 6E，双频或 mesh', 42, 128, '大户型 / 游戏', 'wifi 6 router mesh'],
    ['随身 WiFi', /随身|mifi|4g|5g/i, '插卡即用，续航 10h', 38, 98, '差旅 / 租房', 'portable wifi hotspot'],
    ['家用摄像头', /摄像头|监控|camera|cam/i, '2K，云台，人形追踪', 22, 58, '看娃 / 看宠 / 防盗', 'indoor security camera 2k'],
    ['信号扩展', /扩展|中继|extender/i, '即插即用，穿墙', 18, 46, '信号死角', 'wifi extender long range']
  ],

  /* ---------------- 宠物用品 ---------------- */
  petFeed: [
    ['自动喂食器', /喂食|投食|feeder/i, '定时 4–6 餐，容量 4–6L，防卡粮', 32, 78, '上班族 / 出差', 'automatic cat feeder'],
    ['不锈钢饮水机', /饮水|水泵|fountain/i, '2–3L，循环过滤，静音泵', 24, 58, '猫多 / 怕毛', 'cat water fountain stainless'],
    ['陶瓷碗架', /碗|食盆|bowl/i, '陶瓷 + 倾斜 15°，护颈', 15, 36, '扁脸猫 / 大狗', 'elevated pet bowl ceramic'],
    ['便携水壶', /便携|外出|travel/i, '随身 250–400ml，单手出水', 11, 26, '遛狗 / 出行', 'portable dog water bottle']
  ],
  petLitter: [
    ['全封闭猫砂盆', /全封闭|封闭|covered/i, '顶入或前入，带活性炭滤片', 32, 72, '小户型 / 怕味', 'covered litter box'],
    ['自动猫砂盆', /自动|自清洁|automatic/i, '滚筒自筛，APP 记录', 148, 380, '多猫家庭 / 出差', 'self cleaning litter box'],
    ['顶入式', /顶入|top.?entry/i, '顶部落砂垫，防带砂', 28, 62, '怕沙发带砂', 'top entry litter box'],
    ['猫砂 / 垫', /猫砂(?!盆)|砂垫|mat/i, '豆腐砂 / 膨润土 / 控砂垫', 12, 34, '高频复购', 'tofu cat litter']
  ],
  petBed: [
    ['可拆洗圆窝', /圆窝|猫窝|狗窝|可拆|washable/i, '仿兔毛 + 记忆棉，全拆洗', 22, 52, '中小型犬猫', 'washable round pet bed'],
    ['宠物沙发床', /沙发|sofa|床/i, '带靠背，防滑底', 32, 78, '大型犬 / 老年犬', 'orthopedic dog bed'],
    ['凉感垫', /凉感|冰垫|cooling/i, '凝胶 / 凉感纤维，夏季', 16, 38, '夏季刚需', 'cooling pet mat'],
    ['猫抓板 / 猫树', /猫抓|抓板|scratcher|tree/i, '瓦楞纸 / 剑麻，可换芯', 18, 62, '护沙发', 'cat scratcher cardboard']
  ],
  petToy: [
    ['益智漏食', /漏食|益智|puzzle/i, '慢食 + 嗅闻，可调难度', 12, 32, '拆家 / 独处焦虑', 'puzzle dog toy'],
    ['发声毛绒', /发声|毛绒|squeak|plush/i, '内置发声器，耐咬缝线', 9, 24, '幼犬 / 小型犬', 'squeaky plush dog toy'],
    ['耐咬橡胶', /耐咬|橡胶|chew|rubber/i, '天然橡胶，可塞零食', 11, 28, '中大型犬', 'tough dog chew toy'],
    ['逗猫棒 / 激光', /逗猫|激光|wand|laser/i, '可换头，伸缩杆', 8, 22, '室内猫', 'interactive cat wand toy']
  ],
  petGroom: [
    ['除毛刷', /除毛|去毛|brush|deshed/i, '一键退毛，针距 1.5mm', 11, 28, '换毛季刚需', 'pet deshedding brush'],
    ['电动剃毛器', /剃毛|推子|clipper/i, '低噪 45dB，陶瓷刀头', 24, 62, '长毛 / 夏天', 'quiet pet clipper'],
    ['指甲剪 / 磨甲', /指甲|磨甲|nail/i, '带挡片，防剪深', 8, 22, '新手主人', 'pet nail grinder'],
    ['洗护 / 烘干', /洗澡|烘干|shampoo|dryer/i, '烘干箱或吹水机，恒温', 42, 168, '多宠 / 长毛', 'pet dryer box']
  ],
  petLeash: [
    ['伸缩牵引绳', /伸缩|retractable/i, '5–8m，一键锁定，承重 30kg', 14, 36, '公园遛狗', 'retractable dog leash'],
    ['胸背带', /胸背|harness/i, 'Y 型减压，反光条，三档调节', 16, 42, '爆冲 / 小体型', 'no pull dog harness'],
    ['防丢项圈', /项圈|防丢|airtag|collar/i, '可挂 AirTag，快拆扣', 12, 30, '怕丢狗 / 猫', 'airtag dog collar'],
    ['双狗分绳', /双头|双狗|double/i, '一拖二，防缠绕', 13, 32, '多狗家庭', 'double dog leash coupler']
  ],
  petPad: [
    ['加厚尿垫', /尿垫|吸尿|pad/i, '5 层，吸量 500ml 以上', 15, 36, '幼犬 / 老年犬，复购', 'thick puppy pads'],
    ['可洗尿垫', /可洗|reusable/i, '防水底层，机洗 100 次', 16, 38, '长期使用，省耗材', 'washable pee pads'],
    ['训练诱导剂', /诱导|训练|training/i, '气味引导，定点排便', 9, 22, '新养狗', 'potty training spray'],
    ['宠物尿裤', /尿裤|diaper/i, '公狗腹围带 / 母狗生理裤', 12, 30, '生理期 / 失禁', 'dog diapers male']
  ],
  petFood: [
    ['冻干主粮', /冻干|freeze.?dried/i, '肉含量 70%+，复水性', 26, 68, '挑食 / 高蛋白需求', 'freeze dried dog food'],
    ['功能零食', /零食|洁齿|training treat/i, '洁齿 / 关节 / 化毛', 12, 34, '训练 + 保健', 'dental dog treats'],
    ['慢食碗', /慢食|slow.?feed/i, '凸起结构，进食延长 5 倍', 10, 24, '狼吞 / 胀气', 'slow feeder dog bowl'],
    ['储粮桶', /储粮|密封|storage/i, '密封 + 量杯，10–15kg', 18, 46, '大袋粮保存', 'dog food storage container']
  ],

  /* ---------------- 家居收纳 ---------------- */
  storage: [
    ['床下收纳箱', /床下|under.?bed/i, '高度 15–18cm，带轮，可视窗', 18, 42, '小户型 / 换季', 'under bed storage bins'],
    ['折叠收纳箱', /折叠|foldable/i, '牛津布 + 硬板，不用时压平', 14, 34, '租房搬家', 'foldable storage bins'],
    ['分层置物架', /分层|置物架|shelf/i, '免打孔 / 落地，承重标注', 22, 58, '厨房 / 卫浴', 'stackable storage shelf'],
    ['衣柜分隔', /衣柜|分隔|closet|divider/i, '挂式 / 抽屉式，模块化', 16, 44, '衣柜深 55cm 以上', 'closet organizer bins']
  ],
  hanger: [
    ['植绒防滑衣架', /植绒|防滑|flocked/i, '厚度 0.4cm，省 50% 空间', 12, 28, '衣柜拥挤', 'flocked hangers 50 pack'],
    ['多层裤架', /裤架|pants hanger/i, '5–10 层，S 型或伸缩', 14, 34, '西裤 / 牛仔裤多', 'multi layer pants hanger'],
    ['隐形晾衣绳', /晾衣绳|隐形|retractable line/i, '3–4m，免打孔，承重 20kg', 13, 32, '阳台小 / 出差', 'retractable clothesline'],
    ['折叠晾衣架', /晾衣架|drying rack/i, '翼型 / 立式，收起来 10cm', 22, 52, '无阳台 / 阴干', 'folding drying rack']
  ],
  vacuumBag: [
    ['手卷压缩袋', /手卷|travel roll/i, '免泵，卷压排气，差旅用', 10, 26, '行李箱党', 'travel compression bags'],
    ['电泵压缩袋', /电泵|electric pump/i, '配电动泵，30 秒一袋', 22, 52, '换季存被', 'vacuum storage bags with pump'],
    ['挂式压缩袋', /挂式|hanging/i, '衣柜内垂直压缩，防潮', 16, 38, '羽绒服 / 大衣', 'hanging vacuum bags'],
    ['衣物收纳袋', /收纳袋|收纳包|packing cube/i, '分装 + 网面可视', 12, 32, '旅行分装', 'packing cubes set']
  ],
  bagpack: [
    ['通勤双肩包', /双肩|backpack/i, '15.6" 电脑仓，防泼水，USB 口', 24, 62, '通勤 / 学生', 'laptop backpack women'],
    ['折叠旅行包', /折叠|旅行包|duffel/i, '可折成巴掌大，套行李箱', 16, 42, '备买 / 购物', 'foldable travel duffel'],
    ['收纳包套装', /收纳|organizer/i, '多尺寸分装，线材 / 化妆品', 12, 34, '数码 / 出行', 'travel organizer bags set'],
    ['斜挎小包', /斜挎|crossbody|sling/i, '贴身防盗，可放手机护照', 15, 38, '旅行防盗', 'crossbody sling bag']
  ],
  luggage: [
    ['20 寸登机箱', /20|登机|cabin/i, '55×40×20，符合廉航尺寸', 48, 118, '出差 / 短途', 'carry on luggage 20 inch'],
    ['可扩展托运箱', /扩展|28|托运|checked/i, '可扩 5cm，TSA 锁', 78, 188, '长途 / 购物回国', 'expandable checked luggage'],
    ['软壳箱', /软壳|布箱|soft/i, '牛津布，有外袋，可塞', 52, 132, '装不规则物品', 'softside luggage'],
    ['行李配件', /行李带|吊牌|tag|strap/i, 'TSA 锁 / 打包带 / 称重器', 9, 24, '凑单 + 防丢', 'luggage tags set']
  ],

  /* ---------------- 家居清洁 ---------------- */
  clean: [
    ['静电除尘掸', /除尘|掸|duster/i, '静电吸附，可弯折，替换头', 10, 24, '高处 / 缝隙', 'electrostatic duster'],
    ['平板拖把', /拖把|mop/i, '免手洗 + 双仓，脱水率', 22, 52, '地板清洁主力', 'flat mop with bucket'],
    ['缝隙刷套装', /缝隙|刷|grout|brush/i, '3 种硬度，瓷砖缝 / 水槽', 9, 22, '深度清洁', 'grout cleaning brush'],
    ['粘毛滚筒', /粘毛|lint roller/i, '可撕 60 层，宠物家庭', 8, 20, '衣物 / 沙发', 'lint roller pet hair']
  ],
  laundry: [
    ['洗衣凝珠', /凝珠|pods/i, '三腔，去渍 + 留香', 14, 34, '年轻租房党', 'laundry detergent pods'],
    ['留香珠', /留香|scent booster/i, '持久 12 周，可调浓淡', 12, 30, '味道敏感 / 送礼', 'scent booster beads'],
    ['去渍喷雾', /去渍|stain|spray/i, '酶解，领口 / 血渍', 9, 22, '白衬衫 / 婴儿衣物', 'stain remover spray'],
    ['洗衣袋', /洗衣袋|mesh bag/i, '粗细网，防变形', 8, 18, '针织 / 内衣', 'laundry mesh bags']
  ],
  tissue: [
    ['抽纸整箱', /抽纸|面巾|tissue/i, '3 层,130 抽,整箱囤', 18, 42, '家庭囤货', 'facial tissue bulk'],
    ['厨房纸', /厨房纸|paper towel/i, '吸油吸水,可撕半张', 14, 32, '厨房刚需', 'kitchen paper towels'],
    ['垃圾袋', /垃圾袋|trash bag/i, '加厚,抽绳,45×50', 11, 26, '家庭消耗', 'trash bags drawstring'],
    ['湿巾', /湿巾|wipe/i, '无酒精 / 手口可用', 10, 24, '母婴 / 外出', 'flushable wet wipes']
  ],
  bathLinen: [
    ['速干浴巾', /速干|quick.?dry/i, '超细纤维，吸水 5 倍自重', 14, 32, '无阳台 / 健身', 'quick dry towel'],
    ['纯棉毛巾', /毛巾|towel/i, '长绒棉,克重 400–600g', 12, 30, '家庭装 4–6 条', 'cotton bath towels set'],
    ['干发帽', /干发|hair towel/i, '吸水 30 秒,免吹', 8, 20, '长发 / 学生', 'hair towel wrap'],
    ['浴室地垫', /地垫|bath mat/i, '硅藻土 / 绒面,防滑底', 13, 34, '卫浴', 'non slip bath mat']
  ],
  bathroomFix: [
    ['免打孔置物架', /置物架|免打孔|shelf/i, '免钉胶,承重 10kg', 14, 34, '租房不能打孔', 'no drill bathroom shelf'],
    ['花洒 / 增压', /花洒|增压|shower head/i, '增压 30%,过滤芯', 16, 42, '水压小 / 硬水', 'high pressure shower head'],
    ['地漏防臭', /地漏|防臭|drain/i, '硅胶芯,防返味防虫', 8, 20, '老房 / 反味', 'shower drain cover'],
    ['马桶配件', /马桶|toilet/i, '坐垫 / 清洁球 / 除味', 10, 26, '卫浴日常', 'toilet seat cover']
  ],
  pest: [
    ['驱蚊手环', /驱蚊|mosquito/i, '植物精油,成人儿童分款', 10, 24, '户外 / 亲子', 'mosquito repellent bracelets'],
    ['灭蚊灯', /灭蚊灯|bug zapper/i, '紫光 + 吸入,静音', 22, 52, '室内 / 阳台', 'indoor bug zapper'],
    ['粘鼠板 / 陷阱', /鼠|mouse trap|glue/i, '加厚,可折', 9, 20, '老房 / 仓库', 'mouse traps sticky'],
    ['蟑螂药', /蟑螂|roach/i, '胶饵,连环灭', 12, 28, '厨房 / 出租屋', 'roach bait gel']
  ],

  /* ---------------- 厨房 ---------------- */
  blender: [
    ['便携榨汁杯', /便携|榨汁杯|personal|portable/i, '400–600ml,USB 充,6 叶刀', 19, 45, '健身 / 上班带', 'portable usb blender'],
    ['破壁料理机', /破壁|high.?speed/i, '1200W 以上,可打冰', 58, 148, '家庭厨房', 'high speed blender'],
    ['辅食料理棒', /辅食|料理棒|immersion/i, '手持,可拆洗,配件多', 26, 68, '有娃家庭', 'immersion blender baby food'],
    ['随行杯配件', /杯盖|刀头|配件|blade/i, '替换刀头 / 杯体', 10, 24, '已有机器的复购', 'blender replacement blade']
  ],
  kettle: [
    ['恒温电水壶', /恒温|控温|temperature/i, '40–100℃ 可调,保温 12h', 32, 78, '冲奶 / 手冲', 'temperature control kettle'],
    ['折叠水壶', /折叠|硅胶|collapsible/i, '食品级硅胶,压成 5cm', 18, 42, '差旅 / 露营', 'collapsible electric kettle'],
    ['养生壶', /养生|玻璃|glass/i, '玻璃壶身,煮茶 / 炖煮', 28, 68, '办公室 / 女性', 'electric glass kettle'],
    ['快煮壶', /快煮|不锈钢|stainless/i, '1.7L,5 分钟沸,防干烧', 22, 52, '家庭基础款', 'electric kettle stainless steel']
  ],
  airfryer: [
    ['4–6L 家用', /4l|5l|6l|家用/i, '抽屉式,可视窗,8 预设', 48, 118, '2–4 人家庭', 'air fryer 6 quart'],
    ['双仓 / 双层', /双仓|双层|dual/i, '两篮同时,省时', 78, 178, '多口之家', 'dual basket air fryer'],
    ['烤箱式', /烤箱|oven/i, '方腔,多层同烤', 88, 198, '烘焙兼顾', 'air fryer oven'],
    ['配件 / 纸垫', /纸|垫|配件|liner/i, '防粘纸 / 硅胶篮,耗材', 9, 22, '高频复购', 'air fryer liners']
  ],
  drinkware: [
    ['保温杯', /保温|thermos|insulated/i, '316 内胆,12h 保温,防漏', 18, 42, '通勤 / 学生', 'insulated water bottle'],
    ['吸管杯', /吸管|straw|tumbler/i, '带吸管,车载杯座适配', 16, 38, '开车 / 健身', 'tumbler with straw'],
    ['大容量水壶', /大容量|1l|2l|gallon/i, '1–2L,刻度,提醒喝水', 19, 44, '健身 / 减脂', '1 gallon water bottle'],
    ['咖啡随行杯', /咖啡|coffee|mug/i, '密封,可装热饮,杯口设计', 14, 34, '咖啡党', 'travel coffee mug']
  ],
  multicooker: [
    ['电煮锅', /电煮锅|小锅|mini/i, '1–2L,煮面 / 火锅', 24, 58, '独居 / 宿舍', 'mini electric cooker'],
    ['多功能锅', /多功能|multi/i, '换盘,煎烤煮涮', 48, 118, '小家庭 / 聚会', 'multifunctional electric pot'],
    ['电蒸锅', /蒸锅|steam/i, '双层,定时', 32, 78, '早餐 / 辅食', 'electric steamer'],
    ['电饭煲', /电饭|rice cooker/i, '3–5 杯,预约', 38, 92, '留学生 / 小家庭', 'rice cooker 3 cup']
  ],
  sandwich: [
    ['三明治机', /三明治|sandwich/i, '双面加热,可换盘', 22, 52, '早餐 5 分钟', 'sandwich maker'],
    ['华夫饼机', /华夫|waffle/i, '深盘 / 翻转', 26, 62, '亲子早餐', 'waffle maker'],
    ['早餐机一体', /早餐机|breakfast/i, '煎 + 烤 + 煮 一体', 38, 88, '上班族', 'breakfast station']
  ],
  kitchenScale: [
    ['电子厨房秤', /厨房秤|烘焙秤|scale/i, '0.1g 精度,去皮,单位切换', 12, 30, '烘焙 / 控卡', 'digital kitchen scale 0.1g'],
    ['咖啡秤', /咖啡秤|coffee scale/i, '带计时,0.1g', 24, 58, '手冲玩家', 'coffee scale with timer'],
    ['挂秤 / 行李秤', /行李秤|挂秤|luggage scale/i, '50kg,挂钩,便携', 10, 24, '出行称重', 'digital luggage scale']
  ],
  knifeSet: [
    ['主厨刀单把', /主厨|chef/i, '8 寸,不锈钢 / 高碳', 24, 68, '家庭主力', 'chef knife 8 inch'],
    ['套装刀组', /套装|set/i, '3–6 件,带刀架', 42, 118, '新居 / 婚庆', 'knife set with block'],
    ['日式三德刀', /三德|santoku/i, '17cm,双刃,轻', 22, 58, '女性 / 小厨房', 'santoku knife'],
    ['磨刀器', /磨刀|sharpener/i, '三段式,手拉', 12, 32, '维护刚需', 'knife sharpener']
  ],
  cuttingBoard: [
    ['实木砧板', /实木|木|wood/i, '整木,厚度 2.5cm', 26, 68, '中式烹饪', 'wood cutting board'],
    ['分类砧板套装', /分类|套装|set/i, '3–4 片,颜色分生熟', 18, 46, '有娃 / 讲究卫生', 'cutting board set'],
    ['可折叠砧板', /折叠|foldable/i, '折成漏斗,直接下锅', 12, 30, '小厨房', 'foldable cutting board'],
    ['塑料 / PP 砧板', /塑料|pp|plastic/i, '抗菌,可机洗', 14, 34, '出租 / 商用', 'plastic cutting board']
  ],
  cookware: [
    ['不粘煎锅', /不粘|煎锅|frying/i, '涂层 3 层,26–28cm', 26, 68, '家庭日常', 'nonstick frying pan'],
    ['铸铁锅', /铸铁|cast iron/i, '预开锅,可进烤箱', 32, 88, '煎牛排 / 炖', 'cast iron skillet'],
    ['雪平锅 / 奶锅', /雪平|奶锅|saucepan/i, '铝 / 不锈钢,单柄', 18, 46, '煮面 / 热奶', 'saucepan stainless'],
    ['锅具套装', /套装|set/i, '5–10 件,可叠放', 78, 198, '新居', 'cookware set nonstick']
  ],
  foodContainer: [
    ['玻璃保鲜盒', /玻璃|glass/i, '硼硅,可烤箱,扣盖', 22, 52, '备餐 / 带饭', 'glass food storage containers'],
    ['便当盒', /便当|午餐|lunch box/i, '分格,可微波,带餐具', 18, 42, '上班 / 学生', 'bento lunch box'],
    ['真空保鲜', /真空|vacuum/i, '抽气泵,延长 3 倍', 26, 62, '囤货 / 母婴', 'vacuum food containers'],
    ['密封罐套装', /密封罐|罐|jar/i, '谷物 / 咖啡豆,防潮', 16, 38, '厨房整理', 'airtight food jars']
  ],
  utensil: [
    ['硅胶厨具套装', /硅胶|silicone/i, '耐 230℃,不伤锅', 18, 42, '不粘锅用户', 'silicone cooking utensils set'],
    ['不锈钢铲勺', /不锈钢|steel/i, '一体成型,可洗碗机', 16, 38, '中式爆炒', 'stainless steel spatula'],
    ['沥水篮 / 备菜', /沥水|滤网|colander/i, '可折叠,大容量', 13, 32, '洗菜 / 沥面', 'collapsible colander'],
    ['厨房小工具', /削皮|开瓶|工具|peeler/i, '削皮 / 刨丝 / 开罐', 10, 26, '凑单', 'kitchen gadgets set']
  ],

  /* ---------------- 美妆个护 ---------------- */
  skincare: [
    ['精华', /精华|serum/i, '活性浓度 + 质地，成分党看配方表', 16, 48, '25–38 抗初老', 'niacinamide serum'],
    ['面霜', /面霜|moisturizer|cream/i, '封闭性 + 肤感，干皮 / 油皮分款', 18, 46, '全肤质，换季刚需', 'ceramide moisturizer'],
    ['防晒', /防晒(?!衣|服|帽|袖|面罩|伞)|sunscreen|spf/i, 'SPF/PA + 是否泛白 + 是否搓泥', 14, 38, '全年，夏季峰值', 'sunscreen spf50 no white cast'],
    ['面膜', /面膜|mask/i, '片状 / 涂抹，即刻感强', 12, 34, '急救 / 礼赠', 'sheet mask set'],
    ['洁面 / 卸妆', /洁面|洗面|卸妆|cleanser/i, '氨基酸 / 卸妆力，复购快', 11, 28, '学生 / 通勤', 'amino acid cleanser']
  ],
  makeup: [
    ['底妆', /粉底|气垫|遮瑕|foundation|concealer/i, '色号体系 + 持妆，试色成本高', 18, 46, '18–35 通勤', 'foundation makeup'],
    ['唇部', /口红|唇釉|lip/i, '色号多、试色内容驱动', 9, 26, '礼赠 / 自用', 'lip tint long lasting'],
    ['眼妆', /眼影|睫毛|eyeshadow|mascara/i, '显色度 + 是否晕染', 12, 32, '18–30', 'eyeshadow palette'],
    ['化妆工具', /刷|美妆蛋|brush|sponge/i, '毛质 + 清洗耐用度', 10, 28, '配套购买', 'makeup brush set']
  ],
  hairStyler: [
    ['直发夹', /直发|夹板|flat iron/i, '陶瓷涂层,恒温 180℃', 24, 62, '日常造型', 'flat iron hair straightener'],
    ['卷发棒', /卷发|curling/i, '筒径 19–32mm,自动卷', 28, 72, '长发 / 约会', 'automatic curling iron'],
    ['吹风机', /吹风|hair dryer/i, '高速无刷,负离子', 42, 128, '长发 / 宠物', 'high speed hair dryer'],
    ['多功能造型器', /造型|multistyler|airwrap/i, '一机多配件', 68, 178, '送礼 / 高客单', 'multistyler hair']
  ],
  beauty: [
    ['美容仪', /美容仪|射频|rf|led/i, '射频 / 微电流 / LED', 62, 198, '30+ 抗老', 'rf beauty device'],
    ['洁面仪', /洁面仪|facial brush/i, '硅胶刷头,声波', 26, 68, '油皮 / 痘肌', 'silicone facial brush'],
    ['眼部按摩', /眼罩|眼部|eye massager/i, '热敷 + 气压', 32, 82, '用眼过度', 'eye massager heated'],
    ['脱毛仪', /脱毛|ipl/i, 'IPL 闪光,全身可用', 88, 238, '夏季 / 长期投入', 'ipl hair removal device']
  ],
  oralCare: [
    ['电动牙刷', /电动牙刷|electric toothbrush/i, '声波,压力感应,续航', 24, 62, '家庭换新', 'sonic electric toothbrush'],
    ['冲牙器', /冲牙|water flosser/i, '便携,3 档水压', 28, 68, '正畸 / 牙缝大', 'portable water flosser'],
    ['美白贴', /美白|whitening/i, '过氧化物浓度,14 天疗程', 18, 44, '咖啡 / 茶渍', 'teeth whitening strips'],
    ['牙刷头配件', /刷头|refill/i, '替换装,适配型号', 12, 30, '复购', 'toothbrush replacement heads']
  ],
  perfume: [
    ['淡香水', /淡香|edt|香水|perfume/i, 'EDT,留香 4–6h', 22, 68, '日常 / 礼赠', 'eau de toilette women'],
    ['香氛蜡烛', /蜡烛|candle/i, '大豆蜡,燃烧 40h', 16, 42, '礼赠 / 氛围', 'scented candle soy'],
    ['无火香薰', /香薰|diffuser/i, '藤条 / 扩香石,2 个月', 14, 38, '卫生间 / 玄关', 'reed diffuser'],
    ['固体香膏', /香膏|solid/i, '便携,补香', 12, 30, '通勤随身', 'solid perfume']
  ],
  nailCare: [
    ['美甲灯', /美甲灯|uv lamp/i, '48W,定时,不黑手', 22, 58, '居家美甲', 'uv nail lamp'],
    ['甲油胶套装', /甲油胶|gel polish/i, '12 色 + 底胶封层', 18, 46, '居家 DIY', 'gel nail polish set'],
    ['修甲工具', /修甲|指甲剪|nail file/i, '不锈钢,7 件套', 10, 26, '日常 / 礼赠', 'manicure set'],
    ['穿戴甲', /穿戴|press.?on/i, '一贴即用,可拆', 9, 24, '快造型 / 婚礼', 'press on nails']
  ],

  /* ---------------- 健康护理 ---------------- */
  massager: [
    ['筋膜枪', /筋膜|massage gun/i, '振幅 10–12mm,噪音 <45dB', 42, 118, '健身 / 久坐', 'massage gun deep tissue'],
    ['颈椎按摩仪', /颈椎|颈部|neck/i, 'EMS + 热敷,挂脖', 26, 68, '办公久坐', 'neck massager ems'],
    ['眼部 / 头部', /眼部|头部|head/i, '气压 + 热敷', 32, 78, '用眼 / 睡眠', 'eye massager'],
    ['足部 / 腿部', /足|腿|foot|leg/i, '气压 + 滚轮', 48, 128, '久站 / 老年人', 'leg massager compression']
  ],
  support: [
    ['护腰', /护腰|腰|back brace/i, '支撑条 + 透气网,可调', 18, 46, '久坐 / 搬重物', 'back support belt'],
    ['护膝', /护膝|knee/i, '弹簧支撑,防滑硅胶圈', 16, 42, '跑步 / 登山', 'knee brace support'],
    ['矫正带', /矫正|posture/i, '开肩,隐形', 14, 36, '学生 / 驼背', 'posture corrector'],
    ['护腕 / 护踝', /护腕|护踝|wrist|ankle/i, '加压 + 固定', 12, 32, '运动损伤', 'wrist brace support']
  ],
  footSpa: [
    ['折叠泡脚桶', /折叠|collapsible/i, '硅胶折叠,收纳 12cm', 22, 52, '小户型', 'collapsible foot bath'],
    ['恒温足浴盆', /恒温|加热|heated/i, '恒温 35–45℃,气泡', 48, 128, '养生 / 老人', 'heated foot spa'],
    ['足浴药包', /药包|足浴包|salt/i, '艾草 / 海盐,耗材', 10, 26, '复购', 'foot soak salts'],
    ['按摩足浴盆', /按摩|massage/i, '滚轮 + 气泡 + 红光', 62, 158, '送礼', 'foot spa massager']
  ],
  bodyScale: [
    ['体脂秤', /体脂|body fat/i, 'BIA 四电极,APP 记录', 22, 52, '减脂人群', 'body fat scale'],
    ['智能体重秤', /体重|weight/i, '0.05kg 精度,多用户', 16, 38, '家庭共用', 'digital bathroom scale'],
    ['厨房 / 宠物秤', /宠物秤|baby scale/i, '托盘,0.01kg', 24, 56, '婴儿 / 小型宠物', 'baby scale digital']
  ],
  hairRemoval: [
    ['IPL 脱毛仪', /ipl|脱毛仪/i, '闪光 40 万次,全身', 78, 218, '长期投入 / 夏季', 'ipl hair removal'],
    ['电动剃毛器', /剃毛|shaver|trimmer/i, '干湿两用,低噪', 22, 58, '快速处理', 'electric shaver women'],
    ['脱毛膏', /脱毛膏|cream/i, '温和配方,5 分钟', 11, 28, '应急 / 敏感肌', 'hair removal cream'],
    ['修眉 / 面部', /修眉|眉|eyebrow/i, '小刀头,精细', 12, 30, '日常', 'eyebrow trimmer']
  ],

  /* ---------------- 户外 / 运动 ---------------- */
  camping: [
    ['营地灯', /灯|lantern|light/i, '充电 / 电池，暖光 + 强光两档，可挂可立', 15, 38, '露营 / 停电备用', 'camping lantern rechargeable'],
    ['折叠桌椅', /桌|椅|table|chair/i, '铝合金折叠，收纳成袋，承重 80–120kg', 26, 68, '自驾露营', 'folding camping table'],
    ['睡袋 / 气垫', /睡袋|气垫|sleeping bag|pad/i, '温标 0–10℃，充气厚度 5–10cm', 32, 88, '过夜露营', 'sleeping bag 3 season'],
    ['露营炊具', /炊具|锅|炉|cookware|stove/i, '套锅 / 卡式炉，一人食到四人', 22, 62, '野炊 / 徒步', 'camping cookware set']
  ],
  trekking: [
    ['手电 / 头灯', /手电|头灯|flashlight|headlamp/i, '流明 300–1200，USB 充，防水 IPX4+', 15, 42, '夜行 / 停电', 'rechargeable headlamp'],
    ['登山杖', /登山杖|trekking pole/i, '外锁 / 内锁，碳纤维或铝，一对装', 22, 58, '徒步 / 膝盖不好', 'trekking poles pair'],
    ['营地灯串', /灯串|string light/i, '太阳能 / USB，10–20m', 14, 34, '氛围布置', 'camping string lights'],
    ['求生小件', /哨|打火|求生|survival/i, '火石 / 哨子 / 保温毯', 9, 24, '应急包', 'survival kit']
  ],
  fitness: [
    ['弹力带套装', /弹力带|阻力带|resistance band/i, '5 档阻力，门锚 + 手柄', 14, 34, '居家练全身', 'resistance bands set'],
    ['可调哑铃', /哑铃|dumbbell/i, '2.5–24kg 可调，省地方', 42, 118, '小户型增肌', 'adjustable dumbbell'],
    ['健腹轮 / 俯卧撑', /健腹轮|俯卧撑|ab roller|push.?up/i, '双轮稳定，带回弹', 16, 38, '核心训练', 'ab roller wheel'],
    ['计数跳绳', /跳绳|jump rope/i, '钢丝 + 计数，可调长度', 10, 26, '减脂有氧', 'jump rope counter']
  ],
  yoga: [
    ['瑜伽垫', /瑜伽垫|yoga mat/i, 'TPE / 天然橡胶，6–8mm，防滑纹', 18, 45, '初学者 / 居家', 'non slip yoga mat'],
    ['泡沫轴', /泡沫轴|foam roller/i, 'EPP，狼牙 / 光滑两版', 13, 32, '放松 / 筋膜', 'foam roller'],
    ['瑜伽砖 / 拉伸带', /砖|拉伸带|block|strap/i, 'EVA 砖 + 棉拉伸带', 9, 24, '柔韧不足', 'yoga blocks set'],
    ['普拉提圈', /普拉提|pilates ring/i, '阻力环，内侧夹腿', 14, 32, '塑形', 'pilates ring']
  ],
  rainwear: [
    ['成人雨衣', /成人|雨衣|raincoat/i, 'PU / 尼龙，可背包式后背放量', 16, 42, '通勤 / 骑行', 'raincoat adult'],
    ['儿童雨衣', /儿童|kids/i, '带帽檐，反光条，书包位', 14, 34, '上学 / 亲子出游', 'kids raincoat'],
    ['折叠伞', /折叠|folding/i, '五折 / 三折，抗风骨架', 12, 32, '随身', 'compact folding umbrella'],
    ['长柄伞', /长柄|直杆|stick/i, '双层防风，大伞面', 15, 38, '暴雨 / 双人', 'windproof stick umbrella']
  ],

  /* ---------------- 母婴 ---------------- */
  stroller: [
    ['轻便伞车', /伞车|轻便|lightweight/i, '5–7kg，一键收，可上飞机', 78, 198, '常出行 / 独自带娃', 'lightweight stroller'],
    ['高景观推车', /高景观|newborn/i, '可平躺，避震，双向', 148, 380, '新生儿', 'newborn stroller'],
    ['双人推车', /双人|double/i, '并排 / 前后，可过门', 168, 420, '二胎', 'double stroller'],
    ['婴儿床', /婴儿床|crib|bassinet/i, '可折叠 / 拼接大床', 88, 238, '新生儿到家', 'baby bassinet']
  ],
  baby: [
    ['婴儿背带 / 腰凳', /背带|腰凳|carrier/i, 'M 型髋位，腰封分散重量', 24, 68, '独自带娃 / 出行', 'baby carrier newborn'],
    ['婴儿睡袋', /睡袋|sleep sack/i, 'TOG 分级，防惊跳', 18, 46, '夜奶 / 防踢被', 'baby sleep sack'],
    ['婴儿监控', /监控|monitor/i, '2K + 哭声提醒', 42, 128, '分房睡', 'baby monitor camera'],
    ['安抚用品', /安抚|奶嘴|pacifier/i, '硅胶，夜光，防依赖分阶段', 9, 24, '哄睡', 'pacifier newborn']
  ],
  feeding: [
    ['奶瓶', /奶瓶|bottle/i, '防胀气阀，PPSU / 玻璃', 12, 32, '0–12 个月', 'anti colic baby bottle'],
    ['吸奶器', /吸奶|pump/i, '电动双边，可充电', 52, 148, '职场妈妈', 'wearable breast pump'],
    ['辅食工具', /辅食|blender|maker/i, '蒸煮搅拌一体 / 分装盒', 22, 62, '6 个月加辅食', 'baby food maker'],
    ['儿童餐具', /餐具|碗|plate|bib/i, '吸盘防打翻，硅胶围兜', 14, 36, '自主进食', 'suction plate baby']
  ],
  diaper: [
    ['纸尿裤', /纸尿裤|尿不湿|diaper/i, '按体重分号，夜里不漏', 22, 56, '0–2 岁高频复购', 'diapers size 4'],
    ['拉拉裤', /拉拉裤|pull.?up/i, '站着换，活动量大', 24, 58, '学步期', 'pull ups training pants'],
    ['隔尿垫', /隔尿垫|pad/i, '可洗 / 一次性，床单保护', 12, 32, '换尿布 / 外出', 'waterproof changing pad'],
    ['尿布桶', /尿布桶|pail/i, '密封除味，可装 30 片', 26, 62, '室内换尿布', 'diaper pail']
  ],

  /* ---------------- 玩具 / 文具 ---------------- */
  toy: [
    ['忙碌板', /忙碌板|busy board/i, '扣 / 拉链 / 锁，练精细动作', 22, 52, '1–3 岁', 'busy board toddler'],
    ['叠叠乐 / 套杯', /叠叠|套杯|stacking/i, '大小序列 + 颜色', 12, 30, '6–24 个月', 'stacking toys baby'],
    ['形状配对', /配对|shape sorter/i, '几何孔 + 声音反馈', 14, 34, '1–2 岁', 'shape sorter'],
    ['感官瓶', /感官|sensory/i, '密封液体 / 亮片，安抚', 11, 28, '0–2 岁', 'sensory bottles']
  ],
  puzzle: [
    ['木质拼图', /木质|wooden/i, '大块，抓握友好，图案分龄', 14, 36, '1–4 岁', 'wooden puzzles toddler'],
    ['地板拼图', /地板|floor/i, '60–100 片，大幅', 18, 44, '3–6 岁', 'floor puzzle kids'],
    ['早教机 / 点读', /点读|早教机|reader/i, '点读笔 + 书，发音纠错', 32, 88, '英语启蒙', 'talking flash cards'],
    ['绘本套装', /绘本|book/i, '硬壳机关书 / 分级阅读', 16, 42, '亲子共读', 'board books set']
  ],
  modeling: [
    ['超轻黏土', /黏土|clay/i, '12–24 色，不粘手，配工具', 13, 32, '3–8 岁', 'air dry clay kit'],
    ['水晶泥 / 史莱姆', /水晶泥|史莱姆|slime/i, '不粘手配方，配亮片', 10, 26, '6–12 岁', 'slime kit'],
    ['串珠 / 手工', /串珠|beads|craft/i, '大孔珠 + 绳，练手眼', 11, 28, '4–8 岁', 'beads craft kit'],
    ['剪纸 / 折纸', /剪纸|折纸|origami/i, '安全剪刀 + 图样', 9, 22, '幼儿园', 'origami paper kit']
  ],
  remoteToy: [
    ['遥控车', /遥控车|rc car/i, '2.4G，防摔，续航 20 分钟', 24, 68, '4–10 岁', 'rc car kids'],
    ['儿童无人机', /无人机|drone/i, '定高 / 一键起降，护罩', 32, 88, '8 岁以上', 'mini drone kids'],
    ['机器人玩具', /机器人|robot/i, '遥控 / 编程入门', 28, 78, '6–12 岁', 'robot toy kids'],
    ['泡泡机', /泡泡|bubble/i, '自动出泡，大容量', 14, 34, '2–6 岁户外', 'bubble machine']
  ],
  stationery: [
    ['手账本', /手账|本|journal|notebook/i, '纸质 100g+，不洇墨', 12, 32, '学生 / 手账党', 'dot grid notebook'],
    ['中性笔套装', /中性笔|笔|pen/i, '0.5mm，速干，10 支装', 9, 24, '学生 / 办公', 'gel pens 0.5'],
    ['便签 / 索引', /便签|索引|sticky|tab/i, '强粘，可反复揭', 8, 20, '学习 / 办公', 'sticky notes set'],
    ['笔袋 / 收纳', /笔袋|收纳|pencil case/i, '大容量，分层', 11, 28, '开学季', 'pencil case large']
  ],
  artSupply: [
    ['水彩套装', /水彩|watercolor/i, '24 色固彩 + 水彩纸', 16, 42, '入门 / 学生', 'watercolor set'],
    ['马克笔', /马克笔|marker/i, '双头，酒精性，80 色', 22, 58, '漫画 / 设计', 'alcohol markers set'],
    ['彩铅', /彩铅|colored pencil/i, '油性 / 水溶，72 色', 18, 46, '写实上色', 'colored pencils 72'],
    ['画板 / 画架', /画板|画架|easel/i, '折叠铝架 + 板', 26, 68, '写生', 'easel stand']
  ],

  /* ---------------- 办公 ---------------- */
  chair: [
    ['人体工学椅', /工学|ergonomic/i, '腰托可调，网背，4D 扶手', 118, 298, '远程办公', 'ergonomic office chair'],
    ['升降桌', /升降桌|standing desk/i, '单 / 双电机，记忆高度', 148, 380, '久坐族', 'standing desk electric'],
    ['腰靠 / 坐垫', /腰靠|坐垫|cushion/i, '记忆棉，透气', 22, 56, '椅子不舒服', 'lumbar support cushion'],
    ['脚踏', /脚踏|footrest/i, '角度可调，缓解腿肿', 24, 58, '久坐', 'under desk footrest']
  ],
  office: [
    ['桌面垫', /桌垫|desk mat/i, 'PU 双面，防水，大尺寸', 16, 42, '桌面改造', 'large desk mat'],
    ['线材收纳', /理线|线材|cable management/i, '走线槽 + 理线夹', 12, 32, '桌面清爽', 'cable management tray'],
    ['显示器支架', /显示器支架|monitor arm/i, '气压 / 固定，承重 9kg', 32, 82, '双屏 / 桌面空间', 'monitor arm'],
    ['键盘托', /键盘托|keyboard tray/i, '夹桌式，抽拉', 28, 68, '桌面深度不够', 'keyboard tray under desk']
  ],

  /* ---------------- 灯具 ---------------- */
  bulb: [
    ['护眼台灯', /台灯|护眼|desk lamp/i, '无频闪，显色 95+，色温可调', 24, 68, '学生 / 办公', 'eye caring desk lamp'],
    ['夹灯', /夹灯|clamp/i, '夹床 / 夹桌，省地方', 16, 42, '宿舍 / 床头', 'clip on lamp'],
    ['小夜灯', /夜灯|night light/i, '感应 / 常亮，暖光', 10, 26, '起夜 / 儿童房', 'night light plug in'],
    ['智能灯泡', /智能|smart bulb/i, 'APP / 语音，1600 万色', 14, 36, '氛围 / 全屋智能', 'smart bulb color']
  ],
  light: [
    ['LED 灯带', /灯带|strip/i, '5m，APP 控，可剪', 13, 34, '氛围 / 电视背光', 'led strip lights'],
    ['日落灯', /日落|sunset/i, '投影氛围，可旋转', 12, 30, '拍照 / 直播', 'sunset lamp projector'],
    ['星空投影', /投影灯|galaxy|projector light/i, '星云 + 蓝牙音箱', 22, 58, '儿童房 / 送礼', 'galaxy projector'],
    ['霓虹灯牌', /霓虹|neon/i, '自定义文字，USB', 18, 46, '店铺 / 拍照墙', 'neon sign custom']
  ],
  gardenlight: [
    ['太阳能地插灯', /地插|solar path/i, 'IP65，自动亮，6 只装', 18, 44, '庭院小径', 'solar path lights'],
    ['太阳能壁灯', /壁灯|wall/i, '感应 + 常亮', 20, 48, '门口 / 车库', 'solar wall light'],
    ['太阳能串灯', /串灯|string/i, '10–20m，8 种模式', 15, 38, '露台 / 派对', 'solar string lights'],
    ['感应投光灯', /投光|flood|motion/i, '1000 流明以上，PIR', 26, 62, '院子 / 仓库', 'solar motion light']
  ],

  /* ---------------- 汽车 ---------------- */
  carVac: [
    ['无线手持', /无线|cordless/i, '8000–15000Pa，续航 20 分钟', 28, 78, '日常清理', 'cordless car vacuum'],
    ['有线大吸力', /有线|12v/i, '插点烟口，吸力稳定', 18, 45, '深度清洁', 'car vacuum 12v'],
    ['带充气泵', /充气|inflator/i, '吸尘 + 打气二合一', 32, 88, '自驾 / 备胎', 'car vacuum inflator'],
    ['吸头套装', /吸头|nozzle|kit/i, '缝隙 / 毛刷 / 长管', 10, 26, '配套', 'vacuum attachments car']
  ],
  carCharge: [
    ['双口 PD 车充', /pd|双口|usb.?c/i, '30–65W，双设备同充', 13, 32, '通勤 / 自驾', 'usb c car charger 65w'],
    ['带线车充', /带线|with cable/i, '内置线，收纳整洁', 12, 30, '讨厌找线', 'retractable car charger'],
    ['无线车充', /无线|wireless/i, '15W 磁吸 / 夹持', 18, 46, 'iPhone 车主', 'wireless car charger mount'],
    ['车载逆变器', /逆变|inverter/i, '150–300W，转 220V', 32, 88, '自驾办公', 'car power inverter']
  ],
  auto: [
    ['座椅缝隙收纳', /缝隙|gap/i, '填缝 + 收纳，防掉手机', 12, 30, '车主日常', 'car seat gap filler'],
    ['后备箱收纳', /后备箱|trunk/i, '折叠箱 + 防滑底', 18, 46, '购物 / 自驾', 'trunk organizer'],
    ['遮阳挡', /遮阳|sunshade/i, '前挡定制，可折叠', 14, 36, '夏季', 'windshield sun shade'],
    ['脚垫', /脚垫|floor mat/i, 'TPE 全包围，易冲洗', 26, 68, '新车 / 雨雪天', 'car floor mats tpe']
  ],

  /* ---------------- 园艺 ---------------- */
  planter: [
    ['自吸水花盆', /自吸|self.?water/i, '双层储水，出差两周不浇', 14, 36, '常出差 / 懒人', 'self watering planter'],
    ['陶盆 / 水泥盆', /陶|水泥|ceramic|cement/i, '透气，质感，配托盘', 12, 34, '室内绿植', 'ceramic plant pot'],
    ['悬挂花盆', /悬挂|hanging/i, '吊绳 + 挂钩，省台面', 10, 26, '阳台小', 'hanging planter'],
    ['种植袋', /种植袋|grow bag/i, '透气控根，可折叠', 11, 28, '阳台种菜', 'grow bags']
  ],
  pruner: [
    ['旁路修枝剪', /旁路|bypass|修枝/i, 'SK5 刃，剪 20mm 枝', 16, 42, '家庭园艺', 'bypass pruners'],
    ['砧式剪', /砧|anvil/i, '压切，剪枯枝', 18, 45, '枯枝 / 硬枝', 'anvil pruners'],
    ['高枝剪', /高枝|pole|long reach/i, '伸缩 1.8–3m，绳拉', 32, 82, '高树', 'pole pruner'],
    ['电动修枝剪', /电动|electric/i, '充电，省力，剪 30mm', 48, 128, '果园 / 大量修剪', 'electric pruning shears']
  ],
  garden: [
    ['园艺工具套装', /套装|set/i, '铲 / 耙 / 剪，5–10 件', 22, 58, '新手入门', 'garden tool set'],
    ['浇水壶', /浇水|watering can/i, '1–3L，长嘴精准', 13, 32, '室内 / 阳台', 'watering can indoor'],
    ['除草器', /除草|weeder/i, '长柄，不用弯腰', 16, 38, '草坪 / 花坛', 'stand up weeder'],
    ['园艺手套', /手套|glove/i, '防刺，透气', 9, 22, '玫瑰 / 仙人掌', 'gardening gloves']
  ],

  /* ---------------- 家电 ---------------- */
  homeAir: [
    ['加湿器', /加湿|humidifier/i, '2–4L，静音，大口径可洗', 26, 68, '干燥 / 鼻炎', 'cool mist humidifier'],
    ['空气净化器', /净化|purifier/i, 'CADR 200+，HEPA，滤芯价公开', 68, 188, '过敏 / 新居', 'air purifier hepa'],
    ['除湿机', /除湿|dehumidifier/i, '20L/天，连续排水', 118, 288, '南方回南天', 'dehumidifier 20 pint'],
    ['温湿度计', /温湿度|thermo/i, '电子墨水屏，APP 记录', 12, 30, '婴儿房 / 花房', 'hygrometer indoor']
  ],
  projector: [
    ['便携投影', /便携|portable|mini/i, '1080P，内置电池，自动对焦', 88, 238, '卧室 / 露营', 'portable projector 1080p'],
    ['家用 1080P', /家用|1080|home/i, '300–600 ANSI，侧投校正', 128, 328, '客厅替代电视', 'home projector 1080p'],
    ['投影幕布', /幕布|screen/i, '便携 / 落地，抗光', 32, 88, '配套', 'projector screen portable'],
    ['投影支架', /支架|mount/i, '落地 / 吊装，万向', 22, 58, '摆位', 'projector ceiling mount']
  ],

  /* ---------------- 补：宠物服饰 / 咖啡 / 大件露营 ---------------- */
  petClothes: [
    ['抓绒卫衣', /卫衣|抓绒|sweater|fleece/i, '腹部开口，前腿袖，按胸围分号', 12, 30, '冬季小型犬', 'dog sweater'],
    ['宠物雨衣', /雨衣|raincoat/i, '带帽檐，反光条，可牵引开口', 14, 34, '雨天遛狗', 'dog raincoat'],
    ['四脚衣', /四脚|full body|jumpsuit/i, '全身包覆，防脏防舔', 15, 36, '术后 / 脏地面', 'dog pajamas'],
    ['降温背心', /降温|cooling/i, '蒸发降温，夏季', 16, 38, '高温地区', 'dog cooling vest']
  ],
  coffee: [
    ['手冲壶', /手冲|gooseneck|kettle/i, '细口控流，容量 600–1000ml', 18, 46, '手冲入门', 'gooseneck kettle'],
    ['滤杯 / 滤纸', /滤杯|滤纸|dripper|filter/i, 'V60 / 蛋糕杯，耗材复购', 10, 28, '日常手冲', 'v60 dripper'],
    ['手摇磨豆机', /磨豆|grinder/i, '不锈钢芯，刻度可调', 22, 58, '现磨党', 'manual coffee grinder'],
    ['法压壶 / 冷萃', /法压|冷萃|french press|cold brew/i, '玻璃壶身，滤网密', 16, 42, '办公室 / 冷萃', 'french press coffee']
  ],
  outdoor: [
    ['天幕 / 帐篷', /天幕|帐篷|tent|tarp/i, '3–4 人，涂层防水 2000mm+', 48, 128, '自驾露营', 'camping tarp'],
    ['折叠床 / 行军床', /折叠床|cot/i, '铝合金，承重 150kg', 42, 108, '过夜 / 陪护', 'folding camping cot'],
    ['营地车', /营地车|wagon|cart/i, '折叠，承重 80kg，宽轮', 38, 98, '装备搬运', 'folding wagon cart'],
    ['保温箱 / 冰袋', /保温箱|cooler|ice/i, '24–48h 保冷，可当座椅', 32, 88, '野餐 / 自驾', 'hard cooler 24 can']
  ]

};

/* =========================================================
   功能细分：同一条背带裤，卖的是六种「为什么买」
   [功能主张, 谁在买, 英文搜索词, 现有货的短板, 可下手的地方]
   ========================================================= */
const FUNCS = {
  overalls: [
    ['显高显瘦', '155–163cm 小个子女性', 'petite overalls', '只改裤长不改腰线，穿上更矮', '把腰线提到 38cm+，详情页放身高对照表'],
    ['遮肚不勒', '产后 / 久坐有小肚子', 'loose overalls tummy', '腰部抽绳勒出印，坐下顶肚子', '侧边暗扣 + 前片活褶，坐姿实测动图'],
    ['哺乳方便', '孕中期到哺乳期', 'nursing overalls', '开口做在正面，走光风险', '侧开 + 内衬遮挡，配哺乳内衣演示'],
    ['防走光', '背带短裤 / 裙裤人群', 'overall shorts not see through', '面料薄，逆光透', '克重 280g 以上，逆光实拍对比'],
    ['大码友好', 'US14–24', 'plus size overalls 3x', '版型只放大不加结构，肩带勒肩', '肩带加宽到 5cm，臀围放量重打版'],
    ['一衣多穿', '学生 / 预算敏感', 'overalls outfit ideas', '只有一种穿法，内容同质', '给出 5 种穿法（内搭 / 外套 / 卷裤脚），拍成系列']
  ],
  apparel: [
    ['显瘦版型', '微胖 / 产后', 'flattering [item]', '宽松当显瘦卖，实际显壮', '用肩线 + 腰线两处收，拍同人对比'],
    ['不起球不变形', '洗得勤的人', 'no pilling [item]', '详情页只写面料名不写克重', '标克重 + 洗 20 次实拍'],
    ['一衣多穿', '预算敏感 / 学生', '[item] outfit ideas', '内容只拍单品，不给搭配', '一衣 5 搭，做成系列短视频'],
    ['肤色友好', '黄黑皮', '[item] for dark skin', '只有白皮模特', '多肤色模特同款对照']
  ],
  shoes: [
    ['宽脚友好', '拇外翻 / 宽脚', 'wide toe box shoes', '只做标准楦，宽脚挤', '宽楦 + 尺码表标脚宽'],
    ['久站不累', '护士 / 服务业', 'shoes for standing all day', '只讲软，不讲支撑', '足弓支撑 + 8 小时实测'],
    ['防滑', '厨房 / 雨天', 'non slip shoes', '底纹浅，湿地面打滑', '深纹橡胶底 + 湿瓷砖实测'],
    ['赤足感', '健身 / 极简派', 'barefoot shoes', '底太厚，无地面反馈', '3mm 底，弯折演示']
  ],
  charge: [
    ['一充多机', '出差带多设备', 'gan charger multi port', '多口共享功率，插满就慢', '标清单口 / 多口功率表'],
    ['不烫手', '怕发热 / 放在床头', 'charger not hot', '满载 60℃ 以上', '温控曲线 + 红外测温图'],
    ['能上飞机', '差旅', 'power bank airplane approved', '容量标虚，安检被收', '标 Wh 值 + 民航合规说明'],
    ['磁吸不掉', 'iPhone 用户', 'magsafe battery pack slim', '磁力弱，装壳就掉', '磁力 N 值 + 带壳实测']
  ],
  earbud: [
    ['不入耳舒服', '耳道敏感 / 中耳炎', 'open ear headphones', '漏音，旁边听得见', '定向传声 + 1 米漏音实测'],
    ['通话降噪', '通勤 / 远程会议', 'earbuds with good mic', '只讲听不讲说', '风噪 / 地铁录音对比'],
    ['运动不掉', '跑步 / 健身', 'earbuds for running', '耳挂硬，戴久痛', '硅胶耳挂 + 甩头测试'],
    ['续航一整天', '长时间佩戴', 'earbuds 12 hour battery', '标耳机不标仓', '单次 / 总续航分开标']
  ],
  petFeed: [
    ['出差不断粮', '经常出差 / 加班', 'automatic cat feeder', '卡粮，颗粒大小不适配', '标可喂颗粒直径 + 防卡结构'],
    ['好洗不发霉', '多猫家庭', 'cat water fountain easy clean', '泵难拆，两周就滑', '全拆洗 + 无死角演示'],
    ['静音', '卧室放置', 'quiet cat fountain', '夜间水泵嗡嗡响', '标分贝值 + 夜间实测'],
    ['护颈', '扁脸猫 / 大狗', 'elevated pet bowl', '高度固定，不合身高', '按体型给 3 档高度']
  ],
  petLitter: [
    ['不带砂', '木地板 / 沙发党', 'litter box no tracking', '踏板小，出来照带', '顶入 + 长落砂垫，拍地面残留'],
    ['除味', '小户型 / 卧室', 'litter box odor control', '只封不滤', '活性炭滤片 + 可替换'],
    ['大猫够用', '缅因 / 布偶', 'extra large litter box', '标注尺寸是外径，内径小', '标内径 + 体重上限'],
    ['铲得快', '多猫家庭', 'self cleaning litter box', '筛不干净，卡大块', '筛网孔径 + 大块实测']
  ],
  storage: [
    ['量好再买', '买错过尺寸的人', 'under bed storage bins', '只标外径，塞不进床底', '标内径 + 床底高度对照'],
    ['承重可信', '囤书 / 囤粮', 'heavy duty storage bins', '写承重但底会塌', '底部加强筋 + 20kg 实拍'],
    ['不用时能收', '租房 / 小户型', 'collapsible storage bins', '折起来还是厚', '压平厚度实测'],
    ['看得见里面', '找东西困难', 'storage bins with window', '全封闭，翻箱倒柜', '前开 / 透明窗']
  ],
  clean: [
    ['真能除毛', '养宠家庭', 'pet hair remover', '只吸附不收集，毛飞', '静电 + 集毛仓，拍地毯对比'],
    ['不用手洗', '讨厌碰脏水', 'mop self wringing', '挤水要用手', '双仓离心脱水'],
    ['缝隙够得着', '瓷砖缝 / 水槽边', 'grout brush', '刷头太厚进不去', '3 种厚度 + 缝隙实测'],
    ['不伤表面', '不锈钢 / 不粘锅', 'non scratch scrubber', '百洁布太硬留划痕', '材质分级 + 划痕对比']
  ],
  massager: [
    ['真穿透', '健身 / 深层酸痛', 'massage gun deep tissue', '振幅标虚，只震表皮', '标振幅 mm + 肌肉实测'],
    ['不吵', '办公室 / 家里', 'quiet massage gun', '一档就 60dB', '分档标分贝'],
    ['够得着后背', '独居 / 肩颈僵硬', 'massage gun reach back', '手柄短，后背够不到', '加长手柄 / 弯头'],
    ['不硌骨', '瘦人 / 老年人', 'massage gun for elderly', '头太硬，骨点痛', '软头 + 低档位']
  ],
  skincare: [
    ['不搓泥', '化妆前使用', 'sunscreen no pilling', '叠涂就搓', '配方 + 上妆实测'],
    ['不泛白', '深肤色', 'sunscreen no white cast', '物理防晒假白', '多肤色上脸对比'],
    ['敏感可用', '屏障受损', 'sunscreen for sensitive skin', '香精酒精没标', '成分表全公开'],
    ['不闷痘', '油皮 / 痘肌', 'non comedogenic sunscreen', '厚重，闷闭口', '质地 / 吸油纸实测']
  ],
  camping: [
    ['一人能搭', 'solo 露营 / 女性', 'easy setup tent', '杆多，第一次搭半小时', '3 分钟搭完视频'],
    ['真防雨', '雨季 / 山区', 'waterproof tent 3000mm', '只写防水不写毫米', '标防水指数 + 淋雨测试'],
    ['收得小', '后备箱小 / 徒步', 'ultralight camping chair', '收起来还是占地方', '收纳尺寸 + 重量'],
    ['坐着不塌', '体重大', 'heavy duty camping chair', '承重 100kg 虚标', '标实测承重 + 骨架结构']
  ],
  yoga: [
    ['不打滑', '手汗多', 'non slip yoga mat', '出汗就滑', '湿手实测'],
    ['膝盖不痛', '初学者 / 大体重', 'thick yoga mat knees', '太薄硌膝', '标厚度 + 跪姿实测'],
    ['没味道', '对气味敏感', 'non toxic yoga mat', 'TPE 味大', '材质 + 通风 24h 说明'],
    ['好收好带', '通勤上课', 'yoga mat with strap', '卷不紧', '带绑带 + 卷起直径']
  ],
  stroller: [
    ['一键收', '独自带娃', 'one hand fold stroller', '要两只手 + 弯腰', '单手收车视频'],
    ['能上飞机', '经常出行', 'travel stroller cabin size', '折叠后超规', '标折叠尺寸 + 航司对照'],
    ['避震', '石板路 / 老家', 'stroller with suspension', '只写避震不写结构', '轮径 + 弹簧位置'],
    ['二胎可用', '两娃家庭', 'double stroller', '宽，过不了门', '标最窄通过宽度']
  ],
  baby: [
    ['安全感', '新生儿', 'baby carrier newborn', '包裹松，头没支撑', '头部支撑结构 + 髋关节 M 型'],
    ['透气', '夏天出生', 'breathable baby carrier', '厚，捂汗', '网眼面料 + 温湿度实测'],
    ['腰不痛', '长时间抱', 'baby carrier back support', '重量全在肩', '宽腰封 + 受力分散'],
    ['一个人能穿', '独自带娃', 'baby carrier easy on', '背后扣够不到', '前置扣 / 磁吸']
  ],
  toy: [
    ['玩得久', '怕玩两天就腻', 'montessori toys 1 year old', '玩法单一', '开放式玩法 + 阶段进阶'],
    ['入口安全', '口欲期', 'food grade silicone toy', '材质不明', '食品级认证 + 咬胶测试'],
    ['收得起来', '家里乱', 'toy storage with lid', '散装无收纳', '配套收纳盒'],
    ['不吵', '公寓 / 二宝家庭', 'quiet toys for toddlers', '电子音量大', '无电子件 / 音量可调']
  ],
  chair: [
    ['久坐不累', '远程办公', 'ergonomic office chair', '腰托固定，不合身高', '腰托可调 8cm'],
    ['小空间', '租房 / 卧室办公', 'small office chair', '扶手宽，塞不进桌下', '扶手可翻起'],
    ['不塌', '体重大', 'office chair 150kg', '气压杆等级低', '标气压杆等级 + 承重'],
    ['装得快', '手残党', 'office chair easy assembly', '螺丝多，说明看不懂', '10 分钟装完 + 视频']
  ],
  homeAir: [
    ['静音睡觉', '卧室 / 婴儿房', 'quiet air purifier bedroom', '睡眠档仍 30dB+', '标分贝 + 夜间实测'],
    ['滤芯不贵', '长期使用', 'air purifier cheap filter', '机器便宜滤芯贵', '公开滤芯价格与更换周期'],
    ['好洗水箱', '加湿器用户', 'humidifier easy clean', '口小，刷不到底', '大口径 + 可拆洗'],
    ['不虚标', '过敏人群', 'air purifier cadr', 'CADR 虚标', '第三方检测报告']
  ],
  projector: [
    ['白天能看', '客厅 / 不想拉帘', 'projector daylight', '只标暗场亮度', '标 ANSI 流明 + 白天实拍'],
    ['侧投方正', '摆位受限', 'projector keystone correction', '梯形校正后模糊', '四角校正 + 边缘清晰度'],
    ['自带系统', '不想接电脑', 'projector with android tv', '系统卡顿', '内存 / 芯片型号公开'],
    ['噪音小', '卧室', 'quiet projector', '风扇吵', '标分贝']
  ],
  knifeSet: [
    ['切得动硬货', '中式烹饪', 'chef knife for meat', '刃口软，切骨卷刃', '标硬度 HRC + 切骨实测'],
    ['不粘刀', '切鱼 / 土豆', 'knife with granton edge', '平刃粘片', '凹槽刃 + 实拍'],
    ['握着不滑', '手湿 / 油', 'knife non slip handle', '手柄光面', '防滑纹 + 湿手测试'],
    ['好保养', '不想磨刀', 'knife rust resistant', '生锈', '钢种 + 盐雾测试']
  ],
  carVac: [
    ['吸得动沙子', '有娃 / 越野', 'car vacuum strong suction', '吸力标 Pa 虚高', '标 kPa + 沙子实测'],
    ['够得着缝隙', '座椅缝', 'car vacuum crevice tool', '吸头单一', '3 种吸头 + 缝隙演示'],
    ['无线够用', '不想拖线', 'cordless car vacuum', '续航 8 分钟', '标实际续航 + 快充'],
    ['好清理', '怕麻烦', 'car vacuum washable filter', '滤网堵了吸力掉', '可水洗滤网 + 备件']
  ],
  garden: [
    ['不生锈', '户外长期用', 'stainless garden tools', '铁头一年锈', '标材质 + 盐雾'],
    ['省力', '老年人 / 硬土', 'garden tools for elderly', '手柄细，握不住', '加粗手柄 + 杠杆设计'],
    ['一套够用', '新手', 'garden tool set', '配件凑数', '标每件真实用途'],
    ['收得整齐', '阳台小', 'garden tool organizer', '散放', '配收纳袋 / 挂架']
  ],
  bulb: [
    ['护眼', '学生 / 办公', 'eye caring desk lamp', '只写无频闪不写参数', '标频闪深度 + 显色指数'],
    ['色温可调', '卧室 / 阅读', 'lamp 3 color temperature', '只有一档', '2700–6500K 连续调'],
    ['不占地', '小桌面', 'clamp desk lamp', '底座大', '夹式 + 折叠臂'],
    ['停电能用', '停电 / 露营', 'rechargeable table lamp', '续航虚标', '标亮度下的实际小时数']
  ]
};

/* 没写功能分化的画像，按品类给一组通用功能轴（仍是「为什么买」，不是别的品类） */
const FUNCS_CAT = {
  '服饰配饰': [
    ['版型显瘦', '微胖 / 产后', 'flattering fit', '宽松当显瘦卖', '肩线 + 腰线两处收，同人对比'],
    ['尺码准', '网购被尺码坑过', 'true to size', '尺码表只有三围', '给出身高体重对照 + 真人试穿'],
    ['不起球不掉色', '洗得勤', 'no pilling', '只写面料名', '标克重 + 洗 20 次实拍'],
    ['一衣多穿', '预算敏感', 'outfit ideas', '只拍单品', '一衣 5 搭系列']
  ],
  '3C 数码': [
    ['不发热', '长时间使用', 'not overheating', '满载温度不标', '温控曲线 + 红外图'],
    ['兼容性好', '多设备', 'compatible with', '只写部分机型', '公开兼容清单'],
    ['做工扎实', '怕用两次坏', 'durable build', '只拍外观', '拆解 + 弯折测试'],
    ['不吵', '办公 / 卧室', 'quiet operation', '分贝不标', '标分贝 + 场景实测']
  ],
  '厨房小家电': [
    ['好洗', '每天用', 'easy to clean', '结构有死角', '全拆洗演示'],
    ['不占地方', '小厨房', 'compact design', '收纳尺寸不标', '标收纳尺寸'],
    ['一次成功', '新手', 'easy for beginners', '说明书复杂', '3 步图解 + 视频'],
    ['静音', '早上用', 'quiet blender', '分贝不标', '标分贝']
  ],
  '家居收纳': [
    ['尺寸不踩坑', '买错过', 'fits under bed', '只标外径', '内径 + 场景对照'],
    ['承重可信', '囤重物', 'heavy duty', '写承重但底塌', '加强筋 + 实拍'],
    ['不用时能收', '小户型', 'collapsible', '折起来还厚', '压平厚度'],
    ['看得见', '找东西难', 'with window', '全封闭', '前开 / 透明']
  ],
  '宠物用品': [
    ['宠物接受', '挑食 / 抗拒', 'pet approved', '只拍产品不拍宠物', '真实使用视频'],
    ['好清洗', '日常维护', 'easy to clean', '死角多', '全拆洗'],
    ['耐咬', '破坏王', 'chew proof', '材质不明', '标材质 + 咬合测试'],
    ['不打翻', '大狗 / 猫', 'anti tip', '底盘轻', '加重底 + 推力测试']
  ],
  '美妆个护': [
    ['不刺激', '敏感肌', 'gentle formula', '成分表不全', '全成分公开'],
    ['见效快', '急用', 'visible results', '只说长期', '7 天 / 28 天对比'],
    ['不假白不搓泥', '化妆前用', 'no white cast', '质地厚重', '多肤色上脸'],
    ['好携带', '差旅', 'travel size', '只做大瓶', '旅行装 / 分装']
  ],
  '健康护理': [
    ['力度可调', '怕痛 / 耐受差异', 'adjustable intensity', '只有固定档', '分档说明 + 人群建议'],
    ['不吵', '家里 / 办公室', 'quiet', '分贝不标', '标分贝'],
    ['适合老人', '给爸妈买', 'for elderly', '操作复杂', '大按键 + 一键模式'],
    ['有认证', '对身体用的', 'fda cleared', '认证不标', '公开认证编号']
  ],
  '户外运动': [
    ['收得小', '后备箱小', 'compact pack size', '收纳尺寸不标', '标收纳尺寸 / 重量'],
    ['真防水', '雨季', 'waterproof', '只写防水', '标防水指数'],
    ['一个人能用', 'solo', 'easy setup', '需两人搭', '单人搭建视频'],
    ['承得住', '体重大', 'heavy duty', '承重虚标', '实测承重']
  ],
  '母婴用品': [
    ['安全材质', '新生儿', 'bpa free', '认证不标', '公开检测报告'],
    ['一个人能操作', '独自带娃', 'one hand', '需双手', '单手演示'],
    ['好清洗', '高频使用', 'easy clean', '死角多', '全拆洗'],
    ['能用到几岁', '怕用不久', 'grows with baby', '阶段单一', '标注适用阶段']
  ],
  '家用电器': [
    ['静音', '卧室 / 夜间', 'quiet', '分贝不标', '标分贝 + 夜间实测'],
    ['好清洗', '每天用', 'easy to clean', '水箱口小', '大口径 / 可拆'],
    ['耗材便宜', '长期用', 'cheap filters', '滤芯贵', '公开耗材价格'],
    ['不虚标', '看参数买', 'real specs', '参数虚高', '第三方检测']
  ],
  '灯具照明': [
    ['护眼', '学生 / 办公', 'eye caring', '只写无频闪', '标频闪 / 显色指数'],
    ['色温可调', '多场景', 'adjustable color temperature', '只有一档', '连续可调'],
    ['装得快', '租房', 'easy install', '要打孔', '免打孔方案'],
    ['寿命长', '不想换', 'long lasting', '寿命虚标', '标小时数 + 质保']
  ],
  '汽车用品': [
    ['装得稳', '颠簸路面', 'stays in place', '夹持力弱', '颠簸实测'],
    ['不挡视线', '安全', 'does not block view', '体积大', '标尺寸 + 装车图'],
    ['适配车型', '车型多', 'fits most cars', '只写通用', '给适配清单'],
    ['好收纳', '车内空间小', 'compact', '占地方', '折叠 / 收纳尺寸']
  ],
  '厨房用具': [
    ['不伤锅', '不粘锅用户', 'non scratch', '材质太硬', '材质分级'],
    ['好洗', '每天用', 'dishwasher safe', '有死角', '可洗碗机'],
    ['不生锈', '长期用', 'rust proof', '材质不明', '标钢种'],
    ['握着顺手', '手小 / 手湿', 'comfortable grip', '手柄细滑', '防滑加粗']
  ],
  '家居清洁': [
    ['真能除毛', '养宠', 'pet hair', '只吸不集', '集毛仓演示'],
    ['不用手洗', '怕脏', 'self wringing', '要手挤', '双仓脱水'],
    ['够得着缝', '死角', 'crevice', '刷头厚', '多厚度刷头'],
    ['不伤表面', '贵家具', 'non scratch', '太硬', '划痕对比']
  ],
  '办公文具': [
    ['久坐不累', '远程办公', 'ergonomic', '支撑固定', '可调支撑'],
    ['不占地', '小桌面', 'space saving', '尺寸大', '折叠 / 夹式'],
    ['装得快', '手残党', 'easy assembly', '螺丝多', '视频 + 预装'],
    ['不塌', '重物', 'heavy duty', '承重虚标', '实测承重']
  ],
  '园艺工具': [
    ['不生锈', '户外', 'rust proof', '铁头锈', '标材质'],
    ['省力', '老人 / 硬土', 'easy grip', '手柄细', '加粗 + 杠杆'],
    ['一套够用', '新手', 'complete set', '凑数件', '标用途'],
    ['好收纳', '阳台小', 'storage bag', '散放', '配收纳']
  ],
  '玩具益智': [
    ['玩得久', '怕腻', 'open ended', '玩法单一', '进阶玩法'],
    ['入口安全', '口欲期', 'food grade', '材质不明', '认证 + 材质'],
    ['收得起来', '家里乱', 'with storage', '无收纳', '配套收纳'],
    ['不吵', '公寓', 'quiet toys', '电子音大', '无电子件']
  ]
};
