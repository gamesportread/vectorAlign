import { Component, Suspense, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls, useGLTF } from '@react-three/drei';
import { ArrowHelper, BufferAttribute, BufferGeometry, Group, Mesh, Quaternion, Vector3 } from 'three';
import { runtime, useSession } from './store';
import { Earth } from './components/scene/Earth';

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
function Ship(){const ref=useRef<Group>(null);const capture=useRef(0);const camera=useSession(s=>s.camera);useFrame((_,dt)=>{const g=ref.current;if(!g)return;const s=runtime.state;g.position.set(...s.position);g.quaternion.set(...s.orientation);if(s.status==='success'&&useSession.getState().config.id===4){capture.current=Math.min(1,capture.current+dt*.65);g.position.z=.35*(1-capture.current);g.quaternion.slerp(new Quaternion(),capture.current);}else capture.current=0;});return <group ref={ref} visible={camera!=='pilot'}>
  <mesh position={[0,0,1.1]} rotation={[-Math.PI/2,0,0]}><cylinderGeometry args={[.53,1.4,2.2,32]}/><meshStandardMaterial color='#dfe6e7' roughness={.43} metalness={.35}/></mesh>
  <Cylinder position={[0,0,2.6]} radius={1.4} length={.9} color='#717d87'/><Cylinder position={[0,0,.05]} radius={.52} length={.15} color='#8b979b'/>
  {[-1,1].map(x=><mesh key={x} position={[x*.5,.77,1.2]} rotation={[Math.PI/2,.1,0]}><boxGeometry args={[.35,.45,.02]}/><meshStandardMaterial color='#172c3a' metalness={.8} roughness={.16}/></mesh>)}
  <Thrusters/>
  </group>;}
function Thrusters(){
  const ref=useRef<Group>(null);
  useFrame(()=>{if(!ref.current)return;const s=runtime.state;const thrust=new Vector3(...s.thrust);const strength=thrust.length();ref.current.visible=strength>.02;if(strength>.02){const exhaust=thrust.normalize().negate().applyQuaternion(new Quaternion(...s.orientation).invert());ref.current.position.copy(new Vector3(0,0,1.3).addScaledVector(exhaust,1.4));ref.current.quaternion.setFromUnitVectors(new Vector3(0,1,0),exhaust);ref.current.scale.set(1,Math.min(1,strength),1);}});
  return <group ref={ref}><mesh position={[0,.8,0]}><coneGeometry args={[.12,1.6,10]}/><meshBasicMaterial color="#95d7f5" transparent opacity={.65}/></mesh></group>;
}
function VelocityVector(){
  const ref=useRef<ArrowHelper>(null);const guidance=useSession(s=>s.guidance);
  useFrame(()=>{if(!ref.current)return;const v=new Vector3(...runtime.state.velocity),speed=v.length();ref.current.visible=guidance&&speed>.005;ref.current.position.set(...runtime.state.position).add(new Vector3(0,1.9,1));if(speed>.005){ref.current.setDirection(v.divideScalar(speed));ref.current.setLength(Math.min(6,1+speed*4),.35,.18);}});
  return <arrowHelper ref={ref} args={[new Vector3(0,0,-1),new Vector3(),2,'#72d5e5']}/>;
}
function Guidance(){const enabled=useSession(s=>s.guidance),c=useSession(s=>s.config);const points=useMemo(()=>Array.from({length:65},(_,i)=>[Math.cos(i/64*Math.PI*2)*2,Math.sin(i/64*Math.PI*2)*2,0] as [number,number,number]),[]);if(!enabled)return null;return <group>{[4,8,14,22,34,48].map(z=><group key={z} position={[0,0,z]}><Line points={points} color='#8fbb78' transparent opacity={.16} lineWidth={1}/></group>)}<Line points={[[0,0,0],[0,0,52]]} color='#b3f56b' transparent opacity={.25} dashed dashSize={.25} gapSize={.4}/>{c.id===1&&<group position={[0,0,8]}><Line points={points} color='#b3f56b' lineWidth={2}/></group>}</group>;}
import { decayCameraShake, triggerCameraShake } from './sim/effects';
export { triggerCameraShake };

function SceneCamera(){const {camera}=useThree();const view=useSession(s=>s.camera),c=useSession(s=>s.config);const last=useRef('');const controlsRef=useRef<any>(null);useFrame(()=>{const s=runtime.state;if(view==='pilot'){const q=new Quaternion(...s.orientation);camera.position.copy(new Vector3(.0,.3,.15).applyQuaternion(q).add(new Vector3(...s.position)));camera.up.copy(new Vector3(0,1,0).applyQuaternion(q));camera.lookAt(new Vector3(0,0,-10).applyQuaternion(q).add(camera.position));}else{if(controlsRef.current){controlsRef.current.target.lerp(new Vector3(...s.position),.05);}if(last.current!==`${view}-${c.id}`){camera.up.set(0,1,0);camera.position.set(...(view==='side'?[28,3,c.position[2]/2]:[26,19,48]) as [number,number,number]);if(controlsRef.current)controlsRef.current.target.set(...s.position);}}last.current=`${view}-${c.id}`;const shake=decayCameraShake();if(shake>0.005){camera.position.x+=(Math.random()-0.5)*shake*0.55;camera.position.y+=(Math.random()-0.5)*shake*0.55;camera.position.z+=(Math.random()-0.5)*shake*0.55;}});return view!=='pilot'?<OrbitControls ref={controlsRef} makeDefault target={[0,0,3]} minDistance={5} maxDistance={180} enablePan={false} maxPolarAngle={Math.PI*.9}/>:null;}
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
// 3D 画面里的小标签：告诉新手“这是什么”，点一下打开对应的讲解页。
function SceneLabel({position,text,tone,step}:{position:[number,number,number];text:string;tone?:string;step:number}){
  return <Html position={position} center zIndexRange={[1,0]}><button className={`scene-label ${tone??''}`} onClick={()=>useSession.getState().openIntro(step)}>{text}</button></Html>;
}
function SceneLabels(){
  const show=useSession(s=>s.labels),view=useSession(s=>s.camera),c=useSession(s=>s.config),lang=useSession(s=>s.language),guidance=useSession(s=>s.guidance),status=useSession(s=>s.flight.status);
  const running=useSession(s=>s.running);
  const ship=useRef<Group>(null);
  useFrame(()=>{ship.current?.position.set(...runtime.state.position);});
  const t=(zh:string,en:string)=>lang==='zh'?zh:en;
  if(!show||running||status!=='ready')return null;
  return <>
    <group ref={ship}>{view!=='pilot'&&<SceneLabel position={[0,-2.1,1.4]} text={t('你的飞船（尖头是舱门）','Your ship (pointy end is door)')} step={1}/>}</group>
    {view!=='pilot'&&<SceneLabel position={[0,1.7,0]} text={t('对接口（空间站的门）','Docking port (station door)')} step={0}/>}
    {c.id===1&&guidance&&<SceneLabel position={[0,2.6,8]} text={t('黄圈：8 米等待点','Yellow ring: 8 m hold point')} tone="ring" step={3}/>}
  </>;
}
function World(){return <><color attach="background" args={['#090e13']}/><ambientLight intensity={.65}/><directionalLight position={[30,30,35]} intensity={3.2} color='#fff3de'/><directionalLight position={[-40,-20,10]} intensity={1.2} color='#80a8d2'/><StarField/><Suspense fallback={<TeachingStation/>}><NASAStation/></Suspense><Port/><Ship/><VelocityVector/><Guidance/><SceneLabels/><SceneCamera/><Suspense fallback={null}><Earth/></Suspense></>;}
class SceneBoundary extends Component<{children:ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<div className="scene-fallback">3D unavailable / 3D 暂不可用。请启用 WebGL 2 或换用支持的浏览器。</div>:this.props.children;}}
export default function Scene(){const quality=useSession(s=>s.quality);return <SceneBoundary><Canvas dpr={quality==='low'?1:[1,1.75]} camera={{position:[26,19,48],fov:48,near:.1,far:3e7}} gl={{antialias:quality==='high',powerPreference:'high-performance',logarithmicDepthBuffer:true}} fallback={<div className="scene-fallback">This device needs WebGL 2 / 此设备需要支持 WebGL 2。</div>}><Suspense fallback={null}><World/></Suspense></Canvas></SceneBoundary>;}
