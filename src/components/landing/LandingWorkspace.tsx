import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Layers,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target
} from 'lucide-react';
import { HOME_MISSIONS } from '../../data/homeMissions';
import {
  createLandingState,
  emptyLandingCommand,
  getLandingScenario,
  LANDING_DT,
  LANDING_GLOSSARY,
  LANDING_SCENARIOS,
  landingAutopilot,
  sampleLanding,
  stepLanding,
  type LandingSample,
  type LandingState
} from '../../sim/landing';
import { FixedStepper } from '../../sim/engine';
import { tone, useSession } from '../../store';
import { formatTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { TASK_CAMERA_HINT_TEXT } from '../scene/taskCameraConfig';
import { LandingScene3D } from './LandingScene3D';
import '../liftoff/liftoff.css';
import '../views/mission-zero.css';

export interface LandingWorkspaceProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function LandingWorkspace({
  isOpenMobile,
  onCloseMobile
}: LandingWorkspaceProps) {
  const language = useSession((s) => s.language);
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  const [activeLevel, setActiveLevel] = useState<number>(0);
  const [scenarioId, setScenarioId] = useState<number>(1);
  const scenario = getLandingScenario(scenarioId);

  const [state, setState] = useState<LandingState>(() => createLandingState(scenario));
  const [running, setRunning] = useState(false);
  const [demo, setDemo] = useState(false);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [timeWarp, setTimeWarp] = useState<1 | 2 | 4>(1);
  const [sasEnabled, setSasEnabled] = useState(false);
  const [modalType, setModalType] = useState<'none' | 'glossary' | 'review'>('none');

  const runtimeRef = useRef({
    scenario,
    state: createLandingState(scenario),
    command: emptyLandingCommand(),
    heldKeys: new Set<string>(),
    running: false,
    demo: false,
    timeWarp: 1 as 1 | 2 | 4,
    samples: [] as LandingSample[],
    lastSampleTime: 0,
    stepper: new FixedStepper()
  });

  const selectScenario = (id: number) => {
    const cfg = getLandingScenario(id);
    const init = createLandingState(cfg);
    runtimeRef.current.scenario = cfg;
    runtimeRef.current.state = init;
    runtimeRef.current.command = emptyLandingCommand();
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
    setSasEnabled(false);
    setModalType('none');
  };

  const startFlight = (isDemo = false) => {
    tone(true);
    const cfg = runtimeRef.current.scenario;
    const init: LandingState = {
      ...createLandingState(cfg),
      status: 'flying'
    };
    runtimeRef.current.state = init;
    runtimeRef.current.command = emptyLandingCommand();
    runtimeRef.current.heldKeys.clear();
    runtimeRef.current.running = true;
    runtimeRef.current.demo = isDemo;
    runtimeRef.current.samples = [sampleLanding(init)];
    runtimeRef.current.lastSampleTime = 0;
    runtimeRef.current.stepper.reset();

    setState(init);
    setRunning(true);
    setDemo(isDemo);
    setModalType('none');
  };

  const handleTriggerAction = () => {
    tone(true);
    if (!runtimeRef.current.running) {
      startFlight(false);
    }
    runtimeRef.current.command.triggerAction = true;
  };

  const handleJettisonShield = () => {
    tone(true);
    if (!runtimeRef.current.running) {
      startFlight(false);
    }
    runtimeRef.current.command.jettisonHeatshield = true;
  };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let publish = 0;

    const loop = (now: number) => {
      const dtReal = Math.min(0.1, (now - last) / 1000);
      last = now;
      const rt = runtimeRef.current;

      if (rt.running && rt.state.status === 'flying') {
        if (!rt.demo && rt.heldKeys.size > 0) {
          let att = 0;
          let lift = 0;
          if (rt.heldKeys.has('KeyA') || rt.heldKeys.has('ArrowLeft')) att -= 1;
          if (rt.heldKeys.has('KeyD') || rt.heldKeys.has('ArrowRight')) att += 1;
          if (rt.heldKeys.has('KeyW') || rt.heldKeys.has('ArrowUp')) lift += 1;
          if (rt.heldKeys.has('KeyS') || rt.heldKeys.has('ArrowDown')) lift -= 1;
          rt.command.attitudeInput = att;
          rt.command.liftTrimInput = lift;
        }

        const scaledDt = dtReal * rt.timeWarp;
        rt.stepper.advance(scaledDt, () => {
          if (rt.state.status !== 'flying') return;
          const activeCmd = rt.demo ? landingAutopilot(rt.state) : rt.command;

          rt.state = stepLanding(rt.state, activeCmd, rt.scenario, LANDING_DT);
          rt.command.triggerAction = false;
          rt.command.jettisonHeatshield = false;

          if (rt.state.time - rt.lastSampleTime >= 0.5) {
            rt.samples.push(sampleLanding(rt.state));
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
        handleTriggerAction();
        return;
      }
      if (e.code === 'KeyJ' || e.code === 'Digit1' || e.key === '1') {
        e.preventDefault();
        handleJettisonShield();
        return;
      }
      if (e.code === 'KeyT') {
        e.preventDefault();
        const nextSas = !rt.command.sasEnabled;
        rt.command.sasEnabled = nextSas;
        setSasEnabled(nextSas);
        return;
      }
      if (
        ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
          e.code
        )
      ) {
        e.preventDefault();
        rt.heldKeys.add(e.code);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const rt = runtimeRef.current;
      if (rt.heldKeys.has(e.code)) {
        rt.heldKeys.delete(e.code);
        rt.command.attitudeInput = 0;
        rt.command.liftTrimInput = 0;
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

  const missionMeta = HOME_MISSIONS[3]; // 4 舱体降落

  const actionButtonLabel = () => {
    if (state.chuteState === 'stowed') {
      return state.speedMs <= 235 && state.altitudeM <= 14500
        ? t('🪂 [Space] 立即展开减速引导伞！', '🪂 [Space] Deploy Drogue Chute NOW!')
        : t('⏳ [Space] 减速引导伞 (需 ≤235 m/s)', '⏳ [Space] Drogue Chute (Wait ≤235 m/s)');
    }
    if (state.chuteState === 'drogue') {
      return state.speedMs <= 105
        ? t('🪂 [Space] 立即展开 1200㎡ 红白主伞！', '🪂 [Space] Deploy 1200 m² Main Chute NOW!')
        : t('⏳ [Space] 1200㎡ 主伞 (需 ≤105 m/s)', '⏳ [Space] Main Chute (Wait ≤105 m/s)');
    }
    if (!state.retroFired) {
      return state.altitudeM <= 3.0 && state.altitudeM >= 0.8
        ? t('🔥 [Space] 离地 1.5m 黄金窗口：立即反推点火！', '🔥 [Space] 1.5 m Window: FIRE RETROS NOW!')
        : t('🔥 [Space] 着陆反推点火 (等离地 1.0~2.5m)', '🔥 [Space] Fire Retro-Rockets (At 1.0–2.5 m)');
    }
    return t('✅ 反推火箭已点火缓冲', '✅ Retro-Rockets Fired');
  };

  const failLabel = (reason?: string) => {
    switch (reason) {
      case 'heatshield_burnthrough':
        return t(
          '⚠️ 防热大底姿态偏斜过大！2000℃ 高超声速等离子流直接冲刷返回舱侧壁导致烧蚀穿透！',
          '⚠️ Heat Shield Burn-Through! Excessive attitude deviation exposed the thin side hull to 2000°C plasma!'
        );
      case 'excessive_g_load':
        return t(
          '⚠️ 再入减速过载超限 (> 8.5 G)！请按 W 键增加气动配平升力，缓和下落轨迹。',
          '⚠️ Excessive Reentry G-Load (> 8.5 G)! Increase aerodynamic lift trim with [W].'
        );
      case 'chute_shred':
        return t(
          '⚠️ 超速开伞导致伞衣撕裂！高速气流瞬间扯断了伞绳，必须等速度降到安全窗口内再按 [Space] 开伞！',
          '⚠️ Parachute Shredded! Deployed at excessive airspeed. Wait for the safe subsonic window!'
        );
      case 'chute_too_late':
        return t(
          '⚠️ 开伞过晚！返回舱在低空仍未展开主降落伞，未能及时减速。',
          '⚠️ Parachute Deployed Too Late! Failed to open main chute before low altitude.'
        );
      case 'retro_early':
        return t(
          '⚠️ 反推火箭点火过早！离地高于 4 米就点燃了 0.35 秒固体反推，燃料在半空烧光后重重摔向地面！',
          '⚠️ Retro-Rockets Fired Too High! Solid rockets burned out in mid-air above 4 m!'
        );
      case 'hard_impact':
        return t(
          '⚠️ 触地冲击速度过大 (> 2.4 m/s)！必须在抛掉防热大底 [J] 后，于离地 1.0~2.5 米瞬间按 [Space] 点燃反推火箭！',
          '⚠️ Hard Impact (> 2.4 m/s)! Remember to drop the heat shield [J] and fire retro-rockets [Space] at 1.0–2.5 m!'
        );
      default:
        return t('⚠️ 任务超时。', '⚠️ Mission timed out.');
    }
  };

  return (
    <>
      <aside
        className={`lesson-rail ${isOpenMobile ? 'open' : ''}`}
        aria-label={t('舱体降落训练大纲', 'Capsule Landing Curriculum')}
      >
        <div className="rail-head">
          <div>
            <span className="eyebrow">{t('任务 04 · 再入着陆大纲', 'MISSION 04 · LANDING')}</span>
            <h2>{t('大气再入与草原着陆', 'Reentry & Steppe Touchdown')}</h2>
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
              <strong>{t('任务通识 · 黑障区与反推着陆', 'Stage Briefing · Reentry & Retros')}</strong>
              <small>{t('防热大底、千平米主伞与 1.5 米反推秘籍', 'Heat shield, 1200 m² chute & 1.5 m retros')}</small>
            </span>
          </button>

          {LANDING_SCENARIOS.map((sc) => {
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
          <span>{t('再入着陆科普词典 (青少年必读)', 'Reentry & Landing Glossary')}</span>
          <small>{t('烧蚀防热 / 黑障区 / 引导伞 / 反推火箭', 'Ablation / Blackout / Chutes / Retros')}</small>
        </button>
      </aside>

      <main>
        {activeLevel === 0 ? (
          <div className="mission-zero-container" data-testid="landing-zero-view">
            <header className="mission-zero-header">
              <div className="mission-zero-title-group">
                <div className="breadcrumb">
                  {t('舱体降落训练', 'CAPSULE LANDING')}
                  <ChevronRight size={12} />
                  <span>{t('第零关 · 大气再入与东风着陆场导引', 'LEVEL 00 · REENTRY & STEPPE TOUCHDOWN')}</span>
                </div>
                <h1>
                  <span>00</span>
                  <span>{t('任务通识 · 舱体降落', 'Stage Briefing · Capsule Landing')}</span>
                  <span className="mission-zero-pill">{t('新手必读', 'FOUNDATION')}</span>
                </h1>
                <p className="mission-zero-subtitle">
                  {t(
                    '🎯 阶段认知目标：理解钝头体烧蚀防热大底、80~38km 等离子无线电黑障区、引导伞+主伞两级减速，以及离地 1.5 米固体反推缓冲。',
                    '🎯 Orientation goal: Master blunt-body ablative heat shields, the 80–38 km plasma blackout zone, two-stage parachutes, and 1.5 m retro-rocket touchdown.'
                  )}
                </p>
              </div>
            </header>

            <div className="mission-zero-grid">
              <div className="zero-card">
                <div className="zero-card-head">
                  <BookOpen size={16} />
                  <h3>{t('再入着陆档案', 'Reentry & Touchdown Profile')}</h3>
                </div>
                <div className="zero-specs-list">
                  <div className="zero-spec-item">
                    <Clock size={15} />
                    <div>
                      <small>{t('关键时间窗口', 'Critical Timeline')}</small>
                      <strong>{t(missionMeta.specs.timeZh, missionMeta.specs.timeEn)}</strong>
                    </div>
                  </div>
                  <div className="zero-spec-item">
                    <Layers size={15} />
                    <div>
                      <small>{t('返回减速五阶段', '5-Stage Return Sequence')}</small>
                      <strong>{t(missionMeta.specs.stageZh, missionMeta.specs.stageEn)}</strong>
                    </div>
                  </div>
                  <div className="zero-spec-item">
                    <MapPin size={15} />
                    <div>
                      <small>{t('目标着陆区', 'Target Recovery Zone')}</small>
                      <strong>{t(missionMeta.specs.locationZh, missionMeta.specs.locationEn)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="zero-card">
                <div className="zero-card-head">
                  <Flame size={16} />
                  <h3>{t(missionMeta.scienceTip.termZh, missionMeta.scienceTip.termEn)}</h3>
                </div>
                <p style={{ lineHeight: 1.75, color: '#c4d6cc', fontSize: 14 }}>
                  {t(missionMeta.scienceTip.explanationZh, missionMeta.scienceTip.explanationEn)}
                </p>
                <div className="zero-glossary-mini" style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  {LANDING_GLOSSARY.map((g) => (
                    <div
                      key={g.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'rgba(15, 28, 36, 0.65)',
                        border: '1px solid rgba(255, 184, 77, 0.22)'
                      }}
                    >
                      <strong style={{ color: '#ffb84d', fontSize: 13 }}>{g.term[language]}</strong>
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
                <span>{t('开始第 1 关训练：勇闯 2000℃ 黑障区', 'Start Level 1: Survive 2000°C Plasma Blackout')}</span>
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

            <section className="simulator" aria-label={t('舱体降落模拟器', 'Capsule Landing Simulator')}>
              <div className="scene-toolbar">
                <div className="view-switch">
                  <button
                    className={sasEnabled ? 'active' : ''}
                    onClick={() => {
                      const next = !sasEnabled;
                      runtimeRef.current.command.sasEnabled = next;
                      setSasEnabled(next);
                    }}
                  >
                    <span>
                      {sasEnabled
                        ? t('🧭 SAS 自动防热配平: 开启 [T]', '🧭 SAS Trim Assist: ON [T]')
                        : t('🧭 SAS 自动防热配平: 关闭 [T]', '🧭 SAS Trim Assist: OFF [T]')}
                    </span>
                  </button>
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
                    className={`hatch-btn ${state.heatshieldJettisoned ? 'enabled' : ''}`}
                    onClick={handleJettisonShield}
                  >
                    <span>
                      {state.heatshieldJettisoned
                        ? t('防热大底: 已抛离 [J]', 'Heat Shield: DROPPED [J]')
                        : t('防热大底: 挂载中 [按 J 抛离]', 'Heat Shield: ATTACHED [J]')}
                    </span>
                  </button>

                  <button onClick={() => setModalType('glossary')}>
                    <Sparkles size={15} />
                    <span>{t('词条科普', 'Glossary')}</span>
                  </button>
                </div>
              </div>

              <div className="scene-container">
                <LandingScene3D
                  state={state}
                  scenarioId={scenario.id}
                  language={language}
                />

                <div className="scene-top-left">
                  <span className="scene-tag">
                    {state.inBlackout
                      ? t('🔥 80~38km 等离子无线电黑障区 (2000℃ 激波包覆)', '🔥 80–38km PLASMA RADIO BLACKOUT ZONE')
                      : state.altitudeM > 1000
                      ? t('🪂 对流层亚音速开伞减速空域', '🪂 TROPOSPHERE PARACHUTE DESCENT')
                      : t('🌾 东风着陆场 · 离地 1.5m 反推决胜段', '🌾 DONGFENG STEPPE · 1.5m RETRO FINAL')}
                  </span>
                  <span className="scene-subtag">
                    {t(
                      `降落伞: ${
                        state.chuteState === 'main'
                          ? '1200㎡红白主伞'
                          : state.chuteState === 'drogue'
                          ? '减速引导伞'
                          : '未展开'
                      } · 防热大底完好度 ${state.heatshieldIntegrityPct.toFixed(0)}%`,
                      `Chute: ${state.chuteState.toUpperCase()} · Shield Integrity ${state.heatshieldIntegrityPct.toFixed(0)}%`
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
                      ? t('再入异常', 'ABORTED')
                      : running
                      ? t('再入降落中', 'DESCENDING')
                      : state.status === 'success'
                      ? t('平安着陆', 'TOUCHDOWN')
                      : t('再入待命', 'STANDBY')}
                  </span>
                  <span className="mission-clock">T+ {formatTime(state.time)}</span>
                </div>

                {state.status === 'ready' && (
                  <div className="scene-brief">
                    <div className="scene-brief-header">
                      <span className="eyebrow">{t('☄️ 舱体降落简报', '☄️ REENTRY & LANDING BRIEFING')}</span>
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
                  <span>{TASK_CAMERA_HINT_TEXT[language]}</span>
                </div>
              </div>

              <div className="liftoff-cockpit-deck">
                <div className="liftoff-telemetry-grid">
                  <div className="metric">
                    <span>{t('离地海拔高度', 'Altitude')}</span>
                    <strong>
                      {state.altitudeM >= 1000
                        ? `${(state.altitudeM / 1000).toFixed(2)} km`
                        : `${state.altitudeM.toFixed(1)} m`}
                    </strong>
                    <small>
                      {state.altitudeM < 50
                        ? t('🎯 1.0~2.5m 按 Space 反推！', '🎯 Fire Retro at 1.0–2.5 m!')
                        : t('东风着陆场高度', 'Above Steppe Ground')}
                    </small>
                  </div>
                  <div className="metric">
                    <span>{t('下降与合成速度', 'Descent Speed')}</span>
                    <strong>{state.speedMs.toFixed(1)} m/s</strong>
                    <small>{t(`垂直下沉 ${state.descentRateMs.toFixed(1)} m/s`, `Vertical ${state.descentRateMs.toFixed(1)} m/s`)}</small>
                  </div>
                  <div className="metric">
                    <span>{t('防热大底温度 / 姿态', 'Shield Temp & Angle')}</span>
                    <strong>
                      {Math.round(state.heatshieldTempC)}°C · {state.attitudeDeviationDeg.toFixed(1)}°
                    </strong>
                    <small>{t(`大底完好度 ${state.heatshieldIntegrityPct.toFixed(0)}%`, `Integrity ${state.heatshieldIntegrityPct.toFixed(0)}%`)}</small>
                  </div>
                  <div className="metric">
                    <span>{t('承受过载 (G-Load)', 'G-Load')}</span>
                    <strong>{state.gLoad.toFixed(1)} G</strong>
                    <small>{t(`峰值 ${state.maxGRecorded.toFixed(1)} G (上限 8.5G)`, `Peak ${state.maxGRecorded.toFixed(1)} G`)}</small>
                  </div>
                </div>

                <div className="liftoff-action-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {!running && state.status === 'ready' && (
                    <button className="primary-button" onClick={() => startFlight(false)}>
                      <Play size={15} />
                      <span>{t('开始降落训练', 'Start Descent')}</span>
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
                    className="stage-fire-btn ready-pulse"
                    onClick={handleTriggerAction}
                  >
                    <span>{actionButtonLabel()}</span>
                  </button>

                  <button
                    className="secondary-button"
                    onClick={handleJettisonShield}
                    disabled={state.heatshieldJettisoned}
                  >
                    <span>
                      {state.heatshieldJettisoned
                        ? t('✅ 已抛防热大底', '✅ Shield Jettisoned')
                        : t('🛡️ [J] 抛防热大底 (露反推火箭)', '🛡️ [J] Drop Heat Shield')}
                    </span>
                  </button>

                  <button
                    className="secondary-button"
                    onMouseDown={() => {
                      runtimeRef.current.command.attitudeInput = -1;
                    }}
                    onMouseUp={() => {
                      runtimeRef.current.command.attitudeInput = 0;
                    }}
                  >
                    <span>{t('姿态左修 [A]', 'Tilt Left [A]')}</span>
                  </button>

                  <button
                    className="secondary-button"
                    onMouseDown={() => {
                      runtimeRef.current.command.attitudeInput = 1;
                    }}
                    onMouseUp={() => {
                      runtimeRef.current.command.attitudeInput = 0;
                    }}
                  >
                    <span>{t('姿态右修 [D]', 'Tilt Right [D]')}</span>
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
          title={t('舱体再入与草原着陆科普词典', 'Capsule Reentry & Landing Glossary')}
          onClose={() => setModalType('none')}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            {LANDING_GLOSSARY.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: 'rgba(15, 25, 32, 0.7)',
                  border: '1px solid rgba(255, 184, 77, 0.25)'
                }}
              >
                <h4 style={{ margin: '0 0 6px', color: '#ffb84d' }}>{item.term[language]}</h4>
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
              ? t('🎉 欢迎回家！返回舱平安完成任务！', '🎉 Welcome Home! Capsule Mission Complete!')
              : t('⚠️ 再入着陆复盘诊断', '⚠️ Reentry & Landing Debrief')
          }
          onClose={() => setModalType('none')}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            {state.status === 'success' ? (
              <p style={{ color: '#b8f566', fontSize: 15, fontWeight: 600, margin: 0 }}>
                {t(
                  `太棒了！你成功完成了【${scenario.title.zh}】${
                    state.touchdownSpeedMs !== undefined
                      ? `，最终草原触地速度仅 ${state.touchdownSpeedMs} m/s！`
                      : '！'
                  }`,
                  `Awesome! You completed [${scenario.title.en}]${
                    state.touchdownSpeedMs !== undefined
                      ? ` with a gentle touchdown speed of ${state.touchdownSpeedMs} m/s!`
                      : '!'
                  }`
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
                border: '1px solid rgba(255, 184, 77, 0.25)'
              }}
            >
              <strong style={{ color: '#ffb84d', fontSize: 13 }}>
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
