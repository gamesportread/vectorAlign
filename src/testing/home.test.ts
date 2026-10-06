import { describe, expect, it } from 'vitest';
import { HOME_MISSIONS } from '../data/homeMissions';
import { useSession } from '../store';

describe('Home Mission Selector Data & Store Interface', () => {
  it('contains the 4 core mission phases with complete youth-friendly specs', () => {
    expect(HOME_MISSIONS).toHaveLength(4);

    const [liftoff, docking, departure, landing] = HOME_MISSIONS;

    // 1 升空
    expect(liftoff.num).toBe(1);
    expect(liftoff.titleZh).toBe('升空');
    expect(liftoff.specs.timeZh).toContain('发射点火');
    expect(liftoff.specs.locationZh).toContain('发射场');
    expect(liftoff.scienceTip.termZh).toBe('第一宇宙速度与级间分离');
    expect(liftoff.isImplemented).toBe(false);

    // 2 太空站对接 (原项目实现)
    expect(docking.num).toBe(2);
    expect(docking.titleZh).toBe('太空站对接');
    expect(docking.specs.timeZh).toContain('50 米逼近');
    expect(docking.specs.locationZh).toContain('近地轨道');
    expect(docking.scienceTip.termZh).toBe('六自由度与惯性反推刹车');
    expect(docking.isImplemented).toBe(true);
    expect(docking.historicalScenarios?.find((s) => s.id === 'iss-standard')?.isAvailable).toBe(true);

    // 3 太空站离开
    expect(departure.num).toBe(3);
    expect(departure.titleZh).toBe('太空站离开');
    expect(departure.specs.stageZh).toContain('弹簧');
    expect(departure.scienceTip.termZh).toBe('撤离安全走廊与弹簧分离');
    expect(departure.isImplemented).toBe(false);

    // 4 舱体降落
    expect(landing.num).toBe(4);
    expect(landing.titleZh).toBe('舱体降落');
    expect(landing.specs.locationZh).toContain('东风着陆场');
    expect(landing.scienceTip.termZh).toBe('黑障区与触地反推火箭');
    expect(landing.isImplemented).toBe(false);
  });

  it('manages navigation between home screen and simulator via useSession', () => {
    // Initial state
    expect(useSession.getState().screen).toBe('home');

    // Enter simulator
    useSession.getState().setScreen('simulator');
    expect(useSession.getState().screen).toBe('simulator');

    // Return home
    useSession.getState().setScreen('home');
    expect(useSession.getState().screen).toBe('home');
  });

  it('provides explanation for each technical term suitable for teenagers', () => {
    for (const mission of HOME_MISSIONS) {
      expect(mission.scienceTip.explanationZh.length).toBeGreaterThan(20);
      expect(mission.specs.vehicleZh.length).toBeGreaterThan(5);
      expect(mission.summaryZh.length).toBeGreaterThan(30);
    }
  });
});
