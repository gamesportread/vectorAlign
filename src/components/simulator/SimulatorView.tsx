import { CircleHelp, Crosshair, Layers3, Maximize2, Orbit, Settings2, Tag } from 'lucide-react';
import Scene from '../../Scene';
import type { ActiveAlert } from '../../sim/feedback';
import { useSession } from '../../store';
import { formatTime } from '../../utils/formatters';
import { ConstraintToast } from './ConstraintToast';
import { TelemetryBar } from './TelemetryBar';

export interface SimulatorViewProps {
  constraintAlert: ActiveAlert | null;
}

export function SimulatorView({ constraintAlert }: SimulatorViewProps) {
  const language = useSession((s) => s.language);
  const config = useSession((s) => s.config);
  const flight = useSession((s) => s.flight);
  const running = useSession((s) => s.running);
  const demo = useSession((s) => s.demo);
  const camera = useSession((s) => s.camera);
  const guidance = useSession((s) => s.guidance);
  const labels = useSession((s) => s.labels);
  const quality = useSession((s) => s.quality);
  const save = useSession((s) => s.save);

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
            className={guidance ? 'enabled' : ''}
            onClick={() => useSession.setState({ guidance: !guidance })}
            aria-label={t('切换引导线', 'Toggle guidance')}
          >
            <Crosshair size={16} />
            <span>{t('引导', 'Guide')}</span>
          </button>

          <button
            className={labels ? 'enabled' : ''}
            onClick={() => useSession.setState({ labels: !labels })}
            aria-label={t('切换标签', 'Toggle labels')}
          >
            <Tag size={16} />
            <span>{t('标签', 'Labels')}</span>
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
                {flight.reason === 'collision'
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

        {flight.status === 'ready' && (
          <div className="scene-brief">
            <span className="eyebrow">{t('任务目标', 'YOUR OBJECTIVE')}</span>
            <h3>
              {config.id === 1
                ? t('在 8 米等待点停稳', 'Stop at the 8 m hold point')
                : config.title[language]}
            </h3>
            <p>{config.brief[language]}</p>
            <button
              className="brief-foot brief-help"
              onClick={() => useSession.getState().openIntro(config.id === 1 ? 3 : 0)}
            >
              <CircleHelp size={14} />
              {config.id === 1
                ? t('为什么要停在黄圈？点我看讲解', 'Why the yellow ring? Open the guide')
                : t('不知道画面里是什么？点我看讲解', 'Not sure what you’re seeing? Open the guide')}
            </button>
          </div>
        )}

        <div className="scene-bottom-left">
          <span className="axis-symbol">⌖</span>
          <span>
            {camera === 'pilot'
              ? t('飞船机头相机', 'SHIP NOSE CAMERA')
              : t('拖动旋转 · 滚动缩放', 'DRAG TO ORBIT · SCROLL TO ZOOM')}
          </span>
        </div>

        <div className="scene-scale">
          <span>10 m</span>
          <i />
        </div>
      </div>

      {/* 遥测数据栏 */}
      <TelemetryBar />
    </section>
  );
}
