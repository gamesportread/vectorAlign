import { create } from 'zustand';
import { createState, demonstration, DT, emptyCommand, FixedStepper, sample, step, angleError, lateralError } from './sim/engine';
import { getScenario } from './sim/scenarios';
import type { ControlCommand, FlightRecord, Language, ScenarioConfig, SimulationState } from './sim/types';
import { readSaved, writeSaved } from './storage';
import { triggerCameraShake } from './sim/effects';
const config=getScenario(1);
export const runtime = { state:createState(config), command:emptyCommand(), stepper:new FixedStepper(), record:null as FlightRecord|null, lastSample:0, lastWarning:0, lastBrake:false, tumbleTicks:0 };
interface Session {
  language:Language; config:ScenarioConfig; flight:SimulationState; running:boolean; demo:boolean; completed:number[];
  camera:'orbit'|'pilot'|'side'; mode:'translate'|'rotate'; guidance:boolean; quality:'low'|'high'; muted:boolean;
  panel:'none'|'brief'|'review'|'guide'|'free'|'intro'; latest?:FlightRecord; storageError:boolean; hydrated:boolean;
  introSeen:boolean; introStep:number; labels:boolean;
  select:(id:number,custom?:ScenarioConfig)=>void; start:(demo?:boolean)=>void; pause:()=>void; resume:()=>void; reset:()=>void;
  setLanguage:(language:Language)=>void; setMode:(mode:'translate'|'rotate')=>void; save:()=>void;
  openIntro:(step?:number)=>void; closeIntro:()=>void;
}
export function clearInput(){runtime.command=emptyCommand();}
export const useSession=create<Session>((set,get)=>({
  language:'zh',config,flight:runtime.state,running:false,demo:false,completed:[],camera:'orbit',mode:'translate',guidance:true,
  quality:typeof window!=='undefined' && window.matchMedia('(pointer: coarse)').matches?'low':'high',muted:true,panel:'none',storageError:false,hydrated:false,
  introSeen:false,introStep:0,labels:true,
  select:(id,custom)=>{const c=structuredClone(custom??getScenario(id));clearInput();runtime.state=createState(c);runtime.stepper.reset();runtime.record=null;runtime.tumbleTicks=0;set({config:c,flight:runtime.state,running:false,demo:false,panel:'none',mode:id===3?'rotate':'translate'});},
  start:(demo=false)=>{clearInput();runtime.state={...createState(get().config),status:'flying'};runtime.stepper.reset();runtime.lastSample=0;runtime.lastWarning=0;runtime.lastBrake=false;runtime.tumbleTicks=0;
    runtime.record={scenario:get().config.id,config:structuredClone(get().config),demo,samples:[sample(runtime.state)],events:[{time:0,type:'start'}],date:new Date().toISOString()};
    set({running:true,demo,panel:'none',flight:runtime.state});},
  pause:()=>{clearInput();runtime.stepper.reset();set({running:false,flight:runtime.state});},
  resume:()=>{if(runtime.state.status==='flying'){clearInput();runtime.stepper.reset();set({running:true,panel:'none'});}},
  reset:()=>get().select(get().config.id,get().config),
  setLanguage:language=>{set({language});document.documentElement.lang=language==='zh'?'zh-CN':'en';get().save();},
  setMode:mode=>{clearInput();set({mode});},
  save:()=>{const {completed,language,muted,quality,latest,introSeen}=get();void writeSaved({completed,language,muted,quality,latest,introSeen}).catch(()=>set({storageError:true}));},
  openIntro:(step=0)=>{get().pause();set({panel:'intro',introStep:step});},
  closeIntro:()=>{set({panel:'none',introSeen:true});get().save();}
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
export function advanceFrame(delta:number){
  const session=useSession.getState();if(!session.running)return;
  runtime.stepper.advance(delta,()=>{
    for(let k=0;k<(session.demo?4:1);k++) {
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
        } else if(runtime.state.reason==='overspeed'||runtime.state.reason==='drift'||runtime.state.reason==='alignment'){
          impactTone();
          triggerCameraShake(0.8);
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
  }
}
