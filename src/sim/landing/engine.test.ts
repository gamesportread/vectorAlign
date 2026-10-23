import { describe, expect, it } from 'vitest';
import { landingDriver } from '../../testing/landing-driver';

describe('Mission 04 · Capsule Landing Physics & Scenarios', () => {
  it('fails with heatshield_burnthrough if capsule tilts excessively during plasma blackout', () => {
    landingDriver.load(1);
    landingDriver.start(false);
    landingDriver.setAttitudeInput(1); // Force capsule to tilt away from hypersonic stream
    const failed = landingDriver.advance(5);

    expect(failed.state.status).toBe('failed');
    expect(failed.state.failReason).toBe('heatshield_burnthrough');
  });

  it('fails with chute_shred if parachute is deployed above safe subsonic speed (255 m/s)', () => {
    landingDriver.load(2);
    landingDriver.start(false);
    // Initial speed in Level 2 is 255 m/s (> 235 m/s limit)
    landingDriver.triggerAction();
    const failed = landingDriver.advance(0.1);

    expect(failed.state.status).toBe('failed');
    expect(failed.state.failReason).toBe('chute_shred');
  });

  it('fails with hard_impact if retro-rockets are not fired before grassland touchdown', () => {
    landingDriver.load(3);
    landingDriver.start(false);
    const failed = landingDriver.advance(10);

    expect(failed.state.status).toBe('failed');
    expect(failed.state.failReason).toBe('hard_impact');
  });

  it('completes all 4 Capsule Landing missions deterministically via landingAutopilot', () => {
    for (const id of [1, 2, 3, 4]) {
      landingDriver.load(id);
      landingDriver.start(true);
      const result = landingDriver.advance(180);
      expect(result.state.status, `Landing Mission ${id} should succeed`).toBe('success');
      if (id === 3 || id === 4) {
        expect(result.state.altitudeM).toBe(0);
        expect(result.state.retroFired).toBe(true);
        expect(result.state.touchdownSpeedMs).toBeLessThanOrEqual(2.4);
      }
    }
  });
});
