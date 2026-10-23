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
    expect(liftoff.isImplemented).toBe(true);
    expect(liftoff.historicalScenarios?.find((s) => s.id === 'saturn-v')?.isAvailable).toBe(true);

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
    expect(departure.isImplemented).toBe(true);
    expect(departure.historicalScenarios?.find((s) => s.id === 'iss-undock')?.isAvailable).toBe(true);

    // 4 舱体降落
    expect(landing.num).toBe(4);
    expect(landing.titleZh).toBe('舱体降落');
    expect(landing.specs.locationZh).toContain('东风着陆场');
    expect(landing.scienceTip.termZh).toBe('黑障区与触地反推火箭');
    expect(landing.isImplemented).toBe(true);
    expect(landing.historicalScenarios?.find((s) => s.id === 'dongfeng-field')?.isAvailable).toBe(true);
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

  it('supports Level 0 (第零关) as orientation stage before flying', () => {
    // Select Level 0
    useSession.getState().setActiveLevel(0);
    expect(useSession.getState().activeLevel).toBe(0);

    // Switch to flight level 1
    useSession.getState().select(1);
    expect(useSession.getState().activeLevel).toBe(1);
    expect(useSession.getState().config.id).toBe(1);

    // Can switch back to Level 0
    useSession.getState().setActiveLevel(0);
    expect(useSession.getState().activeLevel).toBe(0);
  });

  it('validates 4 scenarios for mission 2 with distinct live/unmade status', () => {
    const docking = HOME_MISSIONS.find((m) => m.id === 2);
    expect(docking).toBeDefined();
    expect(docking?.historicalScenarios).toHaveLength(4);

    const [iss, tg, astp, mir] = docking!.historicalScenarios!;
    expect(iss.isAvailable).toBe(true);
    expect(tg.isAvailable).toBe(false);
    expect(astp.isAvailable).toBe(false);
    expect(mir.isAvailable).toBe(false);

    // Each scenario has descriptive copy for subtext
    for (const sc of docking!.historicalScenarios!) {
      expect(sc.descZh.length).toBeGreaterThan(10);
      expect(sc.titleZh.length).toBeGreaterThan(3);
    }
  });
});


