import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, LockKeyhole, RotateCcw, RotateCw } from 'lucide-react';
import { constraintFeedback, isAxisLocked } from '../../sim/feedback';
import { lockTone, press, runtime, useSession } from '../../store';

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

                return (
                  <button
                    key={v}
                    aria-label={`${labels[i]} ${v < 0 ? '-' : '+'}`}
                    disabled={isDisabled}
                    className={isLocked ? 'btn-axis-locked' : ''}
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
                      v < 0 ? <RotateCcw size={18} /> : <RotateCw size={18} />
                    ) : i === 0 ? (
                      v < 0 ? <ArrowLeft size={18} /> : <ArrowRight size={18} />
                    ) : i === 2 ? (
                      v < 0 ? <ArrowUp size={18} /> : <ArrowDown size={18} />
                    ) : (
                      v < 0 ? <ArrowDown size={18} /> : <ArrowUp size={18} />
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

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en);
  const isFailed = flight.status === 'failed';

  return (
    <section className="control-panel">
      <div className="panel-heading">
        <h3>
          <span className="heading-icon">⌖</span>
          {t('飞行控制', 'Flight controls')}
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
        {t('按住施加推力 · 松开保持运动', 'HOLD TO THRUST · RELEASE TO COAST')}
        <button
          className="brake-button"
          disabled={!running || isFailed || demo}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            runtime.command.brake = true;
          }}
          onPointerUp={() => {
            runtime.command.brake = false;
          }}
          onPointerCancel={() => {
            runtime.command.brake = false;
          }}
          onLostPointerCapture={() => {
            runtime.command.brake = false;
          }}
        >
          <span>{t('空格', 'SPACE')}</span>
          {t('辅助制动', 'Assist brake')}
        </button>
      </div>
    </section>
  );
}
