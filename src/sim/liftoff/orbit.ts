import type { OrbitalElements, Vec2 } from './types';

/** 地球平均半径 R_earth (m) —— NASA WGS-84 平均球体半径 */
export const EARTH_RADIUS_M = 6371000;

/** 地球标准引力常数 mu = G * M_earth (m³/s²) */
export const EARTH_MU = 3.986004418e14;

/** 海平面标准重力加速度 g0 (m/s²) */
export const STANDARD_GRAVITY_MS2 = 9.80665;

/** 地球恒星日自转角速度 Omega_earth (rad/s) */
export const EARTH_OMEGA_RAD_S = 7.2921159e-5;

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

/**
 * 计算发射场纬度对应的地球自转东向线速度增益 (m/s)
 * 例如：肯尼迪航天中心 (28.6°N) 约为 408.5 m/s，酒泉 (40.96°N) 约为 351.2 m/s
 */
export function earthRotationSpeedAtLatitude(latitudeDeg: number): number {
  return EARTH_OMEGA_RAD_S * EARTH_RADIUS_M * Math.cos(latitudeDeg * DEG_TO_RAD);
}

/**
 * 计算当前位置 [x, y] 的当地天顶径向单位矢量 u_r 与正东水平切向单位矢量 u_theta
 * 发射台初始在 [0, R_earth]：
 * - u_r = [0, 1]（垂直向上）
 * - u_theta = [1, 0]（水平向东）
 */
export function localHorizonBasis(position: Vec2): {
  r: number;
  up: Vec2;
  east: Vec2;
} {
  const r = Math.hypot(position[0], position[1]) || EARTH_RADIUS_M;
  const up: Vec2 = [position[0] / r, position[1] / r];
  const east: Vec2 = [up[1], -up[0]];
  return { r, up, east };
}

/**
 * 计算高度 r 处的地球引力加速度矢量 [gx, gy] (m/s²)
 */
export function gravityVector(position: Vec2): Vec2 {
  const r = Math.hypot(position[0], position[1]);
  if (r <= 1) return [0, -STANDARD_GRAVITY_MS2];
  const gMag = EARTH_MU / (r * r);
  return [(-position[0] / r) * gMag, (-position[1] / r) * gMag];
}

/**
 * 计算跟随地球自转的大气层当地切向速度矢量 [vx_atm, vy_atm] (m/s)
 */
export function atmosphereVelocityAtPosition(position: Vec2, launchLatitudeDeg: number): Vec2 {
  const { r, east } = localHorizonBasis(position);
  const vRot = EARTH_OMEGA_RAD_S * r * Math.cos(launchLatitudeDeg * DEG_TO_RAD);
  return [east[0] * vRot, east[1] * vRot];
}

/**
 * 根据地心惯性系位置 [x, y] 与惯性速度 [vx, vy]，实时解算开普勒轨道根数与拱点遥测
 */
export function computeOrbitalElements(
  position: Vec2,
  inertialVelocity: Vec2,
  launchLatitudeDeg = 28.608
): OrbitalElements {
  const { r, up, east } = localHorizonBasis(position);
  const altitudeM = r - EARTH_RADIUS_M;

  // 沿地球表面向东飞行的下程地面弧长 Downrange (m)
  const centralAngleRad = Math.atan2(position[0], position[1]);
  const downrangeM = EARTH_RADIUS_M * centralAngleRad;

  // 大气随地球自转速度与相对地表速度矢量
  const vAtm = atmosphereVelocityAtPosition(position, launchLatitudeDeg);
  const vSurf: Vec2 = [inertialVelocity[0] - vAtm[0], inertialVelocity[1] - vAtm[1]];

  const orbitalSpeedMs = Math.hypot(inertialVelocity[0], inertialVelocity[1]);
  const surfaceSpeedMs = Math.hypot(vSurf[0], vSurf[1]);

  // 径向垂直速度与水平东向速度
  const verticalSpeedMs = vSurf[0] * up[0] + vSurf[1] * up[1];
  const horizontalSpeedSurfMs = vSurf[0] * east[0] + vSurf[1] * east[1];
  const horizontalSpeedInertMs = inertialVelocity[0] * east[0] + inertialVelocity[1] * east[1];
  const verticalSpeedInertMs = inertialVelocity[0] * up[0] + inertialVelocity[1] * up[1];

  // 飞行路径角 (Prograde Pitch Angle)：速度极低 (< 0.5 m/s) 时默认为垂直 90°
  const surfaceProgradeDeg =
    surfaceSpeedMs > 0.5
      ? Math.atan2(verticalSpeedMs, Math.max(1e-6, horizontalSpeedSurfMs)) * RAD_TO_DEG
      : 90;

  const orbitalProgradeDeg =
    orbitalSpeedMs > 0.5
      ? Math.atan2(verticalSpeedInertMs, Math.max(1e-6, horizontalSpeedInertMs)) * RAD_TO_DEG
      : 90;

  // 当前高度对应的第一宇宙速度（圆轨道速度 v_c = sqrt(mu / r)）
  const circularVelocityMs = Math.sqrt(EARTH_MU / r);

  // 比机械能 epsilon = v^2 / 2 - mu / r
  const vSq = orbitalSpeedMs * orbitalSpeedMs;
  const specificEnergy = 0.5 * vSq - EARTH_MU / r;

  // 偏心率矢量 e_vec = ((v^2 - mu/r) * r_vec - (r_vec . v_vec) * v_vec) / mu
  const rDotV = position[0] * inertialVelocity[0] + position[1] * inertialVelocity[1];
  const coeffR = vSq - EARTH_MU / r;
  const ex = (coeffR * position[0] - rDotV * inertialVelocity[0]) / EARTH_MU;
  const ey = (coeffR * position[1] - rDotV * inertialVelocity[1]) / EARTH_MU;
  const eccentricity = Math.hypot(ex, ey);

  let apoapsisM: number;
  let periapsisM: number;
  let timeToApoapsisS = 0;

  if (specificEnergy < -1e-3) {
    // 椭圆轨道或亚轨道弹道 (a > 0)
    const semiMajorAxis = -EARTH_MU / (2 * specificEnergy);
    const rAp = semiMajorAxis * (1 + eccentricity);
    const rPe = semiMajorAxis * (1 - eccentricity);

    apoapsisM = Math.max(altitudeM, rAp - EARTH_RADIUS_M);
    periapsisM = rPe - EARTH_RADIUS_M;

    if (eccentricity > 1e-5) {
      const meanMotion = Math.sqrt(EARTH_MU / Math.pow(semiMajorAxis, 3));
      const cosE = Math.max(-1, Math.min(1, (1 - r / semiMajorAxis) / eccentricity));
      const sinE = Math.max(
        -1,
        Math.min(1, rDotV / (eccentricity * Math.sqrt(EARTH_MU * semiMajorAxis)))
      );
      const E = Math.atan2(sinE, cosE);
      const M = E - eccentricity * Math.sin(E);
      // 远地点位于平近点角 M = pi
      const deltaM = Math.PI - M;
      timeToApoapsisS = Math.max(0, deltaM / meanMotion);
    }
  } else {
    // 双曲线或抛物线逃逸轨道 (epsilon >= 0)
    const hMag = Math.abs(position[0] * inertialVelocity[1] - position[1] * inertialVelocity[0]);
    const rPe = (hMag * hMag) / (EARTH_MU * (1 + eccentricity));
    apoapsisM = 999999000;
    periapsisM = rPe - EARTH_RADIUS_M;
    timeToApoapsisS = 0;
  }

  // 稳定近地停泊轨道判据：近地点 >= 150 km 且远地点 >= 170 km（完全脱离大气阻力区）
  const isOrbitStable = periapsisM >= 150000 && apoapsisM >= 170000;

  return {
    altitudeM,
    downrangeM,
    apoapsisM,
    periapsisM,
    eccentricity,
    specificEnergy,
    timeToApoapsisS,
    circularVelocityMs,
    orbitalSpeedMs,
    surfaceSpeedMs,
    verticalSpeedMs,
    horizontalSpeedMs: horizontalSpeedInertMs,
    surfaceProgradeDeg,
    orbitalProgradeDeg,
    isOrbitStable
  };
}
