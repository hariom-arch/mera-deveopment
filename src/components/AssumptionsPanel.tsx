import { useState } from 'react';
import { ASSUMPTION_FIELDS, type AssumptionField } from '../engine/defaults';
import { currencySymbol } from '../engine/format';
import type { Assumptions, Currency } from '../engine/types';

interface Props {
  assumptions: Assumptions;
  currency: Currency;
  edited: boolean;
  onChange: (group: keyof Assumptions, key: string, value: number) => void;
  onReset: () => void;
  /** Open by default on the report, collapsed on the prospect flow. */
  defaultOpen?: boolean;
}

const GROUP_LABELS: Record<AssumptionField['group'], string> = {
  funnel: 'Funnel shape',
  effort: 'Time per task',
  coverage: 'What Fabric covers',
  rates: 'Rates and pricing',
};

const GROUP_NOTES: Record<AssumptionField['group'], string> = {
  funnel: 'How many candidates move through each stage to make one hire.',
  effort:
    'Human minutes each task takes. Coordination is listed separately rather than hidden inside a blanket overhead percentage.',
  coverage:
    'Dial a stage down if you plan to keep it in-house. The cost that stays shows up on the Fabric side of the comparison.',
  rates: 'How salary becomes an hourly rate, and what a Fabric interview costs.',
};

const ORDER: AssumptionField['group'][] = ['funnel', 'effort', 'coverage', 'rates'];

function readValue(a: Assumptions, f: AssumptionField): number {
  const group = a[f.group] as unknown as Record<string, number>;
  return group[f.key] ?? 0;
}

function displayValue(v: number, f: AssumptionField, currency: Currency): string {
  switch (f.unit) {
    case 'percent': return `${Math.round(v * 100)}%`;
    case 'minutes': return `${v} min`;
    case 'hours': return `${v} hrs`;
    case 'currency': return `${currencySymbol(currency)}${v.toLocaleString('en-US')}`;
    default: return v.toLocaleString('en-US');
  }
}

/**
 * Every number that moves the result, in one place, editable, with the reason
 * for each default beside it.
 *
 * This panel is the answer to "where did that figure come from" — the question
 * that sinks an ROI deck. Nothing in the model is allowed to live outside it.
 */
export function AssumptionsPanel({
  assumptions, currency, edited, onChange, onReset, defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`assumptions${open ? ' is-open' : ''} avoid-break`}>
      <div className="assumptions__bar">
        <button
          type="button"
          className="assumptions__toggle no-print"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`assumptions__chev${open ? ' is-open' : ''}`} aria-hidden="true" />
          Assumptions
          {edited ? <span className="assumptions__pill">edited</span> : null}
        </button>
        <h3 className="assumptions__print-title">Assumptions used in this report</h3>
        {edited ? (
          <button type="button" className="assumptions__reset no-print" onClick={onReset}>
            Reset to defaults
          </button>
        ) : null}
      </div>

      {!open ? (
        <p className="assumptions__teaser no-print">
          Every figure above is driven by these {ASSUMPTION_FIELDS.length} inputs. Open them,
          change anything you disagree with, and the numbers move with you.
        </p>
      ) : null}

      <div className="assumptions__body">
        {ORDER.map((group) => {
          const fields = ASSUMPTION_FIELDS.filter((f) => f.group === group);
          if (fields.length === 0) return null;
          return (
            <div className="assumptions__group avoid-break" key={group}>
              <h4 className="assumptions__group-title">{GROUP_LABELS[group]}</h4>
              <p className="assumptions__group-note">{GROUP_NOTES[group]}</p>
              <div className="assumptions__rows">
                {fields.map((f) => {
                  const v = readValue(assumptions, f);
                  const inputId = `asm-${f.group}-${f.key}`;
                  return (
                    <div className="asm-row" key={f.key}>
                      <div className="asm-row__text">
                        <label className="asm-row__label" htmlFor={inputId}>{f.label}</label>
                        <p className="asm-row__why">{f.rationale}</p>
                      </div>
                      <div className="asm-row__control no-print">
                        <input
                          id={inputId}
                          type="range"
                          min={f.min}
                          max={f.max}
                          step={f.step}
                          value={v}
                          onChange={(e) => onChange(f.group, f.key, Number(e.target.value))}
                        />
                      </div>
                      <output className="asm-row__value tnum" htmlFor={inputId}>
                        {displayValue(v, f, currency)}
                      </output>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
