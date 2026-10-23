import type { Localized } from '../types';
import type { LiftoffScenarioConfig } from './types';

export interface LiftoffGlossaryItem {
  id: string;
  term: Localized;
  shortDesc: Localized;
  teenExplanation: Localized;
}

/**
 * 面向青少年玩家的升空专业词汇通俗词典
 * 遵循项目核心设计准则：所有航天工程词汇均配有直白生动的青少年科普解释
 */
export const LIFTOFF_GLOSSARY: LiftoffGlossaryItem[] = [
  {
    id: 'twr',
    term: {
      zh: '推重比 (TWR · Thrust-to-Weight Ratio)',
      en: 'Thrust-to-Weight Ratio (TWR)'
    },
    shortDesc: {
      zh: '发动机推力除以火箭自身所受地球重力的比值',
      en: 'Engine thrust divided by the rocket’s weight under gravity'
    },
    teenExplanation: {
      zh: '如果推重比小于 1，就算发动机喷出滔天大火，火箭也抬不起屁股！土星五号装满燃料重达 2950 吨（相当于 500 头成年大象），起飞推力 3470 吨，刚点火时推重比只有 1.17，所以起飞前几秒慢得像蜗牛；但每秒烧掉 13 吨燃料后火箭迅速变轻，推重比一路飙升到 3.9，加速就会越来越猛！',
      en: 'If TWR is below 1.0, the rocket cannot lift off at all! Fully fueled, Saturn V weighs 2,950 tonnes with a liftoff TWR of just 1.17, rising slowly at first. Burning 13 tonnes of fuel per second makes it much lighter, pushing TWR approaches 4.0!'
    }
  },
  {
    id: 'max-q',
    term: {
      zh: '最大动压 (Max-Q · Maximum Dynamic Pressure)',
      en: 'Max-Q (Maximum Dynamic Pressure)'
    },
    shortDesc: {
      zh: '火箭升空途中迎面空气撞击力最狂暴的危险时刻',
      en: 'The point of maximum aerodynamic stress during atmospheric ascent'
    },
    teenExplanation: {
      zh: '你把手伸出高速行驶的车窗外，车开得越快，风把手往后推的力（动压）就越大。火箭剛起飞时空气虽浓但速度慢，飞到太空边缘时速度虽快但没空气；而在大约 13 公里高空、刚突破音速时，速度和空气密度乘在一起达到顶峰，这就是“最大动压（Max-Q）”！此时如果火箭歪着身子飞，狂风会把火箭直接拦腰折断！',
      en: 'At low altitude air is thick but speed is low; high up speed is huge but air is thin. Around 13 km altitude above Mach 1, air density and speed combine for peak aerodynamic pressure (Max-Q). Turning too sharply here will snap the rocket in half!'
    }
  },
  {
    id: 'gravity-turn',
    term: {
      zh: '重力转向 (Gravity Turn)',
      en: 'Gravity Turn'
    },
    shortDesc: {
      zh: '让火箭机头顺着飞行方向，借地球重力自然画弧转弯的省油绝招',
      en: 'Using gravity to naturally curve the trajectory from vertical to horizontal'
    },
    teenExplanation: {
      zh: '入轨不仅要飞得高，更要以每秒 7.8 公里横着飞！如果先直着飞上太空再强行 90 度急转弯，不仅费油，在大气层里还会被迎面狂风吹断。聪明的工程师在火箭刚飞过发射塔后，让机头向东轻轻歪一点点，之后一直让机头对准运动方向（Prograde），地球引力就会像温柔的手一样把飞行轨迹自然拉成优美的抛物弧线！',
      en: 'Reaching orbit requires huge horizontal speed (7.8 km/s). Instead of flying straight up and making a sharp 90° turn, rockets tilt slightly east right after clearing the tower and follow their velocity vector (Prograde), letting gravity naturally bend the flight path horizontal.'
    }
  },
  {
    id: 'staging',
    term: {
      zh: '级间分离与死重 (Staging & Dry Mass)',
      en: 'Staging & Dry Mass'
    },
    shortDesc: {
      zh: '扔掉烧空的巨大金属燃料桶，让上一级轻装接力冲刺',
      en: 'Jettisoning empty fuel tanks so the upper stage can accelerate faster'
    },
    teenExplanation: {
      zh: '根据齐奥尔科夫斯基火箭公式，如果一节火箭从头飞到尾，燃料烧完后剩下的上百吨巨大空油箱（死重 Dry Mass）会变成沉重的累赘，永远无法达到第一宇宙速度。所以第一级燃料一烧光（MECO），必须立刻按空格键把它扔掉，点燃更轻巧的第二级继续接力！',
      en: 'Carrying a 130-tonne empty metal tank all the way to space makes reaching orbital speed impossible. Once Stage 1 burns out (MECO), rockets discard the empty stage and ignite Stage 2 to shed dead weight.'
    }
  },
  {
    id: 'ap-pe',
    term: {
      zh: '远地点 (Ap) 与 近地点 (Pe) · 第一宇宙速度',
      en: 'Apoapsis (Ap), Periapsis (Pe) & First Cosmic Velocity'
    },
    shortDesc: {
      zh: '轨道最高点与最低点，只有最低点也高于大气层才算真正入轨',
      en: 'Highest and lowest points of an orbit; Periapsis must clear the atmosphere'
    },
    teenExplanation: {
      zh: '把石头斜着扔出去，最高点就是“远地点（Apoapsis）”。如果只往上飞，远地点就算到了 200 公里，石头还是会掉回地面（此时近地点 Periapsis 在地下，小于 0）。只有当你快飞到最高点时，把机头放平拼命向东加速到每秒 7.8 公里（第一宇宙速度），把对面的最低点（近地点 Pe）也抬升到 160 公里以上，飞船才永远掉不回地面，真正成为人造卫星！',
      en: 'Flying high to 200 km is not enough—without horizontal speed, you just fall back down (Periapsis < 0). By accelerating horizontally near Apoapsis to ~7.8 km/s (First Cosmic Velocity), you raise Periapsis above 160 km so the ship falls around Earth forever!'
    }
  }
];

export const liftoffScenarios: LiftoffScenarioConfig[] = [
  {
    id: 1,
    vehicleId: 'saturn-v',
    title: {
      zh: '拔地而起 · 推重比与程序仰角',
      en: 'Pad Liftoff · TWR & Pitch-Over'
    },
    subtitle: {
      zh: '目标：满油门点火解锁发射台，垂直飞越塔架后向东微倾爬升至 8 公里',
      en: 'Goal: Full throttle ignition, release clamps, clear tower & pitch east to 8 km'
    },
    objective: {
      zh: '推满 100% 节流阀油门使推重比 (TWR) 超过 1.15，按空格键解锁发射台升空；飞过 150 米塔架后将机头向东微倾至 62°~82°，爬升突破 8 公里高空！',
      en: 'Throttle to 100% (TWR > 1.15), press Space to release clamps, clear the 150 m tower, then tilt east to 62°–82° pitch and climb past 8 km!'
    },
    hint: {
      zh: '先按 Z 键（或推满油门滑块）点火，再按 Space 空格键释放牵制臂升空！超过 150 米高度后，按 D / → 键把机头稍微向东压低到 70° 左右。',
      en: 'Press Z for 100% throttle, then press Space to release launch clamps! Above 150 m altitude, tap D / → to tilt pitch to ~70°.'
    },
    passCriteria: {
      zh: '海拔高度 ≥ 8.0 km · 速度 ≥ 220 m/s · 机头俯仰角保持在 62° ~ 82° 初始转弯区间',
      en: 'Altitude ≥ 8.0 km · Speed ≥ 220 m/s · Pitch angle within 62°–82° pitch-over window'
    },
    brief: {
      zh: '欢迎来到肯尼迪航天中心 39A 发射台！你将驾驶重达 2950 吨的“土星五号”重型火箭。请先拉满油门让 5 台 F-1 发动机产生超过火箭重量的推力，解锁牵制臂拔地而起，在安全越过发射塔后执行初始向东转弯（Pitch-Over）。',
      en: 'Welcome to Launch Complex 39A! Command the 2,950-tonne Saturn V. Throttle up to 100%, release the hold-down arms once TWR > 1.0, clear the launch tower vertically, and initiate your eastward pitch-over maneuver.'
    },
    lesson: {
      zh: '火箭起飞的第一铁律是“推重比（TWR = 推力 ÷ 重力）必须大于 1”。若油门太小就松开发射台，三千吨的巨箭会直接砸回地面！飞过塔架后向东微倾，还能白白借用地球自转赠送的 408 m/s 顺风车速度。',
      en: 'Rule #1 of rocketry: Thrust-to-Weight Ratio (TWR) must exceed 1.0 before releasing the clamps! Tilting east after clearing the tower also harnesses Earth’s 408 m/s rotational speed boost.'
    },
    scienceTerm: {
      term: LIFTOFF_GLOSSARY[0].term,
      explanation: LIFTOFF_GLOSSARY[0].teenExplanation
    },
    initialState: {
      altitudeM: 0,
      downrangeM: 0,
      verticalSpeedMs: 0,
      horizontalSpeedMs: 0,
      pitchDeg: 90,
      activeStageIndex: 0,
      stageFuelFractions: [1.0, 1.0, 1.0],
      clampsReleased: false,
      towerJettisoned: false,
      throttle: 0,
      sasMode: 'hold',
      initialTimeS: 0
    },
    targets: {
      minAltitudeM: 8000,
      targetPitchMinDeg: 62,
      targetPitchMaxDeg: 82,
      maxTimeS: 140
    }
  },

  {
    id: 2,
    vehicleId: 'saturn-v',
    title: {
      zh: '穿云破障 · 最大动压与重力转向',
      en: 'Max-Q & Gravity Turn'
    },
    subtitle: {
      zh: '目标：顺着速度方向平滑转弯，安全扛过 13 公里高空最大动压 (Max-Q) 冲上 35 公里',
      en: 'Goal: Follow Prograde smoothly through Max-Q (~13 km) and climb past 35 km'
    },
    objective: {
      zh: '从 7.5 公里高空接管火箭，开启“顺应速度方向 (Prograde)”或手动微调俯仰，确保在突破音障与最大动压 (Max-Q) 时机头偏角 (攻角 AoA) 不超过 6°，平稳转弯冲上 35 公里！',
      en: 'Take control at 7.5 km, keep Angle of Attack (AoA) tight (< 6°) near the Prograde vector while piercing through Mach 1 and Max-Q, and ascend past 35 km!'
    },
    hint: {
      zh: '在 11~16 公里高空动压表飙红时切勿猛打方向！点击开启 SAS「顺应速度 (Prograde)」或轻柔跟随黄色速度圆圈，让机头自然下压到 30°~55°。',
      en: 'Do NOT yank pitch sharply between 11–16 km where dynamic pressure peaks! Engage SAS [Prograde] or gently track the yellow velocity marker down to 30°–55°.'
    },
    passCriteria: {
      zh: '安全越过 Max-Q 峰值（未发生气动解体） · 海拔高度 ≥ 35 km · 机头俯仰角降至 25° ~ 55°',
      en: 'Survive Max-Q without aero breakup · Altitude ≥ 35 km · Pitch angle between 25° and 55°'
    },
    brief: {
      zh: '火箭即将冲入跨音速风暴区！在约 13 公里高空，超过音速的狂风迎面撞击力达到极值（Max-Q，约 35 千帕）。如果机头与飞行方向歪斜过大（攻角过大），巨型火箭会被气流拦腰折断！请紧贴速度矢量完成“重力转向”。',
      en: 'Approaching transonic flight! Around 13 km, supersonic airflow creates peak aerodynamic load (Max-Q ~ 35 kPa). Excessive Angle of Attack will snap the vehicle! Track your velocity vector closely to execute a smooth Gravity Turn.'
    },
    lesson: {
      zh: '在稠密大气层内高速飞行时，火箭必须像标枪一样“顺风飞”（零攻角附近），利用地球重力自然把轨道拉平，这就是坎巴拉太空计划（KSP）与真实航天最核心的“重力转向”。',
      en: 'Inside the dense atmosphere, a rocket must fly like a javelin aligned with the relative wind (near-zero Angle of Attack), letting gravity curve its path toward the horizon.'
    },
    scienceTerm: {
      term: LIFTOFF_GLOSSARY[1].term,
      explanation: LIFTOFF_GLOSSARY[1].teenExplanation
    },
    initialState: {
      altitudeM: 7500,
      downrangeM: 2100,
      verticalSpeedMs: 262,
      horizontalSpeedMs: 92,
      pitchDeg: 71,
      activeStageIndex: 0,
      stageFuelFractions: [0.62, 1.0, 1.0],
      clampsReleased: true,
      towerJettisoned: false,
      throttle: 1.0,
      sasMode: 'prograde',
      initialTimeS: 62
    },
    targets: {
      minAltitudeM: 35000,
      targetPitchMinDeg: 22,
      targetPitchMaxDeg: 58,
      maxTimeS: 120
    }
  },

  {
    id: 3,
    vehicleId: 'saturn-v',
    title: {
      zh: '接力冲刺 · 级间分离与抛逃逸塔',
      en: 'Staging · Drop Dead Weight'
    },
    subtitle: {
      zh: '目标：第一级燃料耗尽后立即分离点燃第二级，在 92 公里以上抛掉逃逸塔，将远地点推过 165 公里',
      en: 'Goal: Separate Stage 1 at MECO, ignite Stage 2, jettison LES > 92 km & push Apoapsis > 165 km'
    },
    objective: {
      zh: '监控第一级剩余燃料，在燃料归零熄火 (MECO) 后立即按空格键抛离 130 吨空壳并点燃第二级 (S-II)；飞过 92 公里高空后抛离顶部逃逸塔，将预测远地点 (Ap) 推升至 165 公里以上！',
      en: 'Wait for Stage 1 fuel depletion (MECO), press Space to stage and ignite Stage 2 (S-II), jettison the Launch Escape Tower above 92 km, and push Apoapsis (Ap) above 165 km!'
    },
    hint: {
      zh: '注意看左下角第一级燃料条！千万别在还有燃料喷火时提前按空格，等燃料变成 0%（MECO 提示亮起）立刻按 Space 键分离；高度过 92 km 后点击「抛逃逸塔」减轻重量！',
      en: 'Watch the Stage 1 fuel bar! Do not stage while fuel remains. As soon as fuel hits 0% (MECO), press Space to stage. Above 92 km, jettison the Launch Escape Tower!'
    },
    passCriteria: {
      zh: '成功切换至第 2 级 (S-II) · 已抛离逃逸塔 (LES) · 预测远地点高度 (Ap) ≥ 165 km',
      en: 'Stage 2 (S-II) active · Escape tower jettisoned · Predicted Apoapsis (Ap) ≥ 165 km'
    },
    brief: {
      zh: '火箭已飞至 58 公里高空，第一级（S-IC）2146 吨燃料只剩最后 8%！一旦烧光，剩下的 130 吨金属大空桶就是纯粹的累赘。请在第一级熄火瞬间执行“级间分离”，点燃第二级 5 台液氢发动机，并抛掉不再需要的救生逃逸塔！',
      en: 'At 58 km altitude, Stage 1 has only 8% fuel left! Once empty, its 130-tonne tank becomes dead weight. Stage promptly at Main Engine Cutoff (MECO), ignite Stage 2’s five J-2 engines, and jettison the Launch Escape System!'
    },
    lesson: {
      zh: '为什么不能一节火箭飞到底？因为结构死重会吃掉所有加速能力。扔掉 130 吨的一级空壳和 4 吨的逃逸塔后，高比冲液氢发动机才能把飞船加速推向太空！',
      en: 'Why multi-stage rockets? Structural dead weight kills acceleration. Shedding the 130-tonne empty S-IC stage and 4-tonne escape tower lets the high-efficiency upper stage push Apoapsis into space!'
    },
    scienceTerm: {
      term: LIFTOFF_GLOSSARY[3].term,
      explanation: LIFTOFF_GLOSSARY[3].teenExplanation
    },
    initialState: {
      altitudeM: 58000,
      downrangeM: 76000,
      verticalSpeedMs: 1180,
      horizontalSpeedMs: 1850,
      pitchDeg: 32,
      activeStageIndex: 0,
      stageFuelFractions: [0.08, 1.0, 1.0],
      clampsReleased: true,
      towerJettisoned: false,
      throttle: 1.0,
      sasMode: 'pitch_program',
      initialTimeS: 148
    },
    targets: {
      minApoapsisM: 165000,
      requireStageIndex: 1,
      requireTowerJettison: true,
      maxTimeS: 260
    }
  },

  {
    id: 4,
    vehicleId: 'saturn-v',
    title: {
      zh: '直抵星辰 · 第一宇宙速度与圆轨入轨',
      en: 'Orbit Insertion · First Cosmic Velocity'
    },
    subtitle: {
      zh: '终极任务：在接近远地点时水平加速突破 7.8 km/s，把近地点抬升过 155 公里完成入轨！',
      en: 'Final Mission: Accelerate horizontally near Apoapsis to ~7.8 km/s and raise Periapsis > 155 km!'
    },
    objective: {
      zh: '完成二三级接力，在接近 185 公里远地点时将机头放平（俯仰角 0°~10°），向东全力加速至约 7,790 m/s（第一宇宙速度），使近地点 (Pe) ≥ 155 km、远地点 (Ap) ≥ 175 km，达成稳定近地圆轨道！',
      en: 'Stage into S-IVB, level the nose horizontally (0°–10° pitch) near Apoapsis, and accelerate east to ~7,790 m/s until Periapsis (Pe) ≥ 155 km and Apoapsis (Ap) ≥ 175 km!'
    },
    hint: {
      zh: '当预测远地点 (Ap) 达到 185 km 左右时，把机头压平对准水平方向（0°~5°）专注提升水平速度！只要水平速度接近 7.8 km/s，近地点 (Pe) 就会从负数迅速飙升过 155 km 入轨！',
      en: 'Once Apoapsis (Ap) nears 185 km, pitch down nearly flat (0°–5°) to build horizontal speed! As orbital velocity hits ~7.8 km/s, Periapsis (Pe) will climb from negative to > 155 km!'
    },
    passCriteria: {
      zh: '稳定入轨：近地点 (Pe) ≥ 155 km · 远地点 (Ap) ≥ 175 km · 轨道偏心率 e < 0.03（近圆停泊轨道）',
      en: 'Stable LEO: Periapsis (Pe) ≥ 155 km · Apoapsis (Ap) ≥ 175 km · Eccentricity e < 0.03'
    },
    brief: {
      zh: '最后冲刺！很多新手以为飞到 185 公里高空就算进入太空了，但如果水平速度不够，关机后还是会掉回大气层烧毁！请完成二三级分离，在接近轨道最高点（远地点 Ap）时把机头放平，把速度推上每秒 7.8 公里的“第一宇宙速度”，让近地点（Pe）彻底脱离大气层！',
      en: 'Final push to orbit! Reaching 185 km altitude alone is suborbital—without horizontal speed, you fall right back down! Stage to S-IVB, level out near Apoapsis, and hit 7.8 km/s orbital speed to raise Periapsis safely into space!'
    },
    lesson: {
      zh: '入轨的本质是“横着飞得足够快，使得飞船下落弧度刚好等于地球弯曲弧度”。在远地点附近水平加速，是抬升对面近地点（圆化轨道 Circularization）最高效的方法！',
      en: 'Orbiting means flying sideways so fast that your downward fall matches Earth’s curvature. Burning horizontally near Apoapsis raises Periapsis on the opposite side of Earth to circularize the orbit.'
    },
    scienceTerm: {
      term: LIFTOFF_GLOSSARY[4].term,
      explanation: LIFTOFF_GLOSSARY[4].teenExplanation
    },
    initialState: {
      altitudeM: 162000,
      downrangeM: 680000,
      verticalSpeedMs: 310,
      horizontalSpeedMs: 5650,
      pitchDeg: 14,
      activeStageIndex: 1,
      stageFuelFractions: [0.0, 0.12, 1.0],
      clampsReleased: true,
      towerJettisoned: true,
      throttle: 1.0,
      sasMode: 'pitch_program',
      initialTimeS: 465
    },
    targets: {
      minApoapsisM: 175000,
      maxApoapsisM: 280000,
      minPeriapsisM: 155000,
      maxEccentricity: 0.03,
      requireOrbitStable: true,
      maxTimeS: 300
    }
  }
];

/**
 * 全流程完整发射任务 (id = 5)：
 * 从肯尼迪 39A / 酒泉发射台 0 米点火水幕喷淋开始，连续完整经历：
 * 点火建推 -> 牵制臂解锁越塔 -> 程序俯仰 -> 跨音速 Max-Q -> 一二级冷热分离 -> 逃逸塔与整流罩抛离 -> 二三级接力 -> 185 km 第一宇宙速度圆轨入轨
 */
export const fullLaunchScenario: LiftoffScenarioConfig = {
  id: 5,
  vehicleId: 'saturn-v',
  title: {
    zh: '全流程完整发射 · 从发射台直达太空入轨',
    en: 'Full Launch Sequence · Pad to 185 km Orbit'
  },
  subtitle: {
    zh: '完整还原真实发射：水幕点火建推 → 拔销越塔 → 重力转向穿云 → Max-Q → 级间分离与抛整流罩 → 7.8 km/s 第一宇宙速度入轨',
    en: 'Complete Launch: Water Deluge Ignition → Tower Clear → Gravity Turn → Max-Q → Staging & Fairing Sep → 7.8 km/s LEO Insertion'
  },
  objective: {
    zh: '从 0 米发射台执行完整发射流程：满油门点火待推重比 TWR > 1.15 后解锁牵制臂升空，越过 150 米发射塔后执行程序重力转向穿过 Max-Q，按序完成一二级分离、逃逸塔与整流罩抛离、二三级接力，最终在 185 公里高空加速至 7,797 m/s 进入稳定近地圆轨！',
    en: 'Execute the complete launch sequence from 0 m on the pad through Tower Clear, Gravity Turn, Max-Q, Multi-Stage Separation, LES/Fairing Jettison, and 7.8 km/s circular LEO insertion!'
  },
  hint: {
    zh: '可开启「程序转弯」辅助或点击右上角「观看示范」体验完整 NASA 阿波罗 / 神舟全流程自动点火、穿云、科罗廖夫十字分离、抛罩与入轨！',
    en: 'Engage [Auto Gravity Turn] or click [Watch Demo] to experience the full continuous launch sequence from ignition water deluge to orbital insertion!'
  },
  passCriteria: {
    zh: '全流程连续入轨：从地面起飞完成多级分离与抛逃逸塔 · 近地点 Pe ≥ 155 km · 远地点 Ap ≥ 175 km · 第一宇宙速度稳定圆轨',
    en: 'Full pad-to-orbit ascent · Multi-stage separation & LES jettison · Periapsis Pe ≥ 155 km · Apoapsis Ap ≥ 175 km'
  },
  brief: {
    zh: '这是毫不妥协的真实航天发射全流程演练！你将从发射台 T-3 秒高压水幕降噪与发动机点火建推开始，亲历拔销离台、飞越百米脐带塔、穿破对流层云海、跨音速激波锥与最大动压（Max-Q）、一二级正推/反推分离、逃逸塔与整流罩抛离，直至三级火箭将飞船推入每秒 7.8 公里的近地圆轨道！',
    en: 'Experience the complete, uninterrupted rocket launch sequence from Pad Water Deluge and Main Engine Ignition through Tower Clear, Cloud Deck penetration, Max-Q, Stage & Fairing Separation, all the way to 7.8 km/s Low Earth Orbit!'
  },
  lesson: {
    zh: '一次真实的航天发射由环环相扣的精密时序组成：地面牵制臂必须等发动机推力完全建立后才能解锁；大气层内必须零攻角顺风飞行以防气动折断；冲出稠密大气后必须及时抛掉一级空壳、逃逸塔与整流罩死重，最后在远地点把水平速度推上 7.8 km/s 完成入轨。',
    en: 'A real orbital launch is a tightly choreographed chain of physics milestones: thrust buildup before hold-down release, zero-AoA gravity turn through Max-Q, shedding stage/fairing dead weight, and horizontal circularization at Apoapsis.'
  },
  scienceTerm: {
    term: LIFTOFF_GLOSSARY[4].term,
    explanation: LIFTOFF_GLOSSARY[4].teenExplanation
  },
  initialState: {
    altitudeM: 0,
    downrangeM: 0,
    verticalSpeedMs: 0,
    horizontalSpeedMs: 0,
    pitchDeg: 90,
    activeStageIndex: 0,
    stageFuelFractions: [1.0, 1.0, 1.0],
    clampsReleased: false,
    towerJettisoned: false,
    throttle: 1.0,
    sasMode: 'pitch_program',
    initialTimeS: 0
  },
  targets: {
    minApoapsisM: 175000,
    maxApoapsisM: 290000,
    minPeriapsisM: 155000,
    maxEccentricity: 0.035,
    requireTowerJettison: true,
    requireOrbitStable: true,
    maxTimeS: 920
  }
};

export function getLiftoffScenario(id: number): LiftoffScenarioConfig {
  if (id === 5) return fullLaunchScenario;
  return liftoffScenarios.find((s) => s.id === id) ?? liftoffScenarios[0];
}

