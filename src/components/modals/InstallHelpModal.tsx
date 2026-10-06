import { useSession } from '../../store';

export interface InstallHelpModalProps {
  offlineReady: boolean;
}

export function InstallHelpModal({ offlineReady }: InstallHelpModalProps) {
  const language = useSession((s) => s.language);
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  return (
    <>
      <p>
        {t(
          '电脑：使用 Chrome 或 Edge 地址栏的安装入口；macOS Safari 可选择“文件 → 添加到程序坞”。',
          'Desktop: use the install option in Chrome or Edge. In macOS Safari choose File → Add to Dock.'
        )}
      </p>
      <p>
        {t(
          'iPhone / iPad：打开分享菜单，选择“添加到主屏幕”。Android：打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。',
          'iPhone / iPad: open Share → Add to Home Screen. Android: open the browser menu → Install app or Add to home screen.'
        )}
      </p>
      <p className="modal-highlight">
        {offlineReady
          ? t(
              '全部核心课程资源已缓存，可离线训练。',
              'All core lesson assets are cached. You can train offline.'
            )
          : t(
              '请联网完成首次加载，看到“离线课程已就绪”后再离线使用。',
              'Stay connected through the first load. Wait for “Offline lessons ready” before going offline.'
            )}
      </p>
    </>
  );
}
