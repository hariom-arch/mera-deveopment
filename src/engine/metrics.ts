import type { ExportSummary } from './csv';
import type { ReportPeriod, RoiResult } from './types';

/**
 * The headline metric a pilot was actually run to prove.
 *
 * Every client signs a pilot to answer one question. A report that leads with
 * cost saved when the client cared about time to shortlist answers the wrong
 * question, however good the number is. The metric is chosen per pilot and
 * gets the top of the report.
 */
export type SuccessMetricId =
  | 'time-to-shortlist'
  | 'interview-coverage'
  | 'shortlist-quality'
  | 'recruiter-capacity'
  | 'cost-per-shortlisted'
  | 'cost-per-hire'
  | 'throughput';

export type MetricDirection = 'higher-is-better' | 'lower-is-better';
export type MetricUnit = 'percent' | 'days' | 'currency' | 'hours' | 'count';

/** Extra figures the analytics export cannot know, supplied per pilot. */
export interface PilotOutcomes {
  /** Days from role open to a shortlist being handed over, during the pilot. */
  timeToShortlistDays?: number;
  /** Hires actually closed from the pilot's shortlist. */
  hiresMade?: number;
}

export interface MetricContext {
  summary: ExportSummary;
  result: RoiResult;
  outcomes: PilotOutcomes;
  numRecruiters: number;
  period: ReportPeriod;
}

export interface SuccessMetricDef {
  id: SuccessMetricId;
  /** Short label for the hero tile. */
  label: string;
  /** The client's question, in their terms. Printed above the figure. */
  question: string;
  unit: MetricUnit;
  direction: MetricDirection;
  /**
   * Outcome fields this metric cannot be computed without. The generator
   * refuses rather than printing a blank hero.
   */
  requires: (keyof PilotOutcomes)[];
  compute(ctx: MetricContext): number;
  /** Plain-language derivation, printed under the figure. */
  basis(ctx: MetricContext): string;
}

const pct = (n: number) => `${Math.round(n)}%`;
const count = (n: number) => Math.round(n).toLocaleString('en-US');

export const SUCCESS_METRICS: Record<SuccessMetricId, SuccessMetricDef> = {
  'time-to-shortlist': {
    id: 'time-to-shortlist',
    label: 'Time to shortlist',
    question: 'How fast can we put a qualified shortlist in front of the hiring manager?',
    unit: 'days',
    direction: 'lower-is-better',
    requires: ['timeToShortlistDays'],
    compute: (c) => c.outcomes.timeToShortlistDays ?? 0,
    basis: () => 'Days from role open to shortlist handover during the pilot.',
  },

  'interview-coverage': {
    id: 'interview-coverage',
    label: 'Interview coverage',
    question: 'What share of applicants actually get interviewed, not just filtered on a resume?',
    unit: 'percent',
    direction: 'higher-is-better',
    requires: [],
    compute: (c) => {
      const { applications, fabricInterviews } = c.summary.actuals;
      return applications > 0 ? (fabricInterviews / applications) * 100 : 0;
    },
    basis: (c) =>
      `${count(c.summary.actuals.fabricInterviews)} interviewed of ` +
      `${count(c.summary.actuals.applications)} applications.`,
  },

  'shortlist-quality': {
    id: 'shortlist-quality',
    label: 'Shortlist quality',
    question: 'Of the candidates Fabric puts forward, how many hold up?',
    unit: 'percent',
    direction: 'higher-is-better',
    requires: [],
    compute: (c) => {
      const { fabricInterviews, fabricInterviewsCleared } = c.summary.actuals;
      return fabricInterviews > 0 ? (fabricInterviewsCleared / fabricInterviews) * 100 : 0;
    },
    basis: (c) =>
      `${count(c.summary.actuals.fabricInterviewsCleared)} cleared of ` +
      `${count(c.summary.actuals.fabricInterviews)} interviewed.`,
  },

  'recruiter-capacity': {
    id: 'recruiter-capacity',
    label: 'Recruiter capacity freed',
    question: 'How much of the recruiting team gets its week back?',
    unit: 'percent',
    direction: 'higher-is-better',
    requires: [],
    compute: (c) => c.result.timeSaved.recruiterCapacityFreedPct ?? 0,
    basis: (c) =>
      `${count(c.result.timeSaved.recruiterHours)} recruiter hours freed across ` +
      `${c.numRecruiters} recruiter${c.numRecruiters === 1 ? '' : 's'}.`,
  },

  'cost-per-shortlisted': {
    id: 'cost-per-shortlisted',
    label: 'Cost per shortlisted candidate',
    question: 'What does it cost to produce one candidate worth a hiring manager’s time?',
    unit: 'currency',
    direction: 'lower-is-better',
    requires: [],
    compute: (c) => {
      const cleared = c.summary.actuals.fabricInterviewsCleared;
      return cleared > 0 ? c.result.withFabricVariableCost / cleared : 0;
    },
    basis: (c) =>
      `Total screening spend divided by ${count(c.summary.actuals.fabricInterviewsCleared)} ` +
      'candidates who cleared.',
  },

  'cost-per-hire': {
    id: 'cost-per-hire',
    label: 'Screening cost per hire',
    question: 'What does it cost to screen our way to one hire?',
    unit: 'currency',
    direction: 'lower-is-better',
    requires: ['hiresMade'],
    compute: (c) => {
      const hires = c.outcomes.hiresMade ?? 0;
      return hires > 0 ? c.result.withFabricVariableCost / hires : 0;
    },
    basis: (c) =>
      `Total screening spend divided by ${count(c.outcomes.hiresMade ?? 0)} hires closed. ` +
      'Covers screening and first round only, not sourcing or offer costs.',
  },

  throughput: {
    id: 'throughput',
    label: 'Interview throughput',
    question: 'How many first-round interviews can we run in a month without adding people?',
    unit: 'count',
    direction: 'higher-is-better',
    requires: [],
    compute: (c) =>
      c.summary.actuals.fabricInterviews / Math.max(c.period.months, 1e-9),
    basis: (c) =>
      `${count(c.summary.actuals.fabricInterviews)} interviews over ` +
      `${c.period.months.toFixed(1)} months.`,
  },
};

export interface SuccessMetricTarget {
  id: SuccessMetricId;
  /** What the client said good looked like. */
  target?: number;
  /** What it was before Fabric, if they measured it. */
  baseline?: number;
}

export interface EvaluatedMetric {
  def: SuccessMetricDef;
  actual: number;
  target: number | undefined;
  baseline: number | undefined;
  /** Whether the actual beat the target. Undefined when no target was set. */
  metTarget: boolean | undefined;
  /** Change against baseline as a signed percentage. Undefined without one. */
  changeVsBaselinePct: number | undefined;
  /** True when a change against baseline is an improvement. */
  improved: boolean | undefined;
  basis: string;
}

function isBetter(a: number, b: number, direction: MetricDirection): boolean {
  return direction === 'higher-is-better' ? a >= b : a <= b;
}

/** Score the chosen metric against whatever target and baseline the pilot set. */
export function evaluateMetric(
  spec: SuccessMetricTarget,
  ctx: MetricContext,
): EvaluatedMetric {
  const def = SUCCESS_METRICS[spec.id];
  const actual = def.compute(ctx);

  let changeVsBaselinePct: number | undefined;
  let improved: boolean | undefined;
  if (spec.baseline !== undefined && spec.baseline !== 0) {
    changeVsBaselinePct = ((actual - spec.baseline) / Math.abs(spec.baseline)) * 100;
    improved = isBetter(actual, spec.baseline, def.direction);
  }

  return {
    def,
    actual,
    target: spec.target,
    baseline: spec.baseline,
    metTarget: spec.target === undefined ? undefined : isBetter(actual, spec.target, def.direction),
    changeVsBaselinePct,
    improved,
    basis: def.basis(ctx),
  };
}

/** Names any outcome fields a chosen metric needs but the pilot did not supply. */
export function missingRequirements(
  id: SuccessMetricId,
  outcomes: PilotOutcomes,
): (keyof PilotOutcomes)[] {
  return SUCCESS_METRICS[id].requires.filter((key) => outcomes[key] === undefined);
}

export function formatMetric(value: number, unit: MetricUnit, moneyFn: (n: number) => string): string {
  switch (unit) {
    case 'percent': return pct(value);
    case 'days': return `${value % 1 === 0 ? value : value.toFixed(1)} days`;
    case 'hours': return `${count(value)} hrs`;
    case 'currency': return moneyFn(value);
    case 'count': return count(value);
  }
}
