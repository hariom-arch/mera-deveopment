import { useId, useState } from 'react';
import { money, percent } from '../engine/format';
import type { RoiResult } from '../engine/types';

const STAGE_FILL: Record<string, string> = {
  resume: 'var(--viz-stage-1)',
  phone: 'var(--viz-stage-2)',
  round1: 'var(--viz-stage-3)',
};

interface Segment {
  key: string;
  label: string;
  value: number;
  fill: string;
  basis: string;
}

interface Props {
  result: RoiResult;
}

/**
 * Two stacked bars on one shared scale: the cost without Fabric, and the cost
 * with it.
 *
 * One scale, one axis. The bars are drawn as percentages of the larger total so
 * the visual length difference *is* the saving — the whole point of the figure.
 * A table view sits underneath because three of the fills fall below 3:1 on the
 * light surface, and because a client will want the numbers anyway.
 */
export function CostComparison({ result }: Props) {
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const tableId = useId();

  const cur = result.currency;

  const baselineSegments: Segment[] = result.lines
    .filter((l) => l.baseline > 0)
    .map((l) => ({
      key: l.id,
      label: l.label,
      value: l.baseline,
      fill: STAGE_FILL[l.id] ?? 'var(--viz-stage-2)',
      basis: l.basis,
    }));

  const afterSegments: Segment[] = [
    ...result.lines
      .filter((l) => l.residual > 0)
      .map((l) => ({
        key: `residual-${l.id}`,
        label: `${l.label} (kept in-house)`,
        value: l.residual,
        fill: STAGE_FILL[l.id] ?? 'var(--viz-stage-2)',
        basis: l.basis,
      })),
    ...(result.fabricCost > 0
      ? [{
          key: 'fabric',
          label: 'Fabric interviews',
          value: result.fabricCost,
          fill: 'var(--viz-fabric)',
          basis: `${Math.round(result.volumes.billableInterviews).toLocaleString('en-US')} interviews × ${money(
            result.fabricCost / Math.max(result.volumes.billableInterviews, 1),
            cur,
          )}`,
        }]
      : []),
  ];

  // One shared scale across both bars, so bar length is comparable.
  const scale = Math.max(result.baselineVariableCost, result.withFabricVariableCost, 1);
  const widthOf = (v: number) => `${(v / scale) * 100}%`;

  const bars = [
    { title: 'Without Fabric', total: result.baselineVariableCost, segments: baselineSegments },
    { title: 'With Fabric', total: result.withFabricVariableCost, segments: afterSegments },
  ];

  const legend = [
    ...result.lines.filter((l) => l.baseline > 0).map((l) => ({
      key: l.id,
      label: l.label,
      fill: STAGE_FILL[l.id] ?? 'var(--viz-stage-2)',
    })),
    ...(result.fabricCost > 0
      ? [{ key: 'fabric', label: 'Fabric interviews', fill: 'var(--viz-fabric)' }]
      : []),
  ];

  return (
    <figure className="viz avoid-break">
      <figcaption className="viz__caption">
        <h3 className="viz__title">Monthly screening cost, before and after</h3>
        <p className="viz__sub">
          Recruiter salary is excluded from both bars — it is paid either way, so
          counting it would overstate the saving.
        </p>
      </figcaption>

      <ul className="viz__legend" aria-hidden="true">
        {legend.map((l) => (
          <li key={l.key} className="viz__legend-item">
            <span className="viz__swatch" style={{ background: l.fill }} />
            {l.label}
          </li>
        ))}
      </ul>

      <div className="viz__bars">
        {bars.map((bar) => (
          <div className="viz__bar-row" key={bar.title}>
            <div className="viz__bar-head">
              <span className="viz__bar-title">{bar.title}</span>
              <span className="viz__bar-total tnum">{money(bar.total, cur)}</span>
            </div>
            <div className="viz__track" style={{ width: widthOf(bar.total) }}>
              {bar.segments.map((s) => (
                <div
                  key={s.key}
                  className={`viz__seg${hover === s.key ? ' is-hover' : ''}`}
                  style={{
                    flexGrow: s.value,
                    background: s.fill,
                  }}
                  onMouseEnter={() => setHover(s.key)}
                  onMouseLeave={() => setHover(null)}
                >
                  {hover === s.key ? (
                    <div className="viz__tip" role="tooltip">
                      <strong>{s.label}</strong>
                      <span className="tnum">{money(s.value, cur)}</span>
                      <em>{s.basis}</em>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* The gap between the bars, named. */}
        <div className="viz__delta">
          <span className="viz__delta-rule" style={{ width: widthOf(result.savings) }} />
          <span className="viz__delta-label tnum">
            {money(result.savings, cur)} saved &middot; {percent(result.savingsPct)} of
            screening cost
          </span>
        </div>
      </div>

      <button
        type="button"
        className="viz__toggle no-print"
        aria-expanded={showTable}
        aria-controls={tableId}
        onClick={() => setShowTable((v) => !v)}
      >
        {showTable ? 'Hide the numbers' : 'Show the numbers'}
      </button>

      <div id={tableId} className={showTable ? 'viz__table-wrap' : 'viz__table-wrap is-print-only'}>
        <table className="data-table">
          <caption className="visually-hidden">
            Monthly screening cost by stage, without and with Fabric
          </caption>
          <thead>
            <tr>
              <th scope="col">Cost item</th>
              <th scope="col" className="num">Without Fabric</th>
              <th scope="col" className="num">With Fabric</th>
            </tr>
          </thead>
          <tbody>
            {result.lines.map((l) => (
              <tr key={l.id}>
                <th scope="row">
                  {l.label}
                  <span className="data-table__basis">{l.basis}</span>
                </th>
                <td className="num tnum">{money(l.baseline, cur)}</td>
                <td className="num tnum">
                  {l.residual > 0 ? (
                    money(l.residual, cur)
                  ) : (
                    <span className="is-covered">{money(0, cur)} &middot; Fabric</span>
                  )}
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">
                Fabric interviews
                <span className="data-table__basis">
                  {Math.round(result.volumes.billableInterviews).toLocaleString('en-US')}{' '}
                  {result.volumes.source === 'actual' ? 'credits used' : 'interviews'}
                </span>
              </th>
              <td className="num tnum">{money(0, cur)}</td>
              <td className="num tnum">{money(result.fabricCost, cur)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Monthly total</th>
              <td className="num tnum">{money(result.baselineVariableCost, cur)}</td>
              <td className="num tnum is-total">{money(result.withFabricVariableCost, cur)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </figure>
  );
}
