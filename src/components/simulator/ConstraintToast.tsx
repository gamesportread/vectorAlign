import { AlertTriangle } from 'lucide-react';
import type { ActiveAlert } from '../../sim/feedback';

export interface ConstraintToastProps {
  alert: ActiveAlert | null;
}

export function ConstraintToast({ alert }: ConstraintToastProps) {
  if (!alert) return null;

  return (
    <div
      className={`hud-constraint-toast ${alert.exiting ? 'exiting' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className="hud-constraint-icon">
        <AlertTriangle size={14} />
      </div>
      <div className="hud-constraint-text">
        <strong>{alert.title}</strong>
        <span>{alert.hint}</span>
      </div>
    </div>
  );
}
