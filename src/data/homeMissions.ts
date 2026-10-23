export interface HistoricalScenario {
  id: string;
  titleZh: string;
  titleEn: string;
  eraZh: string;
  eraEn: string;
  descZh: string;
  descEn: string;
  statusZh: string;
  statusEn: string;
  isAvailable: boolean;
}

export interface ScienceTip {
  termZh: string;
  termEn: string;
  explanationZh: string;
  explanationEn: string;
}

export interface MissionSpecs {
  timeZh: string;
  timeEn: string;
  stageZh: string;
  stageEn: string;
  locationZh: string;
  locationEn: string;
  vehicleZh: string;
  vehicleEn: string;
}

export interface HomeMissionItem {
  id: number;
  key: 'liftoff' | 'docking' | 'departure' | 'landing';
  num: number;
  titleZh: string;
  titleEn: string;
  taglineZh: string;
  taglineEn: string;
  badgeZh?: string;
  badgeEn?: string;
  image: string;
  isImplemented: boolean;
  specs: MissionSpecs;
  summaryZh: string;
  summaryEn: string;
  scienceTip: ScienceTip;
  historicalScenarios?: HistoricalScenario[];
}

export const HOME_MISSIONS: HomeMissionItem[] = [
  {
    id: 1,
    key: 'liftoff',
    num: 1,
    titleZh: '升空',
    titleEn: 'Liftoff',
    taglineZh: '动力冲云霄 · 直抵星辰大海',
    taglineEn: 'Powered Ascent to Orbit',
    badgeZh: '已就绪',
    badgeEn: 'Ready',
    image: '/images/home/liftoff.jpg',
    isImplemented: true,
    specs: {
      timeZh: 'T - 00:00:00 发射点火至入轨关机（约 580 秒）',
      timeEn: 'T - 00:00:00 Ignition to Orbit Insertion (~580s)',
      stageZh: '发射台点火 ➔ 穿过稠密大气层 ➔ 一二级分离 ➔ 入轨机动',
      stageEn: 'Pad Ignition ➔ Atmospheric Penetration ➔ Stage Separation ➔ Orbit Insertion',
      locationZh: '航天发射场（酒泉/肯尼迪）➔ 近地停泊轨道（高度约 200 公里）',
      locationEn: 'Launch Complex ➔ Low Earth Parking Orbit (Altitude ~200 km)',
      vehicleZh: '重型载人运载火箭 + 载人飞船组合体',
      vehicleEn: 'Heavy Crew Launch Vehicle + Spacecraft Stack'
    },
    summaryZh:
      '伴随数千吨推力的烈焰喷涌，火箭克服地球引力拔地而起！航天员将体验数倍重力加速度的超重考验。在火箭耗尽第一级燃料后完成抛离，穿出稠密大气层，最终将速度推升至每秒近 8 公里，成功滑入失重的太空怀抱。',
    summaryEn:
      'Engines roar to life with thousands of tons of thrust, breaking free from Earth’s gravity! Astronauts endure multi-G acceleration, shed spent stages, and pierce through the dense atmosphere to reach nearly 8 km/s orbital speed.',
    scienceTip: {
      termZh: '第一宇宙速度与级间分离',
      termEn: 'First Cosmic Velocity & Staging',
      explanationZh:
        '太空中飞船能“浮”在天上不是因为没有引力，而是因为它飞得极快（约 7.9 千米/秒）！飞船向前飞的弧度正好贴合地球变弯的弧度，就形成了绕圈飞行的轨道。由于火箭太沉，燃料烧完一段就必须扔掉一段（级间分离），火箭变轻后才能持续加速冲向第一宇宙速度。',
      explanationEn:
        'Orbiting is not about zero gravity; it is about extreme speed (~7.9 km/s)! The curve of the craft matches the curvature of Earth. Rockets drop empty fuel tanks in stages so the remaining vehicle becomes light enough to reach orbital velocity.'
    },
    historicalScenarios: [
      {
        id: 'saturn-v',
        titleZh: '土星五号 · 登月火箭起飞',
        titleEn: 'Saturn V Apollo Launch',
        eraZh: 'NASA 阿波罗计划 1969',
        eraEn: 'Apollo Program 1969',
        descZh: '人类历史上最壮观的三级巨型火箭发射模拟：从点火拔地而起、重力转向穿越最大动压 (Max-Q)、一二级分离到 7.8 km/s 第一宇宙速度圆轨入轨！',
        descEn: 'Command the colossal 3-stage moon rocket from pad ignition, gravity turn & Max-Q, stage separation to 7.8 km/s orbital insertion!',
        statusZh: '已开放',
        statusEn: 'Available',
        isAvailable: true
      },
      {
        id: 'cz5',
        titleZh: '长征五号 · “胖五”空间站核心舱发射',
        titleEn: 'Long March 5 · Heavy-Lift Station Launch',
        eraZh: '中国文昌航天发射场 · 空间站工程',
        eraEn: 'Wenchang Launch Site · Space Station Program',
        descZh: '中国现役推力最大的旗舰“胖五”重型火箭，从海南文昌海滨拔地而起，将 22.5 吨空间站天和核心舱直接送入近地轨道！',
        descEn: 'China’s premier heavy cryogenic rocket launching the 22.5-tonne Tianhe space station core module directly into orbit from tropical Wenchang.',
        statusZh: '已开放',
        statusEn: 'Available',
        isAvailable: true
      }
    ]
  },
  {
    id: 2,
    key: 'docking',
    num: 2,
    titleZh: '太空站对接',
    titleEn: 'Station Docking',
    taglineZh: '毫厘微雕 · 太空穿针引线',
    taglineEn: 'Precision Orbital Rendezvous',
    badgeZh: '已就绪',
    badgeEn: 'Ready',
    image: '/images/home/docking.jpg',
    isImplemented: true,
    specs: {
      timeZh: '飞行第 2 天 · 距离 50 米逼近至机械锁紧（约 15 分钟）',
      timeEn: 'Flight Day 2 · Final 50m to Port Lock (~15 min)',
      stageZh: '姿态轴对齐 ➔ 8 米等待点悬停刹车 ➔ 消除横向漂移 ➔ 最终平稳接触锁紧',
      stageEn: 'Attitude Alignment ➔ 8m Hold Point Braking ➔ Drift Cancellation ➔ Soft Contact',
      locationZh: '近地轨道（LEO），轨道高度约 400 ~ 420 公里（绕地球一圈仅需 90 分钟）',
      locationEn: 'Low Earth Orbit (LEO), Altitude ~400-420 km (90 min orbital period)',
      vehicleZh: '载人飞船（配备 RCS 微推喷气系统） ➔ 空间站对接口',
      vehicleEn: 'Crew Spacecraft (with 6-DOF RCS) ➔ Station Docking Port'
    },
    summaryZh:
      '两艘以每秒 7.7 公里高速绕地球飞行的庞大航天器，彼此间的相对接近速度却要严格控制在每秒十几厘米以内！你将亲自操控飞船，利用六个方向的小喷气嘴，在毫无空气阻力的真空太空中克服惯性，精准对齐对接口，完成惊险的太空接吻。',
    summaryEn:
      'Traveling at 7.7 km/s above Earth, two massive spacecraft must touch at mere centimetres per second! Take manual control of thrusters in weightless vacuum, manage inertia, align the docking rings, and secure the latch.',
    scienceTip: {
      termZh: '六自由度与惯性反推刹车',
      termEn: '6-DOF & Inertial Counter-Thrust',
      explanationZh:
        '在太空中没有地面摩擦力，也没有空气阻力！你按一下喷气，飞船就会一直飞，松手绝对不会自己停下来；必须朝相反方向喷气才能“刹车”。飞船可以在前/后/左/右/上/下 6 个方向平移和翻转，这 6 种动作就叫“六自由度”（6-DOF）。',
      explanationEn:
        'There is no friction or air in orbit! When you fire a thruster, the ship keeps moving forever unless you fire in reverse to brake. 6 Degrees of Freedom (6-DOF) means the ship can move along 3 axes and rotate around 3 axes.'
    },
    historicalScenarios: [
      {
        id: 'iss-standard',
        titleZh: '国际空间站 (ISS) 标准对接演练',
        titleEn: 'ISS Standard Autonomous & Manual Docking',
        eraZh: '现役主任务',
        eraEn: 'Active Simulator',
        descZh: '循序渐进掌握惯性刹车、消除横向漂移、三轴姿态对准，最后完成 50 米完整对接！',
        descEn: 'Master braking, drift cancellation, attitude alignment, and full 50-meter docking.',
        statusZh: '已开放',
        statusEn: 'Available',
        isAvailable: true
      },
      {
        id: 'tg-sz8',
        titleZh: '天宫空间站 · 神舟快速交会对接',
        titleEn: 'Tiangong & Shenzhou Rapid Rendezvous',
        eraZh: '中国载人航天 · 2小时自主快速交会',
        eraEn: 'China Space Station · 2-Hour Autonomous Rendezvous',
        descZh: '模拟历史上令人瞩目的 2 小时自主快速交会对接黑科技。',
        descEn: 'Experience the cutting-edge 2-hour autonomous fast docking.',
        statusZh: '敬请期待',
        statusEn: 'Coming Soon',
        isAvailable: false
      },
      {
        id: 'astp-1975',
        titleZh: '阿波罗-联盟号测试计划 (ASTP 1975)',
        titleEn: 'Apollo-Soyuz Test Project (1975)',
        eraZh: '冷战破冰 · 历史首次跨国太空握手',
        eraEn: 'Historic First International Orbital Docking',
        descZh: '人类历史上不同国家航天器首次在轨道上连接并握手致意。',
        descEn: 'The historic first handshake in space between American and Soviet crews.',
        statusZh: '敬请期待',
        statusEn: 'Coming Soon',
        isAvailable: false
      },
      {
        id: 'mir-shuttle',
        titleZh: '和平号空间站 · 航天飞机交会对接',
        titleEn: 'Mir & Space Shuttle STS-71 Docking',
        eraZh: '航天飞机时代经典轨道对接',
        eraEn: 'Space Shuttle Era Orbital Rendezvous',
        descZh: '重达 100 吨的航天飞机与百吨级和平号空间站的巨大组合体对接。',
        descEn: 'A 100-ton shuttle docking with the massive Russian Mir orbital station.',
        statusZh: '敬请期待',
        statusEn: 'Coming Soon',
        isAvailable: false
      }
    ]
  },
  {
    id: 3,
    key: 'departure',
    num: 3,
    titleZh: '太空站离开',
    titleEn: 'Station Departure',
    taglineZh: '锁钩轻释 · 沿安全走廊启程',
    taglineEn: 'Undocking & Safe Departure',
    badgeZh: '已就绪',
    badgeEn: 'Ready',
    image: '/images/home/departure.jpg',
    isImplemented: true,
    specs: {
      timeZh: '任务完成准备撤离 · 脱离走廊滑行 T + 00:00 ~ T + 00:45',
      timeEn: 'Mission Completion · Departure Corridor T + 00:00 ~ T + 00:45',
      stageZh: '气密检查 ➔ 对接锁解脱 ➔ 机械弹簧轻推推开 ➔ 安全走廊脉冲倒退',
      stageEn: 'Hatch Seal Check ➔ Latches Release ➔ Spring Push-off ➔ Separation Burns',
      locationZh: '空间站正前方虚拟安全撤离锥区（高度约 420 公里）',
      locationEn: 'Station Forward Safety Departure Cone (Altitude ~420 km)',
      vehicleZh: '载人飞船组合体（推进舱 + 返回舱 + 轨道舱）',
      vehicleEn: 'Crew Return Vehicle Stack'
    },
    summaryZh:
      '完成进驻科研任务后，飞船准备返回地球。航天员不能直接开火箭喷气掉头，因为空间站伸展着数十米宽的巨型太阳能帆板！必须先依靠机械弹簧温柔推开几米，再沿严格标定的“撤离安全走廊”平稳倒退，彻底飞出碰撞保护区。',
    summaryEn:
      'Mission accomplished, the crew prepares to return. Engines cannot fire immediately near the station because plumes could damage fragile solar arrays. Spring pushers separate the crafts gently before backwards separation burns begin.',
    scienceTip: {
      termZh: '撤离安全走廊与弹簧分离',
      termEn: 'Departure Corridor & Spring Separation',
      explanationZh:
        '为什么刚松开锁不能用火箭喷气？因为火箭尾部喷出的炽热气体和化学残渣，会直接熏黑和冲刷空间站巨大的太阳能电池板及高敏镜头！所以工程师用机械弹簧把飞船轻轻“弹”开一段距离，等飞到安全走廊外再喷气后退。',
      explanationEn:
        'Rocket thruster plumes can erode solar panels and optical sensors. Mechanical springs push the vehicle a few metres away before thrusters safely fire inside a designated safety corridor.'
    },
    historicalScenarios: [
      {
        id: 'iss-undock',
        titleZh: 'ISS 沿轨径向走廊标准撤离',
        titleEn: 'ISS Radial Departure Corridor',
        eraZh: '国际空间站标准撤离规程',
        eraEn: 'Standard ISS Undocking Protocol',
        descZh: '掌握机械弹簧无动力推离、0~5米羽流禁火区滑行、撤离走廊纠偏与再入前头锥闭合。',
        descEn: 'Master gentle spring push-off, 0–5 m plume keep-out glide, corridor centering, and nosecone closure.',
        statusZh: '已开放',
        statusEn: 'Available',
        isAvailable: true
      }
    ]
  },
  {
    id: 4,
    key: 'landing',
    num: 4,
    titleZh: '舱体降落',
    titleEn: 'Capsule Landing',
    taglineZh: '穿越烈焰 · 伞花绽放平安着陆',
    taglineEn: 'Atmospheric Reentry & Touchdown',
    badgeZh: '已就绪',
    badgeEn: 'Ready',
    image: '/images/home/landing.jpg',
    isImplemented: true,
    specs: {
      timeZh: '脱轨制动后约 90 分钟 · 穿越黑障区至触地前 1 秒',
      timeEn: '90m Post-Deorbit · Plasma Blackout to 1s Pre-Touchdown',
      stageZh: '推进舱分离 ➔ 钝头体防热大底烧蚀减速 ➔ 穿越黑障区 ➔ 开伞 ➔ 触地反推缓冲',
      stageEn: 'Module Jettison ➔ Thermal Ablation Braking ➔ Blackout ➔ Parachutes ➔ Retro-Rockets',
      locationZh: '东风着陆场 / 四子王旗草原回收区（高空 100 公里降至地面）',
      locationEn: 'Dongfeng Landing Field / Vast Steppe Landing Zone',
      vehicleZh: '载人飞船钟形返回舱（重约 3 吨，耐 2000℃ 烧蚀材料）',
      vehicleEn: 'Crew Reentry Capsule (3-ton bell shape, 2000°C heat shield)'
    },
    summaryZh:
      '返回舱像流星般冲入稠密大气层，剧烈空气摩擦把舱外烧成上千度火球，防热大底在烈火中逐渐熔化剥离带走致命热量！在经历数分钟无线电中断的黑障区后，上千平米的红白巨型降落伞在天际盛开，并在离地仅仅 1 米瞬间点燃反推火箭，迎接英雄凯旋。',
    summaryEn:
      'The capsule plunges into Earth’s atmosphere like a shooting star, enduring thousands of degrees of friction heat. After surviving the blackout zone, giant parachutes blossom in the sky, and retro-rockets fire one metre above ground for a gentle touchdown.',
    scienceTip: {
      termZh: '黑障区与触地反推火箭',
      termEn: 'Blackout Zone & Landing Retro-Rockets',
      explanationZh:
        '飞船高速冲进空气时，周围空气被挤压摩擦加热到数千度，气体分子电离成发光的“等离子体外壳”，它会像金属罩一样把所有无线电波彻底屏蔽，这就是让人揪心的“黑障区”。落地瞬间，底部的反推小火箭会在离地面 1 米时点火，把降落速度从每秒 8 米瞬间降为轻柔踩地！',
      explanationEn:
        'At hypersonic speeds, superheated air forms a glowing plasma sheath that completely blocks radio waves, causing a tense few minutes called the blackout zone. A metre above ground, soft-landing retro-rockets ignite to cushion the impact.'
    },
    historicalScenarios: [
      {
        id: 'dongfeng-field',
        titleZh: '东风着陆场草原精确着陆',
        titleEn: 'Dongfeng Steppe Precision Landing',
        eraZh: '神舟载人飞船回家之路',
        eraEn: 'Shenzhou Return Protocol',
        descZh: '亲历 2000℃ 黑障区防热大底守卫、引导伞与千平米红白主伞开伞，以及离地 1.5 米反推点火缓冲。',
        descEn: 'Experience 2000°C blackout attitude control, dual parachute deployment, and 1.5 m retro-rocket soft touchdown.',
        statusZh: '已开放',
        statusEn: 'Available',
        isAvailable: true
      }
    ]
  }
];
