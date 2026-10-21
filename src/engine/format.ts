import { CURRENCIES } from './defaults';
import type { Currency } from './types';

/**
 * Exact currency, grouped for the locale (en-IN gives lakh/crore grouping).
 *
 * Every figure in a before/after equation uses this. Abbreviated values are for
 * headline tiles only: printing an equation in abbreviated form is how the old
 * build ended up showing sums that visibly did not add up.
 */
export function money(n: number, currency: Currency): string {
  const cfg = CURRENCIES[currency];
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${cfg.symbol}${Math.abs(rounded).toLocaleString(cfg.locale)}`;
}

/**
 * Short currency for headline tiles. INR uses lakh/crore, USD uses K/M.
 *
 * Never use this inside an equation or a line item that has to reconcile with
 * a total — the rounding is lossy by design.
 */
export function moneyShort(n: number, currency: Currency): string {
  const cfg = CURRENCIES[currency];
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const s = cfg.symbol;

  if (currency === 'INR') {
    if (abs >= 10_000_000) return `${sign}${s}${trim(abs / 10_000_000)} Cr`;
    if (abs >= 100_000) return `${sign}${s}${trim(abs / 100_000)} L`;
    if (abs >= 1_000) return `${sign}${s}${trim(abs / 1_000)}K`;
    return `${sign}${s}${Math.round(abs)}`;
  }

  if (abs >= 1_000_000) return `${sign}${s}${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${s}${trim(abs / 1_000)}K`;
  return `${sign}${s}${Math.round(abs)}`;
}

/** One decimal, but drop a trailing .0 so tiles read 18L rather than 18.0L. */
function trim(n: number): string {
  const fixed = n.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

export function percent(n: number, decimals = 0): string {
  return `${n.toFixed(decimals)}%`;
}

export function rate01AsPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** "3.4x" — return on Fabric spend. */
export function multiple(n: number | null): string {
  if (n === null) return '—';
  return `${n.toFixed(1)}×`;
}

export function hours(n: number): string {
  if (n < 1) return `${Math.round(n * 60)} min`;
  if (n < 10) return `${n.toFixed(1)} hrs`;
  return `${Math.round(n).toLocaleString('en-US')} hrs`;
}

export function days(n: number): string {
  return n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString('en-US');
}

export function currencySymbol(currency: Currency): string {
  return CURRENCIES[currency].symbol;
}
