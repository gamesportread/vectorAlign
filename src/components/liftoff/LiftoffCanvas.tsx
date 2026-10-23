import { useEffect, useRef, useState } from 'react';
import {
  EARTH_RADIUS_M,
  KARMAN_LINE_ALTITUDE_M,
  type LiftoffSample,
  type LiftoffState,
  type RocketVehicleConfig
} from '../../sim/liftoff';
import type { Language } from '../../sim/types';
import { TASK_CAMERA_HINT_TEXT } from '../scene/taskCameraConfig';
import { LiftoffScene3D } from './LiftoffScene3D';

export interface LiftoffCanvasProps {
  state: LiftoffState;
  vehicle: RocketVehicleConfig;
  samples: LiftoffSample[];
  viewMode: 'rocket' | 'map';
  showGuidance: boolean;
  showComposite?: boolean;
  language: Language;
}

const STARS = Array.from({ length: 90 }, (_, i) => ({
  x: ((i * 73 + 19) % 100) / 100,
  y: ((i * 41 + 7) % 100) / 100,
  r: (i % 3) * 0.6 + 0.8,
  alpha: 0.35 + ((i * 17) % 65) / 100
}));

interface SequenceStep {
  id: string;
  zh: string;
  en: string;
  done: boolean;
  active: boolean;
}

function getLaunchSequenceSteps(state: LiftoffState): SequenceStep[] {
  const alt = state.orbit.altitudeM;
  const igniting = state.throttle > 0.05 || state.clampsReleased;
  const liftedOff = state.clampsReleased;
  const towerCleared = liftedOff && alt >= 150;
  const pitchedOver = liftedOff && (alt >= 2500 || state.pitchDeg < 85);
  const passedMaxQ = liftedOff && (alt >= 16500 || (state.maxQRecordedPa > 12000 && alt > 12500));
  const staged = state.activeStageIndex >= 1;
  const fairingDropped = state.towerJettisoned || alt >= 95000;
  const inOrbit = state.orbit.isOrbitStable || state.status === 'success';

  const flags = [
    igniting,
    towerCleared,
    pitchedOver,
    passedMaxQ,
    staged,
    fairingDropped,
    inOrbit
  ];

  // Current active step is the first step not yet completed (or the last completed if all done)
  let activeIdx = flags.findIndex((f) => !f);
  if (activeIdx === -1) activeIdx = flags.length - 1;

  const meta = [
    { id: 'ignition', zh: '① 水幕点火', en: '1. Ignition' },
    { id: 'liftoff', zh: '② 拔销越塔', en: '2. Liftoff' },
    { id: 'pitch', zh: '③ 程序转弯', en: '3. Pitchover' },
    { id: 'maxq', zh: '④ 跨音速 Max-Q', en: '4. Max-Q' },
    { id: 'staging', zh: '⑤ 级间分离', en: '5. Staging' },
    { id: 'fairing', zh: '⑥ 抛逃逸塔/罩', en: '6. Fairing' },
    { id: 'orbit', zh: '⑦ 圆轨入轨', en: '7. LEO Orbit' }
  ];

  return meta.map((m, idx) => ({
    ...m,
    done: flags[idx],
    active: idx === activeIdx
  }));
}

export function LiftoffCanvas({
  state,
  vehicle,
  samples,
  viewMode,
  showGuidance,
  showComposite = true,
  language
}: LiftoffCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipMapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipCamCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const prevStageRef = useRef<number>(state.activeStageIndex);
  const sepTimestampRef = useRef<number>(-999);
  const [sepElapsed, setSepElapsed] = useState<number>(99);

  useEffect(() => {
    if (state.activeStageIndex !== prevStageRef.current) {
      prevStageRef.current = state.activeStageIndex;
      if (state.activeStageIndex > 0) {
        sepTimestampRef.current = state.time;
      } else {
        sepTimestampRef.current = -999;
      }
    }
    const elapsed = state.time - sepTimestampRef.current;
    setSepElapsed(elapsed >= 0 ? elapsed : 99);
  }, [state.activeStageIndex, state.time]);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  // Full-screen Orbital Map View
  useEffect(() => {
    if (viewMode !== 'map') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, rect.width);
    const h = Math.max(260, rect.height);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.save();
    ctx.scale(dpr, dpr);

    drawOrbitalMapView(ctx, w, h, state, samples, t, false);

    ctx.restore();
  }, [state, vehicle, samples, viewMode, showGuidance, language]);

  // Composite Multi-View PiP Renderers (Onboard Stage-Cam + Live Orbital Radar)
  useEffect(() => {
    if (viewMode !== 'rocket' || !showComposite) return;

    // 1. Render Onboard Stage-Cam PiP
    const camCanvas = pipCamCanvasRef.current;
    if (camCanvas) {
      const ctx = camCanvas.getContext('2d');
      if (ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = 212;
        const h = 124;
        if (camCanvas.width !== w * dpr || camCanvas.height !== h * dpr) {
          camCanvas.width = w * dpr;
          camCanvas.height = h * dpr;
        }
        ctx.save();
        ctx.scale(dpr, dpr);
        drawOnboardStageCamView(ctx, w, h, state, vehicle, sepElapsed, t);
        ctx.restore();
      }
    }

    // 2. Render Live Orbital Trajectory Radar PiP
    const mapCanvas = pipMapCanvasRef.current;
    if (mapCanvas) {
      const ctx = mapCanvas.getContext('2d');
      if (ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = 212;
        const h = 124;
        if (mapCanvas.width !== w * dpr || mapCanvas.height !== h * dpr) {
          mapCanvas.width = w * dpr;
          mapCanvas.height = h * dpr;
        }
        ctx.save();
        ctx.scale(dpr, dpr);
        drawOrbitalMapView(ctx, w, h, state, samples, t, true);
        ctx.restore();
      }
    }
  }, [state, vehicle, samples, viewMode, showComposite, sepElapsed, language]);

  const stageCfg = vehicle.stages[state.activeStageIndex] ?? vehicle.stages[0];
  const sequenceSteps = getLaunchSequenceSteps(state);

  return (
    <div className="liftoff-canvas-wrap">
      {/* 顶部全流程发射时序节点条 (End-to-End Launch Sequence Timeline) */}
      <div className="liftoff-sequence-bar" aria-label={t('发射全流程节点', 'Launch Sequence Timeline')}>
        {sequenceSteps.map((step, idx) => (
          <div
            key={step.id}
            className={`seq-step ${step.done ? 'done' : ''} ${step.active ? 'active' : ''}`}
          >
            <span className="seq-dot" />
            <span className="seq-label">{t(step.zh, step.en)}</span>
            {idx < sequenceSteps.length - 1 && <span className="seq-line" />}
          </div>
        ))}
      </div>

      {viewMode === 'rocket' ? (
        <>
          <LiftoffScene3D
            state={state}
            vehicle={vehicle}
            showGuidance={showGuidance}
            sepElapsed={sepElapsed}
            language={language}
          />

          {/* 右侧复合显示双画中画视窗 (Composite Multi-View PiP Telemetry Windows) */}
          {showComposite && (
            <div className="liftoff-composite-dock" data-testid="liftoff-composite-dock">
              {/* 画中画 1：箭载下视工程摄像机 (Onboard Rocket Stage Camera) */}
              <div className="liftoff-pip-card">
                <div className="pip-card-header">
                  <span className="pip-live-dot" />
                  <span className="pip-title">
                    {t('CAM-01 · 箭载下视工程镜头', 'CAM-01 · ONBOARD STAGE CAM')}
                  </span>
                  <span className="pip-sub">{stageCfg.code}</span>
                </div>
                <canvas ref={pipCamCanvasRef} className="pip-canvas" />
              </div>

              {/* 画中画 2：天地实时轨道复合雷达 (Live Orbital & Ascent Trajectory PiP) */}
              <div className="liftoff-pip-card">
                <div className="pip-card-header">
                  <span className="pip-live-dot cyan" />
                  <span className="pip-title">
                    {t('RADAR · 实时入轨弹道复合窗', 'RADAR · LIVE ORBITAL TRACK')}
                  </span>
                  <span className="pip-sub">
                    Ap {(state.orbit.apoapsisM / 1000).toFixed(0)}km
                  </span>
                </div>
                <canvas ref={pipMapCanvasRef} className="pip-canvas" />
              </div>
            </div>
          )}

          <div className="liftoff-3d-badge-bar">
            <span className="liftoff-stage-pill">
              {stageCfg.code} · {t(stageCfg.name.zh, stageCfg.name.en)}
            </span>
            <span className="liftoff-cam-hint">
              🖱️ {TASK_CAMERA_HINT_TEXT[language]}
            </span>
          </div>
        </>
      ) : (
        <canvas ref={canvasRef} className="liftoff-render-canvas" />
      )}

      {/* 底部轨道远/近地点实时胶囊条 (KSP Ap / Pe Telemetry Ribbon) */}
      <div className="liftoff-orbit-ribbon">
        <div className="orbit-ribbon-item">
          <span className="tag ap">Ap</span>
          <span>{t('远地点', 'Apoapsis')}</span>
          <strong>{(state.orbit.apoapsisM / 1000).toFixed(1)} km</strong>
          <small>(T-{state.orbit.timeToApoapsisS.toFixed(0)}s)</small>
        </div>

        <div className="orbit-ribbon-item">
          <span className={`tag ${state.orbit.periapsisM >= 150000 ? 'pe-ok' : 'pe-sub'}`}>
            Pe
          </span>
          <span>{t('近地点', 'Periapsis')}</span>
          <strong>{(state.orbit.periapsisM / 1000).toFixed(1)} km</strong>
          <small>
            {state.orbit.isOrbitStable
              ? t('✅ 稳定近地圆轨', '✅ Stable LEO')
              : t('⚠️ 亚轨道 (未入轨)', '⚠️ Suborbital')}
          </small>
        </div>

        <div className="orbit-ribbon-item">
          <small>{t('第一宇宙速度进度:', 'Orbital Speed:')}</small>
          <strong>
            {state.orbit.orbitalSpeedMs.toFixed(0)} / {state.orbit.circularVelocityMs.toFixed(0)} m/s
          </strong>
        </div>
      </div>
    </div>
  );
}

/**
 * 绘制箭载工程下视摄像机画面 (Onboard Fuselage Down-Looking Engineering Camera)
 * 真实还原 NASA / SpaceX / 中国载人航天直播中安装在二级储箱外壁向下拍摄尾焰、级间分离与远去地球的视角
 */
function drawOnboardStageCamView(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: LiftoffState,
  vehicle: RocketVehicleConfig,
  sepElapsed: number,
  t: (zh: string, en: string) => string
) {
  const altKm = state.orbit.altitudeM / 1000;
  const spaceBlend = Math.min(1, Math.max(0, altKm / 85));
  const isCz = vehicle.id === 'cz5' || vehicle.id === 'cz2f';

  // 1. 天空与太空背景渐变
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  const rTop = Math.round(52 * (1 - spaceBlend) + 3 * spaceBlend);
  const gTop = Math.round(115 * (1 - spaceBlend) + 6 * spaceBlend);
  const bTop = Math.round(188 * (1 - spaceBlend) + 14 * spaceBlend);
  const rBot = Math.round(145 * (1 - spaceBlend) + 12 * spaceBlend);
  const gBot = Math.round(198 * (1 - spaceBlend) + 34 * spaceBlend);
  const bBot = Math.round(238 * (1 - spaceBlend) + 68 * spaceBlend);
  skyGrad.addColorStop(0, `rgb(${rTop},${gTop},${bTop})`);
  skyGrad.addColorStop(1, `rgb(${rBot},${gBot},${bBot})`);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // 高空星点
  if (spaceBlend > 0.35) {
    for (let i = 0; i < 28; i++) {
      const st = STARS[i];
      ctx.fillStyle = `rgba(225, 240, 255, ${(spaceBlend - 0.3) * st.alpha})`;
      ctx.beginPath();
      ctx.arc(st.x * w, st.y * h * 0.65, st.r * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. 下方远去的地球弧面与发射台景象
  const earthCurveY = h * (0.48 + Math.min(0.28, altKm * 0.0025));
  const earthRadius = w * (3.2 - Math.min(1.6, altKm * 0.01));

  // 大气层边缘蔚蓝辉光弧
  const limbGrad = ctx.createRadialGradient(
    w * 0.62,
    earthCurveY + earthRadius,
    earthRadius - 12,
    w * 0.62,
    earthCurveY + earthRadius,
    earthRadius + 16
  );
  limbGrad.addColorStop(0, '#1e5b94');
  limbGrad.addColorStop(0.55, '#59bfff');
  limbGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = limbGrad;
  ctx.beginPath();
  ctx.arc(w * 0.62, earthCurveY + earthRadius, earthRadius + 14, 0, Math.PI * 2);
  ctx.fill();

  // 地球表面与海洋/陆地
  const groundGrad = ctx.createRadialGradient(
    w * 0.55,
    earthCurveY + earthRadius * 0.3,
    10,
    w * 0.62,
    earthCurveY + earthRadius,
    earthRadius
  );
  if (altKm < 12) {
    groundGrad.addColorStop(0, '#4a6b53');
    groundGrad.addColorStop(0.45, '#2b4d3b');
    groundGrad.addColorStop(1, '#12385b');
  } else {
    groundGrad.addColorStop(0, '#1b507a');
    groundGrad.addColorStop(0.7, '#0f3152');
    groundGrad.addColorStop(1, '#081b31');
  }
  ctx.fillStyle = groundGrad;
  ctx.beginPath();
  ctx.arc(w * 0.62, earthCurveY + earthRadius, earthRadius, 0, Math.PI * 2);
  ctx.fill();

  // 低空发射台与导流槽水幕白雾 (0 ~ 8 km 可见)
  if (altKm < 8) {
    const padScale = Math.max(0.15, 1 / (1 + altKm * 1.4));
    const padX = w * 0.58;
    const padY = earthCurveY + 26 * padScale;

    // 混凝土八角坪与爬虫道
    ctx.fillStyle = `rgba(148, 156, 162, ${0.85 * padScale})`;
    ctx.beginPath();
    ctx.ellipse(padX, padY, 34 * padScale, 15 * padScale, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // 发射塔架缩影
    ctx.strokeStyle = `rgba(210, 88, 52, ${0.9 * padScale})`;
    ctx.lineWidth = Math.max(1, 2.5 * padScale);
    ctx.beginPath();
    ctx.moveTo(padX - 14 * padScale, padY);
    ctx.lineTo(padX - 14 * padScale, padY - 36 * padScale);
    ctx.stroke();

    // 起飞阶段翻滚水幕蒸汽云团
    if (state.throttle > 0.05) {
      const smokeR = (18 + Math.min(45, state.time * 9)) * padScale;
      const smkGrad = ctx.createRadialGradient(padX, padY, 2, padX, padY, smokeR);
      smkGrad.addColorStop(0, 'rgba(255, 245, 225, 0.92)');
      smkGrad.addColorStop(0.5, 'rgba(225, 232, 240, 0.65)');
      smkGrad.addColorStop(1, 'rgba(200, 212, 224, 0)');
      ctx.fillStyle = smkGrad;
      ctx.beginPath();
      ctx.arc(padX, padY, smokeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 对流层云团掠过效果 (1.5 ~ 18 km)
  if (altKm > 0.8 && altKm < 25) {
    const cloudAlpha = Math.min(0.65, Math.max(0, 1 - Math.abs(altKm - 6) / 14));
    for (let c = 0; c < 4; c++) {
      const cx = ((w * (0.35 + c * 0.18) + state.time * (14 + c * 5)) % (w + 40)) - 20;
      const cy = earthCurveY + 12 + (c % 2) * 16;
      const cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
      cg.addColorStop(0, `rgba(255,255,255,${cloudAlpha})`);
      cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. 级间分离时下方脱落的一级箭体与科罗廖夫十字助推器 (sepElapsed < 12s)
  if (sepElapsed >= 0 && sepElapsed < 12) {
    const dropDist = 14 + sepElapsed * 9.5;
    const stageX = w * 0.44 + sepElapsed * 2.2;
    const stageY = h * 0.52 + dropDist;
    const scale = Math.max(0.22, 1 - sepElapsed * 0.068);

    ctx.save();
    ctx.translate(stageX, stageY);
    ctx.rotate(sepElapsed * 0.05);
    ctx.scale(scale, scale);

    // 脱落的一级芯级圆筒
    ctx.fillStyle = '#dce3ea';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.fillRect(-14, -6, 28, 38);
    ctx.strokeRect(-14, -6, 28, 38);
    // 黑色级间条纹
    ctx.fillStyle = '#14181f';
    ctx.fillRect(-14, -6, 28, 8);

    // 制动反推火箭橘红火舌
    if (sepElapsed < 2.8) {
      ctx.fillStyle = 'rgba(255, 166, 48, 0.9)';
      ctx.beginPath();
      ctx.moveTo(-14, -2);
      ctx.lineTo(-26, -14);
      ctx.lineTo(-10, -8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, -2);
      ctx.lineTo(26, -14);
      ctx.lineTo(10, -8);
      ctx.fill();
    }

    // 长征二号F 科罗廖夫十字四助推器同步张开画面
    if (isCz) {
      const spread = 16 + sepElapsed * 7;
      const tilt = 0.25 + sepElapsed * 0.12;
      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.translate(dir * spread, 8);
        ctx.rotate(dir * tilt);
        ctx.fillStyle = '#e5ebf0';
        ctx.fillRect(-5, -12, 10, 26);
        ctx.fillStyle = '#1e64b4';
        ctx.fillRect(-5, -2, 10, 5);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // 4. 箭体左侧前景下视透视壁板与尾喷管/尾焰
  ctx.save();
  // 轻微推力高频抖动感
  const shakeX = state.thrustN > 0 ? Math.sin(state.time * 55) * 0.6 : 0;
  const shakeY = state.thrustN > 0 ? Math.cos(state.time * 63) * 0.6 : 0;
  ctx.translate(shakeX, shakeY);

  // 发动机尾焰 (Looking down past the hull at the glowing plume)
  if (state.thrustN > 0 && state.throttle > 0.02) {
    const vacExpansion = 1 + spaceBlend * 1.15;
    const plumeLen = (48 + state.throttle * 34) * vacExpansion;
    const plumeW = (18 + state.throttle * 12) * vacExpansion;

    const plGrad = ctx.createRadialGradient(34, h * 0.56, 3, 46, h * 0.56 + plumeLen * 0.55, plumeW * 1.8);
    plGrad.addColorStop(0, '#ffffff');
    plGrad.addColorStop(0.28, isCz || state.activeStageIndex > 0 ? '#7dd3fc' : '#fde047');
    plGrad.addColorStop(0.65, isCz || state.activeStageIndex > 0 ? 'rgba(56, 189, 248, 0.55)' : 'rgba(249, 115, 22, 0.65)');
    plGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');

    ctx.fillStyle = plGrad;
    ctx.beginPath();
    ctx.moveTo(18, h * 0.5);
    ctx.quadraticCurveTo(38 + plumeW, h * 0.56 + plumeLen * 0.45, 52, h * 0.52 + plumeLen);
    ctx.quadraticCurveTo(10, h * 0.58 + plumeLen * 0.6, 4, h * 0.54);
    ctx.closePath();
    ctx.fill();

    // 马赫环亮斑 (Mach diamonds)
    for (let m = 0; m < 3; m++) {
      const mdX = 26 + m * 7;
      const mdY = h * 0.55 + m * 12;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(mdX, mdY, 5 - m, 2.5 - m * 0.5, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 箭体下视蒙皮外壁 (Perspective Rocket Fuselage Side Wall on Left)
  const hullGrad = ctx.createLinearGradient(0, 0, 56, h * 0.58);
  hullGrad.addColorStop(0, '#f1f5f9');
  hullGrad.addColorStop(0.65, '#cbd5e1');
  hullGrad.addColorStop(1, '#64748b');
  ctx.fillStyle = hullGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(64, 0);
  ctx.lineTo(38, h * 0.54);
  ctx.lineTo(0, h * 0.58);
  ctx.closePath();
  ctx.fill();

  // 箭体纵向加强筋与黑色相机条纹
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
  ctx.lineWidth = 1;
  for (let s = 1; s <= 4; s++) {
    ctx.beginPath();
    ctx.moveTo(s * 13, 0);
    ctx.lineTo(s * 8, h * 0.55);
    ctx.stroke();
  }

  // 级间黑色基准带 / 蓝色航向带
  ctx.fillStyle = isCz ? '#1d4ed8' : '#0f172a';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.36);
  ctx.lineTo(46, h * 0.34);
  ctx.lineTo(41, h * 0.44);
  ctx.lineTo(0, h * 0.47);
  ctx.closePath();
  ctx.fill();

  // 尾翼或助推器侧影 (Stage 1)
  if (state.activeStageIndex === 0) {
    ctx.fillStyle = isCz ? '#e2e8f0' : '#1e293b';
    ctx.beginPath();
    ctx.moveTo(36, h * 0.42);
    ctx.lineTo(58, h * 0.49);
    ctx.lineTo(42, h * 0.54);
    ctx.closePath();
    ctx.fill();
  }

  // 底部钟形发动机喷管边缘
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(24, h * 0.54, 15, 6, -0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 5. 工程镜头光学十字丝与实时遥测字符叠加 (Engineering Camera Reticle & OSD)
  ctx.strokeStyle = 'rgba(184, 245, 102, 0.32)';
  ctx.lineWidth = 1;
  // 中心瞄准十字
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - 8, h * 0.5);
  ctx.lineTo(w * 0.5 + 8, h * 0.5);
  ctx.moveTo(w * 0.5, h * 0.5 - 8);
  ctx.lineTo(w * 0.5, h * 0.5 + 8);
  ctx.stroke();

  // 底部黑色半透明工程遥测字幕条
  ctx.fillStyle = 'rgba(4, 10, 14, 0.72)';
  ctx.fillRect(0, h - 20, w, 20);
  ctx.fillStyle = '#d8eee2';
  ctx.font = '10px monospace';
  ctx.fillText(
    `M ${state.mach.toFixed(2)} | Q ${(state.dynamicPressurePa / 1000).toFixed(1)}kPa | ${state.gLoad.toFixed(1)}G`,
    6,
    h - 6
  );

  // 分离或点火高亮状态徽标
  if (sepElapsed >= 0 && sepElapsed < 6) {
    ctx.fillStyle = '#ffb84d';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(t('⚡ 级间分离反推点火', '⚡ STAGE SEP RETRO'), w - 106, 15);
  } else if (!state.clampsReleased && state.throttle > 0.05) {
    ctx.fillStyle = '#b8f566';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(t('🔥 水幕喷淋建推中', '🔥 IGNITION HOLD'), w - 102, 15);
  }
}

/**
 * 绘制 KSP 风格地球轨道拱点全貌视图 (Orbital Map View - 支持全屏与右下角 PiP 复合模式)
 */
function drawOrbitalMapView(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: LiftoffState,
  samples: LiftoffSample[],
  t: (zh: string, en: string) => string,
  compact = false
) {
  ctx.fillStyle = '#04080e';
  ctx.fillRect(0, 0, w, h);

  // 背景星点
  const starCount = compact ? 30 : STARS.length;
  for (let i = 0; i < starCount; i++) {
    const st = STARS[i];
    ctx.fillStyle = `rgba(220, 235, 255, ${st.alpha * 0.7})`;
    ctx.beginPath();
    ctx.arc(st.x * w, st.y * h, compact ? st.r * 0.7 : st.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 采用放大高度比例尺以便青少年清晰观察 0~250 km 轨道弧与 100 km 卡门线
  const cx = w * 0.5;
  const cy = compact ? h * 0.64 : h * 0.56;
  const baseEarthPx = Math.min(w, h) * (compact ? 0.34 : 0.31);
  const altScalePxPerKm = (Math.min(w, h) * (compact ? 0.18 : 0.14)) / 200;

  const toCanvasPos = (posM: [number, number]): [number, number] => {
    const r = Math.hypot(posM[0], posM[1]);
    const altKm = (r - EARTH_RADIUS_M) / 1000;
    const angle = Math.atan2(posM[0], posM[1]) * 4.2;
    const radPx = baseEarthPx + altKm * altScalePxPerKm;
    return [cx + Math.sin(angle) * radPx, cy - Math.cos(angle) * radPx];
  };

  // 1. 100 km 卡门线大气层边界光环
  const karmanRadPx = baseEarthPx + (KARMAN_LINE_ALTITUDE_M / 1000) * altScalePxPerKm;
  ctx.strokeStyle = 'rgba(77, 196, 255, 0.35)';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = compact ? 1 : 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, karmanRadPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  if (!compact) {
    ctx.fillStyle = 'rgba(77, 196, 255, 0.75)';
    ctx.font = '11px monospace';
    ctx.fillText(t('100 km 卡门线 (大气层边界)', '100 km Karman Line'), cx - 72, cy - karmanRadPx - 6);
  }

  // 2. 地球蓝色球体
  const earthGrad = ctx.createRadialGradient(cx - 12, cy - 12, baseEarthPx * 0.2, cx, cy, baseEarthPx);
  earthGrad.addColorStop(0, '#1e5785');
  earthGrad.addColorStop(1, '#0b253c');
  ctx.fillStyle = earthGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, baseEarthPx, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3b95d6';
  ctx.lineWidth = compact ? 1.5 : 2;
  ctx.stroke();

  // 3. 预测轨道椭圆环 (Predicted Orbit Ring)
  const apKm = Math.min(320, Math.max(0, state.orbit.apoapsisM / 1000));
  const peKm = Math.max(-120, Math.min(320, state.orbit.periapsisM / 1000));
  const apRadPx = baseEarthPx + apKm * altScalePxPerKm;
  const peRadPx = Math.max(baseEarthPx * 0.65, baseEarthPx + peKm * altScalePxPerKm);

  ctx.strokeStyle = state.orbit.isOrbitStable
    ? 'rgba(184, 245, 102, 0.85)'
    : 'rgba(255, 184, 77, 0.72)';
  ctx.lineWidth = compact ? 1.5 : 2;
  ctx.beginPath();
  const ellipseCenterY = cy - (apRadPx - peRadPx) * 0.5;
  const ry = (apRadPx + peRadPx) * 0.5;
  const rx = Math.sqrt(Math.max(60, apRadPx * peRadPx));
  ctx.ellipse(cx, ellipseCenterY, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 4. 历史飞行轨迹线
  if (samples.length > 1) {
    ctx.strokeStyle = '#4de2d1';
    ctx.lineWidth = compact ? 2 : 2.5;
    ctx.beginPath();
    samples.forEach((smp, idx) => {
      const rM = EARTH_RADIUS_M + smp.altitudeKm * 1000;
      const ang = (smp.downrangeKm * 1000) / EARTH_RADIUS_M;
      const [px, py] = toCanvasPos([rM * Math.sin(ang), rM * Math.cos(ang)]);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // 5. 标注 Ap (远地点) 与 Pe (近地点) 节点徽标
  const apY = cy - apRadPx;
  ctx.fillStyle = '#4de2d1';
  ctx.beginPath();
  ctx.arc(cx, apY, compact ? 3.5 : 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = compact ? 'bold 9.5px monospace' : 'bold 11px monospace';
  ctx.fillText(`Ap ${(state.orbit.apoapsisM / 1000).toFixed(1)}km`, cx + 6, apY + 3);

  if (!compact && state.orbit.periapsisM > -500000) {
    const peY = ellipseCenterY + ry;
    ctx.fillStyle = state.orbit.isOrbitStable ? '#b8f566' : '#ffb84d';
    ctx.beginPath();
    ctx.arc(cx, peY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`Pe ${(state.orbit.periapsisM / 1000).toFixed(1)} km`, cx + 8, peY + 14);
  }

  // 6. 当前火箭实时位置图标
  const [rxPos, ryPos] = toCanvasPos(state.position);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(rxPos, ryPos, compact ? 4 : 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff9838';
  ctx.lineWidth = compact ? 1.5 : 2;
  ctx.stroke();

  if (compact) {
    ctx.fillStyle = 'rgba(4, 10, 14, 0.72)';
    ctx.fillRect(0, h - 20, w, 20);
    ctx.fillStyle = state.orbit.isOrbitStable ? '#b8f566' : '#dce8e1';
    ctx.font = '10px monospace';
    ctx.fillText(
      `ALT ${(state.orbit.altitudeM / 1000).toFixed(1)}km | Pe ${(state.orbit.periapsisM / 1000).toFixed(0)}km | ${state.orbit.orbitalSpeedMs.toFixed(0)}m/s`,
      6,
      h - 6
    );
  }
}
