import { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  Clock, 
  MapPin, 
  Rocket, 
  Layers, 
  Settings as SettingsIcon, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Volume2,
  VolumeX,
  Globe2,
  Monitor,
  Lock,
  ExternalLink,
  Compass,
  RotateCcw
} from 'lucide-react';
import { HOME_MISSIONS, type HomeMissionItem, type HistoricalScenario } from '../../data/homeMissions';
import { Modal } from '../common/Modal';
import { tone, useSession } from '../../store';
import { HomePanorama } from './HomePanorama';
import './home.css';

export interface HomeViewProps {
  onEnterSimulator: (taskId?: number, scenarioId?: string) => void;
}

export function HomeView({ onEnterSimulator }: HomeViewProps) {
  const language = useSession((s) => s.language);
  const setLanguage = useSession((s) => s.setLanguage);
  const muted = useSession((s) => s.muted);
  const quality = useSession((s) => s.quality);
  const save = useSession((s) => s.save);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  // Selected mission (1: 升空, 2: 太空站对接, 3: 太空站离开, 4: 舱体降落)
  const [selectedTaskId, setSelectedTaskId] = useState<number>(1);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('saturn-v');

  // Modals state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [devNoticeOpen, setDevNoticeOpen] = useState(false);
  const [scenarioTooltip, setScenarioTooltip] = useState<string | null>(null);

  // 360° 全景视角控制状态 (Bonus)
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [viewAngles, setViewAngles] = useState<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });
  const [resetSignal, setResetSignal] = useState<number>(0);

  const currentMission: HomeMissionItem = 
    HOME_MISSIONS.find((m) => m.id === selectedTaskId) ?? HOME_MISSIONS[0];

  const handleSelectTask = (id: number) => {
    tone();
    setSelectedTaskId(id);
    const mission = HOME_MISSIONS.find((m) => m.id === id);
    if (mission?.historicalScenarios?.length) {
      setSelectedScenarioId(mission.historicalScenarios[0].id);
    }
    setScenarioTooltip(null);
  };

  const handleEnterClick = () => {
    tone();
    if (currentMission.isImplemented) {
      onEnterSimulator(selectedTaskId, selectedScenarioId);
    } else {
      setDevNoticeOpen(true);
    }
  };

  const handleScenarioSelect = (scenario: HistoricalScenario) => {
    tone();
    if (scenario.isAvailable) {
      setSelectedScenarioId(scenario.id);
      setScenarioTooltip(null);
    } else {
      setScenarioTooltip(
        language === 'zh'
          ? `【${scenario.titleZh}】历史任务场景正在测绘与参数标定中，敬请期待！`
          : `[${scenario.titleEn}] historical scenario is currently in development!`
      );
    }
  };

  const toggleSound = () => {
    useSession.setState({ muted: !muted });
    save();
    tone();
  };

  const toggleQuality = () => {
    const nextQuality = quality === 'high' ? 'low' : 'high';
    useSession.setState({ quality: nextQuality });
    save();
    tone();
  };

  // Keyboard shortcut: Press Enter to enter the simulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (settingsOpen || creditsOpen || devNoticeOpen) return;
      if (e.key === 'Enter') {
        handleEnterClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, settingsOpen, creditsOpen, devNoticeOpen]);

  return (
    <div className="home-container" data-testid="mission-select-home">
      {/* 360° 全景三维动态背景 (Bonus) */}
      <HomePanorama
        selectedTaskId={selectedTaskId}
        autoRotate={isAutoRotating}
        onAngleChange={(yaw, pitch) => setViewAngles({ yaw, pitch })}
        resetSignal={resetSignal}
      />

      {/* Gradients ensuring readability on the left while preserving visual focus on the right */}
      <div className="home-overlay" />
      <div className="home-ambient-grid" />

      {/* UI Content Layer */}
      <div className="home-ui">
        {/* Top-Left: Big Brand & Mission Title */}
        <header className="home-header">
          <div className="home-brand-tag">
            <span>{t('航天飞行模拟系统 · 交互课堂', 'Orbital Flight Simulation Academy')}</span>
          </div>
          <h1 className="home-title">
            <span>VECTOR</span>
            <span className="title-accent">ALIGN</span>
          </h1>
          <div className="home-title-sub">
            <span className="home-title-sub-dot" />
            <span>{t('选择任务 · 驾驶 NASA 航天器', 'Mission Select · Fly NASA Spacecraft')}</span>
          </div>
        </header>

        {/* Main single-screen layout: Left Cluster (Menu + 场景 Card with matching top/bottom bounds) + Right 360 HUD */}
        <div className="home-main-layout">
          {/* Left Cluster: 一级菜单 + 场景卡片，上下界绝对水平对齐 */}
          <div className="home-left-cluster">
            {/* 一级菜单: 序号已去除，实装标签已去除 */}
            <nav className="home-menu-stack" aria-label={t('主菜单', 'Main Menu')}>
              {/* 升空 */}
              <button
                type="button"
                className={`home-menu-btn ${selectedTaskId === 1 ? 'active' : ''}`}
                onClick={() => handleSelectTask(1)}
              >
                <span>{t('升空', 'Liftoff')}</span>
              </button>

              {/* 太空站对接 */}
              <button
                type="button"
                className={`home-menu-btn ${selectedTaskId === 2 ? 'active' : ''}`}
                onClick={() => handleSelectTask(2)}
              >
                <span>{t('太空站对接', 'Station Docking')}</span>
              </button>

              {/* 太空站离开 */}
              <button
                type="button"
                className={`home-menu-btn ${selectedTaskId === 3 ? 'active' : ''}`}
                onClick={() => handleSelectTask(3)}
              >
                <span>{t('太空站离开', 'Departure')}</span>
              </button>

              {/* 舱体降落 */}
              <button
                type="button"
                className={`home-menu-btn ${selectedTaskId === 4 ? 'active' : ''}`}
                onClick={() => handleSelectTask(4)}
              >
                <span>{t('舱体降落', 'Landing')}</span>
              </button>

              {/* 选项 */}
              <button
                type="button"
                className="home-menu-btn secondary-action"
                onClick={() => { tone(); setSettingsOpen(true); }}
              >
                <span>{t('选项', 'Options')}</span>
              </button>

              {/* 制作人员与致谢 */}
              <button
                type="button"
                className="home-menu-btn secondary-action"
                onClick={() => { tone(); setCreditsOpen(true); }}
              >
                <span>{t('制作人员与致谢', 'Credits & Acknowledgements')}</span>
              </button>
            </nav>

            {/* 二级菜单卡片：放置于一级菜单右侧，上下界与菜单对齐 */}
            <aside className="scenario-card" aria-label={t('二级菜单', 'Secondary Menu')}>
              <div className="scenario-card-tab">
                <span className="scenario-card-tab-label">{t('任务档案', 'MISSION FILES')}</span>
                <span className="scenario-card-tab-title">{t(currentMission.titleZh, currentMission.titleEn)}</span>
              </div>
              <div className="scenario-list">
                {currentMission.historicalScenarios?.map((s) => (
                  <div key={s.id} className={`scenario-block ${s.isAvailable ? 'available' : 'unavailable'}`}>
                    {/* 任务标题按钮 */}
                    <button
                      type="button"
                      className={`scenario-task-btn ${s.isAvailable ? 'task-btn-convex' : 'task-btn-disabled'}`}
                      onClick={() => {
                        if (s.isAvailable) {
                          tone();
                          onEnterSimulator(selectedTaskId, s.id);
                        } else {
                          tone();
                          setScenarioTooltip(
                            language === 'zh'
                              ? `【${s.titleZh}】任务尚未开放，正在参数标定与研发中！`
                              : `[${s.titleEn}] is currently under development!`
                          );
                        }
                      }}
                      aria-label={t(s.titleZh, s.titleEn)}
                      aria-disabled={!s.isAvailable}
                    >
                      <span className="task-btn-title">
                        {t(s.titleZh, s.titleEn)}
                      </span>
                      {s.isAvailable ? (
                        <span className="task-btn-badge available">
                          <span>{t('进入关卡', 'LAUNCH')}</span>
                          <ArrowRight size={14} />
                        </span>
                      ) : (
                        <span className="task-btn-badge locked">
                          <Lock size={12} />
                          <span>{t(s.statusZh, s.statusEn)}</span>
                        </span>
                      )}
                    </button>

                    {/* 小字放到按钮下方 */}
                    <div className={`scenario-task-subtext ${s.isAvailable ? 'available' : 'locked'}`}>
                      {s.eraZh && (
                        <span className="scenario-task-era">
                          <Sparkles size={11} />
                          <span>{t(s.eraZh, s.eraEn)}</span>
                        </span>
                      )}
                      <p className="scenario-task-desc">{t(s.descZh, s.descEn)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {scenarioTooltip && (
                <div className="scenario-tooltip-bar">
                  <AlertCircle size={13} />
                  <span>{scenarioTooltip}</span>
                </div>
              )}
            </aside>
          </div>

          {/* 360° 全景操作提示与交互 HUD (Bonus) */}
          <div className="home-panorama-hud">
            <button
              type="button"
              className={`panorama-pill-btn ${isAutoRotating ? 'active' : ''}`}
              onClick={() => setIsAutoRotating((v) => !v)}
              title={t('点击切换 360° 自动巡航', 'Toggle 360° Auto-Cruise')}
            >
              <Compass size={14} />
              <span>{t('360° 全景', '360° Panorama')}</span>
              <span className="panorama-bearing">{`AZ: ${viewAngles.yaw}°`}</span>
            </button>

            <button
              type="button"
              className="panorama-reset-btn"
              onClick={() => setResetSignal((s) => s + 1)}
              title={t('重置正向视角', 'Reset View Angle')}
            >
              <RotateCcw size={12} />
              <span>{t('重置', 'Reset')}</span>
            </button>

            <span className="panorama-hint-text">
              {t('🖱️ 拖拽探索 360° 全景', '🖱️ Drag to explore 360°')}
            </span>
          </div>
        </div>
      </div>

      {/* 5 选项 Modal */}
      {settingsOpen && (
        <Modal
          title={t('系统设置 · 选项', 'Settings · Options')}
          onClose={() => setSettingsOpen(false)}
        >
          <div className="settings-grid">
            <div className="setting-row">
              <div className="setting-info">
                <strong>{t('语言设置', 'Language')}</strong>
                <small>{t('切换中文或英文显示', 'Switch between Chinese and English')}</small>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              >
                <Globe2 size={15} />
                <span>{language === 'zh' ? '中文 (简体)' : 'English'}</span>
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <strong>{t('推进器与界面音效', 'Audio & Sound Effects')}</strong>
                <small>{t('开启失重喷气与对接锁紧声效', 'Thruster gas and latch feedback audio')}</small>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={toggleSound}
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{muted ? t('静音中', 'Muted') : t('已开启', 'Enabled')}</span>
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <strong>{t('三维画面画质', 'Graphics Quality')}</strong>
                <small>{t('高画质渲染真实比例地球与光影', 'Earth texture detail and shadow rendering')}</small>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={toggleQuality}
              >
                <Monitor size={15} />
                <span>{quality === 'high' ? t('高画质', 'High') : t('流畅/节能', 'Low')}</span>
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <strong className="controls-help-title">
                {t('键盘飞行操作说明', 'Flight Controls Cheatsheet')}
              </strong>
              <div className="controls-help-grid">
                <div className="controls-help-item">
                  <span>{t('前后平移 (微推靠近)', 'Fore / Aft Thrust')}</span>
                  <div><kbd>W</kbd> <kbd>S</kbd></div>
                </div>
                <div className="controls-help-item">
                  <span>{t('左右平移 (消除横漂)', 'Port / Stbd Thrust')}</span>
                  <div><kbd>A</kbd> <kbd>D</kbd></div>
                </div>
                <div className="controls-help-item">
                  <span>{t('垂直升降 (高度对齐)', 'Up / Down Thrust')}</span>
                  <div><kbd>R</kbd> <kbd>F</kbd></div>
                </div>
                <div className="controls-help-item">
                  <span>{t('姿态俯仰 / 偏航转向', 'Pitch & Yaw')}</span>
                  <div><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd></div>
                </div>
                <div className="controls-help-item">
                  <span>{t('自身滚转对齐', 'Roll (Clockwise)')}</span>
                  <div><kbd>Q</kbd> <kbd>E</kbd></div>
                </div>
                <div className="controls-help-item">
                  <span>{t('紧急全向制动', 'All-Stop Brake')}</span>
                  <div><kbd>Space 空格</kbd></div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 6 制作人员 Modal */}
      {creditsOpen && (
        <Modal
          title={t('制作人员与致谢 · Credits', 'Credits & Acknowledgements')}
          onClose={() => setCreditsOpen(false)}
        >
          <div className="credits-list">
            <div className="credits-section">
              <h4>{t('项目理念与受众', 'Mission Vision')}</h4>
              <p>
                {t(
                  'Vector Align 是一款专为青少年与航天爱好者设计的硬核航天仿真系统。通过可交互、真实的六自由度物理引擎，将复杂的轨道力学转化为通俗易懂的直观操作。',
                  'Vector Align is an interactive orbital flight academy built for curious students and space enthusiasts, translating complex orbital mechanics into intuitive hands-on missions.'
                )}
              </p>
            </div>

            <div className="credits-section">
              <h4>{t('三维仿真与物理建模', '3D Physics & Simulation')}</h4>
              <p>
                {t(
                  '基于 WebGL 与 Three.js 刚体动力学系统开发，实现真实微重力无阻力惯性物理、多自由度喷气姿态控制与对接口碰撞判定。',
                  'Powered by WebGL, Three.js, and custom Newtonian physics engines simulating real frictionless vacuum motion, 6-DOF RCS dynamics, and docking colliders.'
                )}
              </p>
            </div>

            <div className="credits-section">
              <h4>{t('航天模型与数据致谢', 'Asset Credits & NASA Sources')}</h4>
              <p>
                {t(
                  '国际空间站 3D 模型源自 NASA 开放航天资源；真实比例地球卫星贴图源自 NASA Visible Earth 与 Blue Marble 空间观测数据。',
                  'ISS 3D model courtesy of NASA open 3D resources. True-scale Earth textures provided by NASA Visible Earth and Blue Marble imagery.'
                )}
              </p>
              <div className="credits-sources-list">
                <a
                  href="https://www.nasa.gov/international-space-station/harmony-module/"
                  target="_blank"
                  rel="noreferrer"
                  className="credits-source-link"
                >
                  <span>{t('NASA · 和谐号节点舱', 'NASA · Harmony module')}</span>
                  <ExternalLink size={14} />
                </a>
                <a
                  href="https://science.nasa.gov/resource/international-space-station-3d-model/"
                  target="_blank"
                  rel="noreferrer"
                  className="credits-source-link"
                >
                  <span>{t('NASA · 国际空间站 3D 官方模型', 'NASA VTAD · International Space Station model')}</span>
                  <ExternalLink size={14} />
                </a>
                <a
                  href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/"
                  target="_blank"
                  rel="noreferrer"
                  className="credits-source-link"
                >
                  <span>{t('NASA 地球观测站 · 蓝色弹珠', 'NASA Earth Observatory · Blue Marble')}</span>
                  <ExternalLink size={14} />
                </a>
                <a
                  href="https://www.nasa.gov/stem-content/crew-orbital-docking-simulation-coding-sim/"
                  target="_blank"
                  rel="noreferrer"
                  className="credits-source-link"
                >
                  <span>{t('NASA STEM · 载人轨道对接模拟', 'NASA STEM · Crew Orbital Docking Simulation')}</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="credits-section">
              <h4>{t('致敬', 'Dedication')}</h4>
              <p>
                {t(
                  '向所有探索未知、勇往直前的航天英雄与科研工作者致敬！',
                  'Dedicated to the scientists, engineers, and astronauts who dared to touch the stars.'
                )}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* 未开放任务进入提示 Modal (针对任务 1, 3, 4) */}
      {devNoticeOpen && (
        <Modal
          title={t('任务筹备研发中', 'Mission In Development')}
          onClose={() => setDevNoticeOpen(false)}
        >
          <div className="home-dev-modal">
            <div className="dev-modal-icon-badge">
              <Rocket size={28} />
            </div>
            <h3 className="dev-modal-title">
              {t(`【${currentMission.titleZh}】模拟工程正在全力构建中`, `[${currentMission.titleEn}] is currently being constructed`)}
            </h3>
            <p className="dev-modal-desc">
              {t(
                `本阶段任务（${currentMission.titleZh}）包含${currentMission.specs.stageZh}等复杂航天物理流程。目前开发团队正在进行轨道动力学参数与三维场景的高精度测绘。`,
                `This mission phase involves advanced trajectory simulations. Our engineering team is currently tuning dynamic parameters and 3D scenes.`
              )}
            </p>

            <div className="dev-modal-features">
              <div className="dev-feature-item">
                <CheckCircle2 size={16} />
                <span>{t('核心主任务【太空站对接】已 100% 开放，拥有完整的六自由度物理仿真与四关训练！', 'Core mission [Station Docking] is 100% live with complete 6-DOF physics & 4 training levels!')}</span>
              </div>
              <div className="dev-feature-item">
                <CheckCircle2 size={16} />
                <span>{t('你可以亲自驾驶飞船，在 400 公里近地轨道体验真实的无阻力惯性与精密微推对齐。', 'Fly the crew spacecraft in low Earth orbit, experiencing inertia and precise docking maneuvers.')}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDevNoticeOpen(false)}
              >
                {t('返回主菜单', 'Back to Menu')}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setDevNoticeOpen(false);
                  setSelectedTaskId(2);
                  onEnterSimulator();
                }}
              >
                <Rocket size={15} />
                <span>{t('立即体验太空站对接', 'Launch Station Docking')}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
