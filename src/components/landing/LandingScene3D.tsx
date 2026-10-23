import { Component, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  SRGBColorSpace
} from 'three';
import { TaskCameraControls } from '../scene/TaskCameraControls';
import type { LandingState } from '../../sim/landing';
import type { Language } from '../../sim/types';

/**
 * 生成 1200㎡ 红白环条纹巨型主降落伞纹理 (Shenzhou Iconic Red-White Striped Main Canopy)
 */
function createMainChuteTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const stripes = 8;
  const step = 512 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e63928' : '#f7f9fa';
    ctx.fillRect(0, i * step, 512, step);
  }

  // 径向伞衣加强筋幅线
  ctx.strokeStyle = 'rgba(30, 35, 40, 0.28)';
  ctx.lineWidth = 3;
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 3D 钟形载人返回舱 + 可抛离防热大底 + 2000℃ 黑障等离子激波鞘套 + 离地 1.5m 反推固体火箭
 */
function ReentryCapsule3D({ state }: { state: LandingState }) {
  const groupRef = useRef<Group>(null);
  const chuteTex = useMemo(() => createMainChuteTexture(), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const tiltRad = (state.attitudeDeviationDeg * Math.PI) / 180;
    const sway = state.chuteState !== 'stowed' ? Math.sin(t * 1.8) * 0.04 : 0;
    groupRef.current.rotation.set(0, 0, tiltRad + sway);
  });

  const plasmaIntensity = Math.min(
    1,
    Math.max(0, (state.heatshieldTempC - 450) / 1400)
  );

  // 绳索起止点 (从返回舱伞舱盖连接到上方伞衣边缘)
  const chuteLines = useMemo(() => {
    const count = 12;
    return Array.from({ length: count }, (_, i) => {
      const ang = (i / count) * Math.PI * 2;
      return {
        ang,
        cos: Math.cos(ang),
        sin: Math.sin(ang)
      };
    });
  }, []);

  const chuteScale = Math.max(0.1, state.chuteProgress);
  const isMain = state.chuteState === 'main';
  const canopyY = isMain ? 6.8 : 4.6;
  const canopyRadius = (isMain ? 3.8 : 1.55) * chuteScale;

  // 防热大底抛离下落位置
  const shieldDropY =
    state.heatshieldJettisoned && state.heatshieldSepElapsedS >= 0
      ? -0.92 - state.heatshieldSepElapsedS * 4.2
      : -0.82;

  return (
    <group ref={groupRef}>
      {/* 1. 钟形返回舱主体 (Bell-Shaped Crew Reentry Module) */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.68, 1.32, 1.75, 32]} />
        <meshStandardMaterial
          color={state.altitudeM < 36000 ? '#78716a' : '#b8c0c4'}
          metalness={0.45}
          roughness={0.55}
        />
      </mesh>

      {/* 顶部伞舱盖与天线环 */}
      <mesh position={[0, 1.08, 0]}>
        <cylinderGeometry args={[0.42, 0.68, 0.22, 24]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* 舷窗 (Crew Porthole Window) */}
      <mesh position={[0, 0.25, 1.02]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.1, 20]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* 底部 4 台着陆反推固体火箭喷口 (抛掉大底后露出) */}
      {[-0.55, 0.55].flatMap((x) =>
        [-0.55, 0.55].map((z, idx) => (
          <mesh key={`${x}-${z}-${idx}`} position={[x, -0.74, z]}>
            <cylinderGeometry args={[0.1, 0.15, 0.16, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
          </mesh>
        ))
      )}

      {/* 2. 可抛离烧蚀防热大底 (Detachable Ablative Heat Shield) */}
      {shieldDropY > -22 && (
        <group position={[0, shieldDropY, 0]}>
          <mesh rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[1.34, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.35]} />
            <meshStandardMaterial
              color={plasmaIntensity > 0.2 ? '#ff6b2b' : '#3b2f2a'}
              emissive={new Color('#ff4500')}
              emissiveIntensity={plasmaIntensity * 2.2}
              roughness={0.75}
              metalness={0.2}
            />
          </mesh>
        </group>
      )}

      {/* 3. 2000℃ 高超声速弓形激波与黑障等离子火球鞘套 (Hypersonic Plasma Sheath) */}
      {plasmaIntensity > 0.05 && (
        <group>
          {/* 底部炽白弓形激波锋面 */}
          <mesh position={[0, -0.95, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[1.52, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
            <meshBasicMaterial
              color="#ff9e44"
              transparent
              opacity={plasmaIntensity * 0.72}
              blending={AdditiveBlending}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
          {/* 向上包裹舱体的电离等离子体尾迹笼 */}
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry args={[2.1, 1.48, 3.8, 28, 1, true]} />
            <meshBasicMaterial
              color="#ff5511"
              transparent
              opacity={plasmaIntensity * 0.42}
              blending={AdditiveBlending}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* 4. 两级降落伞系统 (减速引导伞 Drogue / 1200㎡ 红白巨型主伞 Main Chute) */}
      {state.chuteState !== 'stowed' && (
        <group>
          {chuteLines.map((ln) => (
            <Line
              key={ln.ang}
              points={[
                [ln.cos * 0.35, 1.15, ln.sin * 0.35],
                [ln.cos * canopyRadius * 0.92, canopyY - 0.3, ln.sin * canopyRadius * 0.92]
              ]}
              color="#e2e8f0"
              lineWidth={1.2}
              transparent
              opacity={0.75}
            />
          ))}
          <mesh position={[0, canopyY - canopyRadius * 0.3, 0]}>
            <sphereGeometry
              args={[canopyRadius, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55]}
            />
            {isMain ? (
              <meshStandardMaterial
                map={chuteTex}
                side={DoubleSide}
                roughness={0.65}
              />
            ) : (
              <meshStandardMaterial
                color="#f97316"
                side={DoubleSide}
                roughness={0.6}
              />
            )}
          </mesh>
        </group>
      )}

      {/* 5. 离地 1.5 米固体着陆反推火箭猛烈火舌 (Soft-Landing Retro-Rocket Plumes) */}
      {state.retroFired && (state.retroBurnLeftS > 0 || state.altitudeM === 0) && (
        <group position={[0, -0.85, 0]}>
          {[-0.58, 0.58].flatMap((x) =>
            [-0.58, 0.58].map((z, idx) => (
              <mesh key={`retro-${idx}`} position={[x, -0.7, z]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.38, 1.65, 16]} />
                <meshBasicMaterial
                  color="#fde047"
                  transparent
                  opacity={0.88}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            ))
          )}
        </group>
      )}
    </group>
  );
}

/**
 * 东风着陆场大草原地面与靶心标识 (Dongfeng Steppe Touchdown Zone)
 */
function DongfengSteppeGround({ altitudeM }: { altitudeM: number }) {
  if (altitudeM > 350) return null;

  // 当 altitudeM = 0 时，地面正好贴合返回舱底部 y = -0.82
  const groundY = -0.82 - altitudeM * 0.28;

  return (
    <group position={[0, groundY, 0]}>
      {/* 辽阔草原地形圆盘 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[180, 64]} />
        <meshStandardMaterial color="#3f5e36" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* 着陆靶心圆环 */}
      {[2.5, 6.0, 12.0].map((r, i) => (
        <mesh key={r} position={[0, 0.02 + i * 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.18, r, 48]} />
          <meshBasicMaterial
            color={i === 0 ? '#b8f566' : '#facc15'}
            transparent
            opacity={0.65}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

class LandingSceneBoundary extends Component<
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

export function LandingScene3D({
  state,
  scenarioId,
  language
}: {
  state: LandingState;
  scenarioId: number;
  language: Language;
}) {
  // 根据高度动态平滑过渡天空背景色：高空黑障紫黑 -> 对流层蔚蓝 -> 着陆场晴空
  const skyColor =
    state.inBlackout
      ? '#1a0c0e'
      : state.altitudeM > 20000
      ? '#0b192c'
      : state.altitudeM > 2000
      ? '#1e5082'
      : '#3b7bb5';

  return (
    <LandingSceneBoundary
      fallback={
        <div className="scene-fallback">
          {language === 'zh' ? '3D 返回舱着陆视口已就绪' : '3D Capsule Landing Viewport Ready'}
        </div>
      }
    >
      <Canvas
        shadows
        camera={{ position: [4.2, 2.2, 11.5], fov: 45, near: 0.1, far: 500 }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={[skyColor]} />

        <ambientLight intensity={0.68} />
        <hemisphereLight args={['#a5d8ff', '#3b5230', 0.75]} />
        <directionalLight position={[18, 28, 16]} intensity={2.5} color="#fff7ed" castShadow />

        {/* 高空大气天幕 */}
        <mesh>
          <sphereGeometry args={[260, 32, 20]} />
          <meshBasicMaterial color={skyColor} side={BackSide} depthWrite={false} />
        </mesh>

        <ReentryCapsule3D state={state} />
        <DongfengSteppeGround altitudeM={state.altitudeM} />

        {/* 统一 3D 任务相机鼠标控制：左键旋转、右键平移、滚轮缩放 */}
        <TaskCameraControls
          resetKey={`lnd-${scenarioId}`}
          initialTarget={[0, 0.5, 0]}
          minDistance={3.5}
          maxDistance={42}
        />
      </Canvas>
    </LandingSceneBoundary>
  );
}
