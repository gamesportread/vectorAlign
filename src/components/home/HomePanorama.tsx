import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  BackSide, 
  BufferAttribute, 
  BufferGeometry, 
  Color, 
  DoubleSide, 
  Group, 
  MathUtils, 
  Mesh, 
  MeshBasicMaterial, 
  Points, 
  PointsMaterial, 
  SRGBColorSpace, 
  Texture, 
  TextureLoader, 
  Vector3 
} from 'three';
import { HOME_MISSIONS } from '../../data/homeMissions';

export interface HomePanoramaProps {
  selectedTaskId: number;
  autoRotate?: boolean;
  onAngleChange?: (yawDeg: number, pitchDeg: number) => void;
  resetSignal?: number;
}

// 360° 全景背景球贴图加载与切换
function PanoramaSphere({ selectedTaskId }: { selectedTaskId: number }) {
  const meshRef = useRef<Mesh>(null);
  const texturesRef = useRef<Map<string, Texture>>(new Map());
  const [activeTexture, setActiveTexture] = useState<Texture | null>(null);

  const currentMission = HOME_MISSIONS.find((m) => m.id === selectedTaskId) ?? HOME_MISSIONS[0];
  const imageUrl = currentMission.image;

  useEffect(() => {
    const loader = new TextureLoader();
    if (texturesRef.current.has(imageUrl)) {
      setActiveTexture(texturesRef.current.get(imageUrl)!);
    } else {
      loader.load(imageUrl, (tex) => {
        tex.colorSpace = SRGBColorSpace;
        texturesRef.current.set(imageUrl, tex);
        setActiveTexture(tex);
      });
    }
  }, [imageUrl]);

  return (
    <mesh ref={meshRef} rotation={[0, -Math.PI / 2, 0]}>
      <sphereGeometry args={[500, 60, 40]} />
      {activeTexture ? (
        <meshBasicMaterial 
          map={activeTexture} 
          side={BackSide} 
          depthWrite={false}
        />
      ) : (
        <meshBasicMaterial 
          color="#06090c" 
          side={BackSide} 
          depthWrite={false}
        />
      )}
    </mesh>
  );
}

// 空间微尘与闪烁恒星星场（在 360° 旋转时呈现真实空间视差与纵深感）
function CosmicStarfield() {
  const pointsRef = useRef<Points>(null);
  
  const [geometry] = useState(() => {
    const count = 1800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // 球面随机分布
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 380 + Math.random() * 80;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // 星光色调：白、冰蓝、淡金
      const tone = Math.random();
      if (tone > 0.8) {
        colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.88; colors[i * 3 + 2] = 1.0; // 冰蓝
      } else if (tone > 0.6) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.92; colors[i * 3 + 2] = 0.75; // 淡金
      } else {
        colors[i * 3] = 0.95; colors[i * 3 + 1] = 0.98; colors[i * 3 + 2] = 1.0; // 纯白
      }
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(positions, 3));
    geom.setAttribute('color', new BufferAttribute(colors, 3));
    return geom;
  });

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.008;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial 
        size={2.2} 
        vertexColors 
        transparent 
        opacity={0.85} 
        depthWrite={false} 
      />
    </points>
  );
}

// 任务专属 3D 氛围元素 (太空站太阳翼反光、地平线弧光等)
function MissionAmbience3D({ taskId }: { taskId: number }) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.015;
    }
  });

  if (taskId === 2 || taskId === 3) {
    // 空间站对接与离开：远景轨道微光与空间标定信标
    return (
      <group ref={groupRef} position={[60, 15, -160]}>
        {/* 空间站微光信标 */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[12, 1.2, 1.2]} />
          <meshStandardMaterial color="#88a090" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* 远景太阳能帆板微光 */}
        <mesh position={[0, 6, 0]}>
          <boxGeometry args={[24, 0.2, 8]} />
          <meshStandardMaterial color="#8a6840" metalness={0.9} roughness={0.2} emissive="#4d351a" emissiveIntensity={0.3} />
        </mesh>
        <pointLight color="#7de8be" intensity={1.5} distance={100} />
      </group>
    );
  }

  if (taskId === 1) {
    // 升空：低空远景发射台探照光柱
    return (
      <group position={[120, -60, -180]} rotation={[0.2, 0.4, 0]}>
        <pointLight color="#ffb86c" intensity={2} distance={200} />
        <mesh position={[0, 20, 0]}>
          <cylinderGeometry args={[2, 0.5, 50, 16]} />
          <meshBasicMaterial color="#ffd8a8" transparent opacity={0.15} side={DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  return null;
}

// 360° 相机旋转与阻尼控制器
function PanoramaCameraRig({
  autoRotate,
  onAngleChange,
  resetSignal
}: {
  autoRotate: boolean;
  onAngleChange?: (yawDeg: number, pitchDeg: number) => void;
  resetSignal?: number;
}) {
  const { camera, gl } = useThree();

  // 当前方位角与仰角 (弧度)
  const rotRef = useRef({ yaw: 0, pitch: 0 });
  const targetRotRef = useRef({ yaw: 0, pitch: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, startYaw: 0, startPitch: 0 });
  const lastInteractionRef = useRef(performance.now());

  // 重置视角信号
  useEffect(() => {
    targetRotRef.current = { yaw: 0, pitch: 0 };
    lastInteractionRef.current = performance.now();
  }, [resetSignal]);

  // 全局鼠标/触摸事件绑定
  useEffect(() => {
    const dom = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      // 只有左键拖拽才触发 360° 旋转 (Button 0)
      if (e.button !== 0) return;
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startYaw: targetRotRef.current.yaw,
        startPitch: targetRotRef.current.pitch
      };
      lastInteractionRef.current = performance.now();
      dom.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      // 旋转灵敏度
      const sens = 0.0035;
      targetRotRef.current.yaw = dragStartRef.current.startYaw - dx * sens;
      // 仰角限制在 -78° ~ +78° 之间，避免极点翻转
      const maxPitch = (78 * Math.PI) / 180;
      targetRotRef.current.pitch = MathUtils.clamp(
        dragStartRef.current.startPitch + dy * sens,
        -maxPitch,
        maxPitch
      );

      lastInteractionRef.current = performance.now();
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      dom.style.cursor = 'grab';
    };

    dom.style.cursor = 'grab';
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    // 自动巡航慢速平滑漂移（当用户未交互且开启 autoRotate 时）
    const now = performance.now();
    if (autoRotate && !isDraggingRef.current && now - lastInteractionRef.current > 1800) {
      targetRotRef.current.yaw -= delta * 0.045; // 每秒约 2.5 度的优雅慢速旋转
    }

    // 弹性平滑插值 (Lerp Damping)
    const lerpFactor = Math.min(1, delta * 10);
    rotRef.current.yaw = MathUtils.lerp(rotRef.current.yaw, targetRotRef.current.yaw, lerpFactor);
    rotRef.current.pitch = MathUtils.lerp(rotRef.current.pitch, targetRotRef.current.pitch, lerpFactor);

    // 将球坐标转为相机视线方向 (看向内部)
    const yaw = rotRef.current.yaw;
    const pitch = rotRef.current.pitch;

    const dirX = Math.cos(pitch) * Math.sin(yaw);
    const dirY = Math.sin(pitch);
    const dirZ = -Math.cos(pitch) * Math.cos(yaw);

    const lookTarget = new Vector3(dirX * 100, dirY * 100, dirZ * 100);
    camera.position.set(0, 0, 0);
    camera.lookAt(lookTarget);

    if (onAngleChange) {
      const yawDeg = Math.round(((((-yaw * 180) / Math.PI) % 360) + 360) % 360);
      const pitchDeg = Math.round((pitch * 180) / Math.PI);
      onAngleChange(yawDeg, pitchDeg);
    }
  });

  return null;
}

export function HomePanorama({
  selectedTaskId,
  autoRotate = true,
  onAngleChange,
  resetSignal
}: HomePanoramaProps) {
  return (
    <div className="home-panorama-canvas-wrap" data-testid="home-panorama-canvas">
      <Canvas
        camera={{ position: [0, 0, 0], fov: 65, near: 0.1, far: 1200 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[100, 80, 50]} intensity={1.5} color="#eef8ff" />

        {/* 360° 天球全景背景 */}
        <PanoramaSphere selectedTaskId={selectedTaskId} />

        {/* 星际粒子与深度星场 */}
        <CosmicStarfield />

        {/* 场景 3D 光影氛围 */}
        <MissionAmbience3D taskId={selectedTaskId} />

        {/* 360° 全景旋转摄像机控制 */}
        <PanoramaCameraRig
          autoRotate={autoRotate}
          onAngleChange={onAngleChange}
          resetSignal={resetSignal}
        />
      </Canvas>
    </div>
  );
}
