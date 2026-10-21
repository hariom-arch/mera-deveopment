import { describe, expect, it } from 'vitest';
import { calculateRoi, hourlyRate, modelFunnel } from '../calc';
import { DEFAULT_ASSUMPTIONS, assumptionsForCurrency, defaultInputs } from '../defaults';
import type { ActualVolumes, Assumptions, TeamInputs } from '../types';

const A: Assumptions = DEFAULT_ASSUMPTIONS;
const base = (over: Partial<TeamInputs> = {}): TeamInputs => ({ ...defaultInputs('INR'), ...over });

describe('hourlyRate', () => {
  it('divides annual salary by 12 months and the monthly hours', () => {
    expect(hourlyRate(1_200_000, 176)).toBeCloseTo(100_000 / 176, 6);
  });

  it('returns 0 rather than Infinity when hours are zero', () => {
    expect(hourlyRate(1_200_000, 0)).toBe(0);
  });
});

describe('modelFunnel', () => {
  it('derives each stage from the one above it', () => {
    const v = modelFunnel(base({ hiresPerMonth: 10 }), A);
    expect(v.applications).toBe(600);
    expect(v.phoneScreens).toBe(150);
    expect(v.round1).toBe(60);
  });

  it('bills for the screens Fabric covers', () => {
    const half: Assumptions = { ...A, coverage: { ...A.coverage, phoneScreening: 0.5 } };
    expect(modelFunnel(base(), half).billableInterviews).toBe(75);
  });

  it('keeps funnel volumes fractional so printed arithmetic reconciles', () => {
    const odd: Assumptions = { ...A, funnel: { ...A.funnel, phoneScreenRate: 0.33 } };
    expect(modelFunnel(base({ hiresPerMonth: 1 }), odd).phoneScreens).toBeCloseTo(19.8, 6);
  });
});

describe('calculateRoi — the headline numbers', () => {
  it('measures savings against variable cost only, so headcount never moves them', () => {
    const one = calculateRoi(base({ numRecruiters: 1 }), A);
    const ten = calculateRoi(base({ numRecruiters: 10 }), A);

    expect(ten.monthlySavings).toBeCloseTo(one.monthlySavings, 6);
    expect(ten.savingsPct).toBeCloseTo(one.savingsPct, 6);
    expect(ten.roiMultiple!).toBeCloseTo(one.roiMultiple!, 6);
  });

  it('excludes recruiter payroll from the compared totals', () => {
    const r = calculateRoi(base({ numRecruiters: 4, recruiterSalary: 1_200_000 }), A);
    expect(r.recruiterPayrollMonthly).toBe(400_000);
    expect(r.baselineVariableCost).toBeLessThan(r.recruiterPayrollMonthly);
    // Payroll is reported for context but is in neither side of the comparison.
    expect(r.lines.some((l) => l.label.toLowerCase().includes('payroll'))).toBe(false);
  });

  it('reconciles: baseline - (residual + fabric) === monthlySavings', () => {
    const r = calculateRoi(base({ hiresPerMonth: 17 }), A);
    expect(r.withFabricVariableCost).toBeCloseTo(r.residualHumanCost + r.fabricCost, 6);
    expect(r.monthlySavings).toBeCloseTo(
      r.baselineVariableCost - r.withFabricVariableCost,
      6,
    );
  });

  it('sums the line baselines into baselineVariableCost', () => {
    const r = calculateRoi(base(), A);
    const summed = r.lines.reduce((t, l) => t + l.baseline, 0);
    expect(r.baselineVariableCost).toBeCloseTo(summed, 6);
  });

  it('reports ROI as return on Fabric spend, not on total cost', () => {
    const r = calculateRoi(base(), A);
    expect(r.roiMultiple).toBeCloseTo(r.monthlySavings / r.fabricCost, 6);
  });

  it('annualises as twelve months', () => {
    const r = calculateRoi(base(), A);
    expect(r.annualSavings).toBeCloseTo(r.monthlySavings * 12, 6);
  });

  it('prices Fabric at billable interviews x list price', () => {
    const r = calculateRoi(base({ hiresPerMonth: 10 }), A);
    expect(r.volumes.billableInterviews).toBe(150);
    expect(r.fabricCost).toBe(150 * 300);
  });
});

describe('calculateRoi — coverage honesty', () => {
  it('leaves the full human cost in place at zero coverage', () => {
    const none: Assumptions = {
      ...A,
      coverage: { resumeScreening: 0, phoneScreening: 0, round1: 0 },
    };
    const r = calculateRoi(base(), none);
    expect(r.residualHumanCost).toBeCloseTo(r.baselineVariableCost, 6);
    expect(r.fabricCost).toBe(0);
    expect(r.monthlySavings).toBeCloseTo(0, 6);
    expect(r.timeSaved.totalHours).toBeCloseTo(0, 6);
  });

  it('keeps a proportional residual at partial round 1 coverage', () => {
    const partial: Assumptions = { ...A, coverage: { ...A.coverage, round1: 0.5 } };
    const r = calculateRoi(base(), partial);
    const r1 = r.lines.find((l) => l.id === 'round1')!;
    expect(r1.residual).toBeCloseTo(r1.baseline * 0.5, 6);
  });

  it('can produce a negative saving when Fabric costs more than it replaces', () => {
    const pricey: Assumptions = {
      ...A,
      rates: { ...A.rates, costPerInterview: 500_000 },
    };
    const r = calculateRoi(base(), pricey);
    expect(r.monthlySavings).toBeLessThan(0);
    expect(r.roiMultiple).toBeLessThan(0);
  });
});

describe('calculateRoi — time saved', () => {
  it('splits recruiter and interviewer hours instead of pooling them', () => {
    const r = calculateRoi(base(), A);
    expect(r.timeSaved.recruiterHours).toBeGreaterThan(0);
    expect(r.timeSaved.interviewerHours).toBeGreaterThan(0);
    expect(r.timeSaved.totalHours).toBeCloseTo(
      r.timeSaved.recruiterHours + r.timeSaved.interviewerHours,
      6,
    );
  });

  it('attributes panel time to the interviewer and coordination to the recruiter', () => {
    const r = calculateRoi(base(), A);
    const r1 = r.lines.find((l) => l.id === 'round1')!;
    // 60 panels x 75 min interviewer, 60 x 15 min recruiter.
    expect(r1.interviewerHours).toBeCloseTo(60 * (75 / 60), 6);
    expect(r1.recruiterHours).toBeCloseTo(60 * (15 / 60), 6);
  });

  it('expresses freed recruiter time as a share of team capacity, not as a layoff', () => {
    const r = calculateRoi(base({ numRecruiters: 2 }), A);
    expect(r.timeSaved.recruiterCapacityFreedPct).toBeCloseTo(
      (r.timeSaved.recruiterHours / (2 * 176)) * 100,
      6,
    );
  });

  it('does not claim freed hours exceed what the baseline contained', () => {
    const r = calculateRoi(base(), A);
    const baselineHours = r.lines.reduce(
      (t, l) => t + l.recruiterHours + l.interviewerHours,
      0,
    );
    expect(r.timeSaved.totalHours).toBeLessThanOrEqual(baselineHours + 1e-9);
  });

  it('reports capacity as null when there are no recruiters to free', () => {
    expect(calculateRoi(base({ numRecruiters: 0 }), A).timeSaved.recruiterCapacityFreedPct)
      .toBeNull();
  });
});

describe('calculateRoi — actual pilot volumes', () => {
  const actuals: ActualVolumes = {
    applications: 1_240,
    fabricInterviews: 186,
    fabricInterviewsCleared: 92,
    round1Equivalents: 186,
    creditsUsed: 186,
  };

  it('prices observed volumes and marks them as actual', () => {
    const r = calculateRoi(base(), A, actuals);
    expect(r.volumes.source).toBe('actual');
    expect(r.volumes.applications).toBe(1_240);
    expect(r.volumes.phoneScreens).toBe(186);
    expect(r.fabricCost).toBe(186 * 300);
  });

  it('bills credits consumed rather than a modelled coverage rate', () => {
    const r = calculateRoi(base(), A, { ...actuals, creditsUsed: 150 });
    expect(r.fabricCost).toBe(150 * 300);
  });

  it('agrees with the calculator when the modelled funnel matches the actuals', () => {
    const inputs = base({ hiresPerMonth: 10 });
    const modelled = calculateRoi(inputs, A);
    const asActuals = calculateRoi(inputs, A, {
      applications: modelled.volumes.applications,
      fabricInterviews: modelled.volumes.phoneScreens,
      fabricInterviewsCleared: 0,
      round1Equivalents: modelled.volumes.round1,
      creditsUsed: modelled.volumes.billableInterviews,
    });

    // One engine, so the two modes cannot tell a client different stories.
    expect(asActuals.baselineVariableCost).toBeCloseTo(modelled.baselineVariableCost, 6);
    expect(asActuals.monthlySavings).toBeCloseTo(modelled.monthlySavings, 6);
    expect(asActuals.timeSaved.totalHours).toBeCloseTo(modelled.timeSaved.totalHours, 6);
  });
});

describe('calculateRoi — degenerate input', () => {
  it('returns zeroes rather than NaN at zero volume', () => {
    const r = calculateRoi(base({ hiresPerMonth: 0 }), A);
    expect(r.baselineVariableCost).toBe(0);
    expect(r.monthlySavings).toBe(0);
    expect(r.savingsPct).toBe(0);
    expect(r.roiMultiple).toBeNull();
  });

  it('survives zero working hours without producing Infinity', () => {
    const broken: Assumptions = { ...A, rates: { ...A.rates, workingHoursPerMonth: 0 } };
    const r = calculateRoi(base(), broken);
    expect(Number.isFinite(r.monthlySavings)).toBe(true);
    expect(r.timeSaved.recruiterCapacityFreedPct).toBeNull();
  });

  it('clamps out-of-range rates instead of trusting them', () => {
    const silly: Assumptions = {
      ...A,
      funnel: { ...A.funnel, phoneScreenRate: 3 },
      coverage: { ...A.coverage, round1: -1 },
    };
    const r = calculateRoi(base({ hiresPerMonth: 10 }), silly);
    expect(r.volumes.phoneScreens).toBe(600);
    const r1 = r.lines.find((l) => l.id === 'round1')!;
    expect(r1.residual).toBeCloseTo(r1.baseline, 6);
  });
});

describe('currency switching', () => {
  it('uses each market list price rather than converting one into the other', () => {
    const inr = calculateRoi(defaultInputs('INR'), assumptionsForCurrency(A, 'INR'));
    const usd = calculateRoi(defaultInputs('USD'), assumptionsForCurrency(A, 'USD'));
    expect(inr.fabricCost).toBe(150 * 300);
    expect(usd.fabricCost).toBe(150 * 4);
  });
});
