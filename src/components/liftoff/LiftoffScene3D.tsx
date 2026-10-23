import { Component, Suspense, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, useTexture } from '@react-three/drei';
import { TaskCameraControls } from '../scene/TaskCameraControls';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  PointLight,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3
} from 'three';
import {
  computeReferencePitchDeg,
  type LiftoffState,
  type RocketVehicleConfig
} from '../../sim/liftoff';
import type { Language } from '../../sim/types';

/**
 * 生成高细节程序化火箭箭体纹理（带金属蒙皮接缝、加强筋、NASA黑白格相机追踪带与字体标识）
 */
function createSaturnVHullTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;

  // 1. 基底哑光白漆与微金属灰底色
  const baseGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  baseGrad.addColorStop(0, '#e8edea');
  baseGrad.addColorStop(0.25, '#f7faf8');
  baseGrad.addColorStop(0.5, '#dee5e1');
  baseGrad.addColorStop(0.75, '#f6f9f7');
  baseGrad.addColorStop(1, '#e8edea');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 2048);

  // 2. 纵向防滑加强筋波纹 (Stringer corrugations)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.045)';
  for (let x = 0; x < 1024; x += 8) {
    ctx.fillRect(x, 0, 3, 2048);
  }

  // 3. 横向环缝与铆钉线 (Circumferential panel seams)
  ctx.strokeStyle = 'rgba(30, 42, 36, 0.22)';
  ctx.lineWidth = 2;
  for (let y = 120; y < 2048; y += 160) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // 4. 顶部与中部经典黑白棋盘格光学追踪环 (NASA Roll Pattern Checkerboard)
  const drawCheckerBand = (yStart: number, height: number, blocks = 16) => {
    const bw = 1024 / blocks;
    for (let i = 0; i < blocks; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#141917' : '#f4f7f5';
      ctx.fillRect(i * bw, yStart, bw, height);
    }
  };
  drawCheckerBand(80, 75, 16);
  drawCheckerBand(920, 65, 16);

  // 5. S-IC 级经典的四道纵向黑色条纹 (Black Intertank & Aft Roll Stripes)
  ctx.fillStyle = '#141917';
  const stripePositions = [64, 320, 576, 832];
  for (const sx of stripePositions) {
    ctx.fillRect(sx, 1180, 112, 680);
  }

  // 6. 红色竖排 "U S A" 与黑色 "UNITED STATES" 标识
  ctx.fillStyle = '#c9302c';
  ctx.font = 'bold 58px sans-serif';
  ctx.textAlign = 'center';
  for (const cx of [248, 760]) {
    ctx.fillText('U', cx, 1380);
    ctx.fillText('S', cx, 1465);
    ctx.fillText('A', cx, 1550);
  }

  ctx.fillStyle = '#18201d';
  ctx.font = 'bold 28px monospace';
  for (const cx of [248, 760]) {
    ctx.save();
    ctx.translate(cx, 540);
    ctx.fillText('UNITED', 0, -20);
    ctx.fillText('STATES', 0, 18);
    ctx.restore();
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 生成长征二号F (CZ-2F) 箭体高清纹理
 */
/**
 * 生成长征五号 (CZ-5 · 胖五) 箭体高清纹理
 */
function createCz5HullTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f5f8fa';
  ctx.fillRect(0, 0, 1024, 2048);

  // 细密蒙皮线与铆钉网格
  ctx.strokeStyle = 'rgba(25, 40, 60, 0.15)';
  ctx.lineWidth = 2;
  for (let y = 80; y < 2048; y += 140) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // 胖五标志性红蓝相间光学跟踪环带
  const blocks = 16;
  const bw = 1024 / blocks;
  for (let i = 0; i < blocks; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1b4f9c' : '#f5f8fa';
    ctx.fillRect(i * bw, 180, bw, 60);
    ctx.fillStyle = i % 2 === 0 ? '#d93829' : '#f5f8fa';
    ctx.fillRect(i * bw, 980, bw, 45);
  }

  // 航天蓝垂直标识："CZ-5" 与 "中国航天"
  ctx.fillStyle = '#1b4f9c';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  for (const cx of [256, 768]) {
    ctx.fillText('C', cx, 540);
    ctx.fillText('Z', cx, 610);
    ctx.fillText('-', cx, 670);
    ctx.fillText('5', cx, 730);

    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('中', cx, 830);
    ctx.fillText('国', cx, 880);
    ctx.fillText('航', cx, 930);
    ctx.fillText('天', cx, 980);
    ctx.font = 'bold 56px sans-serif';
  }

  // 五星红旗标志
  for (const cx of [256, 768]) {
    ctx.fillStyle = '#de2910';
    ctx.fillRect(cx - 50, 380, 100, 66);
    ctx.fillStyle = '#ffde00';
    ctx.font = '28px sans-serif';
    ctx.fillText('★', cx - 22, 412);
    ctx.font = '14px sans-serif';
    ctx.fillText('★', cx + 4, 398);
    ctx.fillText('★', cx + 16, 408);
    ctx.fillText('★', cx + 16, 422);
    ctx.fillText('★', cx + 4, 432);
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCz2fHullTexture(): CanvasTexture {
  return createCz5HullTexture();
}

/**
 * 生成 2048x2048 肯尼迪航天中心 LC-39A 海岸发射场超清地面纹理
 * 包含：海岸灌木植被与沙洲斑驳地貌、东侧大西洋海岸浪花、八角形混凝土防爆坪、
 * 履带运输车双车道砂石跑道 (Crawlerway)、环场沥青公路与导流槽高温灼烧痕迹，以及边缘大气柔化过渡
 */
function createLaunchComplexGroundTexture(): CanvasTexture {
  const size = 2048;
  const cx = size / 2;
  const cy = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. 基底：佛罗里达卡纳维拉尔角海岸湿地与沙洲草甸底色
  const baseGrad = ctx.createRadialGradient(cx, cy, 80, cx, cy, size * 0.5);
  baseGrad.addColorStop(0, '#334631');
  baseGrad.addColorStop(0.35, '#2b3e2b');
  baseGrad.addColorStop(0.7, '#223526');
  baseGrad.addColorStop(1, '#1a2c24');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. 多尺度有机植被群落、沙地斑块与湿地水洼 (消除单调纯色感)
  for (let i = 0; i < 1400; i++) {
    const seed1 = (i * 16807) % 2147483647;
    const seed2 = (seed1 * 48271) % 2147483647;
    const angle = ((seed1 % 3600) / 3600) * Math.PI * 2;
    const dist = Math.pow((seed2 % 1000) / 1000, 0.72) * (size * 0.48);
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const rx = 14 + (seed1 % 68);
    const ry = 10 + (seed2 % 52);

    const palette = [
      'rgba(62, 84, 52, 0.28)', // 浅绿海岸灌木
      'rgba(34, 52, 36, 0.34)', // 深绿松林斑块
      'rgba(122, 114, 88, 0.22)', // 海岸沙洲裸土
      'rgba(82, 96, 64, 0.26)', // 干草甸
      'rgba(24, 42, 46, 0.28)' // 沿海咸水泻湖暗斑
    ];
    ctx.fillStyle = palette[i % palette.length];
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, (i % 12) * 0.26, 0, Math.PI * 2);
    ctx.fill();
  }

  // 细密地表颗粒噪点线（草丛与砂石肌理）
  ctx.fillStyle = 'rgba(180, 175, 148, 0.08)';
  for (let i = 0; i < 4500; i++) {
    const x = ((i * 7919) % size);
    const y = ((i * 6271) % size);
    ctx.fillRect(x, y, 3, 3);
  }

  // 3. 东侧（右侧 x > 1420）大西洋海岸沙滩、浪花带与蔚蓝海水
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(1480, 0);
  for (let y = 0; y <= size; y += 64) {
    const waveX = 1460 + Math.sin(y * 0.0045) * 55 + Math.cos(y * 0.011) * 24;
    ctx.lineTo(waveX, y);
  }
  ctx.lineTo(size, size);
  ctx.lineTo(size, 0);
  ctx.closePath();

  const oceanGrad = ctx.createLinearGradient(1420, 0, size, 0);
  oceanGrad.addColorStop(0, '#c2b28a'); // 黄金海岸沙滩
  oceanGrad.addColorStop(0.05, '#e8f4f8'); // 拍岸白浪泡沫
  oceanGrad.addColorStop(0.14, '#2a7885'); // 浅滩碧水
  oceanGrad.addColorStop(0.4, '#154b6b'); // 近海深蓝
  oceanGrad.addColorStop(1, '#0c2e4a'); // 远洋深蓝
  ctx.fillStyle = oceanGrad;
  ctx.fill();
  ctx.restore();

  // 4. 发射场外围环形沥青勤务公路与支线道路
  ctx.strokeStyle = '#333836';
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.arc(cx, cy, 410, 0, Math.PI * 2);
  ctx.stroke();

  // 公路黄色虚线中线
  ctx.save();
  ctx.strokeStyle = 'rgba(235, 195, 75, 0.65)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([16, 16]);
  ctx.beginPath();
  ctx.arc(cx, cy, 410, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 通往东北、西北低温液氧/液氢储罐区的混凝土支路
  ctx.strokeStyle = '#4d5451';
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(cx - 280, cy - 280);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + 280, cy - 240);
  ctx.stroke();

  // 5. 标志性双车道履带运输车巨型砂石跑道 (NASA Dual-Lane Crawlerway)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI * 0.72); // 从西南方 VAB 总装大楼延伸至发射台
  // 外侧砂石路基
  ctx.fillStyle = '#8a8270';
  ctx.fillRect(-78, 120, 156, 820);
  // 左右两条巨型履带车压痕车道
  ctx.fillStyle = '#6e6656';
  ctx.fillRect(-66, 120, 52, 820);
  ctx.fillRect(14, 120, 52, 820);
  // 中央草坪隔离带
  ctx.fillStyle = '#364a33';
  ctx.fillRect(-14, 165, 28, 775);
  // 履带板横向压痕纹理
  ctx.fillStyle = 'rgba(40, 36, 28, 0.25)';
  for (let ty = 130; ty < 920; ty += 12) {
    ctx.fillRect(-64, ty, 48, 4);
    ctx.fillRect(16, ty, 48, 4);
  }
  ctx.restore();

  // 6. 中央八角形钢筋混凝土防爆坪 (LC-39A Octagonal Concrete Pad Apron)
  const padRadius = 295;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 + Math.PI / 8;
    const px = cx + Math.cos(ang) * padRadius;
    const py = cy + Math.sin(ang) * padRadius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.clip();

  // 混凝土地坪底色
  const padGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, padRadius);
  padGrad.addColorStop(0, '#787f7c');
  padGrad.addColorStop(0.65, '#8c9490');
  padGrad.addColorStop(1, '#6d7571');
  ctx.fillStyle = padGrad;
  ctx.fillRect(cx - padRadius, cy - padRadius, padRadius * 2, padRadius * 2);

  // 混凝土伸缩缝方格网线 (Concrete Expansion Joints)
  ctx.strokeStyle = 'rgba(35, 42, 39, 0.35)';
  ctx.lineWidth = 2;
  const gridStep = 32;
  for (let gx = cx - padRadius; gx <= cx + padRadius; gx += gridStep) {
    ctx.beginPath();
    ctx.moveTo(gx, cy - padRadius);
    ctx.lineTo(gx, cy + padRadius);
    ctx.stroke();
  }
  for (let gy = cy - padRadius; gy <= cy + padRadius; gy += gridStep) {
    ctx.beginPath();
    ctx.moveTo(cx - padRadius, gy);
    ctx.lineTo(cx + padRadius, gy);
    ctx.stroke();
  }

  // 导流槽东西两侧尾焰高温碳化熏黑痕迹 (Exhaust Plume Scorch Marks)
  const scorchGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 240);
  scorchGrad.addColorStop(0, 'rgba(18, 20, 19, 0.85)');
  scorchGrad.addColorStop(0.45, 'rgba(38, 34, 28, 0.48)');
  scorchGrad.addColorStop(1, 'rgba(38, 34, 28, 0)');
  ctx.fillStyle = scorchGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 245, 76, 0, 0, Math.PI * 2);
  ctx.fill();

  // 八角形边缘黄黑安全警戒线
  ctx.strokeStyle = '#e5a93c';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();

  // 7. 最外圈地平线径向大气透明渐变，彻底消除圆盘生硬边界！
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  const alphaMask = ctx.createRadialGradient(cx, cy, size * 0.28, cx, cy, size * 0.495);
  alphaMask.addColorStop(0, 'rgba(255, 255, 255, 1)');
  alphaMask.addColorStop(0.72, 'rgba(255, 255, 255, 0.96)');
  alphaMask.addColorStop(0.9, 'rgba(255, 255, 255, 0.45)');
  alphaMask.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = alphaMask;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 生成 3D 发射台钢筋混凝土斜坡基座与防爆墙纹理 (Weathered Concrete Hardstand Texture)
 */
function createConcretePadTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7e8682';
  ctx.fillRect(0, 0, 512, 512);

  // 风化混凝土斑驳杂色
  for (let i = 0; i < 900; i++) {
    const x = (i * 3571) % 512;
    const y = (i * 2909) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(20,25,22,0.07)';
    ctx.fillRect(x, y, 12 + (i % 18), 8 + (i % 14));
  }

  // 模板分块接缝线与铆孔
  ctx.strokeStyle = 'rgba(30, 36, 33, 0.38)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // 底部工业黄黑警示条纹边带
  for (let i = 0; i < 32; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#d99b26' : '#1e2421';
    ctx.fillRect(i * 16, 484, 16, 28);
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 创建扩张型钟形发动机喷管几何体 (Parabolic Rocket Engine Bell Nozzle)
 */
function createNozzleBellGeometry(
  rTop: number,
  rBottom: number,
  height: number,
  radialSegments = 28,
  heightSegments = 10
): BufferGeometry {
  const geom = new CylinderGeometry(rTop, rBottom, height, radialSegments, heightSegments, true);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // t = 0 为顶部喷喉，t = 1 为底部喷口边缘
    const t = (height * 0.5 - y) / height;
    const r = rTop + (rBottom - rTop) * Math.pow(Math.max(0, Math.min(1, t)), 0.62);
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const curR = Math.hypot(x, z);
    if (curR > 1e-5) {
      pos.setX(i, (x / curR) * r);
      pos.setZ(i, (z / curR) * r);
    }
  }
  geom.computeVertexNormals();
  return geom;
}

/**
 * 创建超音速膨胀羽流几何体
 */
function createPlumeGeometry(
  rThroat: number,
  rExit: number,
  length: number
): BufferGeometry {
  const geom = new CylinderGeometry(1, 1, length, 28, 16, true);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // 将顶点从 [0, -length] 展开，喷口在 y = 0，向下喷射到 y = -length
    const t = (length * 0.5 - y) / length;
    const r = rThroat + (rExit - rThroat) * Math.pow(Math.max(0, Math.min(1, t)), 0.58);
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const curR = Math.hypot(x, z);
    if (curR > 1e-5) {
      pos.setX(i, (x / curR) * r);
      pos.setZ(i, (z / curR) * r);
    }
    pos.setY(i, y - length * 0.5);
  }
  geom.computeVertexNormals();
  return geom;
}

const plumeVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalVec;
  void main() {
    vUv = uv;
    vNormalVec = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const plumeFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalVec;
  uniform float uTime;
  uniform vec3 uCoreColor;
  uniform vec3 uMidColor;
  uniform vec3 uOuterColor;
  uniform float uThrottle;
  uniform float uVacFactor;

  void main() {
    // vUv.y: 1.0 at nozzle throat (top), 0.0 at plume tip (bottom)
    float dist = 1.0 - vUv.y;
    float axialFade = pow(max(0.0, 1.0 - dist), 1.65);
    if (axialFade <= 0.002 || uThrottle <= 0.01) discard;

    // 高速喷流湍流波纹
    float wave1 = sin(dist * 26.0 - uTime * 38.0) * 0.06;
    float wave2 = cos(dist * 52.0 - uTime * 64.0) * 0.04;
    float turb = 0.94 + wave1 + wave2;

    // 超音速马赫环激波节 (Mach Shock Diamonds)
    float machDiamonds = exp(-dist * 3.8) * pow(max(0.0, sin(dist * 34.0)), 4.0) * (1.1 - uVacFactor * 0.5);

    // 边缘菲涅尔柔和羽化，消除生硬多边形边界
    float fresnel = pow(abs(vNormalVec.z), 0.85);

    vec3 col = mix(uCoreColor, uMidColor, smoothstep(0.0, 0.32, dist));
    col = mix(col, uOuterColor, smoothstep(0.28, 0.85, dist));
    col += uCoreColor * machDiamonds * 0.95;

    float alpha = axialFade * fresnel * turb * (0.82 + machDiamonds * 0.35) * min(1.0, uThrottle * 1.2);
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * 单台 3D 火箭发动机喷管 + 高温喷喉发光核
 */
function EngineBell({
  position,
  rTop,
  rBottom,
  height,
  active,
  throttle,
  isKerolox
}: {
  position: [number, number, number];
  rTop: number;
  rBottom: number;
  height: number;
  active: boolean;
  throttle: number;
  isKerolox: boolean;
}) {
  const bellGeo = useMemo(
    () => createNozzleBellGeometry(rTop, rBottom, height),
    [rTop, rBottom, height]
  );

  return (
    <group position={position}>
      {/* 顶部金箔隔热罩环 (Gold Kapton Thermal Blanket) */}
      <mesh position={[0, height * 0.42, 0]}>
        <cylinderGeometry args={[rTop * 1.15, rTop * 1.22, height * 0.28, 20]} />
        <meshStandardMaterial color="#b88932" metalness={0.78} roughness={0.32} />
      </mesh>

      {/* 镍基高温合金再生冷却喷管钟罩 (Inconel Regeneratively Cooled Nozzle) */}
      <mesh geometry={bellGeo} castShadow>
        <meshStandardMaterial
          color="#2b3330"
          metalness={0.85}
          roughness={0.35}
          side={DoubleSide}
        />
      </mesh>

      {/* 喷管加强箍环 (Stiffener Bands) */}
      {[0.1, -0.22].map((yFrac, i) => (
        <mesh key={i} position={[0, height * yFrac, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[rTop + (rBottom - rTop) * (0.5 - yFrac * 0.8), 0.018, 8, 24]} />
          <meshStandardMaterial color="#58645e" metalness={0.88} roughness={0.28} />
        </mesh>
      ))}

      {/* 点火时的喷口内部白炽发光核 */}
      {active && throttle > 0.01 && (
        <mesh position={[0, -height * 0.35, 0]}>
          <sphereGeometry args={[rBottom * 0.78, 16, 16]} />
          <meshBasicMaterial
            color={isKerolox ? '#fff7d6' : '#d6f5ff'}
            transparent
            opacity={Math.min(0.95, throttle)}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * 3D 超音速主羽流与动态尾焰照明
 */
function RocketPlume3D({
  yOffset,
  throttle,
  altitudeM,
  isStage1,
  time
}: {
  yOffset: number;
  throttle: number;
  altitudeM: number;
  isStage1: boolean;
  time: number;
}) {
  const lightRef = useRef<PointLight>(null);

  const vacFactor = Math.min(1, Math.max(0, altitudeM / 75000));
  const outerGeo = useMemo(() => createPlumeGeometry(0.68, 2.2, 11.5), []);
  const innerGeo = useMemo(() => createPlumeGeometry(0.42, 1.05, 8.2), []);

  const outerMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: plumeVertexShader,
        fragmentShader: plumeFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uCoreColor: { value: new Color('#ffffff') },
          uMidColor: { value: new Color('#ff9d2e') },
          uOuterColor: { value: new Color('#ff3b14') },
          uThrottle: { value: 1 },
          uVacFactor: { value: 0 }
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide
      }),
    []
  );

  const innerMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: plumeVertexShader,
        fragmentShader: plumeFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uCoreColor: { value: new Color('#ffffff') },
          uMidColor: { value: new Color('#fff3b0') },
          uOuterColor: { value: new Color('#ff8811') },
          uThrottle: { value: 1 },
          uVacFactor: { value: 0 }
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide
      }),
    []
  );

  useFrame((_, delta) => {
    outerMat.uniforms.uTime.value += delta;
    innerMat.uniforms.uTime.value += delta;
    outerMat.uniforms.uThrottle.value = throttle;
    innerMat.uniforms.uThrottle.value = throttle;
    outerMat.uniforms.uVacFactor.value = vacFactor;
    innerMat.uniforms.uVacFactor.value = vacFactor;

    if (isStage1) {
      // 第一级 F-1 液氧煤油：璀璨金白核心 + 炽烈橙红尾焰
      outerMat.uniforms.uCoreColor.value.set('#fffdf2');
      outerMat.uniforms.uMidColor.value.set('#ff9924');
      outerMat.uniforms.uOuterColor.value.set('#e63917');
      innerMat.uniforms.uMidColor.value.set('#ffe89e');
      innerMat.uniforms.uOuterColor.value.set('#ff7b19');
    } else {
      // 第二/三级 J-2 液氢液氧：幽蓝等离子真空膨胀羽流
      outerMat.uniforms.uCoreColor.value.set('#ffffff');
      outerMat.uniforms.uMidColor.value.set('#5ce1ff');
      outerMat.uniforms.uOuterColor.value.set('#1f6feb');
      innerMat.uniforms.uMidColor.value.set('#ccf4ff');
      innerMat.uniforms.uOuterColor.value.set('#38bdf8');
    }

    if (lightRef.current) {
      const flicker = 0.9 + Math.sin(time * 55) * 0.1;
      lightRef.current.intensity = throttle * (isStage1 ? 18 : 10) * flicker;
      lightRef.current.color.set(isStage1 ? '#ff9e3b' : '#66d9ff');
    }
  });

  if (throttle <= 0.01) return null;

  const scaleRadial = (0.75 + throttle * 0.35) * (1 + vacFactor * 1.45);
  const scaleLength = (0.65 + throttle * 0.55) * (1 + vacFactor * 0.65);

  return (
    <group position={[0, yOffset, 0]} scale={[scaleRadial, scaleLength, scaleRadial]}>
      <mesh geometry={innerGeo} material={innerMat} />
      <mesh geometry={outerGeo} material={outerMat} />
      <pointLight ref={lightRef} position={[0, -2.2, 0]} distance={45} decay={1.6} />
    </group>
  );
}

/**
 * 生成柔和羽化的体积云/蒸汽粒子贴图 (Soft Volumetric Billboard Cloud Texture)
 * 彻底消除多边形球体(dodecahedron)的生硬棱角感
 */
function createSoftCloudParticleTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // 多层偏心高斯软团叠加，形成自然翻滚的云雾边缘
  const puffs = [
    { x: 128, y: 128, r: 108, a: 0.55 },
    { x: 96, y: 118, r: 76, a: 0.42 },
    { x: 158, y: 122, r: 74, a: 0.42 },
    { x: 124, y: 92, r: 68, a: 0.38 },
    { x: 132, y: 156, r: 72, a: 0.36 }
  ];

  for (const p of puffs) {
    const grad = ctx.createRadialGradient(p.x, p.y, p.r * 0.08, p.x, p.y, p.r);
    grad.addColorStop(0, `rgba(255, 255, 255, ${p.a})`);
    grad.addColorStop(0.45, `rgba(242, 247, 252, ${p.a * 0.65})`);
    grad.addColorStop(0.78, `rgba(220, 230, 238, ${p.a * 0.22})`);
    grad.addColorStop(1, 'rgba(210, 222, 232, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 3D 体积感导流槽浓烟与百万加仑水幕降噪蒸汽云 (Soft Camera-Facing Volumetric Billboards)
 */
function VolumetricLaunchSmoke({
  active,
  altitudeM,
  pxPerMeter
}: {
  active: boolean;
  altitudeM: number;
  pxPerMeter: number;
}) {
  const count = 72;
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const cloudTex = useMemo(() => createSoftCloudParticleTexture(), []);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        const t = i / count;
        return {
          side,
          phase: t,
          speed: 0.52 + (i % 9) * 0.09,
          spreadZ: (((i * 29) % 100) / 100 - 0.5) * 6.5,
          spreadY: (((i * 17) % 100) / 100) * 3.4,
          baseScale: 2.2 + ((i * 13) % 10) * 0.42
        };
      }),
    []
  );

  useFrame(({ clock, camera }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const groundOffsetY = -6.4 - altitudeM * pxPerMeter;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      if (!active || altitudeM > 220) {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const cycle = (t * p.speed + p.phase) % 1;
      // 沿双向导流槽向东西两侧高速喷涌并翻滚升腾
      const x = p.side * (0.6 + Math.pow(cycle, 0.72) * 18.5);
      const y = groundOffsetY + 0.5 + Math.pow(cycle, 1.35) * 5.6 + p.spreadY * cycle;
      const z = p.spreadZ * (0.25 + cycle * 0.9);
      const s = p.baseScale * (0.55 + Math.sin(cycle * Math.PI) * 1.65);

      dummy.position.set(x, y, z);
      dummy.quaternion.copy(camera.quaternion);
      dummy.rotateZ(t * 0.35 * p.side + i);
      dummy.scale.set(s * 1.35, s, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (altitudeM > 230) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        map={cloudTex}
        color="#f2f6f9"
        emissive="#ff9240"
        emissiveIntensity={active ? 0.32 : 0}
        roughness={1}
        metalness={0}
        transparent
        opacity={Math.max(0, Math.min(0.82, 1 - altitudeM / 200))}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/**
 * 肯尼迪航天中心 39A 发射场全貌 3D 场景 (LC-39A Pad, Hardstand, Flame Trench, Cryo Spheres & Coastal Terrain)
 * 带平滑液压摆臂后撤与高压水幕喷淋动画
 */
function LaunchComplex39A({
  altitudeM,
  clampsReleased,
  isFiring,
  pxPerMeter
}: {
  altitudeM: number;
  clampsReleased: boolean;
  isFiring: boolean;
  pxPerMeter: number;
}) {
  const groundTex = useMemo(() => createLaunchComplexGroundTexture(), []);
  const concreteTex = useMemo(() => createConcretePadTexture(), []);
  const swingGroupRefs = useRef<Array<Group | null>>([]);
  const clampMeshRefs = useRef<Array<Mesh | null>>([]);
  const swingProgressRef = useRef(clampsReleased ? 1 : 0);

  useFrame((_, delta) => {
    const target = clampsReleased ? 1 : 0;
    swingProgressRef.current += (target - swingProgressRef.current) * Math.min(1, delta * 2.4);
    const prog = swingProgressRef.current;

    for (const grp of swingGroupRefs.current) {
      if (grp) {
        grp.rotation.y = prog * 1.05; // 脐带服务摆臂平滑旋转 60° 收回塔侧
      }
    }
    clampMeshRefs.current.forEach((m, idx) => {
      if (m) {
        const rx = idx === 0 ? -1.18 : 1.18;
        m.position.x = rx * (0.96 + prog * 0.28);
        m.rotation.z = rx * -0.48 * prog;
      }
    });
  });

  if (altitudeM > 2600) return null;

  const groundY = -6.65 - altitudeM * pxPerMeter;
  const towerX = -4.2;
  const towerHeight = 16.8;

  const levels = Array.from({ length: 12 }, (_, i) => (i + 1) * (towerHeight / 12));

  return (
    <group position={[0, groundY, 0]}>
      {/* 1. 卡纳维拉尔角 2048x2048 高清海岸地貌、大西洋海岸线、双车道履带跑道与八角防爆坪 */}
      <mesh position={[0, -0.35, 0]} receiveShadow>
        <cylinderGeometry args={[260, 260, 0.7, 72]} />
        <meshStandardMaterial
          map={groundTex}
          roughness={0.86}
          metalness={0.06}
          transparent
        />
      </mesh>

      {/* 东侧大西洋近海海面高光反射层 */}
      <mesh position={[145, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 320]} />
        <meshStandardMaterial
          color="#134663"
          roughness={0.22}
          metalness={0.68}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* 2. LC-39A 钢筋混凝土四棱台斜坡导流山体 (Sloped Concrete Hardstand Mound) */}
      <mesh position={[-0.8, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[12.5, 15.2, 0.28, 8]} />
        <meshStandardMaterial map={concreteTex} roughness={0.82} metalness={0.12} />
      </mesh>

      {/* 导流槽北侧钢筋混凝土斜坡山体 */}
      <mesh position={[-1.1, 0.62, -3.65]} receiveShadow castShadow>
        <boxGeometry args={[12.4, 1.15, 4.2]} />
        <meshStandardMaterial map={concreteTex} roughness={0.78} metalness={0.15} />
      </mesh>
      {/* 导流槽南侧钢筋混凝土斜坡山体 */}
      <mesh position={[-1.1, 0.62, 3.65]} receiveShadow castShadow>
        <boxGeometry args={[12.4, 1.15, 4.2]} />
        <meshStandardMaterial map={concreteTex} roughness={0.78} metalness={0.15} />
      </mesh>

      {/* 西侧履带车攀爬混凝土斜坡引道 (Crawlerway Access Ramp) */}
      <mesh position={[-9.6, 0.38, 0]} rotation={[0, 0, 0.11]} receiveShadow>
        <boxGeometry args={[6.8, 0.55, 6.2]} />
        <meshStandardMaterial map={concreteTex} roughness={0.84} metalness={0.1} />
      </mesh>

      {/* 中央深坑双向导流槽底板与耐高温耐火砖护壁 (Deep Flame Trench) */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[15.5, 0.14, 3.1]} />
        <meshStandardMaterial color="#1d2220" roughness={0.92} metalness={0.1} />
      </mesh>
      {/* 导流槽中央弧形耐热钢铁导流锥 (Steel Flame Deflector Wedge) */}
      <mesh position={[0, 0.38, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.95, 0.95, 2.9]} />
        <meshStandardMaterial color="#8f3224" roughness={0.55} metalness={0.62} />
      </mesh>
      {/* 点火时导流槽内部反射出的炽烈火光 */}
      {isFiring && (
        <pointLight
          position={[2.5, 0.65, 0]}
          color="#ff7b24"
          intensity={14}
          distance={28}
          decay={1.7}
        />
      )}

      {/* 3. 移动发射平台 (MLP - Mobile Launcher Platform) 与 6 根重型支撑钢柱 */}
      {[
        [-4.2, -2.4],
        [0, -2.4],
        [2.8, -2.4],
        [-4.2, 2.4],
        [0, 2.4],
        [2.8, 2.4]
      ].map(([px, pz], idx) => (
        <mesh key={idx} position={[px, 0.95, pz]} castShadow>
          <cylinderGeometry args={[0.26, 0.32, 1.35, 16]} />
          <meshStandardMaterial color="#49544f" metalness={0.68} roughness={0.38} />
        </mesh>
      ))}

      {/* MLP 双层钢结构主平台甲板 */}
      <mesh position={[-1.2, 1.48, 0]} receiveShadow castShadow>
        <boxGeometry args={[9.8, 0.72, 6.6]} />
        <meshStandardMaterial color="#68736e" roughness={0.58} metalness={0.45} />
      </mesh>
      {/* MLP 侧边工字钢加强肋与黄色安全护栏带 */}
      <mesh position={[-1.2, 1.88, 3.26]}>
        <boxGeometry args={[9.85, 0.14, 0.08]} />
        <meshStandardMaterial color="#e0a334" metalness={0.45} roughness={0.4} />
      </mesh>
      <mesh position={[-1.2, 1.88, -3.26]}>
        <boxGeometry args={[9.85, 0.14, 0.08]} />
        <meshStandardMaterial color="#e0a334" metalness={0.45} roughness={0.4} />
      </mesh>

      {/* 火箭底座两侧标志性尾部低温加注桅杆 (Tail Service Masts - TSM) */}
      {[-1.75, 1.75].map((tz, i) => (
        <group key={i} position={[0.2, 2.15, tz]}>
          <mesh castShadow>
            <boxGeometry args={[0.75, 0.95, 0.52]} />
            <meshStandardMaterial color="#d8e0dc" metalness={0.42} roughness={0.38} />
          </mesh>
          <mesh position={[-0.1, 0.55, tz > 0 ? -0.22 : 0.22]} rotation={[tz > 0 ? -0.4 : 0.4, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 0.65, 12]} />
            <meshStandardMaterial color="#8fa198" metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}

      {/* 4. 39A 红色钢铁四角立柱与中心电梯井 */}
      {[
        [-0.95, -0.95],
        [0.95, -0.95],
        [-0.95, 0.95],
        [0.95, 0.95]
      ].map(([dx, dz], idx) => (
        <mesh
          key={idx}
          position={[towerX + dx, 1.8 + towerHeight * 0.5, dz]}
          castShadow
        >
          <cylinderGeometry args={[0.11, 0.13, towerHeight, 12]} />
          <meshStandardMaterial color="#b83b28" metalness={0.58} roughness={0.42} />
        </mesh>
      ))}

      {/* 中心金属电梯井核心筒 */}
      <mesh position={[towerX, 1.8 + towerHeight * 0.5, 0]} castShadow>
        <boxGeometry args={[0.82, towerHeight, 0.82]} />
        <meshStandardMaterial color="#3c4641" metalness={0.62} roughness={0.48} />
      </mesh>

      {/* 12 层水平平台与斜撑桁架 */}
      {levels.map((ly, idx) => (
        <group key={idx} position={[towerX, 1.8 + ly, 0]}>
          <mesh castShadow>
            <boxGeometry args={[2.1, 0.12, 2.1]} />
            <meshStandardMaterial color="#9e3322" metalness={0.55} roughness={0.45} />
          </mesh>
          {/* 侧面交叉斜撑 */}
          <mesh position={[0, -0.65, 0.95]} rotation={[0, 0, 0.62]}>
            <boxGeometry args={[0.07, 1.75, 0.07]} />
            <meshStandardMaterial color="#c4422d" metalness={0.5} roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.65, -0.95]} rotation={[0, 0, -0.62]}>
            <boxGeometry args={[0.07, 1.75, 0.07]} />
            <meshStandardMaterial color="#c4422d" metalness={0.5} roughness={0.45} />
          </mesh>
        </group>
      ))}

      {/* 顶部白色锤头起重机与避雷针塔尖 (Hammerhead Crane & Lightning Mast) */}
      <mesh position={[towerX + 0.5, 1.95 + towerHeight, 0]} castShadow>
        <boxGeometry args={[3.4, 0.42, 1.1]} />
        <meshStandardMaterial color="#dde6e1" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[towerX, 3.1 + towerHeight, 0]}>
        <cylinderGeometry args={[0.04, 0.09, 2.2, 12]} />
        <meshStandardMaterial color="#edf2ef" metalness={0.7} roughness={0.25} />
      </mesh>

      {/* 6 条平滑旋转收回的脐带服务摆臂 + 高压低温加注软管与白色宇航员白房 (White Room) */}
      {[3.2, 5.4, 7.6, 9.8, 11.8, 13.6].map((armY, idx) => (
        <group
          key={idx}
          ref={(el) => {
            swingGroupRefs.current[idx] = el;
          }}
          position={[towerX + 0.95, 1.8 + armY, 0.45]}
        >
          {/* 主桁架摆臂 */}
          <mesh position={[1.45, 0, 0]} castShadow>
            <boxGeometry args={[2.9, 0.22, 0.28]} />
            <meshStandardMaterial color="#d14932" metalness={0.52} roughness={0.42} />
          </mesh>
          {/* 顶层阿波罗登舱白房 (Apollo White Room Environmental Chamber) */}
          {idx === 5 && (
            <mesh position={[2.85, 0.05, -0.22]}>
              <boxGeometry args={[0.62, 0.48, 0.52]} />
              <meshStandardMaterial color="#eef4f1" metalness={0.3} roughness={0.4} />
            </mesh>
          )}
        </group>
      ))}

      {/* 底部重型发射台牵制锁臂 (Hold-Down Arms) */}
      {[-1.18, 1.18].map((rx, i) => (
        <mesh
          key={i}
          ref={(el) => {
            clampMeshRefs.current[i] = el;
          }}
          position={[rx * 0.96, 2.02, 0]}
        >
          <boxGeometry args={[0.42, 0.55, 0.48]} />
          <meshStandardMaterial
            color={clampsReleased ? '#6c7a73' : '#e6a23c'}
            metalness={0.72}
            roughness={0.35}
          />
        </mesh>
      ))}

      {/* 5. 发射场周边标志性地面设施：液氢(LH2)/液氧(LOX)巨型白色球形低温储罐与管廊 */}
      {[
        [-19.5, -14.5],
        [17.5, -13.5]
      ].map(([sx, sz], idx) => (
        <group key={idx} position={[sx, 0, sz]}>
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <cylinderGeometry args={[3.4, 3.6, 0.3, 24]} />
            <meshStandardMaterial color="#6e7672" roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.35, 0]} castShadow receiveShadow>
            <sphereGeometry args={[2.15, 28, 28]} />
            <meshStandardMaterial color="#f0f5f2" metalness={0.35} roughness={0.32} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((leg) => {
            const ang = (leg * Math.PI) / 3;
            return (
              <mesh
                key={leg}
                position={[Math.cos(ang) * 1.85, 1.15, Math.sin(ang) * 1.85]}
              >
                <cylinderGeometry args={[0.09, 0.11, 2.2, 8]} />
                <meshStandardMaterial color="#7d8a84" metalness={0.6} roughness={0.4} />
              </mesh>
            );
          })}
          <mesh
            position={[-sx * 0.42, 0.45, -sz * 0.42]}
            rotation={[0, Math.atan2(-sx, -sz), Math.PI / 2]}
          >
            <cylinderGeometry args={[0.14, 0.14, Math.hypot(sx, sz) * 0.75, 10]} />
            <meshStandardMaterial color="#cfd9d4" metalness={0.68} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* 6. 发射场外围 4 座高耸防雷铁塔与航空红色障碍灯 (Perimeter Lightning Towers) */}
      {[
        [-17, 13],
        [17, 13],
        [-17, -17],
        [17, -17]
      ].map(([lx, lz], idx) => (
        <group key={idx} position={[lx, 0, lz]}>
          <mesh position={[0, 10.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.36, 21, 8]} />
            <meshStandardMaterial color="#9aa6a0" metalness={0.65} roughness={0.38} />
          </mesh>
          <mesh position={[0, 21.2, 0]}>
            <sphereGeometry args={[0.22, 10, 10]} />
            <meshBasicMaterial color="#ff422e" />
          </mesh>
        </group>
      ))}

      {/* 7. 发射台四周强光氙气探照灯组 (Pad Xenon Floodlights) */}
      {[
        [-10.5, 7.5],
        [9.5, 7.5],
        [-10.5, -7.5],
        [9.5, -7.5]
      ].map(([fx, fz], idx) => (
        <group key={idx} position={[fx, 0.6, fz]}>
          <mesh>
            <boxGeometry args={[0.6, 0.8, 0.6]} />
            <meshStandardMaterial color="#4a5450" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <sphereGeometry args={[0.24, 12, 12]} />
            <meshBasicMaterial color="#fff8d6" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * 3D 高精度多级火箭模型 (Saturn V & Long March 2F)
 * 完整支持：
 * 1. 发射逃逸塔 (LES) 固体拖曳火箭点火飞离动画
 * 2. 两瓣蛤壳式整流罩 / SLA 适配器花瓣抛离 + 内部神舟载人飞船(含太阳帆板) / 阿波罗登月舱与服务舱显露
 * 3. 第一级真实全尺寸分离 + 8 枚正推(Ullage)/反推(Retro)固体火箭点火与分离激波白雾环
 * 4. 长征二号F 标志性“科罗廖夫十字 (Korolev Cross)”四助推器同步对称剥离动画
 * 5. 发动机喷管 TVC 矢量摆动与箭体液氧低温排空白雾 (LOX Cryo Boil-Off Vapor)
 */
function DetailedRocket3D({
  state,
  vehicle,
  sepElapsed
}: {
  state: LiftoffState;
  vehicle: RocketVehicleConfig;
  sepElapsed: number;
}) {
  const saturnTex = useMemo(() => createSaturnVHullTexture(), []);
  const czTex = useMemo(() => createCz5HullTexture(), []);
  const isCz = vehicle.id === 'cz5' || vehicle.id === 'cz2f';
  const hullTex = isCz ? czTex : saturnTex;

  // 处于空中爆炸或地表/海面坠毁状态时，正常火箭本体已解体或散落，由专用推演组件呈现
  const consequence = state.consequence ?? 'none';
  if (
    state.status === 'failed' &&
    (consequence === 'exploding' || consequence === 'crashed_pad' || consequence === 'crashed_ocean')
  ) {
    return null;
  }

  // 记录逃逸塔与整流罩抛离后的动画时间
  const prevTowerJetRef = useRef<boolean>(state.towerJettisoned);
  const towerJetTimeRef = useRef<number>(state.towerJettisoned ? -999 : -999);
  if (state.towerJettisoned !== prevTowerJetRef.current) {
    prevTowerJetRef.current = state.towerJettisoned;
    towerJetTimeRef.current = state.towerJettisoned ? state.time : -999;
  }
  const lesElapsed =
    state.towerJettisoned && towerJetTimeRef.current >= 0
      ? Math.max(0, state.time - towerJetTimeRef.current)
      : state.towerJettisoned
        ? 99
        : 0;

  const activeIdx = state.activeStageIndex;
  const pitchRad = ((state.pitchDeg - 90) * Math.PI) / 180;

  // 当前工作级的尾部喷管坐标与发动机点火状态
  const isFiring = state.thrustN > 0 && state.throttle > 0.01;
  const activeNozzleY = activeIdx === 0 ? -5.2 : activeIdx === 1 ? -1.4 : 1.3;

  // 矢量喷管摆角 (Thrust Vector Control Gimbal Angle)
  const gimbalRad = Math.max(-0.16, Math.min(0.16, -state.pitchRateDegS * 0.028));

  // 是否显示正在分离脱落的第一级完整箭体 (持续 12 秒)
  const showSeparatingStage1 = activeIdx === 1 && sepElapsed < 12;
  const stage1DropY = activeIdx === 0 ? -2.9 : -2.9 - sepElapsed * 1.65 - sepElapsed * sepElapsed * 0.38;
  const stage1RotZ = activeIdx === 0 ? 0 : -sepElapsed * 0.04;

  return (
    <group rotation={[0, 0, pitchRad]}>
      {/* ================= 顶部：发射逃逸塔 (LES) 正常挂载或点火拖曳飞离 ================= */}
      {(!state.towerJettisoned || lesElapsed < 8) && (
        <group
          position={[
            lesElapsed * 0.25,
            5.55 + (state.towerJettisoned ? lesElapsed * 3.8 + lesElapsed * lesElapsed * 1.9 : 0),
            0
          ]}
          rotation={[0, 0, state.towerJettisoned ? -lesElapsed * 0.08 : 0]}
        >
          {/* 红色四脚镂空逃逸塔架 */}
          {[-0.14, 0.14].flatMap((tx) =>
            [-0.14, 0.14].map((tz, i) => (
              <mesh
                key={`${tx}-${tz}-${i}`}
                position={[tx * 0.7, 0.42, tz * 0.7]}
                rotation={[tz * 0.18, 0, -tx * 0.18]}
              >
                <cylinderGeometry args={[0.022, 0.028, 0.95, 8]} />
                <meshStandardMaterial color="#d43f28" metalness={0.55} roughness={0.4} />
              </mesh>
            ))
          )}
          {/* 固体逃逸主发动机圆柱与气动鸭翼 */}
          <mesh position={[0, 1.18, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.12, 0.85, 20]} />
            <meshStandardMaterial color="#f2f6f4" metalness={0.35} roughness={0.38} />
          </mesh>
          <mesh position={[0, 1.72, 0]}>
            <coneGeometry args={[0.09, 0.35, 20]} />
            <meshStandardMaterial color="#d43f28" metalness={0.45} roughness={0.35} />
          </mesh>
          {/* 逃逸塔点火抛离时的斜向固体拖曳羽流 (LES Tractor Rocket Plumes) */}
          {state.towerJettisoned && lesElapsed < 4.5 && (
            <>
              {[-1, 1].map((side) => (
                <mesh
                  key={side}
                  position={[side * 0.28, 0.45, 0]}
                  rotation={[0, 0, side * 0.42]}
                >
                  <coneGeometry args={[0.16, 1.35, 16, 1, true]} />
                  <meshBasicMaterial
                    color="#ffbb55"
                    transparent
                    opacity={Math.max(0, 0.88 - lesElapsed * 0.18)}
                    blending={AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>
              ))}
            </>
          )}
        </group>
      )}

      {/* ================= 飞船有效载荷段：整流罩两瓣分离 + 内部阿波罗/神舟飞船 ================= */}
      <group position={[0, 4.1, 0]}>
        {/* 1. 内部真实载人飞船本体 (抛离整流罩/保护罩后完全显露！) */}
        {isCz ? (
          /* 空间站天和核心舱 / 载人飞船结构 (小柱段 + 大柱段 + 节点舱 + 柔性太阳电池翼) */
          <group>
            {/* 轨道舱 (Orbital Module + 对接机构环) */}
            <mesh position={[0, 0.95, 0]} castShadow>
              <cylinderGeometry args={[0.26, 0.32, 0.55, 28]} />
              <meshStandardMaterial color="#d6e4dc" metalness={0.42} roughness={0.35} />
            </mesh>
            <mesh position={[0, 1.28, 0]}>
              <cylinderGeometry args={[0.16, 0.18, 0.14, 24]} />
              <meshStandardMaterial color="#b8c7bf" metalness={0.75} roughness={0.25} />
            </mesh>
            {/* 返回舱钟形防热大底 (Bell-Shaped Reentry Capsule) */}
            <mesh position={[0, 0.38, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.41, 0.58, 32]} />
              <meshStandardMaterial color="#b5945b" metalness={0.62} roughness={0.32} />
            </mesh>
            {/* 推进舱与主太阳翼支架 (Service Module) */}
            <mesh position={[0, -0.35, 0]} castShadow>
              <cylinderGeometry args={[0.41, 0.44, 0.88, 32]} />
              <meshStandardMaterial color="#e8f0ec" metalness={0.38} roughness={0.38} />
            </mesh>
            {/* 整流罩抛离后展开的折叠太阳帆板翼 */}
            {state.towerJettisoned &&
              [-1, 1].map((side) => {
                const deploy = Math.min(1, lesElapsed * 0.4);
                return (
                  <mesh
                    key={side}
                    position={[side * (0.45 + deploy * 0.72), -0.35, 0]}
                    rotation={[0.25, 0, 0]}
                  >
                    <boxGeometry args={[0.04 + deploy * 1.35, 0.42, 0.03]} />
                    <meshStandardMaterial color="#1a3b6e" metalness={0.65} roughness={0.22} />
                  </mesh>
                );
              })}
          </group>
        ) : (
          /* 阿波罗指令/服务舱 (Apollo CSM) + 金色登月舱 (Lunar Module) */
          <group>
            {/* 阿波罗锥形指令舱 (Command Module - 银亮不锈钢防热瓦 + 蓝玻璃观察窗) */}
            <mesh position={[0, 1.05, 0]} castShadow>
              <coneGeometry args={[0.46, 0.92, 36]} />
              <meshStandardMaterial
                color={state.towerJettisoned ? '#c8d6d0' : '#f0f5f2'}
                metalness={state.towerJettisoned ? 0.78 : 0.32}
                roughness={0.25}
              />
            </mesh>
            {/* 阿波罗服务舱银色金属段 + 4 组十字 RCS 姿态控制喷嘴 */}
            <mesh position={[0, 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.46, 0.46, 0.72, 36]} />
              <meshStandardMaterial color="#b8c4be" metalness={0.78} roughness={0.26} />
            </mesh>
            {[0, 1, 2, 3].map((q) => {
              const ang = (q * Math.PI) / 2;
              return (
                <mesh
                  key={q}
                  position={[Math.cos(ang) * 0.48, 0.32, Math.sin(ang) * 0.48]}
                >
                  <boxGeometry args={[0.08, 0.14, 0.08]} />
                  <meshStandardMaterial color="#586660" metalness={0.85} roughness={0.3} />
                </mesh>
              );
            })}
            {/* SLA 适配器内部的金色阿波罗登月舱 (Gold Kapton Lunar Module Descent Stage) */}
            <mesh position={[0, -0.58, 0]}>
              <cylinderGeometry args={[0.38, 0.42, 0.56, 8]} />
              <meshStandardMaterial color="#d49b2a" metalness={0.76} roughness={0.28} />
            </mesh>
          </group>
        )}

        {/* 2. 外部可分离两瓣蛤壳式整流罩 / SLA 锥形保护罩 (Clamshell Fairing / SLA Panels) */}
        {(!state.towerJettisoned || lesElapsed < 9) &&
          [-1, 1].map((side) => {
            const sepProgress = state.towerJettisoned ? lesElapsed : 0;
            const offsetX = side * sepProgress * 1.35;
            const offsetY = -sepProgress * sepProgress * 0.42;
            const rotZ = -side * Math.min(1.4, sepProgress * 0.38);
            const thetaStart = side < 0 ? Math.PI : 0;

            return (
              <group
                key={side}
                position={[offsetX, offsetY, 0]}
                rotation={[0, 0, rotZ]}
              >
                {isCz ? (
                  /* 长征五号 / 天和空间站核心舱大型流线型整流罩半壳 + 栅格翼 */
                  <>
                    <mesh position={[0, 1.05, 0]}>
                      <cylinderGeometry args={[0.12, 0.48, 0.95, 20, 1, false, thetaStart, Math.PI]} />
                      <meshStandardMaterial
                        color="#f2f6f8"
                        metalness={0.3}
                        roughness={0.38}
                        side={DoubleSide}
                      />
                    </mesh>
                    <mesh position={[0, -0.05, 0]}>
                      <cylinderGeometry args={[0.48, 0.725, 1.35, 20, 1, false, thetaStart, Math.PI]} />
                      <meshStandardMaterial
                        color="#f2f6f8"
                        metalness={0.3}
                        roughness={0.38}
                        side={DoubleSide}
                      />
                    </mesh>
                    {/* 整流罩侧面白色折叠栅格翼 (Grid Fins) */}
                    <mesh position={[side * 0.58, 0.25, 0]} rotation={[0, 0, side * 0.25]}>
                      <boxGeometry args={[0.28, 0.42, 0.34]} />
                      <meshStandardMaterial color="#dce4e8" metalness={0.5} roughness={0.35} />
                    </mesh>
                  </>
                ) : (
                  /* 土星五号 SLA 登月舱锥形适配器半瓣壳体 */
                  <mesh position={[0, -0.58, 0]}>
                    <cylinderGeometry args={[0.465, 0.722, 0.96, 20, 1, false, thetaStart, Math.PI]} />
                    <meshStandardMaterial
                      color="#e8eeeb"
                      metalness={0.28}
                      roughness={0.45}
                      side={DoubleSide}
                    />
                  </mesh>
                )}
              </group>
            );
          })}
      </group>

      {/* ================= 第三级：S-IVB (入轨级) ================= */}
      <group position={[0, 2.25, 0]}>
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.725, 0.725, 0.22, 36]} />
          <meshStandardMaterial color="#181f1c" metalness={0.45} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.05, 0]} castShadow>
          <cylinderGeometry args={[0.72, 0.72, 1.38, 40]} />
          <meshStandardMaterial map={hullTex} metalness={0.26} roughness={0.44} />
        </mesh>
        {/* S-IVB 两侧 APS 辅助姿态控制模块 */}
        {[-0.74, 0.74].map((ax, i) => (
          <mesh key={i} position={[ax, -0.45, 0]}>
            <boxGeometry args={[0.1, 0.32, 0.16]} />
            <meshStandardMaterial color="#d8e0dc" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        {/* 当处于第 3 级工作时露出单台 J-2 真空发动机喷管（带 TVC 矢量摆动） */}
        {activeIdx === 2 && (
          <group position={[0, -0.95, 0]} rotation={[0, 0, gimbalRad]}>
            <EngineBell
              position={[0, 0, 0]}
              rTop={0.14}
              rBottom={0.34}
              height={0.52}
              active={isFiring}
              throttle={state.throttle}
              isKerolox={false}
            />
          </group>
        )}
      </group>

      {/* ================= 第二级：S-II (高空氢氧接力级) ================= */}
      {(activeIdx <= 1 || (activeIdx === 2 && sepElapsed < 10)) && (
        <group
          position={[
            0,
            activeIdx <= 1 ? 0.15 : 0.15 - sepElapsed * 1.4 - sepElapsed * sepElapsed * 0.3,
            0
          ]}
          rotation={[0, 0, activeIdx === 2 ? -sepElapsed * 0.03 : 0]}
        >
          {/* 二三级锥形级间段 */}
          <mesh position={[0, 1.15, 0]} castShadow>
            <cylinderGeometry args={[0.72, 1.02, 0.56, 40]} />
            <meshStandardMaterial color="#202824" metalness={0.48} roughness={0.46} />
          </mesh>

          {/* S-II 主箭体 */}
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[1.02, 1.02, 2.08, 44]} />
            <meshStandardMaterial map={hullTex} metalness={0.28} roughness={0.42} />
          </mesh>

          {/* 一二级刚分离时：S-II 底部 8 台固体沉底正推火箭点火羽流 (Ullage Motors Firing) */}
          {activeIdx === 1 && sepElapsed < 3.8 && (
            <group position={[0, -1.05, 0]}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((u) => {
                const ang = (u * Math.PI) / 4;
                return (
                  <mesh
                    key={u}
                    position={[Math.cos(ang) * 1.05, -0.45, Math.sin(ang) * 1.05]}
                  >
                    <coneGeometry args={[0.09, 0.85, 12, 1, true]} />
                    <meshBasicMaterial
                      color="#ffaa44"
                      transparent
                      opacity={Math.max(0, 0.85 - sepElapsed * 0.22)}
                      blending={AdditiveBlending}
                      depthWrite={false}
                    />
                  </mesh>
                );
              })}
            </group>
          )}

          {/* 当第一级抛离后，露出第二级底部的 5 台 J-2 氢氧发动机群 */}
          {activeIdx >= 1 && (
            <group position={[0, -1.42, 0]} rotation={[0, 0, activeIdx === 1 ? gimbalRad : 0]}>
              {[
                [0, 0],
                [0.44, 0],
                [-0.44, 0],
                [0, 0.44],
                [0, -0.44]
              ].map(([nx, nz], idx) => (
                <EngineBell
                  key={idx}
                  position={[nx, 0, nz]}
                  rTop={0.11}
                  rBottom={0.26}
                  height={0.44}
                  active={activeIdx === 1 && isFiring}
                  throttle={activeIdx === 1 ? state.throttle : 0}
                  isKerolox={false}
                />
              ))}
            </group>
          )}
        </group>
      )}

      {/* ================= 第一级：S-IC 巨型煤油级 或 CZ-2F 芯一级+四助推 ================= */}
      {/* 在一级工作期间或刚分离的前 12 秒内完整渲染真实一级箭体与分离反推火箭！ */}
      {(activeIdx === 0 || showSeparatingStage1) && (
        <group position={[0, stage1DropY, 0]} rotation={[0, 0, stage1RotZ]}>
          {/* 一二级格栅级间环 (Interstage Ring) */}
          <mesh position={[0, 1.78, 0]}>
            <cylinderGeometry args={[1.025, 1.025, 0.38, 44]} />
            <meshStandardMaterial color="#171e1b" metalness={0.5} roughness={0.45} />
          </mesh>

          {/* 一二级分离瞬间：S-IC 顶部向前的 8 台固体反推制动火箭羽流 (Retrograde Rockets) + 冷气分离激波环 */}
          {showSeparatingStage1 && sepElapsed < 3.2 && (
            <group position={[0, 1.95, 0]}>
              {/* 膨胀分离冷凝激波白雾环 */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.15 + sepElapsed * 0.95, 0.16, 12, 36]} />
                <meshBasicMaterial
                  color="#e8f4ff"
                  transparent
                  opacity={Math.max(0, 0.65 - sepElapsed * 0.2)}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
              {/* 向斜上方喷射减速的 4 束反推火箭火焰 */}
              {[0, 1, 2, 3].map((rIdx) => {
                const ang = (rIdx * Math.PI) / 2 + Math.PI / 4;
                return (
                  <mesh
                    key={rIdx}
                    position={[Math.cos(ang) * 1.08, 0.55, Math.sin(ang) * 1.08]}
                    rotation={[0, 0, Math.PI]}
                  >
                    <coneGeometry args={[0.14, 1.1, 12, 1, true]} />
                    <meshBasicMaterial
                      color="#ff7722"
                      transparent
                      opacity={Math.max(0, 0.9 - sepElapsed * 0.28)}
                      blending={AdditiveBlending}
                      depthWrite={false}
                    />
                  </mesh>
                );
              })}
            </group>
          )}

          {/* 第一级主箭体 */}
          <mesh position={[0, -0.1, 0]} castShadow>
            <cylinderGeometry args={[1.02, 1.02, 3.45, 48]} />
            <meshStandardMaterial map={hullTex} metalness={0.3} roughness={0.4} />
          </mesh>

          {isCz ? (
            /* 长征五号 (CZ-5 · 胖五) 特色：4 枚 3.35 米全液氧煤油大助推器（双发 YF-100） + 斜头锥造型 */
            [
              [1.26, 0, -1, 0],
              [-1.26, 0, 1, 0],
              [0, 1.26, 0, 1],
              [0, -1.26, 0, -1]
            ].map(([bx, bz, rotZSign, rotXSign], idx) => {
              const bSep = showSeparatingStage1 ? sepElapsed : 0;
              const radialSpread = 1 + bSep * 0.92;
              const peelAngle = Math.min(1.35, bSep * 0.34);
              return (
                <group
                  key={idx}
                  position={[bx * radialSpread, -0.45 - bSep * 0.45, bz * radialSpread]}
                  rotation={[rotXSign * peelAngle, 0, rotZSign * peelAngle]}
                >
                  {/* 胖五标志性斜向切尖鼻锥 (Bevel Nose Cone) */}
                  <mesh position={[0, 1.35, 0]} castShadow>
                    <coneGeometry args={[0.42, 0.88, 24]} />
                    <meshStandardMaterial color="#f2f6f8" metalness={0.32} roughness={0.38} />
                  </mesh>
                  {/* 3.35 米直径助推器箭体 */}
                  <mesh castShadow>
                    <cylinderGeometry args={[0.42, 0.42, 2.2, 24]} />
                    <meshStandardMaterial map={hullTex} metalness={0.3} roughness={0.4} />
                  </mesh>
                  {/* 每个助推器底部的 2 台 YF-100 120吨级高压补燃煤油发动机 */}
                  {[-0.12, 0.12].map((off, eIdx) => (
                    <EngineBell
                      key={eIdx}
                      position={[off, -1.22, 0]}
                      rTop={0.11}
                      rBottom={0.24}
                      height={0.38}
                      active={activeIdx === 0 && isFiring}
                      throttle={activeIdx === 0 ? state.throttle : 0}
                      isKerolox={true}
                    />
                  ))}
                </group>
              );
            })
          ) : (
            /* 土星五号 S-IC 特色：外部液氧输送管道整流罩 + 4 片梯形气动稳定尾翼 */
            <>
              {[0, 1, 2, 3].map((i) => {
                const ang = (i * Math.PI) / 2 + Math.PI / 4;
                return (
                  <group key={i} rotation={[0, ang, 0]}>
                    <mesh position={[1.02, -0.3, 0]}>
                      <cylinderGeometry args={[0.075, 0.085, 2.7, 12]} />
                      <meshStandardMaterial color="#e4eae7" metalness={0.38} roughness={0.42} />
                    </mesh>
                    <mesh position={[1.18, -1.42, 0]} rotation={[0, 0, -0.22]} castShadow>
                      <boxGeometry args={[0.58, 0.92, 0.09]} />
                      <meshStandardMaterial color="#dce4e0" metalness={0.48} roughness={0.38} />
                    </mesh>
                  </group>
                );
              })}
            </>
          )}

          {/* 底部第一级发动机喷管群 (CZ-5 为 2 台 YF-77 氢氧主发动机；土星五号为 5 台巨型 F-1 发动机) */}
          <group position={[0, -2.08, 0]} rotation={[0, 0, activeIdx === 0 ? gimbalRad : 0]}>
            {(isCz
              ? [
                  [0.32, 0],
                  [-0.32, 0]
                ]
              : [
                  [0, 0],
                  [0.54, 0],
                  [-0.54, 0],
                  [0, 0.54],
                  [0, -0.54]
                ]
            ).map(([nx, nz], idx) => (
              <EngineBell
                key={idx}
                position={[nx, 0, nz]}
                rTop={isCz ? 0.14 : 0.16}
                rBottom={isCz ? 0.32 : 0.38}
                height={isCz ? 0.52 : 0.62}
                active={activeIdx === 0 && isFiring}
                throttle={activeIdx === 0 ? state.throttle : 0}
                isKerolox={!isCz}
              />
            ))}
          </group>
        </group>
      )}

      {/* ================= 箭体侧面液氧排空低温白雾 (Cryogenic LOX Boil-Off Vapor) ================= */}
      {state.orbit.altitudeM < 18000 && activeIdx === 0 && (
        <mesh position={[1.08, -1.6, 0.25]} rotation={[0, 0, -0.08]}>
          <coneGeometry args={[0.22, 2.2, 12, 1, true]} />
          <meshBasicMaterial
            color="#f0f8ff"
            transparent
            opacity={0.22 * (1 - state.orbit.altitudeM / 18000)}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* ================= 跨音速音障普朗特-格劳厄脱激波云锥 ================= */}
      {state.mach >= 0.92 && state.mach <= 1.25 && state.orbit.altitudeM < 25000 && (
        <mesh position={[0, 1.8, 0]}>
          <coneGeometry args={[2.6, 2.8, 36, 1, true]} />
          <meshBasicMaterial
            color="#eef8ff"
            transparent
            opacity={0.28 * Math.sin(((state.mach - 0.92) / 0.33) * Math.PI)}
            side={DoubleSide}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}

      {/* ================= 主发动机 3D 超音速等离子尾焰 (随喷管 TVC 同步摆动) ================= */}
      <group rotation={[0, 0, gimbalRad]}>
        <RocketPlume3D
          yOffset={activeNozzleY}
          throttle={state.thrustN > 0 ? state.throttle : 0}
          altitudeM={state.orbit.altitudeM}
          isStage1={activeIdx === 0}
          time={state.time}
        />
      </group>
    </group>
  );
}

/**
 * 失败后果动态推演 3D 视觉系统：
 * 1. exploding: 火箭空中气动折断或碰撞爆炸，多级碎片呈扇形四散飞溅，烈焰火球膨胀与黑烟翻滚
 * 2. falling: 发动机熄火失速，火箭失控剧烈翻滚下坠，尾部拉出长条浓烈黑烟带
 * 3. crashed_pad: 火箭砸毁在发射台水泥基座上，残骸堆积，地表熊熊烈火燃烧并升腾起巨大黑烟柱
 * 4. crashed_ocean: 火箭失速坠入大西洋海面，水面激起白色海浪冲击扩散波纹与冲天水花水雾
 * 5. drifting_space: 高空/入轨推力耗尽，失控火箭残骸在冷寂深空中缓慢无声翻滚漂浮
 */
function LiftoffConsequenceVisuals3D({
  state,
  vehicle
}: {
  state: LiftoffState;
  vehicle: RocketVehicleConfig;
}) {
  const consequence = state.consequence ?? 'none';
  const failElapsed = state.failureTime ? Math.max(0, state.time - state.failureTime) : 0;

  // 预生成爆炸碎片相对初速度与自旋参数
  const fragments = useMemo(
    () => [
      { dir: [1.8, 0.9, 0.7], rot: [2.5, 4.1, 1.8], size: [0.65, 1.4, 0.45], color: '#dce4e8' },
      { dir: [-1.6, 1.4, -0.8], rot: [-3.2, 2.8, -2.1], size: [0.8, 1.8, 0.7], color: '#334155' },
      { dir: [0.5, -1.9, 1.4], rot: [1.9, -3.5, 3.2], size: [0.5, 1.1, 0.5], color: '#e2e8f0' },
      { dir: [-0.9, -1.6, -1.5], rot: [-2.1, 1.7, -4.2], size: [0.7, 0.9, 0.6], color: '#1e293b' },
      { dir: [2.2, -0.5, -0.6], rot: [4.2, -2.1, 1.5], size: [0.9, 1.6, 0.8], color: '#f8fafc' },
      { dir: [-2.0, 0.4, 1.3], rot: [-1.8, 3.4, -2.8], size: [0.6, 1.2, 0.5], color: '#475569' },
      { dir: [0.3, 2.4, 0.5], rot: [3.1, -1.9, 2.4], size: [0.4, 1.5, 0.4], color: '#cbd5e1' },
      { dir: [-0.4, -2.2, -0.9], rot: [-2.7, 3.8, -1.9], size: [0.75, 1.3, 0.75], color: '#0f172a' }
    ],
    []
  );

  const fireLightRef = useRef<PointLight | null>(null);
  useFrame(({ clock }) => {
    if (fireLightRef.current) {
      const flicker = 0.85 + Math.sin(clock.getElapsedTime() * 45) * 0.15;
      fireLightRef.current.intensity = flicker * (consequence === 'crashed_pad' ? 32 : 55);
    }
  });

  if (state.status !== 'failed' || consequence === 'none') {
    return null;
  }

  return (
    <group>
      {/* ================= 1. 空中爆炸解体 (exploding) ================= */}
      {consequence === 'exploding' && (
        <group>
          {/* 膨胀烈焰火球 */}
          {failElapsed < 4.5 && (
            <group scale={Math.min(9.5, 0.8 + failElapsed * 4.2)}>
              <mesh>
                <sphereGeometry args={[1, 24, 24]} />
                <meshBasicMaterial
                  color="#ff4411"
                  transparent
                  opacity={Math.max(0, 0.92 - failElapsed * 0.22)}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
              <mesh scale={0.72}>
                <sphereGeometry args={[1, 20, 20]} />
                <meshBasicMaterial
                  color="#fff0aa"
                  transparent
                  opacity={Math.max(0, 0.95 - failElapsed * 0.26)}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            </group>
          )}

          {/* 爆炸瞬间耀眼强光 */}
          {failElapsed < 3.2 && (
            <pointLight
              position={[0, 0, 0]}
              color="#ffaa33"
              intensity={Math.max(0, 48 * Math.exp(-failElapsed * 0.9))}
              distance={80}
              decay={1.6}
            />
          )}

          {/* 四散翻滚下坠的箭体大块残骸 */}
          {fragments.map((frag, idx) => {
            const spreadDist = Math.min(22, failElapsed * 3.8);
            const posX = frag.dir[0] * spreadDist;
            const posY = frag.dir[1] * spreadDist - failElapsed * failElapsed * 0.35;
            const posZ = frag.dir[2] * spreadDist;
            const rotX = frag.rot[0] * failElapsed * 2.2;
            const rotY = frag.rot[1] * failElapsed * 2.2;
            const rotZ = frag.rot[2] * failElapsed * 2.2;

            return (
              <group key={idx} position={[posX, posY, posZ]} rotation={[rotX, rotY, rotZ]}>
                <mesh castShadow>
                  <boxGeometry args={[frag.size[0], frag.size[1], frag.size[2]]} />
                  <meshStandardMaterial color={frag.color} metalness={0.65} roughness={0.35} />
                </mesh>
                {/* 碎片拖拽的黑烟烟缕 */}
                {failElapsed < 5.5 && (
                  <mesh position={[0, -frag.size[1] * 0.8, 0]}>
                    <coneGeometry args={[0.35, 1.8, 12, 1, true]} />
                    <meshBasicMaterial
                      color="#2b3137"
                      transparent
                      opacity={Math.max(0, 0.7 - failElapsed * 0.12)}
                      depthWrite={false}
                    />
                  </mesh>
                )}
              </group>
            );
          })}
        </group>
      )}

      {/* ================= 2. 熄火重力急坠 (falling) ================= */}
      {consequence === 'falling' && (
        <group>
          {/* 翻滚火箭拖拽的长长失控黑烟柱 */}
          {[1, 2, 3, 4, 5, 6].map((idx) => {
            const trailY = -idx * 2.1;
            const scale = 0.8 + idx * 0.45;
            return (
              <mesh key={idx} position={[0, trailY, 0]} scale={[scale, scale * 1.5, scale]}>
                <sphereGeometry args={[0.6, 16, 16]} />
                <meshBasicMaterial
                  color={idx <= 2 ? '#ff6622' : '#1e242b'}
                  transparent
                  opacity={Math.max(0, 0.75 - idx * 0.1)}
                  blending={idx <= 2 ? AdditiveBlending : undefined}
                  depthWrite={false}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* ================= 3. 坠毁于发射台 (crashed_pad) ================= */}
      {consequence === 'crashed_pad' && (
        <group position={[0, -6.65, 0]}>
          {/* 地面爆燃火焰与火柱 */}
          <group position={[0, 1.8, 0]}>
            <mesh scale={[3.2, 4.5, 3.2]}>
              <coneGeometry args={[1.2, 2.2, 20]} />
              <meshBasicMaterial
                color="#ff5511"
                transparent
                opacity={0.88}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            <mesh scale={[2.1, 3.2, 2.1]}>
              <coneGeometry args={[0.9, 1.8, 16]} />
              <meshBasicMaterial
                color="#ffdd44"
                transparent
                opacity={0.92}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>

          {/* 烈焰光源 */}
          <pointLight
            ref={fireLightRef}
            position={[0, 2.5, 0]}
            color="#ff7722"
            distance={55}
            decay={1.5}
          />

          {/* 发射台升腾的冲天滚滚黑烟柱 */}
          {[1, 2, 3, 4, 5, 6, 7].map((sIdx) => {
            const smokeH = sIdx * 3.4;
            const smokeR = 1.4 + sIdx * 0.68;
            return (
              <mesh
                key={sIdx}
                position={[Math.sin(sIdx * 1.7) * 0.8, smokeH, Math.cos(sIdx * 1.7) * 0.8]}
                scale={[smokeR, smokeR * 1.2, smokeR]}
              >
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial
                  color="#151b20"
                  transparent
                  opacity={Math.max(0.2, 0.82 - sIdx * 0.08)}
                  roughness={0.95}
                />
              </mesh>
            );
          })}

          {/* 堆积在发射台的水泥地焦黑残骸 */}
          {[-1.8, 0, 1.8].map((ox, i) => (
            <mesh
              key={i}
              position={[ox, 0.45, (i % 2) * 1.2]}
              rotation={[0.3, i * 1.1, -0.4]}
              castShadow
            >
              <cylinderGeometry args={[0.85, 0.95, 1.6, 16]} />
              <meshStandardMaterial color="#1f262b" roughness={0.9} metalness={0.4} />
            </mesh>
          ))}
        </group>
      )}

      {/* ================= 4. 坠入大西洋/海面 (crashed_ocean) ================= */}
      {consequence === 'crashed_ocean' && (
        <group position={[0, -6.65, 0]}>
          {/* 海面同心圆白色波纹扩散激波 */}
          {[0, 1, 2].map((ringIdx) => {
            const ringPhase = (failElapsed * 1.2 + ringIdx * 1.4) % 4.2;
            const ringRadius = 2.5 + ringPhase * 5.5;
            const ringOpacity = Math.max(0, 0.85 - ringPhase * 0.2);
            return (
              <mesh key={ringIdx} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[ringRadius, 0.28, 12, 48]} />
                <meshBasicMaterial
                  color="#e0f4ff"
                  transparent
                  opacity={ringOpacity}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            );
          })}

          {/* 冲天白色浪花水柱巨浪 (Ocean Water Geyser Spray) */}
          <group position={[0, 3.8, 0]}>
            <mesh>
              <cylinderGeometry args={[0.65, 3.6, 8.5, 24, 1, true]} />
              <meshBasicMaterial
                color="#d0efff"
                transparent
                opacity={0.82}
                blending={AdditiveBlending}
                depthWrite={false}
                side={DoubleSide}
              />
            </mesh>
            <mesh position={[0, 4.2, 0]}>
              <coneGeometry args={[2.2, 4.5, 20, 1, true]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.75}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>

          {/* 海面升腾的滚滚蒸汽白雾 */}
          {[1, 2, 3, 4].map((vIdx) => {
            const vY = vIdx * 2.2;
            const vR = 2.2 + vIdx * 0.8;
            return (
              <mesh key={vIdx} position={[0, vY, 0]} scale={[vR, vR * 0.8, vR]}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial
                  color="#e8f4fc"
                  transparent
                  opacity={Math.max(0.1, 0.55 - vIdx * 0.1)}
                  depthWrite={false}
                />
              </mesh>
            );
          })}

          {/* 漂浮沉没中的焦黑下级箭体残骸 */}
          <mesh position={[0, 0.35, 0]} rotation={[0.4, 0.2, 1.2]} castShadow>
            <cylinderGeometry args={[0.9, 0.9, 3.2, 20]} />
            <meshStandardMaterial color="#2d3748" metalness={0.5} roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* ================= 5. 太空冷寂漂浮 (drifting_space) ================= */}
      {consequence === 'drifting_space' && (
        <group>
          {/* 排空减压冰晶微粒散落 (Cryo Ice Crystal Venting) */}
          {[0, 1, 2, 3, 4, 5].map((pIdx) => {
            const ang = (pIdx * Math.PI) / 3;
            const rV = 1.4 + (pIdx % 3) * 0.6;
            return (
              <mesh
                key={pIdx}
                position={[Math.cos(ang) * rV, -1.2 - pIdx * 0.4, Math.sin(ang) * rV]}
              >
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshBasicMaterial
                  color="#e0f2fe"
                  transparent
                  opacity={0.7}
                  blending={AdditiveBlending}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

/**
 * 3D 对流层柔和体积积云层 (Troposphere Soft Volumetric Cloud Deck)
 * 采用柔和羽化云团贴图与朝向相机的公告板矩阵，消除多边形生硬感
 */
function TroposphereCloudDeck({
  altitudeM,
  pxPerMeter
}: {
  altitudeM: number;
  pxPerMeter: number;
}) {
  const count = 48;
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const cloudTex = useMemo(() => createSoftCloudParticleTexture(), []);

  const clouds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const ang = ((i * 137.5) % 360) * (Math.PI / 180);
        const dist = 24 + ((i * 29) % 120);
        const altLayerM = 580 + ((i * 53) % 760);
        return {
          x: Math.cos(ang) * dist,
          z: Math.sin(ang) * dist - 10,
          altLayerM,
          sx: 11 + (i % 6) * 3.8,
          sy: 5.5 + (i % 4) * 1.8,
          rotZ: ((i * 0.4) % 0.6) - 0.3
        };
      }),
    []
  );

  useFrame(({ clock, camera }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const c = clouds[i];
      if (altitudeM > 9500) {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const cy = -6.65 + (c.altLayerM - altitudeM) * pxPerMeter;
      dummy.position.set(c.x + Math.sin(t * 0.04 + i) * 0.8, cy, c.z);
      dummy.quaternion.copy(camera.quaternion);
      dummy.rotateZ(c.rotZ);
      dummy.scale.set(c.sx, c.sy, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (altitudeM > 10000) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        map={cloudTex}
        color="#f5f9fc"
        emissive="#9ec5e6"
        emissiveIntensity={0.22}
        roughness={1}
        metalness={0}
        transparent
        opacity={Math.max(0, Math.min(0.68, 1 - altitudeM / 8800))}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/**
 * 3D 远景弧形地球与瑞利散射大气层光晕 (带真实 4K NASA 卫星纹理)
 * 低空时隐藏于发射场地平线之下，避免与局部 3D 发射场地形穿插；随高度攀升平滑浮现壮丽地球弧度
 */
function CurvedEarthHorizon({ altitudeM }: { altitudeM: number }) {
  const [dayMap, cloudsMap] = useTexture([
    '/textures/earth_day_4096.jpg',
    '/textures/earth_clouds_4096.jpg'
  ]);

  dayMap.colorSpace = SRGBColorSpace;
  cloudsMap.colorSpace = SRGBColorSpace;

  const earthRadius = 240;
  // 在低空 (< 1500m) 时将球体压低在局部地面以下，避免穿模；随着火箭爬升平滑显现完整地球曲率
  const lowAltPushDown = Math.max(0, 1 - altitudeM / 1800) * 14;
  const highAltDrop = Math.min(34, (altitudeM / 180000) * 28);
  const dropY = -earthRadius - 7.2 - lowAltPushDown - highAltDrop;

  return (
    <group position={[0, dropY, 0]} rotation={[0.38, -1.25, 0]}>
      {/* 地球陆海球体 */}
      <mesh receiveShadow>
        <sphereGeometry args={[earthRadius, 64, 64]} />
        <meshStandardMaterial map={dayMap} roughness={0.78} metalness={0.08} />
      </mesh>
      {/* 4K 独立大气云层 */}
      <mesh>
        <sphereGeometry args={[earthRadius * 1.004, 64, 64]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.68}
          depthWrite={false}
        />
      </mesh>
      {/* 瑞利散射蓝色大气光晕外层 */}
      <mesh>
        <sphereGeometry args={[earthRadius * 1.022, 64, 64]} />
        <meshBasicMaterial
          color="#3898ff"
          transparent
          opacity={0.24}
          side={BackSide}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

const skyDomeVertexShader = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyDomeFragmentShader = /* glsl */ `
  varying vec3 vWorldDir;
  uniform float uSpaceRatio;

  void main() {
    // 仰角因子：地平线附近为 0，天顶为 1
    float elev = clamp(vWorldDir.y, -0.15, 1.0);
    float horizonFactor = pow(1.0 - clamp(abs(vWorldDir.y), 0.0, 1.0), 3.2);

    // 海平面晴朗瑞利散射渐变（天顶深钴蓝 -> 中空蔚蓝 -> 地平线晨雾浅蓝白）
    vec3 seaZenith = vec3(0.06, 0.17, 0.36);
    vec3 seaMid = vec3(0.18, 0.44, 0.72);
    vec3 seaHorizon = vec3(0.62, 0.80, 0.92);

    vec3 daySky = mix(seaMid, seaZenith, smoothstep(0.05, 0.75, max(0.0, elev)));
    daySky = mix(daySky, seaHorizon, horizonFactor);

    // 地面以下深海雾色兜底
    if (vWorldDir.y < 0.0) {
      daySky = mix(seaHorizon, vec3(0.08, 0.16, 0.22), clamp(-vWorldDir.y * 4.5, 0.0, 1.0));
    }

    // 太空深黑 + 地球边缘蓝色瑞利散射大气层弧光
    vec3 spaceBlack = vec3(0.012, 0.022, 0.045);
    vec3 limbGlow = vec3(0.18, 0.56, 0.96) * pow(horizonFactor, 2.2) * (1.0 - uSpaceRatio * 0.45);
    vec3 spaceSky = spaceBlack + limbGlow;

    // 太阳方向微米氏散射光晕
    vec3 sunDir = normalize(vec3(0.55, 0.65, 0.5));
    float sunAmt = max(0.0, dot(normalize(vWorldDir), sunDir));
    vec3 sunHalo = vec3(1.0, 0.92, 0.78) * pow(sunAmt, 16.0) * 0.28 * (1.0 - uSpaceRatio * 0.6);

    vec3 finalCol = mix(daySky, spaceSky, pow(uSpaceRatio, 0.65)) + sunHalo;
    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

/**
 * 动态瑞利散射大气层天空穹顶与深空星海
 */
function SkyAndStars3D({ altitudeM }: { altitudeM: number }) {
  const starGeo = useMemo(() => {
    const count = 600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 160 + (i % 40);
      const theta = ((i * 73) % 360) * (Math.PI / 180);
      const phi = (((i * 41) % 180) - 90) * (Math.PI / 180);
      positions[i * 3] = r * Math.cos(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.sin(phi)) + 5;
      positions[i * 3 + 2] = -Math.abs(r * Math.cos(phi) * Math.sin(theta)) - 15;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
    return g;
  }, []);

  const skyMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyDomeVertexShader,
        fragmentShader: skyDomeFragmentShader,
        uniforms: {
          uSpaceRatio: { value: 0 }
        },
        side: BackSide,
        depthWrite: false
      }),
    []
  );

  const spaceRatio = Math.min(1, Math.max(0, altitudeM / 55000));
  useFrame(() => {
    skyMat.uniforms.uSpaceRatio.value = spaceRatio;
  });

  return (
    <>
      <mesh material={skyMat}>
        <sphereGeometry args={[460, 36, 24]} />
      </mesh>
      {altitudeM > 10000 && (
        <points geometry={starGeo}>
          <pointsMaterial
            color="#e8f4ff"
            size={0.55}
            transparent
            opacity={Math.min(0.95, (altitudeM - 10000) / 35000)}
          />
        </points>
      )}
    </>
  );
}

/**
 * 3D 速度方向矢量 (Prograde) 与推荐程序仰角引导线
 */
function GuidanceVectors3D({
  state,
  showGuidance
}: {
  state: LiftoffState;
  showGuidance: boolean;
}) {
  if (!showGuidance || !state.clampsReleased) return null;

  const alt = state.orbit.altitudeM;
  const progradeDeg =
    alt < 70000 ? state.orbit.surfaceProgradeDeg : state.orbit.orbitalProgradeDeg;
  const refPitchDeg = computeReferencePitchDeg(
    alt,
    state.orbit.apoapsisM,
    state.orbit.verticalSpeedMs
  );

  // 90° 为正上方 [0, L, 0]，0° 为正右方 [L, 0, 0]
  const len = 7.8;
  const progRad = (progradeDeg * Math.PI) / 180;
  const refRad = (refPitchDeg * Math.PI) / 180;

  const progEnd: [number, number, number] = [
    Math.cos(progRad) * len,
    Math.sin(progRad) * len,
    0
  ];
  const refEnd: [number, number, number] = [
    Math.cos(refRad) * len,
    Math.sin(refRad) * len,
    0
  ];

  return (
    <group>
      {/* 黄色速度矢量线 (Prograde) */}
      <Line points={[[0, 0, 0], progEnd]} color="#ffe14d" lineWidth={2.5} />
      <mesh position={progEnd}>
        <torusGeometry args={[0.32, 0.055, 10, 24]} />
        <meshBasicMaterial color="#ffe14d" />
      </mesh>

      {/* 青色虚线：NASA 推荐重力转向仰角 */}
      <Line
        points={[[0, 0, 0], refEnd]}
        color="#4de2d1"
        lineWidth={1.6}
        dashed
        dashSize={0.35}
        gapSize={0.25}
      />
    </group>
  );
}

class Scene3DErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function LiftoffScene3D({
  state,
  vehicle,
  showGuidance,
  sepElapsed,
  language
}: {
  state: LiftoffState;
  vehicle: RocketVehicleConfig;
  showGuidance: boolean;
  sepElapsed: number;
  language: Language;
}) {
  const pxPerMeter = 0.11;
  const isFiring = state.thrustN > 0 && state.throttle > 0.01;

  return (
    <Scene3DErrorBoundary
      fallback={
        <div className="scene-fallback">
          {language === 'zh' ? '3D 火箭升空视口已就绪' : '3D Liftoff Viewport Ready'}
        </div>
      }
    >
      <Canvas
        shadows
        camera={{ position: [3.6, 2.2, 20.5], fov: 42, near: 0.1, far: 600 }}
        style={{ width: '100%', height: '100%' }}
      >
        <SkyAndStars3D altitudeM={state.orbit.altitudeM} />

        {/* 高对比度太空太阳主光源 + 大气天光漫反射 */}
        <ambientLight intensity={0.55} color="#c8dcff" />
        <hemisphereLight args={['#8ec5ff', '#2a3b30', 0.72]} />
        <directionalLight
          position={[24, 32, 22]}
          intensity={2.4}
          color="#fffaf0"
          castShadow
        />
        <directionalLight position={[-18, -10, 12]} intensity={0.45} color="#4ea8de" />

        {/* 统一 3D 任务相机鼠标控制：左键旋转、右键平移、滚轮缩放 */}
        <TaskCameraControls
          initialTarget={[0, 0.1, 0]}
          minDistance={7}
          maxDistance={46}
        />

        {/* 39A 发射场全貌：海岸地貌、双车道砂石跑道、四棱台混凝土山体、导流槽、低温球罐与防雷塔 */}
        <LaunchComplex39A
          altitudeM={state.orbit.altitudeM}
          clampsReleased={state.clampsReleased}
          isFiring={isFiring}
          pxPerMeter={pxPerMeter}
        />

        {/* 对流层 3D 立体体积积云群 (海拔 ~600m-1300m 穿云体验) */}
        <TroposphereCloudDeck
          altitudeM={state.orbit.altitudeM}
          pxPerMeter={pxPerMeter}
        />

        {/* 3D 体积感导流槽水幕蒸汽与翻滚浓烟 */}
        <VolumetricLaunchSmoke
          active={isFiring}
          altitudeM={state.orbit.altitudeM}
          pxPerMeter={pxPerMeter}
        />

        {/* 3D 高精度多级火箭本体与超音速尾焰 */}
        <DetailedRocket3D state={state} vehicle={vehicle} sepElapsed={sepElapsed} />

        {/* 失败后果动态推演 3D 视觉特效（解体碎片、重力下坠黑烟、发射台大火残骸、海面水柱浪花、太空漫游） */}
        <LiftoffConsequenceVisuals3D state={state} vehicle={vehicle} />

        {/* 速度矢量与推荐仰角 3D 引导线 */}
        <GuidanceVectors3D state={state} showGuidance={showGuidance} />

        {/* 远景 4K 真实纹理弧形地球 */}
        <Suspense fallback={null}>
          <CurvedEarthHorizon altitudeM={state.orbit.altitudeM} />
        </Suspense>
      </Canvas>
    </Scene3DErrorBoundary>
  );
}
