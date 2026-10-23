import { Crosshair } from 'lucide-react';
import { angleError, angularSpeed, attitude } from '../../sim/engine';
import { useSession } from '../../store';

export function AttitudeMonitor() {
  const language = useSession((s) => s.language);
  const flight = useSession((s) => s.flight);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const angles = attitude(flight);
  const totalAngle = angleError(flight);
  const rate = angularSpeed(flight);

  const axisLabels = [
    t('俯仰', 'PITCH'),
    t('偏航', 'YAW'),
    t('滚转', 'ROLL')
  ];

  const isAligned = totalAngle <= 2.0;

  return (
    <section className="attitude-panel">
      <div className="panel-heading">
        <h3>
          <Crosshair size={17} />
          {t('姿态监视', 'Attitude monitor')}
          {isAligned && <span className="aligned-tag">{t('● 已对准', '● ALIGNED')}</span>}
        </h3>
        <span className="eyebrow">{t('单位：角度 (°)', 'DEG')}</span>
      </div>

      <div className="attitude-values">
        {angles.map((v, i) => {
          const inSafe = Math.abs(v) <= 2.0;
          return (
            <div key={i}>
              <span>{axisLabels[i]}</span>
              <strong className={inSafe ? 'val-aligned' : ''}>
                {v.toFixed(1)}
                <small>°</small>
              </strong>
              <div className="angle-track">
                <i style={{ left: `${Math.max(4, Math.min(96, 50 + v))}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <p>
        {t('姿态偏差角度', 'Total error')}{' '}
        <b className={isAligned ? 'val-aligned' : ''}>{totalAngle.toFixed(1)}°</b>
        <span>
          {t('旋转速度', 'Angular rate')} <b>{rate.toFixed(1)}°/s</b>
        </span>
      </p>
    </section>
  );
}
