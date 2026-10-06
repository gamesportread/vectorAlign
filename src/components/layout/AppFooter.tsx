import { useSession } from '../../store';

export interface AppFooterProps {
  offlineReady: boolean;
  needRefresh: boolean;
  onUpdateApp: () => void;
}

export function AppFooter({ offlineReady, needRefresh, onUpdateApp }: AppFooterProps) {
  const language = useSession((s) => s.language);
  const isRunning = useSession((s) => s.running);
  const flightStatus = useSession((s) => s.flight.status);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const showUpdateToast = needRefresh && !isRunning && flightStatus !== 'flying';

  return (
    <>
      <footer>
        <span>
          VECTOR ALIGN<span className="footer-dot">·</span>
          {t('空间站对接教学模拟器', 'SPACECRAFT DOCKING ACADEMY')}
        </span>
        <span>
          {offlineReady
            ? t('离线课程已就绪', 'OFFLINE LESSONS READY')
            : t('首次使用需联网加载', 'FIRST USE REQUIRES CONNECTION')}
        </span>
      </footer>

      {showUpdateToast && (
        <div className="update-toast">
          {t('新版本已就绪', 'An update is ready')}
          <button onClick={onUpdateApp}>{t('更新', 'Update')}</button>
        </div>
      )}
    </>
  );
}
