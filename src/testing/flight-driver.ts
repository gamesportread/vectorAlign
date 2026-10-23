/** Headless driver over the same session actions and scheduler used by the UI.
 * Import in Vitest; no browser or WebGL context is needed. Mock storage only if
 * the host does not have IndexedDB. This file is not bundled into the application.
 */
import { advanceFrame, clearInput, runtime, useSession } from '../store';
import type { ControlCommand, ScenarioConfig } from '../sim/types';

export const flightDriver = {
  load(id:number,custom?:ScenarioConfig){
    if(!Number.isInteger(id)||id<1||id>4)throw new RangeError('Mission must be 1–4');
    useSession.getState().select(id,custom);
    return this.snapshot();
  },
  start(demo=false){useSession.getState().start(demo);return this.snapshot();},
  pause(){useSession.getState().pause();return this.snapshot();},
  resume(){useSession.getState().resume();return this.snapshot();},
  toggleHatch(){useSession.getState().toggleHatch();return this.snapshot();},
  openHatch(){useSession.getState().openHatch();return this.snapshot();},
  closeHatch(){useSession.getState().closeHatch();return this.snapshot();},
  control(command:ControlCommand){
    if(command.translation.length!==3||command.rotation.length!==3||[...command.translation,...command.rotation].some(n=>!Number.isFinite(n)||Math.abs(n)>1)||typeof command.brake!=='boolean')throw new RangeError('Control axes must be finite values in [-1, 1]');
    if(useSession.getState().running&&!useSession.getState().demo)runtime.command=structuredClone(command);
  },
  release(){clearInput();},
  advance(seconds:number,fps=60){
    if(!Number.isFinite(seconds)||seconds<0||seconds>3600||!Number.isInteger(fps)||fps<4||fps>240)throw new RangeError('Invalid simulated wall time or frame rate');
    const frames=Math.round(seconds*fps);for(let i=0;i<frames;i++)advanceFrame(1/fps);
    useSession.setState({flight:runtime.state});return this.snapshot();
  },
  snapshot(){const session=useSession.getState();return structuredClone({flight:runtime.state,command:runtime.command,config:session.config,running:session.running,demo:session.demo,completed:session.completed,panel:session.panel,record:runtime.record,latest:session.latest,hatch:session.hatch});},
  clearProfile(){useSession.getState().pause();useSession.setState({completed:[],latest:undefined,storageError:false,hatch:{state:'closed',progress:0}});this.load(1);}
};
