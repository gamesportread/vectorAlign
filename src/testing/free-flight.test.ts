import { describe, expect, it } from 'vitest';
import { buildFreeFlightScenario, computeEulerAngleError, DEFAULT_FREE_FLIGHT_PARAMS, LAB_PRESETS } from '../components/modals/FreeFlightModal';
import { angleError, createState, demonstration, DT, lateralError, lateralSpeed, step } from '../sim/engine';
import type { SimulationState } from '../sim/types';

describe('Free Flight Lab Scenario Generation and Simulation Compatibility', () => {
  it('constructs a ScenarioConfig completely compatible with engine.createState', () => {
    const params = {
      distance: 40,
      offset: 1.5,
      speed: 0.3,
      driftSpeed: 0.15,
      pitch: 10,
      yaw: -8,
      roll: 6,
      fuel: 75,
    };
    const config = buildFreeFlightScenario(params);
    expect(config.id).toBe(4);
    expect(config.position).toEqual([1.5, 0, 40]);
    expect(config.velocity).toEqual([0.15, 0, -0.3]);
    expect(config.attitude).toEqual([10, -8, 6]);
    expect(config.fuel).toBe(75);
    expect(config.translation).toEqual([true, true, true]);
    expect(config.rotation).toBe(true);

    const state = createState(config);
    expect(state.status).toBe('ready');
    expect(state.position).toEqual([1.5, 0, 40]);
    expect(state.velocity).toEqual([0.15, 0, -0.3]);
    expect(state.fuel).toBe(75);
    expect(lateralError(state)).toBeCloseTo(1.5);
    expect(lateralSpeed(state)).toBeCloseTo(0.15);

    const engineAngle = angleError(state);
    const computedAngle = computeEulerAngleError(10, -8, 6);
    expect(engineAngle).toBeCloseTo(computedAngle, 1);
  });

  it('correctly steps physics with initial lateral drift and attitude offset', () => {
    const config = buildFreeFlightScenario({
      distance: 30,
      offset: 2.0,
      speed: 0.25,
      driftSpeed: 0.20,
      pitch: 5,
      yaw: -5,
      roll: 0,
      fuel: 90,
    });
    let state = { ...createState(config), status: 'flying' as const };

    // Stepping with no command coasts at constant velocity
    const s1 = step(state, { translation: [0, 0, 0], rotation: [0, 0, 0], brake: false }, config, DT);
    expect(s1.position[0]).toBeCloseTo(2.0 + 0.20 * DT, 5);
    expect(s1.position[2]).toBeCloseTo(30 - 0.25 * DT, 5);
    expect(s1.velocity[0]).toBeCloseTo(0.20);
    expect(s1.velocity[2]).toBeCloseTo(-0.25);
  });

  it('allows demonstration autopilot to dock successfully from custom initial conditions', () => {
    const config = buildFreeFlightScenario({
      distance: 25,
      offset: 1.0,
      speed: 0.2,
      driftSpeed: 0.1,
      pitch: 8,
      yaw: -6,
      roll: 5,
      fuel: 100,
    });

    let state: SimulationState = { ...createState(config), status: 'flying' };
    let steps = 0;
    while (state.status === 'flying' && steps < 60 * 120) {
      const cmd = demonstration(state, config);
      state = step(state, cmd, config, DT);
      steps++;
    }

    expect(state.status).toBe('success');
    expect(state.reason).toBeUndefined();
    expect(state.fuel).toBeGreaterThan(50);
  });

  it('all lab presets contain valid bounded parameters', () => {
    for (const preset of LAB_PRESETS) {
      const p = preset.params;
      expect(p.distance).toBeGreaterThanOrEqual(5);
      expect(p.distance).toBeLessThanOrEqual(100);
      expect(p.offset).toBeGreaterThanOrEqual(-5);
      expect(p.offset).toBeLessThanOrEqual(5);
      expect(p.speed).toBeGreaterThanOrEqual(0);
      expect(p.speed).toBeLessThanOrEqual(1.0);
      expect(p.driftSpeed).toBeGreaterThanOrEqual(-0.3);
      expect(p.driftSpeed).toBeLessThanOrEqual(0.3);
      expect(p.pitch).toBeGreaterThanOrEqual(-15);
      expect(p.pitch).toBeLessThanOrEqual(15);
      expect(p.yaw).toBeGreaterThanOrEqual(-15);
      expect(p.yaw).toBeLessThanOrEqual(15);
      expect(p.roll).toBeGreaterThanOrEqual(-15);
      expect(p.roll).toBeLessThanOrEqual(15);
      expect(p.fuel).toBeGreaterThanOrEqual(10);
      expect(p.fuel).toBeLessThanOrEqual(100);
    }
  });
});
