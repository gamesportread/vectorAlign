import {
  computeDragCoefficient,
  computeDynamicPressure,
  KARMAN_LINE_ALTITUDE_M,
  sampleAtmosphere
} from './atmosphere';
import {
  atmosphereVelocityAtPosition,
  computeOrbitalElements,
  EARTH_RADIUS_M,
  gravityVector,
  localHorizonBasis,
  STANDARD_GRAVITY_MS2
} from './orbit';
import type {
  AscentPhase,
  LiftoffCommand,
  LiftoffFailure,
  LiftoffSample,
  LiftoffScenarioConfig,
  LiftoffState,
  RocketVehicleConfig,
  StageRuntimeState,
  Vec2
} from './types';
import { getRocketVehicle } from './vehicles';

/** 固定物理步长 60 Hz (s) */
export const LIFTOFF_DT = 1 / 60;

/** 发射塔架安全净空高度 (m) */
export const LAUNCH_TOWER_HEIGHT_M = 150;

const DEG_TO_RAD = Math.PI / 180;

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function emptyLiftoffCommand(
  throttle = 0,
  sasMode: LiftoffCommand['sasMode'] = 'hold'
): LiftoffCommand {
  return {
    throttle,
    pitchInput: 0,
    sasMode,
    triggerStage: false,
    jettisonTower: false
  };
}

/**
 * 计算当前未分离各级 + 逃逸塔 + 有效载荷的瞬时总质量 (kg)
 */
export function computeTotalMassKg(
  stages: StageRuntimeState[],
  activeStageIndex: number,
  vehicle: RocketVehicleConfig,
  towerJettisoned: boolean
): number {
  let mass = vehicle.payloadMassKg;
  if (!towerJettisoned) {
    mass += vehicle.launchEscapeTowerMassKg;
  }
  for (let i = activeStageIndex; i < stages.length; i++) {
    const st = stages[i];
    if (!st.separated) {
      mass += st.dryMassKg + st.fuelMassKg;
    }
  }
  return mass;
}

/**
 * 根据海拔高度、阶段和入轨状态判定当前所处升空阶段 (AscentPhase)
 */
export function determineAscentPhase(
  altitudeM: number,
  clampsReleased: boolean,
  activeStageIndex: number,
  isOrbitStable: boolean
): AscentPhase {
  if (!clampsReleased) return 'prelaunch';
  if (isOrbitStable) return 'orbit_achieved';
  if (altitudeM < LAUNCH_TOWER_HEIGHT_M) return 'tower_clear';
  if (altitudeM < 3000) return 'pitch_over';
  if (altitudeM < 42000 && activeStageIndex === 0) return 'gravity_turn';
  if (activeStageIndex === 0) return 'upper_atmosphere';
  if (altitudeM < 155000 && activeStageIndex === 1) return 'stage2_ascent';
  return 'orbital_insertion';
}

/**
 * 根据 NASA 标准重力转向剖面计算指定高度处的理想推荐俯仰角 (度)
 */
export function computeReferencePitchDeg(altitudeM: number, apoapsisM: number, verticalSpeedMs: number): number {
  if (altitudeM < LAUNCH_TOWER_HEIGHT_M) {
    return 90;
  }
  if (altitudeM < 2500) {
    // 150m ~ 2.5km: 平滑初始程序俯仰 (Pitch-Over) 90° -> 78°
    const t = (altitudeM - LAUNCH_TOWER_HEIGHT_M) / (2500 - LAUNCH_TOWER_HEIGHT_M);
    return 90 - 12 * t;
  }
  if (altitudeM < 65000) {
    // 2.5km ~ 65km: 大气层内重力转向曲线 78° -> 26°
    const norm = (altitudeM - 2500) / (65000 - 2500);
    return 78 - 52 * Math.pow(norm, 0.72);
  }
  // 65km 以上高空与入轨阶段：能量-垂直速度平方根闭环引导 (PEG Kinematic Law)
  const targetAlt = 184000;
  const altErr = targetAlt - altitudeM;
  const desiredVertSpeed =
    altErr >= 0
      ? Math.sqrt(2 * 3.8 * altErr)
      : -Math.sqrt(2 * 1.5 * Math.abs(altErr));
  const vertSpeedErr = desiredVertSpeed - verticalSpeedMs;
  const basePitch = altitudeM < 135000 && apoapsisM < 178000 ? 20 : 2;
  return clamp(basePitch + vertSpeedErr * 0.14, 0, 38);
}

/**
 * 根据关卡配置初始化火箭升空物理状态
 */
export function createLiftoffState(
  scenario: LiftoffScenarioConfig,
  vehicleOverride?: RocketVehicleConfig
): LiftoffState {
  const vehicle = vehicleOverride ?? getRocketVehicle(scenario.vehicleId);
  const init = scenario.initialState;

  const stages: StageRuntimeState[] = vehicle.stages.map((st, idx) => {
    const frac = clamp(init.stageFuelFractions[idx] ?? 1, 0, 1);
    const separated = idx < init.activeStageIndex;
    return {
      stageNumber: st.stageNumber,
      code: st.code,
      dryMassKg: st.dryMassKg,
      fuelMassKg: separated ? 0 : st.fuelMassKg * frac,
      maxFuelMassKg: st.fuelMassKg,
      separated
    };
  });

  // 根据初始海拔与下程弧距计算地心惯性系位置 [x, y]
  const r = EARTH_RADIUS_M + init.altitudeM;
  const centralAngleRad = init.downrangeM / EARTH_RADIUS_M;
  const position: Vec2 = [r * Math.sin(centralAngleRad), r * Math.cos(centralAngleRad)];

  // 将相对地表垂直/水平速度叠加当地地球自转线速度，得到地心惯性速度矢量
  const { up, east } = localHorizonBasis(position);
  const vAtm = atmosphereVelocityAtPosition(position, vehicle.launchLatitudeDeg);
  const velocity: Vec2 = [
    vAtm[0] + up[0] * init.verticalSpeedMs + east[0] * init.horizontalSpeedMs,
    vAtm[1] + up[1] * init.verticalSpeedMs + east[1] * init.horizontalSpeedMs
  ];

  const totalMassKg = computeTotalMassKg(stages, init.activeStageIndex, vehicle, init.towerJettisoned);
  const atm = sampleAtmosphere(init.altitudeM);
  const orbit = computeOrbitalElements(position, velocity, vehicle.launchLatitudeDeg);

  const activeStageCfg = vehicle.stages[init.activeStageIndex] ?? vehicle.stages[0];
  const activeStageRuntime = stages[init.activeStageIndex] ?? stages[0];
  const hasFuel = activeStageRuntime.fuelMassKg > 0.1;
  const effThrottle = hasFuel ? clamp(init.throttle, 0, 1) : 0;

  const thrustN =
    effThrottle > 0
      ? effThrottle *
        (activeStageCfg.thrustVacuumN -
          (activeStageCfg.thrustVacuumN - activeStageCfg.thrustSeaLevelN) * atm.pressureRatio)
      : 0;

  const effectiveIspS =
    activeStageCfg.ispVacuumS -
    (activeStageCfg.ispVacuumS - activeStageCfg.ispSeaLevelS) * atm.pressureRatio;

  const localG = Math.hypot(...gravityVector(position));
  const twr = totalMassKg > 0 ? thrustN / (totalMassKg * localG) : 0;
  const dynamicPressurePa = computeDynamicPressure(atm.densityKgM3, orbit.surfaceSpeedMs);
  const mach = atm.speedOfSoundMs > 0 ? orbit.surfaceSpeedMs / atm.speedOfSoundMs : 0;
  const aoaDeg = orbit.surfaceSpeedMs > 5 ? init.pitchDeg - orbit.surfaceProgradeDeg : 0;
  const cd = computeDragCoefficient(mach, aoaDeg);
  const dragForceN = dynamicPressurePa * activeStageCfg.referenceAreaM2 * cd;
  const qAlphaKpaDeg = (dynamicPressurePa / 1000) * Math.abs(aoaDeg);

  const gLoad =
    !init.clampsReleased && twr <= 1
      ? 1.0
      : Math.max(0, (thrustN + dragForceN) / (totalMassKg * STANDARD_GRAVITY_MS2));

  return {
    time: init.initialTimeS,
    status: 'ready',
    phase: determineAscentPhase(
      init.altitudeM,
      init.clampsReleased,
      init.activeStageIndex,
      orbit.isOrbitStable
    ),
    position,
    velocity,
    pitchDeg: init.pitchDeg,
    pitchRateDegS: 0,
    activeStageIndex: init.activeStageIndex,
    stages,
    clampsReleased: init.clampsReleased,
    towerJettisoned: init.towerJettisoned,
    throttle: effThrottle,
    sasMode: init.sasMode,
    totalMassKg,
    thrustN,
    effectiveIspS,
    twr,
    gLoad,
    dynamicPressurePa,
    maxQRecordedPa: dynamicPressurePa,
    passedMaxQ: init.altitudeM > 18000,
    mach,
    aoaDeg,
    qAlphaKpaDeg,
    dragForceN,
    orbit,
    stagingCoastTimerS: 0,
    holdTimerS: 0,
    consequence: 'none',
    maxAltitudeM: init.altitudeM
  };
}

/**
 * 执行级间分离或发射台解锁逻辑
 */
export function stageRocket(
  state: LiftoffState,
  vehicle: RocketVehicleConfig
): { nextState: LiftoffState; failure?: LiftoffFailure } {
  const next: LiftoffState = structuredClone(state);

  // 情况 1：尚在发射台未释放牵制臂 -> 释放牵制臂升空
  if (!next.clampsReleased) {
    next.clampsReleased = true;
    // 若释放牵制臂时推重比不足 (< 1.0)，火箭无法克服自身重力，判定坠回发射台
    if (next.twr < 1.0) {
      return { nextState: next, failure: 'pad_fallback' };
    }
    return { nextState: next };
  }

  // 情况 2：已在空中飞行 -> 执行级间分离 (Staging)
  const currentIdx = next.activeStageIndex;
  if (currentIdx >= next.stages.length - 1) {
    // 已经是最后一级，不再分离
    return { nextState: next };
  }

  const currentStage = next.stages[currentIdx];
  const remainingFuelFrac =
    currentStage.maxFuelMassKg > 0 ? currentStage.fuelMassKg / currentStage.maxFuelMassKg : 0;

  // 若当前级还有超过 5% 燃料且发动机处于高推力状态，强行带火分离将导致下部级追尾撞毁上级
  if (remainingFuelFrac > 0.05 && next.throttle > 0.1) {
    return { nextState: next, failure: 'premature_staging' };
  }

  // 抛离当前级，激活下一级
  currentStage.separated = true;
  currentStage.fuelMassKg = 0;
  next.activeStageIndex = currentIdx + 1;
  next.stagingCoastTimerS = 0;

  // 重新计算抛掉空壳死重后的全箭质量
  next.totalMassKg = computeTotalMassKg(
    next.stages,
    next.activeStageIndex,
    vehicle,
    next.towerJettisoned
  );

  return { nextState: next };
}

/**
 * 飞行失败后的灾难动力学推演引擎：
 * 模拟火箭在空中解体爆炸散落、推力熄灭失速下坠砸向发射台或坠入大洋、太空中失去动力永久漂浮
 */
export function stepLiftoffFailedAftermath(
  state: LiftoffState,
  vehicle: RocketVehicleConfig,
  dt: number
): LiftoffState {
  const s: LiftoffState = structuredClone(state);
  s.time += dt;

  // 熄火并失去动力
  s.throttle = 0;
  s.thrustN = 0;
  s.twr = 0;

  const { r } = localHorizonBasis(s.position);
  const altitudeM = Math.max(0, r - EARTH_RADIUS_M);
  s.maxAltitudeM = Math.max(s.maxAltitudeM ?? 0, altitudeM);

  const consequence = s.consequence ?? 'falling';

  // 1. 若已经撞击发射台或坠入海面，保持静态残骸着陆状态
  if (consequence === 'crashed_pad' || consequence === 'crashed_ocean') {
    s.position = [
      (s.position[0] / Math.hypot(...s.position)) * EARTH_RADIUS_M,
      (s.position[1] / Math.hypot(...s.position)) * EARTH_RADIUS_M
    ];
    s.velocity = [0, 0];
    s.gLoad = 1.0;
    s.orbit = computeOrbitalElements(s.position, s.velocity, vehicle.launchLatitudeDeg);
    return s;
  }

  const atm = sampleAtmosphere(altitudeM);
  const gVec = gravityVector(s.position);

  // 2. 太空冷寂漂浮 (drifting_space)
  if (consequence === 'drifting_space') {
    const vAtm = atmosphereVelocityAtPosition(s.position, vehicle.launchLatitudeDeg);
    const vSurf: Vec2 = [s.velocity[0] - vAtm[0], s.velocity[1] - vAtm[1]];
    const surfSpeed = Math.hypot(vSurf[0], vSurf[1]);
    const dynP = computeDynamicPressure(atm.densityKgM3, surfSpeed);
    const activeStageCfg = vehicle.stages[s.activeStageIndex] ?? vehicle.stages[0];
    const dragForceN = dynP * activeStageCfg.referenceAreaM2 * 1.2;
    const dragDir: Vec2 = surfSpeed > 1e-3 ? [-vSurf[0] / surfSpeed, -vSurf[1] / surfSpeed] : [0, 0];

    const ax = (dragDir[0] * dragForceN) / s.totalMassKg + gVec[0];
    const ay = (dragDir[1] * dragForceN) / s.totalMassKg + gVec[1];

    s.velocity = [s.velocity[0] + ax * dt, s.velocity[1] + ay * dt];
    s.position = [s.position[0] + s.velocity[0] * dt, s.position[1] + s.velocity[1] * dt];
    s.pitchDeg = (s.pitchDeg + 3.2 * dt) % 360;
    s.pitchRateDegS = 3.2;

    s.orbit = computeOrbitalElements(s.position, s.velocity, vehicle.launchLatitudeDeg);
    if (s.orbit.altitudeM < 65000 && s.orbit.verticalSpeedMs < -15) {
      s.consequence = 'falling';
    }
    return s;
  }

  // 3. 空中解体碎片 (exploding) 或 熄火重力急坠 (falling)
  s.pitchRateDegS += (Math.sin(s.time * 2.8) * 14 - s.pitchRateDegS * 0.15) * dt;
  s.pitchDeg = (s.pitchDeg + s.pitchRateDegS * dt) % 360;

  const vAtm = atmosphereVelocityAtPosition(s.position, vehicle.launchLatitudeDeg);
  const vSurf: Vec2 = [s.velocity[0] - vAtm[0], s.velocity[1] - vAtm[1]];
  const surfSpeed = Math.hypot(vSurf[0], vSurf[1]);
  const dynP = computeDynamicPressure(atm.densityKgM3, surfSpeed);
  const cd = consequence === 'exploding' ? 1.4 : 1.05;
  const activeStageCfg = vehicle.stages[s.activeStageIndex] ?? vehicle.stages[0];
  const dragForceN = dynP * activeStageCfg.referenceAreaM2 * cd;
  const dragDir: Vec2 = surfSpeed > 1e-3 ? [-vSurf[0] / surfSpeed, -vSurf[1] / surfSpeed] : [0, 0];

  const ax = (dragDir[0] * dragForceN) / s.totalMassKg + gVec[0];
  const ay = (dragDir[1] * dragForceN) / s.totalMassKg + gVec[1];

  s.velocity = [s.velocity[0] + ax * dt, s.velocity[1] + ay * dt];
  s.position = [s.position[0] + s.velocity[0] * dt, s.position[1] + s.velocity[1] * dt];
  s.orbit = computeOrbitalElements(s.position, s.velocity, vehicle.launchLatitudeDeg);

  // 地表或海面撞击检测
  if (s.orbit.altitudeM <= 0) {
    s.position = [
      (s.position[0] / Math.hypot(...s.position)) * EARTH_RADIUS_M,
      (s.position[1] / Math.hypot(...s.position)) * EARTH_RADIUS_M
    ];
    s.velocity = [0, 0];
    s.gLoad = 1.0;
    if (s.maxAltitudeM < 160 || s.orbit.downrangeM < 1200) {
      s.consequence = 'crashed_pad';
    } else {
      s.consequence = 'crashed_ocean';
    }
  }

  return s;
}

/**
 * 单步定步长 (1/60s) 火箭升空物理积分器
 */
export function stepLiftoff(
  state: LiftoffState,
  command: LiftoffCommand,
  scenario: LiftoffScenarioConfig,
  dt = LIFTOFF_DT,
  vehicleOverride?: RocketVehicleConfig
): LiftoffState {
  const vehicle = vehicleOverride ?? getRocketVehicle(scenario.vehicleId);

  // 失败后继续推演后续物理灾难后果（解体、坠毁、太空漂浮）
  if (state.status === 'failed') {
    return stepLiftoffFailedAftermath(state, vehicle, dt);
  }

  if (state.status !== 'flying') {
    return state;
  }

  let s: LiftoffState = structuredClone(state);
  s.time += dt;

  // 1. 同步节流阀油门与 SAS 模式
  s.throttle = clamp(command.throttle, 0, 1);
  s.sasMode = command.sasMode;

  // 2. 处理逃逸塔 (LES) 抛离指令
  if (command.jettisonTower && !s.towerJettisoned && s.clampsReleased) {
    s.towerJettisoned = true;
  }

  // 3. 计算当前环境大气与重力学参数
  const { r, up, east } = localHorizonBasis(s.position);
  const altitudeM = Math.max(0, r - EARTH_RADIUS_M);
  s.maxAltitudeM = Math.max(s.maxAltitudeM ?? 0, altitudeM);
  const atm = sampleAtmosphere(altitudeM);
  const gVec = gravityVector(s.position);
  const localGMag = Math.hypot(gVec[0], gVec[1]);

  // 4. 先计算当前级推力与推重比（供发射台解锁检查使用）
  let activeStageCfg = vehicle.stages[s.activeStageIndex] ?? vehicle.stages[vehicle.stages.length - 1];
  let activeStage = s.stages[s.activeStageIndex];
  s.totalMassKg = computeTotalMassKg(s.stages, s.activeStageIndex, vehicle, s.towerJettisoned);

  const computeStageThrust = (stageCfg: typeof activeStageCfg, stageState: StageRuntimeState, thr: number) => {
    if (stageState.fuelMassKg <= 0.01 || thr <= 0.001) {
      return { thrustN: 0, ispS: stageCfg.ispVacuumS, mDotKgS: 0 };
    }
    const clampedThr = clamp(thr, stageCfg.minThrottle * 0.5, 1);
    const ispS =
      stageCfg.ispVacuumS - (stageCfg.ispVacuumS - stageCfg.ispSeaLevelS) * atm.pressureRatio;
    const maxThrustAtAlt =
      stageCfg.thrustVacuumN -
      (stageCfg.thrustVacuumN - stageCfg.thrustSeaLevelN) * atm.pressureRatio;
    const thrustN = clampedThr * maxThrustAtAlt;
    const mDotKgS =
      (clampedThr * stageCfg.thrustVacuumN) / (stageCfg.ispVacuumS * STANDARD_GRAVITY_MS2);
    return { thrustN, ispS, mDotKgS };
  };

  let prop = computeStageThrust(activeStageCfg, activeStage, s.throttle);
  s.thrustN = prop.thrustN;
  s.effectiveIspS = prop.ispS;
  s.twr = s.totalMassKg > 0 ? s.thrustN / (s.totalMassKg * localGMag) : 0;

  // 5. 处理空格键级间分离或发射台释放指令
  if (command.triggerStage) {
    const staged = stageRocket(s, vehicle);
    s = staged.nextState;
    if (staged.failure) {
      s.status = 'failed';
      s.reason = staged.failure;
      s.failureTime = s.time;
      s.consequence = staged.failure === 'pad_fallback' ? 'crashed_pad' : 'exploding';
      return s;
    }
    activeStageCfg = vehicle.stages[s.activeStageIndex] ?? vehicle.stages[vehicle.stages.length - 1];
    activeStage = s.stages[s.activeStageIndex];
    prop = computeStageThrust(activeStageCfg, activeStage, s.throttle);
    s.thrustN = prop.thrustN;
    s.effectiveIspS = prop.ispS;
    s.twr = s.totalMassKg > 0 ? s.thrustN / (s.totalMassKg * localGMag) : 0;
  }

  // 6. 若牵制臂尚未释放，火箭固定在发射台上，仅消耗极少量点火建立燃料
  if (!s.clampsReleased) {
    if (prop.mDotKgS > 0) {
      activeStage.fuelMassKg = Math.max(0, activeStage.fuelMassKg - prop.mDotKgS * dt * 0.15);
      s.totalMassKg = computeTotalMassKg(s.stages, s.activeStageIndex, vehicle, s.towerJettisoned);
      s.twr = s.totalMassKg > 0 ? s.thrustN / (s.totalMassKg * localGMag) : 0;
    }
    s.gLoad = 1.0;
    if (s.time >= scenario.targets.maxTimeS) {
      s.status = 'failed';
      s.reason = 'timeout';
      s.failureTime = s.time;
      s.consequence = 'crashed_pad';
    }
    return s;
  }

  // 7. 变质量推进剂消耗积分 (Variable-Mass Depletion)
  let effectiveDtThrust = dt;
  if (activeStage.fuelMassKg > 0 && prop.mDotKgS > 0) {
    const fuelBurned = prop.mDotKgS * dt;
    if (fuelBurned >= activeStage.fuelMassKg) {
      effectiveDtThrust = activeStage.fuelMassKg / prop.mDotKgS;
      activeStage.fuelMassKg = 0;
    } else {
      activeStage.fuelMassKg -= fuelBurned;
    }
  } else {
    s.thrustN = 0;
    s.twr = 0;
  }

  // 第一级熄火后未分离计时
  if (s.activeStageIndex === 0 && activeStage.fuelMassKg <= 0.01) {
    s.stagingCoastTimerS += dt;
    if (s.stagingCoastTimerS > 28) {
      s.status = 'failed';
      s.reason = 'late_staging';
      s.failureTime = s.time;
      s.consequence = 'falling';
      return s;
    }
  } else {
    s.stagingCoastTimerS = 0;
  }

  s.totalMassKg = computeTotalMassKg(s.stages, s.activeStageIndex, vehicle, s.towerJettisoned);

  // 8. 姿态俯仰角动力学 (Pitch Attitude & Gimbal / SAS Control)
  const maxTurnRateDegS = 9.5; // 巨型运载火箭矢量喷管允许的最大安全俯仰角速度
  if (Math.abs(command.pitchInput) > 0.01) {
    // 玩家手动按键输入优先
    const targetRate = clamp(command.pitchInput, -1, 1) * maxTurnRateDegS;
    s.pitchRateDegS += (targetRate - s.pitchRateDegS) * Math.min(1, dt * 6);
  } else if (s.sasMode === 'prograde') {
    const targetAngle =
      altitudeM < 70000 ? s.orbit.surfaceProgradeDeg : s.orbit.orbitalProgradeDeg;
    const clampedTarget = altitudeM < LAUNCH_TOWER_HEIGHT_M ? 90 : clamp(targetAngle, -5, 90);
    const err = clampedTarget - s.pitchDeg;
    s.pitchRateDegS = clamp(err * 1.8, -maxTurnRateDegS * 0.65, maxTurnRateDegS * 0.65);
  } else if (s.sasMode === 'pitch_program') {
    const refPitch = computeReferencePitchDeg(
      altitudeM,
      s.orbit.apoapsisM,
      s.orbit.verticalSpeedMs
    );
    const err = refPitch - s.pitchDeg;
    s.pitchRateDegS = clamp(err * 1.6, -maxTurnRateDegS * 0.6, maxTurnRateDegS * 0.6);
  } else if (s.sasMode === 'hold') {
    const holdTarget = command.targetPitchDeg ?? s.pitchDeg;
    const err = holdTarget - s.pitchDeg;
    s.pitchRateDegS = clamp(err * 2.0, -maxTurnRateDegS * 0.5, maxTurnRateDegS * 0.5);
  } else {
    // 纯手动松键后阻尼衰减
    s.pitchRateDegS *= Math.max(0, 1 - dt * 3.5);
  }

  s.pitchDeg = clamp(s.pitchDeg + s.pitchRateDegS * dt, -15, 95);

  // 9. 计算推力矢量、空气阻力矢量与重力合力
  const pitchRad = s.pitchDeg * DEG_TO_RAD;
  // 机体推力方向单位矢量：sin(pitch) * Up + cos(pitch) * East
  const thrustDir: Vec2 = [
    up[0] * Math.sin(pitchRad) + east[0] * Math.cos(pitchRad),
    up[1] * Math.sin(pitchRad) + east[1] * Math.cos(pitchRad)
  ];

  // 空气相对速度矢量 v_surf
  const vAtm = atmosphereVelocityAtPosition(s.position, vehicle.launchLatitudeDeg);
  const vSurf: Vec2 = [s.velocity[0] - vAtm[0], s.velocity[1] - vAtm[1]];
  const surfSpeed = Math.hypot(vSurf[0], vSurf[1]);

  s.dynamicPressurePa = computeDynamicPressure(atm.densityKgM3, surfSpeed);
  if (s.dynamicPressurePa > s.maxQRecordedPa) {
    s.maxQRecordedPa = s.dynamicPressurePa;
  } else if (
    !s.passedMaxQ &&
    s.maxQRecordedPa > 15000 &&
    altitudeM > 11000 &&
    s.dynamicPressurePa < s.maxQRecordedPa * 0.88
  ) {
    s.passedMaxQ = true;
  }

  s.mach = atm.speedOfSoundMs > 0 ? surfSpeed / atm.speedOfSoundMs : 0;

  // 计算迎角 AoA (仅在速度大于 15 m/s 时具有显著气动意义)
  const surfProgradeDeg =
    surfSpeed > 1
      ? Math.atan2(
          vSurf[0] * up[0] + vSurf[1] * up[1],
          Math.max(1e-6, vSurf[0] * east[0] + vSurf[1] * east[1])
        ) *
        (180 / Math.PI)
      : 90;

  s.aoaDeg = surfSpeed > 15 ? s.pitchDeg - surfProgradeDeg : 0;
  s.qAlphaKpaDeg = (s.dynamicPressurePa / 1000) * Math.abs(s.aoaDeg);

  const cd = computeDragCoefficient(s.mach, s.aoaDeg);
  s.dragForceN = s.dynamicPressurePa * activeStageCfg.referenceAreaM2 * cd;

  const dragDir: Vec2 =
    surfSpeed > 1e-3 ? [-vSurf[0] / surfSpeed, -vSurf[1] / surfSpeed] : [0, 0];

  // 平均有效推力（兼容燃料在本帧中途耗尽的情形）
  const avgThrustN = s.thrustN * (effectiveDtThrust / dt);

  // 非引力视在合力（用于计算宇航员承受的 G 力过载）
  const nonGravForceX = thrustDir[0] * avgThrustN + dragDir[0] * s.dragForceN;
  const nonGravForceY = thrustDir[1] * avgThrustN + dragDir[1] * s.dragForceN;
  s.gLoad = Math.hypot(nonGravForceX, nonGravForceY) / (s.totalMassKg * STANDARD_GRAVITY_MS2);

  // 总加速度 a = F_non_grav / m + g
  const ax = nonGravForceX / s.totalMassKg + gVec[0];
  const ay = nonGravForceY / s.totalMassKg + gVec[1];

  // 半隐式欧拉积分 (Semi-implicit Euler Integration)
  s.velocity = [s.velocity[0] + ax * dt, s.velocity[1] + ay * dt];
  s.position = [s.position[0] + s.velocity[0] * dt, s.position[1] + s.velocity[1] * dt];

  // 10. 更新开普勒轨道根数与阶段状态
  s.orbit = computeOrbitalElements(s.position, s.velocity, vehicle.launchLatitudeDeg);
  s.twr = s.totalMassKg > 0 ? s.thrustN / (s.totalMassKg * localGMag) : 0;
  s.phase = determineAscentPhase(
    s.orbit.altitudeM,
    s.clampsReleased,
    s.activeStageIndex,
    s.orbit.isOrbitStable
  );

  // 11. 物理安全边界与失败判据检测
  // (a) 发射台 / 地表坠落检测
  if (s.orbit.altitudeM <= 0) {
    s.position = [
      (s.position[0] / Math.hypot(...s.position)) * EARTH_RADIUS_M,
      (s.position[1] / Math.hypot(...s.position)) * EARTH_RADIUS_M
    ];
    s.velocity = [0, 0];
    s.status = 'failed';
    s.failureTime = s.time;
    // 依据飞行历史达到的最高高度区分失败根因：
    // 未飞越发射塔高度 (<160m) -> 坠回发射台 (pad_fallback)
    // 稠密中低空失速 (<65km) -> 低空熄火失速 (low_altitude_crash)
    // 达到太空高空后由于水平速度不足坠回 (>=65km) -> 亚轨道重返 (suborbital_reentry)
    if (s.maxAltitudeM < 160) {
      s.reason = 'pad_fallback';
      s.consequence = 'crashed_pad';
    } else if (s.maxAltitudeM < 65000) {
      s.reason = 'low_altitude_crash';
      s.consequence = s.orbit.downrangeM < 1200 ? 'crashed_pad' : 'crashed_ocean';
    } else {
      s.reason = 'suborbital_reentry';
      s.consequence = 'crashed_ocean';
    }
    return s;
  }

  // (b) 发射塔架碰撞检测：在低于 150 米塔架高度时，俯仰角倾斜超过 12° (即 pitch < 78°)
  if (s.orbit.altitudeM > 2 && s.orbit.altitudeM < LAUNCH_TOWER_HEIGHT_M && s.pitchDeg < 78) {
    s.status = 'failed';
    s.reason = 'tower_collision';
    s.failureTime = s.time;
    s.consequence = 'exploding';
    return s;
  }

  // (c) Max-Q 气动弯矩过载解体检测 (Q * |alpha| > maxQAlphaKpaDeg，仅在穿越 Max-Q 高动压区 q > 8 kPa 时有效)
  if (s.dynamicPressurePa > 8000 && s.qAlphaKpaDeg > vehicle.maxQAlphaKpaDeg) {
    s.status = 'failed';
    s.reason = 'aero_stress';
    s.failureTime = s.time;
    s.consequence = 'exploding';
    return s;
  }

  // (d) 过载超限检测
  if (s.gLoad > vehicle.maxGLoad) {
    s.status = 'failed';
    s.reason = 'over_g';
    s.failureTime = s.time;
    s.consequence = 'falling';
    return s;
  }

  // (e) 亚轨道重返大气层失败检测（已飞过 100 km 但因水平速度不足跌回 65 km 以下）
  if (state.orbit.altitudeM >= 65000 && s.orbit.altitudeM < 65000 && s.orbit.verticalSpeedMs < -50) {
    s.status = 'failed';
    s.reason = 'suborbital_reentry';
    s.failureTime = s.time;
    s.consequence = 'falling';
    return s;
  }

  // 12. 关卡胜利条件判定
  if (checkScenarioSuccess(s, scenario)) {
    s.status = 'success';
    s.throttle = 0;
    s.thrustN = 0;
    return s;
  }

  // (f) 全部推进剂耗尽且未达成目标
  const lastStage = s.stages[s.stages.length - 1];
  if (s.activeStageIndex === s.stages.length - 1 && lastStage.fuelMassKg <= 0.01) {
    s.status = 'failed';
    s.reason =
      scenario.targets.requireOrbitStable && s.orbit.apoapsisM >= 150000
        ? 'orbit_eccentric'
        : 'fuel_exhausted';
    s.failureTime = s.time;
    if (s.orbit.altitudeM > 100000 && s.orbit.orbitalSpeedMs > 4000) {
      s.consequence = 'drifting_space';
    } else {
      s.consequence = 'falling';
    }
    return s;
  }

  // (g) 超时判定
  if (s.time - scenario.initialState.initialTimeS >= scenario.targets.maxTimeS) {
    s.status = 'failed';
    s.reason = 'timeout';
    s.failureTime = s.time;
    s.consequence = s.orbit.altitudeM > 100000 ? 'drifting_space' : 'falling';
    return s;
  }

  return s;
}

/**
 * 检查当前飞行状态是否满足指定关卡的通关判据
 */
export function checkScenarioSuccess(
  state: LiftoffState,
  scenario: LiftoffScenarioConfig
): boolean {
  const t = scenario.targets;

  if (t.minAltitudeM !== undefined && state.orbit.altitudeM < t.minAltitudeM) {
    return false;
  }
  if (t.minApoapsisM !== undefined && state.orbit.apoapsisM < t.minApoapsisM) {
    return false;
  }
  if (t.maxApoapsisM !== undefined && state.orbit.apoapsisM > t.maxApoapsisM) {
    return false;
  }
  if (t.minPeriapsisM !== undefined && state.orbit.periapsisM < t.minPeriapsisM) {
    return false;
  }
  if (t.maxEccentricity !== undefined && state.orbit.eccentricity > t.maxEccentricity) {
    return false;
  }
  if (t.targetPitchMinDeg !== undefined && state.pitchDeg < t.targetPitchMinDeg) {
    return false;
  }
  if (t.targetPitchMaxDeg !== undefined && state.pitchDeg > t.targetPitchMaxDeg) {
    return false;
  }
  if (t.requireStageIndex !== undefined && state.activeStageIndex < t.requireStageIndex) {
    return false;
  }
  if (t.requireTowerJettison && !state.towerJettisoned) {
    return false;
  }
  if (t.requireOrbitStable && !state.orbit.isOrbitStable) {
    return false;
  }

  // 第 1 关额外确认速度充足
  if (scenario.id === 1 && state.orbit.surfaceSpeedMs < 200) {
    return false;
  }

  return true;
}

/**
 * 确定性自动驾驶示范控制器 (Autopilot / Demo Controller)
 * 使用与玩家完全相同的物理输入接口，自动完成点火、重力转向、Max-Q 节流、级间分离与圆轨入轨
 */
export function liftoffAutopilot(
  state: LiftoffState,
  scenario: LiftoffScenarioConfig,
  vehicleOverride?: RocketVehicleConfig
): LiftoffCommand {
  const vehicle = vehicleOverride ?? getRocketVehicle(scenario.vehicleId);
  const cmd = emptyLiftoffCommand(1.0, 'pitch_program');

  // 1. 发射台解锁控制：先推满 100% 油门建推（全流程模式下保持 2.6 秒点火喷水建推时序），随后解锁牵制臂
  if (!state.clampsReleased) {
    cmd.throttle = 1.0;
    cmd.sasMode = 'hold';
    cmd.targetPitchDeg = 90;
    const minHoldS = scenario.id === 5 ? 2.6 : 0;
    if (state.twr >= 1.12 && state.time - scenario.initialState.initialTimeS >= minHoldS) {
      cmd.triggerStage = true;
    }
    return cmd;
  }

  // 2. 自动级间分离检测：当当前激活级燃料耗尽 (<= 0.1 kg) 且还有下一级时，立即触发分离
  const activeStage = state.stages[state.activeStageIndex];
  if (
    activeStage &&
    activeStage.fuelMassKg <= 0.1 &&
    state.activeStageIndex < state.stages.length - 1
  ) {
    cmd.triggerStage = true;
    return cmd;
  }

  // 3. 自动抛离逃逸塔 (LES)：当高度超过推荐抛离高度 (92 km) 且尚未抛离时触发
  if (!state.towerJettisoned && state.orbit.altitudeM >= vehicle.towerJettisonAltitudeM) {
    cmd.jettisonTower = true;
  }

  // 4. 节流阀油门管理：
  //    - 在 Max-Q 高动压区 (10 km ~ 16 km 且动压 > 28 kPa) 适度收油门至 82% 降低结构载荷
  //    - 在过载接近 3.9 G 时自动节流模拟土星五号内圈发动机提前关机限过载
  if (
    state.orbit.altitudeM > 9500 &&
    state.orbit.altitudeM < 16500 &&
    state.dynamicPressurePa > 28000
  ) {
    cmd.throttle = 0.82;
  } else if (state.gLoad > 3.85) {
    cmd.throttle = clamp(3.8 / state.gLoad, 0.55, 1.0);
  } else {
    cmd.throttle = 1.0;
  }

  // 5. 各关卡定制姿态引导
  if (scenario.id === 1) {
    cmd.sasMode = 'hold';
    if (state.orbit.altitudeM < LAUNCH_TOWER_HEIGHT_M) {
      cmd.targetPitchDeg = 90;
    } else {
      const progress = clamp((state.orbit.altitudeM - LAUNCH_TOWER_HEIGHT_M) / 6500, 0, 1);
      cmd.targetPitchDeg = 90 - 18 * progress; // 平滑压低至 72°
    }
  } else if (scenario.id === 2) {
    // 第 2 关：严格顺应表面速度矢量 Prograde 零攻角穿过 Max-Q
    cmd.sasMode = 'prograde';
  } else if (scenario.id === 5) {
    // 全流程完整发射 (0m 发射台 -> 185km 圆轨)：能量-垂直速度平方根闭环制导律 (PEG Kinematic Law)
    const alt = state.orbit.altitudeM;
    if (alt < LAUNCH_TOWER_HEIGHT_M) {
      cmd.sasMode = 'hold';
      cmd.targetPitchDeg = 90;
    } else if (alt < 32000) {
      cmd.sasMode = 'pitch_program';
    } else {
      cmd.sasMode = 'hold';
      const targetAlt = 184000;
      const altErr = targetAlt - alt;
      const desiredVertSpeed =
        altErr >= 0
          ? Math.sqrt(2 * 3.8 * altErr)
          : -Math.sqrt(2 * 1.5 * Math.abs(altErr));
      const vertSpeedErr = desiredVertSpeed - state.orbit.verticalSpeedMs;
      const basePitch = alt < 135000 ? 22 : 2;
      cmd.targetPitchDeg = clamp(basePitch + vertSpeedErr * 0.14, -5, 42);
    }
  } else if (scenario.id === 4 || state.orbit.altitudeM > 140000) {
    // 入轨闭环制导 (PEG 简化律)：控制垂直速度收敛于 0，同时把水平速度推至第一宇宙速度
    cmd.sasMode = 'hold';
    const targetAlt = 182000;
    const altErr = targetAlt - state.orbit.altitudeM;
    const desiredVertSpeed = clamp(altErr * 0.015, -40, 220);
    const vertSpeedErr = desiredVertSpeed - state.orbit.verticalSpeedMs;
    cmd.targetPitchDeg = clamp(vertSpeedErr * 0.12, -4, 18);
  } else {
    cmd.sasMode = 'pitch_program';
  }

  return cmd;
}

/**
 * 提取用于遥测曲线和复盘面板的紧凑采样点
 */
export function sampleLiftoff(state: LiftoffState): LiftoffSample {
  const activeStage = state.stages[state.activeStageIndex];
  const stageFuelPct =
    activeStage && activeStage.maxFuelMassKg > 0
      ? (activeStage.fuelMassKg / activeStage.maxFuelMassKg) * 100
      : 0;

  return {
    time: Number(state.time.toFixed(2)),
    altitudeKm: Number((state.orbit.altitudeM / 1000).toFixed(3)),
    downrangeKm: Number((state.orbit.downrangeM / 1000).toFixed(3)),
    apoapsisKm: Number((state.orbit.apoapsisM / 1000).toFixed(3)),
    periapsisKm: Number((state.orbit.periapsisM / 1000).toFixed(3)),
    surfaceSpeedMs: Number(state.orbit.surfaceSpeedMs.toFixed(1)),
    orbitalSpeedMs: Number(state.orbit.orbitalSpeedMs.toFixed(1)),
    pitchDeg: Number(state.pitchDeg.toFixed(2)),
    progradeDeg: Number(state.orbit.surfaceProgradeDeg.toFixed(2)),
    dynamicPressureKpa: Number((state.dynamicPressurePa / 1000).toFixed(2)),
    gLoad: Number(state.gLoad.toFixed(2)),
    twr: Number(state.twr.toFixed(2)),
    mach: Number(state.mach.toFixed(2)),
    stageNumber: state.activeStageIndex + 1,
    stageFuelPct: Number(stageFuelPct.toFixed(1))
  };
}
