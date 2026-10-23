import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../storage',()=>({readSaved:vi.fn(async()=>undefined),writeSaved:vi.fn(async()=>{})}));
import { flightDriver as driver } from './flight-driver';
import { emptyCommand, demonstration, DT } from '../sim/engine';
import { useSession } from '../store';
import { writeSaved } from '../storage';
import { constraintFeedback } from '../sim/feedback';
import { scenarios } from '../sim/scenarios';

beforeEach(()=>{driver.clearProfile();vi.clearAllMocks();});
describe('public session actions through a headless driver',()=>{
  it('pauses time and clears thrust, then resumes without a jump',()=>{
    driver.start();const command=emptyCommand();command.translation[2]=1;driver.control(command);driver.advance(.5);const paused=driver.pause();expect(paused.command).toEqual(emptyCommand());expect(driver.advance(20).flight).toEqual(paused.flight);driver.resume();const resumed=driver.advance(.5);expect(resumed.flight.time).toBeCloseTo(1);expect(resumed.flight.velocity).toEqual(paused.flight.velocity);
  });
  it('switches control modes without retaining active input',()=>{
    driver.load(4);driver.start();driver.control({translation:[1,0,0],rotation:[0,0,1],brake:true});useSession.getState().setMode('rotate');expect(driver.snapshot().command).toEqual(emptyCommand());
  });
  it('reset and lesson change replace the record and initial state',()=>{
    driver.start();driver.advance(2);driver.load(3);const state=driver.snapshot();expect(state.flight.status).toBe('ready');expect(state.flight.time).toBe(0);expect(state.record).toBeNull();expect(state.running).toBe(false);expect(state.config.id).toBe(3);
  });
  it('records a completed demonstration without awarding independent progress',()=>{
    driver.load(4);driver.start(true);const state=driver.advance(200);expect(state.flight.status).toBe('success');expect(state.completed).toEqual([]);expect(state.panel).toBe('review');expect(state.record?.samples.length).toBeGreaterThan(10);expect(state.record?.events.at(-1)?.type).toBe('success');expect(writeSaved).toHaveBeenCalled();
  });
  it('completes all four missions via normal controls and unlocks free flight',()=>{
    for(let id=1;id<=4;id++){
      driver.load(id);driver.start(false);
      for(let i=0;i<20000;i++){
        const state=driver.snapshot();if(!state.running)break;
        if(id===4 && state.hatch.state==='closed' && state.flight.position[2]<30) driver.openHatch();
        driver.control(demonstration(state.flight,state.config));driver.advance(DT);
      }
      expect(driver.snapshot().flight.status).toBe('success');
    }
    expect(driver.snapshot().completed).toEqual([1,2,3,4]);expect(driver.snapshot().latest?.demo).toBe(false);
  }, 120000);
  it('produces an explained failure and permits retry',()=>{
    const collisionCfg = { ...scenarios[0], position: [0.95, 0, 1] as [number, number, number], velocity: [0, 0, -0.65] as [number, number, number] };
    driver.load(1, collisionCfg);
    driver.start();
    const state=driver.advance(2);
    expect(state.flight.status).toBe('failed');expect(state.flight.reason).toBe('collision');expect(state.latest?.result?.reason).toBe('collision');expect(state.completed).toEqual([]);driver.start();expect(driver.snapshot().flight.status).toBe('flying');expect(driver.snapshot().flight.time).toBe(0);
  });
  it('passes mission 1 when directly docking with the station without stopping at 8m', () => {
    driver.start();
    const state = driver.advance(30);
    expect(state.flight.status).toBe('success');
    expect(state.flight.reason).toBeUndefined();
    expect(state.completed).toContain(1);
    expect(state.panel).toBe('review');
  });
  it('rejects invalid interface calls without changing the running flight',()=>{
    driver.start();const before=driver.snapshot();expect(()=>driver.load(8)).toThrow();expect(()=>driver.advance(Infinity)).toThrow();expect(()=>driver.control({translation:[NaN,0,0],rotation:[0,0,0],brake:false})).toThrow();expect(driver.snapshot()).toEqual(before);
  });
  it('does not allow a returned snapshot to mutate the simulation',()=>{driver.start();const state=driver.snapshot();state.flight.position[2]=999;expect(driver.snapshot().flight.position[2]).toBe(18);});
  it('correctly loads custom free flight lab configuration and resets cleanly', () => {
    const custom = structuredClone(driver.snapshot().config);
    custom.position = [1.2, 0, 45];
    custom.velocity = [0.15, 0, -0.4];
    custom.attitude = [10, -5, 8];
    custom.fuel = 75;
    driver.load(4, custom);
    driver.start();
    const snap = driver.snapshot();
    expect(snap.config.position).toEqual([1.2, 0, 45]);
    expect(snap.flight.fuel).toBe(75);
    expect(snap.flight.velocity).toEqual([0.15, 0, -0.4]);
    useSession.getState().reset();
    expect(driver.snapshot().flight.status).toBe('ready');
    expect(driver.snapshot().flight.time).toBe(0);
  });
  it('triggers locked axis feedback on restricted mission and debounces properly', () => {
    const restrictedConfig = { ...scenarios[0], rotation: false };
    const triggered = constraintFeedback.trigger(restrictedConfig, 'rotation', 0, 'zh');
    expect(triggered).toBe(true);
    expect(constraintFeedback.getAlert()?.title).toContain('锁定');
    const immediateRepeat = constraintFeedback.trigger(restrictedConfig, 'rotation', 0, 'zh');
    expect(immediateRepeat).toBe(false);
    const allowed = constraintFeedback.trigger(restrictedConfig, 'translation', 2, 'zh');
    expect(allowed).toBe(false);
  });
});

