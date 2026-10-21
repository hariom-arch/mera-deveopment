import { money, moneyShort, multiple, percent } from '../engine/format';
import { MONTHLY_PERIOD } from '../engine/types';
import type { ReportPeriod, RoiResult } from '../engine/types';

interface Props {
  result: RoiResult;
  /** Defaults to one month, which is what the calculator models. */
  period?: ReportPeriod;
}

/**
 * The before − after = saved equation.
 *
 * Deliberately uses exact values, not abbreviated ones: printing "18.7L − 2.1L
 * = 16.6L" is how an ROI page ends up showing arithmetic that does not add up
 * on the one screen that claims to show the full working.
 */
export function SavingsEquation({ result, period = MONTHLY_PERIOD }: Props) {
  const cur = result.currency;
  const isMonth = period.months === 1 && period.label === 'month';

  // Annualise from the measured run rate, not from a flat x12 of the total.
  const monthlyRunRate = result.savings / Math.max(period.months, 1e-9);
  const annual = monthlyRunRate * 12;

  return (
    <div className="equation avoid-break">
      <div className="equation__work">
        <div className="equation__row">
          <span className="equation__op" aria-hidden="true" />
          <span className="equation__val tnum">{money(result.baselineVariableCost, cur)}</span>
          <span className="equation__note">screening and round 1, in-house</span>
        </div>
        <div className="equation__row">
          <span className="equation__op" aria-hidden="true">&minus;</span>
          <span className="equation__val tnum">{money(result.withFabricVariableCost, cur)}</span>
          <span className="equation__note">
            {result.residualHumanCost > 0
              ? 'Fabric spend plus the stages you keep in-house'
              : 'Fabric spend'}
          </span>
        </div>
        <div className="equation__row equation__row--sum">
          <span className="equation__op" aria-hidden="true">=</span>
          <span className="equation__val equation__val--accent tnum">
            {money(result.savings, cur)}
          </span>
          <span className="equation__note">
            {isMonth ? 'saved every month' : `saved over the ${period.label}`}
          </span>
        </div>
      </div>

      <div className="equation__side">
        {!isMonth ? (
          <div className="equation__side-item">
            <span className="equation__side-label">Monthly run rate</span>
            <span className="equation__side-val tnum">{moneyShort(monthlyRunRate, cur)}</span>
            <span className="equation__side-exact tnum">
              {money(result.savings, cur)} over {period.months.toFixed(1)} months
            </span>
          </div>
        ) : null}

        <div className="equation__side-item">
          <span className="equation__side-label">Annualised</span>
          <span className="equation__side-val tnum">{moneyShort(annual, cur)}</span>
          <span className="equation__side-exact tnum">
            {money(annual, cur)}
            {period.assumed
              ? ' · assumes this volume represents one month'
              : ' · at this run rate'}
          </span>
        </div>

        <div className="equation__side-item">
          <span className="equation__side-label">Return on Fabric spend</span>
          <span className="equation__side-val tnum">{multiple(result.roiMultiple)}</span>
          <span className="equation__side-exact">
            {money(result.savings, cur)} saved per {money(result.fabricCost, cur)} spent
          </span>
        </div>

        <div className="equation__side-item">
          <span className="equation__side-label">Share of screening cost</span>
          <span className="equation__side-val tnum">{percent(result.savingsPct)}</span>
          <span className="equation__side-exact">excludes recruiter salary</span>
        </div>
      </div>
    </div>
  );
}
