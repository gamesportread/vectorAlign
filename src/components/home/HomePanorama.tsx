import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
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

// NASA 阿耳忒弥斯 SLS 重型火箭与移动发射台（升空主模型）
function SLSArtemisModel() {
  const { scene } = useGLTF('/models/sls_artemis_launch.glb');
  const clone = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    return copy;
  }, [scene]);

  const groupRef = useRef<Group>(null);
  const flameLightRef = useRef<any>(null);
  const flareRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (flameLightRef.current) {
      // 真实 RS-25 与固体助推器点火剧烈火光呼吸微颤
      flameLightRef.current.intensity = 5.2 + Math.sin(t * 16) * 0.9 + Math.cos(t * 31) * 0.6;
    }
    if (flareRef.current) {
      const s = 1.0 + Math.sin(t * 14) * 0.08;
      flareRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[15.5, -9.5, -38]}
      rotation={[0, -0.65, 0]}
      scale={1.05}
    >
      <primitive object={clone} />

      {/* 底部发射台主喷管耀眼火光 */}
      <pointLight
        ref={flameLightRef}
        position={[0, -0.8, 0]}
        color="#ff7b24"
        intensity={5.5}
        distance={55}
        decay={2}
      />

      {/* 地面火焰耀斑核心发光体 */}
      <mesh ref={flareRef} position={[0, -1.1, 0]}>
        <sphereGeometry args={[1.8, 16, 16]} />
        <meshBasicMaterial color="#fff4d0" transparent opacity={0.65} depthWrite={false} />
      </mesh>

      {/* 发射塔金属构架泛光与照明 */}
      <pointLight
        position={[3.5, 17, -1.5]}
        color="#ffe2ba"
        intensity={2.8}
        distance={40}
        decay={2}
      />

      {/* 发射平台侧翼烟雾照亮 */}
      <pointLight
        position={[-5, -1, 3]}
        color="#ffaa55"
        intensity={2.2}
        distance={35}
        decay={2}
      />
    </group>
  );
}

useGLTF.preload('/models/sls_artemis_launch.glb');

// 国际空间站 (ISS) 3D 模型
function NASAStationModel() {
  const { scene } = useGLTF('/models/iss.glb');
  const clone = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    return copy;
  }, [scene]);

  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.025;
      groupRef.current.rotation.x += delta * 0.008;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[16, 1.5, -35]}
      rotation={[0.35, -0.75, 0.2]}
      scale={0.52}
    >
      <primitive object={clone} />
      <pointLight position={[0, 8, 10]} color="#b5e0ff" intensity={2.2} distance={60} decay={2} />
      <pointLight position={[-10, -5, -10]} color="#ffd299" intensity={1.5} distance={50} decay={2} />
    </group>
  );
}

useGLTF.preload('/models/iss.glb');

// 龙飞船返回舱 3D 模型
function DragonCapsuleModel() {
  const { scene } = useGLTF('/models/dragon.glb');
  const clone = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    return copy;
  }, [scene]);

  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.03;
      groupRef.current.rotation.z += delta * 0.01;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[15, -1.0, -32]}
      rotation={[-0.35, 0.85, -0.2]}
      scale={2.2}
    >
      <primitive object={clone} />
      <pointLight position={[5, 4, 10]} color="#fff1db" intensity={2.5} distance={40} decay={2} />
      <pointLight position={[-6, -4, -5]} color="#ff7733" intensity={1.8} distance={35} decay={2} />
    </group>
  );
}

useGLTF.preload('/models/dragon.glb');

// 任务专属 3D 实体模型展示
function MissionAmbience3D({ taskId }: { taskId: number }) {
  if (taskId === 1) {
    return <SLSArtemisModel />;
  }
  if (taskId === 2 || taskId === 3) {
    return <NASAStationModel />;
  }
  if (taskId === 4) {
    return <DragonCapsuleModel />;
  }
  return <SLSArtemisModel />;
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
    // 自动巡航慢速平滑漂移：在模型周围优雅往复巡航（约 ±14°），保持 3D 模型始终处于主视区，同时呈现立体的空间视差
    const now = performance.now();
    if (autoRotate && !isDraggingRef.current && now - lastInteractionRef.current > 1800) {
      const t = (now - lastInteractionRef.current - 1800) * 0.0003;
      targetRotRef.current.yaw = Math.sin(t) * 0.22;
      targetRotRef.current.pitch = Math.sin(t * 0.6) * 0.04;
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
        <ambientLight intensity={0.9} />
        {/* 正面主光源，照亮火箭与航天器正面细节 */}
        <directionalLight position={[-20, 30, 40]} intensity={1.8} color="#fffcf5" />
        {/* 侧后方轮廓光，勾勒结构边缘与高光 */}
        <directionalLight position={[60, 40, -60]} intensity={1.2} color="#9ec7e8" />
        {/* 下方微弱地面反射光 */}
        <directionalLight position={[0, -50, -20]} intensity={0.4} color="#554433" />

        {/* 360° 天球全景背景 */}
        <PanoramaSphere selectedTaskId={selectedTaskId} />

        {/* 星际粒子与深度星场 */}
        <CosmicStarfield />

        {/* 场景 3D 实体模型 */}
        <Suspense fallback={null}>
          <MissionAmbience3D taskId={selectedTaskId} />
        </Suspense>

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
