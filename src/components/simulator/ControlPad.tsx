import { useSyncExternalStore } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, LockKeyhole, RotateCcw, RotateCw } from 'lucide-react';
import { constraintFeedback, isAxisLocked } from '../../sim/feedback';
import { getCommand, lockTone, notifyCommand, press, runtime, subscribeCommand, useSession } from '../../store';

export interface ControlPadProps {
  activeShakeAxis?: string | null;
}

export function ControlPad({ activeShakeAxis }: ControlPadProps) {
  const language = useSession((s) => s.language);
  const mode = useSession((s) => s.mode);
  const config = useSession((s) => s.config);
  const flight = useSession((s) => s.flight);
  const running = useSession((s) => s.running);
  const demo = useSession((s) => s.demo);

  const command = useSyncExternalStore(subscribeCommand, getCommand, getCommand);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const rotation = mode === 'rotate';
  const axis: 'translation' | 'rotation' = rotation ? 'rotation' : 'translation';
  const isFailed = flight.status === 'failed';

  const labels = rotation
    ? [t('俯仰', 'Pitch'), t('偏航', 'Yaw'), t('滚转', 'Roll')]
    : [t('左右', 'Lateral'), t('上下', 'Vertical'), t('前后', 'Forward')];

  const hints = rotation
    ? [['↑', '↓'], ['←', '→'], ['E', 'Q']]
    : [['A', 'D'], ['S', 'W'], ['R', 'F']];

  const handleDisabledClick = (axisType: 'translation' | 'rotation', index: number) => {
    constraintFeedback.trigger(config, axisType, index, language, lockTone);
  };

  return (
    <div className="control-groups">
      {[0, 1, 2].map((i) => {
        const isLocked = isAxisLocked(config, axis, i);
        const axisKey = `${axis}-${i}`;
        const isShaking = activeShakeAxis === axisKey;

        return (
          <div
            className={`control-group ${isShaking ? 'locked-shake' : ''}`}
            key={axisKey}
          >
            <span>
              {labels[i]}
              {isLocked && (
                <LockKeyhole
                  size={11}
                  className={isShaking ? 'lock-icon-pulse' : ''}
                />
              )}
            </span>

            <div>
              {[-1, 1].map((v, j) => {
                const isDisabled = !running || isFailed || demo || isLocked;
                const isFiring = running && !demo && !isLocked && command[axis][i] === v;

                return (
                  <button
                    key={v}
                    aria-label={`${labels[i]} ${v < 0 ? '-' : '+'}`}
                    disabled={isDisabled}
                    className={`${isFiring ? 'active-firing' : ''} ${isLocked ? 'btn-axis-locked' : ''}`}
                    onClick={() => {
                      if (isLocked) {
                        handleDisabledClick(axis, i);
                      }
                    }}
                    onPointerDown={(e) => {
                      if (isLocked) {
                        handleDisabledClick(axis, i);
                        return;
                      }
                      if (!running || demo) return;
                      e.preventDefault();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      press(axis, i, v);
                    }}
                    onPointerUp={() => press(axis, i, 0)}
                    onPointerCancel={() => press(axis, i, 0)}
                    onLostPointerCapture={() => press(axis, i, 0)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        if (isLocked) {
                          handleDisabledClick(axis, i);
                          return;
                        }
                        if (!running || demo) return;
                        e.preventDefault();
                        press(axis, i, v);
                      }
                    }}
                    onKeyUp={() => press(axis, i, 0)}
                  >
                    {rotation ? (
                      v < 0 ? <RotateCcw size={17} /> : <RotateCw size={17} />
                    ) : i === 0 ? (
                      v < 0 ? <ArrowLeft size={17} /> : <ArrowRight size={17} />
                    ) : i === 2 ? (
                      v < 0 ? <ArrowUp size={17} /> : <ArrowDown size={17} />
                    ) : (
                      v < 0 ? <ArrowDown size={17} /> : <ArrowUp size={17} />
                    )}
                    <kbd>{hints[i][j]}</kbd>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ControlPanelSection({ activeShakeAxis }: { activeShakeAxis?: string | null }) {
  const language = useSession((s) => s.language);
  const mode = useSession((s) => s.mode);
  const flight = useSession((s) => s.flight);
  const running = useSession((s) => s.running);
  const demo = useSession((s) => s.demo);
  const setMode = useSession((s) => s.setMode);
  const hatch = useSession((s) => s.hatch);
  const toggleHatch = useSession((s) => s.toggleHatch);

  const command = useSyncExternalStore(subscribeCommand, getCommand, getCommand);

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const isFailed = flight.status === 'failed';
  const isBraking = command.brake;
  const isFiring = command.translation.some((v) => v !== 0) || command.rotation.some((v) => v !== 0);

  return (
    <section className="control-panel">
      <div className="panel-heading">
        <h3>
          <span className="heading-icon">⌖</span>
          {t('飞行控制', 'Flight controls')}
          {isBraking ? (
            <span className="rcs-beacon-pill red">{t('制动', 'BRAKE')}</span>
          ) : isFiring ? (
            <span className="rcs-beacon-pill cyan">{t('推进', 'THRUST')}</span>
          ) : null}
        </h3>
        <div className="mode-tabs">
          <button
            className={mode === 'translate' ? 'active' : ''}
            onClick={() => setMode('translate')}
          >
            {t('平移', 'Translate')}
          </button>
          <button
            className={mode === 'rotate' ? 'active' : ''}
            onClick={() => setMode('rotate')}
          >
            {t('旋转', 'Rotate')}
          </button>
        </div>
      </div>

      <ControlPad activeShakeAxis={activeShakeAxis} />

      <div className="control-hint">
        <span>{t('按住施加推力 · 松开保持运动', 'HOLD TO THRUST · RELEASE TO COAST')}</span>
        <button
          className={`brake-button ${isBraking ? 'active-brake' : ''}`}
          disabled={!running || isFailed || demo}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            runtime.command.brake = true;
            notifyCommand();
          }}
          onPointerUp={() => {
            runtime.command.brake = false;
            notifyCommand();
          }}
          onPointerCancel={() => {
            runtime.command.brake = false;
            notifyCommand();
          }}
          onLostPointerCapture={() => {
            runtime.command.brake = false;
            notifyCommand();
          }}
        >
          <span>{t('空格', 'SPACE')}</span>
          {t('辅助制动', 'Assist brake')}
        </button>

        <button
          className={`hatch-pad-btn ${hatch.state === 'open' ? 'hatch-open' : ''}`}
          disabled={!running || isFailed || demo}
          onClick={() => toggleHatch()}
          title={t(
            '头锥保护罩（Nosecone Hatch）：就像飞船的头盔面罩！在穿过大气层发射时挡风挡热；到了太空准备对接空间站时，按下 [1] 键打开它，露出对接口（IDA），才能和空间站锁扣锁在一起！\n国际对接口（IDA）：飞船头部的锁扣大门，带有高精度的锁扣环。打开头锥后，必须把对接口平稳对准空间站的 PMA-2 接口！(快捷键: 1)',
            'Nosecone Hatch: Just like a helmet visor for the spacecraft! It shields against heat and wind during launch; once in space, press [1] to open it, reveal the International Docking Adapter (IDA), and lock with the station!\nInternational Docking Adapter (IDA): The docking doorway at the ship nose with precision latching rings. Once open, align it smoothly with the station’s PMA-2 port! (Hotkey: 1)'
          )}
        >
          <span>{t('按 1', 'KEY 1')}</span>
          {hatch.state === 'open'
            ? t('舱门: 已打开 (可对接)', 'Hatch: Open (Ready)')
            : hatch.state === 'opening'
            ? t('舱门: 正在开启...', 'Hatch: Opening...')
            : hatch.state === 'closing'
            ? t('舱门: 正在关闭...', 'Hatch: Closing...')
            : t('舱门: 已关闭 [按 1 开启]', 'Hatch: Closed [Press 1]')}
        </button>
      </div>
    </section>
  );
}
