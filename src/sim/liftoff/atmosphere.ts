import type { AtmosphereSample } from './types';

/** 海平面标准大气压 (Pa) */
export const SEA_LEVEL_PRESSURE_PA = 101325;

/** 海平面标准空气密度 (kg/m³) */
export const SEA_LEVEL_DENSITY_KG_M3 = 1.225;

/** 卡门线（大气层与太空国际公认分界线，100 km） */
export const KARMAN_LINE_ALTITUDE_M = 100000;

/** 气动效应彻底归零的外大气层边界 (140 km) */
export const ATMOSPHERE_CUTOFF_ALTITUDE_M = 140000;

/**
 * 基于 NASA 地球大气模型 (Earth Atmosphere Model / US Standard Atmosphere 1976) 的分层大气采样器
 * 计算指定海拔高度 h (m) 处的温度、压强、密度与当地音速
 */
export function sampleAtmosphere(altitudeM: number): AtmosphereSample {
  const h = Math.max(0, altitudeM);

  if (h >= ATMOSPHERE_CUTOFF_ALTITUDE_M) {
    return {
      altitudeM: h,
      pressurePa: 0,
      pressureRatio: 0,
      densityKgM3: 0,
      temperatureK: 186.8,
      speedOfSoundMs: 274.0
    };
  }

  let temperatureK: number;
  let pressurePa: number;

  if (h <= 11000) {
    // 对流层 Troposphere (0 ~ 11 km)：温度随高度线性下降 (-6.5 K/km)
    temperatureK = 288.15 - 0.0065 * h;
    pressurePa = SEA_LEVEL_PRESSURE_PA * Math.pow(temperatureK / 288.15, 5.25588);
  } else if (h <= 25000) {
    // 同温平流层下层 Lower Stratosphere (11 ~ 25 km)：温度恒定约 216.65 K (-56.5°C)
    temperatureK = 216.65;
    pressurePa = 22632.1 * Math.exp(-0.00015769 * (h - 11000));
  } else if (h <= 47000) {
    // 平流层上层 Upper Stratosphere (25 ~ 47 km)：臭氧吸收紫外线，温度回升
    temperatureK = 216.65 + 0.0028 * (h - 25000);
    pressurePa = 2488.6 * Math.pow(temperatureK / 216.65, -12.2011);
  } else {
    // 中间层与热层过渡段 Mesosphere & Lower Thermosphere (47 ~ 140 km)
    temperatureK = Math.max(186.8, 278.25 - 0.002 * (h - 47000));
    const p47 = 110.91;
    pressurePa = p47 * Math.exp(-(h - 47000) / 6850);
  }

  // 在 100 km ~ 140 km 之间平滑衰减至真空 0
  if (h > KARMAN_LINE_ALTITUDE_M) {
    const fade = 1 - (h - KARMAN_LINE_ALTITUDE_M) / (ATMOSPHERE_CUTOFF_ALTITUDE_M - KARMAN_LINE_ALTITUDE_M);
    pressurePa *= fade * fade;
  }

  // 理想气体状态方程 rho = P / (R_specific * T)，干空气比气体常数 R = 287.053 J/(kg·K)
  const densityKgM3 = pressurePa / (287.053 * temperatureK);

  // 当地音速 a = sqrt(gamma * R * T)，双原子气体绝热指数 gamma = 1.4
  const speedOfSoundMs = Math.sqrt(1.4 * 287.053 * temperatureK);

  return {
    altitudeM: h,
    pressurePa,
    pressureRatio: Math.min(1, Math.max(0, pressurePa / SEA_LEVEL_PRESSURE_PA)),
    densityKgM3,
    temperatureK,
    speedOfSoundMs
  };
}

/**
 * 计算跨音速激波阻力系数 C_d(Mach, AoA)
 * - 借鉴 KSP 与 NASA 运载火箭气动风洞曲线：
 *   1. 亚音速 (Mach < 0.8): 基础压差与摩擦阻力 C_d0 ≈ 0.24
 *   2. 跨音速音障区 (0.8 <= Mach <= 1.3): 激波形成导致波阻陡增 (Wave Drag Bump)，峰值约 0.56
 *   3. 超音速与高超音速 (Mach > 1.3): 随马赫数按 Prandtl-Glauert 规律渐近回落至 0.28
 *   4. 攻角诱导阻力: 侧滑/俯仰偏离气流方向时，横截面迎风投影使阻力按 sin²(alpha) 倍增
 */
export function computeDragCoefficient(mach: number, aoaDeg: number): number {
  const m = Math.max(0, mach);
  let cdZeroAoA: number;

  if (m < 0.8) {
    cdZeroAoA = 0.24 + 0.04 * (m / 0.8) ** 2;
  } else if (m <= 1.15) {
    // 音障激波峰值
    const t = (m - 0.8) / 0.35;
    cdZeroAoA = 0.28 + 0.28 * Math.sin(t * (Math.PI / 2));
  } else {
    // 超音速波阻衰减
    cdZeroAoA = 0.27 + 0.29 / Math.pow(1 + 0.65 * (m - 1.15), 0.85);
  }

  const aoaRad = (Math.abs(aoaDeg) * Math.PI) / 180;
  const inducedCd = 2.4 * Math.sin(aoaRad) * Math.sin(aoaRad);

  return cdZeroAoA + inducedCd;
}

/**
 * 计算空气动压 Dynamic Pressure q = 0.5 * rho * v_surf^2 (Pa)
 */
export function computeDynamicPressure(densityKgM3: number, surfaceSpeedMs: number): number {
  return 0.5 * densityKgM3 * surfaceSpeedMs * surfaceSpeedMs;
}
