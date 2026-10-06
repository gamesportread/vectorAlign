import { describe, expect, it } from 'vitest';
import { createTrack, runTrack, trackStep, TRACK } from './intro';

describe('intro track mini-sim', () => {
  it('keeps moving after the button is released (no brakes in space)', () => {
    let s = createTrack();
    for (let i = 0; i < 60; i++) s = trackStep(s, 0);
    expect(s.v).toBeCloseTo(TRACK.speed);
    expect(s.x).toBeCloseTo(TRACK.start + TRACK.speed, 1);
  });
  it('crashes into the station when nobody brakes', () => {
    expect(runTrack('coast', 60).status).toBe('crash');
  });
  it('the demo pilot stops inside the yellow ring', () => {
    const s = runTrack('auto', 120);
    expect(s.status).toBe('success');
    expect(Math.abs(s.x - TRACK.target)).toBeLessThanOrEqual(TRACK.tolerance);
  });
  it('braking too hard drifts away', () => {
    expect(runTrack('manual', 60, () => 1).status).toBe('lost');
  });
});
