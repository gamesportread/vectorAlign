import { Compass, Flame, ShieldAlert } from 'lucide-react';
import type { Language } from '../../sim/types';
import type { LiftoffState, RocketVehicleConfig, SasMode } from '../../sim/liftoff';

export interface KspNavballProps {
  state: LiftoffState;
  vehicle: RocketVehicleConfig;
  language: Language;
  onSetSas: (mode: SasMode) => void;
  onSteerPitch: (dir: number) => void;
}

export function KspNavball({
  state,
  vehicle,
  language,
  onSetSas,
  onSteerPitch
}: KspNavballProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  // 导航球俯仰映射：pitch = 90° 为天顶 (天蓝中心)，pitch = 0° 为正东地平线 (上蓝下棕交界)
  const pitch = state.pitchDeg;
  const prograde =
    state.orbit.altitudeM < 70000
      ? state.orbit.surfaceProgradeDeg
      : state.orbit.orbitalProgradeDeg;

  // 地平线相对于球心 (cx=76, cy=76) 的垂直偏移：
  // 当 pitch = 0° 时，地平线经过球心 (offset = 0)
  // 当 pitch = 90° 时，全屏为蓝天，地平线在球心下方 +64px
  const horizonOffsetY = (pitch / 90) * 62;
  const progradeOffsetY = ((pitch - prograde) / 90) * 62;

  const qAlphaPct = Math.min(100, (state.qAlphaKpaDeg / vehicle.maxQAlphaKpaDeg) * 100);
  const stressColor =
    qAlphaPct > 75 ? '#ff5c5c' : qAlphaPct > 40 ? '#ffb84d' : '#b8f566';

  const sasOptions: { mode: SasMode; labelZh: string; labelEn: string; tipZh: string }[] = [
    {
      mode: 'hold',
      labelZh: '锁定仰角',
      labelEn: 'Hold Pitch',
      tipZh: '稳住当前机头角度'
    },
    {
      mode: 'prograde',
      labelZh: '顺应速度 ◯',
      labelEn: 'Prograde ◯',
      tipZh: '紧跟黄色速度圈 (零攻角过 Max-Q)'
    },
    {
      mode: 'pitch_program',
      labelZh: '程序转弯',
      labelEn: 'Auto Gravity Turn',
      tipZh: '按 NASA 标准轨迹自动下压'
    },
    {
      mode: 'manual',
      labelZh: '纯手动',
      labelEn: 'Manual',
      tipZh: '完全手动矢量摆角控制'
    }
  ];

  return (
    <div className="ksp-panel" data-testid="ksp-navball-panel">
      <div className="ksp-panel-header">
        <h3>
          <Compass size={16} color="var(--lime)" />
          <span>{t('KSP 姿态导航球 (Navball) & 转向控制', 'KSP Attitude Navball & Steering')}</span>
        </h3>
        <span className="ksp-panel-sub">
          {t(
            `机头仰角 ${pitch.toFixed(1)}° · 速度角 ${prograde.toFixed(1)}°`,
            `Pitch ${pitch.toFixed(1)}° · Prograde ${prograde.toFixed(1)}°`
          )}
        </span>
      </div>

      <div className="ksp-navball-layout">
        {/* 左侧：KSP 经典蓝棕双色导航球 SVG */}
        <div className="navball-svg-wrap" title={t('蓝色为天空(90°垂直)，棕色为大地(0°水平)，黄圈为当前飞行速度方向(Prograde)', 'Blue = Sky (90° Up), Brown = Ground (0° Horizon), Yellow circle = Prograde velocity vector')}>
          <svg viewBox="0 0 152 152" width="152" height="152" aria-label="Navball">
            <defs>
              <clipPath id="navball-clip">
                <circle cx="76" cy="76" r="72" />
              </clipPath>
              <radialGradient id="navball-gloss" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="70%" stopColor="rgba(0,0,0,0.0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
              </radialGradient>
            </defs>

            <g clipPath="url(#navball-clip)">
              {/* 天空背景（深天蓝） */}
              <rect x="0" y="0" width="152" height="152" fill="#1b5e91" />

              {/* 大地半球（随俯仰角上下平移） */}
              <rect
                x="-20"
                y={76 + horizonOffsetY}
                width="192"
                height="200"
                fill="#7c4728"
              />

              {/* 地平线 0° 分界白线 */}
              <line
                x1="0"
                y1={76 + horizonOffsetY}
                x2="152"
                y2={76 + horizonOffsetY}
                stroke="#ffffff"
                strokeWidth="2"
              />

              {/* 俯仰角刻度梯 (Pitch Ladder: 90°, 60°, 30°, 0°, -15°) */}
              {[90, 75, 60, 45, 30, 15, -15].map((deg) => {
                const y = 76 + ((pitch - deg) / 90) * 62;
                if (y < 6 || y > 146) return null;
                const isMajor = deg % 30 === 0;
                const halfW = deg === 90 ? 6 : isMajor ? 24 : 14;
                return (
                  <g key={deg}>
                    {deg === 90 ? (
                      <circle cx="76" cy={y} r="4" fill="none" stroke="#d9f0ff" strokeWidth="1.5" />
                    ) : (
                      <line
                        x1={76 - halfW}
                        y1={y}
                        x2={76 + halfW}
                        y2={y}
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth={isMajor ? 1.5 : 1}
                      />
                    )}
                    {isMajor && (
                      <text
                        x={76 + halfW + 5}
                        y={y + 3}
                        fill="rgba(255,255,255,0.88)"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {deg}°
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 黄色速度矢量标记 (KSP Prograde Marker ◯) */}
              {Math.abs(progradeOffsetY) < 70 && (
                <g transform={`translate(76, ${76 + progradeOffsetY})`}>
                  <circle
                    cx="0"
                    cy="0"
                    r="8"
                    fill="none"
                    stroke="#ffe14d"
                    strokeWidth="2.2"
                  />
                  <circle cx="0" cy="0" r="1.8" fill="#ffe14d" />
                  <line x1="0" y1="-8" x2="0" y2="-13" stroke="#ffe14d" strokeWidth="2" />
                  <line x1="-8" y1="0" x2="-13" y2="0" stroke="#ffe14d" strokeWidth="2" />
                  <line x1="8" y1="0" x2="13" y2="0" stroke="#ffe14d" strokeWidth="2" />
                </g>
              )}

              {/* 固定在球心的橙色 W 型机头指向准星 (Level Attitude Reticle) */}
              <path
                d="M 52 76 L 66 76 L 71 82 L 76 76 L 81 82 L 86 76 L 100 76"
                fill="none"
                stroke="#ff9838"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 球面玻璃高光阴影层 */}
              <circle cx="76" cy="76" r="72" fill="url(#navball-gloss)" />
            </g>

            {/* 外圈金属表框 */}
            <circle
              cx="76"
              cy="76"
              r="72"
              fill="none"
              stroke="rgba(184, 245, 102, 0.38)"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        {/* 右侧：SAS 辅助模式 + 手动俯仰按键 + 气动弯矩应力条 */}
        <div className="ksp-attitude-controls">
          <div className="sas-mode-grid" role="group" aria-label={t('SAS 姿态辅助模式', 'SAS Mode')}>
            {sasOptions.map((opt) => (
              <button
                key={opt.mode}
                type="button"
                className={`sas-mode-btn ${state.sasMode === opt.mode ? 'active' : ''}`}
                onClick={() => onSetSas(opt.mode)}
                title={opt.tipZh}
              >
                <span>{t(opt.labelZh, opt.labelEn)}</span>
                <small style={{ opacity: 0.75, fontSize: 10 }}>
                  {state.sasMode === opt.mode ? 'ON' : ''}
                </small>
              </button>
            ))}
          </div>

          <div className="pitch-steer-row">
            <button
              type="button"
              className="pitch-steer-btn"
              onPointerDown={() => onSteerPitch(1)}
              onPointerUp={() => onSteerPitch(0)}
              onPointerLeave={() => onSteerPitch(0)}
              onPointerCancel={() => onSteerPitch(0)}
            >
              ⬆ {t('抬机头 (A / ←)', 'Pitch Up [A]')}
            </button>
            <button
              type="button"
              className="pitch-steer-btn"
              onPointerDown={() => onSteerPitch(-1)}
              onPointerUp={() => onSteerPitch(0)}
              onPointerLeave={() => onSteerPitch(0)}
              onPointerCancel={() => onSteerPitch(0)}
            >
              ⬇ {t('向东倾 (D / →)', 'Pitch East [D]')}
            </button>
          </div>

          {/* 动压 Max-Q 与攻角结构载荷监控条 */}
          <div
            className="aero-stress-meter"
            title={t(
              '气动弯曲载荷 (Q·α)：当动压很高（如 13km Max-Q）且机头偏离黄色速度圈太远时，迎面狂风会把火箭吹断！',
              'Aerodynamic bending stress (Q·α): High dynamic pressure combined with large Angle of Attack will break the rocket!'
            )}
          >
            <div className="aero-stress-top">
              <span>
                <ShieldAlert size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                {t('气动风阻载荷 (攻角偏差 ', 'Aero Stress (AoA ')}
                {Math.abs(state.aoaDeg).toFixed(1)}°)
              </span>
              <strong style={{ color: stressColor, fontFamily: 'monospace' }}>
                {qAlphaPct.toFixed(0)}%
              </strong>
            </div>
            <div className="aero-stress-bar">
              <div
                className="aero-stress-fill"
                style={{
                  width: `${qAlphaPct}%`,
                  background: stressColor
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#7e9688', marginTop: 3 }}>
              <span>
                <Flame size={10} style={{ verticalAlign: -1 }} />{' '}
                {t('当前动压 q: ', 'Dyn Press q: ')}
                {(state.dynamicPressurePa / 1000).toFixed(1)} kPa
              </span>
              <span>
                {t('峰值 Max-Q: ', 'Peak Max-Q: ')}
                {(state.maxQRecordedPa / 1000).toFixed(1)} kPa
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
