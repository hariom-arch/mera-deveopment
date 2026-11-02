import { describe, expect, it } from 'vitest';
import { calculateRoi } from '../calc';
import { parseFabricExport, summariseExport } from '../csv';
import { DEFAULT_ASSUMPTIONS, defaultInputs } from '../defaults';
import {
  SUCCESS_METRICS,
  evaluateMetric,
  formatMetric,
  missingRequirements,
  type MetricContext,
} from '../metrics';
import { SAMPLE_CSV } from '../../modes/pilot/sample';
import { MONTHLY_PERIOD } from '../types';

const summary = summariseExport(parseFabricExport(SAMPLE_CSV));
const inputs = { ...defaultInputs('INR'), numRecruiters: 2 };
const result = calculateRoi(inputs, DEFAULT_ASSUMPTIONS, summary.actuals);

const ctx = (over: Partial<MetricContext> = {}): MetricContext => ({
  summary,
  result,
  outcomes: {},
  numRecruiters: 2,
  period: MONTHLY_PERIOD,
  ...over,
});

describe('metric computation', () => {
  it('computes interview coverage from the export', () => {
    // 186 interviewed of 1240 applications.
    expect(SUCCESS_METRICS['interview-coverage'].compute(ctx())).toBeCloseTo(15, 1);
  });

  it('computes shortlist quality from the export', () => {
    // 92 cleared of 186 interviewed.
    expect(SUCCESS_METRICS['shortlist-quality'].compute(ctx())).toBeCloseTo(49.46, 1);
  });

  it('computes cost per shortlisted candidate from spend and clears', () => {
    const v = SUCCESS_METRICS['cost-per-shortlisted'].compute(ctx());
    expect(v).toBeCloseTo(result.withFabricVariableCost / 92, 6);
  });

  it('computes screening cost per hire from the supplied hire count', () => {
    const v = SUCCESS_METRICS['cost-per-hire'].compute(ctx({ outcomes: { hiresMade: 6 } }));
    expect(v).toBeCloseTo(result.withFabricVariableCost / 6, 6);
  });

  it('reads time to shortlist straight from the pilot outcomes', () => {
    expect(
      SUCCESS_METRICS['time-to-shortlist'].compute(ctx({ outcomes: { timeToShortlistDays: 4 } })),
    ).toBe(4);
  });

  it('scales throughput by the period rather than reporting a raw total', () => {
    const period = { label: 'pilot', months: 2 };
    expect(SUCCESS_METRICS.throughput.compute(ctx({ period }))).toBeCloseTo(93, 6);
  });

  it('returns zero rather than NaN when the denominator is empty', () => {
    const empty = summariseExport(parseFabricExport('"Snapshot Metrics"\nMetric,Value\n'));
    const c = ctx({ summary: empty });
    for (const def of Object.values(SUCCESS_METRICS)) {
      expect(Number.isFinite(def.compute(c))).toBe(true);
    }
  });
});

describe('missingRequirements', () => {
  it('names the outcome a metric cannot be computed without', () => {
    expect(missingRequirements('cost-per-hire', {})).toEqual(['hiresMade']);
    expect(missingRequirements('time-to-shortlist', {})).toEqual(['timeToShortlistDays']);
  });

  it('is satisfied once the outcome is supplied', () => {
    expect(missingRequirements('cost-per-hire', { hiresMade: 6 })).toEqual([]);
  });

  it('requires nothing for metrics the export already answers', () => {
    expect(missingRequirements('interview-coverage', {})).toEqual([]);
    expect(missingRequirements('shortlist-quality', {})).toEqual([]);
  });
});

describe('evaluateMetric — target and baseline', () => {
  it('passes a higher-is-better metric that clears its target', () => {
    const m = evaluateMetric({ id: 'shortlist-quality', target: 40 }, ctx());
    expect(m.metTarget).toBe(true);
  });

  it('fails a higher-is-better metric that misses its target', () => {
    const m = evaluateMetric({ id: 'shortlist-quality', target: 60 }, ctx());
    expect(m.metTarget).toBe(false);
  });

  it('inverts the comparison for a lower-is-better metric', () => {
    const under = evaluateMetric(
      { id: 'time-to-shortlist', target: 5 },
      ctx({ outcomes: { timeToShortlistDays: 4 } }),
    );
    const over = evaluateMetric(
      { id: 'time-to-shortlist', target: 5 },
      ctx({ outcomes: { timeToShortlistDays: 9 } }),
    );
    expect(under.metTarget).toBe(true);
    expect(over.metTarget).toBe(false);
  });

  it('reports a drop against baseline as an improvement when lower is better', () => {
    const m = evaluateMetric(
      { id: 'time-to-shortlist', baseline: 21 },
      ctx({ outcomes: { timeToShortlistDays: 4 } }),
    );
    expect(m.changeVsBaselinePct).toBeCloseTo(((4 - 21) / 21) * 100, 6);
    expect(m.improved).toBe(true);
  });

  it('reports a drop against baseline as a regression when higher is better', () => {
    const m = evaluateMetric({ id: 'shortlist-quality', baseline: 80 }, ctx());
    expect(m.improved).toBe(false);
    expect(m.changeVsBaselinePct!).toBeLessThan(0);
  });

  it('leaves target and baseline judgements undefined when none were set', () => {
    const m = evaluateMetric({ id: 'interview-coverage' }, ctx());
    expect(m.metTarget).toBeUndefined();
    expect(m.improved).toBeUndefined();
    expect(m.changeVsBaselinePct).toBeUndefined();
  });

  it('does not divide by a zero baseline', () => {
    const m = evaluateMetric({ id: 'interview-coverage', baseline: 0 }, ctx());
    expect(m.changeVsBaselinePct).toBeUndefined();
  });

  it('carries the basis string through for printing', () => {
    const m = evaluateMetric({ id: 'interview-coverage' }, ctx());
    expect(m.basis).toContain('1,240');
  });
});

describe('formatMetric', () => {
  const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  it('formats each unit for display', () => {
    expect(formatMetric(49.4, 'percent', money)).toBe('49%');
    expect(formatMetric(4, 'days', money)).toBe('4 days');
    expect(formatMetric(4.5, 'days', money)).toBe('4.5 days');
    expect(formatMetric(233, 'hours', money)).toBe('233 hrs');
    expect(formatMetric(1240, 'count', money)).toBe('1,240');
    expect(formatMetric(606.52, 'currency', money)).toBe('₹607');
  });
});

describe('every registered metric is complete', () => {
  it.each(Object.keys(SUCCESS_METRICS))('%s has label, question, unit and basis', (id) => {
    const def = SUCCESS_METRICS[id as keyof typeof SUCCESS_METRICS];
    expect(def.label.length).toBeGreaterThan(0);
    expect(def.question.length).toBeGreaterThan(0);
    expect(def.basis(ctx({ outcomes: { hiresMade: 6, timeToShortlistDays: 4 } })).length)
      .toBeGreaterThan(0);
    expect(['higher-is-better', 'lower-is-better']).toContain(def.direction);
  });
});
