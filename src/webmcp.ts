import { runtime, useSession } from './store';
import { angleError, angularSpeed, lateralError, lateralSpeed } from './sim/engine';

interface ToolRegistry { registerTool: (tool:{name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown},options:{signal:AbortSignal})=>void|Promise<void> }
export function registerFlightTools(){
  const registry=(document as Document&{modelContext?:ToolRegistry}).modelContext;
  if(!registry?.registerTool)return ()=>{};
  const lifecycle=new AbortController();
  const valid=(input:unknown)=>{if(input===null||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object');};
  for(const tool of [
    {name:'read_docking_flight',description:'Read the current teaching flight, its constraints, motion, reserve and status without changing it.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input:unknown)=>{valid(input);const session=useSession.getState(),s=runtime.state;return {lesson:session.config.id,status:s.status,paused:!session.running,demo:session.demo,time:s.time,position:s.position,velocity:s.velocity,lateralOffset:lateralError(s),lateralSpeed:lateralSpeed(s),attitudeErrorDegrees:angleError(s),angularSpeedDegrees:angularSpeed(s),reserve:s.fuel,constraints:session.config.constraints[session.language]};}},
    {name:'pause_docking_flight',description:'Pause the current flight and clear all active thrust inputs, using the same action as the visible Pause control.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:(input:unknown)=>{valid(input);useSession.getState().pause();return {paused:true,time:runtime.state.time};}}
  ]){try{void Promise.resolve(registry.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Progressive enhancement. */}}
  return ()=>lifecycle.abort();
}
