import type { Localized as LocalizedText, Vec3 } from '../types';

export type DepartureStatus = 'ready' | 'flying' | 'success' | 'failed';

export type DepartureFailReason =
  | 'plume_contamination' // 在 0~5m 羽流禁火区内点燃前后主推力器，高温燃气污染空间站太阳能帆板/镜头
  | 'corridor_breach' // 横向偏出安全撤离圆锥走廊
  | 'station_collision' // 倒退不足反冲撞上空间站结构
  | 'attitude_lost' // 撤离途中姿态偏角过大，激光测距雷达丢失空间站锁定
  | 'overspeed' // 撤离速度过快超出走廊安全限速
  | 'timeout';

export interface DepartureCommand {
  /** 三轴平移推力输入 [-1, 1]: x 左右(A/D), y 上下(S/W), z 前后(R=-1 靠近空间站, F=+1 后退远离空间站) */
  translation: Vec3;
  /** 三轴姿态旋转输入 [-1, 1]: pitch(↑/↓), yaw(←/→), roll(Q/E) */
  rotation: Vec3;
  /** 单次触发：释放对接机械锁钩并启动弹簧推离 (Space) */
  releaseLatches: boolean;
  /** 单次触发：切换机头头锥保护罩开关 (Key 1) */
  toggleNosecone: boolean;
  /** 姿态与横向速度辅助阻尼制动 (Key B / Shift) */
  assistBrake: boolean;
}

export interface DepartureState {
  /** 任务已用时间 (s) */
  time: number;
  status: DepartureStatus;
  failReason?: DepartureFailReason;
  /** 飞船相对空间站对接口位置 [x, y, z] (m)，z >= 0.35 为正前方撤离轴 */
  position: Vec3;
  /** 飞船相对速度 [vx, vy, vz] (m/s)，vz > 0 表示正在后退远离空间站 */
  velocity: Vec3;
  /** 飞船姿态欧拉角偏差 [pitchDeg, yawDeg, rollDeg] (°)，[0,0,0] 为正对空间站对接口 */
  attitudeDeg: Vec3;
  /** 飞船角速度 [wx, wy, wz] (°/s) */
  angularVelDeg: Vec3;
  /** 对接锁钩是否已解脱并完成弹簧推离 */
  latchesReleased: boolean;
  /** 机头头锥保护罩是否已关闭（1 = 已关闭保护再入，0 = 开启露出对接口） */
  noseconeClosed: boolean;
  /** 头锥开合过渡进度 (0 = 完全开启, 1 = 完全关闭) */
  noseconeProgress: number;
  /** 剩余推进剂预算 (%) */
  fuelPct: number;
  /** 当前轴向距离处安全撤离走廊允许的最大横向半径 (m) */
  corridorRadiusM: number;
  /** 当前横向偏移距离 hypot(x, y) (m) */
  lateralOffsetM: number;
  /** 当前横向漂移速度 hypot(vx, vy) (m/s) */
  lateralSpeedMs: number;
  /** 当前综合姿态误差角 (°) */
  attitudeErrorDeg: number;
  /** 是否处于 0 ~ 5m 羽流禁火保护区内 */
  inKeepOutZone: boolean;
  /** 通关条件已连续保持达标的时长 (s) */
  holdTimerS: number;
  /** 当前帧施加上推力矢量 (用于 3D RCS 羽流渲染) */
  activeThrust: Vec3;
  /** 当前帧施加上力矩矢量 */
  activeTorque: Vec3;
}

export interface DepartureSample {
  time: number;
  distanceM: number;
  backSpeedMs: number;
  lateralOffsetM: number;
  attitudeErrorDeg: number;
  fuelPct: number;
}

export interface DepartureScenarioConfig {
  id: number;
  code: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  brief: LocalizedText;
  objective: LocalizedText;
  passCriteria: LocalizedText;
  hint: LocalizedText;
  scienceTerm: {
    term: LocalizedText;
    explanation: LocalizedText;
  };
  maxTimeS: number;
  initialState: {
    position: Vec3;
    velocity: Vec3;
    attitudeDeg: Vec3;
    angularVelDeg: Vec3;
    latchesReleased: boolean;
    noseconeClosed: boolean;
  };
}
