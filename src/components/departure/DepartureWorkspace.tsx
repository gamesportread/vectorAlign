import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crosshair,
  DoorClosed,
  DoorOpen,
  Layers,
  Layers3,
  MapPin,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target
} from 'lucide-react';
import { HOME_MISSIONS } from '../../data/homeMissions';
import {
  createDepartureState,
  DEPARTURE_DT,
  DEPARTURE_GLOSSARY,
  DEPARTURE_SCENARIOS,
  departureAutopilot,
  emptyDepartureCommand,
  getDepartureScenario,
  KEEP_OUT_ZONE_M,
  sampleDeparture,
  stepDeparture,
  type DepartureCommand,
  type DepartureSample,
  type DepartureState
} from '../../sim/departure';
import { FixedStepper } from '../../sim/engine';
import { tone, useSession } from '../../store';
import { formatTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { TASK_CAMERA_HINT_TEXT } from '../scene/taskCameraConfig';
import { DepartureScene3D } from './DepartureScene3D';
import '../liftoff/liftoff.css';
import '../views/mission-zero.css';

export interface DepartureWorkspaceProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function DepartureWorkspace({
  isOpenMobile,
  onCloseMobile
}: DepartureWorkspaceProps) {
  const language = useSession((s) => s.language);
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  const [activeLevel, setActiveLevel] = useState<number>(0);
  const [scenarioId, setScenarioId] = useState<number>(1);
  const scenario = getDepartureScenario(scenarioId);

  const [state, setState] = useState<DepartureState>(() => createDepartureState(scenario));
  const [running, setRunning] = useState(false);
  const [demo, setDemo] = useState(false);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'side' | 'pilot'>('orbit');
  const [showGuidance, setShowGuidance] = useState(true);
  const [timeWarp, setTimeWarp] = useState<1 | 2 | 4>(1);
  const [modalType, setModalType] = useState<'none' | 'glossary' | 'review'>('none');

  const runtimeRef = useRef({
    scenario,
    state: createDepartureState(scenario),
    command: emptyDepartureCommand(),
    heldKeys: new Set<string>(),
    running: false,
    demo: false,
    timeWarp: 1 as 1 | 2 | 4,
    samples: [] as DepartureSample[],
    lastSampleTime: 0,
    stepper: new FixedStepper()
  });

  const selectScenario = (id: number) => {
    const cfg = getDepartureScenario(id);
    const init = createDepartureState(cfg);
    runtimeRef.current.scenario = cfg;
    runtimeRef.current.state = init;
    runtimeRef.current.command = emptyDepartureCommand();
    runtimeRef.current.heldKeys.clear();
    runtimeRef.current.running = false;
    runtimeRef.current.demo = false;
    runtimeRef.current.samples = [];
    runtimeRef.current.lastSampleTime = 0;
    runtimeRef.current.stepper.reset();

    setScenarioId(id);
    setState(init);
    setRunning(false);
    setDemo(false);
    setModalType('none');
  };

  const startFlight = (isDemo = false) => {
    tone(true);
    const cfg = runtimeRef.current.scenario;
    const init: DepartureState = {
      ...createDepartureState(cfg),
      status: 'flying'
    };
    runtimeRef.current.state = init;
    runtimeRef.current.command = emptyDepartureCommand();
    runtimeRef.current.heldKeys.clear();
    runtimeRef.current.running = true;
    runtimeRef.current.demo = isDemo;
    runtimeRef.current.samples = [sampleDeparture(init)];
    runtimeRef.current.lastSampleTime = 0;
    runtimeRef.current.stepper.reset();

    setState(init);
    setRunning(true);
    setDemo(isDemo);
    setModalType('none');
  };

  const triggerReleaseLatches = () => {
    tone(true);
    if (!runtimeRef.current.running) {
      startFlight(false);
    }
    runtimeRef.current.command.releaseLatches = true;
  };

  const triggerToggleNosecone = () => {
    tone(true);
    runtimeRef.current.command.toggleNosecone = true;
  };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let publish = 0;

    const rebuildContinuousCmd = (cmd: DepartureCommand, keys: Set<string>) => {
      cmd.translation = [0, 0, 0];
      cmd.rotation = [0, 0, 0];
      cmd.assistBrake = keys.has('KeyB') || keys.has('ShiftLeft') || keys.has('ShiftRight');

      if (keys.has('KeyA')) cmd.translation[0] -= 1;
      if (keys.has('KeyD')) cmd.translation[0] += 1;
      if (keys.has('KeyW')) cmd.translation[1] += 1;
      if (keys.has('KeyS')) cmd.translation[1] -= 1;
      if (keys.has('KeyR')) cmd.translation[2] -= 1;
      if (keys.has('KeyF')) cmd.translation[2] += 1;

      if (keys.has('ArrowUp')) cmd.rotation[0] -= 1;
      if (keys.has('ArrowDown')) cmd.rotation[0] += 1;
      if (keys.has('ArrowLeft')) cmd.rotation[1] -= 1;
      if (keys.has('ArrowRight')) cmd.rotation[1] += 1;
      if (keys.has('KeyQ')) cmd.rotation[2] += 1;
      if (keys.has('KeyE')) cmd.rotation[2] -= 1;
    };

    const loop = (now: number) => {
      const dtReal = Math.min(0.1, (now - last) / 1000);
      last = now;
      const rt = runtimeRef.current;

      if (rt.running && rt.state.status === 'flying') {
        if (!rt.demo && rt.heldKeys.size > 0) {
          rebuildContinuousCmd(rt.command, rt.heldKeys);
        }
        const scaledDt = dtReal * rt.timeWarp;
        rt.stepper.advance(scaledDt, () => {
          if (rt.state.status !== 'flying') return;
          const activeCmd = rt.demo
            ? departureAutopilot(rt.state, rt.scenario)
            : rt.command;

          rt.state = stepDeparture(rt.state, activeCmd, rt.scenario, DEPARTURE_DT);
          rt.command.releaseLatches = false;
          rt.command.toggleNosecone = false;

          if (rt.state.time - rt.lastSampleTime >= 0.5) {
            rt.samples.push(sampleDeparture(rt.state));
            rt.lastSampleTime = rt.state.time;
          }

          if (rt.state.status === 'success' || rt.state.status === 'failed') {
            rt.running = false;
            setRunning(false);
            if (rt.state.status === 'success' && !rt.demo) {
              setCompletedIds((prev) =>
                prev.includes(rt.scenario.id) ? prev : [...prev, rt.scenario.id]
              );
            }
            setState({ ...rt.state });
            setModalType('review');
          }
        });

        if (now - publish > 75) {
          setState({ ...rt.state });
          publish = now;
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => {
      if (activeLevel === 0) return;
      if ((e.target as HTMLElement)?.closest('input,select,textarea')) return;

      const rt = runtimeRef.current;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!rt.state.latchesReleased) {
          triggerReleaseLatches();
        } else {
          rt.heldKeys.add('KeyB');
        }
        return;
      }
      if (e.code === 'Digit1' || e.key === '1') {
        e.preventDefault();
        triggerToggleNosecone();
        return;
      }
      if (
        [
          'KeyW',
          'KeyS',
          'KeyA',
          'KeyD',
          'KeyR',
          'KeyF',
          'KeyQ',
          'KeyE',
          'KeyB',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight'
        ].includes(e.code)
      ) {
        e.preventDefault();
        rt.heldKeys.add(e.code);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const rt = runtimeRef.current;
      if (e.code === 'Space') {
        rt.heldKeys.delete('KeyB');
      }
      if (rt.heldKeys.has(e.code)) {
        rt.heldKeys.delete(e.code);
        rt.command.translation = [0, 0, 0];
        rt.command.rotation = [0, 0, 0];
        rt.command.assistBrake = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeLevel]);

  const holdNudge = (axis: 'tx' | 'rot', idx: 0 | 1 | 2, val: number) => {
    const rt = runtimeRef.current;
    if (axis === 'tx') rt.command.translation[idx] = val;
    else rt.command.rotation[idx] = val;
  };

  const missionMeta = HOME_MISSIONS[2]; // 3 太空站离开

  const failLabel = (reason?: string) => {
    switch (reason) {
      case 'plume_contamination':
        return t(
          '⚠️ 羽流禁火区违规！在距离空间站 5 米以内点燃了前后推进器，高温燃气污染了空间站帆板与光学镜头！',
          '⚠️ Plume Keep-Out Violation! Fired axial thrusters within 5 m of the station, contaminating optics and solar panels!'
        );
      case 'corridor_breach':
        return t(
          '⚠️ 偏出撤离安全走廊！飞船横向偏移超出圆锥走廊边界，存在擦碰空间站太阳能帆板风险！',
          '⚠️ Departure Corridor Breach! Drifted outside the safety cone toward the solar arrays!'
        );
      case 'station_collision':
        return t(
          '⚠️ 反向撞击空间站！飞船倒退不足并向空间站反冲发生碰撞。',
          '⚠️ Station Collision! Moved forward into the docking structure.'
        );
      case 'attitude_lost':
        return t(
          '⚠️ 姿态偏角过大！机头激光雷达丢失空间站靶心锁定（偏差 > 25°）。',
          '⚠️ Attitude Lock Lost! Nose lidar lost lock on the station target (> 25°).'
        );
      default:
        return t('⚠️ 撤离超时或超出安全限速。', '⚠️ Departure timed out or exceeded speed limit.');
    }
  };

  return (
    <>
      <aside
        className={`lesson-rail ${isOpenMobile ? 'open' : ''}`}
        aria-label={t('太空站离开训练大纲', 'Station Departure Curriculum')}
      >
        <div className="rail-head">
          <div>
            <span className="eyebrow">{t('任务 03 · 撤离训练大纲', 'MISSION 03 · DEPARTURE')}</span>
            <h2>{t('太空站安全撤离', 'Station Safe Departure')}</h2>
          </div>
          <span className="progress-pill">{completedIds.length}/4</span>
        </div>

        <div className="mission-list">
          <button
            className={`mission-card level-zero-card ${activeLevel === 0 ? 'selected' : ''}`}
            onClick={() => {
              runtimeRef.current.running = false;
              setRunning(false);
              setActiveLevel(0);
              onCloseMobile();
            }}
          >
            <span className="mission-index">00</span>
            <span className="mission-text">
              <strong>{t('任务通识 · 弹簧推离与撤离走廊', 'Stage Briefing · Undocking Laws')}</strong>
              <small>{t('为什么刚撤离绝对不能开火箭喷火？', 'Why thrusters are forbidden near the port')}</small>
            </span>
          </button>

          {DEPARTURE_SCENARIOS.map((sc) => {
            const done = completedIds.includes(sc.id);
            const selected = activeLevel === sc.id;
            return (
              <button
                key={sc.id}
                className={`mission-card ${selected ? 'selected' : ''} ${done ? 'done' : ''}`}
                onClick={() => {
                  selectScenario(sc.id);
                  setActiveLevel(sc.id);
                  onCloseMobile();
                }}
              >
                <span className="mission-index">0{sc.id}</span>
                <span className="mission-text">
                  <strong>{sc.title[language]}</strong>
                  <small>{sc.passCriteria[language]}</small>
                </span>
                {done && <CheckCircle2 size={16} className="done-icon" />}
              </button>
            );
          })}
        </div>

        <button className="free-button" onClick={() => setModalType('glossary')}>
          <Sparkles size={16} />
          <span>{t('撤离科普词典 (青少年必读)', 'Departure Science Glossary')}</span>
          <small>{t('弹簧推离 / 羽流禁火区 / 安全走廊', 'Springs / Plume Zone / Corridor')}</small>
        </button>
      </aside>

      <main>
        {activeLevel === 0 ? (
          <div className="mission-zero-container" data-testid="departure-zero-view">
            <header className="mission-zero-header">
              <div className="mission-zero-title-group">
                <div className="breadcrumb">
                  {t('太空站离开训练', 'STATION DEPARTURE')}
                  <ChevronRight size={12} />
                  <span>{t('第零关 · 阶段通识与安全走廊导引', 'LEVEL 00 · UNDOCKING & SAFETY CORRIDOR')}</span>
                </div>
                <h1>
                  <span>00</span>
                  <span>{t('任务通识 · 太空站离开', 'Stage Briefing · Station Departure')}</span>
                  <span className="mission-zero-pill">{t('新手必读', 'FOUNDATION')}</span>
                </h1>
                <p className="mission-zero-subtitle">
                  {t(
                    '🎯 阶段认知目标：掌握机械弹簧无动力推离、0~5 米羽流禁火保护区、圆锥形安全撤离走廊与再入前头锥闭合规程。',
                    '🎯 Orientation goal: Master mechanical spring push-off, the 0–5 m plume keep-out zone, conical safety corridor, and reentry nosecone closure.'
                  )}
                </p>
              </div>
            </header>

            <div className="mission-zero-grid">
              <div className="zero-card">
                <div className="zero-card-head">
                  <BookOpen size={16} />
                  <h3>{t('任务要素档案', 'Mission Phase Profile')}</h3>
                </div>
                <div className="zero-specs-list">
                  <div className="zero-spec-item">
                    <Clock size={15} />
                    <div>
                      <small>{t('撤离窗口时间', 'Undocking Window')}</small>
                      <strong>{t(missionMeta.specs.timeZh, missionMeta.specs.timeEn)}</strong>
                    </div>
                  </div>
                  <div className="zero-spec-item">
                    <Layers size={15} />
                    <div>
                      <small>{t('标准撤离四步曲', '4-Step Undocking Sequence')}</small>
                      <strong>{t(missionMeta.specs.stageZh, missionMeta.specs.stageEn)}</strong>
                    </div>
                  </div>
                  <div className="zero-spec-item">
                    <MapPin size={15} />
                    <div>
                      <small>{t('空间位置与高度', 'Orbital Location')}</small>
                      <strong>{t(missionMeta.specs.locationZh, missionMeta.specs.locationEn)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="zero-card">
                <div className="zero-card-head">
                  <Sparkles size={16} />
                  <h3>{t(missionMeta.scienceTip.termZh, missionMeta.scienceTip.termEn)}</h3>
                </div>
                <p style={{ lineHeight: 1.75, color: '#c4d6cc', fontSize: 14 }}>
                  {t(missionMeta.scienceTip.explanationZh, missionMeta.scienceTip.explanationEn)}
                </p>
                <div className="zero-glossary-mini" style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  {DEPARTURE_GLOSSARY.map((g) => (
                    <div
                      key={g.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'rgba(15, 28, 36, 0.65)',
                        border: '1px solid rgba(184, 245, 102, 0.18)'
                      }}
                    >
                      <strong style={{ color: '#b8f566', fontSize: 13 }}>{g.term[language]}</strong>
                      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#b8ccc2' }}>
                        {g.short[language]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="zero-cta-bar" style={{ marginTop: 18 }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  selectScenario(1);
                  setActiveLevel(1);
                }}
              >
                <span>{t('开始第 1 关训练：锁钩轻释与弹簧推离', 'Start Level 1: Latch Release & Spring Push-off')}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="mission-view liftoff-mission-view">
            <div className="mission-header">
              <div className="mission-title-bar">
                <span className="eyebrow">
                  {scenario.code} · {scenario.subtitle[language]}
                </span>
                <h1>
                  <span>0{scenario.id}</span>
                  {scenario.title[language]}
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

            <section className="simulator" aria-label={t('太空站离开模拟器', 'Station Departure Simulator')}>
              <div className="scene-toolbar">
                <div className="view-switch">
                  {(['orbit', 'side', 'pilot'] as const).map((v, idx) => (
                    <button
                      key={v}
                      className={cameraMode === v ? 'active' : ''}
                      onClick={() => setCameraMode(v)}
                    >
                      {[<Orbit size={15} key="o" />, <Layers3 size={15} key="s" />, <Crosshair size={15} key="p" />][idx]}
                      {[t('外部视角', 'Orbit View'), t('走廊侧视图', 'Corridor Side'), t('机头雷达视角', 'Nose Lidar')][idx]}
                    </button>
                  ))}
                </div>

                <div className="scene-tools">
                  <div className="time-warp-group">
                    <span className="time-warp-label">{t('倍速', 'Warp')}</span>
                    {([1, 2, 4] as const).map((w) => (
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
                    className={`hatch-btn ${state.noseconeClosed ? 'enabled' : ''}`}
                    onClick={triggerToggleNosecone}
                  >
                    {state.noseconeClosed ? <DoorClosed size={15} /> : <DoorOpen size={15} />}
                    <span>
                      {state.noseconeClosed
                        ? t('头锥: 已闭合 [1]', 'Nosecone: CLOSED [1]')
                        : t('头锥: 开启中 [1]', 'Nosecone: OPEN [1]')}
                    </span>
                  </button>

                  <button
                    className={showGuidance ? 'enabled' : ''}
                    onClick={() => setShowGuidance((v) => !v)}
                  >
                    <Crosshair size={15} />
                    <span>{t('走廊引导环', 'Corridor Rings')}</span>
                  </button>

                  <button onClick={() => setModalType('glossary')}>
                    <Sparkles size={15} />
                    <span>{t('词条科普', 'Glossary')}</span>
                  </button>
                </div>
              </div>

              <div className="scene-container">
                <DepartureScene3D
                  state={state}
                  scenarioId={scenario.id}
                  cameraMode={cameraMode}
                  showGuidance={showGuidance}
                  language={language}
                />

                <div className="scene-top-left">
                  <span className="scene-tag">
                    {state.inKeepOutZone
                      ? t('⚠️ 0~5m 羽流禁火保护区 (严禁 F/R 点火)', '⚠️ 0–5m PLUME KEEP-OUT ZONE (NO F/R BURN)')
                      : t('✅ 已越过 5m 禁火线 · 安全撤离走廊', '✅ CLEAR OF 5m ZONE · DEPARTURE CORRIDOR')}
                  </span>
                  <span className="scene-subtag">
                    {t(
                      `走廊允许半径 ±${state.corridorRadiusM.toFixed(2)}m · 当前横偏 ${state.lateralOffsetM.toFixed(2)}m`,
                      `Corridor Radius ±${state.corridorRadiusM.toFixed(2)}m · Offset ${state.lateralOffsetM.toFixed(2)}m`
                    )}
                  </span>
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
                      ? t('撤离异常', 'ABORTED')
                      : running
                      ? t('正在撤离', 'UNDOCKING')
                      : state.status === 'success'
                      ? t('撤离完成', 'CLEARED')
                      : t('锁紧待命', 'DOCKED')}
                  </span>
                  <span className="mission-clock">T+ {formatTime(state.time)}</span>
                </div>

                {state.status === 'ready' && (
                  <div className="scene-brief">
                    <div className="scene-brief-header">
                      <span className="eyebrow">{t('🛰️ 太空站离开简报', '🛰️ UNDOCKING BRIEFING')}</span>
                      <span className="brief-id-tag">0{scenario.id}</span>
                    </div>
                    <h3>{scenario.title[language]}</h3>
                    <p className="brief-objective">{scenario.objective[language]}</p>
                    <div className="brief-action-box">
                      <span className="action-box-title">
                        {t('💡 科学词条：', '💡 Science Concept: ')}{' '}
                        {scenario.scienceTerm.term[language]}
                      </span>
                      <p className="action-box-text">{scenario.scienceTerm.explanation[language]}</p>
                    </div>
                  </div>
                )}

                <div className="scene-bottom-left">
                  <span className="axis-symbol">⌖</span>
                  <span>
                    {cameraMode === 'pilot'
                      ? t('机头激光测距相机', 'NOSE LIDAR CAMERA')
                      : TASK_CAMERA_HINT_TEXT[language]}
                  </span>
                </div>
              </div>

              {/* 底部遥测数据与操控台 */}
              <div className="liftoff-cockpit-deck">
                <div className="liftoff-telemetry-grid">
                  <div className="metric">
                    <span>{t('距对接口距离', 'Port Distance')}</span>
                    <strong>{state.position[2].toFixed(2)} m</strong>
                    <small>
                      {state.position[2] < KEEP_OUT_ZONE_M
                        ? t('5m 禁火区内', 'Inside 5m Keep-Out')
                        : t('安全走廊内', 'Corridor Clear')}
                    </small>
                  </div>
                  <div className="metric">
                    <span>{t('后退分离速度', 'Separation Speed')}</span>
                    <strong>{state.velocity[2].toFixed(2)} m/s</strong>
                    <small>{t('正值=远离空间站', '+ Away from Station')}</small>
                  </div>
                  <div className="metric">
                    <span>{t('走廊横向偏移', 'Corridor Offset')}</span>
                    <strong>{state.lateralOffsetM.toFixed(2)} m</strong>
                    <small>{t(`横漂速度 ${state.lateralSpeedMs.toFixed(2)} m/s`, `Drift ${state.lateralSpeedMs.toFixed(2)} m/s`)}</small>
                  </div>
                  <div className="metric">
                    <span>{t('激光对准误差', 'Lidar Attitude Err')}</span>
                    <strong>{state.attitudeErrorDeg.toFixed(1)}°</strong>
                    <small>{t('需保持 ≤ 2.0°', 'Target ≤ 2.0°')}</small>
                  </div>
                </div>

                <div className="liftoff-action-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {!running && state.status === 'ready' && (
                    <button className="primary-button" onClick={() => startFlight(false)}>
                      <Play size={15} />
                      <span>{t('开始撤离训练', 'Start Departure')}</span>
                    </button>
                  )}

                  {running && (
                    <button
                      className="secondary-button"
                      onClick={() => {
                        runtimeRef.current.running = false;
                        setRunning(false);
                      }}
                    >
                      <Pause size={15} />
                      <span>{t('暂停', 'Pause')}</span>
                    </button>
                  )}

                  <button
                    className={`stage-fire-btn ${!state.latchesReleased ? 'ready-pulse' : ''}`}
                    onClick={triggerReleaseLatches}
                    disabled={state.latchesReleased}
                  >
                    <span>
                      {state.latchesReleased
                        ? t('✅ 锁钩已释放 (弹簧已推离)', '✅ Latches Released')
                        : t('🔓 [Space] 解锁钩 · 弹簧推离', '🔓 [Space] Release Latches & Spring Push')}
                    </span>
                  </button>

                  <button
                    className="secondary-button"
                    onMouseDown={() => holdNudge('tx', 2, 1)}
                    onMouseUp={() => holdNudge('tx', 2, 0)}
                    onClick={() => {
                      if (!runtimeRef.current.running) startFlight(false);
                    }}
                  >
                    <span>{t('后退加速 [F]', 'Back Up [F]')}</span>
                  </button>

                  <button
                    className="secondary-button"
                    onMouseDown={() => holdNudge('tx', 2, -1)}
                    onMouseUp={() => holdNudge('tx', 2, 0)}
                  >
                    <span>{t('制动减速 [R]', 'Brake [R]')}</span>
                  </button>

                  <button
                    className="secondary-button"
                    onMouseDown={() => {
                      runtimeRef.current.command.assistBrake = true;
                    }}
                    onMouseUp={() => {
                      runtimeRef.current.command.assistBrake = false;
                    }}
                  >
                    <span>{t('阻尼稳姿/消横漂 [B]', 'Damp Drift & Attitude [B]')}</span>
                  </button>

                  <button className="secondary-button" onClick={() => startFlight(true)}>
                    <span>{t('观看示范', 'Watch Demo')}</span>
                  </button>

                  <button className="secondary-button" onClick={() => selectScenario(scenario.id)}>
                    <RotateCcw size={15} />
                    <span>{t('重置本关', 'Reset')}</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {modalType === 'glossary' && (
        <Modal
          title={t('太空站安全撤离科普词典', 'Station Departure Science Glossary')}
          onClose={() => setModalType('none')}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            {DEPARTURE_GLOSSARY.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: 'rgba(15, 25, 32, 0.7)',
                  border: '1px solid rgba(184, 245, 102, 0.2)'
                }}
              >
                <h4 style={{ margin: '0 0 6px', color: '#b8f566' }}>{item.term[language]}</h4>
                <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 13 }}>
                  {item.short[language]}
                </p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: '#b8ccc2' }}>
                  {item.detail[language]}
                </p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modalType === 'review' && (
        <Modal
          title={
            state.status === 'success'
              ? t('🎉 太空站安全撤离成功！', '🎉 Station Departure Complete!')
              : t('⚠️ 撤离任务复盘诊断', '⚠️ Departure Debrief')
          }
          onClose={() => setModalType('none')}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            {state.status === 'success' ? (
              <p style={{ color: '#b8f566', fontSize: 15, fontWeight: 600, margin: 0 }}>
                {t(
                  `太棒了！你成功遵循真实航天撤离规程，完成了【${scenario.title.zh}】！`,
                  `Excellent! You followed real orbital undocking protocol and completed [${scenario.title.en}]!`
                )}
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.14)',
                  border: '1px solid rgba(239, 68, 68, 0.4)'
                }}
              >
                <ShieldAlert size={20} color="#f87171" />
                <span style={{ fontSize: 13.5, lineHeight: 1.6 }}>{failLabel(state.failReason)}</span>
              </div>
            )}

            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'rgba(20, 34, 42, 0.75)',
                border: '1px solid rgba(77, 226, 209, 0.25)'
              }}
            >
              <strong style={{ color: '#4de2d1', fontSize: 13 }}>
                💡 {scenario.scienceTerm.term[language]}
              </strong>
              <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.65, color: '#c4d6cc' }}>
                {scenario.scienceTerm.explanation[language]}
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="secondary-button" onClick={() => selectScenario(scenario.id)}>
                <span>{t('再练一次', 'Retry Mission')}</span>
              </button>
              {state.status === 'success' && scenario.id < 4 && (
                <button
                  className="primary-button"
                  onClick={() => {
                    selectScenario(scenario.id + 1);
                    setActiveLevel(scenario.id + 1);
                  }}
                >
                  <span>{t('进入下一关', 'Next Mission')}</span>
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
