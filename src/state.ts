import { useCallback, useMemo, useState } from 'react';
import { calculateRoi } from './engine/calc';
import { CURRENCIES, DEFAULT_ASSUMPTIONS, defaultInputs } from './engine/defaults';
import type {
  ActualVolumes,
  Assumptions,
  Currency,
  RoiResult,
  TeamInputs,
} from './engine/types';

export interface RoiState {
  inputs: TeamInputs;
  assumptions: Assumptions;
  result: RoiResult;
  setInput: <K extends keyof TeamInputs>(key: K, value: TeamInputs[K]) => void;
  setCurrency: (currency: Currency) => void;
  setAssumption: (group: keyof Assumptions, key: string, value: number) => void;
  resetAssumptions: () => void;
  assumptionsEdited: boolean;
}

/**
 * Holds the inputs and assumptions and derives the result from them.
 *
 * `actuals`, when supplied, replaces the modelled funnel. Both modes use this
 * hook so neither can drift onto its own copy of the maths.
 */
export function useRoi(actuals?: ActualVolumes): RoiState {
  const [inputs, setInputs] = useState<TeamInputs>(() => defaultInputs('INR'));
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);

  const setInput = useCallback(
    <K extends keyof TeamInputs>(key: K, value: TeamInputs[K]) => {
      setInputs((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /**
   * Switching currency re-bases the salary sliders and the interview price onto
   * that market's values. Converting the existing figures at an FX rate would
   * imply a precision we do not have, and would quietly change list price.
   */
  const setCurrency = useCallback((currency: Currency) => {
    const cfg = CURRENCIES[currency];
    setInputs((prev) => ({
      ...prev,
      currency,
      recruiterSalary: cfg.recruiter.default,
      interviewerSalary: cfg.interviewer.default,
    }));
    setAssumptions((prev) => ({
      ...prev,
      rates: { ...prev.rates, costPerInterview: cfg.costPerInterview },
    }));
  }, []);

  const setAssumption = useCallback(
    (group: keyof Assumptions, key: string, value: number) => {
      setAssumptions((prev) => ({
        ...prev,
        [group]: { ...prev[group], [key]: value },
      }));
    },
    [],
  );

  /** Back to defaults, but keep the active market's list price. */
  const resetAssumptions = useCallback(() => {
    setAssumptions({
      ...DEFAULT_ASSUMPTIONS,
      rates: {
        ...DEFAULT_ASSUMPTIONS.rates,
        costPerInterview: CURRENCIES[inputs.currency].costPerInterview,
      },
    });
  }, [inputs.currency]);

  const result = useMemo(
    () => calculateRoi(inputs, assumptions, actuals),
    [inputs, assumptions, actuals],
  );

  const assumptionsEdited = useMemo(
    () => JSON.stringify(assumptions) !== JSON.stringify({
      ...DEFAULT_ASSUMPTIONS,
      rates: {
        ...DEFAULT_ASSUMPTIONS.rates,
        costPerInterview: CURRENCIES[inputs.currency].costPerInterview,
      },
    }),
    [assumptions, inputs.currency],
  );

  return {
    inputs,
    assumptions,
    result,
    setInput,
    setCurrency,
    setAssumption,
    resetAssumptions,
    assumptionsEdited,
  };
}

export function useTheme(): [string, () => void] {
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('fabric-roi-theme') ?? 'light';
    } catch {
      return 'light';
    }
  });

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      try {
        localStorage.setItem('fabric-roi-theme', next);
      } catch {
        // Private windows and blocked site data are fine; the theme just
        // resets next visit.
      }
      return next;
    });
  }, []);

  return [theme, toggle];
}
