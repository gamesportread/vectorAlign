import type { Localized as LocalizedText } from '../types';

export type LandingStatus = 'ready' | 'flying' | 'success' | 'failed';

export type ChuteState = 'stowed' | 'drogue' | 'main';

export type LandingFailReason =
  | 'heatshield_burnthrough' // 黑障区姿态偏角过大，侧面薄舱壁被 2000℃ 等离子流烧穿
  | 'excessive_g_load' // 再入迎角失控导致过载突破安全上限 (> 8.5G)
  | 'chute_shred' // 开伞速度过快，高速气流撕裂降落伞
  | 'chute_too_late' // 低于安全高度仍未开伞导致高速坠地
  | 'retro_early' // 离地过高 (> 4.5m) 提前点燃反推火箭，耗尽后从空中重摔
  | 'hard_impact' // 未开反推或触地速度过大 (> 3.2 m/s) 硬着陆受损
  | 'timeout';

export interface LandingCommand {
  /** 姿态配平/侧向防风控制输入 [-1, 1] (A/D 或 ←/→) */
  attitudeInput: number;
  /** 升力配平倾侧调节 [-1, 1] (W/S 或 ↑/↓，用于压低再入过载 G 值) */
  liftTrimInput: number;
  /** 单次触发：按阶段打开减速伞 -> 主降落伞 -> 离地 1.5m 反推火箭点火 (Space) */
  triggerAction: boolean;
  /** 单次触发：抛离烧蚀后的防热大底露出底部反推火箭与缓冲气囊 (Key J / Key 1) */
  jettisonHeatshield: boolean;
  /** 自动配平稳姿辅助 (Key T / SAS) */
  sasEnabled: boolean;
}

export interface LandingState {
  time: number;
  status: LandingStatus;
  failReason?: LandingFailReason;
  /** 海拔高度 (m)，0 为东风着陆场草原地面 */
  altitudeM: number;
  /** 水平靶心横向偏移 (m) */
  lateralOffsetM: number;
  /** 水平横向速度 (m/s) */
  lateralSpeedMs: number;
  /** 总合速度 (m/s) */
  speedMs: number;
  /** 垂直下降速率 (m/s，正值表示向下落向地面) */
  descentRateMs: number;
  /** 返回舱相对迎风流线的姿态偏差角 (°)，0° 表示防热大底正对气流 */
  attitudeDeviationDeg: number;
  /** 姿态角速度 (°/s) */
  angularVelDeg: number;
  /** 升力配平系数 [-1, 1] */
  liftTrim: number;
  /** 当前承受过载 (G) */
  gLoad: number;
  /** 全程记录峰值过载 (G) */
  maxGRecorded: number;
  /** 防热大底表面温度 (°C) */
  heatshieldTempC: number;
  /** 防热大底结构完整度 (%) */
  heatshieldIntegrityPct: number;
  /** 是否处于 38km~80km 等离子无线电黑障区 */
  inBlackout: boolean;
  /** 降落伞状态：未开伞 (stowed) -> 减速引导伞 (drogue) -> 1200㎡红白主伞 (main) */
  chuteState: ChuteState;
  /** 降落伞充气展开动画进度 (0 ~ 1) */
  chuteProgress: number;
  /** 是否已抛离烧焦的防热大底（露出反推固体火箭） */
  heatshieldJettisoned: boolean;
  /** 大底抛离下落经过秒数 (用于 3D 分离动画) */
  heatshieldSepElapsedS: number;
  /** 着陆反推固体火箭是否已触发点火 */
  retroFired: boolean;
  /** 反推火箭剩余燃烧时间 (s) */
  retroBurnLeftS: number;
  /** 最终触地瞬间的下降速度 (m/s) */
  touchdownSpeedMs?: number;
}

export interface LandingSample {
  time: number;
  altitudeKm: number;
  speedMs: number;
  gLoad: number;
  tempC: number;
}

export interface LandingScenarioConfig {
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
    altitudeM: number;
    speedMs: number;
    descentRateMs: number;
    attitudeDeviationDeg: number;
    chuteState: ChuteState;
    heatshieldJettisoned: boolean;
  };
}
