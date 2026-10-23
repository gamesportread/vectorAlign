/**
 * 太空站离开任务轻量无头自测驱动器 (Headless Station Departure Test Driver)
 * 无需 WebGL/浏览器，直接验证：
 * - 机械锁钩释放与弹簧推离初速度
 * - 0~5m 羽流禁火区违例检测 (plume_contamination)
 * - 圆锥安全撤离走廊越界检测 (corridor_breach)
 * - 全部 4 关确定性自动驾驶通关验证
 */
import { FixedStepper } from '../sim/engine';
import {
  createDepartureState,
  DEPARTURE_DT,
  departureAutopilot,
  emptyDepartureCommand,
  getDepartureScenario,
  sampleDeparture,
  stepDeparture,
  type DepartureCommand,
  type DepartureSample,
  type DepartureScenarioConfig,
  type DepartureState
} from '../sim/departure';
import type { Vec3 } from '../sim/types';

interface DepartureDriverSession {
  scenario: DepartureScenarioConfig;
  state: DepartureState;
  command: DepartureCommand;
  running: boolean;
  demo: boolean;
  samples: DepartureSample[];
  lastSampleTime: number;
  stepper: FixedStepper;
}

const session: DepartureDriverSession = {
  scenario: getDepartureScenario(1),
  state: createDepartureState(getDepartureScenario(1)),
  command: emptyDepartureCommand(),
  running: false,
  demo: false,
  samples: [],
  lastSampleTime: 0,
  stepper: new FixedStepper()
};

export const departureDriver = {
  load(id: number, custom?: DepartureScenarioConfig) {
    if (!Number.isInteger(id) || id < 1 || id > 4) {
      throw new RangeError('Departure mission ID must be 1–4');
    }
    const cfg = structuredClone(custom ?? getDepartureScenario(id));
    session.scenario = cfg;
    session.state = createDepartureState(cfg);
    session.command = emptyDepartureCommand();
    session.running = false;
    session.demo = false;
    session.samples = [];
    session.lastSampleTime = 0;
    session.stepper.reset();
    return this.snapshot();
  },

  start(demo = false) {
    session.state = {
      ...createDepartureState(session.scenario),
      status: 'flying'
    };
    session.command = emptyDepartureCommand();
    session.running = true;
    session.demo = demo;
    session.samples = [sampleDeparture(session.state)];
    session.lastSampleTime = 0;
    session.stepper.reset();
    return this.snapshot();
  },

  setTranslation(translation: Vec3) {
    session.command.translation = [...translation];
    return this.snapshot();
  },

  setRotation(rotation: Vec3) {
    session.command.rotation = [...rotation];
    return this.snapshot();
  },

  releaseLatches() {
    session.command.releaseLatches = true;
    return this.snapshot();
  },

  toggleNosecone() {
    session.command.toggleNosecone = true;
    return this.snapshot();
  },

  setAssistBrake(enabled: boolean) {
    session.command.assistBrake = enabled;
    return this.snapshot();
  },

  advance(seconds: number, fps = 60) {
    const totalFrames = Math.round(seconds * fps);
    const frameDt = 1 / fps;

    for (let f = 0; f < totalFrames; f++) {
      if (!session.running || session.state.status !== 'flying') break;
      session.stepper.advance(frameDt, () => {
        if (session.state.status !== 'flying') return;
        const cmd = session.demo
          ? departureAutopilot(session.state, session.scenario)
          : session.command;

        session.state = stepDeparture(session.state, cmd, session.scenario, DEPARTURE_DT);

        session.command.releaseLatches = false;
        session.command.toggleNosecone = false;

        if (session.state.time - session.lastSampleTime >= 0.5) {
          session.samples.push(sampleDeparture(session.state));
          session.lastSampleTime = session.state.time;
        }

        if (session.state.status === 'success' || session.state.status === 'failed') {
          session.samples.push(sampleDeparture(session.state));
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
