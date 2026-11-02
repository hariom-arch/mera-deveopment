import { describe, expect, it } from 'vitest';
import { ConfigError, assumptionsFrom, inputsFrom, validateConfig } from '../config';
import { DEFAULT_ASSUMPTIONS } from '../defaults';
import type { PilotConfig } from '../config';

const valid = (): Record<string, unknown> => ({
  client: { name: 'Acme Corp', function: 'Engineering', poc: 'Priya S' },
  currency: 'INR',
  rates: { recruiterSalary: 900_000, interviewerSalary: 2_400_000, numRecruiters: 2 },
  successMetric: { id: 'shortlist-quality', target: 40, baseline: 28 },
});

describe('validateConfig', () => {
  it('accepts a complete config', () => {
    expect(() => validateConfig(valid())).not.toThrow();
  });

  it('rejects a non-object', () => {
    expect(() => validateConfig(null)).toThrow(ConfigError);
    expect(() => validateConfig('nope')).toThrow(ConfigError);
  });

  it('requires a client name, since it is printed on the cover', () => {
    const c = { ...valid(), client: { name: '  ' } };
    expect(() => validateConfig(c)).toThrow(/client.name is required/);
  });

  it('requires a supported currency', () => {
    expect(() => validateConfig({ ...valid(), currency: 'EUR' })).toThrow(/currency must be/);
  });

  it('requires the client salaries, rather than defaulting them', () => {
    const { rates: _omit, ...rest } = valid();
    expect(() => validateConfig(rest)).toThrow(/rates is required/);
  });

  it('rejects non-positive salary figures', () => {
    const c = { ...valid(), rates: { recruiterSalary: 0, interviewerSalary: -1, numRecruiters: 2 } };
    expect(() => validateConfig(c)).toThrow(/must be a positive number/);
  });

  it('rejects an unknown success metric and lists the valid ones', () => {
    const c = { ...valid(), successMetric: { id: 'vibes' } };
    expect(() => validateConfig(c)).toThrow(/not a known metric/);
    expect(() => validateConfig(c)).toThrow(/shortlist-quality/);
  });

  it('refuses a metric whose required outcome is missing', () => {
    const c = { ...valid(), successMetric: { id: 'cost-per-hire' } };
    expect(() => validateConfig(c)).toThrow(/needs outcomes.hiresMade/);
  });

  it('accepts that metric once the outcome is supplied', () => {
    const c = { ...valid(), successMetric: { id: 'cost-per-hire' }, outcomes: { hiresMade: 6 } };
    expect(() => validateConfig(c)).not.toThrow();
  });

  it('reports every problem at once rather than one per run', () => {
    try {
      validateConfig({ client: {}, currency: 'EUR', successMetric: { id: 'nope' } });
      throw new Error('should have thrown');
    } catch (e) {
      const err = e as ConfigError;
      expect(err).toBeInstanceOf(ConfigError);
      expect(err.problems.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('rejects a non-numeric target', () => {
    const c = { ...valid(), successMetric: { id: 'shortlist-quality', target: 'high' } };
    expect(() => validateConfig(c)).toThrow(/must be a number/);
  });
});

describe('assumptionsFrom', () => {
  it('uses the defaults when no overrides are given', () => {
    const a = assumptionsFrom(validateConfig(valid()) as PilotConfig);
    expect(a.funnel).toEqual(DEFAULT_ASSUMPTIONS.funnel);
    expect(a.effort).toEqual(DEFAULT_ASSUMPTIONS.effort);
  });

  it('applies the currency list price', () => {
    const inr = assumptionsFrom(validateConfig(valid()) as PilotConfig);
    const usd = assumptionsFrom(
      validateConfig({
        ...valid(),
        currency: 'USD',
        rates: { recruiterSalary: 85_000, interviewerSalary: 190_000, numRecruiters: 2 },
      }) as PilotConfig,
    );
    expect(inr.rates.costPerInterview).toBe(300);
    expect(usd.rates.costPerInterview).toBe(4);
  });

  it('merges a partial override without dropping its siblings', () => {
    const c = validateConfig({
      ...valid(),
      assumptions: { effort: { round1Minutes: 90 }, coverage: { round1: 0.5 } },
    }) as PilotConfig;
    const a = assumptionsFrom(c);
    expect(a.effort.round1Minutes).toBe(90);
    expect(a.effort.resumeReviewMinutes).toBe(DEFAULT_ASSUMPTIONS.effort.resumeReviewMinutes);
    expect(a.coverage.round1).toBe(0.5);
    expect(a.coverage.phoneScreening).toBe(1);
  });

  it('lets a pilot override the interview price', () => {
    const c = validateConfig({
      ...valid(),
      assumptions: { rates: { costPerInterview: 250 } },
    }) as PilotConfig;
    expect(assumptionsFrom(c).rates.costPerInterview).toBe(250);
    expect(assumptionsFrom(c).rates.workingHoursPerMonth).toBe(176);
  });
});

describe('inputsFrom', () => {
  it('carries the client salaries into the model', () => {
    const i = inputsFrom(validateConfig(valid()) as PilotConfig);
    expect(i).toMatchObject({
      currency: 'INR',
      recruiterSalary: 900_000,
      interviewerSalary: 2_400_000,
      numRecruiters: 2,
    });
  });
});
