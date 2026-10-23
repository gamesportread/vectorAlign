import { Target } from 'lucide-react';
import type { ActiveAlert } from '../../sim/feedback';
import { useSession } from '../../store';
import { AttitudeMonitor } from '../simulator/AttitudeMonitor';
import { ControlPanelSection } from '../simulator/ControlPad';
import { SimulatorView } from '../simulator/SimulatorView';

export interface MissionViewProps {
  constraintAlert: ActiveAlert | null;
  activeShakeAxis: string | null;
  onOpenBriefing: () => void;
}

export function MissionView({
  constraintAlert,
  activeShakeAxis,
  onOpenBriefing
}: MissionViewProps) {
  const language = useSession((s) => s.language);
  const config = useSession((s) => s.config);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <>
      <div className="mission-heading cockpit-header-bar">
        <div className="heading-title-col">
          <h1>
            <span className="title-number">0{config.id}</span>
            {config.title[language]}
            <span className="level-pill">
              {config.id === 4 ? t('综合任务', 'FINAL MISSION') : t('基础训练', 'FOUNDATIONS')}
            </span>
          </h1>
        </div>

        {/* 关卡具体目标与通关要求（同行紧凑集成） */}
        <div className="mission-goal-banner">
          <div className="goal-banner-header">
            <div className="goal-badge">
              <Target size={14} />
              <span>{t('本关目标', 'OBJECTIVE')}</span>
            </div>
            <div className="goal-criteria-pill">
              <span className="criteria-label">{t('🏁 通关要求：', '🏁 Pass: ')}</span>
              <span className="criteria-val">{config.passCriteria ? config.passCriteria[language] : ''}</span>
            </div>
          </div>
          <div className="goal-banner-body">
            <div className="goal-operation-hint">
              <span className="hint-label">{t('🕹️ 怎么操作：', '🕹️ Controls: ')}</span>
              <span className="hint-text">{config.hint ? config.hint[language] : config.brief[language]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D 仿真器与 HUD（遥测栏已集成动作控制与开始键） */}
      <SimulatorView constraintAlert={constraintAlert} onOpenBriefing={onOpenBriefing} />

      {/* 控制台与姿态监视器双列 */}
      <div className="lower-panels">
        <ControlPanelSection activeShakeAxis={activeShakeAxis} />
        <AttitudeMonitor />
      </div>
    </>
  );
}

