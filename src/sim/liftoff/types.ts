import type { Language, Localized } from '../types';

export type Vec2 = [number, number];

/**
 * 升空任务失败原因枚举
 * - pad_fallback: 推重比不足 (< 1.0) 解锁发射台导致坠回发射台
 * - tower_collision: 起飞初期 (高度 < 150m) 过早大幅度倾斜撞击发射塔架
 * - aero_stress: 在稠密大气层高速飞行（尤指 Max-Q 附近）攻角过大导致气动结构解体
 * - over_g: 过载超过宇航员或箭体承受极限 (> 6.5 G)
 * - premature_staging: 当前级燃料尚未耗尽 (> 5%) 且推力开启时强行分离导致追尾碰撞
 * - late_staging: 第一级熄火后长时间未分离导致火箭失速坠落
 * - suborbital_reentry: 未能达到足够水平入轨速度，远地点后坠入大气层 (< 70 km)
 * - orbit_eccentric: 入轨关机时轨道偏心率过大或近地点过低，未能形成稳定停泊圆轨
 * - fuel_exhausted: 推进剂耗尽仍未达成关卡目标
 * - timeout: 超出关卡最大允许飞行时间
 */
export type LiftoffFailure =
  | 'pad_fallback'
  | 'low_altitude_crash'
  | 'tower_collision'
  | 'aero_stress'
  | 'over_g'
  | 'premature_staging'
  | 'late_staging'
  | 'suborbital_reentry'
  | 'orbit_eccentric'
  | 'fuel_exhausted'
  | 'timeout';

/**
 * 失败后果动态推演类型：
 * - none: 正常飞行
 * - exploding: 空中气动折断或碰撞爆炸解体，碎片四散
 * - falling: 熄火或推力中断，重力拉拽极速下坠
 * - crashed_pad: 坠毁于发射台地面混凝土设施
 * - crashed_ocean: 坠毁于大西洋/南中国海海面
 * - drifting_space: 高空/入轨推力耗尽，在冷寂太空中永久漂浮
 */
export type LiftoffConsequence =
  | 'none'
  | 'exploding'
  | 'falling'
  | 'crashed_pad'
  | 'crashed_ocean'
  | 'drifting_space';

/**
 * 借鉴《坎巴拉太空计划 (KSP)》的姿态稳定辅助系统 (SAS) 模式
 * - manual: 纯手动俯仰角速率控制
 * - hold: 锁定当前俯仰角 (Attitude Hold)
 * - prograde: 自动顺应速度矢量方向 (Surface / Orbital Prograde，用于重力转向)
 * - pitch_program: 按照 NASA 预设俯仰程序曲线自动引导机头倾角
 */
export type SasMode = 'manual' | 'hold' | 'prograde' | 'pitch_program';

/**
 * 升空阶段状态机标识
 */
export type AscentPhase =
  | 'prelaunch'        // 发射台待命，发动机尚未点火或推力建立中
  | 'tower_clear'      // 拔地而起，垂直飞越发射塔架 (0 ~ 150 m)
  | 'pitch_over'       // 初始程序转弯 (150 m ~ 3 km)
  | 'gravity_turn'     // 跨音速与最大动压 Max-Q 重力转向 (3 km ~ 40 km)
  | 'upper_atmosphere' // 冲出稠密大气与一二级分离准备 (40 km ~ 70 km)
  | 'stage2_ascent'    // 第二级高空加速与抛逃逸塔/整流罩 (70 km ~ 160 km)
  | 'orbital_insertion'// 接近远地点水平加速圆化入轨 (160 km ~ 200 km)
  | 'orbit_achieved';  // 入轨关机 (SECO)，进入稳定近地停泊轨道

/**
 * 单级火箭物理参数配置（基于 NASA 真实运载火箭公开数据）
 */
export interface RocketStageConfig {
  /** 级序号（1: 一级, 2: 二级, 3: 三级） */
  stageNumber: number;
  /** 级代号，如 "S-IC"、"S-II"、"S-IVB" */
  code: string;
  /** 青少年友好的中英名称 */
  name: Localized;
  /** 发动机型号与配置说明 */
  engineDesc: Localized;
  /** 结构干质量 (kg) —— 燃料烧完后必须抛掉的“空桶死重” */
  dryMassKg: number;
  /** 满载推进剂质量 (kg) */
  fuelMassKg: number;
  /** 海平面总推力 (N) */
  thrustSeaLevelN: number;
  /** 真空总推力 (N) */
  thrustVacuumN: number;
  /** 海平面比冲 Isp (s) */
  ispSeaLevelS: number;
  /** 真空比冲 Isp (s) */
  ispVacuumS: number;
  /** 迎风参考截面积 (m²)，用于计算空气阻力 */
  referenceAreaM2: number;
  /** 发动机喷管最大矢量摆角 (度) */
  gimbalRangeDeg: number;
  /** 最小节流阀油门比例 (0.0 ~ 1.0) */
  minThrottle: number;
}

export type RocketVehicleId = 'saturn-v' | 'cz5' | 'cz2f';

/**
 * 运载火箭完整组合体构型
 */
export interface RocketVehicleConfig {
  id: RocketVehicleId;
  name: Localized;
  era: Localized;
  description: Localized;
  /** 发射场纬度 (度)，用于计算地球自转赋予的初始向东线速度 */
  launchLatitudeDeg: number;
  /** 发射场名称 */
  launchSite: Localized;
  /** 顶部的有效载荷质量 (kg)，例如阿波罗飞船指令舱+登月舱组合体 */
  payloadMassKg: number;
  /** 发射逃逸塔 (LES) 质量 (kg)，在穿越稠密大气后（约 90~100km）抛离以减轻死重 */
  launchEscapeTowerMassKg: number;
  /** 逃逸塔建议抛离高度 (m) */
  towerJettisonAltitudeM: number;
  /** 最大允许气动攻角动压积 Q*alpha 阈值 (kPa·deg)，超过则发生气动折断 */
  maxQAlphaKpaDeg: number;
  /** 最大允许轴向过载 (G) */
  maxGLoad: number;
  /** 各级火箭参数（按第 1 级、第 2 级、第 3 级顺序排列） */
  stages: RocketStageConfig[];
}

/**
 * 大气层实时采样状态
 */
export interface AtmosphereSample {
  /** 海拔高度 (m) */
  altitudeM: number;
  /** 大气压强 (Pa) */
  pressurePa: number;
  /** 与海平面标准大气压之比 (0 ~ 1) */
  pressureRatio: number;
  /** 空气密度 (kg/m³) */
  densityKgM3: number;
  /** 大气温度 (K) */
  temperatureK: number;
  /** 当地音速 (m/s) */
  speedOfSoundMs: number;
}

/**
 * 开普勒轨道根数与拱点实时解算结果
 */
export interface OrbitalElements {
  /** 当前海拔高度 (m) */
  altitudeM: number;
  /** 沿地表向东飞行的下程弧距 Downrange (m) */
  downrangeM: number;
  /** 远地点海拔高度 Apoapsis (m) —— 轨道最高点 */
  apoapsisM: number;
  /** 近地点海拔高度 Periapsis (m) —— 轨道最低点（若 < 0 表示未入轨，轨迹仍与地球相交） */
  periapsisM: number;
  /** 轨道偏心率 Eccentricity (0 为正圆轨道，< 1 为椭圆轨道) */
  eccentricity: number;
  /** 比机械能 Specific Orbital Energy (J/kg) */
  specificEnergy: number;
  /** 预计到达远地点剩余时间 Time to Apoapsis (s) */
  timeToApoapsisS: number;
  /** 当前高度对应的第一宇宙速度（圆轨道环绕速度，m/s） */
  circularVelocityMs: number;
  /** 惯性系总速度 (m/s) */
  orbitalSpeedMs: number;
  /** 大气相对速度 / 地表速度 (m/s) */
  surfaceSpeedMs: number;
  /** 当地径向垂直升降速度 (m/s，向上为正) */
  verticalSpeedMs: number;
  /** 当地水平向东切向速度 (m/s，向东为正) */
  horizontalSpeedMs: number;
  /** 大气相对飞行路径倾角 Surface Prograde Angle (度，90°为垂直向上，0°为水平向东) */
  surfaceProgradeDeg: number;
  /** 惯性轨道飞行路径倾角 Orbital Prograde Angle (度，90°为垂直向上，0°为水平向东) */
  orbitalProgradeDeg: number;
  /** 是否已满足稳定近地停泊轨道判据 (Pe >= 150km 且 Ap >= 170km) */
  isOrbitStable: boolean;
}

/**
 * 玩家/自动驾驶仪输入指令（借鉴 KSP 操控体系）
 */
export interface LiftoffCommand {
  /** 节流阀油门 (0.0 ~ 1.0)：Shift/Ctrl 增减，Z 键 100% 满油门，X 键 0% 紧急关机 */
  throttle: number;
  /** 俯仰操控输入 (-1.0 压机头向东 ~ +1.0 抬机头向上) */
  pitchInput: number;
  /** SAS 姿态辅助模式 */
  sasMode: SasMode;
  /** 目标锁定俯仰角 (度，90°垂直，0°水平)，在 sasMode === 'hold' 时生效 */
  targetPitchDeg?: number;
  /** 脉冲动作：按空格键触发级间分离 / 解锁发射台牵制臂 */
  triggerStage: boolean;
  /** 脉冲动作：抛离逃逸塔 (LES) */
  jettisonTower: boolean;
}

/**
 * 火箭各级实时状态
 */
export interface StageRuntimeState {
  stageNumber: number;
  code: string;
  dryMassKg: number;
  fuelMassKg: number;
  maxFuelMassKg: number;
  separated: boolean;
}

/**
 * 升空物理仿真完整瞬时状态
 */
export interface LiftoffState {
  /** 任务流逝时间 MET (Mission Elapsed Time, s) */
  time: number;
  /** 任务运行状态 */
  status: 'ready' | 'flying' | 'success' | 'failed';
  /** 失败原因（仅在 status === 'failed' 时存在） */
  reason?: LiftoffFailure;
  /** 失败触发时的时刻 MET (s) */
  failureTime?: number;
  /** 失败后果动态推演状态 */
  consequence?: LiftoffConsequence;
  /** 飞行全过程记录到的最高海拔高度 (m) */
  maxAltitudeM: number;
  /** 当前升空阶段标识 */
  phase: AscentPhase;
  /** 地心惯性系二维发射平面位置 [x, y] (m)，发射台初始位于 [0, R_earth] */
  position: Vec2;
  /** 地心惯性系速度矢量 [vx, vy] (m/s) */
  velocity: Vec2;
  /** 火箭机头相对当地水平面的俯仰角 Pitch (度，90°为垂直指天，0°为水平向东) */
  pitchDeg: number;
  /** 俯仰角速度 (度/s) */
  pitchRateDegS: number;
  /** 当前激活级序号 (1, 2, 3) */
  activeStageIndex: number;
  /** 各级燃料与分离状态列表 */
  stages: StageRuntimeState[];
  /** 发射台牵制臂是否已释放 */
  clampsReleased: boolean;
  /** 逃逸塔 (LES) 是否已抛离 */
  towerJettisoned: boolean;
  /** 当前节流阀油门开度 (0 ~ 1) */
  throttle: number;
  /** 当前 SAS 模式 */
  sasMode: SasMode;
  /** 当前全箭总质量 (kg) */
  totalMassKg: number;
  /** 当前发动机有效推力 (N) */
  thrustN: number;
  /** 当前有效比冲 Isp (s) */
  effectiveIspS: number;
  /** 当前推重比 TWR (Thrust-to-Weight Ratio) */
  twr: number;
  /** 宇航员感受到的视在过载 (G) */
  gLoad: number;
  /** 当前空气动压 Dynamic Pressure q (Pa) */
  dynamicPressurePa: number;
  /** 飞行全过程记录到的历史最大动压峰值 Max-Q (Pa) */
  maxQRecordedPa: number;
  /** 是否刚越过 Max-Q 峰值点 */
  passedMaxQ: boolean;
  /** 当前马赫数 Mach */
  mach: number;
  /** 当前迎角/攻角 Angle of Attack alpha (度) */
  aoaDeg: number;
  /** 当前气动弯曲应力指标 Q * |alpha| (kPa·deg) */
  qAlphaKpaDeg: number;
  /** 当前气动阻力大小 (N) */
  dragForceN: number;
  /** 实时解算的开普勒轨道根数与速度遥测 */
  orbit: OrbitalElements;
  /** 第一级燃料耗尽关机 (MECO) 后的未分离等待时长 (s) */
  stagingCoastTimerS: number;
  /** 目标保持计时器 (s) */
  holdTimerS: number;
}

/**
 * 升空关卡配置（延续现有 00 通识 + 4 关进阶训练结构）
 */
export interface LiftoffScenarioConfig {
  id: number;
  vehicleId: RocketVehicleId;
  title: Localized;
  subtitle: Localized;
  objective: Localized;
  hint: Localized;
  passCriteria: Localized;
  brief: Localized;
  lesson: Localized;
  scienceTerm: {
    term: Localized;
    explanation: Localized;
  };
  /** 初始切入状态配置（第 1、4 关从发射台开始，第 2、3 关从特定高空飞行段切入以聚焦训练） */
  initialState: {
    altitudeM: number;
    downrangeM: number;
    verticalSpeedMs: number;
    horizontalSpeedMs: number;
    pitchDeg: number;
    activeStageIndex: number;
    stageFuelFractions: number[];
    clampsReleased: boolean;
    towerJettisoned: boolean;
    throttle: number;
    sasMode: SasMode;
    initialTimeS: number;
  };
  /** 通关判据 */
  targets: {
    minAltitudeM?: number;
    minApoapsisM?: number;
    maxApoapsisM?: number;
    minPeriapsisM?: number;
    maxEccentricity?: number;
    targetPitchMinDeg?: number;
    targetPitchMaxDeg?: number;
    requireStageIndex?: number;
    requireTowerJettison?: boolean;
    requireOrbitStable?: boolean;
    maxTimeS: number;
  };
}

/**
 * 升空遥测采样点（用于复盘图表：高度-时间、速度-时间、动压Max-Q、过载G力曲线）
 */
export interface LiftoffSample {
  time: number;
  altitudeKm: number;
  downrangeKm: number;
  apoapsisKm: number;
  periapsisKm: number;
  surfaceSpeedMs: number;
  orbitalSpeedMs: number;
  pitchDeg: number;
  progradeDeg: number;
  dynamicPressureKpa: number;
  gLoad: number;
  twr: number;
  mach: number;
  stageNumber: number;
  stageFuelPct: number;
}

/**
 * 升空关键飞行事件（用于任务时间轴与复盘报告）
 */
export interface LiftoffEvent {
  time: number;
  type:
    | 'ignition'
    | 'liftoff'
    | 'tower_clear'
    | 'pitch_over'
    | 'supersonic'
    | 'max_q'
    | 'meco'
    | 'stage_separation'
    | 'les_jettison'
    | 'karman_line'
    | 'seco_orbit'
    | 'warning'
    | 'failed';
  label: Localized;
  reason?: LiftoffFailure;
}
