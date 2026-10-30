import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Crosshair,
  Flame,
  Gauge,
  Globe2,
  Layers3,
  Orbit,
  Pause,
  Play,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Zap
} from 'lucide-react';
import { FixedStepper } from '../../sim/engine';
import {
  clamp,
  createLiftoffState,
  emptyLiftoffCommand,
  fullLaunchScenario,
  getLiftoffScenario,
  getRocketVehicle,
  LIFTOFF_DT,
  LIFTOFF_GLOSSARY,
  liftoffAutopilot,
  liftoffScenarios,
  sampleLiftoff,
  stepLiftoff,
  type LiftoffCommand,
  type LiftoffConsequence,
  type LiftoffFailure,
  type LiftoffSample,
  type LiftoffScenarioConfig,
  type LiftoffState,
  type SasMode
} from '../../sim/liftoff';
import { impactTone, lockTone, tone, useSession } from '../../store';
import { formatTime } from '../../utils/formatters';
import { Metric } from '../common/Metric';
import { Modal } from '../common/Modal';
import { KspNavball } from './KspNavball';
import { LiftoffCanvas } from './LiftoffCanvas';
import { LiftoffZeroView } from './LiftoffZeroView';
import './liftoff.css';

function explainLiftoffFailure(
  reason: LiftoffFailure | undefined,
  t: (zh: string, en: string) => string
): { title: string; detail: string; tip: string } {
  switch (reason) {
    case 'pad_fallback':
      return {
        title: t('⚠️ 还没飞出发射台 · 火箭坠回发射台', '⚠️ Fell Back onto Launchpad'),
        detail: t(
          '火箭还没有飞离发射台，发动机推力不足或中途熄火（推重比 TWR < 1.0），三千吨重的巨箭没有足够的向上托举力，被重力直接砸回了发射台基座！',
          'The rocket had not cleared the launchpad when engine thrust was lost or insufficient (TWR < 1.0), plunging straight back onto the pad.'
        ),
        tip: t(
          '💡 通关秘籍：起飞前先按 [Z] 把油门推到 100%，确认推重比 TWR > 1.15 后再按 [Space] 解锁，起飞后千万不要在低空关油门！',
          '💡 Tip: Push throttle to 100% via [Z] first, confirm TWR > 1.15, then press [Space] to liftoff!'
        )
      };
    case 'low_altitude_crash':
      return {
        title: t('⚠️ 低空熄火失速 · 火箭坠毁', '⚠️ Low Altitude Flameout · Crashed'),
        detail: t(
          '火箭虽然刚刚飞离地面，但由于发动机过早熄火、油门被关闭或推力中断，火箭在低空失去向上动力，像石头一样被地球引力砸向地面或海面！',
          'The rocket lifted off but lost thrust at low altitude, plummeting back down into the ground or ocean.'
        ),
        tip: t(
          '💡 通关秘籍：起飞后保持发动机全推力喷射，直到第一级燃料全部燃尽！',
          '💡 Tip: Maintain full engine throttle after liftoff until stage burnout!'
        )
      };
    case 'tower_collision':
      return {
        title: t('⚠️ 过早急转弯 · 擦撞 150 米发射塔架', '⚠️ Early Pitch · Struck 150m Launch Tower'),
        detail: t(
          '火箭刚离地还没飞过 150 米高的钢铁发射塔，你就把机头大幅度歪斜（俯仰角低于 78°），导致百米长的巨大箭体直接撞上了旁边的脐带塔架！',
          'You tilted the rocket nose before clearing the 150-meter launch tower!'
        ),
        tip: t(
          '💡 通关秘籍：刚起飞前 10 秒保持 90° 垂直向上，等高度超过 150 米（Clear the Tower）后再按 [D / →] 向东缓慢倾斜！',
          '💡 Tip: Fly straight up (90°) until altitude exceeds 150 m, then gently pitch east!'
        )
      };
    case 'aero_stress':
      return {
        title: t('⚠️ 最大动压 (Max-Q) 攻角过大 · 气动折断解体', '⚠️ Max-Q Aero Breakup · Excessive Angle of Attack'),
        detail: t(
          '在约 10~18 公里高空的超音速稠密大气层中，迎面狂风冲击力（动压 q）高达数十千帕！此时你的机头偏离黄色速度方向圈（Prograde）太远，狂暴的侧向气流把细长的火箭直接拦腰折断了！',
          'During high dynamic pressure (Max-Q), your nose deviated too far from the yellow Prograde vector, causing aerodynamic structural breakup!'
        ),
        tip: t(
          '💡 通关秘籍：在穿越 Max-Q 风暴区时，点击开启 SAS「顺应速度 ◯ (Prograde)」，让机头始终套在黄色圆圈里顺风飞行！',
          '💡 Tip: Engage SAS [Prograde ◯] during Max-Q so the rocket flies at near-zero Angle of Attack!'
        )
      };
    case 'premature_staging':
      return {
        title: t('⚠️ 带火强行分离 · 下级火箭追尾撞毁上级', '⚠️ Premature Staging · Booster Rear-End Collision'),
        detail: t(
          '当前这一级火箭里还有很多燃料并且正在猛烈喷火推进，你却提前按下了级间分离！刚脱开的下级火箭在巨大推力下直接往上撞进上级发动机，引发空中解体。',
          'You triggered stage separation while the current stage still had fuel and active thrust, causing it to ram the upper stage!'
        ),
        tip: t(
          '💡 通关秘籍：盯紧左下角当前级燃料条，必须等燃料烧到 0%（显示 MECO 熄火）后再按 [Space 空格键] 分离！',
          '💡 Tip: Wait until the active stage fuel bar reaches 0% (MECO) before pressing [Space]!'
        )
      };
    case 'late_staging':
      return {
        title: t('⚠️ 一级熄火后未及时分离 · 失速下坠', '⚠️ Late Staging · Lost Ascent Momentum'),
        detail: t(
          '第一级燃料已经彻底烧光熄火（MECO），但你背着 130 吨重的空金属桶滑行了太久没有分离点火，火箭被地球引力重新拽了回去！',
          'Stage 1 burned out (MECO), but you waited too long to separate and ignite Stage 2!'
        ),
        tip: t(
          '💡 通关秘籍：看到第一级燃料归零熄火时，立刻按 [Space 空格键] 抛掉空壳并点燃第二级！',
          '💡 Tip: Press [Space] immediately when Stage 1 fuel hits 0%!'
        )
      };
    case 'suborbital_reentry':
    case 'orbit_eccentric':
      return {
        title: t('⚠️ 水平速度不足 · 亚轨道坠回大气层', '⚠️ Suborbital Trajectory · Reentered Atmosphere'),
        detail: t(
          '火箭虽然飞到了太空高度，但向东的水平速度没有达到约 7,790 m/s 的“第一宇宙速度”（近地点 Pe 低于大气层），飞过最高点后又像石头一样掉回了地球大气层！',
          'You reached space altitude, but horizontal speed was below ~7,790 m/s (Periapsis remained inside the atmosphere)!'
        ),
        tip: t(
          '💡 通关秘籍：当远地点 (Ap) 接近 185 km 时，把机头压平到 0°~8° 水平方向，全力向东加速把近地点 (Pe) 抬升过 155 km！',
          '💡 Tip: Level the nose horizontally (0°–8°) near Apoapsis to build horizontal speed and raise Periapsis > 155 km!'
        )
      };
    default:
      return {
        title: t('⚠️ 任务超时或推进剂耗尽', '⚠️ Mission Timeout or Fuel Exhausted'),
        detail: t(
          '未能在规定时间或推进剂预算内达成目标轨道参数。',
          'Target ascent parameters were not reached within the time or fuel budget.'
        ),
        tip: t(
          '💡 通关秘籍：可点击「观看示范」观察自动驾驶仪如何规划俯仰角与分离时机！',
          '💡 Tip: Click [Watch Demo] to see how the autopilot executes the ascent profile!'
        )
      };
  }
}

function formatLiftoffConsequence(
  consequence: LiftoffConsequence | undefined,
  t: (zh: string, en: string) => string
): string {
  switch (consequence) {
    case 'exploding':
      return t('💥 火箭在空中解体爆炸！碎片四散推演中...', '💥 Aerial Structural Breakup · Tracking debris');
    case 'falling':
      return t('⚠️ 动力中断失速，地球引力正将火箭急坠推演中...', '⚠️ Thrust Lost · Rocket in gravity dive');
    case 'crashed_pad':
      return t('💥 火箭坠毁于发射台混凝土基座！', '💥 Impacted on launchpad ground');
    case 'crashed_ocean':
      return t('🌊 火箭失速坠入大西洋海面！激起巨大海浪水花', '🌊 Crashed into ocean surface with waves');
    case 'drifting_space':
      return t('🛰️ 动力耗尽，残骸在冷寂太空中永久漂浮...', '🛰️ Stranded in vacuum · Drifting forever');
    default:
      return t('⚠️ 任务失败，后续灾难推演中...', '⚠️ Failure simulation in progress...');
  }
}

function getLiftoffInFlightGuidance(
  scenarioId: number,
  state: LiftoffState,
  t: (zh: string, en: string) => string
): string {
  const altKm = state.orbit.altitudeM / 1000;
  const activeStage = state.stages[state.activeStageIndex];
  const fuelPct =
    activeStage && activeStage.maxFuelMassKg > 0
      ? (activeStage.fuelMassKg / activeStage.maxFuelMassKg) * 100
      : 0;

  if (!state.clampsReleased) {
    if (state.twr < 1.05) {
      return t(
        '🔥 第一步：按键盘 [Z] 键（或拉满右侧油门滑块到 100%）点燃主发动机！',
        '🔥 Step 1: Press [Z] (or drag throttle to 100%) to ignite the main engines!'
      );
    }
    return t(
      `🚀 水幕喷淋已启动，推重比达 ${state.twr.toFixed(2)} (>1.0)！快按 [Space 空格键]（或点击 STAGE 按钮）拔销升空！`,
      `🚀 Water deluge active, TWR ${state.twr.toFixed(2)} (>1.0)! Press [Space] (or click STAGE) to release clamps!`
    );
  }

  if (state.orbit.altitudeM < 150) {
    return t(
      `🗼 正在垂直飞越 150 米发射塔架（当前 ${state.orbit.altitudeM.toFixed(0)}m）· 请保持 90° 垂直向上，切勿提前打方向！`,
      `🗼 Clearing 150m launch tower (${state.orbit.altitudeM.toFixed(0)}m) · Hold 90° vertical!`
    );
  }

  if (activeStage && fuelPct <= 0.1 && state.activeStageIndex < state.stages.length - 1) {
    return t(
      `⚡ 第 ${state.activeStageIndex + 1} 级燃料已耗尽 (MECO)！立即按 [Space 空格键] 级间分离并点燃下一级！`,
      `⚡ Stage ${state.activeStageIndex + 1} depleted (MECO)! Press [Space] NOW to stage and ignite next stage!`
    );
  }

  if (scenarioId === 1 || (scenarioId === 5 && altKm < 8)) {
    if (state.pitchDeg > 82) {
      return t(
        '🎯 已安全越过发射塔！按住 [D] 或 [→] 键（或启用「程序转弯」）把机头向东倾斜至 70° 左右！',
        '🎯 Tower cleared! Press [D] / [→] (or engage Auto Gravity Turn) to tilt pitch to ~70°!'
      );
    }
    return t(
      `✨ 初始转弯仰角完美（${state.pitchDeg.toFixed(0)}°）！满油门冲破对流层云海（当前 ${altKm.toFixed(1)} km）！`,
      `✨ Pitch angle great (${state.pitchDeg.toFixed(0)}°)! Climb through the cloud deck (now ${altKm.toFixed(1)} km)!`
    );
  }

  if (scenarioId === 2 || (scenarioId === 5 && altKm < 35 && state.activeStageIndex === 0)) {
    if (altKm >= 10 && altKm <= 17) {
      return t(
        `🌪️ 正在穿越 Max-Q 最大动压风暴区（动压 ${(state.dynamicPressurePa / 1000).toFixed(1)} kPa）！保持 SAS「顺应速度 ◯」紧贴黄圈，切勿急转弯！`,
        `🌪️ Passing through Max-Q (${(state.dynamicPressurePa / 1000).toFixed(1)} kPa)! Keep SAS on [Prograde ◯] and avoid sharp turns!`
      );
    }
    return t(
      `🎯 重力转向加速爬升中（高度 ${altKm.toFixed(1)} km · 一级余量 ${fuelPct.toFixed(0)}%）· 顺应黄色速度圈平稳压低仰角！`,
      `🎯 Gravity turn climb (${altKm.toFixed(1)} km · Stage 1 fuel ${fuelPct.toFixed(0)}%) · Follow Prograde!`
    );
  }

  if (scenarioId === 3 || (scenarioId === 5 && state.orbit.apoapsisM < 168000)) {
    if (state.activeStageIndex === 0) {
      return t(
        `⏳ 第一级剩余燃料 ${fuelPct.toFixed(1)}% · 盯紧燃料条，归零瞬间立即按 [Space 空格键] 一二级分离！`,
        `⏳ Stage 1 fuel ${fuelPct.toFixed(1)}% · Stand by to press [Space] the moment fuel hits 0%!`
      );
    }
    if (!state.towerJettisoned && altKm >= 92) {
      return t(
        '🗼 已冲出 92 公里稠密大气！快按 [J] 键（或点击「抛离救生逃逸塔」）抛掉逃逸塔与整流罩死重！',
        '🗼 Above 92 km dense atmosphere! Press [J] (or click Jettison LES) to drop escape tower & fairing!'
      );
    }
    return t(
      `🔥 第二级高空主发动机全力推进中！继续加速将预测远地点 (Ap) 推向 185 km（当前 Ap ${(state.orbit.apoapsisM / 1000).toFixed(1)} km）！`,
      `🔥 Stage 2 burning! Push predicted Apoapsis (Ap) toward 185 km (current Ap ${(state.orbit.apoapsisM / 1000).toFixed(1)} km)!`
    );
  }

  // Scenario 4 or final phase of Scenario 5: Orbital Insertion
  return t(
    `🌍 入轨冲刺中！将机头压平至 0°~10° 向东加速至 7,797 m/s，把近地点 (Pe ${(state.orbit.periapsisM / 1000).toFixed(1)} km) 抬升过 155 km！`,
    `🌍 Orbital insertion! Level nose (0°–10°) and accelerate to 7,797 m/s until Periapsis (Pe ${(state.orbit.periapsisM / 1000).toFixed(1)} km) > 155 km!`
  );
}

export interface LiftoffWorkspaceProps {
  initialVehicleId?: 'saturn-v' | 'cz5' | 'cz2f';
  initialActiveLevel?: number;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
  onCloseMobile: () => void;
  onActiveLevelChange?: (level: number) => void;
}

export function LiftoffWorkspace({
  initialVehicleId = 'saturn-v',
  initialActiveLevel = 1,
  isOpenMobile,
  onToggleMobile,
  onCloseMobile,
  onActiveLevelChange
}: LiftoffWorkspaceProps) {
  const language = useSession((s) => s.language);
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  const [vehicleId, setVehicleId] = useState<'saturn-v' | 'cz5' | 'cz2f'>(initialVehicleId);
  const [activeLevel, setActiveLevel] = useState<number>(initialActiveLevel);
  const [mobileConsoleTab, setMobileConsoleTab] = useState<'propulsion' | 'attitude'>('propulsion');
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [scenario, setScenario] = useState<LiftoffScenarioConfig>(() => getLiftoffScenario(1));
  const [state, setState] = useState<LiftoffState>(() =>
    createLiftoffState(getLiftoffScenario(1), getRocketVehicle('saturn-v'))
  );
  const [running, setRunning] = useState(false);
  const [demo, setDemo] = useState(false);
  const [timeWarp, setTimeWarp] = useState<1 | 2 | 4 | 10>(1);
  const [viewMode, setViewMode] = useState<'rocket' | 'map'>('rocket');
  const [showGuidance, setShowGuidance] = useState(true);
  const [showComposite, setShowComposite] = useState(true);
  const [modalType, setModalType] = useState<'none' | 'brief' | 'review' | 'glossary'>('none');
  const [samples, setSamples] = useState<LiftoffSample[]>([]);
  const [failureCardVisible, setFailureCardVisible] = useState(true);
  const failureTimerRef = useRef<number | null>(null);

  const vehicle = getRocketVehicle(vehicleId);

  // Mutable runtime ref for 60Hz animation loop
  const runtimeRef = useRef<{
    state: LiftoffState;
    command: LiftoffCommand;
    scenario: LiftoffScenarioConfig;
    vehicleId: 'saturn-v' | 'cz5' | 'cz2f';
    running: boolean;
    demo: boolean;
    timeWarp: number;
    stepper: FixedStepper;
    samples: LiftoffSample[];
    lastSampleTime: number;
  }>({
    state,
    command: emptyLiftoffCommand(scenario.initialState.throttle, scenario.initialState.sasMode),
    scenario,
    vehicleId: 'saturn-v',
    running: false,
    demo: false,
    timeWarp: 1,
    stepper: new FixedStepper(),
    samples: [],
    lastSampleTime: 0
  });

  const selectLevel = (id: number, nextVehId: 'saturn-v' | 'cz5' | 'cz2f' = vehicleId) => {
    onCloseMobile();
    onActiveLevelChange?.(id);
    if (id === 0) {
      runtimeRef.current.running = false;
      setRunning(false);
      setActiveLevel(0);
      return;
    }
    const baseScen = getLiftoffScenario(id);
    const sc: LiftoffScenarioConfig = { ...structuredClone(baseScen), vehicleId: nextVehId };
    const veh = getRocketVehicle(nextVehId);
    const initSt = createLiftoffState(sc, veh);
    const initCmd = emptyLiftoffCommand(sc.initialState.throttle, sc.initialState.sasMode);

    runtimeRef.current = {
      state: initSt,
      command: initCmd,
      scenario: sc,
      vehicleId: nextVehId,
      running: false,
      demo: false,
      timeWarp: 1,
      stepper: new FixedStepper(),
      samples: [sampleLiftoff(initSt)],
      lastSampleTime: initSt.time
    };

    setScenario(sc);
    setState(initSt);
    setSamples([sampleLiftoff(initSt)]);
    setRunning(false);
    setDemo(false);
    setTimeWarp(1);
    setActiveLevel(id);
    setModalType('none');
  };

  const startFlight = (isDemo = false) => {
    const sc = runtimeRef.current.scenario;
    const veh = getRocketVehicle(runtimeRef.current.vehicleId);
    const freshState: LiftoffState = {
      ...createLiftoffState(sc, veh),
      status: 'flying'
    };
    const initialThrottle =
      !isDemo && !sc.initialState.clampsReleased ? 1.0 : sc.initialState.throttle;
    freshState.throttle = initialThrottle;
    const freshCmd = emptyLiftoffCommand(initialThrottle, sc.initialState.sasMode);
    freshCmd.targetPitchDeg = sc.initialState.pitchDeg;

    // On pad launch, start demo at 1x real-time so water deluge, 2.6s ignition hold-down,
    // clamp release, swing-arm retraction, and tower clear play out realistically
    const initWarp: 1 | 2 | 4 | 10 = isDemo ? (sc.initialState.clampsReleased ? 4 : 1) : 1;

    runtimeRef.current.state = freshState;
    runtimeRef.current.command = freshCmd;
    runtimeRef.current.running = true;
    runtimeRef.current.demo = isDemo;
    runtimeRef.current.timeWarp = initWarp;
    runtimeRef.current.stepper.reset();
    runtimeRef.current.samples = [sampleLiftoff(freshState)];
    runtimeRef.current.lastSampleTime = freshState.time;

    if (failureTimerRef.current) {
      clearTimeout(failureTimerRef.current);
      failureTimerRef.current = null;
    }
    setFailureCardVisible(true);

    setState(freshState);
    setSamples(runtimeRef.current.samples);
    setRunning(true);
    setDemo(isDemo);
    setTimeWarp(initWarp);
    setModalType('none');
    tone(true);
  };

  const pauseFlight = () => {
    runtimeRef.current.running = false;
    runtimeRef.current.stepper.reset();
    setRunning(false);
    setState({ ...runtimeRef.current.state });
  };

  const resumeFlight = () => {
    if (runtimeRef.current.state.status === 'flying' || runtimeRef.current.state.status === 'failed') {
      runtimeRef.current.running = true;
      runtimeRef.current.stepper.reset();
      setRunning(true);
      setModalType('none');
    }
  };

  const handleSetThrottle = (val: number) => {
    const clamped = clamp(val, 0, 1);
    runtimeRef.current.command.throttle = clamped;
    if (!runtimeRef.current.running && runtimeRef.current.state.status === 'ready') {
      startFlight(false);
      runtimeRef.current.command.throttle = clamped;
    } else {
      setState((prev) => ({ ...prev, throttle: clamped }));
    }
  };

  const handleTriggerStage = () => {
    if (!runtimeRef.current.running && runtimeRef.current.state.status === 'ready') {
      startFlight(false);
      runtimeRef.current.command.throttle = 1.0;
    }
    runtimeRef.current.command.triggerStage = true;
    lockTone();
  };

  const handleJettisonTower = () => {
    runtimeRef.current.command.jettisonTower = true;
    lockTone();
  };

  const handleSetSas = (mode: SasMode) => {
    runtimeRef.current.command.sasMode = mode;
    runtimeRef.current.command.targetPitchDeg = runtimeRef.current.state.pitchDeg;
    setState((prev) => ({ ...prev, sasMode: mode }));
    tone(true);
  };

  const handleSteerPitch = (dir: number) => {
    runtimeRef.current.command.pitchInput = dir;
    if (dir === 0 && runtimeRef.current.command.sasMode === 'hold') {
      runtimeRef.current.command.targetPitchDeg = runtimeRef.current.state.pitchDeg;
    }
  };

  // 60Hz Fixed-Step Simulation Loop
  useEffect(() => {
    let frameId = 0;
    let lastNow = performance.now();
    let lastPublish = 0;

    const tick = (now: number) => {
      const dtWall = (now - lastNow) / 1000;
      lastNow = now;

      const rt = runtimeRef.current;
      if (rt.running && (rt.state.status === 'flying' || rt.state.status === 'failed')) {
        const veh = getRocketVehicle(rt.vehicleId);
        // Smoothly step up timeWarp in Demo mode once clear of the launch tower (400m)
        if (rt.demo && rt.timeWarp === 1 && rt.state.orbit.altitudeM > 400) {
          rt.timeWarp = 2;
          setTimeWarp(2);
        } else if (rt.demo && rt.timeWarp === 2 && rt.state.orbit.altitudeM > 18000) {
          rt.timeWarp = 4;
          setTimeWarp(4);
        }

        rt.stepper.advance(dtWall, () => {
          for (let w = 0; w < rt.timeWarp; w++) {
            if (rt.state.status !== 'flying' && rt.state.status !== 'failed') break;
            const cmd = rt.demo ? liftoffAutopilot(rt.state, rt.scenario, veh) : rt.command;
            const wasFlying = rt.state.status === 'flying';
            rt.state = stepLiftoff(rt.state, cmd, rt.scenario, LIFTOFF_DT, veh);
            rt.command.triggerStage = false;
            rt.command.jettisonTower = false;

            if (rt.state.time - rt.lastSampleTime >= 1.0) {
              rt.samples.push(sampleLiftoff(rt.state));
              rt.lastSampleTime = rt.state.time;
            }

            if (rt.state.status === 'success') {
              rt.samples.push(sampleLiftoff(rt.state));
              rt.running = false;
              tone(true);
              setRunning(false);
              setState({ ...rt.state });
              setSamples([...rt.samples]);
              if (!rt.demo) {
                setCompletedLevels((prev) =>
                  prev.includes(rt.scenario.id) ? prev : [...prev, rt.scenario.id]
                );
              }
              setModalType('review');
              break;
            } else if (rt.state.status === 'failed' && wasFlying) {
              // 刚发生失败瞬间：播放音效、采样并启动 3 秒自动折叠浮层定时器
              rt.samples.push(sampleLiftoff(rt.state));
              impactTone();
              setFailureCardVisible(true);
              if (failureTimerRef.current) clearTimeout(failureTimerRef.current);
              failureTimerRef.current = window.setTimeout(() => {
                setFailureCardVisible(false);
              }, 3000);
              // 保持 rt.running 为 true，让灾难动力学推演（解体、下坠、坠海、太空漂浮）继续平稳模拟！
            }
          }
        });

        if (now - lastPublish > 65) {
          setState({ ...rt.state });
          setSamples([...rt.samples]);
          lastPublish = now;
        }
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Keyboard Controls for KSP Liftoff
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeLevel === 0) return;
      if ((e.target as HTMLElement)?.closest('input,select,textarea')) return;

      const rt = runtimeRef.current;

      if (e.code === 'KeyR') {
        e.preventDefault();
        startFlight(false);
        return;
      }

      if (e.code === 'KeyZ') {
        e.preventDefault();
        handleSetThrottle(1.0);
        return;
      }

      if (e.code === 'KeyX') {
        e.preventDefault();
        handleSetThrottle(0.0);
        return;
      }

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleSetThrottle(rt.command.throttle + 0.08);
        return;
      }

      if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        handleSetThrottle(rt.command.throttle - 0.08);
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTriggerStage();
        return;
      }

      if (e.code === 'KeyJ' || e.code === 'Digit1') {
        e.preventDefault();
        handleJettisonTower();
        return;
      }

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSteerPitch(1);
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        e.preventDefault();
        handleSteerPitch(-1);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (
        e.code === 'KeyA' ||
        e.code === 'ArrowLeft' ||
        e.code === 'KeyD' ||
        e.code === 'ArrowRight'
      ) {
        handleSteerPitch(0);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeLevel]);

  const activeStageRuntime = state.stages[state.activeStageIndex];
  const isMecoReady =
    state.clampsReleased &&
    activeStageRuntime &&
    activeStageRuntime.fuelMassKg <= 0.1 &&
    state.activeStageIndex < state.stages.length - 1;

  const isPadLaunchReady = !state.clampsReleased && state.twr >= 1.1;

  return (
    <div className="liftoff-shell">
      {/* 左侧升空课程边栏 */}
      <aside className={`sidebar ${isOpenMobile ? 'mobile-open' : ''}`}>
        <div className="course-label">
          <span className="eyebrow">{t('升空训练计划 01', 'ASCENT PROGRAM 01')}</span>
        </div>

        <h2>{t('冲出大气，直抵星辰', 'Break free from gravity.')}</h2>
        <p className="sidebar-intro">
          {t(
            '从 3000 吨巨箭点火到每秒 7.8 公里的第一宇宙速度。',
            'From 3,000-tonne ignition to 7.8 km/s orbital velocity.'
          )}
        </p>

        {/* 运载火箭型号（NASA Saturn V） */}
        <div className="liftoff-vehicle-switch single-vehicle" role="group" aria-label={t('运载火箭型号', 'Launch Vehicle')}>
          <div className="liftoff-vehicle-btn active">
            🚀 {t('土星五号 · NASA AS-506 登月火箭', 'Saturn V · NASA AS-506 Moon Rocket')}
          </div>
        </div>

        <div className="progress-caption">
          <span>{t('升空训练进度', 'Ascent progress')}</span>
          <strong>
            {completedLevels.filter((id) => id <= 4).length}
            <span> / 4</span>
          </strong>
        </div>

        <div className="progress-track">
          {liftoffScenarios.map((sc) => (
            <span key={sc.id} className={completedLevels.includes(sc.id) ? 'complete' : ''} />
          ))}
        </div>

        <div className="mission-list">
          <button
            className={`mission-item mission-zero ${activeLevel === 0 ? 'selected' : ''}`}
            onClick={() => selectLevel(0)}
          >
            <span className="mission-number">00</span>
            <span>
              <strong>{t('任务通识 · 火箭与入轨原理', 'Liftoff Briefing & Rocket Anatomy')}</strong>
              <small>{t('三级火箭结构、推重比与第一宇宙速度', 'Stages, TWR, Max-Q & 7.8 km/s orbit')}</small>
            </span>
            {activeLevel === 0 && <ChevronRight size={15} />}
          </button>

          {/* 完整全流程发射模式 (0m 发射台点火 -> 越塔 -> Max-Q -> 级间分离 -> 抛逃逸塔/整流罩 -> 185km 入轨) */}
          <button
            className={`mission-item mission-full-launch ${activeLevel === 5 ? 'selected' : ''}`}
            onClick={() => selectLevel(5)}
          >
            <span className="mission-number">
              {completedLevels.includes(5) ? <Check size={18} /> : '★'}
            </span>
            <span>
              <strong>{fullLaunchScenario.title[language]}</strong>
              <small>{fullLaunchScenario.subtitle[language]}</small>
            </span>
            {activeLevel === 5 && <ChevronRight size={15} />}
          </button>

          {liftoffScenarios.map((sc) => {
            const isDone = completedLevels.includes(sc.id);
            const isSelected = activeLevel === sc.id;
            return (
              <button
                key={sc.id}
                className={`mission-item ${isSelected ? 'selected' : ''}`}
                onClick={() => selectLevel(sc.id)}
              >
                <span className="mission-number">
                  {isDone ? (
                    <>
                      <Check size={18} />
                      <span className="sr-only">0{sc.id}</span>
                    </>
                  ) : (
                    String(sc.id).padStart(2, '0')
                  )}
                </span>
                <span>
                  <strong>{sc.title[language]}</strong>
                  <small>{sc.subtitle[language]}</small>
                </span>
                {isSelected && <ChevronRight size={15} />}
              </button>
            );
          })}
        </div>

        <div className="sidebar-note">
          <div className="note-orbit">
            <Rocket size={24} />
          </div>
          <span className="eyebrow">{t('青少年航天词典', 'SPACE GLOSSARY')}</span>
          <p>
            {t(
              '不理解什么是“推重比”、“最大动压 Max-Q”或“远地点 Ap”？随时打开通俗词典查看！',
              'Curious about TWR, Max-Q, Gravity Turn, or Apoapsis? Open the teen science glossary!'
            )}
          </p>
          <button onClick={() => setModalType('glossary')}>
            {t('查看专业词汇通俗解释', 'Open Rocket Glossary')}
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="local-status">
          <ShieldCheck size={14} />
          {t('NASA AS-506 真实气动推进模型', 'NASA AS-506 Authentic Physics')}
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <main>
        <button className="mobile-course" onClick={onToggleMobile}>
          <Layers3 size={16} />
          {activeLevel === 0
            ? t('00 任务通识 · 火箭与入轨原理', '00 Liftoff Briefing')
            : t('选择升空训练关卡', 'Choose an ascent mission')}
          <ChevronRight size={14} />
        </button>

        {activeLevel === 0 ? (
          <LiftoffZeroView
            vehicle={vehicle}
            language={language}
            onStartFlight={() => selectLevel(1)}
          />
        ) : (
          <>
            {/* 顶部关卡目标横幅 */}
            <div className="mission-heading cockpit-header-bar">
              <div className="heading-title-col">
                <h1>
                  <span className="title-number">{scenario.id === 5 ? '★' : `0${scenario.id}`}</span>
                  {scenario.title[language]}
                  <span className="level-pill">
                    {scenario.id === 5
                      ? t('全流程复合仿真', 'FULL LAUNCH SEQUENCE')
                      : scenario.id === 4
                      ? t('入轨终极战', 'ORBIT INSERTION')
                      : t('升空训练', 'ASCENT TRAINING')}
                  </span>
                </h1>
              </div>

              <div className="mission-goal-banner">
                <div className="goal-banner-header">
                  <div className="goal-badge">
                    <Target size={14} />
                    <span>{t('本关目标', 'OBJECTIVE')}</span>
                  </div>
                  <div className="goal-criteria-pill">
                    <span className="criteria-label">{t('🏁 通关要求：', '🏁 Pass: ')}</span>
                    <span className="criteria-val">{scenario.passCriteria[language]}</span>
                  </div>
                </div>
                <div className="goal-banner-body">
                  <div className="goal-operation-hint">
                    <span className="hint-label">{t('🕹️ 怎么操作：', '🕹️ Controls: ')}</span>
                    <span className="hint-text">{scenario.hint[language]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 仿真视口与工具条 */}
            <section className="simulator" aria-label={t('火箭升空模拟器', 'Rocket Liftoff Simulator')}>
              <div className="scene-toolbar">
                <div className="view-switch">
                  <button
                    className={viewMode === 'rocket' ? 'active' : ''}
                    onClick={() => setViewMode('rocket')}
                  >
                    <Rocket size={15} />
                    {t('3D 复合主视角', '3D Composite View')}
                  </button>
                  <button
                    className={viewMode === 'map' ? 'active' : ''}
                    onClick={() => setViewMode('map')}
                  >
                    <Globe2 size={15} />
                    {t('全屏轨道地图 (Ap/Pe)', 'Full Orbital Map')}
                  </button>
                </div>

                <div className="scene-tools">
                  {/* KSP 物理时间加速倍率 */}
                  <div className="time-warp-group" title={t('物理时间加速（保持 1/60s 精确物理步长）', 'Physics Time Warp')}>
                    <span className="time-warp-label">{t('倍速', 'Warp')}</span>
                    {([1, 2, 4, 10] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        className={`time-warp-btn ${timeWarp === w ? 'active' : ''}`}
                        onClick={() => {
                          runtimeRef.current.timeWarp = w;
                          setTimeWarp(w);
                        }}
                      >
                        {w}×
                      </button>
                    ))}
                  </div>

                  <button
                    className={showComposite ? 'enabled' : ''}
                    onClick={() => setShowComposite((v) => !v)}
                  >
                    <Orbit size={15} />
                    <span>{t('复合画中画', 'Multi-View PiP')}</span>
                  </button>

                  <button
                    className={showGuidance ? 'enabled' : ''}
                    onClick={() => setShowGuidance((v) => !v)}
                  >
                    <Crosshair size={15} />
                    <span>{t('速度矢量引导', 'Vectors')}</span>
                  </button>

                  <button onClick={() => setModalType('glossary')}>
                    <Sparkles size={15} />
                    <span>{t('词条科普', 'Glossary')}</span>
                  </button>
                </div>
              </div>

              <div className="scene-container">
                <LiftoffCanvas
                  state={state}
                  vehicle={vehicle}
                  samples={samples}
                  viewMode={viewMode}
                  showGuidance={showGuidance}
                  showComposite={showComposite}
                  language={language}
                />

                <div className="scene-top-left">
                  <span className="scene-tag">
                    {demo
                      ? t('自动驾驶示范中', 'AUTOPILOT DEMO')
                      : `${vehicle.name[language].split('·')[0]} · ${state.phase.toUpperCase()}`}
                  </span>
                  <span className="scene-subtag">{vehicle.launchSite[language]}</span>
                </div>

                <div className="scene-top-right">
                  <span
                    className={`flight-state ${
                      state.status === 'failed' ? 'failed' : running ? 'live' : ''
                    }`}
                  >
                    <i />
                    {demo
                      ? t('自动示范', 'AUTOPILOT')
                      : state.status === 'failed'
                      ? t('发射失控', 'LAUNCH FAILED')
                      : running
                      ? t('动力升空中', 'POWERED ASCENT')
                      : state.status === 'success'
                      ? t('成功入轨', 'ORBIT ACHIEVED')
                      : t('发射台待命', 'PAD STANDBY')}
                  </span>
                  <span className="mission-clock">T+ {formatTime(state.time)}</span>
                </div>

                {/* 实时动态教练提示 HUD */}
                {running && state.status === 'flying' && (
                  <div className="scene-hud-guide">
                    <span className="hud-guide-text">
                      {getLiftoffInFlightGuidance(scenario.id, state, t)}
                    </span>
                  </div>
                )}

                {/* 待命说明卡片 */}
                {state.status === 'ready' && (
                  <div className="scene-brief">
                    <div className="scene-brief-header">
                      <span className="eyebrow">{t('🚀 升空任务简报', '🚀 LAUNCH BRIEFING')}</span>
                      <span className="brief-id-tag">0{scenario.id}</span>
                    </div>
                    <h3>{scenario.title[language]}</h3>
                    <p className="brief-objective">{scenario.objective[language]}</p>
                    <div className="brief-action-box">
                      <span className="action-box-title">
                        {t('💡 核心科学词条：', '💡 Core Science Concept: ')}{' '}
                        {scenario.scienceTerm.term[language]}
                      </span>
                      <p className="action-box-text">{scenario.scienceTerm.explanation[language]}</p>
                    </div>
                  </div>
                )}

                {/* 失败提示大浮层（前 3 秒展开展示，分行清晰排版，杜绝重叠碰撞） */}
                {state.status === 'failed' && failureCardVisible && (
                  <div className="scene-failure-overlay">
                    <div className="liftoff-failure-card">
                      <div className="liftoff-failure-header">
                        <span className="liftoff-failure-title">
                          {explainLiftoffFailure(state.reason, t).title}
                        </span>
                        <span className="liftoff-failure-autoclose">
                          ⏱️ {t('3秒后自动折叠以便观察后果', 'Auto-minimizing in 3s')}
                        </span>
                      </div>
                      <p className="liftoff-failure-detail">
                        {explainLiftoffFailure(state.reason, t).detail}
                      </p>
                      <div className="liftoff-failure-tip">
                        <span>{explainLiftoffFailure(state.reason, t).tip}</span>
                      </div>
                      <div className="liftoff-failure-actions">
                        <button className="liftoff-btn-review" onClick={() => setModalType('review')}>
                          🔍 {t('查看诊断分析', 'Diagnosis & Tips')}
                        </button>
                        <button className="liftoff-btn-observe" onClick={() => setFailureCardVisible(false)}>
                          👁️ {t('观察灾难后果', 'Watch Consequence')}
                        </button>
                        <button className="liftoff-btn-retry" onClick={() => startFlight(false)}>
                          🚀 {t('重新发射', 'Retry Launch')} (R)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 失败推演折叠后的轻量状态胶囊（3秒后自动折叠，玩家可清晰观看爆炸/坠海/太空漂浮） */}
                {state.status === 'failed' && !failureCardVisible && (
                  <div className="liftoff-consequence-pill">
                    <span className="consequence-text">
                      {formatLiftoffConsequence(state.consequence, t)}
                    </span>
                    <button
                      type="button"
                      className="consequence-pill-btn"
                      onClick={() => setFailureCardVisible(true)}
                    >
                      {t('查看原因', 'View Reason')}
                    </button>
                    <button
                      type="button"
                      className="consequence-pill-btn consequence-pill-retry"
                      onClick={() => startFlight(false)}
                    >
                      🚀 {t('重飞 (R)', 'Retry')}
                    </button>
                  </div>
                )}
              </div>

              {/* 遥测指标与开始/示范按钮栏 */}
              <div className="telemetry">
                <div className="telemetry-metrics">
                  <Metric
                    label={t('海拔高度', 'ALTITUDE')}
                    value={(state.orbit.altitudeM / 1000).toFixed(2)}
                    unit="km"
                    detail={t(
                      `下程距离 ${(state.orbit.downrangeM / 1000).toFixed(1)} km`,
                      `Downrange ${(state.orbit.downrangeM / 1000).toFixed(1)} km`
                    )}
                  />
                  <Metric
                    label={t('预测远地点 Ap', 'APOAPSIS (Ap)')}
                    value={(state.orbit.apoapsisM / 1000).toFixed(1)}
                    unit="km"
                    accent
                    detail={t(
                      `近地点 Pe ${(state.orbit.periapsisM / 1000).toFixed(1)} km`,
                      `Periapsis Pe ${(state.orbit.periapsisM / 1000).toFixed(1)} km`
                    )}
                  />
                  <Metric
                    label={t('轨道总速度', 'ORBITAL SPEED')}
                    value={state.orbit.orbitalSpeedMs.toFixed(0)}
                    unit="m/s"
                    detail={t(
                      `地表速度 ${state.orbit.surfaceSpeedMs.toFixed(0)} m/s (Mach ${state.mach.toFixed(1)})`,
                      `Surface ${state.orbit.surfaceSpeedMs.toFixed(0)} m/s (Mach ${state.mach.toFixed(1)})`
                    )}
                  />
                  <Metric
                    label={t('推重比 / 过载', 'TWR & G-LOAD')}
                    value={state.twr.toFixed(2)}
                    unit={`(${state.gLoad.toFixed(1)}G)`}
                    detail={t(
                      `全箭总重 ${(state.totalMassKg / 1000).toFixed(1)} 吨`,
                      `Total mass ${(state.totalMassKg / 1000).toFixed(1)} t`
                    )}
                  />
                </div>

                <div className="flight-actions">
                  {state.status === 'ready' || state.status === 'failed' || state.status === 'success' ? (
                    <button className="primary" onClick={() => startFlight(false)}>
                      <Play size={16} />
                      {t('开始训练', 'Start Launch')}
                    </button>
                  ) : running ? (
                    <button className="primary" onClick={pauseFlight}>
                      <Pause size={16} />
                      {t('暂停', 'Pause')}
                    </button>
                  ) : (
                    <button className="primary" onClick={resumeFlight}>
                      <Play size={16} />
                      {t('继续飞行', 'Resume')}
                    </button>
                  )}

                  <button onClick={() => startFlight(true)}>
                    <Sparkles size={15} />
                    {t('观看示范', 'Watch Demo')}
                  </button>

                  <button onClick={() => selectLevel(scenario.id)}>
                    <RotateCcw size={15} />
                    {t('重置任务', 'Reset')}
                  </button>

                  <button onClick={() => setModalType('brief')}>
                    <BookOpen size={15} />
                    {t('攻略', 'Briefing')}
                  </button>
                </div>
              </div>
            </section>

            {/* 移动端控制台面板切换器 */}
            <div className="mobile-console-switcher" role="tablist" aria-label={t('控制台切换', 'Console Switcher')}>
              <button
                type="button"
                role="tab"
                aria-selected={mobileConsoleTab === 'propulsion'}
                className={mobileConsoleTab === 'propulsion' ? 'active' : ''}
                onClick={() => setMobileConsoleTab('propulsion')}
              >
                <Flame size={12} />
                <span>{t('推进系统 & 分离', 'Propulsion & Staging')}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileConsoleTab === 'attitude'}
                className={mobileConsoleTab === 'attitude' ? 'active' : ''}
                onClick={() => setMobileConsoleTab('attitude')}
              >
                <Compass size={12} />
                <span>{t('姿态导航球 & 转向', 'Navball & Steering')}</span>
              </button>
            </div>

            {/* 下方双列控制台：左侧 KSP 级间分离与节流阀，右侧 KSP 导航球与姿态控制 */}
            <div className={`liftoff-lower-console show-${mobileConsoleTab}`}>
              {/* 左面板：多级火箭燃料栈与油门/分离 */}
              <div className="ksp-panel" data-testid="ksp-propulsion-panel">
                <div className="ksp-panel-header">
                  <h3>
                    <Flame size={16} color="var(--lime)" />
                    <span>{t('多级推进系统与级间分离 (Staging & Throttle)', 'Multi-Stage Propulsion & Staging')}</span>
                  </h3>
                  <span className="ksp-panel-sub">
                    {t(
                      `当前推力 ${(state.thrustN / 1000).toFixed(0)} kN · 比冲 ${state.effectiveIspS.toFixed(0)} s`,
                      `Thrust ${(state.thrustN / 1000).toFixed(0)} kN · Isp ${state.effectiveIspS.toFixed(0)} s`
                    )}
                  </span>
                </div>

                <div className="ksp-propulsion-body">
                  {/* 多级推进剂状态柱（自上而下显示第3级 -> 第2级 -> 第1级） */}
                  <div className="ksp-stage-stack">
                    {[...state.stages].reverse().map((st) => {
                      const idx = st.stageNumber - 1;
                      const isActive = idx === state.activeStageIndex;
                      const pct =
                        st.maxFuelMassKg > 0 ? (st.fuelMassKg / st.maxFuelMassKg) * 100 : 0;
                      const stageCfg = vehicle.stages[idx];
                      return (
                        <div
                          key={st.code}
                          className={`ksp-stage-card ${
                            isActive ? 'active-stage' : st.separated ? 'separated-stage' : ''
                          }`}
                        >
                          <div className="stage-card-top">
                            <strong>
                              {st.stageNumber}级 · {st.code}
                            </strong>
                            <span
                              className={`stage-badge ${
                                st.separated
                                  ? ''
                                  : isActive && pct <= 0.1
                                  ? 'meco'
                                  : isActive
                                  ? 'burning'
                                  : ''
                              }`}
                            >
                              {st.separated
                                ? t('已抛离', 'SEPARATED')
                                : isActive && pct <= 0.1
                                ? t('🔥 燃料耗尽 MECO · 快按空格分离！', 'MECO · PRESS SPACE!')
                                : isActive
                                ? t('当前工作级', 'ACTIVE')
                                : t('待命', 'STANDBY')}
                            </span>
                          </div>
                          <div className="stage-fuel-track">
                            <div className="stage-fuel-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="stage-card-meta">
                            <span>
                              {t('燃料:', 'Fuel:')} {(st.fuelMassKg / 1000).toFixed(1)}t /{' '}
                              {(st.maxFuelMassKg / 1000).toFixed(0)}t ({pct.toFixed(0)}%)
                            </span>
                            <span>
                              {t('空壳死重:', 'Dry:')} {(st.dryMassKg / 1000).toFixed(1)}t
                              {stageCfg ? ` · Isp ${stageCfg.ispVacuumS}s` : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 右列：节流阀油门滑块 + 空格分离大按钮 + 逃逸塔按钮 */}
                  <div className="ksp-throttle-col">
                    <div className="throttle-box">
                      <div className="throttle-header">
                        <span>
                          <Gauge size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                          {t('节流阀油门 (Throttle)', 'Throttle')}
                        </span>
                        <strong>{(state.throttle * 100).toFixed(0)}%</strong>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(state.throttle * 100)}
                        onChange={(e) => handleSetThrottle(Number(e.target.value) / 100)}
                        className="throttle-slider"
                        aria-label={t('节流阀油门滑块', 'Throttle slider')}
                      />
                      <div className="throttle-quick-btns">
                        <button type="button" onClick={() => handleSetThrottle(1.0)}>
                          🔥 {t('满油门 [Z]', '100% [Z]')}
                        </button>
                        <button type="button" onClick={() => handleSetThrottle(0.0)}>
                          🛑 {t('关机 [X]', 'Cut [X]')}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`ksp-stage-trigger-btn ${
                        isMecoReady || isPadLaunchReady ? 'ready-highlight' : ''
                      }`}
                      onClick={handleTriggerStage}
                    >
                      <Zap size={16} />
                      <span>
                        {!state.clampsReleased
                          ? t('STAGE 解锁发射台升空 [Space]', 'STAGE · RELEASE CLAMPS [Space]')
                          : t('STAGE 级间分离 / 下一级 [Space]', 'STAGE · SEPARATION [Space]')}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="ksp-les-btn"
                      disabled={state.towerJettisoned || !state.clampsReleased}
                      onClick={handleJettisonTower}
                    >
                      <Layers3 size={14} />
                      <span>
                        {state.towerJettisoned
                          ? t('逃逸塔已抛离 (-4.0t)', 'LES Jettisoned (-4.0t)')
                          : t('抛离救生逃逸塔 [J]', 'Jettison LES Tower [J]')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 右面板：KSP 导航球与姿态控制 */}
              <KspNavball
                state={state}
                vehicle={vehicle}
                language={language}
                onSetSas={handleSetSas}
                onSteerPitch={handleSteerPitch}
              />
            </div>
          </>
        )}
      </main>

      {/* 弹窗 1：本关攻略与科学解释 */}
      {modalType === 'brief' && (
        <Modal
          title={t('升空通关攻略', 'Ascent Mission Briefing')}
          onClose={() => setModalType('none')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, color: 'var(--lime)' }}>
              0{scenario.id} · {scenario.title[language]}
            </h3>
            <p style={{ margin: 0, lineHeight: 1.65 }}>{scenario.brief[language]}</p>

            <div className="zero-science-box">
              <div className="zero-science-title">
                <Sparkles size={15} />
                <span>{scenario.scienceTerm.term[language]}</span>
              </div>
              <p className="zero-science-body">{scenario.scienceTerm.explanation[language]}</p>
            </div>

            <div className="intro-card">
              <strong>{t('🕹️ 教官操作要领', '🕹️ Flight Instructor Tips')}</strong>
              <p>{scenario.lesson[language]}</p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => startFlight(false)}
              >
                <Rocket size={15} />
                <span>{t('立即开始发射', 'Launch Now')}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 弹窗 2：飞行复盘报告 (成功或失败) */}
      {modalType === 'review' && (
        <Modal
          title={
            state.status === 'success'
              ? t('🎉 升空阶段任务圆满完成！', '🎉 Ascent Mission Accomplished!')
              : t('📋 升空飞行复盘诊断', '📋 Ascent Flight Debrief')
          }
          onClose={() => setModalType('none')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {state.status === 'success' ? (
              <div className="intro-card" style={{ borderColor: 'rgba(184, 245, 102, 0.45)' }}>
                <strong style={{ color: 'var(--lime)' }}>
                  {demo
                    ? t('✨ 自动驾驶示范完成！现在轮到你亲自操纵火箭升空了！', '✨ Autopilot demo complete! Now try flying it yourself!')
                    : t('🏆 太棒了！你精准掌握了本阶段的火箭动力学要领！', '🏆 Outstanding! You mastered the rocket physics of this stage!')}
                </strong>
                <p>{scenario.lesson[language]}</p>
              </div>
            ) : (
              <div className="intro-card" style={{ borderColor: 'rgba(255, 92, 92, 0.45)' }}>
                <strong style={{ color: '#ff7b7b' }}>
                  {explainLiftoffFailure(state.reason, t).title}
                </strong>
                <p>{explainLiftoffFailure(state.reason, t).detail}</p>
                <p style={{ marginTop: 6, color: 'var(--lime)' }}>
                  {explainLiftoffFailure(state.reason, t).tip}
                </p>
              </div>
            )}

            {/* 核心飞行遥测汇总 */}
            <div className="zero-specs-grid">
              <div className="zero-spec-cell">
                <span className="zero-spec-label">{t('最终海拔 / 远地点 Ap', 'ALTITUDE / APOAPSIS')}</span>
                <span className="zero-spec-val">
                  {(state.orbit.altitudeM / 1000).toFixed(1)} km / Ap {(state.orbit.apoapsisM / 1000).toFixed(1)} km
                </span>
              </div>
              <div className="zero-spec-cell">
                <span className="zero-spec-label">{t('近地点 Pe / 轨道速度', 'PERIAPSIS / ORBIT SPEED')}</span>
                <span className="zero-spec-val">
                  Pe {(state.orbit.periapsisM / 1000).toFixed(1)} km / {state.orbit.orbitalSpeedMs.toFixed(0)} m/s
                </span>
              </div>
              <div className="zero-spec-cell">
                <span className="zero-spec-label">{t('经历最大动压峰值 Max-Q', 'PEAK MAX-Q EXPERIENCED')}</span>
                <span className="zero-spec-val">
                  {(state.maxQRecordedPa / 1000).toFixed(1)} kPa
                </span>
              </div>
              <div className="zero-spec-cell">
                <span className="zero-spec-label">{t('当前工作级 / 过载', 'ACTIVE STAGE / G-LOAD')}</span>
                <span className="zero-spec-val">
                  Stage {state.activeStageIndex + 1} · {state.gLoad.toFixed(2)} G
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => startFlight(false)}
              >
                <RotateCcw size={15} />
                <span>{t('再飞一次', 'Fly Again')}</span>
              </button>

              {state.status === 'success' && scenario.id < 4 && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => selectLevel(scenario.id + 1)}
                >
                  <span>
                    {t(`进入第 ${scenario.id + 1} 关`, `Next: Mission 0${scenario.id + 1}`)}
                  </span>
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 弹窗 3：青少年火箭专业词汇百科 */}
      {modalType === 'glossary' && (
        <Modal
          title={t('📖 青少年火箭升空专业词汇通俗百科', '📖 Teen Rocket Science Glossary')}
          onClose={() => setModalType('none')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {LIFTOFF_GLOSSARY.map((item) => (
              <div key={item.id} className="intro-card">
                <strong style={{ color: 'var(--lime)' }}>{item.term[language]}</strong>
                <small style={{ display: 'block', color: '#9cb0a4', marginBottom: 4 }}>
                  {item.shortDesc[language]}
                </small>
                <p style={{ margin: 0 }}>{item.teenExplanation[language]}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
