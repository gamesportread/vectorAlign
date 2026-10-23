/**
 * 舱体降落任务轻量无头自测驱动器 (Headless Capsule Landing Test Driver)
 * 无需 WebGL/浏览器，直接验证：
 * - 80~38km 黑障区防热大底姿态守卫与烧穿判定 (heatshield_burnthrough)
 * - 亚音速引导伞与 1200㎡ 主伞开伞速度窗口与撕裂判定 (chute_shred)
 * - 防热大底抛离与离地 1.5m 反推缓冲火箭点火着陆
 * - 全部 4 关确定性自动驾驶通关验证
 */
import { FixedStepper } from '../sim/engine';
import {
  createLandingState,
  emptyLandingCommand,
  getLandingScenario,
  LANDING_DT,
  landingAutopilot,
  sampleLanding,
  stepLanding,
  type LandingCommand,
  type LandingSample,
  type LandingScenarioConfig,
  type LandingState
} from '../sim/landing';

interface LandingDriverSession {
  scenario: LandingScenarioConfig;
  state: LandingState;
  command: LandingCommand;
  running: boolean;
  demo: boolean;
  samples: LandingSample[];
  lastSampleTime: number;
  stepper: FixedStepper;
}

const session: LandingDriverSession = {
  scenario: getLandingScenario(1),
  state: createLandingState(getLandingScenario(1)),
  command: emptyLandingCommand(),
  running: false,
  demo: false,
  samples: [],
  lastSampleTime: 0,
  stepper: new FixedStepper()
};

export const landingDriver = {
  load(id: number, custom?: LandingScenarioConfig) {
    if (!Number.isInteger(id) || id < 1 || id > 4) {
      throw new RangeError('Landing mission ID must be 1–4');
    }
    const cfg = structuredClone(custom ?? getLandingScenario(id));
    session.scenario = cfg;
    session.state = createLandingState(cfg);
    session.command = emptyLandingCommand();
    session.running = false;
    session.demo = false;
    session.samples = [];
    session.lastSampleTime = 0;
    session.stepper.reset();
    return this.snapshot();
  },

  start(demo = false) {
    session.state = {
      ...createLandingState(session.scenario),
      status: 'flying'
    };
    session.command = emptyLandingCommand();
    session.running = true;
    session.demo = demo;
    session.samples = [sampleLanding(session.state)];
    session.lastSampleTime = 0;
    session.stepper.reset();
    return this.snapshot();
  },

  setAttitudeInput(val: number) {
    session.command.attitudeInput = val;
    return this.snapshot();
  },

  setLiftTrimInput(val: number) {
    session.command.liftTrimInput = val;
    return this.snapshot();
  },

  triggerAction() {
    session.command.triggerAction = true;
    return this.snapshot();
  },

  jettisonHeatshield() {
    session.command.jettisonHeatshield = true;
    return this.snapshot();
  },

  setSas(enabled: boolean) {
    session.command.sasEnabled = enabled;
    return this.snapshot();
  },

  advance(seconds: number, fps = 60) {
    const totalFrames = Math.round(seconds * fps);
    const frameDt = 1 / fps;

    for (let f = 0; f < totalFrames; f++) {
      if (!session.running || session.state.status !== 'flying') break;
      session.stepper.advance(frameDt, () => {
        if (session.state.status !== 'flying') return;
        const cmd = session.demo ? landingAutopilot(session.state) : session.command;

        session.state = stepLanding(session.state, cmd, session.scenario, LANDING_DT);

        session.command.triggerAction = false;
        session.command.jettisonHeatshield = false;

        if (session.state.time - session.lastSampleTime >= 0.5) {
          session.samples.push(sampleLanding(session.state));
          session.lastSampleTime = session.state.time;
        }

        if (session.state.status === 'success' || session.state.status === 'failed') {
          session.samples.push(sampleLanding(session.state));
          session.running = false;
        }
      });
    }
    return this.snapshot();
  },

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
