import type { Localized as LocalizedText } from '../types';
import type { DepartureScenarioConfig } from './types';

export interface DepartureGlossaryItem {
  id: string;
  term: LocalizedText;
  short: LocalizedText;
  detail: LocalizedText;
}

export const DEPARTURE_GLOSSARY: DepartureGlossaryItem[] = [
  {
    id: 'spring-pushoff',
    term: {
      zh: '机械弹簧推离 (Spring Push-off)',
      en: 'Mechanical Spring Push-off'
    },
    short: {
      zh: '不用火箭喷火，靠机械弹簧温柔地把十多吨的飞船从空间站推开！',
      en: 'Gently pushes the multi-ton spacecraft away from the station using mechanical springs instead of thrusters!'
    },
    detail: {
      zh: '当飞船还紧贴在空间站对接口上时，一旦点燃推进器，上千度的高温燃气和化学残渣就会像喷火枪一样直接烧焦空间站的太阳能电池板和光学相机！因此工程师在对接口安装了强力推离弹簧：12 把机械锁钩松开的瞬间，弹簧会把飞船以约 0.15 米/秒的速度轻轻推开，安全滑出前 5 米禁火区。',
      en: 'Firing thrusters right at the docking port would scorch the station’s solar arrays and optical sensors. Instead, when the 12 docking latches release, compressed springs gently push the spacecraft away at ~0.15 m/s across the 5-meter plume keep-out zone.'
    }
  },
  {
    id: 'plume-keepout',
    term: {
      zh: '羽流禁火区 (Plume Keep-Out Zone, 0~5m)',
      en: 'Plume Keep-Out Zone (0–5 m)'
    },
    short: {
      zh: '距离空间站对接口 5 米以内的“禁止喷火保护区”。',
      en: 'The 5-meter safety zone in front of the docking port where axial thruster firing is forbidden.'
    },
    detail: {
      zh: '火箭喷管喷出的高速气体团叫做“羽流 (Plume)”。在真空中羽流会呈喇叭状猛烈扩散。在离空间站不到 5 米的距离内点燃前后主推进器，羽流会冲击空间站舱壁并污染光学镜头。飞船必须耐心依靠弹簧惯性滑过 5 米红线后，才允许点射后退推进器！',
      en: 'Rocket exhaust expands into a wide cone in vacuum called a plume. Firing fore/aft thrusters within 5 meters of the station contaminates optical reflectors and stresses station structures. Always coast past 5 m before firing separation burns!'
    }
  },
  {
    id: 'departure-corridor',
    term: {
      zh: '撤离安全走廊 (Safety Departure Corridor)',
      en: 'Safety Departure Corridor'
    },
    short: {
      zh: '空间站正前方的一条虚拟圆锥形安全通道，防止飞船撞上巨大的太阳能帆板。',
      en: 'An imaginary conical safety tunnel ahead of the station that keeps the ship clear of giant solar wings.'
    },
    detail: {
      zh: '国际空间站和天宫空间站两侧都伸展着几十米长的太阳能帆板和散热器。飞船倒车撤离时，必须严格沿着对接口正前方的“圆锥形安全走廊”中心线后退，如果上下左右偏出走廊边界，就有擦碰空间站桁架或帆板的风险！',
      en: 'Space stations have massive solar wings and radiators extending tens of meters. During undocking, the spacecraft must stay centered inside a conical departure corridor to guarantee clearance from station structures.'
    }
  },
  {
    id: 'nosecone-reentry-prep',
    term: {
      zh: '头锥闭合与撤离收官 (Nosecone Closure)',
      en: 'Nosecone Closure for Reentry Prep'
    },
    short: {
      zh: '飞出安全走廊后合上机头保护罩，为冲入大气层回家做好准备！',
      en: 'Closing the nosecone visor after clearing the station to protect the docking ring during reentry!'
    },
    detail: {
      zh: '飞船头部的对接口（IDA）内部布满了精密的锁钩和传感器。当飞船安全退到 30 米开外、彻底告别空间站后，宇航员会按下按钮合上机头的“头锥保护罩（Nosecone Hatch）”，把精密对接口严密包裹起来，准备接下来返回地球的烈焰再入之旅！',
      en: 'The docking mechanism contains delicate latches and sensors. Once safely past 30 meters from the station, the crew closes the aerodynamic nosecone hatch to shield the docking port for atmospheric reentry.'
    }
  }
];

export const DEPARTURE_SCENARIOS: DepartureScenarioConfig[] = [
  {
    id: 1,
    code: 'DEP-01',
    title: {
      zh: '锁钩轻释 · 弹簧无动力滑行',
      en: 'Latch Release · Spring Push-off Glide'
    },
    subtitle: {
      zh: '第 1 关：解开对接锁钩，禁火滑出 5 米保护区并在 12 米检视点停稳',
      en: 'Level 1: Release latches, coast silently past the 5 m keep-out zone, and hold at 12 m'
    },
    brief: {
      zh: '飞船正锁紧在空间站对接口上。记住：5 米内绝对不能按 F/R 喷火！先按 [Space] 解锁弹簧把飞船温柔弹开，耐心滑过 5 米红线后，在 12 米绿色检视环处按 [R] 键轻柔刹停。',
      en: 'Docked to the station! Never fire F/R thrusters within 5 m! Press [Space] to release latches and let springs push you out. Coast past the 5 m line, then tap [R] to brake and hold steady at the 12 m ring.'
    },
    objective: {
      zh: '按 [Space] 触发弹簧推离，0~5m 期间严禁使用前后推进器；滑行至 11~14m 检视区将后退速度降至 0.06 m/s 以内并保持 1.5 秒。',
      en: 'Press [Space] for spring push-off without firing F/R inside 0–5 m; stop within 11–14 m (speed <= 0.06 m/s) for 1.5 s.'
    },
    passCriteria: {
      zh: '距离 11.0~14.0 m · 速度 ≤ 0.06 m/s · 无羽流污染',
      en: 'Dist 11.0–14.0 m · Speed ≤ 0.06 m/s · No Plume Contamination'
    },
    hint: {
      zh: '先按 [Space] 解锁弹簧 ➔ 等待飞船滑过 5.0m 禁火线 ➔ 可按 [F] 适度加速后退，接近 12m 时按 [R] 刹车停稳！',
      en: 'Press [Space] to undock ➔ Coast past 5.0 m keep-out line ➔ Use [F] to back up and [R] to brake at 12 m!'
    },
    scienceTerm: {
      term: {
        zh: '机械弹簧推离与羽流禁火区',
        en: 'Spring Push-off & Plume Keep-Out Zone'
      },
      explanation: {
        zh: '刚离开空间站 5 米内为什么不能喷气？因为火箭喷出的炽热气流（羽流）会熏黑空间站的太阳能电池板和镜头！所以前 5 米必须靠机械弹簧温柔推开，滑出 5 米禁火区后才能点火。',
        en: 'Thruster exhaust plumes can damage station solar panels and optics within 5 meters. Compressed springs push the ship gently across the 5 m keep-out zone before thrusters may fire.'
      }
    },
    maxTimeS: 160,
    initialState: {
      position: [0, 0, 0.35],
      velocity: [0, 0, 0],
      attitudeDeg: [0, 0, 0],
      angularVelDeg: [0, 0, 0],
      latchesReleased: false,
      noseconeClosed: false
    }
  },
  {
    id: 2,
    code: 'DEP-02',
    title: {
      zh: '走廊纠偏 · 抵消偏心横漂',
      en: 'Corridor Centering · Cancel Lateral Drift'
    },
    subtitle: {
      zh: '第 2 关：消除弹簧释放微扰引起的侧向漂移，严守安全撤离圆锥走廊',
      en: 'Level 2: Cancel lateral drift after undocking and stay centered inside the departure cone'
    },
    brief: {
      zh: '飞船刚滑出 5 米禁火区，但有一组弹簧推力略微偏心，导致飞船正在向右下方偏出安全撤离走廊！立即用 A/D（左右）和 W/S（上下）把飞船推回中心绿线，平稳后退过 18 米！',
      en: 'Just past the 5 m line, an uneven spring push caused a lateral drift toward the solar array hazard zone! Use A/D (left/right) and W/S (up/down) to recenter inside the corridor and back past 18 m!'
    },
    objective: {
      zh: '使用 W/S/A/D 消除横向偏移（≤ 0.25 m）与横向漂移速度（≤ 0.04 m/s），保持在走廊中心后退至 18 米以外。',
      en: 'Use W/S/A/D to bring lateral offset <= 0.25 m and lateral speed <= 0.04 m/s while backing past 18 m.'
    },
    passCriteria: {
      zh: '距离 ≥ 18 m · 横向偏移 ≤ 0.25 m · 横漂速度 ≤ 0.04 m/s',
      en: 'Dist ≥ 18 m · Offset ≤ 0.25 m · Lateral Speed ≤ 0.04 m/s'
    },
    hint: {
      zh: '按 [A] 向左推、按 [W] 向上推回到中心十字，快居中时反向轻点抵消横漂速度，也可按住 [B] 键辅助稳姿减漂！',
      en: 'Tap [A] (left) and [W] (up) to return to the crosshair center, then counter-tap to zero lateral speed!'
    },
    scienceTerm: {
      term: {
        zh: '撤离安全走廊 (Departure Corridor)',
        en: 'Safety Departure Corridor'
      },
      explanation: {
        zh: '空间站两侧展开着数十米宽的巨型太阳能翼。飞船倒退撤离时就像从狭窄车库倒车，必须沿着正前方的圆锥形安全走廊中心后退，绝不能往两侧偏航擦碰帆板！',
        en: 'Massive solar arrays flank the station. Backing out requires staying strictly inside a conical safety corridor along the docking axis.'
      }
    },
    maxTimeS: 160,
    initialState: {
      position: [0.48, -0.36, 5.8],
      velocity: [0.14, -0.11, 0.22],
      attitudeDeg: [0, 0, 0],
      angularVelDeg: [0, 0, 0],
      latchesReleased: true,
      noseconeClosed: false
    }
  },
  {
    id: 3,
    code: 'DEP-03',
    title: {
      zh: '姿态守望 · 激光雷达锁定后退',
      en: 'Attitude Watch · Lidar Lock While Backing'
    },
    subtitle: {
      zh: '第 3 关：在倒车撤离中克服旋转力矩，让机头激光测距仪始终正对空间站',
      en: 'Level 3: Counter rotational disturbance while backing out so nose lidar stays locked on station'
    },
    brief: {
      zh: '撤离途中飞船受到姿控扰动开始偏转！根据太空站撤离安全条例，飞船机头的激光雷达必须始终正对空间站对接口以便实时测距。请用方向键 ↑↓←→ 与 Q/E 把机头重新对准靶心并退过 24 米！',
      en: 'A torque disturbance tilted the ship! Safety rules require the nose lidar to stay pointed at the station port while backing away. Use Arrow keys and Q/E to align attitude within 2.0° and back past 24 m!'
    },
    objective: {
      zh: '使用方向键 ↑↓←→ 与 Q/E 将姿态误差修正至 ≤ 2.0°、旋转角速度 ≤ 0.4°/s，保持居中并后退通过 24 米。',
      en: 'Align attitude error <= 2.0° and angular speed <= 0.4°/s while backing past 24 m.'
    },
    passCriteria: {
      zh: '距离 ≥ 24 m · 姿态误差 ≤ 2.0° · 角速度 ≤ 0.4°/s',
      en: 'Dist ≥ 24 m · Attitude Err ≤ 2.0° · Angular Rate ≤ 0.4°/s'
    },
    hint: {
      zh: '用方向键 ↑↓（俯仰）、←→（偏航）和 Q/E（滚转）把姿态角度调回 0°，或按住 [B] 键启动阻尼稳姿！',
      en: 'Use Arrow keys (pitch/yaw) and Q/E (roll) to zero attitude angles, or hold [B] for attitude damping!'
    },
    scienceTerm: {
      term: {
        zh: '撤离目视与激光测距守望',
        en: ' Optical & Lidar Station-Keeping'
      },
      explanation: {
        zh: '为什么撤离时不能直接掉头飞走，而要“倒着走”？因为对接口和激光测距雷达都装在飞船机头！倒着退才能让雷达和摄像机时刻盯住空间站，确保万一出现异常能随时监控距离。',
        en: 'Why back away instead of turning around immediately? Because the docking camera and laser rangefinder are on the nose! Backing out keeps sensors locked onto the station.'
      }
    },
    maxTimeS: 160,
    initialState: {
      position: [0.12, -0.08, 12.5],
      velocity: [0.02, -0.02, 0.28],
      attitudeDeg: [6.5, -5.8, 4.2],
      angularVelDeg: [0.8, -0.6, 0.5],
      latchesReleased: true,
      noseconeClosed: false
    }
  },
  {
    id: 4,
    code: 'DEP-04',
    title: {
      zh: '完整撤离 · 驶出安全走廊与闭罩',
      en: 'Full Departure · Corridor Exit & Visor Close'
    },
    subtitle: {
      zh: '第 4 关：从解锁弹簧、滑出禁火区、走廊加速后退，到 32 米外闭合头锥保护罩',
      en: 'Level 4: Complete undocking from latch release and 5 m coast to 32 m exit and nosecone closure'
    },
    brief: {
      zh: '终极综合考验！从紧贴空间站开始：① 按 [Space] 解锁弹簧并静默滑出 5 米禁火区；② 点射 [F] 加速后退并实时修正微小横漂与姿态；③ 退到 32 米外按 [1] 键关闭头锥保护罩，为重返地球大气层做好准备！',
      en: 'Full undocking mission! 1) Press [Space] to unlatch and coast past 5 m without thrusters; 2) Tap [F] to accelerate backward while keeping centered and aligned; 3) Past 32 m, press [1] to close the nosecone hatch for reentry!'
    },
    objective: {
      zh: '无污染滑出 5m 禁火区，保持在安全走廊内退至 ≥ 32m，按 [1] 键闭合头锥保护罩，姿态误差 ≤ 2.5°、横向偏移 ≤ 0.6m。',
      en: 'Coast past 5 m cleanly, back out to >= 32 m inside the corridor, press [1] to close nosecone hatch with attitude <= 2.5° and offset <= 0.6 m.'
    },
    passCriteria: {
      zh: '距离 ≥ 32 m · 头锥已关闭 [1] · 姿态 ≤ 2.5° · 偏移 ≤ 0.6 m',
      en: 'Dist ≥ 32 m · Nosecone CLOSED [1] · Att ≤ 2.5° · Offset ≤ 0.6 m'
    },
    hint: {
      zh: '① 按 [Space] 弹开 ➔ ② 过 5m 后按 [F] 加速后退并用 W/S/A/D 居中 ➔ ③ 过 32m 后按 [1] 键关上头锥面罩即可通关！',
      en: '1) [Space] to unlatch ➔ 2) Past 5 m, tap [F] to back up & stay centered ➔ 3) Past 32 m, press [1] to close nosecone!'
    },
    scienceTerm: {
      term: {
        zh: '撤离走廊毕业与再入闭罩',
        en: 'Corridor Exit & Reentry Nosecone Closure'
      },
      explanation: {
        zh: '当飞船安全退到 30 米以外，就脱离了空间站的近距防撞区。此时宇航员必须合上机头的头锥保护罩，把脆弱的对接口锁钩严密盖好，准备接下来冲入地球大气层的火球考验！',
        en: 'Once past 30 m, the spacecraft clears the close-proximity zone. The crew closes the nosecone hatch to shield the delicate docking ring before fiery atmospheric reentry.'
      }
    },
    maxTimeS: 220,
    initialState: {
      position: [0, 0, 0.35],
      velocity: [0, 0, 0],
      attitudeDeg: [0, 0, 0],
      angularVelDeg: [0, 0, 0],
      latchesReleased: false,
      noseconeClosed: false
    }
  }
];

export function getDepartureScenario(id: number): DepartureScenarioConfig {
  return DEPARTURE_SCENARIOS.find((s) => s.id === id) ?? DEPARTURE_SCENARIOS[0];
}
