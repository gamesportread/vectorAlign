import { Play } from 'lucide-react';
import { useSession } from '../../store';

export interface BriefingModalProps {
  onStartFlight: () => void;
}

export function BriefingModal({ onStartFlight }: BriefingModalProps) {
  const language = useSession((s) => s.language);
  const config = useSession((s) => s.config);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <>
      <span className="eyebrow">{t(`任务 0${config.id}`, `MISSION 0${config.id}`)}</span>
      <h3>{config.title[language]}</h3>
      <p>{config.brief[language]}</p>
      <p className="modal-highlight">{config.lesson[language]}</p>
      <p>{config.constraints[language]}</p>
      <button className="primary-button" onClick={onStartFlight}>
        <Play size={17} />
        {t('开始训练', 'Take control')}
      </button>
    </>
  );
}
