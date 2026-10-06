// 地球与空间站轨道的真实尺寸（单位：米）。3D 场景和讲解图都从这里取数，保证比例一致。
export const EARTH_RADIUS_M = 6_371_000; // 地球平均半径
export const ISS_ALTITUDE_M = 420_000; // 空间站典型飞行高度（实际约 370–460 km 间变化）
export const HARMONY_LENGTH_M = 7.2; // 和谐号节点舱长度（NASA）
export const HARMONY_DIAMETER_M = 4.4; // 和谐号节点舱直径（NASA）

/** 从空间站往下看，地平线比水平方向低多少度。 */
export const horizonDipDeg = (r = EARTH_RADIUS_M, h = ISS_ALTITUDE_M) => Math.acos(r / (r + h)) * 180 / Math.PI;
/** 从空间站到地平线的直线距离（米）。 */
export const horizonDistanceM = (r = EARTH_RADIUS_M, h = ISS_ALTITUDE_M) => Math.sqrt((r + h) ** 2 - r ** 2);
/** 把地球缩成半径为 radius 的球时，空间站离球面多高（同单位）。 */
export const scaledAltitude = (radius: number) => radius * ISS_ALTITUDE_M / EARTH_RADIUS_M;
