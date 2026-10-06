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
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  Volume2,
  VolumeX,
  Globe2,
  Monitor
} from 'lucide-react';
import { HOME_MISSIONS, type HomeMissionItem, type HistoricalScenario } from '../../data/homeMissions';
import { Modal } from '../common/Modal';
import { tone, useSession } from '../../store';
import './home.css';

export interface HomeViewProps {
  onEnterSimulator: () => void;
}

export function HomeView({ onEnterSimulator }: HomeViewProps) {
  const language = useSession((s) => s.language);
  const setLanguage = useSession((s) => s.setLanguage);
  const muted = useSession((s) => s.muted);
  const quality = useSession((s) => s.quality);
  const save = useSession((s) => s.save);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  // Selected mission (1: 升空, 2: 太空站对接, 3: 太空站离开, 4: 舱体降落)
  const [selectedTaskId, setSelectedTaskId] = useState<number>(2);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('iss-standard');

  // Modals state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [devNoticeOpen, setDevNoticeOpen] = useState(false);
  const [scenarioTooltip, setScenarioTooltip] = useState<string | null>(null);

  const currentMission: HomeMissionItem = 
    HOME_MISSIONS.find((m) => m.id === selectedTaskId) ?? HOME_MISSIONS[1];

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
      onEnterSimulator();
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
      {/* Background images for all 4 missions with crossfade */}
      {HOME_MISSIONS.map((m) => (
        <div
          key={m.id}
          className={`home-bg-layer ${selectedTaskId === m.id ? 'active' : ''}`}
          style={{ backgroundImage: `url(${m.image})` }}
          aria-hidden={selectedTaskId !== m.id}
        />
      ))}

      {/* Gradients ensuring readability on the left while preserving visual focus on the right */}
      <div className="home-overlay" />
      <div className="home-ambient-grid" />

      {/* UI Content Layer */}
      <div className="home-ui">
        {/* Top-Left: Big Brand & Mission Title */}
        <header className="home-header">
          <div className="home-brand-tag">
            <span className="indicator-dot" />
            <span>{t('航天飞行模拟系统 · 交互课堂', 'Orbital Flight Simulation Academy')}</span>
          </div>
          <h1 className="home-title">
            <span>VECTOR</span>
            <span className="title-accent">ALIGN</span>
          </h1>
          <p className="home-subtitle">
            {t('矢量轨道 · 太空任务与交会对接沉浸式模拟', 'Hands-on Orbital Mechanics & Spacecraft Docking')}
          </p>
        </header>

        {/* Middle Section: Left Briefing Info + Right Historical Scenario Selector */}
        <div className="home-content-row">
          {/* Left Briefing Card (Teenager-friendly specs & explanation) */}
          <section className="home-briefing-card" aria-label={t('任务简报', 'Mission Briefing')}>
            <div className="briefing-header">
              <div className="briefing-mission-badge">
                <Rocket size={14} />
                <span>
                  {t('任务阶段', 'PHASE')} 0{currentMission.num} · {t(currentMission.titleZh, currentMission.titleEn)}
                </span>
              </div>
              <span className="briefing-tagline">
                {t(currentMission.taglineZh, currentMission.taglineEn)}
              </span>
            </div>

            <div className="briefing-specs-grid">
              <div className="spec-item">
                <span className="spec-label">
                  <Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  {t('模拟时间', 'TIME')}
                </span>
                <span className="spec-value">{t(currentMission.specs.timeZh, currentMission.specs.timeEn)}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">
                  <Layers size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  {t('演练阶段', 'STAGE')}
                </span>
                <span className="spec-value">{t(currentMission.specs.stageZh, currentMission.specs.stageEn)}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">
                  <MapPin size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  {t('任务地点', 'ORBIT')}
                </span>
                <span className="spec-value">{t(currentMission.specs.locationZh, currentMission.specs.locationEn)}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">
                  <Rocket size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                  {t('飞船型号', 'VEHICLE')}
                </span>
                <span className="spec-value">{t(currentMission.specs.vehicleZh, currentMission.specs.vehicleEn)}</span>
              </div>
            </div>

            <p className="briefing-summary">
              {t(currentMission.summaryZh, currentMission.summaryEn)}
            </p>

            {/* Science Explanation Box for Teenagers */}
            <div className="science-tip-box">
              <div className="science-tip-title">
                <Sparkles size={13} />
                <span>
                  {t('青少年航天小百科 · ', 'Space Science Tip · ')}
                  {t(currentMission.scienceTip.termZh, currentMission.scienceTip.termEn)}
                </span>
              </div>
              <p className="science-tip-desc">
                {t(currentMission.scienceTip.explanationZh, currentMission.scienceTip.explanationEn)}
              </p>
            </div>
          </section>

          {/* Right-Side Mission Scenario Selector (Reserved for future historical docking missions) */}
          <aside className="home-right-panel" aria-label={t('历史任务选择', 'Historical Mission Selector')}>
            <div className="scenario-card">
              <div className="scenario-card-header">
                <div className="scenario-card-title">
                  <BookOpen size={14} />
                  <span>{t('演练场景与历史任务', 'Historical Missions')}</span>
                </div>
                <span className="scenario-card-badge">
                  {currentMission.isImplemented ? t('已开放 1 个', '1 Available') : t('筹备中', 'Planning')}
                </span>
              </div>

              <div className="scenario-list">
                {currentMission.historicalScenarios?.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`scenario-item ${selectedScenarioId === s.id && s.isAvailable ? 'active' : ''}`}
                    onClick={() => handleScenarioSelect(s)}
                  >
                    <div className="scenario-top-line">
                      <span className="scenario-name">{t(s.titleZh, s.titleEn)}</span>
                      <span className={`scenario-status ${s.isAvailable ? 'active' : 'pending'}`}>
                        {t(s.statusZh, s.statusEn)}
                      </span>
                    </div>
                    <p className="scenario-desc">{t(s.descZh, s.descEn)}</p>
                  </button>
                ))}
              </div>

              {scenarioTooltip && (
                <div style={{ marginTop: 10, fontSize: 11, color: '#e5be85', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={13} />
                  <span>{scenarioTooltip}</span>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Bottom Row: 6 Menu Buttons on Left, Enter Button on Right */}
        <footer className="home-bottom-row">
          {/* Left-Bottom: Exactly the 6 requested menu items */}
          <nav className="home-menu-stack" aria-label={t('主菜单', 'Main Menu')}>
            {/* 1 升空 */}
            <button
              type="button"
              className={`home-menu-btn ${selectedTaskId === 1 ? 'active' : ''}`}
              onClick={() => handleSelectTask(1)}
            >
              <span>1  {t('升空', 'Liftoff')}</span>
            </button>

            {/* 2 太空站对接 (原项目实现) */}
            <button
              type="button"
              className={`home-menu-btn ${selectedTaskId === 2 ? 'active' : ''}`}
              onClick={() => handleSelectTask(2)}
            >
              <span>2  {t('太空站对接', 'Station Docking')}</span>
              <span className="menu-badge">{t('实装', 'LIVE')}</span>
            </button>

            {/* 3 太空站离开 */}
            <button
              type="button"
              className={`home-menu-btn ${selectedTaskId === 3 ? 'active' : ''}`}
              onClick={() => handleSelectTask(3)}
            >
              <span>3  {t('太空站离开', 'Departure')}</span>
            </button>

            {/* 4 舱体降落 */}
            <button
              type="button"
              className={`home-menu-btn ${selectedTaskId === 4 ? 'active' : ''}`}
              onClick={() => handleSelectTask(4)}
            >
              <span>4  {t('舱体降落', 'Landing')}</span>
            </button>

            {/* 5 选项 */}
            <button
              type="button"
              className="home-menu-btn secondary-action"
              onClick={() => { tone(); setSettingsOpen(true); }}
            >
              <span>5  {t('选项', 'Options')}</span>
            </button>

            {/* 6 制作人员 */}
            <button
              type="button"
              className="home-menu-btn secondary-action"
              onClick={() => { tone(); setCreditsOpen(true); }}
            >
              <span>6  {t('制作人员', 'Credits')}</span>
            </button>
          </nav>

          {/* Right-Bottom: Prominent Enter Button */}
          <div className="home-enter-btn-wrap">
            <button
              type="button"
              className="home-enter-btn"
              onClick={handleEnterClick}
              aria-label={t('进入本次模拟', 'Enter Simulation')}
            >
              <span>{t('进入模拟', 'ENTER SIMULATION')}</span>
              <ArrowRight size={20} />
            </button>
            <span className="home-enter-hint">
              {t('支持鼠标点击或直接按 Enter 键进入', 'Click or press Enter key to start')}
            </span>
          </div>
        </footer>
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
              <strong style={{ fontSize: 13, color: '#e5ece8', display: 'block', marginBottom: 8 }}>
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
              <h4>{t('航天模型与数据致谢', 'Asset Credits & Data')}</h4>
              <p>
                {t(
                  '国际空间站 3D 模型源自 NASA 开放航天资源；真实比例地球卫星贴图源自 NASA Visible Earth 与 Blue Marble 空间观测数据。',
                  'ISS 3D model courtesy of NASA open 3D resources. True-scale Earth textures provided by NASA Visible Earth and Blue Marble imagery.'
                )}
              </p>
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
            <h3 style={{ margin: 0, fontSize: 18, color: '#f1f5f3' }}>
              {t(`【${currentMission.titleZh}】模拟工程正在全力构建中`, `[${currentMission.titleEn}] is currently being constructed`)}
            </h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#b0c2b6' }}>
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

            <div className="modal-actions" style={{ marginTop: 14 }}>
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
