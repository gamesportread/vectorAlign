import type { RocketVehicleConfig } from './types';

/**
 * 基于 NASA 公开技术报告构建的运载火箭真实物理参数表：
 * 1. Saturn V (AS-506 / Apollo 11):
 *    参考数据源：NASA Marshall Space Flight Center "Saturn V Launch Vehicle Flight Evaluation Report - AS-506 Apollo 11" (MPR-SAT-FE-69-9)
 * 2. 长征二号F (CZ-2F / 神舟载人火箭):
 *    参考数据源：中国载人航天工程办公室公开科普参数（芯级等效捆绑一二级构型）
 */
export const ROCKET_VEHICLES: Record<'saturn-v' | 'cz5' | 'cz2f', RocketVehicleConfig> = {
  'saturn-v': {
    id: 'saturn-v',
    name: {
      zh: '土星五号 · 阿波罗登月重型运载火箭 (Saturn V)',
      en: 'Saturn V · Apollo Heavy Launch Vehicle'
    },
    era: {
      zh: 'NASA 阿波罗计划 (Apollo 11 · 1969)',
      en: 'NASA Apollo Program (Apollo 11 · 1969)'
    },
    description: {
      zh: '人类历史上成功入轨的最宏伟三级巨型火箭，高 110.6 米，起飞总重近 2950 吨。第一级配备 5 台巨型 F-1 煤油发动机，第二、三级采用高比冲 J-2 液氢液氧发动机。',
      en: ' standing 110.6 m tall with a liftoff mass near 2,950 tonnes. Powered by five F-1 kerolox engines on Stage 1 and high-efficiency J-2 hydrolox engines on Stages 2 and 3.'
    },
    launchLatitudeDeg: 28.608, // 肯尼迪航天中心 LC-39A (28.608° N)
    launchSite: {
      zh: '美国肯尼迪航天中心 39A 发射台 (KSC LC-39A)',
      en: 'Kennedy Space Center Launch Complex 39A (LC-39A)'
    },
    // 阿波罗指令/服务舱 (CSM ~ 30,300 kg) + 登月舱 (LM ~ 15,100 kg) + 适配器 (~1,800 kg)
    payloadMassKg: 47200,
    // 顶部发射逃逸塔 (Launch Escape System, LES) 质量约 4,000 kg，在约 95 km 高空第二级点火后抛离
    launchEscapeTowerMassKg: 4000,
    towerJettisonAltitudeM: 92000,
    // 最大气动弯矩阈值 Q*alpha (kPa·deg)：在 Max-Q (~35 kPa) 时若攻角超过 ~6.5° 将触发结构过载警告/解体
    maxQAlphaKpaDeg: 230,
    maxGLoad: 6.0,
    stages: [
      {
        stageNumber: 1,
        code: 'S-IC',
        name: {
          zh: '第一级 S-IC（5× F-1 液氧煤油发动机）',
          en: 'Stage 1 · S-IC (5× F-1 Kerolox Engines)'
        },
        engineDesc: {
          zh: '5 台 Rocketdyne F-1 巨型发动机，海平面总推力 3,470 吨，每秒吞噬近 13 吨燃料，负责将三千吨巨箭托举冲出稠密大气层。',
          en: 'Five F-1 engines producing 34.5 MN sea-level thrust, burning 13 tonnes of RP-1/LOX per second to lift the stack out of the dense lower atmosphere.'
        },
        dryMassKg: 130400,
        fuelMassKg: 2146000,
        thrustSeaLevelN: 34500000,
        thrustVacuumN: 39200000,
        ispSeaLevelS: 265,
        ispVacuumS: 304,
        referenceAreaM2: 80.1, // 直径 10.06 m 圆柱体截面积 (pi * 5.03^2)
        gimbalRangeDeg: 5.5,
        minThrottle: 0.55
      },
      {
        stageNumber: 2,
        code: 'S-II',
        name: {
          zh: '第二级 S-II（5× J-2 液氢液氧发动机）',
          en: 'Stage 2 · S-II (5× J-2 Hydrolox Engines)'
        },
        engineDesc: {
          zh: '5 台 J-2 高能液氢液氧发动机，在几乎没有空气的高空接力工作，真空比冲高达 421 秒，将火箭推升至近 185 公里高空并接近第一宇宙速度。',
          en: 'Five J-2 cryogenic hydrogen/oxygen engines with 421 s vacuum specific impulse, accelerating the vehicle to near-orbital velocity at ~185 km altitude.'
        },
        dryMassKg: 36200,
        fuelMassKg: 444000,
        thrustSeaLevelN: 2450000,
        thrustVacuumN: 5115000,
        ispSeaLevelS: 200,
        ispVacuumS: 421,
        referenceAreaM2: 80.1,
        gimbalRangeDeg: 7.0,
        minThrottle: 0.60
      },
      {
        stageNumber: 3,
        code: 'S-IVB',
        name: {
          zh: '第三级 S-IVB（1× J-2 入轨级发动机）',
          en: 'Stage 3 · S-IVB (1× J-2 Orbital Insertion Stage)'
        },
        engineDesc: {
          zh: '1 台可重复点火的 J-2 发动机，负责最后的圆轨加速（把水平速度推上 7.8 km/s），让飞船稳稳进入近地停泊圆轨道。',
          en: 'Single restartable J-2 engine that completes circular orbit insertion at ~7.8 km/s in Low Earth Parking Orbit.'
        },
        dryMassKg: 13300,
        fuelMassKg: 107100,
        thrustSeaLevelN: 480000,
        thrustVacuumN: 1023000,
        ispSeaLevelS: 200,
        ispVacuumS: 421,
        referenceAreaM2: 34.2, // 直径 6.6 m
        gimbalRangeDeg: 7.5,
        minThrottle: 0.50
      }
    ]
  },

  'cz5': {
    id: 'cz5',
    name: {
      zh: '长征五号 · 胖五重型运载火箭 (CZ-5)',
      en: 'Long March 5 · Heavy-Lift Cryogenic Rocket (CZ-5)'
    },
    era: {
      zh: '中国文昌航天发射场 · 空间站与探月工程',
      en: 'China Wenchang Space Launch Site · Deep Space & Station'
    },
    description: {
      zh: '中国现役起飞推力最大的重型运载火箭（昵称“胖五”），芯级直径达 5 米，周围捆绑 4 个 3.35 米全液氧煤油助推器。起飞总重 869 吨，推力超 1070 吨，曾将中国空间站天和核心舱、问天实验舱与嫦娥五号月球探测器成功送入太空！',
      en: 'China’s premier heavy-lift cryogenic rocket ("Fat Five"), featuring a 5.0m core and 4x 3.35m kerolox boosters with over 1,070 tonnes liftoff thrust. Successfully launched the Tianhe space station core module and Chang’e 5.'
    },
    launchLatitudeDeg: 19.614, // 中国海南文昌航天发射场 (19.614° N)
    launchSite: {
      zh: '中国海南文昌航天发射场 101 工位 (Wenchang LC-101)',
      en: 'Wenchang Space Launch Site Complex 101 (LC-101)'
    },
    payloadMassKg: 22500, // 天和核心舱 / 空间站大型有效载荷约 22.5 吨
    launchEscapeTowerMassKg: 2800,
    towerJettisonAltitudeM: 95000,
    maxQAlphaKpaDeg: 225,
    maxGLoad: 5.6,
    stages: [
      {
        stageNumber: 1,
        code: 'CZ5-Core+4B',
        name: {
          zh: '一子级芯级与四助推组合（8× YF-100 + 2× YF-77 发动机群）',
          en: 'Stage 1 · Core + 4 Boosters (8× YF-100 + 2× YF-77)'
        },
        engineDesc: {
          zh: '4 个助推器上的 8 台 120 吨级高压补燃煤油机与芯一级的 2 台 50 吨级液氢液氧发动机同时点火，喷薄出 10,560 千牛（约 1078 吨）的磅礴推力！',
          en: 'Eight YF-100 staged-combustion kerolox engines across 4 boosters plus twin cryogenic YF-77 engines produce 10.56 MN (~1,078 tonnes) liftoff thrust.'
        },
        dryMassKg: 54000,
        fuelMassKg: 760000,
        thrustSeaLevelN: 10560000,
        thrustVacuumN: 11800000,
        ispSeaLevelS: 300,
        ispVacuumS: 335,
        referenceAreaM2: 48.0,
        gimbalRangeDeg: 6.5,
        minThrottle: 0.60
      },
      {
        stageNumber: 2,
        code: 'CZ5-S2',
        name: {
          zh: '二子级（2× YF-75D 闭式膨胀循环液氢液氧发动机）',
          en: 'Stage 2 · Cryogenic Upper Stage (2× YF-75D Hydrolox)'
        },
        engineDesc: {
          zh: '配备 2 台高比冲 YF-75D 液氢液氧发动机，真空比冲高达 442 秒！具有多次重复点火能力，把二十余吨的空间站核心舱直接送入近地轨道。',
          en: 'Two restartable YF-75D expander-cycle cryogenic engines delivering 442 s vacuum Isp for high-efficiency direct orbital insertion.'
        },
        dryMassKg: 6500,
        fuelMassKg: 54000,
        thrustSeaLevelN: 120000,
        thrustVacuumN: 176500,
        ispSeaLevelS: 210,
        ispVacuumS: 442,
        referenceAreaM2: 19.6,
        gimbalRangeDeg: 8.0,
        minThrottle: 0.50
      }
    ]
  },
  // 保留 cz2f 别名无缝向后兼容
  get cz2f() {
    return this.cz5;
  }
};

export function getRocketVehicle(id: 'saturn-v' | 'cz5' | 'cz2f' = 'saturn-v'): RocketVehicleConfig {
  if (id === 'cz2f') return ROCKET_VEHICLES.cz5;
  return ROCKET_VEHICLES[id] ?? ROCKET_VEHICLES['saturn-v'];
}
