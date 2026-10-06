import { useState } from 'react';
import type { FlightRecord, Language } from '../../sim/types';
import { useSession } from '../../store';
import { formatTime } from '../../utils/formatters';
import { getReasonText } from '../../utils/flightReasons';

export interface FlightChartProps {
  record?: FlightRecord | null;
}

type ChartCategory = 'approach' | 'lateral' | 'attitude';

interface MetricSeries {
  key: string;
  nameZh: string;
  nameEn: string;
  unit: string;
  color: string;
  values: number[];
  tolerance?: number;
  customLabel?: string;
}

export function FlightChart({ record }: FlightChartProps) {
  const sessionLatest = useSession((s) => s.latest);
  const language = useSession((s) => s.language);
  const currentRecord = record ?? sessionLatest;

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  // 默认根据关卡选择最关心的指标 Tab
  const defaultCategory: ChartCategory =
    currentRecord?.scenario === 2
      ? 'lateral'
      : currentRecord?.scenario === 3
      ? 'attitude'
      : 'approach';

  const [activeTab, setActiveTab] = useState<ChartCategory>(defaultCategory);

  if (!currentRecord?.samples.length) return null;

  const samples = currentRecord.samples;
  const cfg = currentRecord.config;
  const maxTime = Math.max(1, samples[samples.length - 1].time);
  const width = 520;
  const height = 125;

  // 根据当前选中的 Tab 准备 2 组对比数据曲线
  let seriesList: MetricSeries[] = [];

  if (activeTab === 'approach') {
    seriesList = [
      {
        key: 'distance',
        nameZh: cfg.id === 1 ? '停泊点距离' : '对接口距离',
        nameEn: cfg.id === 1 ? 'Hold Distance' : 'Port Distance',
        unit: 'm',
        color: '#b3f56b',
        values: samples.map((s) => Math.max(0, s.distance)),
        tolerance: cfg.id === 1 ? cfg.targetZ : cfg.id === 4 ? 0.35 : undefined,
        customLabel:
          cfg.id === 1
            ? (language === 'zh'
                ? `目标停泊点 ${cfg.targetZ.toFixed(2)} m (±${cfg.positionTolerance} m)`
                : `Target Hold Point ${cfg.targetZ.toFixed(2)} m (±${cfg.positionTolerance} m)`)
            : cfg.id === 4
            ? (language === 'zh' ? '目标接触点 ≤ 0.35 m' : 'Target Contact ≤ 0.35 m')
            : undefined
      },
      {
        key: 'speed',
        nameZh: '相对合速度',
        nameEn: 'Speed',
        unit: 'm/s',
        color: '#7bc7db',
        values: samples.map((s) => s.speed),
        tolerance: cfg.speedTolerance
      }
    ];
  } else if (activeTab === 'lateral') {
    // 横向偏移 与 估算横向速度
    seriesList = [
      {
        key: 'lateral',
        nameZh: '横向中心偏移',
        nameEn: 'Lateral Offset',
        unit: 'm',
        color: '#87e8de',
        values: samples.map((s) => s.lateral),
        tolerance: cfg.positionTolerance
      },
      {
        key: 'speed',
        nameZh: '相对运动速度',
        nameEn: 'Relative Speed',
        unit: 'm/s',
        color: '#7bc7db',
        values: samples.map((s) => s.speed),
        tolerance: 0.04
      }
    ];
  } else {
    // 姿态误差 与 估算角速度
    seriesList = [
      {
        key: 'angle',
        nameZh: '姿态角总偏差',
        nameEn: 'Attitude Error',
        unit: '°',
        color: '#ffa39e',
        values: samples.map((s) => s.angle),
        tolerance: cfg.angleTolerance
      },
      {
        key: 'speed',
        nameZh: '前进接近速度',
        nameEn: 'Closing Speed',
        unit: 'm/s',
        color: '#7bc7db',
        values: samples.map((s) => s.speed),
        tolerance: cfg.angularSpeedTolerance
      }
    ];
  }

  return (
    <div className="flight-charts-enhanced">
      {/* 关卡 2/3/4 或自定义实验时提供便捷的数据视图切换 */}
      <div className="chart-tab-bar">
        <button
          className={`chart-tab ${activeTab === 'approach' ? 'active' : ''}`}
          onClick={() => setActiveTab('approach')}
        >
          {t('进近走廊 (距离/速度)', 'Approach (Dist/Speed)')}
        </button>
        <button
          className={`chart-tab ${activeTab === 'lateral' ? 'active' : ''}`}
          onClick={() => setActiveTab('lateral')}
        >
          {t('横向漂移 (关卡 2 核心)', 'Lateral Drift (M2)')}
        </button>
        <button
          className={`chart-tab ${activeTab === 'attitude' ? 'active' : ''}`}
          onClick={() => setActiveTab('attitude')}
        >
          {t('姿态对齐 (关卡 3 核心)', 'Attitude (M3)')}
        </button>
      </div>

      <div className="flight-charts">
        {seriesList.map((series, index) => {
          const maxVal = Math.max(...series.values, series.tolerance ?? 0, 0.1);
          const points = samples
            .map((p, i) => {
              const x = 10 + (p.time / maxTime) * (width - 20);
              const y = height - 15 - (series.values[i] / maxVal) * (height - 30);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          const toleranceY =
            series.tolerance !== undefined && series.tolerance <= maxVal
              ? height - 15 - (series.tolerance / maxVal) * (height - 30)
              : null;

          return (
            <div key={series.key + index} className="chart-card">
              <div className="chart-caption">
                <span>
                  {language === 'zh' ? series.nameZh : series.nameEn} / {series.unit}
                  {series.customLabel ? (
                    <small className="chart-tol-label">
                      ({series.customLabel})
                    </small>
                  ) : series.tolerance !== undefined ? (
                    <small className="chart-tol-label">
                      ({t('目标限值', 'Limit')} ≤ {series.tolerance} {series.unit})
                    </small>
                  ) : null}
                </span>
                <span className="chart-max-val">
                  {t('峰值', 'Peak')}: {maxVal.toFixed(2)}
                </span>
              </div>

              <svg
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label={`${series.nameEn} over time`}
              >
                {/* 背景刻度轴 */}
                <path
                  d={`M10 10V${height - 15}H${width - 10}`}
                  stroke="#3d4648"
                  fill="none"
                />

                {/* 容差阈值参考虚线 */}
                {toleranceY !== null && (
                  <line
                    x1="10"
                    x2={width - 10}
                    y1={toleranceY}
                    y2={toleranceY}
                    stroke="#e6a23c"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                    opacity="0.8"
                  />
                )}

                {/* 飞行关键事件垂线 */}
                {currentRecord.events
                  .filter((e) => e.type !== 'start')
                  .map((e, i) => {
                    const eventX = 10 + (e.time / maxTime) * (width - 20);
                    return (
                      <line
                        key={i}
                        x1={eventX}
                        x2={eventX}
                        y1="10"
                        y2={height - 15}
                        stroke={e.type === 'failed' ? '#eb9c7b' : '#677874'}
                        strokeDasharray="3 4"
                      />
                    );
                  })}

                {/* 数据折线 */}
                <polyline
                  points={points}
                  stroke={series.color}
                  strokeWidth="2"
                  fill="none"
                />
              </svg>

              <div className="chart-time">
                <span>0 s</span>
                <span>{maxTime.toFixed(1)} s</span>
              </div>
            </div>
          );
        })}

        {/* 关键事件序列 */}
        <ul className="event-list">
          {currentRecord.events
            .filter((e) => e.type !== 'start')
            .slice(-4)
            .map((e, i) => (
              <li key={i}>
                <time>{formatTime(e.time)}</time>
                {e.reason
                  ? getReasonText(e.reason, language)
                  : e.type === 'brake'
                  ? t('启动辅助制动', 'Assist brake applied')
                  : e.type === 'success'
                  ? t('满足任务条件', 'Mission criteria reached')
                  : e.type}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
