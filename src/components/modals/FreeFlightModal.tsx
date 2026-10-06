import { useState } from 'react';
import { ArrowRight, Compass, Flame, LockKeyhole, Move, Orbit, RotateCcw, Sparkles } from 'lucide-react';
import { scenarios } from '../../sim/scenarios';
import { useSession } from '../../store';
import type { ScenarioConfig } from '../../sim/types';

export interface FreeFlightParams {
  distance: number;       // Port distance along Z (m): 5 ~ 100
  offset: number;         // Lateral position along X (m): -5 ~ +5
  speed: number;          // Closing speed along Z (m/s): 0 ~ 1.0 (Vz = -speed)
  driftSpeed: number;     // Lateral drift velocity along X (m/s): -0.3 ~ +0.3 (Vx = driftSpeed)
  pitch: number;          // Initial pitch angle (deg): -15 ~ +15 (attitude[0])
  yaw: number;            // Initial yaw angle (deg): -15 ~ +15 (attitude[1])
  roll: number;           // Initial roll angle (deg): -15 ~ +15 (attitude[2])
  fuel: number;           // Fuel budget (%): 10 ~ 100
}

export const DEFAULT_FREE_FLIGHT_PARAMS: FreeFlightParams = {
  distance: 50,
  offset: 0.6,
  speed: 0.35,
  driftSpeed: 0.0,
  pitch: 2,
  yaw: -3,
  roll: 2,
  fuel: 100,
};

export interface LabPreset {
  id: string;
  name: { zh: string; en: string };
  desc: { zh: string; en: string };
  params: FreeFlightParams;
}

export const LAB_PRESETS: LabPreset[] = [
  {
    id: 'baseline',
    name: { zh: '关卡 4 基准', en: 'Level 4 Baseline' },
    desc: { zh: '标准 50m 进近工况，综合对接基准条件', en: 'Standard 50m final approach baseline' },
    params: { distance: 50, offset: 0.6, speed: 0.35, driftSpeed: 0.0, pitch: 2, yaw: -3, roll: 2, fuel: 100 },
  },
  {
    id: 'drift',
    name: { zh: '关卡 2 漂移挑战', en: 'L2 Drift Challenge' },
    desc: { zh: '显著横向偏位与初始漂移速度，重点演练横向速度清零', en: 'Lateral offset & drift rate cancellation' },
    params: { distance: 30, offset: 2.4, speed: 0.25, driftSpeed: 0.20, pitch: 0, yaw: 0, roll: 0, fuel: 85 },
  },
  {
    id: 'attitude',
    name: { zh: '关卡 3 姿态偏角纠正', en: 'L3 Attitude Misalignment' },
    desc: { zh: '三轴大角度姿态失调，检验旋转控制与反向制动对齐', en: '3-axis attitude error recovery & braking' },
    params: { distance: 25, offset: 0.2, speed: 0.15, driftSpeed: 0.0, pitch: 12, yaw: -10, roll: 8, fuel: 85 },
  },
  {
    id: 'extreme',
    name: { zh: '极限挑战 (全方向平移与姿态)', en: 'Extreme 6-DOF Stress' },
    desc: { zh: '大漂移、高接近速度与三轴大幅偏角叠加紧缩推进预算', en: 'Combined drift, attitude error & tight fuel' },
    params: { distance: 45, offset: -3.0, speed: 0.45, driftSpeed: -0.22, pitch: -12, yaw: 14, roll: -11, fuel: 65 },
  },
];

export function buildFreeFlightScenario(params: FreeFlightParams): ScenarioConfig {
  const base = structuredClone(scenarios[3]);
  const formatSign = (n: number, unit = '') => `${n > 0 ? '+' : ''}${n}${unit}`;
  return {
    ...base,
    position: [params.offset, 0, params.distance],
    velocity: [params.driftSpeed, 0, -params.speed],
    attitude: [params.pitch, params.yaw, params.roll],
    fuel: params.fuel,
    subtitle: {
      zh: '自由飞行实验室 · 全向移动与姿态演练',
      en: 'Free Flight Lab · 6-DOF Custom Exercise',
    },
    brief: {
      zh: `初始工况：距离 ${params.distance}m · 横向偏移 ${formatSign(params.offset, 'm')} (漂移 ${formatSign(params.driftSpeed, 'm/s')}) · 姿态偏角 [俯仰 ${formatSign(params.pitch, '°')}, 偏航 ${formatSign(params.yaw, '°')}, 滚转 ${formatSign(params.roll, '°')}] · 推进预算 ${params.fuel}%。`,
      en: `Initial setup: Dist ${params.distance}m · Lateral ${formatSign(params.offset, 'm')} (drift ${formatSign(params.driftSpeed, 'm/s')}) · Attitude [P: ${formatSign(params.pitch, '°')}, Y: ${formatSign(params.yaw, '°')}, R: ${formatSign(params.roll, '°')}] · Reserve ${params.fuel}%.`,
    },
  };
}

export function computeEulerAngleError(pitch: number, yaw: number, roll: number): number {
  const d2r = Math.PI / 360;
  const c1 = Math.cos(pitch * d2r), c2 = Math.cos(yaw * d2r), c3 = Math.cos(roll * d2r);
  const s1 = Math.sin(pitch * d2r), s2 = Math.sin(yaw * d2r), s3 = Math.sin(roll * d2r);
  const qw = Math.abs(c1 * c2 * c3 - s1 * s2 * s3);
  return 2 * Math.acos(Math.min(1, Math.max(0, qw))) * 180 / Math.PI;
}

export function FreeFlightModal({ onStart }: { onStart: () => void }) {
  const { language: lang, completed, select } = useSession();
  const t = (zh: string, en: string) => lang === 'zh' ? zh : en;

  const [params, setParams] = useState<FreeFlightParams>({ ...DEFAULT_FREE_FLIGHT_PARAMS });
  const [activePreset, setActivePreset] = useState<string>('baseline');

  const isCompleted = completed.includes(4);

  const updateParam = <K extends keyof FreeFlightParams>(key: K, value: FreeFlightParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
    setActivePreset('custom');
  };

  const applyPreset = (preset: LabPreset) => {
    setParams({ ...preset.params });
    setActivePreset(preset.id);
  };

  const totalAngle = computeEulerAngleError(params.pitch, params.yaw, params.roll).toFixed(1);
  const totalSpeed = Math.hypot(params.driftSpeed, params.speed).toFixed(2);

  const formatSign = (val: number, decimals = 1, unit = '') => {
    const formatted = val.toFixed(decimals);
    const num = Number(formatted);
    return `${num > 0 ? '+' : ''}${formatted} ${unit}`.trim();
  };

  const handleLaunch = () => {
    const custom = buildFreeFlightScenario(params);
    select(4, custom);
    onStart();
  };

  return (
    <div className="free-flight-modal">
      <p className="lab-lead">
        {t('自由调整初始平移位置、接近速度、横向漂移及三轴姿态偏角，综合演练关卡 1~3 的核心控制技能。',
           'Configure initial position, closing speed, lateral drift and 3-axis attitude to synthesize lessons from missions 1–3.')}
      </p>

      {/* Preset Bar */}
      <div className="lab-presets-bar">
        <span className="eyebrow"><Sparkles size={13} /> {t('典型教学预设', 'PRESETS')}</span>
        <div className="lab-presets">
          {LAB_PRESETS.map(p => (
            <button
              key={p.id}
              className={`lab-preset-btn ${activePreset === p.id ? 'active' : ''}`}
              onClick={() => applyPreset(p)}
              title={p.desc[lang]}
            >
              {p.name[lang]}
            </button>
          ))}
          <button
            className={`lab-preset-btn reset-btn ${activePreset === 'custom' ? 'active' : ''}`}
            onClick={() => { setParams({ ...DEFAULT_FREE_FLIGHT_PARAMS }); setActivePreset('baseline'); }}
            title={t('恢复默认参数', 'Reset to defaults')}
          >
            <RotateCcw size={12} /> {t('重置', 'Reset')}
          </button>
        </div>
      </div>

      {/* Section 1: Translation & Lateral Motion */}
      <div className="lab-group">
        <div className="lab-group-header">
          <span className="lab-group-title"><Move size={14} /> {t('相对平移与运动状态 (关卡 1 & 2)', 'Translation & Relative Motion (M1 & M2)')}</span>
          <span className="lab-group-badge">{t('合速度', 'Total Speed')}: {totalSpeed} m/s</span>
        </div>
        <div className="lab-grid">
          <label className="slider-field">
            <span>{t('起始距离', 'Starting Distance')} <strong>{params.distance} m</strong></span>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={params.distance}
              onChange={e => updateParam('distance', Number(e.target.value))}
            />
          </label>

          <label className="slider-field">
            <span>{t('接近速度', 'Closing Speed')} <strong>{params.speed.toFixed(2)} m/s</strong></span>
            <input
              type="range"
              min={0}
              max={1.0}
              step={0.05}
              value={params.speed}
              onChange={e => updateParam('speed', Number(e.target.value))}
            />
          </label>

          <label className="slider-field">
            <span>{t('横向偏移', 'Lateral Offset')} <strong>{formatSign(params.offset, 1, 'm')}</strong></span>
            <input
              type="range"
              min={-5.0}
              max={5.0}
              step={0.1}
              value={params.offset}
              onChange={e => updateParam('offset', Number(e.target.value))}
            />
          </label>

          <label className="slider-field highlight-field">
            <span>{t('初始横向漂移', 'Lateral Drift Speed')} <strong>{formatSign(params.driftSpeed, 2, 'm/s')}</strong></span>
            <input
              type="range"
              min={-0.30}
              max={0.30}
              step={0.02}
              value={params.driftSpeed}
              onChange={e => updateParam('driftSpeed', Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      {/* Section 2: Attitude Angles */}
      <div className="lab-group">
        <div className="lab-group-header">
          <span className="lab-group-title"><Compass size={14} /> {t('初始姿态偏角 (关卡 3 演练)', 'Initial Attitude Misalignment (M3 Training)')}</span>
          <span className="lab-group-badge">{t('总姿态误差', 'Total Angle Error')}: {totalAngle}°</span>
        </div>
        <div className="lab-grid lab-grid-3">
          <label className="slider-field highlight-field">
            <span>{t('俯仰角 (抬头/低头)', 'Pitch')} <strong>{formatSign(params.pitch, 0, '°')}</strong></span>
            <input
              type="range"
              min={-15}
              max={15}
              step={1}
              value={params.pitch}
              onChange={e => updateParam('pitch', Number(e.target.value))}
            />
          </label>

          <label className="slider-field highlight-field">
            <span>{t('偏航角 (左偏/右偏)', 'Yaw')} <strong>{formatSign(params.yaw, 0, '°')}</strong></span>
            <input
              type="range"
              min={-15}
              max={15}
              step={1}
              value={params.yaw}
              onChange={e => updateParam('yaw', Number(e.target.value))}
            />
          </label>

          <label className="slider-field highlight-field">
            <span>{t('滚转角 (顺/逆时针翻转)', 'Roll')} <strong>{formatSign(params.roll, 0, '°')}</strong></span>
            <input
              type="range"
              min={-15}
              max={15}
              step={1}
              value={params.roll}
              onChange={e => updateParam('roll', Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      {/* Section 3: Budget & Launch */}
      <div className="lab-group">
        <div className="lab-group-header">
          <span className="lab-group-title"><Flame size={14} /> {t('推进资源预算', 'Thruster Fuel Budget')}</span>
          <span className="lab-group-badge">{params.fuel}%</span>
        </div>
        <label className="slider-field">
          <span>{t('燃料配额', 'Fuel Reserve')} <strong>{params.fuel} %</strong></span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={params.fuel}
            onChange={e => updateParam('fuel', Number(e.target.value))}
          />
        </label>
      </div>

      <button className="primary-button lab-launch-btn" onClick={handleLaunch}>
        <Orbit size={17} />
        <span>{t('载入实验并开启飞行', 'Load Experiment & Take Control')}</span>
      </button>
    </div>
  );
}
