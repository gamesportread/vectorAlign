import { Component, Suspense, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, useGLTF } from '@react-three/drei';
import { AdditiveBlending, ArrowHelper, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, Group, Mesh, Object3D, Quaternion, ShaderMaterial, Vector3 } from 'three';
import { runtime, useSession } from './store';
import { Earth } from './components/scene/Earth';
import { TaskCameraControls } from './components/scene/TaskCameraControls';

function Cylinder({position=[0,0,0],radius=1,length=4,color='#c4ccd1',rotation=[Math.PI/2,0,0]}:{position?:[number,number,number];radius?:number;length?:number;color?:string;rotation?:[number,number,number]}){
  return <mesh position={position} rotation={rotation}><cylinderGeometry args={[radius,radius,length,24]}/><meshStandardMaterial color={color} roughness={.62} metalness={.48}/></mesh>;
}
function Panel({x,y}:{x:number;y:number}){
  const rows=Array.from({length:18},(_,i)=>-7+i*.8);
  return <group position={[x,y,-16]}><mesh><boxGeometry args={[5.6,15,.09]}/><meshStandardMaterial color='#806045' metalness={.48} roughness={.48}/></mesh>{rows.map(v=><mesh key={v} position={[0,v,.07]}><boxGeometry args={[5.5,.04,.02]}/><meshBasicMaterial color='#d2ba87'/></mesh>)}{[-2.7,0,2.7].map(v=><mesh key={v} position={[v,0,.08]}><boxGeometry args={[.055,15,.025]}/><meshBasicMaterial color='#c8c4ac'/></mesh>)}</group>;
}
export function TeachingStation(){
  return <group><Cylinder position={[0,0,-6]} radius={1.7} length={10}/><Cylinder position={[0,0,-1.4]} radius={1.15} length={2}/><Cylinder position={[0,0,-12]} radius={2} length={3}/>
    <Cylinder position={[-4,0,-6]} radius={1.3} length={7} rotation={[0,0,Math.PI/2]}/><Cylinder position={[4,0,-6]} radius={1.3} length={7} rotation={[0,0,Math.PI/2]}/>
    <Cylinder position={[0,0,-21]} radius={1.35} length={14}/>
    <mesh position={[0,-.7,-16]}><boxGeometry args={[86,1.3,1.5]}/><meshStandardMaterial color='#b8bdba' wireframe/></mesh>
    {[-36,-25,25,36].flatMap(x=>[-8.8,8.8].map(y=><Panel key={`${x}-${y}`} x={x} y={y}/>))}
    {[-10,10].map(x=><group key={x} position={[x,3,-14]} rotation={[.3,0,.15]}><mesh><boxGeometry args={[8,5,.15]}/><meshStandardMaterial color='#e4e6e2' roughness={.6}/></mesh>{[-2,-1,0,1,2].map(y=><mesh key={y} position={[0,y,.12]}><boxGeometry args={[8,.06,.02]}/><meshStandardMaterial color='#747c7f'/></mesh>)}</group>)}
  </group>;
}
function Port(){return <group><mesh rotation={[0,0,Math.PI/8]}><torusGeometry args={[.67,.13,12,8]}/><meshStandardMaterial color='#dce1df' metalness={.8} roughness={.3}/></mesh><mesh position={[0,0,-.15]}><circleGeometry args={[.55,32]}/><meshStandardMaterial color='#11191c'/></mesh><Line points={[[-.27,0,.015],[.27,0,.015]]} color='#b5f97b' lineWidth={2}/><Line points={[[0,-.27,.015],[0,.27,.015]]} color='#b5f97b' lineWidth={2}/>{[0,1,2,3].map(i=><mesh key={i} position={[Math.cos(i*Math.PI/2)*.92,Math.sin(i*Math.PI/2)*.92,.05]}><sphereGeometry args={[.05,8,8]}/><meshBasicMaterial color='#b5f97b'/></mesh>)}</group>;}
function createFlaredBellGeometry(
  rThroat: number,
  rPlume: number,
  length: number,
  radialSegments = 24,
  heightSegments = 12
): BufferGeometry {
  const geom = new CylinderGeometry(1, 1, length, radialSegments, heightSegments, true);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // 归一化高度 t 从 0 (喷管出口) 到 1 (太空深处)
    const t = (y + length * 0.5) / length;
    // 真空超音速膨胀抛物线半径
    const r = rThroat + (rPlume - rThroat) * Math.pow(Math.max(0, Math.min(1, t)), 0.65);
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const curR = Math.hypot(x, z);
    if (curR > 1e-5) {
      pos.setX(i, (x / curR) * r);
      pos.setZ(i, (z / curR) * r);
    }
    // 把喷射原点对齐到 y = 0
    pos.setY(i, y + length * 0.5);
  }
  geom.computeVertexNormals();
  return geom;
}

function createCrossCoreGeometry(width: number, length: number): BufferGeometry {
  const geom = new BufferGeometry();
  const w = width * 0.5;
  // 十字交叉双面片 (全视角立体无中空，消除多边形轮廓破绽)
  const vertices = new Float32Array([
    // 面片 1 (XY 平面)
    -w, 0, 0,
     w, 0, 0,
     w, length, 0,
    -w, 0, 0,
     w, length, 0,
    -w, length, 0,

    // 面片 2 (ZY 平面)
    0, 0, -w,
    0, 0,  w,
    0, length,  w,
    0, 0, -w,
    0, length,  w,
    0, length, -w,
  ]);

  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1,
  ]);

  geom.setAttribute('position', new BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  return geom;
}

// 抛物线真空等离子羽流着色器: 两端平滑淡出至太空，流体高速向外喷射
const bellVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const bellFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uCoreColor;
  uniform vec3 uPlumeColor;
  uniform float uMachIntensity;
  uniform float uOpacityBase;

  void main() {
    float dist = vUv.y;
    // 轴向平滑衰减，无任何硬几何截面，柔和消散于太空
    float fade = pow(1.0 - dist, 2.0);
    if (fade <= 0.001) discard;

    // 超音速向外喷射流动波纹 (细密高速流动纹理，不产生整段明暗闪烁)
    float flow = sin(dist * 22.0 - uTime * 24.0) * 0.05 + cos(dist * 44.0 - uTime * 42.0) * 0.03;
    float turb = 0.96 + flow;

    // 驻波激波节 (Mach Diamonds: 空间驻波，位置固定，不随时间闪烁抖动)
    float shockWave = sin(dist * 30.0);
    float shock = exp(-dist * 5.0) * pow(max(0.0, shockWave), 4.0) * uMachIntensity;

    // 渐变色: 喷口白炽高温 -> 外层等离子羽流
    float coreMix = smoothstep(0.03, 0.45, dist);
    vec3 col = mix(uCoreColor, uPlumeColor, coreMix);
    col += uCoreColor * shock * 0.85;

    float alpha = fade * turb * (uOpacityBase + shock * 0.35);
    gl_FragColor = vec4(col, alpha);
  }
`;

// 十字核心高能射流着色器: 轴向与横向全柔和渐变，带强激波节
const crossVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const crossFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uCoreColor;
  uniform vec3 uPlumeColor;
  uniform float uMachIntensity;

  void main() {
    float dist = vUv.y;
    float axialFade = pow(1.0 - dist, 1.7);
    if (axialFade <= 0.001) discard;

    // 横向柔和轮廓，两翼完全透明，中心极亮
    float radialFade = pow(sin(vUv.x * 3.14159265), 1.4);

    // 超音速喷射细致波纹 (细微纹理流动，不闪烁)
    float flow = sin(dist * 28.0 - uTime * 28.0) * 0.05 + cos(dist * 56.0 - uTime * 48.0) * 0.03;
    float turb = 0.95 + flow;

    // 核心激波节 (固定空间驻波，不随时间跳动)
    float shock = exp(-dist * 4.2) * pow(max(0.0, sin(dist * 30.0)), 4.0) * uMachIntensity;

    vec3 col = mix(uCoreColor, uPlumeColor, smoothstep(0.02, 0.6, dist));
    col += uCoreColor * shock * 1.2;

    float alpha = axialFade * radialFade * turb * (0.78 + shock * 0.45);
    gl_FragColor = vec4(col, alpha);
  }
`;

function RealisticPlume({
  bellGeo,
  crossGeo,
  bellMat,
  crossMat,
  rThroat = 0.05,
}: {
  bellGeo: BufferGeometry;
  crossGeo: BufferGeometry;
  bellMat: ShaderMaterial;
  crossMat: ShaderMaterial;
  rThroat?: number;
}) {
  return (
    <group>
      {/* 喷喉白炽发光核 (消除与金属喷口的断层) */}
      <mesh position={[0, 0.015, 0]}>
        <sphereGeometry args={[rThroat * 0.95, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.96} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      {/* 超音速核心十字射流 (立体饱满无空心，带明亮激波节) */}
      <mesh geometry={crossGeo} material={crossMat} />
      {/* 抛物线真空等离子膨胀钟面 (柔和外层等离子辉光，两端平滑淡出，无硬边界) */}
      <mesh geometry={bellGeo} material={bellMat} />
    </group>
  );
}

function Thrusters() {
  const aftRef = useRef<Group>(null);
  const fwdRef = useRef<Group>(null);
  const fwdTopRef = useRef<Group>(null);
  const fwdBtmRef = useRef<Group>(null);
  const fwdRgtRef = useRef<Group>(null);
  const fwdLftRef = useRef<Group>(null);
  const aftTopRef = useRef<Group>(null);
  const aftBtmRef = useRef<Group>(null);
  const aftRgtRef = useRef<Group>(null);
  const aftLftRef = useRef<Group>(null);
  const rollCcwRef = useRef<Group>(null);
  const rollCwRef = useRef<Group>(null);

  const sharedTime = useRef({ value: 0 });

  // 几何体缓存 (抛物线真空钟面与十字超音速核心)
  const geometries = useMemo(() => {
    return {
      aftBell: createFlaredBellGeometry(0.09, 0.40, 1.7),
      aftCross: createCrossCoreGeometry(0.18, 1.3),
      rcsBell: createFlaredBellGeometry(0.042, 0.22, 0.85),
      rcsCross: createCrossCoreGeometry(0.08, 0.62),
      rollBell: createFlaredBellGeometry(0.038, 0.18, 0.70),
      rollCross: createCrossCoreGeometry(0.07, 0.50),
    };
  }, []);

  // 材质缓存 (主发动机高温白炽等离子 vs 姿控喷管纯白/天蓝气体羽流)
  const materials = useMemo(() => {
    return {
      aftBell: new ShaderMaterial({
        vertexShader: bellVertexShader,
        fragmentShader: bellFragmentShader,
        uniforms: {
          uTime: sharedTime.current,
          uCoreColor: { value: new Color('#fffaf0') },
          uPlumeColor: { value: new Color('#38bdf8') },
          uMachIntensity: { value: 0.85 },
          uOpacityBase: { value: 0.42 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
      aftCross: new ShaderMaterial({
        vertexShader: crossVertexShader,
        fragmentShader: crossFragmentShader,
        uniforms: {
          uTime: sharedTime.current,
          uCoreColor: { value: new Color('#ffffff') },
          uPlumeColor: { value: new Color('#60a5fa') },
          uMachIntensity: { value: 1.1 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
      rcsBell: new ShaderMaterial({
        vertexShader: bellVertexShader,
        fragmentShader: bellFragmentShader,
        uniforms: {
          uTime: sharedTime.current,
          uCoreColor: { value: new Color('#ffffff') },
          uPlumeColor: { value: new Color('#38bdf8') },
          uMachIntensity: { value: 0.55 },
          uOpacityBase: { value: 0.36 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
      rcsCross: new ShaderMaterial({
        vertexShader: crossVertexShader,
        fragmentShader: crossFragmentShader,
        uniforms: {
          uTime: sharedTime.current,
          uCoreColor: { value: new Color('#ffffff') },
          uPlumeColor: { value: new Color('#93c5fd') },
          uMachIntensity: { value: 0.75 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    };
  }, []);

  // 保持平滑状态，避免帧间跳变与频闪抖动
  const smoothT = useRef({
    aft: 0,
    fwd: 0,
    fwdTop: 0,
    fwdBtm: 0,
    fwdRgt: 0,
    fwdLft: 0,
    aftTop: 0,
    aftBtm: 0,
    aftRgt: 0,
    aftLft: 0,
    rollCcw: 0,
    rollCw: 0,
  });

  useFrame((_, dt) => {
    sharedTime.current.value += dt;

    const s = runtime.state;
    const q = new Quaternion(...s.orientation);
    const bodyThrust = new Vector3(...s.thrust).applyQuaternion(q.clone().invert());
    const bx = bodyThrust.x, by = bodyThrust.y, bz = bodyThrust.z;
    const tx = s.torque[0], ty = s.torque[1], tz = s.torque[2];

    // 平滑滤波器系数 (保证 ~40ms 极快响应，同时彻底消除帧间剧烈跳闪和频闪走样)
    const lerpFactor = Math.min(1, Math.max(0.18, dt * 25));

    const updateSmooth = (key: keyof typeof smoothT.current, target: number) => {
      // 设置清晰的启动死区 (0.05)，低于死区归零，防止微弱漂移数值引起反复开关闪烁
      const cleanTarget = target > 0.05 ? Math.min(1, target) : 0;
      smoothT.current[key] += (cleanTarget - smoothT.current[key]) * lerpFactor;
      if (cleanTarget === 0 && smoothT.current[key] < 0.015) {
        smoothT.current[key] = 0;
      }
      return smoothT.current[key];
    };

    const setT = (group: Group | null, key: keyof typeof smoothT.current, target: number) => {
      if (!group) return;
      const t = updateSmooth(key, target);
      const active = t > 0.02;
      group.visible = active;
      if (active) {
        // 稳定的几何缩放，彻底删除会导致高频抖动跳闪的 Math.sin(now * 55)
        const sc = Math.min(1.2, 0.45 + 0.55 * t);
        if (group.position.lengthSq() === 0) {
          // 多喷口容器组位于原点 [0,0,0]，必须对每个子喷口自身局部缩放，避免把喷口位置坐标 [x,y,z] 缩进船体内部
          for (const child of group.children) {
            child.scale.set(sc, sc, sc);
          }
        } else {
          group.scale.set(sc, sc, sc);
        }
      }
    };

    // 1. 轴向推力 (前后平移与制动):
    setT(aftRef.current, 'aft', Math.max(0, -bz));
    setT(fwdRef.current, 'fwd', Math.max(0, bz));

    // 2. 俯仰与上下平移 (前舱与后舱反作用力偶):
    setT(fwdTopRef.current, 'fwdTop', Math.max(0, -by * 0.7 - tx * 0.8));
    setT(fwdBtmRef.current, 'fwdBtm', Math.max(0, by * 0.7 + tx * 0.8));
    setT(aftTopRef.current, 'aftTop', Math.max(0, -by * 0.7 + tx * 0.8));
    setT(aftBtmRef.current, 'aftBtm', Math.max(0, by * 0.7 - tx * 0.8));

    // 3. 偏航与左右平移 (前舱与后舱反作用力偶):
    setT(fwdRgtRef.current, 'fwdRgt', Math.max(0, -bx * 0.7 - ty * 0.8));
    setT(fwdLftRef.current, 'fwdLft', Math.max(0, bx * 0.7 + ty * 0.8));
    setT(aftRgtRef.current, 'aftRgt', Math.max(0, -bx * 0.7 + ty * 0.8));
    setT(aftLftRef.current, 'aftLft', Math.max(0, bx * 0.7 - ty * 0.8));

    // 4. 滚转切向喷射 (沿圆周方向形成纯力偶矩):
    setT(rollCcwRef.current, 'rollCcw', Math.max(0, tz));
    setT(rollCwRef.current, 'rollCw', Math.max(0, -tz));
  });

  const aftNozzles: [number, number][] = [[-0.52, -0.52], [0.52, -0.52], [-0.52, 0.52], [0.52, 0.52]];

  return (
    <group>
      {/* 尾部主推进器实体喷管钟罩 (安装在 dragon.glb 尾舱端面 z=4.475 处) */}
      {aftNozzles.map(([x, y], i) => (
        <mesh key={`nozzle-${i}`} position={[x, y, 4.46]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.08, 0.14, 16]} />
          <meshStandardMaterial color="#2b3138" metalness={0.75} roughness={0.35} />
        </mesh>
      ))}

      {/* 1. 尾部主推进发动机羽流 (4台，位于尾舱端面 z=4.50 喷管出口向后喷射) */}
      <group ref={aftRef} visible={false}>
        {aftNozzles.map(([x, y], i) => (
          <group key={i} position={[x, y, 4.50]} rotation={[Math.PI / 2, 0, 0]}>
            <RealisticPlume
              bellGeo={geometries.aftBell}
              crossGeo={geometries.aftCross}
              bellMat={materials.aftBell}
              crossMat={materials.aftCross}
              rThroat={0.09}
            />
          </group>
        ))}
      </group>

      {/* 2. 前向制动反推羽流 (贴合 dragon.glb 前锥舱外壁 z=0.76，外倾角 16° 向斜前方喷射) */}
      <group ref={fwdRef} visible={false}>
        <group position={[0, 1.15, 0.76]} rotation={[-Math.PI / 2 + 0.28, 0, 0]}>
          <RealisticPlume
            bellGeo={geometries.rcsBell}
            crossGeo={geometries.rcsCross}
            bellMat={materials.rcsBell}
            crossMat={materials.rcsCross}
            rThroat={0.04}
          />
        </group>
        <group position={[0, -1.13, 0.76]} rotation={[-Math.PI / 2 - 0.28, 0, 0]}>
          <RealisticPlume
            bellGeo={geometries.rcsBell}
            crossGeo={geometries.rcsCross}
            bellMat={materials.rcsBell}
            crossMat={materials.rcsCross}
            rThroat={0.04}
          />
        </group>
        <group position={[1.15, 0, 0.76]} rotation={[-Math.PI / 2, 0, -0.28]}>
          <RealisticPlume
            bellGeo={geometries.rcsBell}
            crossGeo={geometries.rcsCross}
            bellMat={materials.rcsBell}
            crossMat={materials.rcsCross}
            rThroat={0.04}
          />
        </group>
        <group position={[-1.19, 0, 0.76]} rotation={[-Math.PI / 2, 0, 0.28]}>
          <RealisticPlume
            bellGeo={geometries.rcsBell}
            crossGeo={geometries.rcsCross}
            bellMat={materials.rcsBell}
            crossMat={materials.rcsCross}
            rThroat={0.04}
          />
        </group>
      </group>

      {/* 3. 前部姿控羽流 (贴合前舱外壁 z=0.82) */}
      <group ref={fwdTopRef} visible={false} position={[0, 1.16, 0.82]} rotation={[0, 0, 0]}>
        <RealisticPlume
          bellGeo={geometries.rcsBell}
          crossGeo={geometries.rcsCross}
          bellMat={materials.rcsBell}
          crossMat={materials.rcsCross}
          rThroat={0.04}
        />
      </group>
      <group ref={fwdBtmRef} visible={false} position={[0, -1.14, 0.82]} rotation={[Math.PI, 0, 0]}>
        <RealisticPlume
          bellGeo={geometries.rcsBell}
          crossGeo={geometries.rcsCross}
          bellMat={materials.rcsBell}
          crossMat={materials.rcsCross}
          rThroat={0.04}
        />
      </group>
      <group ref={fwdRgtRef} visible={false} position={[1.16, 0, 0.82]} rotation={[0, 0, -Math.PI / 2]}>
        <RealisticPlume
          bellGeo={geometries.rcsBell}
          crossGeo={geometries.rcsCross}
          bellMat={materials.rcsBell}
          crossMat={materials.rcsCross}
          rThroat={0.04}
        />
      </group>
      <group ref={fwdLftRef} visible={false} position={[-1.22, 0, 0.82]} rotation={[0, 0, Math.PI / 2]}>
        <RealisticPlume
          bellGeo={geometries.rcsBell}
          crossGeo={geometries.rcsCross}
          bellMat={materials.rcsBell}
          crossMat={materials.rcsCross}
          rThroat={0.04}
        />
      </group>

      {/* 4. 后部服务舱姿控羽流 (贴合服务舱外壁 z=2.45) */}
      <group ref={aftTopRef} visible={false} position={[0, 1.31, 2.45]} rotation={[0, 0, 0]}>
        <RealisticPlume
          bellGeo={geometries.rcsBell}
          crossGeo={geometries.rcsCross}
          bellMat={materials.rcsBell}
          crossMat={materials.rcsCross}
          rThroat={0.045}
        />
      </group>
      <group ref={aftBtmRef} visible={false} position={[0, -1.30, 2.45]} rotation={[Math.PI, 0, 0]}>
        <RealisticPlume
          bellGeo={geometries.rcsBell}
          crossGeo={geometries.rcsCross}
          bellMat={materials.rcsBell}
          crossMat={materials.rcsCross}
          rThroat={0.045}
        />
      </group>
      <group ref={aftRgtRef} visible={false} position={[1.24, 0, 2.45]} rotation={[0, 0, -Math.PI / 2]}>
        <RealisticPlume
          bellGeo={geometries.rcsBell}
          crossGeo={geometries.rcsCross}
          bellMat={materials.rcsBell}
          crossMat={materials.rcsCross}
          rThroat={0.045}
        />
      </group>
      <group ref={aftLftRef} visible={false} position={[-1.21, 0, 2.45]} rotation={[0, 0, Math.PI / 2]}>
        <RealisticPlume
          bellGeo={geometries.rcsBell}
          crossGeo={geometries.rcsCross}
          bellMat={materials.rcsBell}
          crossMat={materials.rcsCross}
          rThroat={0.045}
        />
      </group>

      {/* 5. 滚转切向姿控羽流 (沿筒体切向喷射产生纯力偶力矩) */}
      <group ref={rollCcwRef} visible={false}>
        <group position={[0, 1.31, 2.45]} rotation={[0, 0, -Math.PI / 2]}>
          <RealisticPlume
            bellGeo={geometries.rollBell}
            crossGeo={geometries.rollCross}
            bellMat={materials.rcsBell}
            crossMat={materials.rcsCross}
            rThroat={0.038}
          />
        </group>
        <group position={[0, -1.30, 2.45]} rotation={[0, 0, Math.PI / 2]}>
          <RealisticPlume
            bellGeo={geometries.rollBell}
            crossGeo={geometries.rollCross}
            bellMat={materials.rcsBell}
            crossMat={materials.rcsCross}
            rThroat={0.038}
          />
        </group>
      </group>
      <group ref={rollCwRef} visible={false}>
        <group position={[0, 1.31, 2.45]} rotation={[0, 0, Math.PI / 2]}>
          <RealisticPlume
            bellGeo={geometries.rollBell}
            crossGeo={geometries.rollCross}
            bellMat={materials.rcsBell}
            crossMat={materials.rcsCross}
            rThroat={0.038}
          />
        </group>
        <group position={[0, -1.30, 2.45]} rotation={[0, 0, -Math.PI / 2]}>
          <RealisticPlume
            bellGeo={geometries.rollBell}
            crossGeo={geometries.rollCross}
            bellMat={materials.rcsBell}
            crossMat={materials.rcsCross}
            rThroat={0.038}
          />
        </group>
      </group>
    </group>
  );
}

function DragonModel({ hatchProgress }: { hatchProgress: number }) {
  const { scene } = useGLTF('/models/dragon.glb');
  const clone = useMemo(() => scene.clone(true), [scene]);
  const hingeRef = useRef<Object3D | null>(null);

  useEffect(() => {
    (window as any).__dragonLoaded = true;
    clone.traverse(obj => {
      if (obj.name === 'Hinge') {
        hingeRef.current = obj;
        (window as any).__hinge = obj;
      }
    });
  }, [clone]);

  useFrame(() => {
    if (hingeRef.current) {
      // closed (progress = 0) -> rotation.x = -90.0 deg (-Math.PI / 2)
      // open (progress = 1) -> rotation.x = 0 rad
      hingeRef.current.rotation.x = (1 - hatchProgress) * (-Math.PI / 2);
      (window as any).__hingeRotX = hingeRef.current.rotation.x;
      (window as any).__hatchProgress = hatchProgress;
    }
  });

  return (
    <primitive
      object={clone}
      scale={1.0}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

useGLTF.preload('/models/dragon.glb');

function Ship() {
  const ref = useRef<Group>(null);
  const capture = useRef(0);
  const camera = useSession(s => s.camera);
  const hatch = useSession(s => s.hatch);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const s = runtime.state;
    g.position.set(...s.position);
    g.quaternion.set(...s.orientation);
    (window as any).__shipGroup = g;
    if (s.status === 'success' && (useSession.getState().config.id === 4 || s.position[2] <= 0.4)) {
      capture.current = Math.min(1, capture.current + dt * 0.65);
      g.position.z = 0.35 * (1 - capture.current);
      g.quaternion.slerp(new Quaternion(), capture.current);
    } else {
      capture.current = 0;
    }
  });

  return (
    <group ref={ref} visible={camera !== 'pilot'}>
      <Suspense fallback={null}>
        <DragonModel hatchProgress={hatch?.progress ?? 0} />
      </Suspense>
      <Thrusters />
    </group>
  );
}
function VelocityVector(){
  const ref=useRef<ArrowHelper>(null);const guidance=useSession(s=>s.guidance);
  useFrame(()=>{if(!ref.current)return;const v=new Vector3(...runtime.state.velocity),speed=v.length();ref.current.visible=guidance&&speed>.005;ref.current.position.set(...runtime.state.position).add(new Vector3(0,1.9,1));if(speed>.005){ref.current.setDirection(v.divideScalar(speed));ref.current.setLength(Math.min(6,1+speed*4),.35,.18);}});
  return <arrowHelper ref={ref} args={[new Vector3(0,0,-1),new Vector3(),2,'#72d5e5']}/>;
}
function Guidance(){const enabled=useSession(s=>s.guidance),c=useSession(s=>s.config);const points=useMemo(()=>Array.from({length:65},(_,i)=>[Math.cos(i/64*Math.PI*2)*2,Math.sin(i/64*Math.PI*2)*2,0] as [number,number,number]),[]);if(!enabled)return null;return <group>{[4,8,14,22,34,48].map(z=><group key={z} position={[0,0,z]}><Line points={points} color='#8fbb78' transparent opacity={.16} lineWidth={1}/></group>)}<Line points={[[0,0,0],[0,0,52]]} color='#b3f56b' transparent opacity={.25} dashed dashSize={.25} gapSize={.4}/>{c.id===1&&<group position={[0,0,8]}><Line points={points} color='#b3f56b' lineWidth={2}/></group>}</group>;}
import { decayCameraShake, triggerCameraShake } from './sim/effects';
export { triggerCameraShake };

function SceneCamera(){
  const view=useSession(s=>s.camera),c=useSession(s=>s.config);
  const initialPosition:[number,number,number]=view==='side'?[28,3,c.position[2]/2]:[c.position[0]+6.5,c.position[1]+3.5,c.position[2]+7.5];
  const initialTarget:[number,number,number]=view==='side'?[...runtime.state.position]:[c.position[0],c.position[1],c.position[2]-0.5];
  return (
    <TaskCameraControls
      enabled={view!=='pilot'}
      resetKey={`${view}-${c.id}`}
      initialPosition={initialPosition}
      initialTarget={initialTarget}
      followTarget={()=>[runtime.state.position[0],runtime.state.position[1],runtime.state.position[2]-0.5]}
      minDistance={2.5}
      maxDistance={180}
      maxPolarAngle={Math.PI*.9}
      onFrame={(camera)=>{
        const s=runtime.state;
        if(view==='pilot'){
          const q=new Quaternion(...s.orientation);
          camera.position.copy(new Vector3(0,0,0).applyQuaternion(q).add(new Vector3(...s.position)));
          camera.up.copy(new Vector3(0,1,0).applyQuaternion(q));
          camera.lookAt(new Vector3(0,0,-10).applyQuaternion(q).add(camera.position));
        }
        const shake=decayCameraShake();
        if(shake>0.005){
          camera.position.x+=(Math.random()-0.5)*shake*0.55;
          camera.position.y+=(Math.random()-0.5)*shake*0.55;
          camera.position.z+=(Math.random()-0.5)*shake*0.55;
        }
      }}
    />
  );
}
function NASAStation(){
  const {scene}=useGLTF('/models/iss.glb');const quality=useSession(s=>s.quality);
  const model=useMemo(()=>{const copy=scene.clone(true);copy.traverse(obj=>{if(quality==='low'&&/DEXTRE|Robotic_Arm|RapidScat|CATS|ECOStress|OCO3/.test(obj.name))obj.visible=false;if(obj instanceof Mesh){obj.castShadow=false;obj.receiveShadow=false;}});return copy;},[scene,quality]);
  // PMA-2 front rim was measured from the source vertices at world
  // [0, -0.7347664, 21.0053501] m. Add an 0.8 m teaching adapter in front.
  return <><primitive object={model} position={[0,.7347664,-21.8053501]}/><Cylinder position={[0,0,-.4]} radius={.72} length={.8} color="#9ea8a7"/></>;
}

// 星空严格分布在地平线以上（空间站 420 km 处地平线位于水平线下方 20.26°，即 y ≈ -0.346）。
// 地平线以下全为地球实体，不放置背景星星，彻底消除透光与深度冲突。
function StarField(){const geometry=useMemo(()=>{const n=2400,pos=new Float32Array(n*3),col=new Float32Array(n*3);let seed=20260918;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;for(let i=0;i<n;i++){const u=-.33+1.33*rnd(),a=rnd()*Math.PI*2,s=Math.sqrt(Math.max(0,1-u*u)),r=1.5e7;pos.set([s*Math.cos(a)*r,u*r,s*Math.sin(a)*r],i*3);const b=.35+.65*rnd()**2.5;col.set([b,b,b],i*3);}const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(pos,3));g.setAttribute('color',new BufferAttribute(col,3));return g;},[]);return <points geometry={geometry} frustumCulled={false}><pointsMaterial size={1.5} sizeAttenuation={false} vertexColors depthWrite={false}/></points>;}
function World(){return <><color attach="background" args={['#090e13']}/><ambientLight intensity={.65}/><directionalLight position={[30,30,35]} intensity={3.2} color='#fff3de'/><directionalLight position={[-40,-20,10]} intensity={1.2} color='#80a8d2'/><StarField/><Suspense fallback={<TeachingStation/>}><NASAStation/></Suspense><Port/><Ship/><VelocityVector/><Guidance/><SceneCamera/><Suspense fallback={null}><Earth/></Suspense></>;}
class SceneBoundary extends Component<{children:ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<div className="scene-fallback">3D unavailable / 3D 暂不可用。请启用 WebGL 2 或换用支持的浏览器。</div>:this.props.children;}}
export default function Scene(){const quality=useSession(s=>s.quality);return <SceneBoundary><Canvas dpr={quality==='low'?1:[1,1.75]} camera={{position:[6.5,3.5,25.5],fov:48,near:.1,far:3e7}} gl={{antialias:quality==='high',powerPreference:'high-performance',logarithmicDepthBuffer:true}} fallback={<div className="scene-fallback">This device needs WebGL 2 / 此设备需要支持 WebGL 2。</div>}><Suspense fallback={null}><World/></Suspense></Canvas></SceneBoundary>;}
