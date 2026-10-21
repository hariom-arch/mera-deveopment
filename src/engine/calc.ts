import type {
  ActualVolumes,
  Assumptions,
  CostLine,
  FunnelVolumes,
  HourlyRates,
  RoiResult,
  TeamInputs,
  TimeSaved,
} from './types';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const safe = (n: number) => (Number.isFinite(n) ? n : 0);

/** Hourly cost of one person from their annual salary. */
export function hourlyRate(annualSalary: number, workingHoursPerMonth: number): number {
  if (workingHoursPerMonth <= 0) return 0;
  return safe(annualSalary / 12 / workingHoursPerMonth);
}

export function hourlyRates(inputs: TeamInputs, a: Assumptions): HourlyRates {
  const whpm = a.rates.workingHoursPerMonth;
  return {
    recruiter: hourlyRate(inputs.recruiterSalary, whpm),
    interviewer: hourlyRate(inputs.interviewerSalary, whpm),
  };
}

/**
 * Model the funnel forward from hires so every stage is consistent with the one
 * above it. Volumes are kept fractional here and only rounded for display —
 * rounding mid-funnel makes the printed arithmetic stop adding up.
 */
export function modelFunnel(inputs: TeamInputs, a: Assumptions): FunnelVolumes {
  const applications = safe(inputs.hiresPerMonth * a.funnel.applicationsPerHire);
  const phoneScreens = safe(applications * clamp01(a.funnel.phoneScreenRate));
  const round1 = safe(phoneScreens * clamp01(a.funnel.round1Rate));
  return {
    source: 'modelled',
    applications,
    phoneScreens,
    round1,
    // Fabric interviews everyone who would have taken a recruiter screen call.
    billableInterviews: phoneScreens * clamp01(a.coverage.phoneScreening),
  };
}

/**
 * Volumes from a pilot that actually ran. Billing follows credits consumed, not
 * a modelled rate, so the report prices the invoice the client already has.
 */
export function actualFunnel(actuals: ActualVolumes): FunnelVolumes {
  return {
    source: 'actual',
    applications: safe(actuals.applications),
    phoneScreens: safe(actuals.fabricInterviews),
    round1: safe(actuals.round1Equivalents),
    billableInterviews: safe(actuals.creditsUsed),
  };
}

function buildLines(volumes: FunnelVolumes, rates: HourlyRates, a: Assumptions): CostLine[] {
  const { effort, coverage } = a;
  const m = (minutes: number) => minutes / 60;

  // Resume screening — recruiter time across every application.
  const resumeHours = safe(volumes.applications * m(effort.resumeReviewMinutes));
  const resumeBaseline = resumeHours * rates.recruiter;
  const resumeCov = clamp01(coverage.resumeScreening);

  // Phone screening — recruiter call time plus named coordination time.
  const phoneMinutesEach = effort.phoneScreenMinutes + effort.phoneScreenCoordinationMinutes;
  const phoneHours = safe(volumes.phoneScreens * m(phoneMinutesEach));
  const phoneBaseline = phoneHours * rates.recruiter;
  const phoneCov = clamp01(coverage.phoneScreening);

  // Round 1 — interviewer panel and debrief time, plus recruiter coordination.
  const r1InterviewerHours = safe(
    volumes.round1 * m(effort.round1Minutes + effort.round1DebriefMinutes),
  );
  const r1RecruiterHours = safe(volumes.round1 * m(effort.round1CoordinationMinutes));
  const r1Baseline = r1InterviewerHours * rates.interviewer + r1RecruiterHours * rates.recruiter;
  const r1Cov = clamp01(coverage.round1);

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return [
    {
      id: 'resume',
      label: 'Resume screening',
      basis:
        `${fmtCount(volumes.applications)} applications × ` +
        `${effort.resumeReviewMinutes} min recruiter time`,
      baseline: resumeBaseline,
      residual: resumeBaseline * (1 - resumeCov),
      recruiterHours: resumeHours,
      interviewerHours: 0,
    },
    {
      id: 'phone',
      label: 'Phone screening',
      basis:
        `${fmtCount(volumes.phoneScreens)} screens × ` +
        `(${effort.phoneScreenMinutes} min call + ${effort.phoneScreenCoordinationMinutes} min coordination)`,
      baseline: phoneBaseline,
      residual: phoneBaseline * (1 - phoneCov),
      recruiterHours: phoneHours,
      interviewerHours: 0,
    },
    {
      id: 'round1',
      label: 'Round 1 panels',
      basis:
        `${fmtCount(volumes.round1)} panels × ` +
        `(${effort.round1Minutes} min panel + ${effort.round1DebriefMinutes} min debrief) ` +
        `+ ${effort.round1CoordinationMinutes} min recruiter coordination` +
        (r1Cov < 1 ? ` — Fabric covers ${pct(r1Cov)}` : ''),
      baseline: r1Baseline,
      residual: r1Baseline * (1 - r1Cov),
      recruiterHours: r1RecruiterHours,
      interviewerHours: r1InterviewerHours,
    },
  ];
}

function buildTimeSaved(
  lines: CostLine[],
  inputs: TeamInputs,
  a: Assumptions,
): TimeSaved {
  const cov: Record<CostLine['id'], number> = {
    resume: clamp01(a.coverage.resumeScreening),
    phone: clamp01(a.coverage.phoneScreening),
    round1: clamp01(a.coverage.round1),
  };

  let recruiterHours = 0;
  let interviewerHours = 0;
  for (const line of lines) {
    recruiterHours += line.recruiterHours * cov[line.id];
    interviewerHours += line.interviewerHours * cov[line.id];
  }

  const totalHours = recruiterHours + interviewerHours;
  const teamCapacity = inputs.numRecruiters * a.rates.workingHoursPerMonth;

  return {
    recruiterHours,
    interviewerHours,
    totalHours,
    workingDays: totalHours / 8,
    recruiterCapacityFreedPct:
      teamCapacity > 0 ? (recruiterHours / teamCapacity) * 100 : null,
  };
}

/**
 * The single source of truth for every figure either mode reports.
 *
 * Savings are measured against `baselineVariableCost` — the screening and
 * first-round cost that Fabric can actually change. Recruiter base salary is
 * excluded: it is paid with or without Fabric, so counting it would both
 * overstate the saving and make the headline percentage drift with headcount.
 */
export function calculateRoi(
  inputs: TeamInputs,
  assumptions: Assumptions,
  actuals?: ActualVolumes,
): RoiResult {
  const volumes = actuals ? actualFunnel(actuals) : modelFunnel(inputs, assumptions);
  const rates = hourlyRates(inputs, assumptions);
  const lines = buildLines(volumes, rates, assumptions);

  const baselineVariableCost = lines.reduce((sum, l) => sum + l.baseline, 0);
  const residualHumanCost = lines.reduce((sum, l) => sum + l.residual, 0);
  const fabricCost = safe(volumes.billableInterviews * assumptions.rates.costPerInterview);
  const withFabricVariableCost = residualHumanCost + fabricCost;

  const monthlySavings = baselineVariableCost - withFabricVariableCost;

  return {
    currency: inputs.currency,
    volumes,
    rates,
    lines,
    baselineVariableCost,
    residualHumanCost,
    fabricCost,
    withFabricVariableCost,
    monthlySavings,
    annualSavings: monthlySavings * 12,
    savingsPct:
      baselineVariableCost > 0 ? (monthlySavings / baselineVariableCost) * 100 : 0,
    roiMultiple: fabricCost > 0 ? monthlySavings / fabricCost : null,
    recruiterPayrollMonthly: safe((inputs.recruiterSalary / 12) * inputs.numRecruiters),
    timeSaved: buildTimeSaved(lines, inputs, assumptions),
  };
}

/** Whole numbers for volumes, one decimal only when the value is small and fractional. */
export function fmtCount(n: number): string {
  const r = Math.round(n);
  if (r === 0 && n > 0) return n.toFixed(1);
  return r.toLocaleString('en-US');
}
