import { BookOpen, GraduationCap, Pause, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { tone, useSession } from '../../store';

export interface FlightActionsProps {
  onOpenBriefing: () => void;
}

export function FlightActions({ onOpenBriefing }: FlightActionsProps) {
  const language = useSession((s) => s.language);
  const config = useSession((s) => s.config);
  const flight = useSession((s) => s.flight);
  const running = useSession((s) => s.running);
  const reset = useSession((s) => s.reset);
  const start = useSession((s) => s.start);
  const pause = useSession((s) => s.pause);
  const resume = useSession((s) => s.resume);
  const introSeen = useSession((s) => s.introSeen);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const isFailed = flight.status === 'failed';
  const isPaused = flight.status === 'flying' && !running;

  const handlePrimaryClick = () => {
    tone();
    if (isFailed) {
      start();
    } else if (running) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      start();
    }
  };

  return (
    <div className="flight-actions">
      <div className="constraint">
        <ShieldCheck size={17} />
        <span>{config.constraints[language]}</span>
      </div>

      <div className="action-buttons">
        <button
          className="icon-button reset"
          aria-label={t('重置任务', 'Reset mission')}
          onClick={() => reset()}
        >
          <RotateCcw size={18} />
        </button>

        <button
          className={`secondary-button ${!introSeen ? 'guide-highlight' : ''}`}
          onClick={() => useSession.getState().openIntro(0)}
        >
          <GraduationCap size={16} />
          {t('新手讲解', 'Guide')}
          {!introSeen && <span className="guide-new-badge">{t('推荐', 'New')}</span>}
        </button>

        <button
          className="secondary-button"
          onClick={onOpenBriefing}
        >
          <BookOpen size={16} />
          {t('任务简报', 'Briefing')}
        </button>

        <button
          className="secondary-button"
          onClick={() => start(true)}
        >
          <Play size={15} />
          {t('观看示范', 'Watch demo')}
        </button>

        <button
          className="primary-button"
          onClick={handlePrimaryClick}
        >
          {isFailed ? <RotateCcw size={17} /> : running ? <Pause size={17} /> : <Play size={17} />}
          <span>
            {isFailed
              ? t('重新开始 (R)', 'Retry (R)')
              : running
              ? t('暂停', 'Pause')
              : isPaused
              ? t('继续飞行', 'Resume')
              : t('开始训练', 'Take control')}
          </span>
        </button>
      </div>
    </div>
  );
}
