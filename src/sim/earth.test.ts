import { describe, expect, it } from 'vitest';
import { horizonDipDeg, horizonDistanceM, scaledAltitude } from './earth';
import { DETAIL_BOUNDS, SUB_LAT, SUB_LON } from '../components/scene/Earth';

describe('real Earth proportions', () => {
  it('horizon from the ISS sits about 20° below level', () => {
    expect(horizonDipDeg()).toBeGreaterThan(20);
    expect(horizonDipDeg()).toBeLessThan(21);
  });
  it('horizon is about 2,350 km away', () => {
    expect(horizonDistanceM() / 1000).toBeCloseTo(2351, -1);
  });
  it('on a basketball-sized Earth (r = 12.3 cm) the ISS flies under 1 cm up', () => {
    expect(scaledAltitude(12.3)).toBeCloseTo(0.81, 2);
  });
  it('detail patch bounds completely envelope visible horizon disc', () => {
    const subU = (SUB_LON * 180 / Math.PI + 180) / 360;
    const subV = (SUB_LAT * 180 / Math.PI + 90) / 180;
    // Sub-satellite point must be well inside patch bounds
    expect(subU).toBeGreaterThan(DETAIL_BOUNDS.x);
    expect(subU).toBeLessThan(DETAIL_BOUNDS.z);
    expect(subV).toBeGreaterThan(DETAIL_BOUNDS.y);
    expect(subV).toBeLessThan(DETAIL_BOUNDS.w);

    // Patch must span at least 40 degrees in latitude and longitude (visible disc is ~40.7 deg)
    const spanLatDeg = (DETAIL_BOUNDS.w - DETAIL_BOUNDS.y) * 180;
    const spanLonDeg = (DETAIL_BOUNDS.z - DETAIL_BOUNDS.x) * 360;
    expect(spanLatDeg).toBeGreaterThan(42);
    expect(spanLonDeg).toBeGreaterThan(70);
  });
});

