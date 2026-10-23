import { clamp } from '../engine';
import type {
  LandingCommand,
  LandingSample,
  LandingScenarioConfig,
  LandingState
} from './types';

export const LANDING_DT = 1 / 60;
export const BLACKOUT_TOP_M = 80000;
export const BLACKOUT_BOTTOM_M = 38000;

export function emptyLandingCommand(): LandingCommand {
  return {
    attitudeInput: 0,
    liftTrimInput: 0,
    triggerAction: false,
    jettisonHeatshield: false,
    sasEnabled: false
  };
}

export function createLandingState(scenario: LandingScenarioConfig): LandingState {
  const init = scenario.initialState;
  const inBlackout = init.altitudeM >= BLACKOUT_BOTTOM_M && init.altitudeM <= BLACKOUT_TOP_M;
  const initTemp = inBlackout ? 1680 : init.altitudeM > 15000 ? 420 : 65;
  const initG = inBlackout ? 3.4 : 1.0;
  return {
    time: 0,
    status: 'ready',
    altitudeM: init.altitudeM,
    lateralOffsetM: 0,
    lateralSpeedMs: 0,
    speedMs: init.speedMs,
    descentRateMs: init.descentRateMs,
    attitudeDeviationDeg: init.attitudeDeviationDeg,
    angularVelDeg: 0,
    liftTrim: 0.2,
    gLoad: initG,
    maxGRecorded: initG,
    heatshieldTempC: initTemp,
    heatshieldIntegrityPct: 100,
    inBlackout,
    chuteState: init.chuteState,
    chuteProgress: init.chuteState === 'stowed' ? 0 : 1,
    heatshieldJettisoned: init.heatshieldJettisoned,
    heatshieldSepElapsedS: init.heatshieldJettisoned ? 10 : -1,
    retroFired: false,
    retroBurnLeftS: 0
  };
}

export function sampleLanding(state: LandingState): LandingSample {
  return {
    time: Number(state.time.toFixed(2)),
    altitudeKm: Number((state.altitudeM / 1000).toFixed(3)),
    speedMs: Number(state.speedMs.toFixed(1)),
    gLoad: Number(state.gLoad.toFixed(2)),
    tempC: Math.round(state.heatshieldTempC)
  };
}

export function stepLanding(
  state: LandingState,
  cmd: LandingCommand,
  scenario: LandingScenarioConfig,
  dt = LANDING_DT
): LandingState {
  if (state.status !== 'flying') return state;

  const next: LandingState = { ...state };
  next.time += dt;

  // 1. 处理防热大底抛离指令 (Key J / 1)
  if (cmd.jettisonHeatshield && !next.heatshieldJettisoned && next.altitudeM < 8500) {
    next.heatshieldJettisoned = true;
    next.heatshieldSepElapsedS = 0;
  }
  if (next.heatshieldJettisoned && next.heatshieldSepElapsedS >= 0) {
    next.heatshieldSepElapsedS += dt;
  }

  // 2. 处理 Space 动作触发：开减速引导伞 -> 开主伞 -> 点燃离地 1.5m 反推火箭
  if (cmd.triggerAction) {
    if (next.chuteState === 'stowed') {
      if (next.speedMs > 235 || next.altitudeM > 14500) {
        next.status = 'failed';
        next.failReason = 'chute_shred';
        return next;
      }
      next.chuteState = 'drogue';
      next.chuteProgress = 0.05;
    } else if (next.chuteState === 'drogue') {
      if (next.speedMs > 105) {
        next.status = 'failed';
        next.failReason = 'chute_shred';
        return next;
      }
      next.chuteState = 'main';
      next.chuteProgress = 0.05;
    } else if (next.chuteState === 'main' && !next.retroFired && next.altitudeM < 35) {
      if (next.altitudeM > 4.2) {
        next.status = 'failed';
        next.failReason = 'retro_early';
        return next;
      }
      if (next.heatshieldJettisoned) {
        next.retroFired = true;
        next.retroBurnLeftS = 0.35;
      }
    }
  }

  if (next.chuteState !== 'stowed' && next.chuteProgress < 1) {
    next.chuteProgress = Math.min(1, next.chuteProgress + dt * 0.65);
  }

  // 3. 姿态与升力配平动力学
  const liftInput = clamp(cmd.liftTrimInput, -1, 1);
  next.liftTrim = clamp(next.liftTrim + liftInput * 0.85 * dt, -1, 1);

  // 高空乱流扰动 vs 玩家姿态控制 / SAS 阻尼
  const turbAmplitude = next.altitudeM > 20000 ? 3.2 : next.altitudeM > 1000 ? 1.1 : 0.4;
  const turbTorque =
    Math.sin(next.time * 1.55 + scenario.id) * turbAmplitude +
    Math.cos(next.time * 2.4) * (turbAmplitude * 0.45);

  let controlTorque = clamp(cmd.attitudeInput, -1, 1) * 14.0;
  if (cmd.sasEnabled && Math.abs(cmd.attitudeInput) < 0.05) {
    controlTorque = clamp(
      -next.attitudeDeviationDeg * 3.8 - next.angularVelDeg * 2.2 - turbTorque * 0.85,
      -14,
      14
    );
  }

  next.angularVelDeg += (turbTorque + controlTorque - next.angularVelDeg * 1.65) * dt;
  next.attitudeDeviationDeg += next.angularVelDeg * dt;

  // 草原低空横风与侧偏控制
  if (next.altitudeM < 500) {
    const windAccel = 0.35 * Math.sin(next.time * 0.7);
    const steerAccel = clamp(cmd.attitudeInput, -1, 1) * 1.6;
    next.lateralSpeedMs += (windAccel + steerAccel - next.lateralSpeedMs * 1.2) * dt;
    next.lateralOffsetM += next.lateralSpeedMs * dt;
  }

  // 4. 分阶段气动减速、加热与降落伞/反推力学
  next.inBlackout =
    next.altitudeM >= BLACKOUT_BOTTOM_M && next.altitudeM <= BLACKOUT_TOP_M;

  if (next.altitudeM > 15000) {
    // 高超声速再入气动减速段
    const decelRate = 95 + (1 - next.liftTrim * 0.28) * 32;
    next.speedMs = Math.max(245, next.speedMs - decelRate * dt);

    // 垂直下降率受升力配平调制
    const targetDescent = Math.max(185, 920 - next.liftTrim * 160);
    next.descentRateMs += (targetDescent - next.descentRateMs) * 1.5 * dt;
    next.altitudeM = Math.max(0, next.altitudeM - next.descentRateMs * dt);

    // 过载 G 值计算：配平升力越高，G 值越温和
    const baseG = 3.1 + (next.speedMs / 5500) * 1.6 - next.liftTrim * 1.8;
    const attPenaltyG = Math.max(0, Math.abs(next.attitudeDeviationDeg) - 3.0) * 0.12;
    next.gLoad = Math.max(1.0, baseG + attPenaltyG);
    next.maxGRecorded = Math.max(next.maxGRecorded, next.gLoad);

    // 防热大底表面温度与烧蚀完整度
    const targetTemp = next.inBlackout
      ? 1450 + (next.speedMs / 5200) * 620 + Math.abs(next.attitudeDeviationDeg) * 35
      : 380;
    next.heatshieldTempC += (targetTemp - next.heatshieldTempC) * 2.0 * dt;

    if (Math.abs(next.attitudeDeviationDeg) > 6.0) {
      const damageRate = (Math.abs(next.attitudeDeviationDeg) - 6.0) * 8.5;
      next.heatshieldIntegrityPct = Math.max(
        0,
        next.heatshieldIntegrityPct - damageRate * dt
      );
    }

    if (next.heatshieldIntegrityPct <= 0 || Math.abs(next.attitudeDeviationDeg) > 13.5) {
      next.status = 'failed';
      next.failReason = 'heatshield_burnthrough';
      return next;
    }
    if (next.gLoad > 8.5) {
      next.status = 'failed';
      next.failReason = 'excessive_g_load';
      return next;
    }

    // 第 4 关在冲出 36km 黑障区后平滑过渡至 11.8km 亚音速开伞空域，保持紧凑流畅的课堂体验
    if (scenario.id === 4 && next.altitudeM <= 35800 && next.altitudeM > 12500) {
      next.altitudeM = 11800;
      next.speedMs = 232;
      next.descentRateMs = 175;
      next.heatshieldTempC = 140;
      next.gLoad = 1.4;
    }
  } else if (next.altitudeM > 120) {
    // 15 km ~ 120 m：对流层开伞减速段
    next.heatshieldTempC = Math.max(35, next.heatshieldTempC - 60 * dt);

    if (next.chuteState === 'stowed') {
      // 大气自然阻力减速至 ~205 m/s
      const targetSpd = 198;
      next.speedMs += (targetSpd - next.speedMs) * 0.45 * dt;
      next.descentRateMs = next.speedMs * 0.72;
      next.gLoad = 1.35;

      if (next.altitudeM < 3200) {
        next.status = 'failed';
        next.failReason = 'chute_too_late';
        return next;
      }
    } else if (next.chuteState === 'drogue') {
      // 减速引导伞将速度刹向 ~76 m/s
      const targetSpd = 74;
      next.speedMs += (targetSpd - next.speedMs) * 0.85 * dt;
      next.descentRateMs = next.speedMs * 0.88;
      next.gLoad = 2.4 * (1 - next.chuteProgress * 0.5);

      if (next.altitudeM < 1800) {
        next.status = 'failed';
        next.failReason = 'chute_too_late';
        return next;
      }
    } else if (next.chuteState === 'main') {
      // 1200 平方米巨型红白主伞将速度稳降至 ~7.6 m/s
      const targetSpd = 7.6;
      next.speedMs += (targetSpd - next.speedMs) * 1.4 * dt;
      next.descentRateMs = next.speedMs;
      next.gLoad = 1.0 + Math.max(0, (next.speedMs - 7.6) * 0.04);

      // 第 4 关在主伞稳降达成 (speed <= 8.2 m/s) 后，平滑切入 52m 草原近地着陆段
      if (scenario.id === 4 && next.speedMs <= 8.2 && next.altitudeM > 180) {
        next.altitudeM = 52;
        next.speedMs = 7.6;
        next.descentRateMs = 7.6;
      }
    }

    next.altitudeM = Math.max(0, next.altitudeM - next.descentRateMs * dt);
  } else {
    // 120 m ~ 0 m：东风着陆场草原近地决胜段
    next.heatshieldTempC = 32;
    if (next.chuteState !== 'main') {
      next.status = 'failed';
      next.failReason = 'chute_too_late';
      return next;
    }

    if (next.retroFired && next.retroBurnLeftS > 0) {
      const burnDt = Math.min(dt, next.retroBurnLeftS);
      next.retroBurnLeftS = Math.max(0, next.retroBurnLeftS - dt);
      // 4 台固体反推火箭在 0.35s 内把 7.6 m/s 下落速度刹至 ~1.35 m/s
      next.descentRateMs = Math.max(1.25, next.descentRateMs - 18.5 * burnDt);
      next.speedMs = Math.hypot(next.descentRateMs, next.lateralSpeedMs);
      next.gLoad = 2.8;
    } else {
      // 若过早点燃反推且燃料已烧完但还未触地，重力会使返回舱重新加速下坠
      if (next.retroFired && next.retroBurnLeftS <= 0 && next.altitudeM > 0.35) {
        next.descentRateMs = Math.min(7.6, next.descentRateMs + 4.5 * dt);
      }
      next.speedMs = Math.hypot(next.descentRateMs, next.lateralSpeedMs);
      next.gLoad = 1.0;
    }

    next.altitudeM = Math.max(0, next.altitudeM - next.descentRateMs * dt);
  }

  // 5. 各关卡成功与触地判定
  if (scenario.id === 1) {
    if (
      next.altitudeM <= 36000 &&
      next.heatshieldIntegrityPct >= 70 &&
      Math.abs(next.attitudeDeviationDeg) <= 6.0
    ) {
      next.status = 'success';
      return next;
    }
  } else if (scenario.id === 2) {
    if (
      next.chuteState === 'main' &&
      next.chuteProgress >= 0.95 &&
      next.descentRateMs <= 8.5 &&
      next.altitudeM >= 2500
    ) {
      next.status = 'success';
      return next;
    }
  } else if (scenario.id === 3 || scenario.id === 4) {
    if (next.altitudeM <= 0) {
      next.touchdownSpeedMs = Number(next.descentRateMs.toFixed(2));
      if (
        next.heatshieldJettisoned &&
        next.retroFired &&
        next.descentRateMs <= 2.4
      ) {
        next.status = 'success';
      } else {
        next.status = 'failed';
        next.failReason = 'hard_impact';
      }
      return next;
    }
  }

  if (next.time >= scenario.maxTimeS) {
    next.status = 'failed';
    next.failReason = 'timeout';
  }

  return next;
}

/**
 * 确定性返回着陆自动驾驶仪 (Autopilot for Demo & Headless Verification)
 */
export function landingAutopilot(state: LandingState): LandingCommand {
  const cmd = emptyLandingCommand();
  cmd.sasEnabled = true;

  // 1. 姿态配平与防风修正
  if (state.altitudeM < 500) {
    cmd.attitudeInput = clamp(
      -state.lateralOffsetM * 0.45 - state.lateralSpeedMs * 0.95,
      -1,
      1
    );
  } else {
    cmd.attitudeInput = clamp(
      -state.attitudeDeviationDeg * 0.55 - state.angularVelDeg * 0.35,
      -1,
      1
    );
  }

  // 2. 高空升力配平把 G 值压低在舒适区
  if (state.altitudeM > 15000) {
    cmd.liftTrimInput = state.liftTrim < 0.65 ? 1 : 0;
  }

  // 3. 10km 引导伞 -> 6km 主伞 -> 抛防热大底 -> 离地 1.8m 反推火箭点火
  if (
    state.chuteState === 'stowed' &&
    state.altitudeM <= 11500 &&
    state.speedMs <= 222
  ) {
    cmd.triggerAction = true;
  } else if (
    state.chuteState === 'drogue' &&
    state.chuteProgress >= 0.8 &&
    state.speedMs <= 92
  ) {
    cmd.triggerAction = true;
  } else if (state.chuteState === 'main') {
    if (!state.heatshieldJettisoned && state.altitudeM <= 4500) {
      cmd.jettisonHeatshield = true;
    }
    if (
      state.heatshieldJettisoned &&
      !state.retroFired &&
      state.altitudeM <= 1.85 &&
      state.altitudeM >= 1.1
    ) {
      cmd.triggerAction = true;
    }
  }

  return cmd;
}
