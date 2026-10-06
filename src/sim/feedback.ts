import type { Language, ScenarioConfig } from './types';

export interface ConstraintMessage {
  title: string;
  hint: string;
  full: string;
  axis: 'translation' | 'rotation';
  index: number;
}

export interface ActiveAlert extends ConstraintMessage {
  id: number;
  exiting: boolean;
}

/** Check whether a given control axis is locked under the scenario constraints. */
export function isAxisLocked(
  config: ScenarioConfig,
  axis: 'translation' | 'rotation',
  index: number
): boolean {
  if (axis === 'rotation') {
    return !config.rotation;
  }
  return !config.translation[index];
}

/** Generate user-friendly, context-aware bilingual feedback copy. */
export function getConstraintMessage(
  config: ScenarioConfig,
  axis: 'translation' | 'rotation',
  index: number,
  lang: Language
): ConstraintMessage {
  const isZh = lang === 'zh';

  if (config.id === 1) {
    if (axis === 'rotation') {
      return {
        axis,
        index,
        title: isZh ? '姿态控制已锁定' : 'Attitude Control Locked',
        hint: isZh ? '当前关卡仅开放前后平移 (R / F)' : 'Forward / backward thrust only in this mission (R / F)',
        full: isZh
          ? '当前关卡姿态已锁定，仅开放前后平移'
          : 'Attitude locked for this mission · Forward/backward translation only'
      };
    }
    const axisNameZh = index === 0 ? '横向移动' : index === 1 ? '垂直移动' : '平移';
    const axisNameEn = index === 0 ? 'Lateral translation' : index === 1 ? 'Vertical translation' : 'Translation';
    return {
      axis,
      index,
      title: isZh ? `${axisNameZh}已锁定` : `${axisNameEn} Locked`,
      hint: isZh ? '当前关卡仅开放前后平移 (R / F)' : 'Forward / backward thrust only in this mission (R / F)',
      full: isZh
        ? `当前关卡${axisNameZh}已锁定，仅开放前后平移`
        : `${axisNameEn} locked for this mission · Forward/backward translation only`
    };
  }

  if (config.id === 2) {
    if (axis === 'rotation') {
      return {
        axis,
        index,
        title: isZh ? '姿态控制已锁定' : 'Attitude Control Locked',
        hint: isZh ? '当前关卡仅开放上下左右平移 (A / D, W / S)' : 'Lateral & vertical thrust only (A / D, W / S)',
        full: isZh
          ? '当前关卡姿态已锁定，仅开放横向与垂直平移'
          : 'Attitude locked for this mission · Lateral translation only'
      };
    }
    if (index === 2) {
      return {
        axis,
        index,
        title: isZh ? '轴向距离已固定为 12 米' : 'Distance Held at 12 m',
        hint: isZh ? '当前关卡仅开放上下左右平移消除漂移' : 'Lateral & vertical thrust only to cancel sideways drift',
        full: isZh
          ? '当前关卡距离已固定为 12 米，仅开放横向与垂直平移'
          : 'Distance locked at 12 m · Lateral translation only'
      };
    }
  }

  if (config.id === 3) {
    if (axis === 'translation') {
      return {
        axis,
        index,
        title: isZh ? '平移推进已锁定' : 'Translation Locked',
        hint: isZh ? '位置固定在 8 米，仅开放姿态对准 (方向键 / Q / E)' : 'Position held at 8 m · Attitude alignment only (Arrows / Q / E)',
        full: isZh
          ? '当前关卡平移已锁定，仅开放姿态对准'
          : 'Translation locked for this mission · Attitude control only'
      };
    }
  }

  // Fallback for custom or unexpected configurations
  if (axis === 'rotation') {
    return {
      axis,
      index,
      title: isZh ? '姿态控制已锁定' : 'Attitude Control Locked',
      hint: config.constraints[lang],
      full: isZh ? '当前关卡姿态已锁定' : 'Attitude control locked for current mission'
    };
  }

  const defaultAxisNameZh = ['横向', '垂直', '前后'][index] ?? '';
  const defaultAxisNameEn = ['Lateral', 'Vertical', 'Axial'][index] ?? '';
  return {
    axis,
    index,
    title: isZh ? `${defaultAxisNameZh}平移已锁定` : `${defaultAxisNameEn} Translation Locked`,
    hint: config.constraints[lang],
    full: isZh ? `${defaultAxisNameZh}平移已锁定` : `${defaultAxisNameEn} translation locked`
  };
}

/** Controller managing debounce, auto-dismiss, shake animations, and audio throttling. */
export class ConstraintFeedbackController {
  private lastTriggerTime = 0;
  private lastAudioTime = 0;
  private alertTimer: any = null;
  private exitTimer: any = null;
  private shakeTimer: any = null;
  private alertId = 0;

  public activeAlert: ActiveAlert | null = null;
  public activeShakeAxis: string | null = null;

  public repeatThrottleMs = 200;
  public audioCooldownMs = 400;
  public toastDurationMs = 2400;
  public exitDurationMs = 250;
  public shakeDurationMs = 450;

  private listeners = new Set<() => void>();

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getAlert = (): ActiveAlert | null => {
    return this.activeAlert;
  };

  public getShakeAxis = (): string | null => {
    return this.activeShakeAxis;
  };

  /**
   * Attempt to trigger feedback for an axis.
   * Returns true if the feedback was accepted, or false if debounced/suppressed.
   */
  public trigger(
    config: ScenarioConfig,
    axis: 'translation' | 'rotation',
    index: number,
    lang: Language,
    onSound?: () => void
  ): boolean {
    if (!isAxisLocked(config, axis, index)) {
      return false;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsedSinceLast = now - this.lastTriggerTime;

    // Suppress rapid repeated keydown events (e.g. key holding down)
    if (elapsedSinceLast < this.repeatThrottleMs) {
      return false;
    }
    this.lastTriggerTime = now;

    // Throttle audio feedback to prevent harsh clipping
    if (now - this.lastAudioTime >= this.audioCooldownMs) {
      this.lastAudioTime = now;
      if (onSound) {
        onSound();
      }
    }

    const msg = getConstraintMessage(config, axis, index, lang);
    const axisKey = `${axis}-${index}`;

    // Restart shake animation
    if (this.shakeTimer) {
      clearTimeout(this.shakeTimer);
    }
    this.activeShakeAxis = axisKey;
    this.shakeTimer = setTimeout(() => {
      this.activeShakeAxis = null;
      this.notify();
    }, this.shakeDurationMs);

    // Refresh or present toast
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
    }
    if (this.exitTimer) {
      clearTimeout(this.exitTimer);
    }

    this.alertId += 1;
    this.activeAlert = {
      ...msg,
      id: this.alertId,
      exiting: false
    };
    this.notify();

    // Auto-dismiss after toastDurationMs
    this.alertTimer = setTimeout(() => {
      if (this.activeAlert) {
        this.activeAlert = { ...this.activeAlert, exiting: true };
        this.notify();
        this.exitTimer = setTimeout(() => {
          this.activeAlert = null;
          this.notify();
        }, this.exitDurationMs);
      }
    }, this.toastDurationMs);

    return true;
  }

  public clear() {
    if (this.alertTimer) clearTimeout(this.alertTimer);
    if (this.exitTimer) clearTimeout(this.exitTimer);
    if (this.shakeTimer) clearTimeout(this.shakeTimer);
    this.activeAlert = null;
    this.activeShakeAxis = null;
    this.lastTriggerTime = 0;
    this.lastAudioTime = 0;
    this.notify();
  }
}

export const constraintFeedback = new ConstraintFeedbackController();
