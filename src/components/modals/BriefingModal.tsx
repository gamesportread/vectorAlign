import { CheckCircle2, Gamepad2, Lightbulb, Lock, Play, Rocket, Target } from 'lucide-react';
import { useSession } from '../../store';

export interface BriefingModalProps {
  onStartFlight: () => void;
}

export function BriefingModal({ onStartFlight }: BriefingModalProps) {
  const language = useSession((s) => s.language);
  const config = useSession((s) => s.config);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <div className="briefing-modal-content">
      <span className="eyebrow">{t(`任务 0${config.id} 通关攻略`, `MISSION 0${config.id} BRIEFING`)}</span>
      <h3 className="briefing-modal-title">{config.title[language]}</h3>

      <div className="briefing-card-grid">
        <div className="briefing-card goal-card">
          <div className="card-tag">
            <Target size={15} />
            <span>{t('具体目标', 'SPECIFIC GOAL')}</span>
          </div>
          <p className="card-text">
            {config.objective ? config.objective[language] : config.subtitle[language]}
          </p>
        </div>

        <div className="briefing-card hint-card">
          <div className="card-tag">
            <Gamepad2 size={15} />
            <span>{t('关键操作', 'CONTROLS & HOW-TO')}</span>
          </div>
          <p className="card-text">
            {config.hint ? config.hint[language] : config.brief[language]}
          </p>
        </div>

        <div className="briefing-card criteria-card">
          <div className="card-tag">
            <CheckCircle2 size={15} />
            <span>{t('通关判定标准', 'PASS CRITERIA')}</span>
          </div>
          <p className="card-text">
            {config.passCriteria ? config.passCriteria[language] : ''}
          </p>
        </div>
      </div>

      <div className="briefing-note-box">
        <div className="note-title">
          <Lightbulb size={15} />
          <span>{t('飞行原理小知识', 'FLIGHT PRINCIPLE')}</span>
        </div>
        <p>{config.lesson[language]}</p>
      </div>

      <div className="briefing-fun-fact-box">
        <div className="fun-fact-title">
          <Rocket size={15} />
          <span>{t('🚀 航天冷知识：为什么载人龙飞船机头有个舱门盖？', '🚀 Space Fun Fact: Why Crew Dragon Has a Nose Cone Hatch')}</span>
        </div>
        <p>
          {t(
            '头锥保护罩（Nosecone Hatch）：就像飞船的头盔面罩！在穿过大气层发射时挡风挡热；到了太空准备对接空间站时，按下 [1] 键打开它，露出对接口（IDA），才能和空间站锁扣锁在一起！',
            'Nosecone Hatch: Just like a helmet visor for the spacecraft! It shields against heat and wind during launch; once in space, press [1] to open it, reveal the International Docking Adapter (IDA), and lock with the station!'
          )}
        </p>
        <p>
          {t(
            '国际对接口（IDA）：飞船头部的锁扣大门，带有高精度的锁扣环。打开头锥后，必须把对接口平稳对准空间站的 PMA-2 接口！',
            'International Docking Adapter (IDA): The docking doorway at the ship nose with precision latching rings. Once open, align it smoothly with the station’s PMA-2 port!'
          )}
        </p>
      </div>

      <div className="briefing-constraints-line">
        <Lock size={13} />
        <span>{config.constraints[language]}</span>
      </div>

      <button className="primary-button briefing-start-btn" onClick={onStartFlight}>
        <Play size={17} />
        {t('开始驾驶飞船', 'Take control & Start')}
      </button>
    </div>
  );
}
