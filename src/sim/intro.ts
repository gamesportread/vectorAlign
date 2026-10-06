// 新手讲解里的“一条直线”小练习：只保留前后一个方向，物理规则与正式关卡相同。
import { ACCELERATION, clamp, DT } from './engine';

export const TRACK = {
  start: 13, // 起点：离对接口 13 米
  speed: -0.65, // 初速度：每秒向空间站靠近 0.65 米（与第一关相同）
  target: 8, // 黄圈位置：8 米
  tolerance: 0.35, // 黄圈前后各 0.35 米都算“在圈里”
  speedTolerance: 0.06, // 速度小于 0.06 米/秒 才算“停住”
  hold: 1.5, // 需要稳稳停住 1.5 秒
  contact: 0.35, // 飞船碰到空间站的位置
  far: 17 // 飘出画面
} as const;

export type TrackStatus = 'flying' | 'success' | 'crash' | 'lost';
export interface TrackState { x: number; v: number; hold: number; time: number; thrust: number; status: TrackStatus }
/** 自动驾驶方式：manual=玩家操作，coast=完全不刹车，auto=示范刹车 */
export type TrackPilot = 'manual' | 'coast' | 'auto';

export const createTrack = (): TrackState => ({ x: TRACK.start, v: TRACK.speed, hold: 0, time: 0, thrust: 0, status: 'flying' });

export const inRing = (s: TrackState) => Math.abs(s.x - TRACK.target) <= TRACK.tolerance;
export const isStopped = (s: TrackState) => Math.abs(s.v) <= TRACK.speedTolerance;

/** 示范驾驶员：和正式关卡“观看示范”用同一套刹车规则。 */
export function autoThrust(s: TrackState) {
  const desired = clamp((TRACK.target - s.x) * 0.14, -0.65, 0.65);
  return clamp((desired - s.v) * 1.8 / ACCELERATION);
}

/** thrust：-1 = 向空间站喷气加速（R 键），+1 = 反向喷气刹车（F 键），0 = 松开。 */
export function trackStep(s: TrackState, thrust: number, dt = DT): TrackState {
  if (s.status !== 'flying') return s;
  const t = clamp(thrust);
  const v = s.v + t * ACCELERATION * dt;
  const x = s.x + v * dt;
  const next: TrackState = { x, v, hold: s.hold, time: s.time + dt, thrust: t, status: 'flying' };
  if (x <= TRACK.contact) return { ...next, x: TRACK.contact, status: 'crash' };
  if (x >= TRACK.far) return { ...next, status: 'lost' };
  next.hold = inRing(next) && isStopped(next) ? s.hold + dt : 0;
  if (next.hold >= TRACK.hold) next.status = 'success';
  return next;
}

export function pilotThrust(pilot: TrackPilot, s: TrackState, manual: number) {
  return pilot === 'manual' ? manual : pilot === 'auto' ? autoThrust(s) : 0;
}

/** 无界面自测接口：按固定步长跑完一段时间。 */
export function runTrack(pilot: TrackPilot, seconds: number, manual: (s: TrackState) => number = () => 0) {
  let s = createTrack();
  for (let i = 0; i < Math.round(seconds / DT) && s.status === 'flying'; i++) s = trackStep(s, pilotThrust(pilot, s, manual(s)));
  return s;
}
