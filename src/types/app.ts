export type NavigationTab = 'mission' | 'log' | 'guide';
export type AppScreen = 'home' | 'simulator';

export interface PWAInstallState {
  canInstall: boolean;
  offlineReady: boolean;
  needRefresh: boolean;
  promptInstall: () => Promise<void>;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}
