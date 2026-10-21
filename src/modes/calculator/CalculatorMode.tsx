import { AssumptionsPanel } from '../../components/AssumptionsPanel';
import { CostComparison } from '../../components/CostComparison';
import { SavingsEquation } from '../../components/SavingsEquation';
import { SliderField } from '../../components/SliderField';
import { StatTile } from '../../components/StatTile';
import { TimeSaved } from '../../components/TimeSaved';
import { annualise, fmtCount } from '../../engine/calc';
import { CURRENCIES } from '../../engine/defaults';
import { money, moneyShort, multiple, percent } from '../../engine/format';
import type { RoiState } from '../../state';
import { MONTHLY_PERIOD } from '../../engine/types';
import type { Currency } from '../../engine/types';

const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
];

/**
 * The prospect-facing calculator.
 *
 * Inputs and results sit side by side and the result updates as you drag, so
 * the model is visibly responsive to the inputs rather than producing a single
 * number at the end of a funnel the prospect cannot interrogate.
 */
export function CalculatorMode({ roi }: { roi: RoiState }) {
  const { inputs, assumptions, result, setInput, setCurrency } = roi;
  const cfg = CURRENCIES[inputs.currency];
  const cur = inputs.currency;
  // The calculator models exactly one month, so annualising is a plain x12.
  const annualSavings = annualise(result.savings, MONTHLY_PERIOD);

  return (
    <div className="calc">
      {/* ── Inputs ─────────────────────────────────────────── */}
      <aside className="calc__inputs">
        <div className="calc__inputs-inner">
          <h2 className="calc__pane-title">Your team</h2>

          <fieldset className="currency">
            <legend className="field__label">Currency</legend>
            <div className="currency__options">
              {CURRENCY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`currency__opt${cur === opt.value ? ' is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="currency"
                    value={opt.value}
                    checked={cur === opt.value}
                    onChange={() => setCurrency(opt.value)}
                    className="visually-hidden"
                  />
                  <span className="currency__symbol" aria-hidden="true">{opt.symbol}</span>
                  <span className="currency__name">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="field__hint">
              Each market is priced at its own list rate, not converted at an
              exchange rate.
            </p>
          </fieldset>

          <SliderField
            id="hires"
            label="Hires per month"
            hint="All roles: engineering, sales, operations."
            value={inputs.hiresPerMonth}
            min={1}
            max={100}
            step={1}
            display={`${inputs.hiresPerMonth}`}
            onChange={(v) => setInput('hiresPerMonth', v)}
          />

          <SliderField
            id="recruiter-salary"
            label="Recruiter salary"
            hint={cfg.recruiterHint}
            value={inputs.recruiterSalary}
            min={cfg.recruiter.min}
            max={cfg.recruiter.max}
            step={cfg.recruiter.step}
            display={money(inputs.recruiterSalary, cur)}
            minLabel={moneyShort(cfg.recruiter.min, cur)}
            maxLabel={moneyShort(cfg.recruiter.max, cur)}
            onChange={(v) => setInput('recruiterSalary', v)}
          />

          <SliderField
            id="interviewer-salary"
            label="Senior interviewer salary"
            hint={cfg.interviewerHint}
            value={inputs.interviewerSalary}
            min={cfg.interviewer.min}
            max={cfg.interviewer.max}
            step={cfg.interviewer.step}
            display={money(inputs.interviewerSalary, cur)}
            minLabel={moneyShort(cfg.interviewer.min, cur)}
            maxLabel={moneyShort(cfg.interviewer.max, cur)}
            onChange={(v) => setInput('interviewerSalary', v)}
          />

          <SliderField
            id="num-recruiters"
            label="Recruiters on the team"
            hint="Used to express freed time as a share of capacity. Does not change the saving."
            value={inputs.numRecruiters}
            min={1}
            max={50}
            step={1}
            display={`${inputs.numRecruiters}`}
            onChange={(v) => setInput('numRecruiters', v)}
          />

          <div className="calc__funnel-readout">
            <h3>At this volume, per month</h3>
            <ul>
              <li><strong className="tnum">{fmtCount(result.volumes.applications)}</strong> applications</li>
              <li><strong className="tnum">{fmtCount(result.volumes.phoneScreens)}</strong> phone screens</li>
              <li><strong className="tnum">{fmtCount(result.volumes.round1)}</strong> round 1 panels</li>
            </ul>
            <p>
              Recruiter payroll of {money(result.recruiterPayrollMonthly, cur)}/mo sits outside
              this comparison — you pay it either way.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Results ────────────────────────────────────────── */}
      <main className="calc__results">
        <header className="headline">
          <p className="headline__eyebrow">Your estimate</p>
          <h2 className="headline__figure">
            {result.savings >= 0 ? (
              <>
                You could save{' '}
                <span className="headline__accent tnum">{moneyShort(annualSavings, cur)}</span>{' '}
                a year.
              </>
            ) : (
              <>
                At these inputs, Fabric costs{' '}
                <span className="headline__accent tnum">
                  {moneyShort(Math.abs(annualSavings), cur)}
                </span>{' '}
                more a year.
              </>
            )}
          </h2>
          <p className="headline__sub tnum">
            {money(result.savings, cur)} per month &middot;{' '}
            {percent(result.savingsPct)} of your screening and first-round cost
          </p>
        </header>

        <div className="tile-row">
          <StatTile
            emphasis
            label="Monthly saving"
            value={money(result.savings, cur)}
            note="screening and first-round cost only"
          />
          <StatTile
            label="Return on Fabric spend"
            value={multiple(result.roiMultiple)}
            note={`${money(result.fabricCost, cur)}/mo on Fabric`}
          />
          <StatTile
            label="Hours freed"
            value={`${Math.round(result.timeSaved.totalHours).toLocaleString('en-US')}`}
            note={`per month, across recruiters and interviewers`}
          />
        </div>

        <CostComparison result={result} />
        <SavingsEquation result={result} />

        <section className="block">
          <h3 className="block__title">Where the time goes</h3>
          <TimeSaved result={result} />
        </section>

        <AssumptionsPanel
          assumptions={assumptions}
          currency={cur}
          edited={roi.assumptionsEdited}
          onChange={roi.setAssumption}
          onReset={roi.resetAssumptions}
        />

        <div className="cta no-print">
          <a className="btn btn--primary" href="https://cal.com/abhishek-agarwalla/fabric-live-demo" target="_blank" rel="noreferrer">
            Book a demo
          </a>
          <a className="btn btn--ghost" href="https://demo.fabrichq.ai/" target="_blank" rel="noreferrer">
            Try an AI interview
          </a>
        </div>
      </main>
    </div>
  );
}
