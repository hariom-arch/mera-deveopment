import { DEFAULT_ASSUMPTIONS, CURRENCIES } from './defaults';
import { SUCCESS_METRICS, missingRequirements } from './metrics';
import type { PilotOutcomes, SuccessMetricId, SuccessMetricTarget } from './metrics';
import type { Assumptions, Currency, TeamInputs } from './types';

/**
 * Everything about a pilot that the analytics export cannot tell us.
 *
 * One of these sits beside the CSV in the pilot's folder. Keeping it on disk,
 * rather than in a form, is what makes the report reproducible: re-running the
 * command on the same folder produces the same PDF.
 */
export interface PilotConfig {
  client: {
    name: string;
    /** Hiring function the pilot covered, e.g. "Engineering". */
    function?: string;
    /** Fabric POC who ran it. */
    poc?: string;
    /** Overrides the period derived from the export's call dates. */
    periodLabel?: string;
  };
  currency: Currency;
  rates: {
    recruiterSalary: number;
    interviewerSalary: number;
    numRecruiters: number;
  };
  /** The one question the pilot was run to answer. */
  successMetric: SuccessMetricTarget;
  outcomes?: PilotOutcomes;
  /** Per-pilot overrides of any modelling assumption. */
  assumptions?: DeepPartial<Assumptions>;
  quote?: {
    text: string;
    author?: string;
    title?: string;
  };
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };

export class ConfigError extends Error {
  constructor(public problems: string[]) {
    super(`Pilot config is not usable:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/**
 * Validate a parsed config and collect every problem before throwing.
 *
 * Reporting all problems at once matters: a rep generating a report at the end
 * of a pilot should not have to fix one field, re-run, and discover the next.
 */
export function validateConfig(raw: unknown): PilotConfig {
  const problems: string[] = [];
  const c = raw as Partial<PilotConfig> | null;

  if (!c || typeof c !== 'object') {
    throw new ConfigError(['the file did not contain a JSON object']);
  }

  if (!c.client?.name?.trim()) {
    problems.push('client.name is required (it is printed on the cover)');
  }

  const currency = c.currency;
  if (currency !== 'INR' && currency !== 'USD') {
    problems.push(`currency must be "INR" or "USD", got ${JSON.stringify(currency)}`);
  }

  const rates = c.rates;
  if (!rates) {
    problems.push('rates is required: the baseline cannot be priced without the client’s salaries');
  } else {
    for (const key of ['recruiterSalary', 'interviewerSalary', 'numRecruiters'] as const) {
      const v = rates[key];
      if (!isFiniteNumber(v) || v <= 0) {
        problems.push(`rates.${key} must be a positive number, got ${JSON.stringify(v)}`);
      }
    }
  }

  const sm = c.successMetric;
  if (!sm?.id) {
    problems.push(
      `successMetric.id is required, one of: ${Object.keys(SUCCESS_METRICS).join(', ')}`,
    );
  } else if (!(sm.id in SUCCESS_METRICS)) {
    problems.push(
      `successMetric.id "${sm.id}" is not a known metric. Choose one of: ` +
        Object.keys(SUCCESS_METRICS).join(', '),
    );
  } else {
    const missing = missingRequirements(sm.id as SuccessMetricId, c.outcomes ?? {});
    for (const key of missing) {
      problems.push(
        `successMetric "${sm.id}" needs outcomes.${key}, which the analytics export does not contain`,
      );
    }
    for (const key of ['target', 'baseline'] as const) {
      const v = sm[key];
      if (v !== undefined && !isFiniteNumber(v)) {
        problems.push(`successMetric.${key} must be a number when present, got ${JSON.stringify(v)}`);
      }
    }
  }

  if (problems.length > 0) throw new ConfigError(problems);
  return c as PilotConfig;
}

/** Merge per-pilot overrides over the defaults, one group at a time. */
export function assumptionsFrom(config: PilotConfig): Assumptions {
  const base: Assumptions = {
    ...DEFAULT_ASSUMPTIONS,
    rates: {
      ...DEFAULT_ASSUMPTIONS.rates,
      costPerInterview: CURRENCIES[config.currency].costPerInterview,
    },
  };
  const over = config.assumptions;
  if (!over) return base;

  return {
    funnel: { ...base.funnel, ...over.funnel },
    effort: { ...base.effort, ...over.effort },
    coverage: { ...base.coverage, ...over.coverage },
    rates: { ...base.rates, ...over.rates },
  };
}

export function inputsFrom(config: PilotConfig): TeamInputs {
  return {
    currency: config.currency,
    // Volumes come from the export in report mode, so hires only affects the
    // modelled funnel, which is unused here.
    hiresPerMonth: 0,
    recruiterSalary: config.rates.recruiterSalary,
    interviewerSalary: config.rates.interviewerSalary,
    numRecruiters: config.rates.numRecruiters,
  };
}
