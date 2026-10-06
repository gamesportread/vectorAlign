import { angleError, angularSpeed, lateralError } from '../../sim/engine';
import { useSession } from '../../store';
import { Metric } from '../common/Metric';

export function TelemetryBar() {
  const language = useSession((s) => s.language);
  const config = useSession((s) => s.config);
  const flight = useSession((s) => s.flight);
  const mode = useSession((s) => s.mode);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const rotationReadout = config.id === 3 || mode === 'rotate';

  const portDistanceVal = Math.max(0, flight.position[2]).toFixed(2);
  const portDistanceDetail =
    config.id === 1
      ? t('目标等待点 8.00 米', 'Hold point 8.00 m')
      : t('到空间站对接口距离', 'Relative to docking port');

  const secondMetricLabel = rotationReadout
    ? t('姿态偏差角度', 'ATTITUDE ERROR')
    : t('接近速度', 'CLOSING SPEED');
  const secondMetricVal = (
    rotationReadout ? angleError(flight) : -flight.velocity[2]
  ).toFixed(2);
  const secondMetricUnit = rotationReadout ? '°' : 'm/s';
  const secondMetricDetail = rotationReadout
    ? t('目标小于 2° (允许范围)', 'Target below 2°')
    : t('负值表示正在远离', 'Negative means moving away');

  const thirdMetricLabel = rotationReadout
    ? t('旋转速度', 'ANGULAR RATE')
    : t('中心偏离距离', 'LATERAL OFFSET');
  const thirdMetricVal = (
    rotationReadout ? angularSpeed(flight) : lateralError(flight)
  ).toFixed(2);
  const thirdMetricUnit = rotationReadout ? '°/s' : 'm';
  const thirdMetricDetail = rotationReadout
    ? t('对准后还需要停止旋转', 'Stop rotating after alignment')
    : (language === 'zh'
        ? `左右 ${flight.position[0].toFixed(2)}m · 上下 ${flight.position[1].toFixed(2)}m`
        : `X ${flight.position[0].toFixed(2)} · Y ${flight.position[1].toFixed(2)}`);

  return (
    <div className="telemetry">
      <Metric
        label={t('距对接口', 'PORT DISTANCE')}
        value={portDistanceVal}
        unit="m"
        detail={portDistanceDetail}
      />
      <Metric
        label={secondMetricLabel}
        value={secondMetricVal}
        unit={secondMetricUnit}
        accent
        detail={secondMetricDetail}
      />
      <Metric
        label={thirdMetricLabel}
        value={thirdMetricVal}
        unit={thirdMetricUnit}
        detail={thirdMetricDetail}
      />
      <Metric
        label={t('推进燃料', 'THRUSTER RESERVE')}
        value={flight.fuel.toFixed(0)}
        unit="%"
        detail={t('喷气推进剂剩余量', 'Teaching resource budget')}
        fuel={flight.fuel}
      />
    </div>
  );
}
