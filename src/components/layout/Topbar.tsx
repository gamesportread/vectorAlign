import { BookOpen, Download, Globe2, Home, Orbit, Radio, Volume2, VolumeX } from 'lucide-react';
import type { NavigationTab } from '../../types/app';
import { tone, useSession } from '../../store';

export interface TopbarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  canInstall: boolean;
  onPromptInstall: () => void;
  onOpenInstallHelp: () => void;
  onReturnHome?: () => void;
}

export function Topbar({
  currentTab,
  onTabChange,
  canInstall,
  onPromptInstall,
  onOpenInstallHelp,
  onReturnHome
}: TopbarProps) {
  const language = useSession((s) => s.language);
  const muted = useSession((s) => s.muted);
  const setLanguage = useSession((s) => s.setLanguage);
  const save = useSession((s) => s.save);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  const navItems: { tab: NavigationTab; icon: typeof Orbit; labelZh: string; labelEn: string }[] = [
    { tab: 'mission', icon: Orbit, labelZh: '任务训练', labelEn: 'Missions' },
    { tab: 'log', icon: Radio, labelZh: '飞行记录', labelEn: 'Flight log' },
    { tab: 'guide', icon: BookOpen, labelZh: '学习指南', labelEn: 'Field guide' }
  ];

  const handleToggleSound = () => {
    useSession.setState({ muted: !muted });
    save();
    tone();
  };

  return (
    <header className="topbar">
      <a 
        className="brand" 
        href="#" 
        onClick={(e) => {
          e.preventDefault();
          onReturnHome?.();
        }}
        aria-label="Vector Align home"
      >
        <img src="/favicon.svg" alt="" />
        <span>
          VECTOR<span className="brand-light">ALIGN</span>
        </span>
      </a>

      {onReturnHome && (
        <button
          className="home-return-btn"
          onClick={onReturnHome}
          aria-label={t('返回主菜单', 'Return to Main Menu')}
          title={t('返回任务主菜单', 'Return to Mission Menu')}
          style={{ marginLeft: -15 }}
        >
          <Home size={14} />
          <span>{t('主菜单', 'Menu')}</span>
        </button>
      )}

      <nav aria-label={t('主导航', 'Main navigation')}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.tab}
              className={currentTab === item.tab ? 'nav-active' : ''}
              onClick={() => onTabChange(item.tab)}
            >
              <Icon size={17} />
              {t(item.labelZh, item.labelEn)}
            </button>
          );
        })}
      </nav>

      <div className="header-actions">
        <button
          className="icon-button language"
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          aria-label="Switch language"
        >
          <Globe2 size={17} />
          {language === 'zh' ? '中文' : 'EN'}
        </button>

        <button
          className="icon-button"
          aria-label={t('安装应用', 'Install app')}
          onClick={() => (canInstall ? onPromptInstall() : onOpenInstallHelp())}
        >
          <Download size={18} />
        </button>

        <button
          className="icon-button"
          aria-label={t('声音开关', 'Toggle sound')}
          onClick={handleToggleSound}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </header>
  );
}
