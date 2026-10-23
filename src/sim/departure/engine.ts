import { clamp } from '../engine';
import type { Vec3 } from '../types';
import type {
  DepartureCommand,
  DepartureSample,
  DepartureScenarioConfig,
  DepartureState
} from './types';

export const DEPARTURE_DT = 1 / 60;
export const KEEP_OUT_ZONE_M = 5.0;
export const SPRING_PUSHOFF_VZ = 0.28; // m/s 机械弹簧推离速度
export const TRANS_ACCEL = 0.26; // m/s^2 RCS 平移加速度
export const ROT_ACCEL_DEG = 6.0; // deg/s^2 RCS 旋转角加速度

/**
 * 计算距离空间站对接口 z 米处的安全撤离走廊半径 (Conical Departure Corridor Radius)
 */
export function computeCorridorRadius(z: number): number {
  return 0.55 + Math.max(0, z) * 0.12;
}

export function emptyDepartureCommand(): DepartureCommand {
  return {
    translation: [0, 0, 0],
    rotation: [0, 0, 0],
    releaseLatches: false,
    toggleNosecone: false,
    assistBrake: false
  };
}

export function createDepartureState(scenario: DepartureScenarioConfig): DepartureState {
  const init = scenario.initialState;
  const latOffset = Math.hypot(init.position[0], init.position[1]);
  const latSpeed = Math.hypot(init.velocity[0], init.velocity[1]);
  const attErr = Math.hypot(init.attitudeDeg[0], init.attitudeDeg[1], init.attitudeDeg[2]);
  return {
    time: 0,
    status: 'ready',
    position: [...init.position],
    velocity: [...init.velocity],
    attitudeDeg: [...init.attitudeDeg],
    angularVelDeg: [...init.angularVelDeg],
    latchesReleased: init.latchesReleased,
    noseconeClosed: init.noseconeClosed,
    noseconeProgress: init.noseconeClosed ? 1 : 0,
    fuelPct: 100,
    corridorRadiusM: computeCorridorRadius(init.position[2]),
    lateralOffsetM: latOffset,
    lateralSpeedMs: latSpeed,
    attitudeErrorDeg: attErr,
    inKeepOutZone: init.position[2] < KEEP_OUT_ZONE_M,
    holdTimerS: 0,
    activeThrust: [0, 0, 0],
    activeTorque: [0, 0, 0]
  };
}

export function sampleDeparture(state: DepartureState): DepartureSample {
  return {
    time: Number(state.time.toFixed(2)),
    distanceM: Number(state.position[2].toFixed(2)),
    backSpeedMs: Number(state.velocity[2].toFixed(3)),
    lateralOffsetM: Number(state.lateralOffsetM.toFixed(3)),
    attitudeErrorDeg: Number(state.attitudeErrorDeg.toFixed(2)),
    fuelPct: Number(state.fuelPct.toFixed(1))
  };
}

/**
 * 单步 60Hz 太空站撤离物理积分与安全判据
 */
export function stepDeparture(
  state: DepartureState,
  cmd: DepartureCommand,
  scenario: DepartureScenarioConfig,
  dt = DEPARTURE_DT
): DepartureState {
  if (state.status !== 'flying') return state;

  const next: DepartureState = {
    ...state,
    position: [...state.position],
    velocity: [...state.velocity],
    attitudeDeg: [...state.attitudeDeg],
    angularVelDeg: [...state.angularVelDeg],
    activeThrust: [0, 0, 0],
    activeTorque: [0, 0, 0]
  };

  next.time += dt;

  // 1. 头锥保护罩切换与平滑伺服动画 (~1.5s)
  if (cmd.toggleNosecone) {
    next.noseconeClosed = !next.noseconeClosed;
  }
  const targetNosecone = next.noseconeClosed ? 1 : 0;
  if (next.noseconeProgress < targetNosecone) {
    next.noseconeProgress = Math.min(1, next.noseconeProgress + dt * 0.75);
  } else if (next.noseconeProgress > targetNosecone) {
    next.noseconeProgress = Math.max(0, next.noseconeProgress - dt * 0.75);
  }

  // 2. 尚未解锁机械锁钩时：飞船固定在对接口上，但若强行点火前后主推进器同样触发羽流污染
  if (!next.latchesReleased) {
    if (Math.abs(cmd.translation[2]) > 0.1) {
      next.status = 'failed';
      next.failReason = 'plume_contamination';
      return next;
    }
    if (cmd.releaseLatches) {
      next.latchesReleased = true;
      next.velocity[2] = SPRING_PUSHOFF_VZ;
      // 第 4 关模拟真实弹簧轻微偏心扰动，考验玩家综合纠偏能力
      if (scenario.id === 4) {
        next.velocity[0] = 0.035;
        next.velocity[1] = -0.025;
        next.angularVelDeg[0] = 0.25;
        next.angularVelDeg[1] = -0.2;
      }
    } else {
      if (next.time >= scenario.maxTimeS) {
        next.status = 'failed';
        next.failReason = 'timeout';
      }
      return next;
    }
  }

  // 3. 羽流禁火区检测 (0 ~ 5.0m 内禁止点燃前后轴向主推力器)
  const inKeepOut = next.position[2] < KEEP_OUT_ZONE_M;
  next.inKeepOutZone = inKeepOut;
  if (inKeepOut && Math.abs(cmd.translation[2]) > 0.1) {
    next.activeThrust[2] = cmd.translation[2];
    next.status = 'failed';
    next.failReason = 'plume_contamination';
    return next;
  }

  // 4. 计算平移与旋转控制指令 (支持 B 键辅助阻尼稳定)
  const txInput: Vec3 = [
    clamp(cmd.translation[0], -1, 1),
    clamp(cmd.translation[1], -1, 1),
    clamp(cmd.translation[2], -1, 1)
  ];
  const rotInput: Vec3 = [
    clamp(cmd.rotation[0], -1, 1),
    clamp(cmd.rotation[1], -1, 1),
    clamp(cmd.rotation[2], -1, 1)
  ];

  if (cmd.assistBrake) {
    // 辅助消除横向漂移与旋转角速度（不触发禁火区轴向喷火）
    if (Math.abs(txInput[0]) < 0.05 && Math.abs(next.velocity[0]) > 0.005) {
      txInput[0] = clamp(-next.velocity[0] * 6, -1, 1);
    }
    if (Math.abs(txInput[1]) < 0.05 && Math.abs(next.velocity[1]) > 0.005) {
      txInput[1] = clamp(-next.velocity[1] * 6, -1, 1);
    }
    if (!inKeepOut && Math.abs(txInput[2]) < 0.05 && Math.abs(next.velocity[2]) > 0.005) {
      txInput[2] = clamp(-next.velocity[2] * 4, -1, 1);
    }
    for (let i = 0; i < 3; i++) {
      if (Math.abs(rotInput[i]) < 0.05) {
        const rateTerm = -next.angularVelDeg[i] * 0.9;
        const angleTerm = -next.attitudeDeg[i] * 0.35;
        rotInput[i] = clamp(rateTerm + angleTerm, -1, 1);
      }
    }
  }

  const hasFuel = next.fuelPct > 0.01;
  const effTx: Vec3 = hasFuel ? txInput : [0, 0, 0];
  const effRot: Vec3 = hasFuel ? rotInput : [0, 0, 0];

  next.activeThrust = effTx;
  next.activeTorque = effRot;

  // 推进剂消耗
  const thrustEffort =
    Math.abs(effTx[0]) +
    Math.abs(effTx[1]) +
    Math.abs(effTx[2]) +
    0.35 * (Math.abs(effRot[0]) + Math.abs(effRot[1]) + Math.abs(effRot[2]));
  next.fuelPct = Math.max(0, next.fuelPct - thrustEffort * 0.65 * dt);

  // 5. 半隐式欧拉积分更新速度与位置
  for (let i = 0; i < 3; i++) {
    next.velocity[i] += effTx[i] * TRANS_ACCEL * dt;
    next.position[i] += next.velocity[i] * dt;

    next.angularVelDeg[i] += effRot[i] * ROT_ACCEL_DEG * dt;
    next.attitudeDeg[i] += next.angularVelDeg[i] * dt;
  }

  // 6. 更新走廊与几何指标
  next.inKeepOutZone = next.position[2] < KEEP_OUT_ZONE_M;
  next.corridorRadiusM = computeCorridorRadius(next.position[2]);
  next.lateralOffsetM = Math.hypot(next.position[0], next.position[1]);
  next.lateralSpeedMs = Math.hypot(next.velocity[0], next.velocity[1]);
  next.attitudeErrorDeg = Math.hypot(
    next.attitudeDeg[0],
    next.attitudeDeg[1],
    next.attitudeDeg[2]
  );
  const angRate = Math.hypot(
    next.angularVelDeg[0],
    next.angularVelDeg[1],
    next.angularVelDeg[2]
  );

  // 7. 失败安全边界判定
  if (next.position[2] < 0.22) {
    next.status = 'failed';
    next.failReason = 'station_collision';
    return next;
  }
  if (next.lateralOffsetM > next.corridorRadiusM) {
    next.status = 'failed';
    next.failReason = 'corridor_breach';
    return next;
  }
  if (next.attitudeErrorDeg > 25) {
    next.status = 'failed';
    next.failReason = 'attitude_lost';
    return next;
  }
  if (Math.hypot(next.velocity[0], next.velocity[1], next.velocity[2]) > 1.8) {
    next.status = 'failed';
    next.failReason = 'overspeed';
    return next;
  }

  // 8. 各关卡成功判据检测
  const z = next.position[2];
  const vz = next.velocity[2];

  if (scenario.id === 1) {
    // 第 1 关：在 11.0 ~ 14.0m 检视环处将速度刹停至 |vz| <= 0.06 m/s 并保持 1.5s
    const inZone = z >= 11.0 && z <= 14.0 && Math.abs(vz) <= 0.06 && next.lateralOffsetM <= 0.4;
    next.holdTimerS = inZone ? next.holdTimerS + dt : 0;
    if (next.holdTimerS >= 1.5) {
      next.status = 'success';
      return next;
    }
  } else if (scenario.id === 2) {
    // 第 2 关：消除横漂并退至 z >= 18m
    const ok =
      z >= 18.0 &&
      next.lateralOffsetM <= 0.25 &&
      next.lateralSpeedMs <= 0.04 &&
      vz >= 0.05 &&
      vz <= 0.8;
    next.holdTimerS = ok ? next.holdTimerS + dt : 0;
    if (next.holdTimerS >= 0.5) {
      next.status = 'success';
      return next;
    }
  } else if (scenario.id === 3) {
    // 第 3 关：修正姿态误差 <= 2.0°、角速度 <= 0.4°/s 并退至 z >= 24m
    const ok =
      z >= 24.0 &&
      next.attitudeErrorDeg <= 2.0 &&
      angRate <= 0.4 &&
      next.lateralOffsetM <= 0.45;
    next.holdTimerS = ok ? next.holdTimerS + dt : 0;
    if (next.holdTimerS >= 0.5) {
      next.status = 'success';
      return next;
    }
  } else if (scenario.id === 4) {
    // 第 4 关：完整撤离至 z >= 32m，关闭头锥保护罩 (noseconeClosed && progress >= 0.95)，姿态与偏移达标
    const ok =
      z >= 32.0 &&
      next.noseconeClosed &&
      next.noseconeProgress >= 0.95 &&
      next.attitudeErrorDeg <= 2.5 &&
      next.lateralOffsetM <= 0.6 &&
      vz >= 0.05 &&
      vz <= 1.2;
    next.holdTimerS = ok ? next.holdTimerS + dt : 0;
    if (next.holdTimerS >= 0.4) {
      next.status = 'success';
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
 * 确定性撤离自动驾驶仪 (Autopilot for Demo & Headless Verification)
 */
export function departureAutopilot(
  state: DepartureState,
  scenario: DepartureScenarioConfig
): DepartureCommand {
  const cmd = emptyDepartureCommand();

  if (!state.latchesReleased) {
    cmd.releaseLatches = true;
    return cmd;
  }

  // 1. 横向位置与速度 PD 控制
  const kx = 1.6;
  const kvx = 5.2;
  cmd.translation[0] = clamp(-state.position[0] * kx - state.velocity[0] * kvx, -1, 1);
  cmd.translation[1] = clamp(-state.position[1] * kx - state.velocity[1] * kvx, -1, 1);

  // 2. 三轴姿态 PD 控制
  for (let i = 0; i < 3; i++) {
    cmd.rotation[i] = clamp(
      -state.attitudeDeg[i] * 0.45 - state.angularVelDeg[i] * 0.95,
      -1,
      1
    );
  }

  // 3. 轴向推力控制（严格遵守 0~5m 羽流禁火区！）
  const z = state.position[2];
  const vz = state.velocity[2];

  if (z < KEEP_OUT_ZONE_M + 0.15) {
    cmd.translation[2] = 0;
  } else if (scenario.id === 1) {
    const targetZ = 12.2;
    const distErr = targetZ - z;
    const desiredVz = clamp(distErr * 0.28, -0.35, 0.45);
    cmd.translation[2] = clamp((desiredVz - vz) * 5.0, -1, 1);
  } else if (scenario.id === 2) {
    const desiredVz = 0.42;
    cmd.translation[2] = clamp((desiredVz - vz) * 3.5, -1, 1);
  } else if (scenario.id === 3) {
    const desiredVz = 0.48;
    cmd.translation[2] = clamp((desiredVz - vz) * 3.5, -1, 1);
  } else {
    // 第 4 关：过 5m 后加速后退，过 30m 后自动闭合头锥保护罩
    const desiredVz = z < 31 ? 0.68 : 0.35;
    cmd.translation[2] = clamp((desiredVz - vz) * 3.5, -1, 1);
    if (z >= 30.5 && !state.noseconeClosed) {
      cmd.toggleNosecone = true;
    }
  }

  return cmd;
}
