/* =========================================================
   doc.js — 第一部分：选品调研报告（文档形态）
            竞品自动从内置爆款样本库匹配，无需填写
   ========================================================= */

/* ---------- 爆款样本库 ----------
   [名称, 品牌, 价格, 评分, 评论数, 月销(件), 主卖点, 主要差评(| 分隔)]
   数值为按类目归纳的头部产品画像与公开可见量级，用于无后台数据时快速判断；
   每行附「核实」链接，可跳转平台查看当前真实数据。            */
const HOT = {
  '厨房小家电': [
    ['BlendJet 2 便携榨汁杯', 'BlendJet', 49.95, 4.5, 68400, 45000, '16oz 大容量 + USB-C + 一键自清洁', '杯体开裂|电机烧毁|半年后续航明显衰减'],
    ['Ninja Blast 无线榨汁杯', 'Ninja', 59.99, 4.4, 12800, 16000, '大牌背书 + 18oz + 免拆刀头', '机身偏重|充电慢|刀头处仍有残留'],
    ['NutriBullet Go 便携款', 'NutriBullet', 39.99, 4.3, 9400, 11000, '品牌信任 + 刀头强劲', '容量偏小|杯盖难拧|续航短'],
    ['KOIOS 6 叶便携榨汁杯', 'KOIOS', 25.99, 4.4, 8600, 18000, '性价比 + 6 叶刀头 + 赠食谱', '噪音大|密封圈易掉|打冰打不碎'],
    ['Zulay 便携搅拌杯', 'Zulay Kitchen', 29.99, 4.2, 3200, 6200, '附赠 12 道食谱 + 两年质保', '电池不耐用|杯体漏水|客服响应慢'],
    ['白牌 16oz 便携杯', 'Generic', 18.99, 4.0, 5400, 21000, '极致低价 + 多色可选', '质量差|用了两次就不转|与描述不符']
  ],
  '宠物用品': [
    ['ChomChom 除毛滚筒', 'ChomChom', 24.95, 4.5, 138000, 52000, '无需胶带 + 可反复使用', '手柄易断|长毛效果一般|滚轴变松'],
    ['FURminator 去浮毛梳', 'FURminator', 29.99, 4.4, 42000, 18000, '专业去浮毛 + 刀头可换', '刮伤皮肤|按钮卡住|不适合短毛'],
    ['Bissell 宠物毛发吸尘器', 'Bissell', 39.99, 4.3, 26000, 9000, '吸刷一体 + 大牌售后', '噪音大|电池衰减|集尘盒太小'],
    ['Uproot Clean 除毛刷', 'Uproot Clean', 19.99, 4.2, 12500, 8600, '便携 + 地毯沙发通用', '易刮伤布面|手柄松动|效果不均'],
    ['Delomo 宠物除毛手套', 'Delomo', 13.99, 4.1, 9800, 11000, '低价 + 顺毛同时除毛', '尺寸偏小|静电吸附差|洗后失效'],
    ['PetFusion 猫砂防带垫', 'PetFusion', 16.99, 4.4, 7600, 6200, '双层结构 + 易倒砂', '尺寸不合|异味|清洗麻烦']
  ],
  '家居收纳': [
    ['Sorbus 透明收纳箱', 'Sorbus', 25.99, 4.5, 46000, 15000, '可视 + 可叠 + 多尺寸组合', '塑料偏薄|卡扣易断|运输压裂'],
    ['Simple Houseware 抽屉分隔', 'Simple Houseware', 21.99, 4.6, 62000, 20000, '尺寸多 + 组合灵活', '容易滑位|材质偏软|与抽屉尺寸不合'],
    ['StorageLAB 床底收纳袋', 'StorageLAB', 27.99, 4.4, 18500, 7400, '可折叠 + 防潮 + 提手', '拉链坏|有异味|承重不足'],
    ['SONGMICS 衣柜分层架', 'SONGMICS', 22.99, 4.3, 15200, 6800, '免安装 + 承重强', '不稳|掉漆|尺寸有误差'],
    ['mDesign 窄缝收纳架', 'mDesign', 19.99, 4.2, 8800, 5200, '窄缝利用 + 抽取顺手', '焊点开裂|生锈|层高不够'],
    ['白牌 真空压缩袋', 'Generic', 15.99, 4.0, 21000, 26000, '低价 + 省空间', '漏气|异味|拉链裂开']
  ],
  '3C 数码': [
    ['Anker 磁吸充电宝', 'Anker', 39.99, 4.5, 32000, 24000, '品牌 + 磁吸 + 快充', '发热|容量虚标|吸附力弱'],
    ['LISEN 车载手机支架', 'LISEN', 25.99, 4.4, 28000, 19000, '稳固 + 单手取放', '胶脱落|夹臂变松|异响'],
    ['Belkin 无线充电板', 'Belkin', 34.99, 4.4, 15000, 8000, 'MFi 认证 + 做工', '充电慢|指示灯刺眼|发热'],
    ['UGREEN USB-C 扩展坞', 'UGREEN', 29.99, 4.5, 12000, 7600, '多口 + 传输稳定', '接口松动|发热|4K 掉帧'],
    ['JSAUX 快充线套装', 'JSAUX', 15.99, 4.3, 9800, 12000, '编织耐用 + 多规格', '快充不识别|接头松'],
    ['Spigen 手机保护壳', 'Spigen', 19.99, 4.6, 45000, 30000, '防护 + 手感', '发黄|按键偏硬|磁吸偏弱']
  ],
  '美妆个护': [
    ['COSRX 蜗牛修护精华', 'COSRX', 15.00, 4.6, 92000, 38000, '成分 + 口碑复购', '过敏|包装漏液|质地偏黏'],
    ['CeraVe 保湿修护霜', 'CeraVe', 16.99, 4.7, 128000, 42000, '皮肤科医生背书', '质地偏厚|泵头易坏|无明显香味反而被差评'],
    ['Mielle 迷迭香护发精油', 'Mielle', 9.99, 4.4, 84000, 35000, '生发概念 + 社媒爆量', '过敏|用后无感|瓶口漏'],
    ['Laneige 睡眠面膜', 'Laneige', 23.00, 4.5, 41000, 16000, '品牌 + 礼盒装', '假货争议|香味太浓|容量偏少'],
    ['The Ordinary 精华', 'The Ordinary', 8.90, 4.5, 63000, 22000, '成分透明 + 低价', '刺激|包装简陋|滴管不好用'],
    ['e.l.f. 定妆喷雾', 'e.l.f.', 6.00, 4.4, 71000, 28000, '极致性价比', '喷头粗|持妆短|味道大']
  ],
  '户外运动': [
    ['Coleman 露营灯', 'Coleman', 49.99, 4.5, 21000, 9000, '品牌 + 续航 + 防水', '进水|开关失灵|亮度衰减'],
    ['Ozark Trail 折叠椅', 'Ozark Trail', 24.97, 4.3, 16000, 12000, '低价 + 便携', '承重不足|焊点断裂|收纳袋易破'],
    ['Klymit 轻量充气垫', 'Klymit', 59.99, 4.4, 9800, 4200, '轻量 + 保暖值', '漏气|气阀坏|气味大'],
    ['NEMO 双人帐篷', 'NEMO', 199.00, 4.6, 6200, 1800, '专业防水 + 轻', '价格高|搭建复杂|冷凝水'],
    ['Therm-a-Rest 睡垫', 'Therm-a-Rest', 89.95, 4.5, 7400, 2600, '舒适 + 耐用', '价高|收纳体积大|气阀松'],
    ['白牌 露营天幕', 'Generic', 39.99, 4.0, 13000, 8600, '低价 + 出片', '撑杆断|布线孔少|防水差']
  ],
  '母婴用品': [
    ['Boppy 哺乳枕', 'Boppy', 39.99, 4.6, 62000, 14000, '经典款 + 支撑好', '填充塌陷|外套难拆|有味道'],
    ['Nanit 婴儿监视器', 'Nanit', 299.00, 4.4, 8600, 2200, 'AI 睡眠监测 + 大牌', '价格高|断连|要订阅费'],
    ['Frida 吸鼻器套装', 'Frida', 19.99, 4.5, 34000, 11000, '好用 + 一整套', '难清洗|吸力不足|配件缺'],
    ['Dr. Brown\'s 防胀气奶瓶', 'Dr. Brown\'s', 17.99, 4.6, 52000, 16000, '防胀气专利', '漏奶|配件多难洗'],
    ['MAM 安抚奶嘴', 'MAM', 14.99, 4.6, 41000, 13000, '材质 + 形状贴合', '尺寸不合|易丢|单只装不划算'],
    ['Itzy Ritzy 婴儿背带', 'Itzy Ritzy', 89.99, 4.3, 6200, 2400, '颜值 + 多姿势', '肩带勒|扣具太紧|闷热']
  ],
  '服饰配饰': [
    ['白牌 Oversized 卫衣', 'Generic', 29.99, 4.3, 22000, 26000, '低价 + 版型好', '起球|色差|尺码偏大'],
    ['斜挎小方包', 'Generic', 24.99, 4.4, 18000, 15000, '颜值 + 通勤', '拉链卡|掉色|肩带断'],
    ['亚麻衬衫', 'Generic', 32.99, 4.2, 12000, 9000, '透气 + 度假感', '缩水|透|线头多'],
    ['运动内衣', 'Generic', 26.99, 4.5, 31000, 18000, '支撑 + 不压胸', '尺码不准|肩带下滑'],
    ['棒球帽', 'Generic', 15.99, 4.3, 26000, 14000, '低价 + 多色', '变形|标志脱落'],
    ['打底裤', 'Generic', 9.99, 4.1, 35000, 30000, '极低价', '勾丝|掉档|不透气']
  ],
  '家居清洁': [
    ['O-Cedar 旋转拖把套装', 'O-Cedar', 34.99, 4.5, 68000, 22000, '免手洗 + 双桶分离', '桶身脆|甩干不均|手柄松动'],
    ['Scrub Daddy 温感海绵', 'Scrub Daddy', 12.99, 4.6, 92000, 40000, '遇温变软 + 不刮伤涂层', '易碎|寿命短|单价偏高'],
    ['Bissell 手持清洁机', 'Bissell', 89.99, 4.4, 31000, 8000, '喷抽一体 + 大牌售后', '机身重|水箱小|清洗麻烦'],
    ['静电除尘掸', 'Generic', 14.99, 4.3, 24000, 15000, '一次性 + 可弯折杆', '杆太短|头易掉|吸附一般'],
    ['浴室刷四件套', 'Generic', 16.99, 4.2, 18000, 12000, '多刷头 + 长柄', '刷毛偏软|杆生锈|接头松'],
    ['玻璃刮', 'Generic', 11.99, 4.1, 15000, 13000, '低价 + 硅胶条', '留水痕|胶条脱落|吸盘不牢']
  ],
  '灯具照明': [
    ['Govee LED 智能灯带', 'Govee', 29.99, 4.5, 62000, 24000, 'APP 调色 + 音乐律动 + 免钉胶', '背胶脱落|颜色偏差|APP 广告多'],
    ['Philips Hue 氛围灯', 'Philips', 89.99, 4.4, 38000, 9000, '生态完善 + 显色准', '价格高|需网关|兼容性挑设备'],
    ['LEPOWER 太阳能庭院灯', 'LEPOWER', 32.99, 4.3, 28000, 15000, '免布线 + 光感自动 + 防水', '半年后变暗|电池不可换|地插易断'],
    ['Brightech 落地氛围灯', 'Brightech', 59.99, 4.3, 12000, 5200, '设计感强 + 亮度足', '灯罩易碎|开关松动|包装简陋'],
    ['SUNTHIN 庭院串灯', 'SUNTHIN', 26.99, 4.4, 19000, 8600, '防水 + 可串接 + 暖光', '一颗坏全串灭|线材偏短|接头进水'],
    ['磁吸感应夜灯', 'Generic', 12.99, 4.0, 34000, 28000, '低价 + 磁吸 + 充电', '感应迟钝|续航短|亮度不足']
  ],
  '汽车用品': [
    ['Baseus 出风口支架', 'Baseus', 19.99, 4.4, 58000, 26000, '单手取放 + 卡扣稳固', '颠簸掉落|卡扣断裂|夹不住厚壳'],
    ['NOCO 应急启动电源', 'NOCO', 99.95, 4.7, 62000, 14000, '大电流 + 反接保护', '价格高|线材偏硬|说明简略'],
    ['LISEN 磁吸车载支架', 'LISEN', 16.99, 4.3, 41000, 22000, '磁吸 + 360 度旋转', '磁力不够|胶垫脱落|挡出风口'],
    ['后备箱折叠收纳箱', 'Avid Armor', 32.99, 4.5, 8600, 4800, '可折叠 + 防滑底 + 多隔层', '拉链卡|材质偏软|异味'],
    ['通用车用脚垫', 'Motor Trend', 26.99, 4.2, 33000, 15000, '通用尺寸 + 易冲洗', '尺寸不合|边缘翘起|橡胶味重'],
    ['无线车载吸尘器', 'Generic', 22.99, 3.9, 19000, 18000, '低价 + 无线 + 多吸头', '吸力弱|续航短|滤网易堵']
  ],
  '玩具益智': [
    ['Melissa & Doug 木质拼图', 'Melissa & Doug', 19.99, 4.7, 54000, 18000, '木质 + 安全水性漆', '木屑毛刺|图案单调|尺寸偏小'],
    ['LEGO Classic 积木盒', 'LEGO', 39.99, 4.8, 46000, 12000, '品牌 + 通用兼容', '价格高|颗粒偏少|收纳盒薄'],
    ['蒙氏教具套装', 'Learning Resources', 24.99, 4.6, 22000, 9500, '分龄设计 + 教具专业', '小零件多|说明简略|收纳不便'],
    ['忙碌板 Busy Board', 'Generic', 27.99, 4.4, 16000, 12000, '一板多练 + 可携带', '扣件易掉|边角毛刺|气味大'],
    ['磁力片 60 片', 'MAGBLOCK', 36.99, 4.5, 31000, 20000, '磁力强 + 透光好看', '磁铁脱落风险|边角开裂|数量不足'],
    ['早教故事机', 'Generic', 18.99, 3.9, 21000, 16000, '低价 + 内容多', '音质差|按键失灵|内容粗糙']
  ],
  '办公文具': [
    ['HUANUO 笔记本支架', 'HUANUO', 25.99, 4.6, 47000, 20000, '铝合金 + 高度可调 + 散热', '转轴松动|边缘刮手|承重不够'],
    ['Rain Design mStand', 'Rain Design', 49.90, 4.7, 21000, 6000, '一体铝 + 极稳', '价格高|角度不可调|占地方'],
    ['桌面手机支架', 'Lamicall', 12.99, 4.5, 68000, 30000, '低价 + 多角度', '底座轻|涂层掉漆|夹持力不足'],
    ['双屏显示器支架', 'Nulaxy', 39.99, 4.3, 9200, 4200, '双屏 + 承重强', '安装复杂|夹伤桌面|轻微晃动'],
    ['桌面多格收纳盒', '得力', 15.99, 4.4, 26000, 13000, '低价 + 多格 + 抽屉式', '塑料偏薄|抽屉卡|尺寸偏小'],
    ['硅胶理线器', 'Generic', 9.99, 4.1, 15000, 16000, '低价 + 多孔位', '粘不牢|易变形|只适合细线']
  ],
  '园艺工具': [
    ['Fiskars 修枝剪', 'Fiskars', 18.99, 4.7, 42000, 16000, '省力杠杆 + 不锈钢刀片', '弹簧易脱|手柄夹手|刀片生锈'],
    ['园艺三件套 + 收纳袋', 'Generic', 21.99, 4.3, 26000, 18000, '一套配齐 + 便携袋', '焊接处断|木柄开裂|袋子太薄'],
    ['长嘴浇水壶', 'VIVOSUN', 17.99, 4.5, 15000, 9000, '长嘴精准 + 容量足', '壶身偏软|长嘴易折|刻度不清'],
    ['自吸水种植箱', 'Generic', 24.99, 4.2, 12000, 7000, '自吸水 + 可拼接', '漏水|塑料脆|拼缝大'],
    ['三面齿修枝锯', 'Corona', 29.99, 4.6, 8600, 4200, '三面齿 + 快切', '手柄滑|易卡枝|偏重'],
    ['防刺园艺手套', 'Generic', 9.99, 4.1, 33000, 26000, '低价 + 防刺 + 透气', '易破|尺码偏大|指尖磨穿']
  ],
  '家用电器': [
    ['Levoit Classic 300S 加湿器', 'Levoit', 49.99, 4.6, 92000, 38000, '超声波静音 + 智能湿度控制', '水箱难清洗|出雾口结垢|传感器不准'],
    ['LEVOIT Core 300 净化器', 'Levoit', 99.99, 4.7, 78000, 26000, 'H13 真 HEPA + 静音档 24dB', '滤芯贵|外壳易刮花|夜间灯不能全关'],
    ['Anker Nebula 投影仪', 'Anker', 299.99, 4.4, 21000, 5200, '自动对焦 + 梯形校正 + 内置电池', '亮度虚标|风扇噪音|系统卡顿'],
    ['Dreo 塔扇', 'Dreo', 69.99, 4.5, 34000, 12000, '12 档风速 + 90 度摇头 + 遥控', '遥控易丢|塑料味|底座晃动'],
    ['iRobot Roomba 694', 'iRobot', 249.99, 4.3, 46000, 8000, '品牌信任 + 自动回充', '缠绕毛发|APP 掉线|边刷易断'],
    ['USB 迷你加湿器', 'Generic', 15.99, 4.0, 18000, 25000, '极致低价 + 七彩夜灯', '漏水|两月不出雾|噪音大']
  ],
  '厨房用具': [
    ['Victorinox Fibrox 主厨刀', 'Victorinox', 46.99, 4.8, 36000, 9000, '瑞士钢 + 防滑柄', '出厂不够锋利|刀柄偏窄|包装简陋'],
    ['OXO Good Grips 砧板', 'OXO', 24.99, 4.7, 41000, 16000, '导流槽 + 防滑边', '刀痕明显|尺寸偏小|会轻微翘'],
    ['Rubbermaid Brilliance 保鲜盒', 'Rubbermaid', 29.99, 4.6, 52000, 22000, '倒扣不漏 + 可叠放', '扣件偏紧|盖子染色|价格偏高'],
    ['Ninja 不粘锅套装', 'Ninja', 79.99, 4.5, 28000, 8000, '耐磨涂层 + 可进烤箱', '用半年粘锅|手柄发烫|偏重'],
    ['Joseph Joseph 分类砧板', 'Joseph Joseph', 34.99, 4.5, 19000, 7200, '三件分色 + 立式收纳', '刀痕深|立架不稳|价格高'],
    ['硅胶厨具 12 件套', 'Generic', 19.99, 4.2, 26000, 20000, '极低价 + 一整套', '有异味|接缝开裂|手柄松']
  ],
  '健康护理': [
    ['Renpho 智能体脂秤', 'Renpho', 25.99, 4.6, 78000, 30000, 'APP 同步 + 13 项数据', '连不上手机|数值漂移|玻璃易滑'],
    ['Copper Fit 护膝', 'Copper Fit', 19.99, 4.1, 62000, 34000, '铜纤维护理 + 无感穿戴', '弹性衰减|尺码偏小|洗后变形'],
    ['Renpho 眼部按摩仪', 'Renpho', 49.99, 4.4, 31000, 11000, '热敷 + 气压 + 蓝牙音乐', '压得太紧|续航虚标|噪音明显'],
    ['Theragun Relief 筋膜枪', 'Theragun', 199.00, 4.4, 12000, 2800, '大牌 + 低噪深打', '价格高|机身偏重|附件少'],
    ['Carex 足浴盆', 'Carex', 59.99, 4.3, 8600, 3600, '恒温 + 气泡按摩', '倒水费劲|加热慢|占地方'],
    ['颈椎按摩仪', 'Generic', 29.99, 3.9, 24000, 21000, '低价 + 多模式', '电流刺痛|贴合差|一周就坏']
  ],
  /* 品类不在内置库时的通用参照：跨类目头部爆款，只用于出量级，不冒充该品类竞品 */
  '（未填品类）': [
    ['Stanley Quencher 保温杯', 'Stanley', 45.00, 4.7, 128000, 62000, '社媒爆款 + 保温 24 小时', '漏水|涂层脱落|杯体重'],
    ['Anker 20000mAh 充电宝', 'Anker', 39.99, 4.6, 92000, 28000, '品牌 + 快充 + 安全认证', '容量虚标|发热|接口松'],
    ['可折叠收纳箱', 'Sorbus', 25.99, 4.5, 46000, 15000, '可视 + 可叠 + 多尺寸', '塑料偏薄|卡扣易断|运输压裂'],
    ['宠物除毛滚筒', 'ChomChom', 24.95, 4.5, 138000, 52000, '无需胶带 + 可反复用', '手柄易断|长毛效果一般|滚轴变松'],
    ['LED 智能灯带', 'Govee', 29.99, 4.5, 62000, 24000, 'APP 调色 + 免钉胶', '背胶脱落|颜色偏差|APP 广告多'],
    ['出风口车载支架', 'Baseus', 19.99, 4.4, 58000, 26000, '单手取放 + 卡扣稳固', '颠簸掉落|卡扣断裂|夹不住厚壳']
  ]
};

const PAIN_CLS = [
  ['质量 / 耐用', /(坏|烧|裂|断|生锈|松|掉漆|不耐用|质量|变形|塌|发黄|起球|勾丝|虚标)/],
  ['清洗麻烦', /(清洗|难洗|洗后|残留|异味|味道|易丢|配件多)/],
  ['漏水 / 密封', /(漏水|漏气|漏|密封|渗|卡扣|拉链)/],
  ['续航 / 充电', /(续航|充电|电池|电量|充不进|断连)/],
  ['效果不达标', /(打不碎|不转|没效果|无感|吸力不足|亮度衰减|掉色|不稳|掉档|卡|松脱)/],
  ['噪音 / 发热', /(噪音|吵|声音|发热|烫)/],
  ['尺寸 / 容量', /(容量|尺寸|太小|偏小|偏大|体积|占位|不合|偏重|重)/],
  ['描述不符', /(不符|与描述|差距|说明|误|骗|色差|透)/],
  ['售后 / 客服', /(客服|售后|退|保修|响应|订阅)/]
];

const PAIN_FIX = {
  '质量 / 耐用': '把「耐用」做成可验证的承诺：公开电机/结构测试次数、给出 12 个月只换不修，并在第 4 张主图放内部结构实拍。',
  '清洗麻烦': '把「好洗」变成一秒可懂的动作：拍「加水—按一下—倒掉」三连拍视频，标题直接写 10 秒自清洁。',
  '漏水 / 密封': '密封是最容易做差异化的点：做倒置 24 小时不漏的实拍，并在五点第一条承诺「包内倒放不漏」。',
  '续航 / 充电': '用「一周一充」替代毫安时：给出真实混合场景的连续杯数，并统一 USB-C，消灭专用充电座。',
  '效果不达标': '把效果做成对比：同角度「用前/用后」+ 冰块、冻果、坚果三组硬测试，胜过任何形容词。',
  '噪音 / 发热': '安静是可感知的卖点：标注实测分贝值（≤62dB），拍「清晨在婴儿房使用」的场景。',
  '尺寸 / 容量': '尺寸最容易做错：主图第 4 张放「与常见物品同框」比例图，并把克重、容量写在图上。',
  '描述不符': '落差来自图片过度：改用真实使用场景拍摄，参数表逐项对应实物，减少退货率。',
  '售后 / 客服': '售后是转化器：把「30 天无理由 + 12 个月质保」做成主图角标与详情页固定条。'
};

/* ---------- 统计 ---------- */
/* 兜底不再偷偷换成榨汁杯：品类没命中时给「通用参照」并标记，报告里会明说这批不是该品类竞品 */
function hotList(cat) { return HOT[cat] || HOT['（未填品类）']; }
function hotIsGeneric(cat) { return !HOT[cat] || cat === '（未填品类）'; }
function bads(p) { return String(p[7] || '').split('|').filter(Boolean); }
function classify(t) { for (const [n, re] of PAIN_CLS) if (re.test(t)) return n; return '其他'; }

function hotStats(list) {
  const prices = list.map(p => p[2]);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const sorted = [...prices].sort((a, b) => a - b);
  const med = sorted.length % 2 ? sorted[(sorted.length - 1) / 2]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const sales = list.reduce((a, p) => a + p[5], 0);
  const revs = list.reduce((a, p) => a + p[4], 0);
  const top1 = Math.max(...list.map(p => p[4]));
  const painMap = {};
  list.forEach(p => {
    new Set(bads(p).map(classify)).forEach(k => { painMap[k] = (painMap[k] || 0) + 1; });
  });
  const pains = Object.entries(painMap).filter(([k]) => k !== '其他').sort((a, b) => b[1] - a[1]);
  return { prices, avg, med, min: sorted[0], max: sorted[sorted.length - 1], sales, revs, top1, painMap, pains, top1Share: top1 / revs };
}

/* 机会评分 */
function hotScore(list, st, ctx) {
  const pf = pfOf(ctx.platform);
  const gm = 55;
  const net = gm - pf.fee;
  const demand = st.sales > 120000 ? 10 : st.sales > 80000 ? 9 : st.sales > 50000 ? 8 : st.sales > 25000 ? 6 : 4;
  const comp = st.top1Share > .5 ? 2 : st.top1Share > .38 ? 4 : st.top1Share > .28 ? 6 : 8;
  const profit = net > 40 ? 10 : net > 32 ? 8 : net > 24 ? 6 : net > 16 ? 4 : 2;
  const diff = clamp(st.pains.length * 1.6 + 2, 2, 10);
  const content = { '厨房小家电': 9, '宠物用品': 9, '美妆个护': 10, '3C 数码': 7, '家居收纳': 7, '户外运动': 8, '母婴用品': 7, '服饰配饰': 8 }[ctx.category] || 7;
  const total = demand * .28 + comp * .22 + profit * .26 + diff * .14 + content * .10;
  return { demand, comp, profit, diff, content, total, net };
}

/* ---------- 报告 ---------- */
function buildReport(ctx) {
  const cat = (ctx.category || '').trim() || '（未填品类）';
  /* 标题里不能出现「（未填品类）」这种内部键名；
     认出具体形态后要写成「大类 › 形态」，否则「服饰配饰」四个字盖住了真正在卖的货 */
  const _pf = (ctx.__auto && ctx.__auto.profile) || null;
  const _form = _pf && _pf.zh ? String(_pf.zh).split(/\s*\/\s*/)[0] : '';
  const catLabel = cat === '（未填品类）'
    ? '品类待确认'
    : (_form && _form !== cat ? cat + ' › ' + _form : cat);
  const list = hotList(cat);
  const st = hotStats(list);
  const sc = hotScore(list, st, ctx);
  const sym = mkOf(ctx.market).sym;
  const mk = mkOf(ctx.market), pf = pfOf(ctx.platform);
  const date = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const prod = ctx.product || '待定产品';
  /* 品类留空时报告按「厨房小家电」出样本，决策层也要用同一个品类，否则风险闸门会退到「未填品类」 */
  const CX = Object.assign({}, ctx, { category: cat });
  /* 四关放行：需求 / 利润 / 风险是一票否决，竞争只决定「怎么进」 */
  const G = selGates(CX, list, st, sc);
  const W = G.weakest;
  /* 4 分是「四关都偏低但没红线」，只有当某一关真的掉到 3 分以下才一票否决 */
  const veto = G.parts.filter(p => p.veto && p.v < 4);
  let tone, verdict, vWhy;
  if (cat === '（未填品类）') {
    /* 品类都没定，四关的两关（竞争、利润）本来就是拿别的类目算的，给结论等于骗人 */
    tone = 'mid'; verdict = '先定品类';
    vWhy = '下面的竞品与价格用的是跨类目通用样本，竞争强度和利润空间都不是这个产品的真实值。先在上方把品类定下来，四关与结论才有意义 —— 这一步比任何打分都重要。';
  } else if (veto.length) {
    tone = 'bad'; verdict = '不建议硬打';
    vWhy = `${veto[0].k}只有 ${veto[0].v}/10 —— ${veto[0].why}。这一关是硬约束，补不上就不该投钱。`;
  } else if (G.parts[1].v <= 5) {
    tone = 'mid'; verdict = '谨慎进 · 只打差异化';
    vWhy = `需求与利润都成立，但首屏被锁：第一名占 ${pct(st.top1Share)} 的评论存量，正面拼量与比价没有胜算。只能靠形态差异或一个一眼能看懂的改良绕开。`;
  } else if (W.v < 6) {
    tone = 'mid'; verdict = '谨慎进';
    vWhy = `四关里最短的一块是${W.k}（${W.v}/10）：${W.why}。能进，但先把这一关补上，再谈铺货。`;
  } else if (sc.total >= 7) {
    tone = 'good'; verdict = '值得进';
    vWhy = '四关都过 6 分：需求是真的、首屏有缝隙、账算得过来、风险能兜住。适合以差异化切入，不打价格战。';
  } else {
    tone = 'mid'; verdict = '谨慎进';
    vWhy = '四关都过了及格线，但综合分不高：能进，要小步测款，别一次备大货。';
  }


  /* 评论数据：优先用导入的真实评论，否则用内置样本 */
  const RVI = rvItems(ctx);
  const RVA = rvAnalyze(RVI.items);
  const pains = RVA.pains.length ? RVA.pains.map(p => [p.k, p.count]) : st.pains;
  const negTotal = RVA.neg || RVA.n || 1;
  const topPain = pains[0] ? pains[0][0] : '质量 / 耐用';

  const kw = kwClusters(Object.assign({}, ctx, { category: cat }));
  const brandTop = list[0];
  /* 竞品来源要诚实：品类没命中库 → 通用样本；品类是推断的 → 用的是最接近类目的样本 */
  const guessCat = !!(ctx.__auto && ctx.__auto.profile && ctx.__auto.profile.hit === 'guess');
  const genSample = hotIsGeneric(cat) || guessCat;
  const genWhy = cat === '（未填品类）'
    ? `「${esc(prod)}」没能识别出品类，下面用的是跨类目通用爆款做量级参照。方法与阈值可以照用，但结论不能当成该品类的真实结果 —— 请在侧栏「项目信息 · 品类」里从 ${Object.keys(CAT).length - 1} 个内置品类中选一个，整篇会立刻重算。`
    : hotIsGeneric(cat)
      ? `内置样本库没有「${esc(cat)}」这个品类，下面用的是跨类目通用爆款做量级参照。方法与阈值可以照用，但结论不能当成该品类的真实结果 —— 请从 ${Object.keys(CAT).length - 1} 个内置品类里选一个，或用附录脚本抓真实竞品后重跑。`
      : `「${esc(prod)}」没有命中内置品类库，报告按最接近的「${esc(cat)}」取竞品。如果这个归类不对，点侧栏「手动改品类」换一个，整篇会立刻重算。`;






  const topTheme = (emoOf(ctx).themes || []).slice(0, 3)
    .map(t => String(t[0]).replace(/[「」]/g, ''));
  const _net = (ctx.__auto && ctx.__auto.source === 'net' && ctx.__auto.net) || null;
  /* 这次联网真抓到的在售款：只列原始事实（标题/价格/评分/评论数），不编月销 */
  const _live = (ctx.__auto && ctx.__auto.live) || null;
  const liveBox = (() => {
    const rows = (_live && _live.products) || [];
    if (!rows.length) return '';
    const at = _live.at ? (() => {
      const d = new Date(_live.at), z = n => (n < 10 ? '0' : '') + n;
      return `${d.getMonth() + 1}/${d.getDate()} ${z(d.getHours())}:${z(d.getMinutes())}`;
    })() : '';
    return `<div class="livebox">
      <div class="livebox-h"><b>${at} 实时抓到 ${rows.length} 款在售</b><span>价格与评分是页面原值；月销平台不公开，这里不给估算</span></div>
      <table class="ltab"><thead><tr><th>在售款</th><th>价格</th><th>评分</th><th>评论数</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(r.t)}</td><td>${sym}${r.p || '—'}</td><td>${r.r ? r.r.toFixed(1) : '—'}</td><td>${r.c ? r.c.toLocaleString('en-US') : '—'}</td></tr>`).join('')}
      </tbody></table>
      <div class="livebox-f">这张表是页面原值；下面的集中度、价格带、四象限仍用类目内置样本算（含品牌与差评共性），价格带已按这批在售校正。评论正文不在这里：亚马逊现在要登录才给评论页，正文请在页面顶部「粘贴导入」贴进来，或跑一次本机桥。</div>
    </div>`;
  })();
  const kwMax = Math.max.apply(null, kw.rows.map(r => r.idx));
  /* 实时词的时间戳：告诉读者这批词是什么时候从亚马逊下拉框抓的 */
  const liveAt = (() => {
    const t = ctx.__auto && ctx.__auto.live && ctx.__auto.live.at;
    if (!t) return '';
    const d = new Date(t), z = n => (n < 10 ? '0' : '') + n;
    return `${d.getMonth() + 1}/${d.getDate()} ${z(d.getHours())}:${z(d.getMinutes())}`;
  })();

  /* 细分定位：大类 › 形态 › 款式。放在第二章末尾，因为它回答的是「货在哪一格」 */
  const vsegHtml = (() => {
    const _s = (typeof subRows === 'function') ? subRows(ctx) : null;
    if (!_s) return '';
    const _path = (_form && _form !== _s.cur.zh) ? `${cat} › ${_form} › ${_s.cur.zh}` : `${cat} › ${_s.cur.zh}`;
    const _ov = _s.rows.filter(r => r.rel.indexOf('价格重叠') > -1).length;
    return `<p class="vseg">细分定位：<b>${esc(_path)}</b>（${sym}${_s.cur.lo}–${sym}${_s.cur.hi}）。${_s.autoPick
      ? '产品名只到形态这一级，这是按主流款算的；补一个款式词（工装 / 阔腿 / 大码都行）会整表重排。'
      : ''}同价位还有 ${_ov} 个细分款在抢同一批人。</p>`;
  })();

  return `
<div class="docwrap">
  <article class="paper" id="paper">
    <header class="phd">
      <div class="pkick">选品调研报告 · ${date}</div>
      <h1>${esc(prod)} · ${esc(catLabel)}<br>${esc(ctx.market || '美国')}市场进入评估</h1>
      <div class="pmeta">
        <span>品类 <b>${esc(catLabel)}</b></span>
        <span>市场 <b>${esc(ctx.market || '美国')}</b></span>
        <span>平台 <b>${esc(ctx.platform || 'Amazon')}</b></span>
        <span>价格带 <b>${ctx.price ? sym + ctx.price : sym + st.med}</b></span>
        <span>样本 <b>${(_net && _net.n ? _net.n + ' 款实时竞品' : '6 款头部产品')}</b></span>
      </div>
    </header>

    <div class="docbar">
      <div class="docbar-l">
        <b>评论数据源</b>
        <span>${RVI.source === 'user'
      ? `已导入 ${RVA.n} 条真实评论${RVI.name ? ' · ' + esc(RVI.name) : ''}`
      : `内置样本 ${RVA.n} 条 · ${esc(RVI.name)}`}</span>
      </div>
      <div class="docbar-r">
        <button class="btn xs primary" data-rv="net">联网抓取</button>
        <button class="btn xs" data-rv="paste">粘贴评论</button>
        <button class="btn xs" data-rv="file">上传 CSV</button>
        ${RVI.source === 'user' ? '<button class="btn xs" data-rv="reset">改用样本</button>' : ''}
        <a class="btn xs" href="#apx" data-anchor="apx">采集说明</a>
      </div>
    </div>
    <div class="rvdock" id="rvdock" hidden></div>

    <p class="pguide"><b>怎么读这份报告</b>：① 抓关键词 → ② 定品类（大类 › 款式 › 功能）→ ③ 看竞品 → ④ 抓评论 → ⑤ 判断值不值得做。前四章是材料，结论在第六章；急着看结果可以直接跳到 <a class="lk" href="#ch6" data-anchor="ch6">第六章</a>，但不建议——先看材料再看判断，才知道这个分数是怎么来的。</p>

    <section class="ch" id="ch1">
      <h2><i>第一章</i>关键词簇 · 先抓词</h2>
      <p class="plead">${cat === '（未填品类）'
        ? '选品从词开始。下面这些词是按产品名拆出的通用组合 —— <b>品类没定，词就没有落点</b>，先当方向看，定完品类会重算成该品类的真实词簇。'
        : '选品从词开始，不从货开始。先确认这个词在平台上被谁搜、当成什么在搜 —— <b>核心词决定你进哪个战场</b>，长尾词决定首月有没有单。条长表示投放优先级。'}</p>
      ${(kw.live && kw.live.length) ? `<p class="ksrc">标「实时词」的三条是 ${liveAt} 刚从亚马逊下拉框取的 —— 买家现在就这么搜，可以直接投手动精准。</p>` : ''}
      ${!kw.rows.length ? `<div class="stopbox"><b>品类没定，词就没有落点</b><span>「${esc(prod)}」还没识别出品类，硬拼出来的英文词投出去也是浪费预算。先在侧栏「项目信息 · 品类」选一个，或点上面的「联网核实品类」，这一章会立刻重算成该品类的真实词簇。</span></div>` : ''}
      <div class="kwlist">
        ${kw.rows.slice(0, 12).map(r => `
        <div class="kwrow">
          <div class="kw-t"><b>${esc(r.k)}</b><span>${r.type} · ${esc(r.use)}</span></div>
          <div class="kw-b"><i style="width:${(r.idx / kwMax * 100).toFixed(0)}%"></i></div>
        </div>`).join('')}
      </div>
      <p class="pconcl">标题公式：<b>核心词 + 卖点词 + 场景词 + 规格</b>。Amazon 只收录前 200 字符，堆词不加权，重复词只会浪费位置。下一步：拿这些词反推品类 —— 词把人带到哪一格，货就得站进哪一格。</p>
    </section>

    ${catSection(ctx, 2, vsegHtml)}
    ${compSection(ctx, list, st, 3, (genSample ? `<div class="stopbox"><b>竞品来源要说清楚</b><span>${genWhy}</span></div>` : '') + liveBox)}
    ${reviewSection(ctx, RVA, RVI, 4)}
    ${emotionSection(ctx, 5)}

    <section class="ch" id="ch6">
      <h2><i>第六章</i>值不值得做</h2>
      ${cat === '（未填品类）'
        ? `<p class="plead">品类还没定，这一章先不下判断：四关里的竞争与利润是拿跨类目通用样本算的，算出来也是假数。<b>先在侧栏把品类定下来</b>，这一章会立刻重算 —— 定品类这一步，比后面任何一个分数都重要。</p>`
        : `<p class="plead">前面五章都是材料，这一章才下判断。<b>四关放行条</b>：需求真实、竞争可插、利润够撑、风险可解。前三关是硬约束 —— 任何一关掉到 4 分以下直接否；竞争不参与否决，只决定「怎么进」。</p>`}
      <div class="verdict2 ${tone}">
        <div class="verdict2-g">${vizGauge(sc.total, { label: cat === '（未填品类）' ? '数据不足' : '机会分', note: verdict, tone })}</div>
        <div class="verdict2-t">
          <p class="vlead">${vWhy}</p>
          ${cat === '（未填品类）' ? `<div class="vfacts">
            <div><em>下一步</em><b>定品类</b><span>侧栏「项目信息 · 品类」下拉，${Object.keys(CAT).length - 1} 个内置品类</span></div>
            <div><em>或者</em><b>抓竞品</b><span>用附录脚本抓 3 个竞品，导入后按真实标题归类</span></div>
          </div>` : `<div class="vfacts">
            <div><em>钱在哪</em><b>${sym}${st.min}–${sym}${st.max}</b><span>头部月销约 ${Math.round(st.sales / 1000)}k 件，中位价 ${sym}${st.med}</span></div>
            <div><em>谁挡路</em><b>${pct(st.top1Share)}</b><span>${esc(brandTop[1])} 独占评论存量，拼量没有胜算</span></div>
            <div><em>打哪里</em><b>${pct(pains[0] ? pains[0][1] / negTotal : 0)}</b><span>差评集中在「${esc(topPain)}」</span></div>
          </div>`}
        </div>
      </div>
      ${cat === '（未填品类）' ? '' : gateBarHtml(G)}

      <h3>四道闸门逐条过</h3>
      ${riskSection(CX, 6)}

      ${cat === '（未填品类）' ? '' : `<p class="pnote">建议动作：定价 ${sym}${Math.round(st.med * 0.82)}–${sym}${Math.round(st.med * 1.05)}（低于中位、高于白牌），毛利 ${pct(G.gm)}、保本 ROAS ${G.beRoas ? G.beRoas.toFixed(2) : '—'}，广告花过这条线就是亏；主打「${esc(topPain)}」的反向卖点，情绪走 ${esc(topTheme.join(' / '))}；首月不追销量追评分。</p>`}

      <h3>本周就做的四件事</h3>
      <ol class="plist ol">
        <li><b>先过闸：</b>按上面四盏灯逐条确认——${esc((riskGates(CX).worst || {}).k || '认证')}这一关没解决之前，不付开模费、不订大货。</li>
        <li><b>抓真实评论：</b>用附录脚本抓 3 个竞品各 50 条，导回本页 —— 痛点排序若变化，以真实数据为准。</li>
        <li><b>验证缺口并留素材：</b>买回「${esc(list[3][0])}」「${esc(list[5][0])}」实测差评是否真实存在，同时用真实样品拍「用前/用后」三组，这是后面所有投放的弹药。</li>
        <li><b>小批测款：</b>100–200 件空运，目标不是赚钱，是拿到真实转化率、退货率与 ACOS——三项同时达标才放量。</li>
      </ol>
      <div class="stopbox">
        <b>什么时候该停</b>
        <span>改良成本涨幅 &gt; 15% · 300 次点击 0 单且主图换过 3 版 · 30 天内同价位冒出 3 个以上新链接 · 认证或专利出现红字。</span>
      </div>
    </section>

    ${crawlerSection(ctx)}

    <footer class="pfoot">
      <b>数据口径</b>
      ${RVI.source === 'user'
      ? `竞品为按类目归纳的头部产品画像；评论分析基于你导入的 ${RVA.n} 条真实评论，属第一手材料。`
      : `竞品为按类目归纳的头部产品画像与公开可见量级；评论为基于真实差评语义重写的样本（${RVA.n} 条），用于跑通分析链路，不等同于平台实时数据。`}
      落地前请用真实样品与实时数据验证。报告生成于 ${date}。
    </footer>
  </article>
</div>`;
}

/* Word 导出用的最小样式 */
const DOC_WORD_CSS = `
body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;font-size:11pt;line-height:1.8;color:#111}
h1{font-size:20pt;line-height:1.4}
h2{font-size:14pt;border-bottom:1px solid #ccc;padding-bottom:6px;margin:18pt 0 10pt}
h3{font-size:11.5pt;margin:12pt 0 6pt}
table{border-collapse:collapse;width:100%;font-size:9pt}
th,td{border:1px solid #ddd;padding:5px 6px;text-align:left}
.pkick{color:#666;font-size:9pt}
.pmeta{color:#444;font-size:9pt}
.vd{border-left:3px solid #1e4fd8;padding:8px 10px;background:#f4f7fd}
.pfoot{color:#666;font-size:8.5pt;border-top:1px solid #ddd;padding-top:8px;margin-top:16pt}
.pbignum div{display:inline-block;margin-right:24pt}
.pbignum b{display:block;font-size:16pt;color:#1e4fd8}
.pbignum span{font-size:8.5pt;color:#666}
`;
