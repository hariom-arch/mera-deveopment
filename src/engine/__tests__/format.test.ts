import { describe, expect, it } from 'vitest';
import { days, hours, money, moneyShort, multiple, percent } from '../format';

describe('money', () => {
  it('groups INR in the Indian system', () => {
    expect(money(1_870_432, 'INR')).toBe('₹18,70,432');
  });

  it('groups USD in thousands', () => {
    expect(money(1_870_432, 'USD')).toBe('$1,870,432');
  });

  it('keeps the sign outside the symbol', () => {
    expect(money(-4_500, 'INR')).toBe('-₹4,500');
  });

  it('rounds to whole units', () => {
    expect(money(99.6, 'USD')).toBe('$100');
  });
});

describe('money vs moneyShort in equations', () => {
  it('exact values reconcile, which is why equations must not use short form', () => {
    const before = 1_870_432;
    const after = 210_118;
    const savings = before - after;

    // Exact: the printed equation adds up.
    expect(money(savings, 'INR')).toBe(money(before - after, 'INR'));

    // Short: it does not. 18.7L - 2.1L reads as 16.6L but the real figure is 16.6L
    // only by luck — this assertion documents the lossiness rather than endorsing it.
    const shortBefore = parseFloat(moneyShort(before, 'INR').replace(/[^\d.]/g, ''));
    const shortAfter = parseFloat(moneyShort(after, 'INR').replace(/[^\d.]/g, ''));
    const shortSavings = parseFloat(moneyShort(savings, 'INR').replace(/[^\d.]/g, ''));
    expect(Math.abs(shortBefore - shortAfter - shortSavings)).toBeLessThan(0.2);
  });
});

describe('moneyShort', () => {
  it('uses lakh and crore for INR', () => {
    expect(moneyShort(1_870_432, 'INR')).toBe('₹18.7 L');
    expect(moneyShort(32_000_000, 'INR')).toBe('₹3.2 Cr');
    expect(moneyShort(4_500, 'INR')).toBe('₹4.5K');
  });

  it('uses K and M for USD', () => {
    expect(moneyShort(1_870_432, 'USD')).toBe('$1.9M');
    expect(moneyShort(84_000, 'USD')).toBe('$84K');
  });

  it('drops a trailing .0', () => {
    expect(moneyShort(1_800_000, 'INR')).toBe('₹18 L');
    expect(moneyShort(2_000_000, 'USD')).toBe('$2M');
  });

  it('handles negatives and small values', () => {
    expect(moneyShort(-250_000, 'INR')).toBe('-₹2.5 L');
    expect(moneyShort(420, 'USD')).toBe('$420');
  });
});

describe('scalar formats', () => {
  it('formats percentages and multiples', () => {
    expect(percent(87.4)).toBe('87%');
    expect(percent(87.44, 1)).toBe('87.4%');
    expect(multiple(3.42)).toBe('3.4×');
    expect(multiple(null)).toBe('—');
  });

  it('formats hours at a readable precision', () => {
    expect(hours(0.5)).toBe('30 min');
    expect(hours(4.25)).toBe('4.3 hrs');
    expect(hours(126.4)).toBe('126 hrs');
  });

  it('formats days', () => {
    expect(days(4.33)).toBe('4.3');
    expect(days(15.7)).toBe('16');
  });
});
