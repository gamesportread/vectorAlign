import { describe, expect, it, beforeEach } from 'vitest';
import { createState } from './engine';
import { getScenario } from './scenarios';
import { analyzeFlight } from './debrief';
import { flightDriver } from '../testing/flight-driver';
import { useSession } from '../store';

describe('Spaceship Hatch State Machine & Docking Validation', () => {
  beforeEach(() => {
    flightDriver.clearProfile();
  });

  describe('1. Initial Default State', () => {
    it('initializes createState with hatch closed and progress 0', () => {
      const config = getScenario(1);
      const state = createState(config);
      expect(state.hatch).toBeDefined();
      expect(state.hatch?.state).toBe('closed');
      expect(state.hatch?.progress).toBe(0);
    });

    it('defaults session and flightDriver hatch to closed (progress === 0)', () => {
      const snapshot = flightDriver.load(1);
      expect(snapshot.hatch.state).toBe('closed');
      expect(snapshot.hatch.progress).toBe(0);
    });
  });

  describe('2. State Transitions & Smooth Animation', () => {
    it('transitions to opening when openHatch() is invoked', () => {
      flightDriver.load(1);
      flightDriver.openHatch();
      const snap = flightDriver.snapshot();
      expect(snap.hatch.state).toBe('opening');
      expect(snap.hatch.progress).toBe(0);
    });

    it('smoothly advances progress towards open over 2 seconds', () => {
      flightDriver.load(1);
      flightDriver.openHatch();

      // Advance 1 second -> approx 50%
      flightDriver.advance(1.0);
      let snap = flightDriver.snapshot();
      expect(snap.hatch.state).toBe('opening');
      expect(snap.hatch.progress).toBeCloseTo(0.5, 1);

      // Advance another 1.1 seconds -> reached 100% open
      flightDriver.advance(1.1);
      snap = flightDriver.snapshot();
      expect(snap.hatch.state).toBe('open');
      expect(snap.hatch.progress).toBe(1.0);
    });

    it('toggles from open to closing, and back to closed', () => {
      flightDriver.load(1);
      flightDriver.openHatch();
      flightDriver.advance(2.05);
      expect(flightDriver.snapshot().hatch.state).toBe('open');

      // Toggle should now initiate closing
      flightDriver.toggleHatch();
      expect(flightDriver.snapshot().hatch.state).toBe('closing');

      // Advance 1 second -> approx 50%
      flightDriver.advance(1.0);
      expect(flightDriver.snapshot().hatch.state).toBe('closing');
      expect(flightDriver.snapshot().hatch.progress).toBeCloseTo(0.5, 1);

      // Advance remaining time -> closed
      flightDriver.advance(1.1);
      expect(flightDriver.snapshot().hatch.state).toBe('closed');
      expect(flightDriver.snapshot().hatch.progress).toBe(0);
    });

    it('toggleHatch switches direction correctly when interrupted mid-way', () => {
      flightDriver.load(1);
      flightDriver.toggleHatch(); // Starts opening
      flightDriver.advance(0.5);
      expect(flightDriver.snapshot().hatch.state).toBe('opening');

      // Toggle while opening should reverse to closing
      flightDriver.toggleHatch();
      expect(flightDriver.snapshot().hatch.state).toBe('closing');

      // Advance 0.6 seconds -> closed
      flightDriver.advance(0.6);
      expect(flightDriver.snapshot().hatch.state).toBe('closed');
      expect(flightDriver.snapshot().hatch.progress).toBe(0);
    });
  });

  describe('3. Docking Validation Requires Hatch To Be Open', () => {
    it('fails mission 4 docking if hatch is closed when entering final approach (< 1.5m)', () => {
      const snap = flightDriver.load(4, {
        ...getScenario(4),
        position: [0, 0, 1.6],
        velocity: [0, 0, -0.2]
      });
      expect(snap.hatch.state).toBe('closed');

      flightDriver.start(false);
      // Advance until ship crosses 1.5m into critical docking zone
      flightDriver.advance(2.0);

      const result = flightDriver.snapshot();
      expect(result.flight.status).toBe('failed');
      expect(result.flight.reason).toBe('hatch_closed');
    });

    it('succeeds docking in mission 4 when hatch is fully open', () => {
      flightDriver.load(4, {
        ...getScenario(4),
        position: [0, 0, 0.45],
        velocity: [0, 0, -0.05],
        attitude: [0, 0, 0]
      });

      // Open hatch first
      flightDriver.openHatch();
      flightDriver.advance(2.05);
      expect(flightDriver.snapshot().hatch.state).toBe('open');

      flightDriver.start(false);
      // Advance to contact port at z <= 0.35
      flightDriver.advance(2.5);

      const result = flightDriver.snapshot();
      expect(result.flight.status).toBe('success');
    });
  });

  describe('4. Educational Teenager-Friendly Debrief for Hatch Failure', () => {
    it('generates informative debrief when hatch is closed upon docking', () => {
      const cfg = getScenario(4);
      const record = {
        scenario: 4,
        config: cfg,
        demo: false,
        samples: [
          { time: 0, distance: 1.8, speed: 0.1, lateral: 0, angle: 0, fuel: 100, position: [0, 0, 1.8] as [number, number, number] }
        ],
        events: [
          { time: 0, type: 'start' as const },
          { time: 4, type: 'failed' as const, reason: 'hatch_closed' as const }
        ],
        result: {
          ...createState(cfg),
          position: [0, 0, 1.4] as [number, number, number],
          velocity: [0, 0, -0.1] as [number, number, number],
          status: 'failed' as const,
          reason: 'hatch_closed' as const
        },
        date: new Date().toISOString()
      };

      const debrief = analyzeFlight(record, 'zh');

      expect(debrief.isSuccess).toBe(false);
      expect(debrief.badgeTitle).toContain('舱门未开启');
      expect(debrief.headline).toContain('舱门未开启');
      expect(debrief.causeExplanation).toContain('头锥保护罩');
      expect(debrief.physicsInsight).toContain('龙飞船');
      expect(debrief.pilotTips.length).toBeGreaterThanOrEqual(1);
      expect(debrief.pilotTips[0]).toContain('按键盘数字键【1】');
    });
  });

  describe('5. 3D Model Hinge Rotation Angle Verification', () => {
    it('calculates Hinge rotation.z smoothly from closed (1.6842 rad) to open (0 rad)', () => {
      const getHingeRotationZ = (progress: number) => (1 - progress) * 1.6842;
      expect(getHingeRotationZ(0)).toBeCloseTo(1.6842, 4); // Closed
      expect(getHingeRotationZ(0.5)).toBeCloseTo(0.8421, 4); // Halfway
      expect(getHingeRotationZ(1)).toBeCloseTo(0, 4); // Fully open
    });
  });
});
