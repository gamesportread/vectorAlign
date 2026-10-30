import { useEffect, useState, useSyncExternalStore } from 'react';
import { ChevronRight, Layers3 } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import type { NavigationTab } from './types/app';
import { clamp } from './sim/engine';
import { constraintFeedback, isAxisLocked } from './sim/feedback';
import { advanceFrame, clearInput, hydrate, lockTone, notifyCommand, runtime, useSession } from './store';

import { Topbar } from './components/layout/Topbar';
import { Sidebar } from './components/layout/Sidebar';
import { AppFooter } from './components/layout/AppFooter';

import { MissionView } from './components/views/MissionView';
import { FlightLog } from './components/views/FlightLog';
import { FieldGuide } from './components/views/FieldGuide';

import { Modal } from './components/common/Modal';
import { BriefingModal } from './components/modals/BriefingModal';
import { ReviewModal } from './components/modals/ReviewModal';
import { FreeFlightModal } from './components/modals/FreeFlightModal';
import { InstallHelpModal } from './components/modals/InstallHelpModal';
import { IntroTour } from './components/intro/IntroTour';
import { HomeView } from './components/home/HomeView';
import { MissionZeroView } from './components/views/MissionZeroView';
import { LiftoffWorkspace } from './components/liftoff/LiftoffWorkspace';
import { DepartureWorkspace } from './components/departure/DepartureWorkspace';
import { LandingWorkspace } from './components/landing/LandingWorkspace';

type ActiveProgram = 'docking' | 'liftoff' | 'departure' | 'landing';
let currentActiveProgram: ActiveProgram = 'docking';

const keys: Record<string, ['translation' | 'rotation', number, number]> = {
  KeyA: ['translation', 0, -1],
  KeyD: ['translation', 0, 1],
  KeyW: ['translation', 1, 1],
  KeyS: ['translation', 1, -1],
  KeyR: ['translation', 2, -1],
  KeyF: ['translation', 2, 1],
  ArrowUp: ['rotation', 0, -1],
  ArrowDown: ['rotation', 0, 1],
  ArrowLeft: ['rotation', 1, -1],
  ArrowRight: ['rotation', 1, 1],
  KeyQ: ['rotation', 2, 1],
  KeyE: ['rotation', 2, -1]
};

function useFlight() {
  useEffect(() => {
    void hydrate();
    let frame = 0;
    let last = performance.now();
    let publish = 0;

    const tick = (now: number) => {
      advanceFrame((now - last) / 1000);
      last = now;
      if (now - publish > 80) {
        useSession.setState({ flight: runtime.state });
        publish = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const held = new Set<string>();

    const rebuild = () => {
      clearInput();
      const session = useSession.getState();
      if (!session.running || session.demo) return;

      for (const key of held) {
        if (key === 'Space') {
          runtime.command.brake = true;
        }
        const map = keys[key];
        if (map) {
          const currentVal = runtime.command[map[0]][map[1]];
          runtime.command[map[0]][map[1]] = clamp(currentVal + map[2], -1, 1);
        }
      }
      notifyCommand();
    };

    const down = (e: KeyboardEvent) => {
      // 在主页或非空间站对接子系统时不响应空间站对接按键
      if (useSession.getState().screen === 'home' || currentActiveProgram !== 'docking') return;

      // 1. 复盘报告弹窗开启时，按 R 键立即重新开始任务
      if (useSession.getState().panel === 'review') {
        if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          const sess = useSession.getState();
          if (sess.latest) {
            sess.select(sess.latest.scenario, sess.latest.config);
          }
          sess.start();
          return;
        }
      }

      if ((e.target as HTMLElement).closest('input,select,textarea,[contenteditable="true"]')) {
        return;
      }

      // 舱门开关控制快捷键: 按 1 (Digit1 / Numpad1 / key === '1')
      if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1') {
        e.preventDefault();
        useSession.getState().toggleHatch();
        return;
      }

      // 2. 飞船已失败失控（如撞击空间站）时，按 R / Enter 键立即重新开始任务
      const currentFlight = useSession.getState().flight;
      if (currentFlight.status === 'failed') {
        if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R' || e.code === 'Enter') {
          e.preventDefault();
          held.clear();
          clearInput();
          useSession.getState().start();
          return;
        }
        // 失败状态下禁用所有常规飞行推进输入，避免无效推力残留
        return;
      }

      if (e.code in keys || e.code === 'Space') {
        e.preventDefault();

        // 关卡自由度锁定检测与即时操作反馈
        if (e.code in keys) {
          const map = keys[e.code];
          const cfg = useSession.getState().config;
          if (isAxisLocked(cfg, map[0], map[1])) {
            constraintFeedback.trigger(
              cfg,
              map[0],
              map[1],
              useSession.getState().language,
              lockTone
            );
            return;
          }
        }

        held.add(e.code);
        rebuild();
      }

      if (e.code === 'Escape') {
        useSession.getState().pause();
      }
    };

    const up = (e: KeyboardEvent) => {
      if (held.has(e.code)) {
        held.delete(e.code);
        rebuild();
      }
    };

    const blur = () => {
      held.clear();
      clearInput();
      useSession.getState().pause();
    };

    const visibility = () => {
      if (document.hidden) blur();
    };

    const unsubscribe = useSession.subscribe((state, previous) => {
      if (
        state.mode !== previous.mode ||
        state.running !== previous.running ||
        state.config !== previous.config
      ) {
        held.clear();
        clearInput();
      }
    });

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);

    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
}

export default function App() {
  useFlight();

  const session = useSession();
  const { language, flight, panel, storageError } = session;
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  const [tab, setTab] = useState<NavigationTab>('mission');
  const [activeProgram, setActiveProgram] = useState<ActiveProgram>(() => {
    if (typeof window === 'undefined') return 'docking';
    const prog = new URLSearchParams(window.location.search).get('program');
    if (prog === 'liftoff' || prog === 'departure' || prog === 'landing') return prog;
    return 'docking';
  });
  const [liftoffVehicleId, setLiftoffVehicleId] = useState<'saturn-v' | 'cz5' | 'cz2f'>('saturn-v');
  const [liftoffActiveLevel, setLiftoffActiveLevel] = useState<number>(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);

  currentActiveProgram = activeProgram;

  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW();

  useEffect(() => {
    const listener = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener('beforeinstallprompt', listener);
    return () => window.removeEventListener('beforeinstallprompt', listener);
  }, []);

  // 订阅锁定反馈状态
  const constraintAlert = useSyncExternalStore(
    constraintFeedback.subscribe,
    constraintFeedback.getAlert,
    constraintFeedback.getAlert
  );
  const activeShakeAxis = useSyncExternalStore(
    constraintFeedback.subscribe,
    constraintFeedback.getShakeAxis,
    constraintFeedback.getShakeAxis
  );

  const handleTabChange = (newTab: NavigationTab) => {
    session.pause();
    setTab(newTab);
  };

  const handleOpenFreeFlight = () => {
    session.pause();
    useSession.setState({ panel: 'free' });
  };

  const isFlying = flight.status === 'flying';
  const isCockpit =
    tab === 'mission' &&
    ((activeProgram === 'docking' && session.activeLevel > 0) ||
     (activeProgram === 'liftoff' && liftoffActiveLevel > 0));

  if (session.screen === 'home') {
    return (
      <HomeView
        onEnterSimulator={(taskId = 2, scenarioId = 'iss-standard') => {
          if (taskId === 1) {
            setActiveProgram('liftoff');
            setLiftoffVehicleId('saturn-v');
            setLiftoffActiveLevel(1);
          } else if (taskId === 3) {
            setActiveProgram('departure');
          } else if (taskId === 4) {
            setActiveProgram('landing');
          } else {
            setActiveProgram('docking');
          }
          setTab('mission');
          session.setScreen('simulator');
          useSession.setState({ activeLevel: taskId === 1 ? 1 : 0 });
        }}
      />
    );
  }

  return (
    <div className={`app-shell ${isCockpit ? 'cockpit-screen' : ''} ${isFlying && tab === 'mission' ? 'in-flight' : ''}`}>
      <Topbar
        currentTab={tab}
        onTabChange={handleTabChange}
        canInstall={Boolean(installEvent)}
        onPromptInstall={() => void installEvent?.prompt()}
        onOpenInstallHelp={() => setInstallHelpOpen(true)}
        onReturnHome={() => {
          session.setScreen('home');
          setLiftoffActiveLevel(0);
        }}
      />

      {activeProgram === 'liftoff' && tab === 'mission' ? (
        <LiftoffWorkspace
          initialVehicleId={liftoffVehicleId}
          initialActiveLevel={liftoffActiveLevel}
          isOpenMobile={mobileMenuOpen}
          onToggleMobile={() => setMobileMenuOpen(!mobileMenuOpen)}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onActiveLevelChange={setLiftoffActiveLevel}
        />
      ) : activeProgram === 'departure' && tab === 'mission' ? (
        <DepartureWorkspace
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      ) : activeProgram === 'landing' && tab === 'mission' ? (
        <LandingWorkspace
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      ) : (
        <>
          <Sidebar
            isOpenMobile={mobileMenuOpen}
            onSelectMission={(id) => {
              if (id === 0) {
                session.pause();
                useSession.setState({ activeLevel: 0 });
              } else {
                session.select(id);
                useSession.setState({ activeLevel: id });
              }
              setTab('mission');
              setMobileMenuOpen(false);
            }}
            onOpenFreeFlight={handleOpenFreeFlight}
            onOpenGuide={() => handleTabChange('guide')}
          />

          <main>
            <button
              className="mobile-course"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Layers3 size={16} />
              {session.activeLevel === 0 ? t('00 任务通识 · 阶段认知', '00 Stage Briefing') : t('选择训练任务', 'Choose a mission')}
              <ChevronRight size={14} />
            </button>

            {storageError && (
              <div className="notice">
                {t(
                  '本地存储不可用，本次进度只能保留到页面关闭。',
                  'Local storage is unavailable. Progress lasts for this session only.'
                )}
              </div>
            )}

            {tab === 'mission' ? (
              session.activeLevel === 0 ? (
                <MissionZeroView
                  onStartFlight={() => {
                    session.select(1);
                    useSession.setState({ activeLevel: 1 });
                  }}
                />
              ) : (
                <MissionView
                  constraintAlert={constraintAlert}
                  activeShakeAxis={activeShakeAxis}
                  onOpenBriefing={() => {
                    session.pause();
                    useSession.setState({ panel: 'brief' });
                  }}
                />
              )
            ) : tab === 'log' ? (
              <FlightLog />
            ) : (
              <FieldGuide />
            )}

            <AppFooter
              offlineReady={offlineReady}
              needRefresh={needRefresh}
              onUpdateApp={() => void updateServiceWorker(true)}
            />
          </main>
        </>
      )}

      {/* 弹窗集中装配 */}

      {panel === 'brief' && (
        <Modal
          title={t('通关攻略', 'Mission briefing')}
          onClose={() => useSession.setState({ panel: 'none' })}
        >
          <BriefingModal onStartFlight={() => session.start()} />
        </Modal>
      )}

      {panel === 'review' && (
        <Modal
          title={session.demo ? t('示范复盘', 'Demo debrief') : t('任务复盘', 'Flight debrief')}
          onClose={() => useSession.setState({ panel: 'none' })}
        >
          <ReviewModal />
        </Modal>
      )}

      {panel === 'free' && (
        <Modal
          title={t('自由飞行实验室', 'Free-flight lab')}
          onClose={() => useSession.setState({ panel: 'none' })}
        >
          <FreeFlightModal onStart={() => setTab('mission')} />
        </Modal>
      )}

      {panel === 'intro' && (
        <Modal
          title={t('空间站对接图解导引', 'Docking visual guide')}
          onClose={() => useSession.getState().closeIntro()}
          className="intro-modal"
        >
          <IntroTour />
        </Modal>
      )}

      {installHelpOpen && (
        <Modal
          title={t('安装 Vector Align', 'Install Vector Align')}
          onClose={() => setInstallHelpOpen(false)}
        >
          <InstallHelpModal offlineReady={offlineReady} />
        </Modal>
      )}
    </div>
  );
}
