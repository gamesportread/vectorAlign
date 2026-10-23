import { BookOpen, Pause, Play, RotateCcw, ShieldCheck } from 'lucide-react';
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
      <div className="action-buttons">
        <button
          className="icon-button reset"
          aria-label={t('重置任务', 'Reset mission')}
          onClick={() => reset()}
          title={t('重置任务', 'Reset mission')}
        >
          <RotateCcw size={16} />
        </button>

        <button
          className="secondary-button"
          onClick={onOpenBriefing}
          title={t('查看通关攻略', 'Mission strategy & briefing')}
        >
          <BookOpen size={15} />
          {t('攻略', 'Briefing')}
        </button>

        <button
          className="secondary-button"
          onClick={() => start(true)}
          title={t('观看自动示范', 'Watch AI demo')}
        >
          <Play size={14} />
          {t('观看示范', 'Watch demo')}
        </button>

        <button
          className="primary-button"
          onClick={handlePrimaryClick}
        >
          {isFailed ? <RotateCcw size={16} /> : running ? <Pause size={16} /> : <Play size={16} />}
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

      <div className="constraint">
        <ShieldCheck size={14} />
        <span>{config.constraints[language]}</span>
      </div>
    </div>
  );
}
