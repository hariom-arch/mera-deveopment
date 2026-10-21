import type { Assumptions, Currency, TeamInputs } from './types';

/**
 * Per-currency pricing, salary bands and slider ranges.
 *
 * `costPerInterview` is list price in each market, set independently rather than
 * FX-converted, so the two prices never silently disagree by an exchange rate.
 */
export interface CurrencyConfig {
  symbol: string;
  /** Locale used for digit grouping. en-IN groups in lakh/crore. */
  locale: string;
  costPerInterview: number;
  recruiter: { min: number; max: number; step: number; default: number };
  interviewer: { min: number; max: number; step: number; default: number };
  /** Copy for the salary band hint under each slider. */
  recruiterHint: string;
  interviewerHint: string;
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  INR: {
    symbol: '₹',
    locale: 'en-IN',
    costPerInterview: 300,
    recruiter: { min: 400_000, max: 2_500_000, step: 50_000, default: 900_000 },
    interviewer: { min: 800_000, max: 6_000_000, step: 100_000, default: 2_400_000 },
    recruiterHint: 'Fully loaded cost, including benefits',
    interviewerHint: 'Senior engineer or manager who runs round 1',
  },
  USD: {
    symbol: '$',
    locale: 'en-US',
    costPerInterview: 4,
    recruiter: { min: 50_000, max: 180_000, step: 5_000, default: 85_000 },
    interviewer: { min: 100_000, max: 400_000, step: 10_000, default: 190_000 },
    recruiterHint: 'Fully loaded cost, including benefits',
    interviewerHint: 'Senior engineer or manager who runs round 1',
  },
};

/**
 * Default assumptions.
 *
 * Deliberately conservative: these produce a number a hiring lead can take to
 * finance without being walked back. A funnel of 60 applications, 15 phone
 * screens and 6 round 1 panels per hire is in line with what mid-market
 * engineering teams actually run.
 */
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  funnel: {
    applicationsPerHire: 60,
    phoneScreenRate: 0.25,
    round1Rate: 0.4,
  },
  effort: {
    resumeReviewMinutes: 3,
    phoneScreenMinutes: 30,
    phoneScreenCoordinationMinutes: 10,
    round1Minutes: 60,
    round1DebriefMinutes: 15,
    round1CoordinationMinutes: 15,
  },
  coverage: {
    resumeScreening: 1,
    phoneScreening: 1,
    round1: 1,
  },
  rates: {
    workingHoursPerMonth: 176,
    costPerInterview: CURRENCIES.INR.costPerInterview,
  },
};

export function defaultInputs(currency: Currency = 'INR'): TeamInputs {
  const cfg = CURRENCIES[currency];
  return {
    currency,
    hiresPerMonth: 10,
    recruiterSalary: cfg.recruiter.default,
    interviewerSalary: cfg.interviewer.default,
    numRecruiters: 2,
  };
}

export function assumptionsForCurrency(base: Assumptions, currency: Currency): Assumptions {
  return {
    ...base,
    rates: { ...base.rates, costPerInterview: CURRENCIES[currency].costPerInterview },
  };
}

/**
 * Editable assumption metadata, used to render the Assumptions panel and to
 * clamp user input. Keeping it beside the defaults means a new assumption
 * cannot be added to the model without becoming visible to the client.
 */
export interface AssumptionField {
  group: 'funnel' | 'effort' | 'coverage' | 'rates';
  key: string;
  label: string;
  /** Why this default. Shown as help text so the number is arguable, not asserted. */
  rationale: string;
  min: number;
  max: number;
  step: number;
  unit: 'count' | 'percent' | 'minutes' | 'hours' | 'currency';
}

export const ASSUMPTION_FIELDS: AssumptionField[] = [
  {
    group: 'funnel',
    key: 'applicationsPerHire',
    label: 'Applications per hire',
    rationale: 'Top-of-funnel volume needed to close one role.',
    min: 10, max: 400, step: 5, unit: 'count',
  },
  {
    group: 'funnel',
    key: 'phoneScreenRate',
    label: 'Applications that get a phone screen',
    rationale: 'Resume pass rate. 25% of 60 applications is 15 screens per hire.',
    min: 0.02, max: 1, step: 0.01, unit: 'percent',
  },
  {
    group: 'funnel',
    key: 'round1Rate',
    label: 'Phone screens that reach round 1',
    rationale: 'Screen pass rate. 40% of 15 screens is 6 panels per hire.',
    min: 0.02, max: 1, step: 0.01, unit: 'percent',
  },
  {
    group: 'effort',
    key: 'resumeReviewMinutes',
    label: 'Recruiter minutes per resume',
    rationale: 'Time to read one resume and make a call on it.',
    min: 0.5, max: 20, step: 0.5, unit: 'minutes',
  },
  {
    group: 'effort',
    key: 'phoneScreenMinutes',
    label: 'Minutes per phone screen call',
    rationale: 'The call itself, excluding scheduling.',
    min: 5, max: 90, step: 5, unit: 'minutes',
  },
  {
    group: 'effort',
    key: 'phoneScreenCoordinationMinutes',
    label: 'Minutes coordinating each phone screen',
    rationale: 'Scheduling, reminders, no-show rescheduling and written notes.',
    min: 0, max: 60, step: 5, unit: 'minutes',
  },
  {
    group: 'effort',
    key: 'round1Minutes',
    label: 'Minutes per round 1 panel',
    rationale: 'Interviewer time in the room.',
    min: 15, max: 180, step: 15, unit: 'minutes',
  },
  {
    group: 'effort',
    key: 'round1DebriefMinutes',
    label: 'Minutes writing up each round 1',
    rationale: 'Interviewer time on scorecards and debrief.',
    min: 0, max: 60, step: 5, unit: 'minutes',
  },
  {
    group: 'effort',
    key: 'round1CoordinationMinutes',
    label: 'Minutes coordinating each round 1',
    rationale: 'Recruiter time matching candidate and panel calendars.',
    min: 0, max: 90, step: 5, unit: 'minutes',
  },
  {
    group: 'coverage',
    key: 'resumeScreening',
    label: 'Resume screening handled by Fabric',
    rationale: 'Fabric reviews every application, so full coverage by default.',
    min: 0, max: 1, step: 0.05, unit: 'percent',
  },
  {
    group: 'coverage',
    key: 'phoneScreening',
    label: 'Phone screening handled by Fabric',
    rationale: 'Async AI interviews replace the recruiter screen call.',
    min: 0, max: 1, step: 0.05, unit: 'percent',
  },
  {
    group: 'coverage',
    key: 'round1',
    label: 'Round 1 handled by Fabric',
    rationale: 'Dial down if you keep a human round 1 for senior or niche roles.',
    min: 0, max: 1, step: 0.05, unit: 'percent',
  },
  {
    group: 'rates',
    key: 'workingHoursPerMonth',
    label: 'Paid working hours per month',
    rationale: '22 working days at 8 hours. Used to turn salary into an hourly rate.',
    min: 100, max: 240, step: 4, unit: 'hours',
  },
  {
    group: 'rates',
    key: 'costPerInterview',
    label: 'Cost per Fabric interview',
    rationale: 'List price of one AI interview in your currency.',
    min: 0, max: 5_000, step: 1, unit: 'currency',
  },
];
