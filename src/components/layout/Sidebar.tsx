import { ArrowRight, Check, ChevronRight, LockKeyhole, Orbit, ShieldCheck } from 'lucide-react';
import { scenarios } from '../../sim/scenarios';
import { useSession } from '../../store';

export interface SidebarProps {
  isOpenMobile: boolean;
  onSelectMission: (id: number) => void;
  onOpenFreeFlight: () => void;
  onOpenGuide: () => void;
}

export function Sidebar({
  isOpenMobile,
  onSelectMission,
  onOpenFreeFlight,
  onOpenGuide
}: SidebarProps) {
  const language = useSession((s) => s.language);
  const completed = useSession((s) => s.completed);
  const currentId = useSession((s) => s.config.id);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const isLabUnlocked = completed.includes(4);

  return (
    <aside className={`sidebar ${isOpenMobile ? 'mobile-open' : ''}`}>
      <div className="course-label">
        <span className="eyebrow">{t('飞行训练计划 01', 'FLIGHT PROGRAM 01')}</span>
        <span className="small-pill">{t('近地轨道', 'LEO')}</span>
      </div>

      <h2>{t('对接，从这里开始', 'Your approach starts here.')}</h2>
      <p className="sidebar-intro">
        {t('最后 100 米，每一次推进都有意义。', 'The final 100 metres. Every impulse matters.')}
      </p>

      <div className="progress-caption">
        <span>{t('训练进度', 'Course progress')}</span>
        <strong>
          {completed.length}
          <span> / 4</span>
        </strong>
      </div>

      <div className="progress-track">
        {scenarios.map((sc) => (
          <span
            key={sc.id}
            className={completed.includes(sc.id) ? 'complete' : ''}
          />
        ))}
      </div>

      <div className="mission-list">
        {scenarios.map((sc) => {
          const isDone = completed.includes(sc.id);
          const isSelected = currentId === sc.id;
          return (
            <button
              key={sc.id}
              className={`mission-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectMission(sc.id)}
            >
              <span className="mission-number">
                {isDone ? <><Check size={18} /><span className="sr-only">0{sc.id}</span></> : String(sc.id).padStart(2, '0')}
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

      <button
        className="free-link unlocked"
        onClick={onOpenFreeFlight}
      >
        <Orbit size={18} />
        <span>{t('自由飞行实验室', 'Free-flight lab')}</span>
        <ChevronRight size={15} />
      </button>

      <div className="sidebar-note">
        <div className="note-orbit">
          <Orbit size={25} />
        </div>
        <span className="eyebrow">{t('在实践中学习', 'LEARN BY DOING')}</span>
        <p>
          {t('太空中没有刹车踏板。只有你，和牛顿运动定律。', 'No brake pedals in space. Just you, and Newton’s laws.')}
        </p>
        <button onClick={onOpenGuide}>
          {t('认识对接原理', 'Explore the science')}
          <ArrowRight size={15} />
        </button>
      </div>

      <div className="local-status">
        <ShieldCheck size={14} />
        {t('进度保存在本机', 'Progress saved on this device')}
      </div>
    </aside>
  );
}
