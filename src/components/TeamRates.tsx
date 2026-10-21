import { CURRENCIES } from '../engine/defaults';
import { money } from '../engine/format';
import type { Currency, TeamInputs } from '../engine/types';
import type { RoiState } from '../state';

/**
 * The client's own salary figures.
 *
 * Without these the report would price the baseline at whatever default
 * shipped, which is the flaw that made the prototype's client-facing report
 * indefensible: it asserted a human cost built on hardcoded salaries the client
 * had never seen, let alone agreed to.
 */
export function TeamRates({ roi }: { roi: RoiState }) {
  const { inputs, setInput, setCurrency } = roi;
  const cfg = CURRENCIES[inputs.currency];

  const numberField = (
    key: 'recruiterSalary' | 'interviewerSalary' | 'numRecruiters',
    label: string,
    band: { min: number; max: number; step: number },
    hint: string,
  ) => (
    <label className="mini-field">
      <span>{label}</span>
      <input
        type="number"
        className="tnum"
        min={band.min}
        max={band.max}
        step={band.step}
        value={inputs[key]}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) {
            setInput(key, Math.min(band.max, Math.max(band.min, n)) as TeamInputs[typeof key]);
          }
        }}
      />
      <small>{hint}</small>
    </label>
  );

  return (
    <div className="pilot__meta-grid">
      <label className="mini-field">
        <span>Currency</span>
        <select
          value={inputs.currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
        >
          <option value="INR">INR (&#8377;)</option>
          <option value="USD">USD ($)</option>
        </select>
        <small>Sets list price and number formatting.</small>
      </label>

      {numberField(
        'recruiterSalary',
        'Recruiter salary (annual)',
        cfg.recruiter,
        `${money(inputs.recruiterSalary / 12 / 176, inputs.currency)}/hr at 176 hrs a month`,
      )}

      {numberField(
        'interviewerSalary',
        'Senior interviewer salary (annual)',
        cfg.interviewer,
        `${money(inputs.interviewerSalary / 12 / 176, inputs.currency)}/hr at 176 hrs a month`,
      )}

      {numberField(
        'numRecruiters',
        'Recruiters on the team',
        { min: 1, max: 50, step: 1 },
        'Used to express freed hours as a share of capacity.',
      )}
    </div>
  );
}
