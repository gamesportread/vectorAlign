import { useState } from 'react';
import { 
  Rocket, 
  Clock, 
  MapPin, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  Crosshair, 
  BookOpen, 
  Gamepad2, 
  Info,
  ChevronRight,
  Compass
} from 'lucide-react';
import { HOME_MISSIONS } from '../../data/homeMissions';
import { useSession } from '../../store';
import { HotspotChips, sceneHotspots, SceneMap, ShipCloseup, shipHotspots } from '../intro/IntroArt';
import './mission-zero.css';

export interface MissionZeroViewProps {
  onStartFlight: () => void;
}

export function MissionZeroView({ onStartFlight }: MissionZeroViewProps) {
  const language = useSession((s) => s.language);
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  const mission = HOME_MISSIONS[1]; // Station Docking
  const [activeTab, setActiveTab] = useState<'specs' | 'art' | 'roadmap'>('specs');

  // Scene hotspots state for interactive explorer
  const [selectedSceneSpot, setSelectedSceneSpot] = useState('ship');
  const [seenSceneSpots, setSeenSceneSpots] = useState<Set<string>>(() => new Set(['ship']));

  // Ship closeup hotspots state
  const [selectedShipSpot, setSelectedShipSpot] = useState('nose');
  const [seenShipSpots, setSeenShipSpots] = useState<Set<string>>(() => new Set(['nose']));

  const sceneItems = sceneHotspots(t);
  const currentSceneItem = sceneItems.find((h) => h.id === selectedSceneSpot) ?? sceneItems[0];

  const shipItems = shipHotspots(t);
  const currentShipItem = shipItems.find((h) => h.id === selectedShipSpot) ?? shipItems[0];

  const handleSelectSceneSpot = (id: string) => {
    setSelectedSceneSpot(id);
    setSeenSceneSpots((prev) => new Set(prev).add(id));
  };

  const handleSelectShipSpot = (id: string) => {
    setSelectedShipSpot(id);
    setSeenShipSpots((prev) => new Set(prev).add(id));
  };

  return (
    <div className="mission-zero-container" data-testid="mission-zero-view">
      {/* 头部标题与面包屑 */}
      <header className="mission-zero-header">
        <div className="mission-zero-title-group">
          <div className="breadcrumb">
            {t('任务训练', 'MISSIONS')}
            <ChevronRight size={12} />
            <span>{t('第零关 · 阶段通识与飞船导引', 'LEVEL 00 · STAGE BRIEFING & ORIENTATION')}</span>
          </div>
          <h1>
            <span>00</span>
            <span>{t('任务通识 · 太空站对接', 'Stage Briefing · Station Docking')}</span>
            <span className="mission-zero-pill">{t('新手必读', 'FOUNDATION')}</span>
          </h1>
          <p className="mission-zero-subtitle">
            {t(
              '🎯 阶段认知目标：掌握近地轨道交会对接背景、飞船构造与六自由度惯性基本法则。',
              '🎯 Orientation goal: Understand orbital docking parameters, spacecraft anatomy, and 6-DOF laws.'
            )}
          </p>
        </div>

        <div className="heading-coordinate">
          <Crosshair size={22} />
          <span>
            {t('国际空间站 · 和谐号舱', 'ISS · HARMONY')}
            <small>{t('前向对接口 · 400 KM 轨道', 'FORWARD DOCKING PORT · 400 KM LEO')}</small>
          </span>
        </div>
      </header>

      {/* 导航标签切换 */}
      <nav className="mission-zero-nav" aria-label={t('第零关导引导航', 'Level 0 navigation')}>
        <button
          type="button"
          className={`mission-zero-tab ${activeTab === 'specs' ? 'active' : ''}`}
          onClick={() => setActiveTab('specs')}
        >
          <Info size={15} />
          <span>{t('任务档案与工程规格', 'Mission Specs & Background')}</span>
        </button>

        <button
          type="button"
          className={`mission-zero-tab ${activeTab === 'art' ? 'active' : ''}`}
          onClick={() => setActiveTab('art')}
        >
          <Compass size={15} />
          <span>{t('画面与飞船图解探索', 'Scene & Spacecraft Anatomy')}</span>
        </button>

        <button
          type="button"
          className={`mission-zero-tab ${activeTab === 'roadmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('roadmap')}
        >
          <Gamepad2 size={15} />
          <span>{t('四关训练路线与按键', '4-Level Roadmap & Controls')}</span>
        </button>
      </nav>

      {/* 标签 1：任务档案与工程规格（原主页左侧卡片内容融入） */}
      {activeTab === 'specs' && (
        <section className="mission-zero-panel">
          <div className="zero-card">
            <div className="zero-card-header">
              <h3>
                <Rocket size={17} color="var(--lime)" />
                {t('太空站对接 · 任务档案', 'Station Docking · Mission Dossier')}
              </h3>
              <span className="zero-card-tagline">{t(mission.taglineZh, mission.taglineEn)}</span>
            </div>

            <div className="zero-specs-grid">
              <div className="zero-spec-cell">
                <span className="zero-spec-label">
                  <Clock size={13} />
                  {t('模拟时间', 'SIMULATION TIME')}
                </span>
                <span className="zero-spec-val">{t(mission.specs.timeZh, mission.specs.timeEn)}</span>
              </div>

              <div className="zero-spec-cell">
                <span className="zero-spec-label">
                  <Layers size={13} />
                  {t('演练阶段', 'MISSION STAGE')}
                </span>
                <span className="zero-spec-val">{t(mission.specs.stageZh, mission.specs.stageEn)}</span>
              </div>

              <div className="zero-spec-cell">
                <span className="zero-spec-label">
                  <MapPin size={13} />
                  {t('任务轨道与地点', 'ORBIT & LOCATION')}
                </span>
                <span className="zero-spec-val">{t(mission.specs.locationZh, mission.specs.locationEn)}</span>
              </div>

              <div className="zero-spec-cell">
                <span className="zero-spec-label">
                  <Rocket size={13} />
                  {t('飞船与目标型号', 'SPACECRAFT & TARGET')}
                </span>
                <span className="zero-spec-val">{t(mission.specs.vehicleZh, mission.specs.vehicleEn)}</span>
              </div>
            </div>

            <p className="zero-summary-p">
              {t(mission.summaryZh, mission.summaryEn)}
            </p>

            {/* 青少年航天小百科 */}
            <div className="zero-science-box">
              <div className="zero-science-title">
                <Sparkles size={15} />
                <span>
                  {t('青少年航天小百科 · ', 'Space Science Tip · ')}
                  {t(mission.scienceTip.termZh, mission.scienceTip.termEn)}
                </span>
              </div>
              <p className="zero-science-body">
                {t(mission.scienceTip.explanationZh, mission.scienceTip.explanationEn)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 标签 2：画面与飞船构造图解（融入原新手讲解） */}
      {activeTab === 'art' && (
        <section className="mission-zero-panel">
          <div className="zero-card">
            <div className="zero-card-header">
              <h3>
                <Compass size={17} color="var(--lime)" />
                {t('三维画面各要素解析', 'Visual HUD & Scene Recognition')}
              </h3>
              <span className="zero-card-tagline">{t('点击下方部件查看用途', 'Tap parts to explore')}</span>
            </div>

            <div className="intro-art">
              <SceneMap
                t={t}
                selected={selectedSceneSpot}
                seen={seenSceneSpots}
                onSelect={handleSelectSceneSpot}
              />
            </div>

            <HotspotChips
              items={sceneItems}
              selected={selectedSceneSpot}
              seen={seenSceneSpots}
              onSelect={handleSelectSceneSpot}
            />

            <div className="intro-card" aria-live="polite" style={{ marginTop: 14 }}>
              <strong>{sceneItems.indexOf(currentSceneItem) + 1}. {currentSceneItem.name}</strong>
              <p>{currentSceneItem.text}</p>
            </div>
          </div>

          <div className="zero-card">
            <div className="zero-card-header">
              <h3>
                <Rocket size={17} color="var(--lime)" />
                {t('你的飞船结构与推进器', 'Spacecraft Anatomy & Thrusters')}
              </h3>
              <span className="zero-card-tagline">{t('对接口 · 喷气嘴 · 乘员舱', 'Hatch, RCS jets & cabin')}</span>
            </div>

            <div className="intro-art">
              <ShipCloseup
                t={t}
                selected={selectedShipSpot}
                seen={seenShipSpots}
                onSelect={handleSelectShipSpot}
              />
            </div>

            <HotspotChips
              items={shipItems}
              selected={selectedShipSpot}
              seen={seenShipSpots}
              onSelect={handleSelectShipSpot}
            />

            <div className="intro-card" aria-live="polite" style={{ marginTop: 14 }}>
              <strong>{shipItems.indexOf(currentShipItem) + 1}. {currentShipItem.name}</strong>
              <p>{currentShipItem.text}</p>
            </div>
          </div>
        </section>
      )}

      {/* 标签 3：四关演练路线与按键操作 */}
      {activeTab === 'roadmap' && (
        <section className="mission-zero-panel">
          <div className="zero-card">
            <div className="zero-card-header">
              <h3>
                <BookOpen size={17} color="var(--lime)" />
                {t('空间站对接 · 四关训练进阶路线', '4-Level Progressive Training Roadmap')}
              </h3>
              <span className="zero-card-tagline">{t('从单轴刹车到全自主对接', 'From braking to manual docking')}</span>
            </div>

            <div className="zero-roadmap-grid">
              <div className="roadmap-step">
                <span className="step-badge">STAGE 01</span>
                <strong className="step-title">{t('学会停下来', 'Learn to Stop')}</strong>
                <p className="step-desc">
                  {t('在前方 8 米黄圈等待点完全停稳。建立反推刹车直觉，理解松手不会自己停下的太空惯性。', 'Stop dead inside the 8m yellow hold point. Build braking reflexes against inertia.')}
                </p>
              </div>

              <div className="roadmap-step">
                <span className="step-badge">STAGE 02</span>
                <strong className="step-title">{t('消除横向漂移', 'Cancel Drift')}</strong>
                <p className="step-desc">
                  {t('使用上下与左右侧向喷气微调，把飞船推回正中心走廊，并消除横向侧滑速度。', 'Use lateral thrusters to align with the green center crosshair and zero out sideways speed.')}
                </p>
              </div>

              <div className="roadmap-step">
                <span className="step-badge">STAGE 03</span>
                <strong className="step-title">{t('对准接口', 'Align Port')}</strong>
                <p className="step-desc">
                  {t('三轴旋转微调机头俯仰、偏航与滚转，正对空间站圆形舱门，并在对齐瞬间停住自转。', 'Rotate pitch, yaw, and roll to face the hatch, then counter-tap to halt rotation.')}
                </p>
              </div>

              <div className="roadmap-step">
                <span className="step-badge">STAGE 04</span>
                <strong className="step-title">{t('最后 50 米', 'Final 50 Metres')}</strong>
                <p className="step-desc">
                  {t('综合运用所学技能，从 50 米外独立完成全流程逼近，以低于 0.15 m/s 极低速轻柔触碰锁紧！', 'Full manual docking from 50m. Touch the docking ring at under 0.15 m/s softly.')}
                </p>
              </div>
            </div>
          </div>

          <div className="zero-card">
            <div className="zero-card-header">
              <h3>
                <Gamepad2 size={17} color="var(--lime)" />
                {t('飞行键盘操纵速查表', 'Flight Keyboard Controls Cheatsheet')}
              </h3>
            </div>

            <div className="controls-help-grid">
              <div className="controls-help-item">
                <span>{t('前进靠近 / 反向刹车', 'Fore / Aft Thrust')}</span>
                <div><kbd>W</kbd> <kbd>S</kbd> / <kbd>R</kbd> <kbd>F</kbd></div>
              </div>
              <div className="controls-help-item">
                <span>{t('左右平移 (消除侧漂)', 'Left / Right Thrust')}</span>
                <div><kbd>A</kbd> <kbd>D</kbd></div>
              </div>
              <div className="controls-help-item">
                <span>{t('姿态俯仰与偏航转向', 'Pitch & Yaw Rotation')}</span>
                <div><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd></div>
              </div>
              <div className="controls-help-item">
                <span>{t('自身滚转对齐', 'Roll Rotation')}</span>
                <div><kbd>Q</kbd> <kbd>E</kbd></div>
              </div>
              <div className="controls-help-item" style={{ gridColumn: 'span 2' }}>
                <span>{t('紧急全向制动 (所有轴减速停稳)', 'Emergency All-Stop Brake')}</span>
                <div><kbd>Space 空格键</kbd></div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 底部醒目操作栏 */}
      <footer className="mission-zero-action-bar">
        <div className="action-bar-info">
          <strong>{t('准备好开始你的宇航员对接训练了吗？', 'Ready to start your docking training?')}</strong>
          <span>{t('第一关将训练最基础、最重要的本领：反向制动并在 8 米等待点停稳飞船。', 'Mission 1 trains the core skill: reverse braking to stop inside the 8m hold point.')}</span>
        </div>

        <button
          type="button"
          className="start-level1-btn"
          onClick={onStartFlight}
        >
          <span>{t('🚀 开始第 1 关训练：学会停下来', 'Launch Mission 01: Learn to Stop')}</span>
          <ArrowRight size={18} />
        </button>
      </footer>
    </div>
  );
}
