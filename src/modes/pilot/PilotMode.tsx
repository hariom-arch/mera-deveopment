import { useMemo, useState } from 'react';
import { AssumptionsPanel } from '../../components/AssumptionsPanel';
import { CostComparison } from '../../components/CostComparison';
import { Logo } from '../../components/Logo';
import { SavingsEquation } from '../../components/SavingsEquation';
import { TeamRates } from '../../components/TeamRates';
import { TimeSaved } from '../../components/TimeSaved';
import { money, moneyShort, multiple, percent } from '../../engine/format';
import type { ExportSummary } from '../../engine/csv';
import { parseFabricExport, summariseExport } from '../../engine/csv';
import type { ReportPeriod } from '../../engine/types';
import type { RoiState } from '../../state';
import { UploadPane } from './UploadPane';
import { SAMPLE_CSV } from './sample';

export interface ClientMeta {
  clientName: string;
  poc: string;
  functionName: string;
  periodLabel: string;
  quote: string;
  quoteAuthor: string;
}

const EMPTY_META: ClientMeta = {
  clientName: '',
  poc: '',
  functionName: 'Engineering',
  periodLabel: '',
  quote: '',
  quoteAuthor: '',
};

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30.4375;

/**
 * How long the pilot ran, in months, measured inclusively from the first to the
 * last day of call activity.
 *
 * Without this, annualising a four-week pilot by a flat x12 overstates the
 * yearly figure by roughly 9% — small enough to pass unnoticed and large enough
 * to be wrong in front of a finance team.
 */
function derivePeriod(range: { from: Date; to: Date } | null): ReportPeriod {
  if (!range) {
    return { label: 'pilot', months: 1, assumed: true };
  }
  const days = (range.to.getTime() - range.from.getTime()) / MS_PER_DAY + 1;
  return { label: 'pilot', months: Math.max(days / DAYS_PER_MONTH, 1 / DAYS_PER_MONTH) };
}

function formatRange(range: { from: Date; to: Date } | null): string {
  if (!range) return '';
  const f = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${f(range.from)} – ${f(range.to)}`;
}

interface Props {
  roi: RoiState;
  summary: ExportSummary | null;
  onSummary: (s: ExportSummary | null) => void;
}

/**
 * The pilot report.
 *
 * Client details are real form fields, and every figure is derived from the
 * export plus the assumptions. The prototype made 42 computed values
 * `contenteditable`, which let a rep change "applications screened" without the
 * cost beneath it moving — producing a report that contradicted itself. Here,
 * numbers change by changing the data or an assumption, never by typing over
 * the output.
 */
export function PilotMode({ roi, summary, onSummary }: Props) {
  const [meta, setMeta] = useState<ClientMeta>(EMPTY_META);
  const { result, assumptions, inputs } = roi;
  const cur = inputs.currency;

  const period = useMemo(() => derivePeriod(summary?.dateRange ?? null), [summary]);

  const periodLabel = useMemo(
    () => meta.periodLabel || formatRange(summary?.dateRange ?? null) || 'Pilot period',
    [meta.periodLabel, summary],
  );

  if (!summary) {
    return (
      <UploadPane
        onLoaded={onSummary}
        onUseSample={() => onSummary(summariseExport(parseFabricExport(SAMPLE_CSV)))}
      />
    );
  }

  const passRate =
    summary.actuals.fabricInterviews > 0
      ? (summary.actuals.fabricInterviewsCleared / summary.actuals.fabricInterviews) * 100
      : 0;
  const inviteRate =
    summary.actuals.applications > 0
      ? (summary.actuals.fabricInterviews / summary.actuals.applications) * 100
      : 0;

  const set = <K extends keyof ClientMeta>(k: K, v: ClientMeta[K]) =>
    setMeta((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="pilot">
      {/* ── Report controls, never printed ──────────────────── */}
      <div className="pilot__bar no-print">
        <div className="pilot__bar-left">
          <span className="pilot__ready">Report ready</span>
          <span className="pilot__hint">
            Fill in the client details, check the assumptions, then export.
          </span>
        </div>
        <div className="pilot__bar-right">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onSummary(null)}>
            New report
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()}>
            Export PDF
          </button>
        </div>
      </div>

      {summary.warnings.length > 0 ? (
        <div className="pilot__warnings no-print" role="status">
          <strong>Worth checking:</strong>
          <ul>
            {summary.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      ) : null}

      {/* ── Client details ─────────────────────────────────── */}
      <section className="pilot__meta no-print">
        <h3 className="pilot__meta-title">Client details</h3>
        <div className="pilot__meta-grid">
          <label className="mini-field">
            <span>Client name</span>
            <input value={meta.clientName} placeholder="Acme Corp"
              onChange={(e) => set('clientName', e.target.value)} />
          </label>
          <label className="mini-field">
            <span>Fabric POC</span>
            <input value={meta.poc} placeholder="Who ran the pilot"
              onChange={(e) => set('poc', e.target.value)} />
          </label>
          <label className="mini-field">
            <span>Hiring function</span>
            <input value={meta.functionName}
              onChange={(e) => set('functionName', e.target.value)} />
          </label>
          <label className="mini-field">
            <span>Period</span>
            <input value={meta.periodLabel} placeholder={formatRange(summary.dateRange) || 'Pilot period'}
              onChange={(e) => set('periodLabel', e.target.value)} />
          </label>
          <label className="mini-field mini-field--wide">
            <span>Stakeholder quote (optional)</span>
            <textarea rows={2} value={meta.quote}
              placeholder="Something the hiring manager said about candidate quality or time saved."
              onChange={(e) => set('quote', e.target.value)} />
          </label>
          <label className="mini-field">
            <span>Quote attribution</span>
            <input value={meta.quoteAuthor} placeholder="Name, Title"
              onChange={(e) => set('quoteAuthor', e.target.value)} />
          </label>
        </div>

        <h3 className="pilot__meta-title">The client's own rates</h3>
        <p className="pilot__meta-note">
          The baseline is priced at these salaries. Use the client's real figures &mdash;
          a cost built on numbers they have never seen is the first thing they will
          challenge.
        </p>
        <TeamRates roi={roi} />
      </section>

      {/* ── The report ─────────────────────────────────────── */}
      <article className="report">
        <header className="report__cover avoid-break">
          <div className="report__cover-top">
            <Logo height={26} />
            <div className="report__cover-meta">
              Pilot ROI report<br />
              <span>{periodLabel}</span>
            </div>
          </div>
          <h1 className="report__title">
            What the Fabric pilot<br /><em>actually cost and saved.</em>
          </h1>
          <p className="report__for">
            Prepared for <strong>{meta.clientName || 'your team'}</strong>
          </p>
          <dl className="report__chips">
            <div><dt>Period</dt><dd>{periodLabel}</dd></div>
            <div><dt>Active roles</dt><dd>{summary.jobs.length}</dd></div>
            <div><dt>Function</dt><dd>{meta.functionName || '—'}</dd></div>
            <div><dt>Fabric POC</dt><dd>{meta.poc || '—'}</dd></div>
          </dl>
        </header>

        {/* 01 Volume */}
        <section className="report__section avoid-break">
          <p className="report__eyebrow">01 &middot; Volume</p>
          <h2 className="report__h2">What Fabric handled</h2>
          <div className="report__stats">
            <div className="rstat">
              <dt>Applications screened</dt>
              <dd className="tnum">{summary.actuals.applications.toLocaleString('en-US')}</dd>
              <p>Every one reviewed.</p>
            </div>
            <div className="rstat">
              <dt>AI interviews conducted</dt>
              <dd className="tnum">{summary.actuals.fabricInterviews.toLocaleString('en-US')}</dd>
              <p>{percent(inviteRate)} of applicants invited.</p>
            </div>
            <div className="rstat">
              <dt>Interviews cleared</dt>
              <dd className="tnum">{summary.actuals.fabricInterviewsCleared.toLocaleString('en-US')}</dd>
              <p>{percent(passRate)} pass rate.</p>
            </div>
            <div className="rstat">
              <dt>Average duration</dt>
              <dd className="tnum">
                {summary.avgDurationRaw || (
                  <>{summary.avgDurationMinutes.toFixed(0)}<span className="rstat__unit">min</span></>
                )}
              </dd>
              <p>Per candidate, fully async.</p>
            </div>
          </div>
        </section>

        {/* 02 Cost */}
        <section className="report__section print-page-break">
          <p className="report__eyebrow">02 &middot; Cost</p>
          <h2 className="report__h2">What it cost, against what it replaced</h2>
          <p className="report__lede">
            Priced on {Math.round(summary.actuals.creditsUsed).toLocaleString('en-US')} interview
            credits at {money(assumptions.rates.costPerInterview, cur)} each, against the same
            volume handled in-house at a recruiter rate of{' '}
            {money(result.rates.recruiter, cur)}/hr and a senior interviewer rate of{' '}
            {money(result.rates.interviewer, cur)}/hr.
          </p>
          <CostComparison result={result} />
          <SavingsEquation result={result} period={period} />
        </section>

        {/* 03 Time */}
        <section className="report__section avoid-break">
          <p className="report__eyebrow">03 &middot; Time</p>
          <h2 className="report__h2">Hours the team got back</h2>
          <TimeSaved result={result} />
        </section>

        {/* 04 Roles */}
        {summary.jobs.length > 0 ? (
          <section className="report__section avoid-break">
            <p className="report__eyebrow">04 &middot; By role</p>
            <h2 className="report__h2">Performance across each opening</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col" className="num">Applied</th>
                  <th scope="col" className="num">Interviewed</th>
                  <th scope="col" className="num">Cleared</th>
                  <th scope="col" className="num">Pass rate</th>
                  <th scope="col" className="num">Avg duration</th>
                </tr>
              </thead>
              <tbody>
                {summary.jobs.map((j) => (
                  <tr key={j.profileName}>
                    <th scope="row">{j.profileName}</th>
                    <td className="num tnum">{j.applications.toLocaleString('en-US')}</td>
                    <td className="num tnum">{j.interviewsConducted.toLocaleString('en-US')}</td>
                    <td className="num tnum">{j.interviewsCleared.toLocaleString('en-US')}</td>
                    <td className="num tnum">
                      {j.interviewsConducted > 0
                        ? percent((j.interviewsCleared / j.interviewsConducted) * 100)
                        : '—'}
                    </td>
                    <td className="num tnum">{j.avgDuration || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {/* 05 Summary */}
        <section className="report__section avoid-break">
          <p className="report__eyebrow">05 &middot; Summary</p>
          <h2 className="report__h2">Where this leaves you</h2>
          <div className="report__summary">
            <div className="report__summary-figure">
              <span className="report__summary-label">Saved over the pilot</span>
              <strong className="tnum">{moneyShort(result.savings, cur)}</strong>
              <span className="report__summary-exact tnum">
                {money(result.savings, cur)} &middot;{' '}
                {multiple(result.roiMultiple)} return on Fabric spend
                {period.assumed ? null : (
                  <>
                    <br />
                    {moneyShort(result.savings / period.months, cur)} a month at this
                    run rate, over {period.months.toFixed(1)} months
                  </>
                )}
              </span>
            </div>
            <ul className="report__summary-points">
              <li>
                {Math.round(result.timeSaved.recruiterHours).toLocaleString('en-US')} recruiter
                hours and {Math.round(result.timeSaved.interviewerHours).toLocaleString('en-US')}{' '}
                senior interviewer hours returned to the team.
              </li>
              <li>
                {summary.jobs.length} role{summary.jobs.length === 1 ? '' : 's'} run in parallel
                with no scheduling coordination.
              </li>
              <li>
                {percent(passRate)} of interviewed candidates cleared, giving{' '}
                {summary.actuals.fabricInterviewsCleared.toLocaleString('en-US')} shortlisted
                profiles for the hiring team.
              </li>
            </ul>
          </div>

          {meta.quote ? (
            <blockquote className="report__quote">
              <p>&ldquo;{meta.quote}&rdquo;</p>
              {meta.quoteAuthor ? <footer>&mdash; {meta.quoteAuthor}</footer> : null}
            </blockquote>
          ) : null}
        </section>

        {/* Assumptions travel with the report */}
        <section className="report__section print-page-break">
          <p className="report__eyebrow">06 &middot; Method</p>
          <h2 className="report__h2">How every figure was calculated</h2>
          <p className="report__lede">
            Volumes come from the pilot export. Everything else comes from the
            assumptions below. Change any of them and every number in this report
            moves with it.
          </p>
          <AssumptionsPanel
            assumptions={assumptions}
            currency={cur}
            edited={roi.assumptionsEdited}
            onChange={roi.setAssumption}
            onReset={roi.resetAssumptions}
            defaultOpen
          />
        </section>

        <footer className="report__footer">
          <Logo height={22} />
          <p>
            Generated from a Fabric analytics export on{' '}
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        </footer>
      </article>
    </div>
  );
}
