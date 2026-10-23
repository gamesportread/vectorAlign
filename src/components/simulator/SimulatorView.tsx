import { useEffect, useState } from 'react';
import { CircleHelp, Crosshair, DoorClosed, DoorOpen, Info, Layers3, Maximize2, Orbit, Settings2, X } from 'lucide-react';
import Scene from '../../Scene';
import { angleError, angularSpeed } from '../../sim/engine';
import type { ActiveAlert } from '../../sim/feedback';
import type { SimulationState } from '../../sim/types';
import { useSession } from '../../store';
import { formatTime } from '../../utils/formatters';
import { ConstraintToast } from './ConstraintToast';
import { TelemetryBar } from './TelemetryBar';
import { ControlsOverlay } from '../hud/ControlsOverlay';
import { TASK_CAMERA_HINT_TEXT } from '../scene/taskCameraConfig';

function getInFlightGuidance(configId: number, flight: SimulationState, hatchState: string, t: (zh: string, en: string) => string): string {
  const z = flight.position[2];
  const vz = -flight.velocity[2];
  const lat = Math.hypot(flight.position[0], flight.position[1]);
  const latV = Math.hypot(flight.velocity[0], flight.velocity[1]);
  const angErr = angleError(flight);
  const angSpd = angularSpeed(flight);

  if (configId === 1) {
    if (z > 9.5) {
      return t(
        '🎯 滑行至 8 米黄圈处 · 💡 接近 8 米时按键盘 [F] 键反推刹车',
        '🎯 Gliding to 8 m ring · 💡 Press [F] to brake as you approach 8 m'
      );
    } else if (z >= 7.65 && z <= 9.5) {
      if (Math.abs(vz) > 0.06) {
        return t(
          '⚠️ 已到达 8 米等待点！按住 [F] 键反推刹车，把接近速度降为 0！',
          '⚠️ In the 8 m zone! Hold [F] to bring closing speed to 0 m/s!'
        );
      } else {
        return t(
          '✨ 速度已降到 0！稳住飞船 1.5 秒即将通关！',
          '✨ Speed is zero! Hold steady for 1.5 s to complete mission!'
        );
      }
    } else if (z > 3) {
      return t(
        '💡 冲过了 8 米黄圈！可按 [R] 倒回黄圈，或继续对准前方向空间站直接对接！',
        '💡 Passed 8 m ring! You can reverse with [R], or fly ahead to dock directly!'
      );
    } else {
      return t(
        '🎯 正在接近对接口！保持中心对正，接触对接口即可直接对接通关！',
        '🎯 Approaching port! Stay centered to dock directly!'
      );
    }
  } else if (configId === 2) {
    if (lat > 0.25) {
      return t(
        '🎯 消除上下左右漂移 · 💡 用 W/S (上下) 和 A/D (左右) 把飞船推回绿色十字中心',
        '🎯 Center on crosshair · 💡 Use W/S (up/down) & A/D (left/right) to steer'
      );
    } else if (latV > 0.04) {
      return t(
        '⚠️ 已在正中心！轻点反向按键，把侧向漂移速度减为 0！',
        '⚠️ Centered! Counter-tap directional keys to cancel drift speed!'
      );
    } else {
      return t(
        '✨ 居中稳固！保持 1.5 秒即将通关！',
        '✨ Perfectly centered! Hold steady for 1.5 s to complete!'
      );
    }
  } else if (configId === 3) {
    if (angErr > 2.0) {
      return t(
        '🎯 对齐空间站舱门 · 💡 用方向键 ↑ ↓ ← → 旋转机头，Q / E 滚转',
        '🎯 Align nose to port · 💡 Use arrow keys ↑ ↓ ← → to rotate, Q/E to roll'
      );
    } else if (angSpd > 0.5) {
      return t(
        '⚠️ 舱门已对正！反向轻点方向键停止自转！',
        '⚠️ Aligned! Counter-tap arrow keys to stop rotating!'
      );
    } else {
      return t(
        '✨ 姿态完全对齐！稳住 1.5 秒即将通关！',
        '✨ Attitude aligned! Hold steady for 1.5 s to complete!'
      );
    }
  } else if (configId === 4) {
    if (z > 15) {
      return t(
        '🎯 50米手动对接 · 💡 保持正对绿色十字，平稳滑行接近空间站',
        '🎯 50 m docking · 💡 Keep centered on crosshair, approach steadily'
      );
    } else if (z > 3) {
      if (vz > 0.35) {
        return t(
          '💡 接近空间站中 · 速度较快（>0.35m/s），轻点 [F] 键适度减速',
          '💡 Approaching · Closing fast (>0.35m/s), tap [F] to slow down'
        );
      } else {
        return t(
          '💡 接近空间站中 · 保持绿色十字居中，平稳进场',
          '💡 Approaching · Keep centered on green crosshair'
        );
      }
    } else {
      if (hatchState !== 'open') {
        return t(
          '⚠️ 头锥保护罩未开启！按 [1] 键打开面罩露出对接口（IDA），方可对接入锁！',
          '⚠️ Nosecone hatch closed! Press [1] to open visor and reveal the docking adapter (IDA)!'
        );
      } else if (vz > 0.15) {
        return t(
          '⚠️ 最终接触阶段！接触速度必须低于 0.15 m/s，轻点 [F] 刹车慢速轻碰！',
          '⚠️ Final contact! Speed must be under 0.15 m/s, tap [F] to brake!'
        );
      } else {
        return t(
          '✨ 舱门已就绪，进场速度完美（<0.15m/s）！轻柔触碰对接口完成对接！',
          '✨ Hatch ready & speed perfect (<0.15m/s)! Gently touch port to dock!'
        );
      }
    }
  }
  return '';
}

export interface SimulatorViewProps {
  constraintAlert: ActiveAlert | null;
  onOpenBriefing?: () => void;
}

export function SimulatorView({ constraintAlert, onOpenBriefing }: SimulatorViewProps) {
  const language = useSession((s) => s.language);
  const config = useSession((s) => s.config);
  const flight = useSession((s) => s.flight);
  const running = useSession((s) => s.running);
  const demo = useSession((s) => s.demo);
  const camera = useSession((s) => s.camera);
  const guidance = useSession((s) => s.guidance);
  const quality = useSession((s) => s.quality);
  const save = useSession((s) => s.save);
  const hatch = useSession((s) => s.hatch);
  const toggleHatch = useSession((s) => s.toggleHatch);

  const [hatchTipDismissed, setHatchTipDismissed] = useState(false);
  const [showHatchDetail, setShowHatchDetail] = useState(false);

  useEffect(() => {
    if (flight.status === 'ready') {
      setHatchTipDismissed(false);
      setShowHatchDetail(false);
    }
  }, [flight.status]);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const isPaused = flight.status === 'flying' && !running;

  const handleToggleFullscreen = () => {
    // 优先全屏整个 .simulator 容器，若用户在移动端也能自适应
    const el = document.querySelector('.simulator');
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el?.requestFullscreen?.().catch(() => {});
    }
  };

  const handleToggleQuality = () => {
    useSession.setState({ quality: quality === 'high' ? 'low' : 'high' });
    save();
  };

  return (
    <section className="simulator" aria-label={t('对接模拟器', 'Docking simulator')}>
      {/* 视口顶部工具条 */}
      <div className="scene-toolbar">
        <div className="view-switch">
          {(['orbit', 'pilot', 'side'] as const).map((v, i) => (
            <button
              key={v}
              className={camera === v ? 'active' : ''}
              onClick={() => useSession.setState({ camera: v })}
            >
              {[<Orbit size={15} key="o" />, <Crosshair size={15} key="c" />, <Layers3 size={15} key="l" />][i]}
              {[t('外部视角', 'Orbit view'), t('对接视角', 'Docking view'), t('侧视图', 'Side view')][i]}
            </button>
          ))}
        </div>

        <div className="scene-tools">
          <button
            className={`hatch-btn ${hatch.state === 'open' ? 'enabled' : ''}`}
            onClick={toggleHatch}
            title={t(
              '头锥保护罩（Nosecone Hatch）：就像飞船的头盔面罩！在穿过大气层发射时挡风挡热；到了太空准备对接空间站时，按下 [1] 键打开它，露出对接口（IDA），才能和空间站锁扣锁在一起！\n国际对接口（IDA）：飞船头部的锁扣大门，带有高精度的锁扣环。打开头锥后，必须把对接口平稳对准空间站的 PMA-2 接口！',
              'Nosecone Hatch: Just like a helmet visor for the spacecraft! It shields against heat and wind during launch; once in space, press [1] to open it, reveal the International Docking Adapter (IDA), and lock with the station!\nInternational Docking Adapter (IDA): The docking doorway at the ship nose with precision latching rings. Once open, align it smoothly with the station’s PMA-2 port!'
            )}
            aria-label={t('飞船舱门控制', 'Hatch control')}
          >
            {hatch.state === 'open' || hatch.state === 'opening' ? <DoorOpen size={16} /> : <DoorClosed size={16} />}
            <span>
              {hatch.state === 'open'
                ? t('舱门: 开启 [1]', 'Hatch: OPEN [1]')
                : hatch.state === 'closed'
                ? t('舱门: 关闭 [1]', 'Hatch: CLOSED [1]')
                : hatch.state === 'opening'
                ? `${t('开启中', 'Opening')} ${(hatch.progress * 100).toFixed(0)}%`
                : `${t('关闭中', 'Closing')} ${(hatch.progress * 100).toFixed(0)}%`}
            </span>
          </button>

          <button
            className={guidance ? 'enabled' : ''}
            onClick={() => useSession.setState({ guidance: !guidance })}
            aria-label={t('切换引导线', 'Toggle guidance')}
          >
            <Crosshair size={16} />
            <span>{t('引导', 'Guide')}</span>
          </button>

          <button
            onClick={handleToggleQuality}
            aria-label={t('切换画质', 'Toggle quality')}
          >
            <Settings2 size={16} />
            <span>{quality === 'high' ? t('高清', 'HD') : t('流畅', 'LITE')}</span>
          </button>

          <button
            aria-label={t('全屏', 'Fullscreen')}
            onClick={handleToggleFullscreen}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* 3D 渲染与 HUD 容器 */}
      <div className="scene-container">
        <Scene />

        {/* 锁定自由度即时操作反馈 Toast */}
        <ConstraintToast alert={constraintAlert} />

        {/* 屏幕交互式舱门状态控制按钮与青少年说明 (HUD Overlay) */}
        <ControlsOverlay />

        <div className="scene-top-left">
          <span className="scene-tag">
            {demo ? t('示范模式 (4倍速)', 'DEMONSTRATION · 4×') : t('近地轨道 · 教学场景', 'LOW EARTH ORBIT · TRAINING')}
          </span>
          <span className="scene-subtag">{t('对接目标 / 空间站和谐号前向口', 'TARGET / HARMONY FORWARD')}</span>
        </div>

        <div className="scene-top-right">
          <span className={`flight-state ${flight.status === 'failed' ? 'failed' : running ? 'live' : ''}`}>
            <i />
            {demo
              ? t('示范模式', 'DEMO')
              : flight.status === 'failed'
              ? t('⚠️ 碰撞失控漂移', 'COLLISION DRIFT')
              : running
              ? t('飞行中', 'IN FLIGHT')
              : isPaused
              ? t('已暂停', 'PAUSED')
              : flight.status === 'success'
              ? t('任务完成', 'COMPLETE')
              : t('等待开始', 'STANDBY')}
          </span>
          <span className="mission-clock">{t('飞行用时 ', 'T+ ')}{formatTime(flight.time)}</span>
        </div>

        {flight.status === 'failed' && (
          <div className="scene-failure-overlay">
            <div className="failure-banner">
              <span className="failure-title">
                {flight.reason === 'hatch_closed'
                  ? t('⚠️ 舱门未开启 · 对接口被头锥阻挡', '⚠️ HATCH CLOSED · PORT BLOCKED BY NOSE CONE')
                  : flight.reason === 'collision'
                  ? t('⚠️ 飞船撞击失控 · 正在空间漂移', '⚠️ COLLISION TUMBLE · DRIFTING IN SPACE')
                  : flight.reason === 'escape'
                  ? t('⚠️ 飞船超出边界 · 失去动力漂浮中', '⚠️ EXITED BOUNDARY · DRIFTING IN SPACE')
                  : t('⚠️ 对接失败 · 正在微重力漂移', '⚠️ DOCKING FAILED · DRIFTING IN SPACE')}
              </span>
              <div className="failure-actions">
                <button
                  className="btn-debrief"
                  onClick={() => {
                    useSession.getState().pause();
                    useSession.setState({ panel: 'review' });
                  }}
                >
                  {t('查看复盘报告', 'View Debrief')}
                </button>
                <button
                  className="btn-retry"
                  onClick={() => {
                    useSession.getState().start();
                  }}
                >
                  {t('重新开始', 'Retry')} (R)
                </button>
              </div>
            </div>
          </div>
        )}

        {camera === 'pilot' && (
          <div className="reticle">
            <span />
            <i />
            <b />
          </div>
        )}

        {/* 飞行中实时动态指引 HUD */}
        {running && flight.status === 'flying' && (
          <div className="scene-hud-guide">
            <span className="hud-guide-text">
              {getInFlightGuidance(config.id, flight, hatch.state, t)}
            </span>
          </div>
        )}

        {/* 飞行中头锥保护罩提示横幅（轻量紧凑浮动胶囊，防视野遮挡） */}
        {running && flight.status === 'flying' && hatch.state === 'closed' && !hatchTipDismissed && (
          <div
            className={`hatch-tip-banner ${showHatchDetail ? 'expanded' : 'compact'}`}
            onClick={toggleHatch}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleHatch();
              }
            }}
            title={t('点击立即打开头锥保护罩', 'Click to open nosecone hatch')}
          >
            <div className="hatch-tip-header-row">
              <div className="hatch-tip-title">
                {t(
                  '💡 准备对接提示：按 [1] 键（或点击此处）打开头锥保护罩，露出对接口！',
                  '💡 Docking Tip: Press [1] (or tap here) to open the nosecone hatch!'
                )}
              </div>
              <div className="hatch-tip-actions">
                <button
                  type="button"
                  className="hatch-tip-info-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHatchDetail((v) => !v);
                  }}
                  title={t('查看/收起原理说明', 'Toggle explanation')}
                  aria-label={t('原理说明', 'Info')}
                >
                  <Info size={12} />
                  <span>{showHatchDetail ? t('收起', 'Hide') : t('原理', 'Info')}</span>
                </button>
                <button
                  type="button"
                  className="hatch-tip-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHatchTipDismissed(true);
                  }}
                  title={t('关闭提示', 'Dismiss tip')}
                  aria-label={t('关闭提示', 'Dismiss')}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            <div className="hatch-tip-desc">
              <p style={{ margin: '0 0 4px' }}>
                {t(
                  '头锥保护罩（Nosecone Hatch）：就像飞船的头盔面罩！在穿过大气层发射时挡风挡热；到了太空准备对接空间站时，按下 [1] 键打开它，露出对接口（IDA），才能和空间站锁扣锁在一起！',
                  'Nosecone Hatch: Just like a helmet visor for the spacecraft! It shields against heat and wind during launch; once in space, press [1] to open it, reveal the International Docking Adapter (IDA), and lock with the station!'
                )}
              </p>
              <p style={{ margin: 0 }}>
                {t(
                  '国际对接口（IDA）：飞船头部的锁扣大门，带有高精度的锁扣环。打开头锥后，必须把对接口平稳对准空间站的 PMA-2 接口！',
                  'International Docking Adapter (IDA): The docking doorway at the ship nose with precision latching rings. Once open, align it smoothly with the station’s PMA-2 port!'
                )}
              </p>
            </div>
          </div>
        )}

        {flight.status === 'ready' && (
          <div className="scene-brief">
            <div className="scene-brief-header">
              <span className="eyebrow">{t('🎯 任务具体目标', '🎯 MISSION GOAL')}</span>
              <span className="brief-id-tag">0{config.id}</span>
            </div>
            <h3>
              {config.id === 1
                ? t('在前方 8 米黄圈处停稳飞船', 'Stop steadily at the 8 m ring')
                : config.title[language]}
            </h3>
            <p className="brief-objective">
              {config.objective ? config.objective[language] : config.brief[language]}
            </p>
            <div className="brief-action-box">
              <span className="action-box-title">{t('🕹️ 关键操作：', '🕹️ Key Controls:')}</span>
              <p className="action-box-text">
                {config.hint ? config.hint[language] : config.brief[language]}
              </p>
            </div>
            <button
              className="brief-foot brief-help"
              onClick={() => useSession.getState().openIntro(config.id === 1 ? 3 : 0)}
            >
              <CircleHelp size={13} />
              <span>
                {config.id === 1
                  ? t('为什么要停在黄圈？点我看图文讲解', 'Why the yellow ring? Visual guide')
                  : t('不知道画面里是什么？点我看图文讲解', 'Need help? Visual guide')}
              </span>
            </button>
          </div>
        )}

        <div className="scene-bottom-left">
          <span className="axis-symbol">⌖</span>
          <span>
            {camera === 'pilot'
              ? t('飞船机头相机', 'SHIP NOSE CAMERA')
              : TASK_CAMERA_HINT_TEXT[language]}
          </span>
        </div>

        <div className="scene-scale">
          <span>10 m</span>
          <i />
        </div>
      </div>

      {/* 遥测数据与飞行操作栏 */}
      <TelemetryBar onOpenBriefing={onOpenBriefing} />
    </section>
  );
}
