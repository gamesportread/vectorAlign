import { create } from 'zustand';
import { createState, demonstration, DT, emptyCommand, FixedStepper, sample, step, angleError, lateralError } from './sim/engine';
import { getScenario } from './sim/scenarios';
import type { ControlCommand, FlightRecord, HatchData, HatchState, Language, ScenarioConfig, SimulationState } from './sim/types';
import { readSaved, writeSaved } from './storage';
import { triggerCameraShake } from './sim/effects';
const config=getScenario(1);
export const runtime = { state:createState(config), command:emptyCommand(), stepper:new FixedStepper(), record:null as FlightRecord|null, lastSample:0, lastWarning:0, lastBrake:false, tumbleTicks:0 };
interface Session {
  language:Language; config:ScenarioConfig; flight:SimulationState; running:boolean; demo:boolean; completed:number[];
  camera:'orbit'|'pilot'|'side'; mode:'translate'|'rotate'; guidance:boolean; quality:'low'|'high'; muted:boolean;
  panel:'none'|'brief'|'review'|'guide'|'free'|'intro'; latest?:FlightRecord; storageError:boolean; hydrated:boolean;
  introSeen:boolean; introStep:number; labels:boolean;
  screen:'home'|'simulator';
  activeLevel:number;
  hatch:HatchData;
  openHatch:()=>void; closeHatch:()=>void; toggleHatch:()=>void;
  select:(id:number,custom?:ScenarioConfig)=>void; start:(demo?:boolean)=>void; pause:()=>void; resume:()=>void; reset:()=>void;
  setLanguage:(language:Language)=>void; setMode:(mode:'translate'|'rotate')=>void; save:()=>void;
  openIntro:(step?:number)=>void; closeIntro:()=>void;
  setScreen:(screen:'home'|'simulator')=>void;
  setActiveLevel:(level:number)=>void;
}
const commandListeners = new Set<() => void>();
export function subscribeCommand(listener: () => void) {
  commandListeners.add(listener);
  return () => { commandListeners.delete(listener); };
}
export function notifyCommand() {
  commandListeners.forEach((fn) => fn());
}
export function getCommand(): ControlCommand {
  return runtime.command;
}
export function clearInput(){
  runtime.command = emptyCommand();
  notifyCommand();
}
export const useSession=create<Session>((set,get)=>({
  language:'zh',config,flight:runtime.state,running:false,demo:false,completed:[],camera:'orbit',mode:'translate',guidance:true,
  quality:typeof window!=='undefined' && window.matchMedia('(pointer: coarse)').matches?'low':'high',muted:true,panel:'none',storageError:false,hydrated:false,
  introSeen:false,introStep:0,labels:false,
  screen:typeof window!=='undefined' && new URLSearchParams(window.location.search).get('screen')==='simulator'?'simulator':'home',
  activeLevel:typeof window!=='undefined' && new URLSearchParams(window.location.search).get('screen')==='simulator'?1:0,
  hatch:{state:'closed',progress:0},
  openHatch:()=>{
    const cur=get().hatch;
    if(cur.state==='open'||cur.state==='opening')return;
    hatchTone(true);
    const next:HatchData={state:'opening',progress:cur.progress};
    set({hatch:next});
    runtime.state.hatch=next;
  },
  closeHatch:()=>{
    const cur=get().hatch;
    if(cur.state==='closed'||cur.state==='closing')return;
    hatchTone(false);
    const next:HatchData={state:'closing',progress:cur.progress};
    set({hatch:next});
    runtime.state.hatch=next;
  },
  toggleHatch:()=>{
    const cur=get().hatch;
    if(cur.state==='closed'||cur.state==='closing'){
      get().openHatch();
    }else{
      get().closeHatch();
    }
  },
  select:(id,custom)=>{
    const c=structuredClone(custom??getScenario(id));clearInput();
    const newHatch:HatchData={state:'closed',progress:0};
    runtime.state={...createState(c),hatch:newHatch};
    runtime.stepper.reset();runtime.record=null;runtime.tumbleTicks=0;
    set({config:c,flight:runtime.state,running:false,demo:false,panel:'none',mode:id===3?'rotate':'translate',activeLevel:id,hatch:newHatch});
  },
  setActiveLevel:level=>{get().pause();set({activeLevel:level});},
  start:(demo=false)=>{
    clearInput();
    const newHatch=get().hatch;
    runtime.state={...createState(get().config),status:'flying',hatch:newHatch};
    runtime.stepper.reset();runtime.lastSample=0;runtime.lastWarning=0;runtime.lastBrake=false;runtime.tumbleTicks=0;
    runtime.record={scenario:get().config.id,config:structuredClone(get().config),demo,samples:[sample(runtime.state)],events:[{time:0,type:'start'}],date:new Date().toISOString()};
    set({running:true,demo,panel:'none',flight:runtime.state});
  },
  pause:()=>{clearInput();runtime.stepper.reset();set({running:false,flight:runtime.state});},
  resume:()=>{if(runtime.state.status==='flying'){clearInput();runtime.stepper.reset();set({running:true,panel:'none'});}},
  reset:()=>get().select(get().config.id,get().config),
  setLanguage:language=>{set({language});document.documentElement.lang=language==='zh'?'zh-CN':'en';get().save();},
  setMode:mode=>{clearInput();set({mode});},
  save:()=>{const {completed,language,muted,quality,latest,introSeen}=get();void writeSaved({completed,language,muted,quality,latest,introSeen}).catch(()=>set({storageError:true}));},
  openIntro:(step=0)=>{get().pause();set({panel:'intro',introStep:step});},
  closeIntro:()=>{set({panel:'none',introSeen:true});get().save();},
  setScreen:screen=>{get().pause();set({screen});}
}));
let initialized=false;
export async function hydrate(){if(initialized)return;initialized=true;try {const data=await readSaved();const completedList = data?.completed ?? [];if(data){useSession.setState({completed:completedList,language:data.language??'zh',quality:data.quality??'high',muted:data.muted??true,latest:data.latest,introSeen:data.introSeen??false});document.documentElement.lang=data.language==='en'?'en':'zh-CN';}else{useSession.setState({completed:[]});}}catch{useSession.setState({storageError:true});}
  useSession.setState({hydrated:true});}
let audioContext:AudioContext|undefined;
export function tone(success=true){if(useSession.getState().muted)return;try{audioContext??=new AudioContext();void audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.connect(g);g.connect(audioContext.destination);o.frequency.value=success?660:220;g.gain.setValueAtTime(.04,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.25);o.start();o.stop(audioContext.currentTime+.25);}catch{/* Audio is optional. */}}
export function lockTone(){if(useSession.getState().muted)return;try{audioContext??=new AudioContext();void audioContext.resume();const now=audioContext.currentTime;const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.setValueAtTime(180,now);o.frequency.exponentialRampToValueAtTime(110,now+.12);g.gain.setValueAtTime(.035,now);g.gain.exponentialRampToValueAtTime(.001,now+.12);o.connect(g);g.connect(audioContext.destination);o.start(now);o.stop(now+.12);}catch{/* Audio is optional. */}}
export function impactTone(){
  if(useSession.getState().muted)return;
  try{
    audioContext??=new AudioContext();
    void audioContext.resume();
    const now=audioContext.currentTime;
    const osc=audioContext.createOscillator(),g1=audioContext.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(150,now);osc.frequency.exponentialRampToValueAtTime(35,now+.35);
    g1.gain.setValueAtTime(.16,now);g1.gain.exponentialRampToValueAtTime(.001,now+.38);
    osc.connect(g1);g1.connect(audioContext.destination);osc.start(now);osc.stop(now+.38);
    const bufLen=Math.floor(audioContext.sampleRate*.2);const buf=audioContext.createBuffer(1,bufLen,audioContext.sampleRate);const data=buf.getChannelData(0);
    for(let i=0;i<bufLen;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(audioContext.sampleRate*.035));
    const noise=audioContext.createBufferSource();noise.buffer=buf;
    const filter=audioContext.createBiquadFilter();filter.type='bandpass';filter.frequency.setValueAtTime(520,now);filter.Q.setValueAtTime(3.5,now);
    const g2=audioContext.createGain();g2.gain.setValueAtTime(.12,now);g2.gain.exponentialRampToValueAtTime(.001,now+.2);
    noise.connect(filter);filter.connect(g2);g2.connect(audioContext.destination);noise.start(now);
  }catch{/* Audio is optional. */}
}
export function hatchTone(opening = true) {
  if (useSession.getState().muted) return;
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return;
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume();
    const now = audioContext.currentTime;

    // 1. 机械锁扣释放/咬合声 (Mechanical latch click)
    const clickOsc = audioContext.createOscillator();
    const clickGain = audioContext.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(opening ? 320 : 260, now);
    clickOsc.frequency.exponentialRampToValueAtTime(70, now + 0.05);
    clickGain.gain.setValueAtTime(0.06, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    clickOsc.connect(clickGain);
    clickGain.connect(audioContext.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.05);

    // 2. 液压伺服电机旋转机械嗡鸣 (Hydraulic servo motor hum)
    const motorOsc = audioContext.createOscillator();
    const motorFilter = audioContext.createBiquadFilter();
    const motorGain = audioContext.createGain();

    motorOsc.type = 'sawtooth';
    const startFreq = opening ? 110 : 145;
    const endFreq = opening ? 150 : 105;
    motorOsc.frequency.setValueAtTime(startFreq, now + 0.02);
    motorOsc.frequency.linearRampToValueAtTime(endFreq, now + 0.9);

    motorFilter.type = 'lowpass';
    motorFilter.frequency.setValueAtTime(280, now);
    motorFilter.frequency.linearRampToValueAtTime(420, now + 0.45);
    motorFilter.frequency.linearRampToValueAtTime(260, now + 0.9);

    motorGain.gain.setValueAtTime(0.001, now);
    motorGain.gain.linearRampToValueAtTime(0.045, now + 0.08);
    motorGain.gain.setValueAtTime(0.045, now + 0.65);
    motorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    motorOsc.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(audioContext.destination);

    motorOsc.start(now + 0.02);
    motorOsc.stop(now + 0.9);
  } catch {
    /* Audio is optional. */
  }
}
export function advanceFrame(delta:number){
  const session=useSession.getState();

  // 1. 平滑推进舱门开启/关闭状态与进度 (~2.0 秒完成开/闭)
  if(session.hatch.state === 'opening' || session.hatch.state === 'closing'){
    const opening = session.hatch.state === 'opening';
    const rate = 1 / 2.0;
    const nextProgress = opening
      ? Math.min(1, session.hatch.progress + delta * rate)
      : Math.max(0, session.hatch.progress - delta * rate);
    const nextState: HatchState = opening
      ? (nextProgress >= 1 ? 'open' : 'opening')
      : (nextProgress <= 0 ? 'closed' : 'closing');
    const updatedHatch: HatchData = { state: nextState, progress: nextProgress };
    if((opening && nextState === 'open') || (!opening && nextState === 'closed')){
      lockTone();
    }
    useSession.setState({ hatch: updatedHatch });
    runtime.state.hatch = updatedHatch;
  } else if(!runtime.state.hatch){
    runtime.state.hatch = session.hatch;
  }

  if(!session.running)return;

  // 2. 示范模式进场时自动开启舱门，以便完成入锁
  if(session.demo && session.config.id === 4 && runtime.state.position[2] < 35 && session.hatch.state === 'closed'){
    useSession.getState().openHatch();
  }

  runtime.stepper.advance(delta,()=>{
    for(let k=0;k<(session.demo?8:1);k++) {
      if(runtime.state.status==='failed'){
        runtime.tumbleTicks = (runtime.tumbleTicks ?? 0) + 1;
        if (runtime.tumbleTicks > 240) {
          // 4秒后逐渐缓和失控漂移速度，避免无限飞远
          runtime.state.velocity[0] *= 0.985;
          runtime.state.velocity[1] *= 0.985;
          runtime.state.velocity[2] *= 0.985;
          runtime.state.angularVelocity[0] *= 0.985;
          runtime.state.angularVelocity[1] *= 0.985;
          runtime.state.angularVelocity[2] *= 0.985;
        }
        runtime.state=step(runtime.state,emptyCommand(),session.config,DT);
        continue;
      }
      if(runtime.state.status!=='flying')break;
      const command=session.demo?demonstration(runtime.state,session.config):runtime.command;
      runtime.state=step(runtime.state,command,session.config,DT);
      const rec=runtime.record!;
      if(command.brake && !runtime.lastBrake)rec.events.push({time:runtime.state.time,type:'brake'});runtime.lastBrake=command.brake;
      if(runtime.state.time-runtime.lastSample>=.2){rec.samples.push(sample(runtime.state));runtime.lastSample=runtime.state.time;}
      if(runtime.state.time-runtime.lastWarning>8 && runtime.state.position[2]<5){
        const reason=Math.abs(runtime.state.velocity[2])>.15?'overspeed':lateralError(runtime.state)>.18?'drift':angleError(runtime.state)>2?'alignment':undefined;
        if(reason){rec.events.push({time:runtime.state.time,type:'warning',reason});runtime.lastWarning=runtime.state.time;}
      }
      if(runtime.state.status==='success'){
        // 对接必须开启舱门：在关卡4或对接口捕获区，舱门未完全打开视作无法建立硬捕获
        const isPortDocking = (session.config.id === 4 || runtime.state.position[2] <= 0.4) && session.config.id !== 1;
        if(isPortDocking && session.hatch.state !== 'open'){
          runtime.state.status = 'failed';
          runtime.state.reason = 'hatch_closed';
        }
      }
      // 关卡4进近至 < 1.5m 时舱门未开即时阻断
      if(session.config.id === 4 && runtime.state.position[2] < 1.5 && session.hatch.state === 'closed' && runtime.state.status === 'flying'){
        runtime.state.status = 'failed';
        runtime.state.reason = 'hatch_closed';
      }
      if(runtime.state.status==='success'){
        rec.result=structuredClone(runtime.state);rec.samples.push(sample(runtime.state));rec.events.push({time:runtime.state.time,type:'success'});
        const completed=!session.demo?[...new Set([...session.completed,session.config.id])]:session.completed;
        clearInput();useSession.setState({flight:runtime.state,running:false,panel:'review',latest:structuredClone(rec),completed});useSession.getState().save();tone(true);
      } else if(runtime.state.status==='failed'){
        rec.result=structuredClone(runtime.state);rec.samples.push(sample(runtime.state));rec.events.push({time:runtime.state.time,type:'failed',reason:runtime.state.reason});
        clearInput();
        useSession.setState({flight:runtime.state,latest:structuredClone(rec)});
        useSession.getState().save();
        if(runtime.state.reason==='collision'){
          impactTone();
          const speed = Math.hypot(...runtime.state.velocity);
          triggerCameraShake(Math.min(2.0, Math.max(0.2, speed * 1.5)));
        } else if(runtime.state.reason==='overspeed'||runtime.state.reason==='drift'||runtime.state.reason==='alignment'||runtime.state.reason==='hatch_closed'||runtime.state.reason==='hatch'){
          impactTone();
          triggerCameraShake(0.8);
          useSession.setState({running:false,panel:'review'});
        } else if(runtime.state.reason==='escape'){
          tone(false);
          // 超出边界失去动力：保持 running 让飞船在微重力中自然无动力漂浮，不立即强弹复盘弹窗
        } else {
          tone(false);
          useSession.setState({running:false,panel:'review'});
        }
      }
    }
  });
}
export function press(axis:'translation'|'rotation',index:number,value:number){
  const sess = useSession.getState();
  if (sess.running && !sess.demo && sess.flight.status === 'flying') {
    runtime.command[axis][index] = value;
    notifyCommand();
  }
}

if (typeof window !== 'undefined') {
  (window as any).__session = useSession;
  (window as any).__runtime = runtime;
}
