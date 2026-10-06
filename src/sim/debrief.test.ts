import { describe, expect, it } from 'vitest';
import { analyzeFlight } from './debrief';
import { scenarios } from './scenarios';
import type { FlightRecord, SimulationState } from './types';

function createMockRecord(scenarioId: number, status: 'success' | 'failed', reason?: any, override?: Partial<SimulationState>): FlightRecord {
  const config = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
  const state: SimulationState = {
    position: [0, 0, 8],
    velocity: [0, 0, 0],
    orientation: [0, 0, 0, 1],
    angularVelocity: [0, 0, 0],
    fuel: 85,
    time: 25,
    hold: 1.5,
    status,
    reason,
    thrust: [0, 0, 0],
    torque: [0, 0, 0],
    ...override
  };

  return {
    scenario: scenarioId,
    config,
    demo: false,
    samples: [
      { time: 0, distance: 18, speed: 0.65, lateral: 0, angle: 0, fuel: 100, position: [0, 0, 18] },
      { time: 25, distance: state.position[2], speed: Math.hypot(...state.velocity), lateral: 0, angle: 0, fuel: state.fuel, position: [...state.position] }
    ],
    events: [
      { time: 0, type: 'start' },
      { time: 25, type: status, reason }
    ],
    result: state,
    date: new Date().toISOString()
  };
}

describe('debrief analysis engine', () => {
  it('analyzes successful mission with positive evaluation and tips', () => {
    const record = createMockRecord(1, 'success');
    const debriefZh = analyzeFlight(record, 'zh');
    expect(debriefZh.isSuccess).toBe(true);
    expect(debriefZh.headline).toContain('完成得很好');
    expect(debriefZh.causeExplanation).toContain('教科书级');

    const debriefEn = analyzeFlight(record, 'en');
    expect(debriefEn.isSuccess).toBe(true);
    expect(debriefEn.badgeTitle).toBe('Mission Accomplished');
  });

  it('diagnoses mission 1 overshot hold point collision with plain language advice', () => {
    const record = createMockRecord(1, 'failed', 'collision', {
      position: [0, 0, 0.3], // Smashed into station past the 8m ring
      velocity: [0, 0, -1.2]
    });
    const debrief = analyzeFlight(record, 'zh');
    expect(debrief.isSuccess).toBe(false);
    expect(debrief.badgeType).toBe('collision');
    expect(debrief.badgeTitle).toContain('错过停泊点');
    expect(debrief.physicsInsight).toContain('没有摩擦阻力');
    expect(debrief.pilotTips.length).toBeGreaterThanOrEqual(3);

    // Should indicate hold distance failed
    const distMetric = debrief.metrics.find((m) => m.id === 'distance');
    expect(distMetric?.passed).toBe(false);
    expect(distMetric?.comment).toContain('冲过了停泊点');

    // Speed metric should flag overspeed
    const speedMetric = debrief.metrics.find((m) => m.id === 'speed');
    expect(speedMetric?.passed).toBe(false);
  });

  it('diagnoses overspeed capture failure', () => {
    const record = createMockRecord(4, 'failed', 'overspeed', {
      position: [0, 0, 0.32],
      velocity: [0, 0, -0.45]
    });
    const debrief = analyzeFlight(record, 'zh');
    expect(debrief.reason).toBe('overspeed');
    expect(debrief.headline).toContain('接触速度');
    expect(debrief.pilotTips[0]).toContain('0.10 m/s');
  });

  it('diagnoses drift failure in mission 2', () => {
    const record = createMockRecord(2, 'failed', 'drift', {
      position: [0.85, 0.4, 12],
      velocity: [0.15, -0.05, 0]
    });
    const debrief = analyzeFlight(record, 'zh');
    expect(debrief.reason).toBe('drift');
    expect(debrief.badgeType).toBe('drift');
    expect(debrief.pilotTips.some((tip) => tip.includes('A / D'))).toBe(true);
  });

  it('diagnoses fuel depletion failure', () => {
    const record = createMockRecord(3, 'failed', 'fuel', {
      fuel: 0
    });
    const debrief = analyzeFlight(record, 'zh');
    expect(debrief.reason).toBe('fuel');
    expect(debrief.physicsInsight).toContain('脉冲推进');
  });
});
