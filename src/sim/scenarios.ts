import type { ScenarioConfig } from './types';
const base = { fuel: 100, positionTolerance: .2, speedTolerance: .06, angleTolerance: 2, angularSpeedTolerance: .5, holdDuration: 1.5, maxTime: 600 };
export const scenarios: ScenarioConfig[] = [
  { ...base, id: 1,
    title: { zh: '学会停下来', en: 'Learn to stop' },
    subtitle: { zh: '目标：在前方 8 米黄圈处停稳飞船（亦可直接对接）', en: 'Goal: Stop at 8 m yellow ring (or dock directly)' },
    objective: { zh: '在前方 8 米「黄色圆圈」处刹停稳住 1.5 秒；若未停下，直接平稳飞抵对接口对接也可通关！', en: 'Stop steadily at 8 m yellow ring for 1.5 s; or fly directly into the port to dock!' },
    hint: { zh: '看准距离按键盘 F 键反推刹车把速度减到 0；若冲过黄圈，也可保持对准中心直接飞向空间站完成对接！', en: 'Press F to brake and stop at 8 m; or stay centered and fly straight in to dock directly!' },
    passCriteria: { zh: '停在 8 米黄圈内稳住 1.5 秒 · 或直接平稳飞抵对接口成功入锁', en: 'Hold at 8 m ring for 1.5 s · Or dock directly into the port' },
    brief: { zh: '飞船正滑向空间站。请提前按 F 键反推刹车在 8 米黄圈处停稳；若直接平稳飞到对接口入锁，也视作成功通过。', en: 'Your ship is gliding toward the station. Brake with F to stop at the 8 m ring; or dock directly with the port to pass.' },
    lesson: { zh: '推进改变速度，而不是直接改变位置。先观察接近速度，提前反推；速度归零后再松开。', en: 'Thrust changes velocity, not position. Watch your closing speed, brake early, then release when your speed reaches zero.' },
    constraints: { zh: '六自由度已全部解锁 · 自由平移与姿态控制', en: 'All 6-DOF unlocked · Full translation & rotation' },
    position: [0, 0, 18], velocity: [0, 0, -0.65], attitude: [0, 0, 0], translation: [true, true, true], rotation: true, targetZ: 8, positionTolerance: 0.35
  },
  { ...base, id: 2,
    title: { zh: '消除横向漂移', en: 'Cancel the drift' },
    subtitle: { zh: '目标：消除上下左右漂移，对准绿色十字中心', en: 'Goal: Cancel sideways drift and align with green crosshair' },
    objective: { zh: '消除上下与左右侧向偏移，把漂移速度降到 0，让飞船正对绿色十字中心走廊', en: 'Cancel vertical & lateral drift, zero out sideways speed, and center on the green crosshair' },
    hint: { zh: '用 W / S（上下）与 A / D（左右）侧向喷火微调，把飞船推回正中心，并把横向速度减为 0！', en: 'Use W / S (vertical) and A / D (lateral) to push the ship back to center and cancel sideways speed!' },
    passCriteria: { zh: '对准对接口中心（偏差 < 0.20m） · 侧向漂移速度 < 0.04 m/s · 稳住 1.5 秒', en: 'Aligned with port center (< 0.20m) · Sideways speed < 0.04 m/s · Hold for 1.5 s' },
    brief: { zh: '对接口就在正前方，但飞船正在往侧面歪斜漂移。请使用上下左右方向控制，把位置和横向速度同时归零。', en: 'The port is ahead, but your ship is drifting sideways. Use vertical and lateral thrusters to center your position and eliminate sideways speed.' },
    lesson: { zh: '瞄准标记重合时，飞船仍可能横向移动。需要同时检查偏移和漂移速度。', en: 'The markers can overlap while you are still drifting. Both lateral position and velocity must be close to zero.' },
    constraints: { zh: '六自由度已全部解锁 · 自由平移与姿态控制', en: 'All 6-DOF unlocked · Full translation & rotation' },
    position: [2.4, -1.4, 12], velocity: [0.08, -0.04, 0], attitude: [0, 0, 0], translation: [true, true, true], rotation: true, targetZ: 12
  },
  { ...base, id: 3,
    title: { zh: '对准接口', en: 'Align the port' },
    subtitle: { zh: '目标：旋转机头对齐空间站舱门，并停住自转', en: 'Goal: Rotate nose to face station hatch and stop rotating' },
    objective: { zh: '旋转调整机头俯仰、偏航和滚转，让飞船舱门与空间站舱门完全正对，并停住旋转（姿态误差 < 2°）', en: 'Rotate pitch, yaw, and roll so both hatches face each other directly, then stop rotation (< 2°)' },
    hint: { zh: '按键盘方向键 ↑ ↓ ← → 旋转机头，按 Q / E 滚转。舱门对正后，反向轻点按键停住自转！', en: 'Use arrow keys ↑ ↓ ← → to rotate nose, Q / E to roll. Counter-tap to halt rotation once aligned!' },
    passCriteria: { zh: '姿态对准误差 < 2° · 旋转角速度 < 0.5°/s · 稳住 1.5 秒', en: 'Attitude error < 2° · Angular rotation speed < 0.5°/s · Hold for 1.5 s' },
    brief: { zh: '飞船舱门歪了！用方向键 ↑ ↓ ← → 和 Q / E 旋转飞船对准空间站，对正后记得反向点按把旋转停下来。', en: 'Your hatch is misaligned! Use arrows ↑ ↓ ← → and Q/E to align with the station, then counter-tap to stop rotating.' },
    lesson: { zh: '转向推进器改变角速度。对准的一瞬间并不代表完成，还需要停止旋转。', en: 'Rotational thrusters change angular velocity. Momentary alignment is not enough: rotation must also stop.' },
    constraints: { zh: '六自由度已全部解锁 · 自由平移与姿态控制', en: 'All 6-DOF unlocked · Full translation & rotation' },
    position: [0, 0, 8], velocity: [0, 0, 0], attitude: [9, -12, 7], translation: [true, true, true], rotation: true, targetZ: 8
  },
  { ...base, id: 4,
    title: { zh: '最后 50 米', en: 'The final 50 metres' },
    subtitle: { zh: '目标：从 50 米外平稳飞入，轻柔触碰对接', en: 'Goal: Approach from 50 m and make gentle contact docking' },
    objective: { zh: '从 50 米外一路平稳飞向空间站，以低于 0.15 m/s 极低速轻柔触碰对接口完成对接', en: 'Fly in from 50 m and make gentle contact docking at under 0.15 m/s directly on the port center' },
    hint: { zh: '对准绿色中心十字走廊，快到门口时轻点 F 键减速。接触速度必须很慢（小于 0.15 m/s），太快会撞击失控！', en: 'Stay centered on the green crosshair. Tap F to brake on approach. Contact speed must be < 0.15 m/s or collision occurs!' },
    passCriteria: { zh: '接触速度 < 0.15 m/s · 对接口中心偏差 < 0.18m · 姿态角度偏差 < 2° · 安全入锁', en: 'Contact speed < 0.15 m/s · Center error < 0.18m · Angle error < 2° · Latched' },
    brief: { zh: '独立完成全流程对接！先对准中心和姿态，再缓慢靠近。接触对接口时速度必须低于 0.15 m/s（相当于慢慢走路的速度）。', en: 'Complete manual docking independently! Align center and attitude first, then creep in gently. Contact speed must be below 0.15 m/s.' },
    lesson: { zh: '先消除偏移和姿态误差，再缓慢接近。对接同时要求位置、方向、速度和角速度满足条件。', en: 'Cancel lateral and attitude errors before the final approach. Docking requires safe position, orientation, velocity and angular velocity together.' },
    constraints: { zh: '六自由度全部开放 · 所有推进消耗资源', en: 'All six degrees of freedom · every thrust uses resources' },
    position: [0.6, -0.3, 50], velocity: [0, 0, -0.35], attitude: [2, -3, 2], translation: [true, true, true], rotation: true, targetZ: 0.35, positionTolerance: 0.18, speedTolerance: 0.15, maxTime: 900
  }
];

export const getScenario = (id: number) => scenarios.find(s=>s.id === id) ?? scenarios[0];
