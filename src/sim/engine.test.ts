import { describe, it, expect } from 'vitest';
import { createState, DT, emptyCommand, step, demonstration, FixedStepper, captureFailure, angleError, COLLIDERS, segmentBox, sweepBox, resolveCollisionResponse } from './engine';
import { triggerCameraShake, decayCameraShake, getCameraShake, resetCameraShake } from './effects';
import { scenarios } from './scenarios';
import type { ScenarioConfig, SimulationState } from './types';
const flight=(c=scenarios[3]):SimulationState=>({...createState(c),status:'flying'});
describe('near-field physics',()=>{
  it('coasts at constant linear and angular speed without thrust',()=>{const s=flight();s.position=[0,0,25];s.velocity=[.2,-.1,.05];s.angularVelocity=[.01,0,0];const initialFuel=s.fuel;let next=s;for(let i=0;i<120;i++)next=step(next,emptyCommand(),scenarios[3]);expect(next.velocity).toEqual(s.velocity);expect(next.angularVelocity).toEqual(s.angularVelocity);expect(next.position[0]).toBeCloseTo(.4,9);expect(next.fuel).toBe(initialFuel);expect(angleError(next)).not.toBe(angleError(s));});
  it('counter-thrust reduces closing speed and uses resource',()=>{const s=flight();s.velocity=[0,0,-.5];const cmd=emptyCommand();cmd.translation[2]=1;const next=step(s,cmd,scenarios[3]);expect(next.velocity[2]).toBeGreaterThan(s.velocity[2]);expect(next.fuel).toBeLessThan(s.fuel);});
  it('assist brakes explicitly with fuel consumption and no velocity reversal',()=>{let s=flight();s.velocity=[.08,-.03,.05];s.angularVelocity=[.01,-.02,.01];const cmd=emptyCommand();cmd.brake=true;for(let i=0;i<120;i++)s=step(s,cmd,scenarios[3]);expect(Math.hypot(...s.velocity)).toBeLessThan(1e-8);expect(Math.hypot(...s.angularVelocity)).toBeLessThan(1e-8);expect(s.fuel).toBeLessThan(100);});
  it('holds only the disclosed lesson constraints',()=>{for(const c of scenarios.slice(0,3)){const s=flight(c);const cmd={translation:[1,1,1] as [number,number,number],rotation:[1,1,1] as [number,number,number],brake:false};const next=step(s,cmd,c);c.translation.forEach((enabled,i)=>{if(!enabled)expect(next.position[i]).toBe(c.position[i]);});if(!c.rotation)expect(next.orientation).toEqual(s.orientation);}});
  it('does not mutate its input state',()=>{const s=flight();const before=structuredClone(s);step(s,{translation:[1,1,1],rotation:[1,0,0],brake:false},scenarios[3]);expect(s).toEqual(before);});
});
describe('capture and continuous collision',()=>{
  it('accepts a slow aligned capture',()=>{const s=flight();s.position=[0,0,.351];s.velocity=[0,0,-.1];s.orientation=[0,0,0,1];expect(step(s,emptyCommand(),scenarios[3]).status).toBe('success');});
  it.each([['overspeed',[0,0,-3],[0,0,0,1],[0,0,0]],['drift',[.2,0,-.1],[0,0,0,1],[0,0,0]],['alignment',[0,0,-.1],[0,.1,0,Math.sqrt(.99)],[0,0,0]],['alignment',[0,0,-.1],[0,0,0,1],[0,.03,0]]])('rejects %s', (reason,velocity,orientation,angularVelocity)=>{const s=flight();s.position=[0,0,.351];s.velocity=velocity as SimulationState['velocity'];s.orientation=orientation as SimulationState['orientation'];s.angularVelocity=angularVelocity as SimulationState['angularVelocity'];expect(step(s,emptyCommand(),scenarios[3]).reason).toBe(reason);});
  it('checks lateral position independently of speed',()=>{const s=flight();s.position=[.3,0,.35];s.velocity=[0,0,-.1];s.orientation=[0,0,0,1];expect(captureFailure(s,scenarios[3])).toBe('drift');});
  it('cannot tunnel through station structure',()=>{const s=flight();s.position=[1.5,0,3];s.velocity=[0,0,-3000];expect(step(s,emptyCommand(),scenarios[3]).reason).toBe('collision');expect(segmentBox([1.5,0,3],[1.5,0,-60],...COLLIDERS[1])).toBe(true);});
  it('interpolates the contact point before deciding alignment',()=>{const s=flight();s.position=[.1,0,.351];s.velocity=[20,0,-.1];s.orientation=[0,0,0,1];expect(step(s,emptyCommand(),scenarios[3]).reason).toBe('drift');});
});
describe('repeatability and lessons',()=>{
  it('has the same trajectory at 30, 60 and 120 rendering FPS',()=>{const simulate=(fps:number)=>{let s=flight();const clock=new FixedStepper();for(let i=0;i<fps*10;i++)clock.advance(1/fps,()=>{s=step(s,{translation:[.02,0,0],rotation:[0,0,0],brake:false},scenarios[3]);});return s;};expect(simulate(30)).toEqual(simulate(60));expect(simulate(60)).toEqual(simulate(120));});
  for(const c of scenarios)it(`demonstrates lesson ${c.id} using the same physics`,()=>{let s=flight(c);for(let i=0;i<c.maxTime/DT && s.status==='flying';i++)s=step(s,demonstration(s,c),c);expect(s.status,JSON.stringify(s)).toBe('success');expect(s.fuel).toBeGreaterThan(0);});
  it('enforces finite mission time and fuel budgets',()=>{const c:ScenarioConfig={...scenarios[3],maxTime:1};let s=flight(c);s.time=.999;expect(step(s,emptyCommand(),c).reason).toBe('timeout');s=flight();s.fuel=.00001;const cmd=emptyCommand();cmd.translation=[1,1,1];const next=step(s,cmd,scenarios[3]);expect(next.fuel).toBe(0);expect(next.reason).toBe('fuel');});
  it('clears frame debt when resuming from a paused tab',()=>{const clock=new FixedStepper();let ticks=0;clock.advance(.01,()=>ticks++);clock.reset();clock.advance(DT,()=>ticks++);expect(ticks).toBe(1);});
});
describe('collision physics engine and dynamics', () => {
  it('computes swept impact time, contact normal and hit point', () => {
    const res = sweepBox([0, 0, 5], [0, 0, -5], [-1, -1, -2], [1, 1, 2]);
    expect(res.hit).toBe(true);
    expect(res.t).toBeCloseTo(0.3, 5);
    expect(res.normal).toEqual([0, 0, 1]);
    expect(res.point[2]).toBeCloseTo(2, 5);
  });

  it('calculates restitution bounce, friction, and eccentric tumble torque', () => {
    const s = flight();
    s.position = [0.5, 0.2, 0.35];
    s.velocity = [0.1, -0.05, -0.8];
    s.angularVelocity = [0, 0, 0];
    resolveCollisionResponse(s, [0.5, 0.2, 0.35], [0, 0, 1], 0.5);
    expect(s.velocity[2]).toBeGreaterThan(0.3);
    expect(Math.abs(s.velocity[0])).toBeGreaterThan(0.2);
    expect(Math.hypot(...s.angularVelocity)).toBeGreaterThan(0.1);
    expect(s.position[2]).toBeGreaterThan(0.35);
  });

  it('integrates unpowered tumble dynamics across multiple frames during failed state', () => {
    const s = flight();
    s.status = 'failed';
    s.reason = 'collision';
    s.position = [0, 0, 1];
    s.velocity = [0, 0, 0.5];
    s.angularVelocity = [0.2, 0, 0];
    const initialOrientation = [...s.orientation];
    let current = s;
    for (let i = 0; i < 30; i++) {
      current = step(current, emptyCommand(), scenarios[3], DT);
    }
    expect(current.position[2]).toBeCloseTo(1 + 0.5 * 30 * DT, 3);
    expect(current.orientation).not.toEqual(initialOrientation);
  });

  it('triggers camera shake and decays smoothly', () => {
    resetCameraShake();
    triggerCameraShake(1.5);
    expect(getCameraShake()).toBeCloseTo(1.5, 3);
    decayCameraShake(0.5);
    expect(getCameraShake()).toBeCloseTo(0.75, 3);
  });

  it('does not tunnel into station interior when missing capture or flying past docking plane', () => {
    // 1. Off-axis approach past 0.35m must hit rim
    const offAxis = flight();
    offAxis.position = [0.9, 0, 0.36];
    offAxis.velocity = [0, 0, -1.0];
    const hitRim = step(offAxis, emptyCommand(), scenarios[3], DT);
    expect(hitRim.status).toBe('failed');
    expect(hitRim.reason).toBe('collision');
    expect(hitRim.position[2]).toBeGreaterThan(0.35);

    // 2. Head-on high speed collision must not enter z < 0.2
    const headOn = flight();
    headOn.position = [0, 0, 0.36];
    headOn.velocity = [0, 0, -5.0];
    const bounced = step(headOn, emptyCommand(), scenarios[3], DT);
    expect(bounced.status).toBe('failed');
    expect(bounced.position[2]).toBeGreaterThan(0.35);
  });

  it('drifts to distant positions across space following microgravity physics', () => {
    const s = flight();
    s.position = [0, 0, 0.36];
    s.velocity = [0, 0, -1.5];
    let drifted = step(s, emptyCommand(), scenarios[3], DT);
    expect(drifted.status).toBe('failed');
    const startPos = [...drifted.position];
    // Advance 120 steps (2 seconds) of microgravity unpowered drift
    for (let i = 0; i < 120; i++) {
      drifted = step(drifted, emptyCommand(), scenarios[3], DT);
    }
    const distanceMoved = Math.hypot(
      drifted.position[0] - startPos[0],
      drifted.position[1] - startPos[1],
      drifted.position[2] - startPos[2]
    );
    expect(distanceMoved).toBeGreaterThan(2.0); // Has physically flown to other positions
  });

  it('scales bounce velocity, lateral deflection, and torque with low impact speed', () => {
    // 1. Near-zero velocity collision (e.g. 0.02 m/s)
    const gentle = flight();
    gentle.position = [0.2, 0.1, 0.35];
    gentle.velocity = [0, 0, -0.02];
    gentle.angularVelocity = [0, 0, 0];
    resolveCollisionResponse(gentle, [0.2, 0.1, 0.35], [0, 0, 1], 0.55);

    // Rebound speed along normal must be proportional to impact speed (e.g. ~0.011 m/s), not hardcoded > 1 m/s
    expect(gentle.velocity[2]).toBeLessThan(0.04);
    expect(gentle.velocity[2]).toBeGreaterThan(0.005);
    // Lateral deflection must be small
    expect(Math.abs(gentle.velocity[0])).toBeLessThan(0.03);
    // Angular tumble must be gentle
    expect(Math.hypot(...gentle.angularVelocity)).toBeLessThan(0.05);

    // 2. High-speed collision (e.g. 1.2 m/s)
    const fast = flight();
    fast.position = [0.2, 0.1, 0.35];
    fast.velocity = [0, 0, -1.2];
    fast.angularVelocity = [0, 0, 0];
    resolveCollisionResponse(fast, [0.2, 0.1, 0.35], [0, 0, 1], 0.55);

    // High speed collision produces proportionally stronger bounce and tumble
    expect(fast.velocity[2]).toBeGreaterThan(0.5);
    expect(fast.velocity[2] / gentle.velocity[2]).toBeGreaterThan(15);
  });

  it('fails with escape (not collision) when flying downwards past training boundary, and coasts powerlessly', () => {
    const s = flight();
    s.position = [0, -4.55, 18];
    s.velocity = [0, -1.5, 0]; // Flying downwards
    const next = step(s, emptyCommand(), scenarios[0], DT);
    expect(next.position[1]).toBeLessThan(-4.5);
    expect(next.status).toBe('failed');
    expect(next.reason).toBe('escape'); // Not 'collision'
    expect(next.thrust).toEqual([0, 0, 0]);
    expect(next.torque).toEqual([0, 0, 0]);

    // Continues drifting in space under inertia without being kicked or stopped
    const afterCoast = step(next, emptyCommand(), scenarios[0], DT);
    expect(afterCoast.position[1]).toBeCloseTo(next.position[1] - 1.5 * DT, 4);
    expect(afterCoast.velocity[1]).toBeCloseTo(-1.5, 4);
  });

  it('fails with escape when flying downwards past the docking plane outside station bulkheads', () => {
    const s = flight();
    s.position = [0, -1.5, 0.36];
    s.velocity = [0, 0, -1.0]; // Flying past z=0.35 below the station (0.36 - 1/60 = 0.3433 <= 0.35)
    const passed = step(s, emptyCommand(), scenarios[3], DT);
    expect(passed.status).toBe('failed');
    expect(passed.reason).toBe('escape'); // Missed the station, flew past into space
    expect(passed.thrust).toEqual([0, 0, 0]);
  });

  it('treats direct docking in mission 1 as success without reporting error', () => {
    const s = flight(scenarios[0]);
    s.position = [0, 0, 0.36];
    s.velocity = [0, 0, -0.65]; // Approaching port at unbraked speed
    const passed = step(s, emptyCommand(), scenarios[0], DT);
    expect(passed.status).toBe('success');
    expect(passed.reason).toBeUndefined();
    expect(passed.velocity).toEqual([0, 0, 0]);
    expect(passed.position[2]).toBeCloseTo(0.35, 2);
  });
});

