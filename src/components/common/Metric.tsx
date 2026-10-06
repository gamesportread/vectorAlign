export interface MetricProps {
  label: string;
  value: string;
  unit: string;
  detail: string;
  accent?: boolean;
  fuel?: number;
}

export function Metric({ label, value, unit, detail, accent, fuel }: MetricProps) {
  return (
    <div className={`metric ${accent ? 'accent' : ''}`}>
      <span className="metric-label">{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      <span className="metric-detail">{detail}</span>
      {fuel !== undefined && (
        <div className="fuel-track">
          <i style={{ width: `${Math.max(0, Math.min(100, fuel))}%` }} />
        </div>
      )}
    </div>
  );
}
