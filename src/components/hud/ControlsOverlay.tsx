import { useState } from 'react';
import { DoorClosed, DoorOpen, HelpCircle, Loader2 } from 'lucide-react';
import { useSession } from '../../store';
import type { HatchState } from '../../sim/types';

export interface ControlsOverlayProps {
  className?: string;
}

export function ControlsOverlay({ className = '' }: ControlsOverlayProps) {
  const language = useSession((s) => s.language);
  const hatch = useSession((s) => s.hatch);
  const toggleHatch = useSession((s) => s.toggleHatch);
  const [showTooltip, setShowTooltip] = useState(false);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);

  const getHatchLabel = (state: HatchState) => {
    switch (state) {
      case 'closed':
        return t('舱门: 已关闭 [按 1 开启]', 'Hatch: Closed [Press 1]');
      case 'opening':
        return t('舱门: 正在开启...', 'Hatch: Opening...');
      case 'open':
        return t('舱门: 已打开 (可对接)', 'Hatch: Open (Ready to dock)');
      case 'closing':
        return t('舱门: 正在关闭...', 'Hatch: Closing...');
    }
  };

  const getHatchIcon = (state: HatchState) => {
    switch (state) {
      case 'closed':
        return <DoorClosed size={16} className="hatch-icon closed" />;
      case 'opening':
      case 'closing':
        return <Loader2 size={16} className="hatch-icon spinning" />;
      case 'open':
        return <DoorOpen size={16} className="hatch-icon open" />;
    }
  };

  const isTransitioning = hatch.state === 'opening' || hatch.state === 'closing';

  return (
    <div className={`hud-controls-overlay ${className}`} role="region" aria-label={t('舱门控制', 'Hatch Controls')}>
      <div className="hatch-control-wrapper">
        <button
          type="button"
          className={`hatch-status-button state-${hatch.state}`}
          onClick={() => toggleHatch()}
          onPointerDown={(e) => {
            // Prevent taking focus away from canvas/controls while allowing touch click
            e.currentTarget.focus();
          }}
          title={t('点击开启/关闭舱门 (快捷键: 1)', 'Click to toggle hatch (Shortcut: 1)')}
          aria-label={getHatchLabel(hatch.state)}
          aria-pressed={hatch.state === 'open' || hatch.state === 'opening'}
        >
          <span className="hatch-icon-wrap">
            {getHatchIcon(hatch.state)}
          </span>
          <span className="hatch-text">
            {getHatchLabel(hatch.state)}
          </span>
          <span className="hatch-touch-badge">
            {t('轻触开合', 'TAP')}
          </span>
        </button>

        <button
          type="button"
          className="hatch-help-trigger"
          onClick={() => setShowTooltip((v) => !v)}
          title={t('关于头锥舱门的小知识', 'About nose cone hatch')}
          aria-label={t('舱门说明', 'Hatch info')}
        >
          <HelpCircle size={14} />
        </button>

        {showTooltip && (
          <div className="hatch-hud-tooltip">
            <p>
              <strong>{t('💡 为什么对接前必须开门？', '💡 Why open the hatch before docking?')}</strong>
            </p>
            <p>
              {t(
                '头锥保护罩（Nosecone Hatch）：就像飞船的头盔面罩！在穿过大气层发射时挡风挡热；到了太空准备对接空间站时，按下 [1] 键打开它，露出对接口（IDA），才能和空间站锁扣锁在一起！',
                'Nosecone Hatch: Just like a helmet visor for the spacecraft! It shields against heat and wind during launch; once in space, press [1] to open it, reveal the International Docking Adapter (IDA), and lock with the station!'
              )}
            </p>
            <p>
              {t(
                '国际对接口（IDA）：飞船头部的锁扣大门，带有高精度的锁扣环。打开头锥后，必须把对接口平稳对准空间站的 PMA-2 接口！',
                'International Docking Adapter (IDA): The docking doorway at the ship nose with precision latching rings. Once open, align it smoothly with the station’s PMA-2 port!'
              )}
            </p>
            <button
              type="button"
              className="hatch-tooltip-close"
              onClick={() => setShowTooltip(false)}
            >
              {t('知道了', 'Got it')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ControlsOverlay;
