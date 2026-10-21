/**
 * The ROI model, as data.
 *
 * Every number that moves the result lives in `Assumptions` or `TeamInputs` and is
 * editable in the UI. Nothing that drives a client-facing figure is hidden in code.
 */

export type Currency = 'INR' | 'USD';

/** Where a volume figure came from. Drives how the report describes itself. */
export type VolumeSource = 'modelled' | 'actual';

/**
 * Hiring funnel shape. Modelled forward from hires so the stages stay internally
 * consistent: applications -> phone screens -> round 1.
 */
export interface FunnelAssumptions {
  /** Applications received per hire made, top of funnel. */
  applicationsPerHire: number;
  /** Share of applications that earn a recruiter phone screen. 0-1. */
  phoneScreenRate: number;
  /** Share of phone-screened candidates that reach a round 1 panel. 0-1. */
  round1Rate: number;
}

/**
 * Minutes of human effort per unit of funnel work, split by who spends it.
 *
 * Coordination time is named and separate rather than folded into a blanket
 * "inefficiency buffer" — a client can argue with 10 minutes of scheduling,
 * they cannot argue with an unexplained +50%.
 */
export interface EffortAssumptions {
  /** Recruiter minutes to review one resume. */
  resumeReviewMinutes: number;
  /** Recruiter minutes on one phone screen call. */
  phoneScreenMinutes: number;
  /** Recruiter minutes to schedule, chase and write up one phone screen. */
  phoneScreenCoordinationMinutes: number;
  /** Interviewer minutes conducting one round 1 panel. */
  round1Minutes: number;
  /** Interviewer minutes writing up one round 1 panel. */
  round1DebriefMinutes: number;
  /** Recruiter minutes coordinating one round 1 panel across calendars. */
  round1CoordinationMinutes: number;
}

/**
 * How much of each stage Fabric actually takes over. 0-1.
 *
 * Defaults to full coverage for screening stages and round 1, but stays editable:
 * a prospect who wants to keep a human round 1 for senior roles can dial it down
 * and see an honest number rather than being told the tool knows better.
 */
export interface CoverageAssumptions {
  resumeScreening: number;
  phoneScreening: number;
  round1: number;
}

export interface RateAssumptions {
  /** Paid working hours in a month. 22 days x 8 hours by default. */
  workingHoursPerMonth: number;
  /** List price of one Fabric AI interview, in the active currency. */
  costPerInterview: number;
}

export interface Assumptions {
  funnel: FunnelAssumptions;
  effort: EffortAssumptions;
  coverage: CoverageAssumptions;
  rates: RateAssumptions;
}

/** What the customer tells us about their team. */
export interface TeamInputs {
  currency: Currency;
  /** Hires closed per month across all roles. */
  hiresPerMonth: number;
  /** Fully loaded annual salary of one recruiter. */
  recruiterSalary: number;
  /** Fully loaded annual salary of one senior interviewer. */
  interviewerSalary: number;
  /** Full-time recruiters on the team. Drives capacity, never savings. */
  numRecruiters: number;
}

/**
 * Observed volumes from a real pilot. When present these override the modelled
 * funnel so the pilot report prices what actually happened.
 */
export interface ActualVolumes {
  applications: number;
  /** Fabric interviews delivered. Stands in for the phone screens they replaced. */
  fabricInterviews: number;
  /** Fabric interviews the candidate passed. Reporting only — not priced. */
  fabricInterviewsCleared: number;
  /** Round 1 panels Fabric stood in for. */
  round1Equivalents: number;
  /** Billable interview credits consumed. Priced instead of fabricInterviews. */
  creditsUsed: number;
}

export interface FunnelVolumes {
  source: VolumeSource;
  applications: number;
  phoneScreens: number;
  round1: number;
  /** Interviews Fabric is billed for. */
  billableInterviews: number;
}

/** One line of the before/after comparison. */
export interface CostLine {
  id: 'resume' | 'phone' | 'round1';
  label: string;
  /** Plain-language derivation, shown to the client verbatim. */
  basis: string;
  /** Cost with no Fabric in the process. */
  baseline: number;
  /** Human cost still incurred at the chosen coverage. */
  residual: number;
  /** Recruiter hours in the baseline for this line. */
  recruiterHours: number;
  /** Interviewer hours in the baseline for this line. */
  interviewerHours: number;
}

export interface HourlyRates {
  recruiter: number;
  interviewer: number;
}

export interface TimeSaved {
  /** Recruiter hours freed per month. Redeployed, not removed from payroll. */
  recruiterHours: number;
  /** Senior interviewer hours freed per month. */
  interviewerHours: number;
  totalHours: number;
  /** Total hours expressed as 8-hour working days. */
  workingDays: number;
  /**
   * Freed recruiter hours as a share of the recruiting team's total capacity.
   * The honest version of "time saved" when nobody is being let go.
   */
  recruiterCapacityFreedPct: number | null;
}

export interface RoiResult {
  currency: Currency;
  volumes: FunnelVolumes;
  rates: HourlyRates;
  lines: CostLine[];

  /**
   * Screening and first-round cost with no Fabric. Excludes recruiter base
   * salary, which is paid either way and is not a saving.
   */
  baselineVariableCost: number;
  /** Human cost left over after Fabric covers its share. */
  residualHumanCost: number;
  /** Fabric spend: billable interviews x list price. */
  fabricCost: number;
  /** residualHumanCost + fabricCost. */
  withFabricVariableCost: number;

  monthlySavings: number;
  annualSavings: number;
  /** Savings as a share of the cost that can actually change. 0-100. */
  savingsPct: number;
  /** Return on Fabric spend: savings / fabricCost. null when spend is zero. */
  roiMultiple: number | null;

  /** Fixed recruiter payroll. Reported for context, never counted as savings. */
  recruiterPayrollMonthly: number;

  timeSaved: TimeSaved;
}
