/**
 * Format elapsed seconds into mm:ss display
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Format numbers with explicit sign (+ / -)
 */
export function formatSign(val: number, decimals = 1, unit = ''): string {
  const formatted = val.toFixed(decimals);
  const num = Number(formatted);
  const sign = num > 0 ? '+' : '';
  return `${sign}${formatted}${unit ? ' ' + unit : ''}`.trim();
}
