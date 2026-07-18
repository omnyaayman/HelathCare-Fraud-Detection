/* Shared formatting helpers.
 *
 * These centralize number/currency/date/score formatting that was previously
 * duplicated across dashboard and table pages.
 */

/** Coerce any value to a finite number, falling back to 0. */
export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Clamp a fraud score into the 0–1 range.
 * Values greater than 1 are treated as percentages (e.g. 85 -> 0.85).
 */
export function clampScore(value) {
  const n = toNumber(value);
  if (n > 1) return Math.min(n / 100, 1);
  return Math.min(Math.max(n, 0), 1);
}

/** Format a clamped fraud score as a percentage string, e.g. "72.0%". */
export function formatScore(value, digits = 1) {
  return `${(clampScore(value) * 100).toFixed(digits)}%`;
}

/** Format a value as USD currency, e.g. "$1,234". */
export function formatCurrency(value, { minimumFractionDigits = 0, maximumFractionDigits = 0 } = {}) {
  return toNumber(value).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

/** Format a value as compact USD currency, e.g. "$1.2M". */
export function formatCompactCurrency(value, maximumFractionDigits = 1) {
  return toNumber(value).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits,
  });
}

/** Format a value as a grouped integer/number, e.g. "1,234". */
export function formatNumber(value) {
  return toNumber(value).toLocaleString('en-US');
}

/** Parse a value into a valid Date, or null when missing/invalid. */
export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Localized medium date, e.g. "Jul 18, 2026". Returns `fallback` if invalid. */
export function formatDate(value, fallback = 'N/A') {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : fallback;
}

/** Localized date and time. Returns `fallback` if invalid. */
export function formatDateTime(value, fallback = 'N/A') {
  const d = parseDate(value);
  return d ? d.toLocaleString() : fallback;
}

/** ISO calendar date (YYYY-MM-DD); defaults to today. */
export function toISODate(value = new Date()) {
  const d = parseDate(value) || new Date();
  return d.toISOString().slice(0, 10);
}
