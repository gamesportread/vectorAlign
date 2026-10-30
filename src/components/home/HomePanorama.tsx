import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  PointLight,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3
} from 'three';
import { HOME_MISSIONS } from '../../data/homeMissions';
import {
  ToonInkPass,
  createSparkleTexture,
  createToonGradient,
  toonifyObject,
  type ToonifyOptions
} from './homeToon';

export interface HomePanoramaProps {
  selectedTaskId: number;
  autoRotate?: boolean;
  onAngleChange?: (yawDeg: number, pitchDeg: number) => void;
  resetSignal?: number;
}

// 每个任务的「三渲二」光照氛围：主光 / 轮廓光 / 环境光 / 星场可见度
interface ToonMood {
  ambient: string;
  ambientIntensity: number;
  key: string;
  keyIntensity: number;
  keyPosition: [number, number, number];
  rim: string;
  rimIntensity: number;
  starOpacity: number;
}

const TOON_MOODS: Record<number, ToonMood> = {
  // 黄昏发射场：暖橙主光 + 紫蓝天光
  1: { ambient: '#8f86c9', ambientIntensity: 0.75, key: '#ffd3a3', keyIntensity: 2.4, keyPosition: [-30, 22, 30], rim: '#9db8ff', rimIntensity: 1.4, starOpacity: 0.45 },
  // 近地轨道白昼：左上方太阳直射
  2: { ambient: '#7f9fd6', ambientIntensity: 0.7, key: '#fffaf0', keyIntensity: 2.7, keyPosition: [-40, 35, 20], rim: '#7fd8ff', rimIntensity: 1.3, starOpacity: 1 },
  // 轨道日出：低角度暖色日光 + 品红天光
  3: { ambient: '#8a78c8', ambientIntensity: 0.7, key: '#ffcf9a', keyIntensity: 2.6, keyPosition: [-45, 8, 15], rim: '#ff8fd0', rimIntensity: 1.2, starOpacity: 1 },
  // 太平洋白昼：明亮天空
  4: { ambient: '#9cc4ff', ambientIntensity: 0.95, key: '#ffffff', keyIntensity: 2.5, keyPosition: [-30, 40, 25], rim: '#e6f4ff', rimIntensity: 1.1, starOpacity: 0 }
};

const PANORAMA_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// 将一张宽幅插画包裹为无缝 360° 全景：
// 前方 180° 显示完整画面，后方 180° 为镜像，左右接缝连续；画面上下超出部分平滑过渡为模糊天色
const PANORAMA_FRAGMENT = /* glsl */ `
uniform sampler2D mapA;
uniform sampler2D mapB;
uniform float aspectA;
uniform float aspectB;
uniform float mixT;
varying vec3 vDir;
#define PI 3.141592653589793

vec3 samplePano(sampler2D map, float aspect, float yaw, float pitch) {
  float x = 0.5 + yaw / PI;
  float m = mod(x, 2.0);
  x = m > 1.0 ? 2.0 - m : m;
  float vSpan = PI / aspect;
  float y = 0.5 + pitch / vSpan;
  float outside = max(0.0, max(-y, y - 1.0));
  vec2 uv = vec2(x, clamp(y, 0.002, 0.998));
  vec3 sharp = texture2D(map, uv).rgb;
  vec3 soft = texture2D(map, uv, 7.0).rgb;
  return mix(sharp, soft, smoothstep(0.0, 0.18, outside));
}

void main() {
  vec3 d = normalize(vDir);
  float yaw = atan(d.x, -d.z);
  float pitch = asin(clamp(d.y, -1.0, 1.0));
  vec3 a = samplePano(mapA, aspectA, yaw, pitch);
  vec3 b = samplePano(mapB, aspectB, yaw, pitch);
  gl_FragColor = vec4(mix(a, b, mixT), 1.0);
  #include <colorspace_fragment>
}
`;

function textureAspect(tex: Texture) {
  const img = tex.image as { width?: number; height?: number } | undefined;
  return img?.width && img?.height ? img.width / img.height : 16 / 9;
}

// 360° 全景插画天球：贴图切换时平滑交叉淡入
function PanoramaSphere({ selectedTaskId }: { selectedTaskId: number }) {
  const texturesRef = useRef<Map<string, Texture>>(new Map());
  const fadeRef = useRef({ active: false });

  const currentMission = HOME_MISSIONS.find((m) => m.id === selectedTaskId) ?? HOME_MISSIONS[0];
  const imageUrl = currentMission.image;

  const material = useMemo(() => {
    const blank = new DataTexture(new Uint8Array([10, 14, 34, 255]), 1, 1);
    blank.colorSpace = SRGBColorSpace;
    blank.needsUpdate = true;
    return new ShaderMaterial({
      uniforms: {
        mapA: { value: blank },
        mapB: { value: blank },
        aspectA: { value: 16 / 9 },
        aspectB: { value: 16 / 9 },
        mixT: { value: 0 }
      },
      vertexShader: PANORAMA_VERTEX,
      fragmentShader: PANORAMA_FRAGMENT,
      side: BackSide,
      depthWrite: false
    });
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    let cancelled = false;
    const apply = (tex: Texture) => {
      if (cancelled) return;
      const u = material.uniforms;
      // 若上一次淡入尚未结束，先定格到当前混合目标
      if (fadeRef.current.active) {
        u.mapA.value = u.mapB.value;
        u.aspectA.value = u.aspectB.value;
      }
      u.mapB.value = tex;
      u.aspectB.value = textureAspect(tex);
      u.mixT.value = 0;
      fadeRef.current.active = true;
    };
    const cached = texturesRef.current.get(imageUrl);
    if (cached) {
      apply(cached);
    } else {
      new TextureLoader().load(imageUrl, (tex) => {
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = 8;
        texturesRef.current.set(imageUrl, tex);
        apply(tex);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [imageUrl, material]);

  useFrame((_, delta) => {
    if (!fadeRef.current.active) return;
    const u = material.uniforms;
    u.mixT.value = Math.min(1, u.mixT.value + delta * 1.6);
    if (u.mixT.value >= 1) {
      u.mapA.value = u.mapB.value;
      u.aspectA.value = u.aspectB.value;
      u.mixT.value = 0;
      fadeRef.current.active = false;
    }
  });

  return (
    <mesh material={material} renderOrder={-10}>
      <sphereGeometry args={[500, 64, 40]} />
    </mesh>
  );
}

// 动漫风星场：远处细碎星尘 + 闪烁的四芒星（在 360° 旋转时呈现空间视差）
function CosmicStarfield({ opacity }: { opacity: number }) {
  const dustRef = useRef<Points>(null);
  const sparkleRef = useRef<Points>(null);
  const sparkleTexture = useMemo(() => createSparkleTexture(), []);
  const opacityRef = useRef(opacity);

  const [{ dust, sparkles }] = useState(() => {
    const build = (count: number, rMin: number, rRange: number) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        // 偏向上半天球，避免星星落在地面/海面上
        const phi = Math.acos(1 - Math.random() * 1.25);
        const r = rMin + Math.random() * rRange;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.cos(phi);
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        const tone = Math.random();
        const c = tone > 0.8 ? [0.7, 0.9, 1.0] : tone > 0.62 ? [1.0, 0.9, 0.7] : tone > 0.55 ? [1.0, 0.75, 0.92] : [1, 1, 1];
        colors.set(c, i * 3);
      }
      const geom = new BufferGeometry();
      geom.setAttribute('position', new BufferAttribute(positions, 3));
      geom.setAttribute('color', new BufferAttribute(colors, 3));
      return geom;
    };
    return { dust: build(1400, 400, 60), sparkles: build(90, 360, 40) };
  });

  useEffect(() => () => {
    dust.dispose();
    sparkles.dispose();
    sparkleTexture.dispose();
  }, [dust, sparkles, sparkleTexture]);

  useFrame(({ clock }, delta) => {
    opacityRef.current = MathUtils.damp(opacityRef.current, opacity, 3, delta);
    const t = clock.getElapsedTime();
    if (dustRef.current) {
      dustRef.current.rotation.y += delta * 0.006;
      (dustRef.current.material as PointsMaterial).opacity = 0.7 * opacityRef.current;
      dustRef.current.visible = opacityRef.current > 0.01;
    }
    if (sparkleRef.current) {
      sparkleRef.current.rotation.y += delta * 0.006;
      const m = sparkleRef.current.material as PointsMaterial;
      m.opacity = (0.75 + Math.sin(t * 2.2) * 0.25) * opacityRef.current;
      m.size = 9 + Math.sin(t * 1.3) * 1.5;
      sparkleRef.current.visible = opacityRef.current > 0.01;
    }
  });

  return (
    <>
      <points ref={dustRef} geometry={dust}>
        <pointsMaterial size={1.8} vertexColors transparent opacity={0.7} depthWrite={false} />
      </points>
      <points ref={sparkleRef} geometry={sparkles}>
        <pointsMaterial
          size={9}
          map={sparkleTexture}
          vertexColors
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </>
  );
}

// 克隆 GLB 并转换为三渲二材质（不污染其它场景共用的 GLTF 缓存）
function useToonClone(url: string, options: Omit<ToonifyOptions, 'gradientMap'>) {
  const { scene } = useGLTF(url);
  const gradientMap = useMemo(() => createToonGradient(), []);
  return useMemo(
    () => toonifyObject(scene.clone(true), { rimStrength: 0.45, ...options, gradientMap }),
    [scene, gradientMap, options.rimColor]
  );
}

// SLS 烟雾：奶白色云团 + 冷紫阴影，接近动画里的赛璐珞烟雾
const SLS_OVERRIDES: ToonifyOptions['overrides'] = {
  Mat_Smoke_Unified: (m) => {
    m.color.set('#fff3e2');
    m.emissive.set('#3b2f52');
    m.emissiveIntensity = 1;
  },
  Mat_Tower_Steel: (m) => m.color.set('#8b97ab'),
  Mat_Tower_Deck: (m) => m.color.set('#5d6880')
};

// NASA 阿耳忒弥斯 SLS 重型火箭与移动发射台（升空主模型）
function SLSArtemisModel() {
  const clone = useToonClone('/models/sls_artemis_launch.glb', {
    rimColor: '#ffd9b0',
    saturation: 1.3,
    brightness: 1.1,
    overrides: SLS_OVERRIDES
  });

  const groupRef = useRef<Group>(null);
  const flameLightRef = useRef<PointLight>(null);
  const flareRef = useRef<Mesh>(null);
  const flareCoreRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (flameLightRef.current) {
      // 真实 RS-25 与固体助推器点火剧烈火光呼吸微颤
      flameLightRef.current.intensity = 5.2 + Math.sin(t * 16) * 0.9 + Math.cos(t * 31) * 0.6;
    }
    // 赛璐珞火焰：两层硬边色块交替跳动（逐帧动画手感）
    const step = Math.floor(t * 12) % 3;
    if (flareRef.current) {
      const s = 1.0 + step * 0.06;
      flareRef.current.scale.set(s, s * 1.08, s);
    }
    if (flareCoreRef.current) {
      const s = 0.62 + ((step + 1) % 3) * 0.05;
      flareCoreRef.current.scale.set(s, s, s);
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

      {/* 地面火焰耀斑：外层橙色 + 内核奶白，硬边平涂 */}
      <mesh ref={flareRef} position={[0, -1.1, 0]}>
        <sphereGeometry args={[1.8, 20, 16]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <mesh ref={flareCoreRef} position={[0, -1.1, 0]}>
        <sphereGeometry args={[1.8, 20, 16]} />
        <meshBasicMaterial color="#fff6d8" depthWrite={false} />
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
function NASAStationModel({ rimColor }: { rimColor: string }) {
  const clone = useToonClone('/models/iss.glb', { rimColor, saturation: 1.2, brightness: 1.65, mapBias: 1.5 });
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
  const clone = useToonClone('/models/dragon.glb', { rimColor: '#eaf6ff', saturation: 1.1, brightness: 1.2 });
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
  if (taskId === 2) {
    return <NASAStationModel rimColor="#c9ecff" />;
  }
  if (taskId === 3) {
    return <NASAStationModel rimColor="#ffc3e6" />;
  }
  if (taskId === 4) {
    return <DragonCapsuleModel />;
  }
  return <SLSArtemisModel />;
}

// 三渲二灯光：随任务切换平滑过渡颜色与强度
function ToonLighting({ mood }: { mood: ToonMood }) {
  const ambientRef = useRef<AmbientLight>(null);
  const keyRef = useRef<DirectionalLight>(null);
  const rimRef = useRef<DirectionalLight>(null);
  const target = useMemo(
    () => ({ ambient: new Color(), key: new Color(), rim: new Color(), keyPos: new Vector3() }),
    []
  );

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-delta * 3);
    target.ambient.set(mood.ambient);
    target.key.set(mood.key);
    target.rim.set(mood.rim);
    target.keyPos.set(...mood.keyPosition);
    if (ambientRef.current) {
      ambientRef.current.color.lerp(target.ambient, k);
      ambientRef.current.intensity = MathUtils.lerp(ambientRef.current.intensity, mood.ambientIntensity, k);
    }
    if (keyRef.current) {
      keyRef.current.color.lerp(target.key, k);
      keyRef.current.intensity = MathUtils.lerp(keyRef.current.intensity, mood.keyIntensity, k);
      keyRef.current.position.lerp(target.keyPos, k);
    }
    if (rimRef.current) {
      rimRef.current.color.lerp(target.rim, k);
      rimRef.current.intensity = MathUtils.lerp(rimRef.current.intensity, mood.rimIntensity, k);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={mood.ambientIntensity} color={mood.ambient} />
      {/* 正面主光源：决定赛璐珞明暗分界 */}
      <directionalLight ref={keyRef} position={mood.keyPosition} intensity={mood.keyIntensity} color={mood.key} />
      {/* 侧后方轮廓光，勾勒结构边缘 */}
      <directionalLight ref={rimRef} position={[60, 30, -70]} intensity={mood.rimIntensity} color={mood.rim} />
    </>
  );
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
  const mood = TOON_MOODS[selectedTaskId] ?? TOON_MOODS[1];
  return (
    <div className="home-panorama-canvas-wrap" data-testid="home-panorama-canvas">
      <Canvas
        flat
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 0], fov: 65, near: 0.5, far: 1200 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        {/* 三渲二灯光氛围 */}
        <ToonLighting mood={mood} />

        {/* 360° 动漫插画天球 */}
        <PanoramaSphere selectedTaskId={selectedTaskId} />

        {/* 动漫风星场 */}
        <CosmicStarfield opacity={mood.starOpacity} />

        {/* 场景 3D 实体模型（赛璐珞材质） */}
        <Suspense fallback={null}>
          <MissionAmbience3D taskId={selectedTaskId} />
        </Suspense>

        {/* 360° 全景旋转摄像机控制 */}
        <PanoramaCameraRig
          autoRotate={autoRotate}
          onAngleChange={onAngleChange}
          resetSignal={resetSignal}
        />

        {/* 漫画墨线描边后处理 */}
        <ToonInkPass inkColor="#0b1030" thickness={1.2} />
      </Canvas>
    </div>
  );
}
