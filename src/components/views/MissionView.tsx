import { BookOpen, ChevronRight, Crosshair } from 'lucide-react';
import type { ActiveAlert } from '../../sim/feedback';
import { useSession } from '../../store';
import { AttitudeMonitor } from '../simulator/AttitudeMonitor';
import { ControlPanelSection } from '../simulator/ControlPad';
import { FlightActions } from '../simulator/FlightActions';
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
      <div className="mission-heading">
        <div>
          <div className="breadcrumb">
            {t('任务训练', 'MISSIONS')}
            <ChevronRight size={12} />
            <span>{t('近距离对接', 'PROXIMITY OPERATIONS')}</span>
          </div>
          <h1>
            <span className="title-number">0{config.id}</span>
            {config.title[language]}
            <span className="level-pill">
              {config.id === 4 ? t('综合任务', 'FINAL MISSION') : t('基础训练', 'FOUNDATIONS')}
            </span>
          </h1>
          <p>
            {config.subtitle[language]}
            <span className="heading-divider">/</span>
            {t('原理教学训练', 'Educational flight simulation')}
          </p>
        </div>

        <div className="heading-coordinate">
          <Crosshair size={22} />
          <span>
            {t('国际空间站 · 和谐号舱', 'ISS · HARMONY')}
            <small>{t('前向对接口', 'FORWARD DOCKING PORT')}</small>
          </span>
        </div>
      </div>

      {/* 3D 仿真器与 HUD */}
      <SimulatorView constraintAlert={constraintAlert} />

      {/* 动作栏 */}
      <FlightActions onOpenBriefing={onOpenBriefing} />

      {/* 控制台与姿态监视器双列 */}
      <div className="lower-panels">
        <ControlPanelSection activeShakeAxis={activeShakeAxis} />
        <AttitudeMonitor />
      </div>

      {/* 关卡笔记 */}
      <div className="lesson-strip">
        <span className="lesson-icon">
          <BookOpen size={18} />
        </span>
        <p>
          <strong>{t('飞行笔记', 'Flight note')}</strong>
          {config.lesson[language]}
        </p>
      </div>
    </>
  );
}
