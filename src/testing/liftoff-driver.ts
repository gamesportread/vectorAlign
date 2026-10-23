/**
 * 火箭升空任务轻量无头自测驱动器 (Headless Liftoff Test Driver)
 * 无需启动浏览器或 WebGL 上下文，即可在 Vitest 中以任意倍速确定性验证：
 * - 发射台点火与 TWR 牵制臂释放逻辑
 * - 大气层跨音速波阻、Max-Q 峰值与攻角 Q*alpha 解体判定
 * - 多级火箭齐奥尔科夫斯基变质量分离与逃逸塔抛离
 * - 开普勒轨道根数解算与全部 4 关自动驾驶通关验证
 */
import { FixedStepper } from '../sim/engine';
import {
  createLiftoffState,
  emptyLiftoffCommand,
  getLiftoffScenario,
   getRocketVehicle,
  LIFTOFF_DT,
  liftoffAutopilot,
  sampleLiftoff,
  stepLiftoff,
  type LiftoffCommand,
  type LiftoffSample,
  type LiftoffScenarioConfig,
  type LiftoffState,
  type SasMode
} from '../sim/liftoff';

interface LiftoffDriverSession {
  scenario: LiftoffScenarioConfig;
  state: LiftoffState;
  command: LiftoffCommand;
  running: boolean;
  demo: boolean;
  samples: LiftoffSample[];
  lastSampleTime: number;
  stepper: FixedStepper;
}

const session: LiftoffDriverSession = {
  scenario: getLiftoffScenario(1),
  state: createLiftoffState(getLiftoffScenario(1)),
  command: emptyLiftoffCommand(0, 'hold'),
  running: false,
  demo: false,
  samples: [],
  lastSampleTime: 0,
  stepper: new FixedStepper()
};

export const liftoffDriver = {
  /** 加载指定升空训练关卡 (1 ~ 5) 或自定义配置 */
  load(id: number, custom?: LiftoffScenarioConfig) {
    if (!Number.isInteger(id) || id < 1 || id > 5) {
      throw new RangeError('Liftoff mission ID must be 1–5');
    }
    const cfg = structuredClone(custom ?? getLiftoffScenario(id));
    session.scenario = cfg;
    session.state = createLiftoffState(cfg);
    session.command = emptyLiftoffCommand(cfg.initialState.throttle, cfg.initialState.sasMode);
    session.running = false;
    session.demo = false;
    session.samples = [];
    session.lastSampleTime = session.state.time;
    session.stepper.reset();
    return this.snapshot();
  },

  /** 启动升空仿真（demo = true 时由确定性自动驾驶仪接管） */
  start(demo = false) {
    session.state = {
      ...createLiftoffState(session.scenario),
      status: 'flying'
    };
    session.command = emptyLiftoffCommand(
      session.scenario.initialState.throttle,
      session.scenario.initialState.sasMode
    );
    session.running = true;
    session.demo = demo;
    session.samples = [sampleLiftoff(session.state)];
    session.lastSampleTime = session.state.time;
    session.stepper.reset();
    return this.snapshot();
  },

  /** 设置节流阀油门 (0.0 ~ 1.0) */
  setThrottle(throttle: number) {
    if (!Number.isFinite(throttle) || throttle < 0 || throttle > 1) {
      throw new RangeError('Throttle must be in [0, 1]');
    }
    session.command.throttle = throttle;
    return this.snapshot();
  },

  /** 设置手动俯仰输入 (-1.0 ~ 1.0) 或目标锁定仰角 */
  setPitch(pitchInput: number, targetPitchDeg?: number) {
    session.command.pitchInput = pitchInput;
    if (targetPitchDeg !== undefined) {
      session.command.targetPitchDeg = targetPitchDeg;
    }
    return this.snapshot();
  },

  /** 切换 KSP 式 SAS 姿态辅助模式 */
  setSas(mode: SasMode, targetPitchDeg?: number) {
    session.command.sasMode = mode;
    if (targetPitchDeg !== undefined) {
      session.command.targetPitchDeg = targetPitchDeg;
    }
    return this.snapshot();
  },

  /** 触发空格键级间分离 / 发射台牵制臂释放 */
  triggerStage() {
    session.command.triggerStage = true;
    return this.snapshot();
  },

  /** 触发抛离逃逸塔 (LES) */
  jettisonTower() {
    session.command.jettisonTower = true;
    return this.snapshot();
  },

  /** 推进指定模拟时长 (秒) */
  advance(seconds: number, fps = 60) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 3600) {
      throw new RangeError('Simulated duration must be between 0 and 3600 seconds');
    }
    const totalFrames = Math.round(seconds * fps);
    const frameDt = 1 / fps;
    const vehicle = getRocketVehicle(session.scenario.vehicleId);

    for (let f = 0; f < totalFrames; f++) {
      if (!session.running || (session.state.status !== 'flying' && session.state.status !== 'failed')) break;
      session.stepper.advance(frameDt, () => {
        if (session.state.status !== 'flying' && session.state.status !== 'failed') return;
        const cmd = session.demo
          ? liftoffAutopilot(session.state, session.scenario, vehicle)
          : session.command;

        session.state = stepLiftoff(session.state, cmd, session.scenario, LIFTOFF_DT, vehicle);

        // 消费单次脉冲指令
        session.command.triggerStage = false;
        session.command.jettisonTower = false;

        if (session.state.time - session.lastSampleTime >= 1.0) {
          session.samples.push(sampleLiftoff(session.state));
          session.lastSampleTime = session.state.time;
        }

        if (session.state.status === 'success') {
          session.samples.push(sampleLiftoff(session.state));
          session.running = false;
        }
      });
    }
    return this.snapshot();
  },

  /** 获取当前只读状态快照 */
  snapshot() {
    return structuredClone({
      scenario: session.scenario,
      state: session.state,
      command: session.command,
      running: session.running,
      demo: session.demo,
      samples: session.samples
    });
  }
};
