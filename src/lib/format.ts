/**
 * Number formatting helpers. Every displayed number in the app goes through one
 * of these so rounding and separators are consistent. English is the only
 * shipped locale; the locale is centralized here so it can follow i18n later.
 */
let locale = 'en-US';

/** Update the locale used by the formatters (called when the language changes). */
export function setFormatLocale(next: string) {
  locale = next || 'en-US';
}

/** A fraction in 0–1 rendered as a percentage, e.g. 0.671 → "67%". */
export function formatPercent(fraction: number, digits = 0): string {
  if (!Number.isFinite(fraction)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(fraction);
}

/** A raw percentage value (already in %), e.g. 6.5 → "6.5%". */
export function formatRate(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  const n = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
  return `${n}%`;
}

/** A growth multiple like 4.1× (1 decimal below 100, whole numbers above). */
export function formatMultiple(x: number): string {
  if (!Number.isFinite(x)) return '∞×';
  if (x >= 100) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(x)}×`;
  const rounded = Math.round(x * 10) / 10;
  const digits = Number.isInteger(rounded) ? 0 : 1;
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(rounded)}×`;
}

/** The Gini coefficient to two decimals, e.g. 0.62. */
export function formatGini(x: number): string {
  if (!Number.isFinite(x)) return '—';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(x);
}

/** A plain integer with thousands separators. */
export function formatInt(x: number): string {
  if (!Number.isFinite(x)) return '—';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(x);
}

/**
 * A currency amount in compact form, e.g. 158e12 → "$158T" (en) / "158 Bio. €"
 * scale (de). The magnitude suffix is localized by Intl; the symbol is prefixed.
 */
export function formatCurrencyCompact(value: number, symbol: string): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const magnitude = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.abs(value));
  return `${sign}${symbol}${magnitude}`;
}

/** A household/people count in compact form, e.g. 1_986_975 → "2M", 62_802 → "63K". */
export function formatCountCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1000) return formatInt(n);
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}
