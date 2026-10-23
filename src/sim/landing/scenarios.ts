import type { Localized as LocalizedText } from '../types';
import type { LandingScenarioConfig } from './types';

export interface LandingGlossaryItem {
  id: string;
  term: LocalizedText;
  short: LocalizedText;
  detail: LocalizedText;
}

export const LANDING_GLOSSARY: LandingGlossaryItem[] = [
  {
    id: 'ablative-heatshield',
    term: {
      zh: '钝头体烧蚀防热大底 (Ablative Heat Shield)',
      en: 'Blunt-Body Ablative Heat Shield'
    },
    short: {
      zh: '用自身表面逐层熔化蒸发的方式，带走 2000℃ 大气摩擦烈焰的“护身盾牌”！',
      en: 'A sacrificial thermal shield that melts and vaporizes layer by layer to carry away 2000°C reentry heat!'
    },
    detail: {
      zh: '为什么返回舱底部是圆钝的大钟形而不是尖头？因为钝头体高速冲进大气层时，会在前方推开一道厚厚的“弓形激波”，把 90% 的摩擦热挡在空气里！同时防热大底涂有特殊的高分子烧蚀材料，在 2000℃ 高温下会主动炭化、熔化、蒸发（就像流汗降温一样），把剩余热量全部带走，保证舱内宇航员处于 25℃ 的舒适温度。',
      en: 'A blunt bell shape pushes a detached bow shock wave ahead of the capsule, deflecting 90% of shock heating into the air. The remaining heat is absorbed as the ablative material chars and vaporizes away, keeping the cabin inside at a comfortable 25°C.'
    }
  },
  {
    id: 'plasma-blackout',
    term: {
      zh: '黑障区 (Plasma Blackout Zone, 80~38km)',
      en: 'Plasma Radio Blackout Zone (80–38 km)'
    },
    short: {
      zh: '返回舱被 2000℃ 电离发光气体包裹、无线电信号完全中断的惊险几分钟！',
      en: 'The tense minutes when superheated ionized plasma wraps the capsule and blocks all radio signals!'
    },
    detail: {
      zh: '在距离地面约 80 公里到 38 公里的高空，返回舱以每秒数公里的超高速剧烈压缩空气，高温把空气分子电离成一层亮橘红色的“等离子体鞘套”。这层导电气体壳就像金属屏蔽罩一样，把天地之间的无线电波全部反射和吸收，导致地面指挥中心与宇航员完全失联！此时必须严守防热大底正对气流，一旦歪斜超过安全角，侧面薄舱壁就会被烧穿。',
      en: 'Between 80 km and 38 km altitude, hypersonic shock heating ionizes surrounding air into a glowing plasma sheath. This conductive layer blocks all radio communication with Mission Control. The capsule must keep its heat shield pointed strictly into the airflow to survive.'
    }
  },
  {
    id: 'two-stage-chutes',
    term: {
      zh: '引导伞与 1200㎡ 巨型主伞 (Drogue & Main Chutes)',
      en: 'Two-Stage Parachute System (Drogue & 1200 m² Main)'
    },
    short: {
      zh: '不能直接开大伞！必须先开小减速伞刹慢速度，再展开三个篮球场大的红白主伞。',
      en: 'A small tough drogue chute brakes the capsule first before the giant 1200 m² main chute unfurls.'
    },
    detail: {
      zh: '刚冲出黑障区时，返回舱速度仍有每秒两百多米（接近客机速度）。如果这时直接打开 1200 平方米（相当于三个篮球场大）的主降落伞，狂暴的气流会瞬间把伞绳和伞衣撕成碎片！因此工程师设计了“两级开伞”：10 公里高空先打开高强度的减速引导伞（Drogue）把速度刹到 90 米/秒以下，6 公里处再展开巨型红白条纹主伞，把下落速度平稳降到 7.5 米/秒。',
      en: 'Opening a 1200 m² main parachute at 220 m/s would shred the canopy instantly! Instead, a rugged drogue chute deploys around 10 km to slow the capsule below 90 m/s, followed by the giant red-and-white main parachute at 6 km.'
    }
  },
  {
    id: 'retro-rockets',
    term: {
      zh: '离地 1.5 米反推缓冲火箭 (Soft-Landing Retro-Rockets)',
      en: '1.5 m Soft-Landing Retro-Rockets'
    },
    short: {
      zh: '触地前一眨眼瞬间向下喷火，把“三楼跳下”的冲击力变成轻柔踩地！',
      en: 'Solid rockets that fire 1.5 meters above the grassland to cushion touchdown to a gentle bump!'
    },
    detail: {
      zh: '即便挂着巨型主伞，3 吨重的返回舱下落速度依然有 7~8 米/秒（相当于从三楼直接跳到地上）。为了保护宇航员脊椎不受伤，在开主伞后要先抛掉烧焦的防热大底，露出底部的 4 台固体反推火箭；当 γ 高度计测出离地面仅剩 1.5 米的瞬间，反推火箭同时向下猛烈喷火 0.3 秒，把触地速度刹到 1.5 米/秒以内！',
      en: 'Even under the main parachute, the 3-ton capsule descends at ~7.5 m/s (like jumping from a 3rd-floor window). After jettisoning the charred heat shield, four solid retro-rockets ignite 1.5 meters above ground, braking touchdown speed below 2 m/s!'
    }
  }
];

export const LANDING_SCENARIOS: LandingScenarioConfig[] = [
  {
    id: 1,
    code: 'LND-01',
    title: {
      zh: '烈焰穿行 · 勇闯 2000℃ 黑障区',
      en: 'Plasma Blackout · Heat Shield Attitude Guard'
    },
    subtitle: {
      zh: '第 1 关：在无线电中断的黑障区稳住防热大底朝向，安全冲出 36 公里高空',
      en: 'Level 1: Keep the heat shield aligned against turbulence and survive the 80–36 km blackout zone'
    },
    brief: {
      zh: '返回舱正以 5200 m/s 冲入稠密大气层，舱外已被 2000℃ 橙红等离子火球包裹，进入无线电黑障区！高空乱流正不断推歪舱体，请用 A/D（或 ←/→）把防热大底偏差角控制在 5° 以内，安全降到 36 公里以下！',
      en: 'Plunging at 5200 m/s inside a 2000°C plasma fireball! Turbulence is tilting the capsule. Use A/D (or Left/Right arrows) to keep heat-shield deviation within 5° and use W/S to manage G-load until you exit blackout below 36 km!'
    },
    objective: {
      zh: '使用 A/D 控制防热大底姿态偏差 ≤ 6.0°（防止烧穿），使用 W/S 升力配平控制过载 ≤ 6.5 G，安全穿透黑障区降至 36 km。',
      en: 'Keep heat-shield deviation <= 6.0° with A/D and G-load <= 6.5 G with W/S until descending below 36 km.'
    },
    passCriteria: {
      zh: '高度 ≤ 36 km · 大底完好 ≥ 70% · 姿态偏差 ≤ 6.0°',
      en: 'Alt ≤ 36 km · Shield Integrity ≥ 70% · Deviation ≤ 6.0°'
    },
    hint: {
      zh: '用 [A] / [D] 把准星稳在正中心（0°），如果过载 G 值偏高可按 [W] 提升气动升力，或按 [T] 开启 SAS 自动配平！',
      en: 'Use [A]/[D] to center the heat shield at 0°, press [W] to increase lift and reduce G-load, or press [T] for SAS!'
    },
    scienceTerm: {
      term: {
        zh: '黑障区与烧蚀防热大底',
        en: 'Blackout Zone & Ablative Shield'
      },
      explanation: {
        zh: '在 80~38 公里高空，2000℃ 高温把空气电离成发光等离子壳，屏蔽了所有无线电信号。防热大底靠自身表面熔化蒸发带走热量，必须严防舱体歪斜让侧面薄壁暴露在烈焰中！',
        en: 'Superheated ionized plasma blocks radio waves from 80 to 38 km. The ablative shield melts layer by layer to carry heat away, so it must stay pointed directly into the hypersonic stream.'
      }
    },
    maxTimeS: 120,
    initialState: {
      altitudeM: 66000,
      speedMs: 5200,
      descentRateMs: 920,
      attitudeDeviationDeg: 3.2,
      chuteState: 'stowed',
      heatshieldJettisoned: false
    }
  },
  {
    id: 2,
    code: 'LND-02',
    title: {
      zh: '天际伞花 · 引导伞与主伞接力',
      en: 'Sky Blossom · Drogue & Main Chute Sequence'
    },
    subtitle: {
      zh: '第 2 关：把握亚音速开伞窗口，依次展开减速引导伞与 1200㎡ 红白巨型主伞',
      en: 'Level 2: Hit the subsonic deployment windows for the drogue chute and 1200 m² main parachute'
    },
    brief: {
      zh: '返回舱已冲出黑障区降至 12.5 公里！切记：速度高于 235 m/s 时千万别开伞，否则高速气流会把伞撕碎！等空气阻力把速度降到 ≤ 225 m/s（约 10 km）时按 [Space] 开减速伞；等速度降到 ≤ 95 m/s（约 6 km）时再按 [Space] 打开红白主伞！',
      en: 'Out of blackout at 12.5 km! Do NOT deploy chutes above 235 m/s or they will shred! Wait until speed drops <= 225 m/s (~10 km) and press [Space] for the Drogue chute; once speed <= 95 m/s (~6 km), press [Space] for the Main chute!'
    },
    objective: {
      zh: '在速度 ≤ 225 m/s 时按 [Space] 打开减速引导伞；在速度 ≤ 95 m/s 时再次按 [Space] 打开主降落伞，使下降速度平稳降至 ≤ 8.5 m/s。',
      en: 'Press [Space] at speed <= 225 m/s for Drogue chute, then press [Space] at speed <= 95 m/s for Main chute to slow descent <= 8.5 m/s.'
    },
    passCriteria: {
      zh: '主伞完全展开 · 下降速度 ≤ 8.5 m/s · 高度 ≥ 2.5 km',
      en: 'Main Chute Full · Descent ≤ 8.5 m/s · Alt ≥ 2.5 km'
    },
    hint: {
      zh: '盯紧速度表：降到 225 m/s 以下按第一次 [Space] 开引导伞 ➔ 降到 95 m/s 以下按第二次 [Space] 开主伞！',
      en: 'Watch speed: below 225 m/s press [Space] for Drogue ➔ below 95 m/s press [Space] again for Main Chute!'
    },
    scienceTerm: {
      term: {
        zh: '两级降落伞减速序列',
        en: 'Two-Stage Parachute Braking'
      },
      explanation: {
        zh: '主降落伞面积足有 1200 平方米（三个篮球场大）！如果在一两百米每秒的高速下直接张开，伞绳会被瞬间扯断。所以必须先放小巧结实的引导伞“踩第一脚刹车”，再放主伞！',
        en: 'The 1200 m² main canopy is the size of three basketball courts. Deploying it at high speed would tear it apart, so a smaller drogue chute brakes the capsule first.'
      }
    },
    maxTimeS: 120,
    initialState: {
      altitudeM: 12200,
      speedMs: 255,
      descentRateMs: 185,
      attitudeDeviationDeg: 1.0,
      chuteState: 'stowed',
      heatshieldJettisoned: false
    }
  },
  {
    id: 3,
    code: 'LND-03',
    title: {
      zh: '毫厘反推 · 离地 1.5 米点火缓冲',
      en: 'Retro Cushion · 1.5 m Pre-Touchdown Ignition'
    },
    subtitle: {
      zh: '第 3 关：抛离烧焦防热大底，在触地前 1.0~2.5 米黄金瞬间点燃固体反推火箭',
      en: 'Level 3: Jettison the charred heat shield and fire retro-rockets 1.0–2.5 m above the grassland'
    },
    brief: {
      zh: '返回舱正挂着红白大伞向东风着陆场草原降落（高度 48 米，下降速度 7.6 m/s）。首先按 [J]（或 [1]）抛掉底部烧焦的防热大底露出反推火箭；然后死死盯住离地高度表，在 1.0 ~ 2.5 米瞬间按下 [Space] 点燃反推火箭温柔触地！',
      en: 'Descending under the main chute at 7.6 m/s (48 m altitude). First press [J] (or [1]) to drop the charred heat shield and expose the retro-rockets; then watch the altimeter and press [Space] at 1.0–2.5 m to fire retro-rockets for a soft touchdown!'
    },
    objective: {
      zh: '先按 [J] 抛掉防热大底，用 A/D 抵消草原横风，在离地高度 1.0 ~ 2.5 米窗口内按 [Space] 点燃反推火箭，使触地速度 ≤ 2.4 m/s。',
      en: 'Press [J] to drop heat shield, counter crosswind with A/D, and press [Space] between 1.0–2.5 m altitude so touchdown speed <= 2.4 m/s.'
    },
    passCriteria: {
      zh: '已抛大底 [J] · 1.0~2.5m 点火反推 · 触地速度 ≤ 2.4 m/s',
      en: 'Shield Dropped [J] · Retro at 1.0–2.5 m · Touchdown ≤ 2.4 m/s'
    },
    hint: {
      zh: '① 立即按 [J] 键抛掉防热大底 ➔ ② 紧盯离地高度倒数，进入 2.4m ~ 1.0m 绿色区间瞬间按 [Space] 点火！',
      en: '1) Press [J] immediately to drop the heat shield ➔ 2) When altitude enters 2.4 m–1.0 m, press [Space] to fire retros!'
    },
    scienceTerm: {
      term: {
        zh: '离地 1.5 米着陆反推火箭',
        en: '1.5 m Soft-Landing Retro-Rockets'
      },
      explanation: {
        zh: '挂着主伞下落速度仍有 7.6 米/秒（相当于从三楼跳下）。离地 1.5 米瞬间点燃底部的 4 台固体反推小火箭，能在 0.3 秒内把触地速度刹到 1.5 米/秒，保护宇航员平安着陆！',
        en: 'Parachute descent is still 7.6 m/s (like a 3rd-floor jump). Firing four solid retro-rockets 1.5 m above ground brakes the capsule to ~1.5 m/s in 0.3 seconds!'
      }
    },
    maxTimeS: 60,
    initialState: {
      altitudeM: 48,
      speedMs: 7.6,
      descentRateMs: 7.6,
      attitudeDeviationDeg: 0.5,
      chuteState: 'main',
      heatshieldJettisoned: false
    }
  },
  {
    id: 4,
    code: 'LND-04',
    title: {
      zh: '英雄凯旋 · 黑障再入至草原着陆全流程',
      en: 'Heroic Return · Full Reentry to Steppe Touchdown'
    },
    subtitle: {
      zh: '第 4 关：从 50 公里黑障火球、两级开伞、抛防热大底，到 1.5 米反推完美着陆',
      en: 'Level 4: Complete return from 50 km plasma blackout, dual chutes, shield drop, to 1.5 m retro touchdown'
    },
    brief: {
      zh: '完整回家之路！从 50 公里黑障区开始：① 稳住防热大底冲出 36 km 黑障区；② 在 10 km（≤225m/s）与 6 km（≤95m/s）按两次 [Space] 依次打开引导伞和红白主伞；③ 按 [J] 抛掉烧焦防热大底；④ 在离地 1.0~2.5 米瞬间按第三次 [Space] 点燃反推火箭，迎接英雄凯旋！',
      en: 'Full return mission! 1) Hold attitude through blackout; 2) Press [Space] at <=225 m/s for Drogue and <=95 m/s for Main chute; 3) Press [J] to drop the heat shield; 4) Press [Space] at 1.0–2.5 m above the steppe for soft retro touchdown!'
    },
    objective: {
      zh: '依次完成黑障防热稳姿、两级降落伞展开、抛防热大底 [J] 与离地 1.0~2.5m 反推缓冲 [Space]，以 ≤ 2.4 m/s 平安触地。',
      en: 'Survive blackout, deploy drogue & main chutes, drop heat shield [J], and fire retro-rockets [Space] at 1.0–2.5 m for touchdown <= 2.4 m/s.'
    },
    passCriteria: {
      zh: '平安触地 (h = 0m) · 触地速度 ≤ 2.4 m/s · 舱体完好',
      en: 'Safe Touchdown (0 m) · Impact Speed ≤ 2.4 m/s · Capsule Intact'
    },
    hint: {
      zh: '① 黑障区稳住大底 ➔ ② ≤225m/s 按 [Space] 开引导伞 ➔ ③ ≤95m/s 按 [Space] 开主伞并按 [J] 抛大底 ➔ ④ 离地 1.8m 按 [Space] 反推着陆！',
      en: '1) Hold shield in blackout ➔ 2) [Space] <=225 m/s (Drogue) ➔ 3) [Space] <=95 m/s (Main) + [J] (Drop Shield) ➔ 4) [Space] at ~1.8 m!'
    },
    scienceTerm: {
      term: {
        zh: '载人飞船再入返回四部曲',
        en: 'Four Stages of Crewed Capsule Return'
      },
      explanation: {
        zh: '从每秒数公里的高速火球到每秒 1.5 米的草原轻触，返回舱依靠“气动烧蚀减速 ➔ 引导伞初刹 ➔ 千平米主伞稳降 ➔ 离地 1.5 米固体反推”四重接力，把巨大的轨道动能安全消解！',
        en: 'From hypersonic fireball to a 1.5 m/s grassland touchdown, four braking stages—ablative aero-braking, drogue chute, 1200 m² main canopy, and 1.5 m retro-rockets—safely dissipate orbital energy!'
      }
    },
    maxTimeS: 240,
    initialState: {
      altitudeM: 50000,
      speedMs: 3600,
      descentRateMs: 780,
      attitudeDeviationDeg: 2.4,
      chuteState: 'stowed',
      heatshieldJettisoned: false
    }
  }
];

export function getLandingScenario(id: number): LandingScenarioConfig {
  return LANDING_SCENARIOS.find((s) => s.id === id) ?? LANDING_SCENARIOS[0];
}
