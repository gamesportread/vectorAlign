import { describe, expect, it } from 'vitest';
import { departureDriver } from '../../testing/departure-driver';
import { KEEP_OUT_ZONE_M, SPRING_PUSHOFF_VZ } from './engine';

describe('Mission 03 · Station Departure Physics & Scenarios', () => {
  it('releases docking latches and imparts mechanical spring push-off velocity without fuel loss', () => {
    departureDriver.load(1);
    departureDriver.start(false);
    departureDriver.releaseLatches();
    const snap = departureDriver.advance(0.1);

    expect(snap.state.latchesReleased).toBe(true);
    expect(snap.state.velocity[2]).toBeCloseTo(SPRING_PUSHOFF_VZ, 3);
    expect(snap.state.fuelPct).toBeCloseTo(100, 3);
    expect(snap.state.inKeepOutZone).toBe(true);
  });

  it('fails with plume_contamination if axial thrusters fire inside the 0–5m keep-out zone', () => {
    departureDriver.load(1);
    departureDriver.start(false);
    departureDriver.releaseLatches();
    departureDriver.advance(1.0); // still around z ~ 0.63m < 5.0m

    expect(departureDriver.snapshot().state.position[2]).toBeLessThan(KEEP_OUT_ZONE_M);
    departureDriver.setTranslation([0, 0, 1]); // fire aft separation burn prematurely
    const failed = departureDriver.advance(0.1);

    expect(failed.state.status).toBe('failed');
    expect(failed.state.failReason).toBe('plume_contamination');
  });

  it('fails with corridor_breach if spacecraft drifts outside the conical departure corridor', () => {
    departureDriver.load(2);
    departureDriver.start(false);
    // Push strongly right (+X) outside the cone
    departureDriver.setTranslation([1, 0, 0]);
    const failed = departureDriver.advance(15);

    expect(failed.state.status).toBe('failed');
    expect(failed.state.failReason).toBe('corridor_breach');
  });

  it('completes all 4 Station Departure missions deterministically via departureAutopilot', () => {
    for (const id of [1, 2, 3, 4]) {
      departureDriver.load(id);
      departureDriver.start(true);
      const result = departureDriver.advance(160);
      expect(result.state.status, `Departure Mission ${id} should succeed`).toBe('success');
      if (id === 4) {
        expect(result.state.noseconeClosed).toBe(true);
        expect(result.state.position[2]).toBeGreaterThanOrEqual(32);
      }
    }
  });
});
