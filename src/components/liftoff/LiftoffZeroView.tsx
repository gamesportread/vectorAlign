import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock,
  Compass,
  Crosshair,
  Gamepad2,
  Info,
  Layers,
  MapPin,
  Rocket,
  Sparkles
} from 'lucide-react';
import { HOME_MISSIONS } from '../../data/homeMissions';
import { LIFTOFF_GLOSSARY, type RocketVehicleConfig } from '../../sim/liftoff';
import type { Language } from '../../sim/types';
import '../views/mission-zero.css';

export interface LiftoffZeroViewProps {
  vehicle: RocketVehicleConfig;
  language: Language;
  onStartFlight: () => void;
}

interface RocketAnatomySpot {
  id: string;
  nameZh: string;
  nameEn: string;
  textZh: string;
  textEn: string;
  yPct: number;
}

const ANATOMY_SPOTS: RocketAnatomySpot[] = [
  {
    id: 'les',
    nameZh: '发射逃逸塔 (LES)',
    nameEn: 'Launch Escape System (LES)',
    textZh: '安装在火箭最尖端的固体救生小火箭！万一火箭在起飞或穿云时发生爆炸，它能在 0.1 秒内拽着宇航员座舱猛冲逃命。等火箭冲出 92 公里稠密大气层安全后，就要按 [J] 键把它抛掉，省下 4 吨重量！',
    textEn: 'Emergency solid rocket tower on the nose! If the booster fails during atmospheric ascent, it pulls the crew capsule to safety. Above 92 km, jettison it with [J] to shed 4 tonnes of dead weight!',
    yPct: 8
  },
  {
    id: 'payload',
    nameZh: '载人飞船有效载荷 (Payload)',
    nameEn: 'Crew Spacecraft Payload',
    textZh: '整枚百米巨型火箭唯一要送进太空的“乘客”！占全箭总重不到 2%（约 47 吨），其余 98% 全是为了把它推上第一宇宙速度而燃烧的燃料和金属箭体。',
    textEn: 'The crew spacecraft at the top makes up less than 2% of the rocket’s total mass (~47 t). The other 98% is fuel and stages needed to reach 7.8 km/s!',
    yPct: 20
  },
  {
    id: 's4b',
    nameZh: '第三级 S-IVB（1× J-2 入轨级）',
    nameEn: 'Stage 3 · S-IVB (1× J-2 Orbital Stage)',
    textZh: '装有 1 台 J-2 液氢液氧发动机，负责在接近 185 公里最高点（远地点 Ap）时把机头放平，向东冲刺到每秒 7.8 公里的“第一宇宙速度”，让飞船正式进入绕地圆轨道！',
    textEn: 'Equipped with a single restartable J-2 hydrolox engine, burning horizontally near 185 km Apoapsis to reach 7.8 km/s circular orbital velocity.',
    yPct: 35
  },
  {
    id: 's2',
    nameZh: '第二级 S-II（5× J-2 高空接力级）',
    nameEn: 'Stage 2 · S-II (5× J-2 Upper Stage)',
    textZh: '在一级燃料烧光抛离后接力点火！5 台液氢发动机在几乎没有空气的高空效率极高（真空比冲高达 421 秒），一路把远地点推升至 180 公里以上。',
    textEn: 'Ignites after Stage 1 separation! Five high-efficiency J-2 liquid hydrogen engines (421 s vacuum Isp) push Apoapsis above 180 km.',
    yPct: 56
  },
  {
    id: 's1',
    nameZh: '第一级 S-IC（5× F-1 巨型煤油发动机）',
    nameEn: 'Stage 1 · S-IC (5× F-1 Main Booster)',
    textZh: '力量霸主！装有 2146 吨煤油与液氧，底部 5 台 F-1 发动机每秒狂吞 13 吨燃料，喷出 3470 吨推力把三千吨巨箭托举升空。燃料烧完后剩下的 130 吨空壳必须立刻按 [Space] 抛掉！',
    textEn: 'Loaded with 2,146 tonnes of RP-1/LOX! Five F-1 engines burn 13 tonnes of fuel per second to lift the 2,950-tonne stack. Once empty, press [Space] immediately to drop its 130-tonne dry shell!',
    yPct: 82
  }
];

export function LiftoffZeroView({ vehicle, language, onStartFlight }: LiftoffZeroViewProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const mission = HOME_MISSIONS[0]; // 1 升空

  const [activeTab, setActiveTab] = useState<'specs' | 'anatomy' | 'roadmap'>('specs');
  const [selectedSpotId, setSelectedSpotId] = useState<string>('s1');

  const currentSpot =
    ANATOMY_SPOTS.find((s) => s.id === selectedSpotId) ?? ANATOMY_SPOTS[4];

  return (
    <div className="mission-zero-container" data-testid="liftoff-zero-view">
      {/* 头部标题与面包屑 */}
      <header className="mission-zero-header">
        <div className="mission-zero-title-group">
          <div className="breadcrumb">
            {t('升空入轨训练', 'LIFTOFF PROGRAM')}
            <ChevronRight size={12} />
            <span>{t('第零关 · 阶段通识与火箭导引', 'LEVEL 00 · ROCKET ANATOMY & ASCENT LAWS')}</span>
          </div>
          <h1>
            <span>00</span>
            <span>{t('任务通识 · 火箭升空', 'Stage Briefing · Rocket Liftoff')}</span>
            <span className="mission-zero-pill">{t('新手必读', 'FOUNDATION')}</span>
          </h1>
          <p className="mission-zero-subtitle">
            {t(
              '🎯 阶段认知目标：理解推重比 (TWR)、最大动压 (Max-Q) 重力转向、级间分离与 7.8 km/s 第一宇宙速度入轨法则。',
              '🎯 Orientation goal: Master Thrust-to-Weight Ratio (TWR), Max-Q Gravity Turn, Multi-stage Separation, and 7.8 km/s Orbital Insertion.'
            )}
          </p>
        </div>

        <div className="heading-coordinate">
          <Crosshair size={22} />
          <span>
            {vehicle.name[language].split('·')[0]}
            <small>{vehicle.launchSite[language]}</small>
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
          className={`mission-zero-tab ${activeTab === 'anatomy' ? 'active' : ''}`}
          onClick={() => setActiveTab('anatomy')}
        >
          <Compass size={15} />
          <span>{t('三级火箭解剖与词典', '3-Stage Rocket Anatomy & Glossary')}</span>
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

      {/* 标签 1：任务档案与工程规格 */}
      {activeTab === 'specs' && (
        <section className="mission-zero-panel">
          <div className="zero-card">
            <div className="zero-card-header">
              <h3>
                <Rocket size={17} color="var(--lime)" />
                {t('火箭升空 · 任务档案', 'Rocket Liftoff · Mission Dossier')}
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
                  {t('发射工位与目标轨道', 'LAUNCH SITE & ORBIT')}
                </span>
                <span className="zero-spec-val">{vehicle.launchSite[language]} ➔ 185 km LEO</span>
              </div>

              <div className="zero-spec-cell">
                <span className="zero-spec-label">
                  <Rocket size={13} />
                  {t('当前执飞运载火箭', 'LAUNCH VEHICLE')}
                </span>
                <span className="zero-spec-val">{vehicle.name[language]}</span>
              </div>
            </div>

            <p className="zero-summary-p">{t(mission.summaryZh, mission.summaryEn)}</p>

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

      {/* 标签 2：三级火箭交互式解剖图解与专业词汇科普 */}
      {activeTab === 'anatomy' && (
        <section className="mission-zero-panel">
          <div className="zero-card">
            <div className="zero-card-header">
              <h3>
                <Compass size={17} color="var(--lime)" />
                {t('巨型多级运载火箭结构解剖', 'Multi-Stage Launch Vehicle Anatomy')}
              </h3>
              <span className="zero-card-tagline">{t('点击各级部件查看原理', 'Tap stages to inspect')}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {ANATOMY_SPOTS.map((spot, idx) => (
                <button
                  key={spot.id}
                  type="button"
                  className={`secondary-button ${selectedSpotId === spot.id ? 'active' : ''}`}
                  style={{
                    borderColor: selectedSpotId === spot.id ? 'var(--lime)' : undefined,
                    color: selectedSpotId === spot.id ? 'var(--lime)' : undefined
                  }}
                  onClick={() => setSelectedSpotId(spot.id)}
                >
                  <span>{idx + 1}. {t(spot.nameZh, spot.nameEn)}</span>
                </button>
              ))}
            </div>

            <div className="intro-card" aria-live="polite">
              <strong>{t(currentSpot.nameZh, currentSpot.nameEn)}</strong>
              <p>{t(currentSpot.textZh, currentSpot.textEn)}</p>
            </div>
          </div>

          <div className="zero-card">
            <div className="zero-card-header">
              <h3>
                <Sparkles size={17} color="var(--lime)" />
                {t('青少年火箭升空五大核心词汇详解', '5 Core Rocketry Concepts Explained Simply')}
              </h3>
            </div>

            <div className="zero-roadmap-grid">
              {LIFTOFF_GLOSSARY.map((g) => (
                <div key={g.id} className="roadmap-step">
                  <strong className="step-title" style={{ color: 'var(--lime)' }}>
                    {g.term[language]}
                  </strong>
                  <small style={{ display: 'block', color: '#9cb0a4', marginBottom: 6 }}>
                    {g.shortDesc[language]}
                  </small>
                  <p className="step-desc">{g.teenExplanation[language]}</p>
                </div>
              ))}
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
                {t('火箭升空 · 四关训练进阶路线', '4-Level Progressive Liftoff Roadmap')}
              </h3>
              <span className="zero-card-tagline">{t('从点火离地到 7.8 km/s 入轨', 'From pad ignition to 7.8 km/s orbit')}</span>
            </div>

            <div className="zero-roadmap-grid">
              <div className="roadmap-step">
                <span className="step-badge">STAGE 01</span>
                <strong className="step-title">{t('拔地而起 · 推重比与程序仰角', 'Pad Liftoff & Pitch-Over')}</strong>
                <p className="step-desc">
                  {t('推满 100% 油门使推重比 (TWR) 超过 1.15，按空格键解锁发射台，飞过 150 米塔架后向东微倾爬升至 8 公里。', 'Full throttle ignition, release clamps at TWR > 1.15, clear the 150 m tower, and pitch east to 8 km.')}
                </p>
              </div>

              <div className="roadmap-step">
                <span className="step-badge">STAGE 02</span>
                <strong className="step-title">{t('穿云破障 · 最大动压与重力转向', 'Max-Q & Gravity Turn')}</strong>
                <p className="step-desc">
                  {t('在 13 公里跨音速风暴区紧贴导航球黄色速度圈 (Prograde)，控制攻角安全扛过最大动压 (Max-Q) 冲上 35 公里。', 'Track the yellow Prograde vector closely through 13 km Max-Q without aerodynamic breakup.')}
                </p>
              </div>

              <div className="roadmap-step">
                <span className="step-badge">STAGE 03</span>
                <strong className="step-title">{t('接力冲刺 · 级间分离与抛逃逸塔', 'Staging & Drop Dead Weight')}</strong>
                <p className="step-desc">
                  {t('在一级燃料耗尽 (MECO) 瞬间按空格抛掉 130 吨空桶并点燃二级，过 92 公里抛掉逃逸塔，把远地点推过 165 公里。', 'Stage at MECO to drop the 130t empty booster, ignite Stage 2, jettison LES > 92 km, and push Ap > 165 km.')}
                </p>
              </div>

              <div className="roadmap-step">
                <span className="step-badge">STAGE 04</span>
                <strong className="step-title">{t('直抵星辰 · 第一宇宙速度与圆轨入轨', 'Orbit Insertion · 7.8 km/s')}</strong>
                <p className="step-desc">
                  {t('在接近 185 公里远地点时把机头放平，向东全力加速至 7.8 km/s 第一宇宙速度，把近地点抬升过 155 公里入轨！', 'Level the nose horizontally near Apoapsis and accelerate to 7.8 km/s to raise Periapsis > 155 km!')}
                </p>
              </div>
            </div>
          </div>

          <div className="zero-card">
            <div className="zero-card-header">
              <h3>
                <Gamepad2 size={17} color="var(--lime)" />
                {t('KSP 风格升空键盘操控速查表', 'KSP-Style Liftoff Keyboard Controls')}
              </h3>
            </div>

            <div className="controls-help-grid">
              <div className="controls-help-item">
                <span>{t('100% 满油门 / 0% 紧急关机', 'Full Throttle / Cut Engine')}</span>
                <div><kbd>Z</kbd> / <kbd>X</kbd></div>
              </div>
              <div className="controls-help-item">
                <span>{t('连续加大 / 减小节流阀油门', 'Throttle Up / Down')}</span>
                <div><kbd>Shift</kbd> <kbd>Ctrl</kbd> / <kbd>W</kbd> <kbd>S</kbd></div>
              </div>
              <div className="controls-help-item">
                <span>{t('抬高机头 / 向东压低俯仰角', 'Pitch Up / Pitch East')}</span>
                <div><kbd>A</kbd> <kbd>D</kbd> / <kbd>←</kbd> <kbd>→</kbd></div>
              </div>
              <div className="controls-help-item">
                <span>{t('抛离救生逃逸塔 (LES)', 'Jettison Escape Tower')}</span>
                <div><kbd>J</kbd></div>
              </div>
              <div className="controls-help-item" style={{ gridColumn: 'span 2' }}>
                <span>{t('解锁发射台牵制臂 / 触发一二级分离 (Staging)', 'Release Launch Clamps / Trigger Stage Separation')}</span>
                <div><kbd>Space 空格键</kbd></div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 底部醒目操作栏 */}
      <footer className="mission-zero-action-bar">
        <div className="action-bar-info">
          <strong>{t('准备好点燃三千吨巨型火箭冲向太空了吗？', 'Ready to ignite the 2,950-tonne moon rocket?')}</strong>
          <span>{t('第 1 关将带你从发射台点火开始，亲手解锁牵制臂并完成初始程序转弯。', 'Mission 1 starts on Launch Complex 39A: full throttle ignition, clamp release, and pitch-over.')}</span>
        </div>

        <button
          type="button"
          className="start-level1-btn"
          onClick={onStartFlight}
        >
          <span>{t('🚀 开始第 1 关训练：拔地而起', 'Launch Mission 01: Pad Liftoff')}</span>
          <ArrowRight size={18} />
        </button>
      </footer>
    </div>
  );
}
