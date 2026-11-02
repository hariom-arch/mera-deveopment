import { annualise, fmtCount } from '../engine/calc';
import type { ExportSummary } from '../engine/csv';
import { ASSUMPTION_FIELDS } from '../engine/defaults';
import { money, moneyShort, multiple, percent } from '../engine/format';
import { formatMetric } from '../engine/metrics';
import type { EvaluatedMetric } from '../engine/metrics';
import type { Assumptions, Currency, ReportPeriod, RoiResult } from '../engine/types';
import type { PilotConfig } from '../engine/config';
import { reportCss, reportCssExtra } from './css';
import { VIZ } from './theme';

export interface ReportData {
  config: PilotConfig;
  summary: ExportSummary;
  result: RoiResult;
  assumptions: Assumptions;
  metric: EvaluatedMetric;
  period: ReportPeriod;
  periodLabel: string;
  generatedAt: Date;
  /** Data URI of the Fabric lockup, so the PDF carries its own assets. */
  logoDataUri: string;
}

/** Escape anything that came from a CSV or a config file before it reaches HTML. */
function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function chrome(data: ReportData, pageNum: number, totalPages: number): string {
  return `
  <div class="chrome">
    <img class="chrome__logo" src="${data.logoDataUri}" alt="Fabric" />
    <span class="page-num tnum">${pad2(pageNum)} / ${pad2(totalPages)}</span>
  </div>`;
}

function dateStr(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ── Shared figure helpers ──────────────────────────────────── */

/**
 * The candidate funnel as nested bars on one shared scale.
 *
 * Applications are the widest bar and each later stage is drawn as its true
 * proportion of that, so the narrowing is the actual drop-off rather than a
 * decorative taper. Steps come from the validated purple ordinal ramp.
 */
function funnelChart(d: ReportData): string {
  const a = d.summary.actuals;
  const hires = d.config.outcomes?.hiresMade;

  const stages: { label: string; note: string; value: number; fill: string }[] = [
    { label: 'Applications', note: 'received', value: a.applications, fill: VIZ.funnel1 },
    { label: 'AI interviews', note: 'conducted by Fabric', value: a.fabricInterviews, fill: VIZ.funnel2 },
    { label: 'Cleared', note: 'shortlisted for the team', value: a.fabricInterviewsCleared, fill: VIZ.funnel3 },
  ];
  if (hires !== undefined && hires > 0) {
    stages.push({ label: 'Hires closed', note: 'from this shortlist', value: hires, fill: VIZ.funnel3 });
  }

  const top = Math.max(a.applications, 1);

  return `<div class="funnel">
    ${stages.map((st, i) => {
      const prev = i > 0 ? stages[i - 1]!.value : null;
      const share = prev && prev > 0 ? (st.value / prev) * 100 : null;
      const trueWidth = (st.value / top) * 100;
      // A bar narrower than its own label would have to be padded to fit the
      // text, which would overstate the stage. Keep the bar at its true length
      // and move the number outside instead.
      const narrow = trueWidth < 8;
      const width = Math.max(trueWidth, 0.8);
      return `<div class="funnel__row">
        <div class="funnel__label">
          <strong>${esc(st.label)}</strong>
          ${esc(st.note)}
        </div>
        <div style="display:flex;align-items:center;">
          <div class="funnel__bar" style="width:${width}%;background:${st.fill}">
            ${narrow ? '' : `<span class="funnel__bar-val tnum">${fmtCount(st.value)}</span>`}
          </div>
          ${narrow ? `<span class="funnel__drop tnum" style="color:var(--black);font-weight:700;">${fmtCount(st.value)}</span>` : ''}
          ${share !== null ? `<span class="funnel__drop tnum">${Math.round(share)}% of previous stage</span>` : ''}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

/** Pass rate per role, sorted highest first, on a shared 0-100% scale. */
function roleBars(d: ReportData): string {
  const rows = d.summary.jobs
    .filter((j) => j.interviewsConducted > 0)
    .map((j) => ({
      name: j.profileName,
      pct: (j.interviewsCleared / j.interviewsConducted) * 100,
    }))
    .sort((x, y) => y.pct - x.pct);

  if (rows.length === 0) return '';

  return `<div class="rolebars">
    ${rows.map((r) => `<div class="rolebar">
      <span class="rolebar__name">${esc(r.name)}</span>
      <div class="rolebar__track"><div class="rolebar__fill" style="width:${Math.max(r.pct, 1)}%"></div></div>
      <span class="rolebar__val tnum">${percent(r.pct)}</span>
    </div>`).join('')}
  </div>`;
}

/**
 * What the pilot's run rate implies over a year.
 *
 * Projected from the measured run rate rather than multiplying the pilot total
 * by twelve, and labelled as a projection, not a result.
 */
function projection(d: ReportData): string {
  const cur = d.config.currency;
  const months = Math.max(d.period.months, 1e-9);
  const annualSavings = annualise(d.result.savings, d.period);
  const annualHours = (d.result.timeSaved.totalHours / months) * 12;
  const annualInterviews = (d.summary.actuals.fabricInterviews / months) * 12;

  return `<div class="projection">
    <div class="projection__item">
      <span class="projection__label">Savings a year</span>
      <span class="projection__val tnum">${moneyShort(annualSavings, cur)}</span>
      <span class="projection__note">${money(annualSavings, cur)} at the pilot's run rate</span>
    </div>
    <div class="projection__item">
      <span class="projection__label">Hours a year</span>
      <span class="projection__val tnum">${Math.round(annualHours).toLocaleString('en-US')}</span>
      <span class="projection__note">about ${Math.round(annualHours / 8).toLocaleString('en-US')} working days</span>
    </div>
    <div class="projection__item">
      <span class="projection__label">Interviews a year</span>
      <span class="projection__val tnum">${Math.round(annualInterviews).toLocaleString('en-US')}</span>
      <span class="projection__note">without adding recruiters</span>
    </div>
    <p class="projection__caveat">
      Projected from ${d.period.months.toFixed(1)} months of measured activity, held at the same
      volume and mix. It is a projection of this pilot's run rate, not a commitment.
    </p>
  </div>`;
}

/* ── Page 1: cover ──────────────────────────────────────────── */
function coverPage(d: ReportData): string {
  const { config, metric } = d;
  const metricValue = formatMetric(metric.actual, metric.def.unit, (n) => money(n, config.currency));

  const targetStr = metric.target === undefined
    ? ''
    : formatMetric(metric.target, metric.def.unit, (n) => money(n, config.currency));

  // The label is printed directly above this line, so it must not restate it.
  const verdict = metric.metTarget === undefined
    ? `Measured over the pilot, across ${fmtCount(d.summary.actuals.fabricInterviews)} AI interviews.`
    : metric.metTarget
      ? `Beat the ${targetStr} target set at the start of the pilot.`
      : `Against a ${targetStr} target set at the start of the pilot.`;

  return `
  <section class="page page--blobs">
    <div class="chrome">
      <img class="chrome__logo" src="${d.logoDataUri}" alt="Fabric" />
      <div class="cover__meta">
        Pilot ROI report<br />
        ${esc(d.periodLabel)}
      </div>
    </div>

    <div class="page__body">
      <span class="eyebrow">Pilot results</span>
      <h1 class="cover__title">
        <span class="cover__accent">What the pilot proved,</span><br />
        and what it saved.
      </h1>
      <p class="cover__for">Prepared for <strong>${esc(config.client.name)}</strong></p>

      <p class="cover__lede">
        This report covers the ${esc(config.client.function?.toLowerCase() ?? 'hiring')} pilot
        across ${d.summary.jobs.length} role${d.summary.jobs.length === 1 ? '' : 's'}. It sets out
        what the pilot was run to prove, the analytics behind it, and the cost and time it saved,
        with every assumption listed so any figure can be checked.
      </p>

      <dl class="cover__chips">
        <div class="cover__chip"><dt>Period</dt><dd>${esc(d.periodLabel)}</dd></div>
        <div class="cover__chip"><dt>Active roles</dt><dd>${d.summary.jobs.length}</dd></div>
        <div class="cover__chip"><dt>Function</dt><dd>${esc(config.client.function ?? 'Not set')}</dd></div>
        <div class="cover__chip"><dt>Fabric POC</dt><dd>${esc(config.client.poc ?? 'Not set')}</dd></div>
      </dl>

      <div class="contents">
        <p class="contents__title">In this report</p>
        <ol class="contents__list">
          <li><span class="contents__num">02</span><span><strong>${esc(metric.def.label)}</strong>, the metric this pilot was run to prove</span></li>
          <li><span class="contents__num">03</span><span><strong>Analytics</strong>, what Fabric processed and how each role did</span></li>
          <li><span class="contents__num">04</span><span><strong>Cost saved</strong>, against the same volume run in-house</span></li>
          <li><span class="contents__num">05</span><span><strong>Time saved</strong>, recruiter and interviewer hours returned</span></li>
          <li><span class="contents__num">06</span><span><strong>Method</strong>, every assumption behind the figures</span></li>
        </ol>
      </div>
    </div>

    <div class="cover__verdict">
      <div class="cover__verdict-val tnum">${metricValue}</div>
      <div class="cover__verdict-text">
        <strong>${esc(metric.def.label)}</strong>
        ${verdict}
      </div>
    </div>
  </section>`;
}

/* ── Page 2: the success metric ─────────────────────────────── */
function metricPage(d: ReportData, pageNum: number, total: number): string {
  const { config, metric } = d;
  const fmt = (n: number) => formatMetric(n, metric.def.unit, (v) => money(v, config.currency));

  const rows: string[] = [];
  if (metric.baseline !== undefined) {
    rows.push(`
      <div class="hero__compare-row">
        <span class="hero__compare-label">Before</span>
        <span class="hero__compare-val tnum">${fmt(metric.baseline)}</span>
      </div>`);
  }
  if (metric.target !== undefined) {
    rows.push(`
      <div class="hero__compare-row">
        <span class="hero__compare-label">Target</span>
        <span class="hero__compare-val tnum">${fmt(metric.target)}
          <span class="verdict-pill ${metric.metTarget ? 'verdict-pill--met' : 'verdict-pill--missed'}">
            ${metric.metTarget ? 'Met' : 'Not met'}
          </span>
        </span>
      </div>`);
  }
  if (metric.changeVsBaselinePct !== undefined) {
    const sign = metric.changeVsBaselinePct > 0 ? '+' : '';
    rows.push(`
      <div class="hero__compare-row">
        <span class="hero__compare-label">Change</span>
        <span class="hero__compare-val tnum">${sign}${metric.changeVsBaselinePct.toFixed(0)}%
          <span class="verdict-pill ${metric.improved ? 'verdict-pill--met' : 'verdict-pill--missed'}">
            ${metric.improved ? 'Improved' : 'Worse'}
          </span>
        </span>
      </div>`);
  }

  const a = d.summary.actuals;
  const coverage = a.applications > 0 ? (a.fabricInterviews / a.applications) * 100 : 0;
  const passRate = a.fabricInterviews > 0 ? (a.fabricInterviewsCleared / a.fabricInterviews) * 100 : 0;

  return `
  <section class="page">
    ${chrome(d, pageNum, total)}
    <div class="page__body">
      <span class="eyebrow">What the pilot was run to prove</span>
      <h2 class="sec-title">${esc(metric.def.label)}</h2>

      <div class="hero">
        <p class="hero__question">&ldquo;${esc(metric.def.question)}&rdquo;</p>
        <div class="hero__row">
          <div class="hero__figure">
            <div class="hero__label">Result</div>
            <div class="hero__val tnum">${fmt(metric.actual)}</div>
          </div>
          <div class="hero__compare">${rows.join('')}</div>
        </div>
        <p class="hero__basis">${esc(metric.basis)}</p>
      </div>

      <h3 class="sec-title" style="font-size:13pt;margin-bottom:4mm;">The funnel behind it</h3>
      ${funnelChart(d)}

      <h3 class="sec-title" style="font-size:13pt;margin:7mm 0 4mm;">Alongside it</h3>
      <div class="stats stats--3">
        <div class="stat">
          <div class="stat__label">Interview coverage</div>
          <div class="stat__val tnum">${percent(coverage)}</div>
          <div class="stat__note">of applicants interviewed, not filtered on a resume alone</div>
        </div>
        <div class="stat">
          <div class="stat__label">Shortlist pass rate</div>
          <div class="stat__val tnum">${percent(passRate)}</div>
          <div class="stat__note">${fmtCount(a.fabricInterviewsCleared)} cleared of ${fmtCount(a.fabricInterviews)}</div>
        </div>
        <div class="stat">
          <div class="stat__label">Roles in parallel</div>
          <div class="stat__val tnum">${d.summary.jobs.length}</div>
          <div class="stat__note">run simultaneously with no added recruiter bandwidth</div>
        </div>
      </div>
    </div>
    <p class="foot">Result measured over ${esc(d.periodLabel)}. Method and assumptions on the final page.</p>
  </section>`;
}

/* ── Page 3: analytics ──────────────────────────────────────── */
function analyticsPage(d: ReportData, pageNum: number, total: number): string {
  const a = d.summary.actuals;
  const coverage = a.applications > 0 ? (a.fabricInterviews / a.applications) * 100 : 0;

  const roleRows = d.summary.jobs.map((j) => {
    const pass = j.interviewsConducted > 0
      ? percent((j.interviewsCleared / j.interviewsConducted) * 100)
      : 'Not recorded';
    return `
      <tr>
        <th scope="row">${esc(j.profileName)}</th>
        <td class="num tnum">${j.applications.toLocaleString('en-US')}</td>
        <td class="num tnum">${j.interviewsConducted.toLocaleString('en-US')}</td>
        <td class="num tnum">${j.interviewsCleared.toLocaleString('en-US')}</td>
        <td class="num tnum">${pass}</td>
        <td class="num tnum">${esc(j.avgDuration || 'Not recorded')}</td>
      </tr>`;
  }).join('');

  return `
  <section class="page">
    ${chrome(d, pageNum, total)}
    <div class="page__body">
      <span class="eyebrow">Analytics</span>
      <h2 class="sec-title">What Fabric handled</h2>
      <p class="sec-lede">
        Every figure on this page comes straight from the pilot's analytics export.
        Nothing here is modelled.
      </p>

      <div class="stats">
        <div class="stat">
          <div class="stat__label">Applications screened</div>
          <div class="stat__val tnum">${a.applications.toLocaleString('en-US')}</div>
          <div class="stat__note">every one reviewed</div>
        </div>
        <div class="stat stat--accent">
          <div class="stat__label">AI interviews conducted</div>
          <div class="stat__val tnum">${a.fabricInterviews.toLocaleString('en-US')}</div>
          <div class="stat__note">${percent(coverage)} of applicants invited</div>
        </div>
        <div class="stat">
          <div class="stat__label">Interviews cleared</div>
          <div class="stat__val tnum">${a.fabricInterviewsCleared.toLocaleString('en-US')}</div>
          <div class="stat__note">shortlisted for the hiring team</div>
        </div>
        <div class="stat">
          <div class="stat__label">Average duration</div>
          <div class="stat__val tnum">${esc(d.summary.avgDurationRaw || `${d.summary.avgDurationMinutes.toFixed(0)} min`)}</div>
          <div class="stat__note">per candidate, fully async</div>
        </div>
      </div>

      <h3 class="sec-title" style="font-size:13pt;margin-bottom:4mm;">By role</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">Role</th>
            <th scope="col" class="num">Applied</th>
            <th scope="col" class="num">Interviewed</th>
            <th scope="col" class="num">Cleared</th>
            <th scope="col" class="num">Pass rate</th>
            <th scope="col" class="num">Avg duration</th>
          </tr>
        </thead>
        <tbody>${roleRows}</tbody>
      </table>

      <h3 class="sec-title" style="font-size:13pt;margin:7mm 0 4mm;">Pass rate by role</h3>
      <p class="sec-lede" style="margin-bottom:4mm;">
        Share of interviewed candidates who cleared. A low rate is not a failure: it means
        Fabric filtered harder on that role before anyone's calendar was touched.
      </p>
      ${roleBars(d)}
    </div>
    <p class="foot">Source: Fabric analytics export for ${esc(d.periodLabel)}.</p>
  </section>`;
}

/* ── Page 4: cost saved ─────────────────────────────────────── */
function costPage(d: ReportData, pageNum: number, total: number): string {
  const { result, config, period } = d;
  const cur: Currency = config.currency;
  const scale = Math.max(result.baselineVariableCost, result.withFabricVariableCost, 1);
  const w = (v: number) => `${(v / scale) * 100}%`;

  const fills: Record<string, string> = {
    resume: VIZ.stage1, phone: VIZ.stage2, round1: VIZ.stage3,
  };

  const baselineSegs = result.lines
    .filter((l) => l.baseline > 0)
    .map((l) => {
      const share = l.baseline / result.baselineVariableCost;
      return `<div class="viz__seg" style="flex-grow:${l.baseline};background:${fills[l.id]}">
        ${share > 0.12 ? `<span class="viz__seg-label tnum">${moneyShort(l.baseline, cur)}</span>` : ''}
      </div>`;
    }).join('');

  const afterSegs = [
    ...result.lines.filter((l) => l.residual > 0).map((l) =>
      `<div class="viz__seg" style="flex-grow:${l.residual};background:${fills[l.id]}"></div>`),
    result.fabricCost > 0
      ? `<div class="viz__seg" style="flex-grow:${result.fabricCost};background:${VIZ.fabric}">
           <span class="viz__seg-label tnum">${moneyShort(result.fabricCost, cur)}</span>
         </div>`
      : '',
  ].join('');

  const tableRows = result.lines.map((l) => `
    <tr>
      <th scope="row">${esc(l.label)}<span class="basis">${esc(l.basis)}</span></th>
      <td class="num tnum">${money(l.baseline, cur)}</td>
      <td class="num tnum">${l.residual > 0 ? money(l.residual, cur) : `<span class="covered">${money(0, cur)}</span>`}</td>
    </tr>`).join('');

  const monthlyRunRate = result.savings / Math.max(period.months, 1e-9);
  const annual = annualise(result.savings, period);

  return `
  <section class="page">
    ${chrome(d, pageNum, total)}
    <div class="page__body">
      <span class="eyebrow">Cost saved</span>
      <h2 class="sec-title">What it cost, against what it replaced</h2>
      <p class="sec-lede">
        Priced on ${fmtCount(result.volumes.billableInterviews)} interview credits at
        ${money(d.assumptions.rates.costPerInterview, cur)} each, against the same volume run
        in-house at ${money(result.rates.recruiter, cur)}/hr for a recruiter and
        ${money(result.rates.interviewer, cur)}/hr for a senior interviewer. Recruiter base
        salary is excluded from both sides: it is paid either way.
      </p>

      <div class="viz">
        <ul class="viz__legend">
          ${result.lines.filter((l) => l.baseline > 0).map((l) =>
            `<li><span class="viz__swatch" style="background:${fills[l.id]}"></span>${esc(l.label)}</li>`).join('')}
          <li><span class="viz__swatch" style="background:${VIZ.fabric}"></span>Fabric interviews</li>
        </ul>

        <div class="viz__bar">
          <div class="viz__bar-head">
            <span class="viz__bar-title">Without Fabric</span>
            <span class="viz__bar-total tnum">${money(result.baselineVariableCost, cur)}</span>
          </div>
          <div class="viz__track" style="width:${w(result.baselineVariableCost)}">${baselineSegs}</div>
        </div>

        <div class="viz__bar">
          <div class="viz__bar-head">
            <span class="viz__bar-title">With Fabric</span>
            <span class="viz__bar-total tnum">${money(result.withFabricVariableCost, cur)}</span>
          </div>
          <div class="viz__track" style="width:${w(result.withFabricVariableCost)}">${afterSegs}</div>
        </div>

        <div class="viz__delta tnum">
          ${money(result.savings, cur)} saved &middot; ${percent(result.savingsPct)} of screening cost
        </div>
      </div>

      <table style="margin-bottom:6mm;">
        <thead>
          <tr>
            <th scope="col">Cost item</th>
            <th scope="col" class="num">Without Fabric</th>
            <th scope="col" class="num">With Fabric</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <tr>
            <th scope="row">Fabric interviews<span class="basis">${fmtCount(result.volumes.billableInterviews)} credits used</span></th>
            <td class="num tnum">${money(0, cur)}</td>
            <td class="num tnum">${money(result.fabricCost, cur)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td class="num tnum">${money(result.baselineVariableCost, cur)}</td>
            <td class="num tnum">${money(result.withFabricVariableCost, cur)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="equation">
        <div>
          <div class="eq__row"><span class="eq__op"></span><span class="eq__val tnum">${money(result.baselineVariableCost, cur)}</span></div>
          <p class="eq__note">screening and round 1, in-house</p>
          <div class="eq__row"><span class="eq__op">&minus;</span><span class="eq__val tnum">${money(result.withFabricVariableCost, cur)}</span></div>
          <p class="eq__note">${result.residualHumanCost > 0 ? 'Fabric spend plus the stages kept in-house' : 'Fabric spend'}</p>
          <div class="eq__row eq__row--sum">
            <span class="eq__op">=</span>
            <span class="eq__val tnum">${money(result.savings, cur)}</span>
          </div>
          <p class="eq__note">saved over the ${esc(period.label)}</p>
        </div>
        <div class="eq__side">
          <div>
            <div class="eq__side-label">Monthly run rate</div>
            <div class="eq__side-val tnum">${moneyShort(monthlyRunRate, cur)}</div>
            <div class="eq__side-note">${money(result.savings, cur)} over ${period.months.toFixed(1)} months</div>
          </div>
          <div>
            <div class="eq__side-label">Annualised</div>
            <div class="eq__side-val tnum">${moneyShort(annual, cur)}</div>
            <div class="eq__side-note">${money(annual, cur)} at this run rate</div>
          </div>
          <div>
            <div class="eq__side-label">Return on Fabric spend</div>
            <div class="eq__side-val tnum">${multiple(result.roiMultiple)}</div>
            <div class="eq__side-note">${money(result.savings, cur)} saved per ${money(result.fabricCost, cur)} spent</div>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

/* ── Page 5: time saved + takeaways ─────────────────────────── */
function timePage(d: ReportData, pageNum: number, total: number): string {
  const t = d.result.timeSaved;
  const a = d.summary.actuals;
  const cur = d.config.currency;
  const passRate = a.fabricInterviews > 0 ? (a.fabricInterviewsCleared / a.fabricInterviews) * 100 : 0;

  const quote = d.config.quote?.text
    ? `<div class="quote">
         <p>&ldquo;${esc(d.config.quote.text)}&rdquo;</p>
         <footer>${esc(d.config.quote.author ?? '')}${d.config.quote.title ? `, ${esc(d.config.quote.title)}` : ''}</footer>
       </div>`
    : '';

  return `
  <section class="page">
    ${chrome(d, pageNum, total)}
    <div class="page__body">
      <span class="eyebrow">Time saved</span>
      <h2 class="sec-title">Hours the team got back</h2>
      <p class="sec-lede">
        Recruiter and senior interviewer hours are counted separately. Recruiter time is
        capacity that gets redeployed to sourcing and closing, not headcount removed from
        payroll.
      </p>

      <div class="stats stats--3">
        <div class="stat">
          <div class="stat__label">Recruiter hours freed</div>
          <div class="stat__val tnum">${Math.round(t.recruiterHours).toLocaleString('en-US')}<span class="stat__unit">hrs</span></div>
          <div class="stat__note">${t.recruiterCapacityFreedPct !== null
            ? `${percent(t.recruiterCapacityFreedPct)} of the recruiting team's capacity`
            : 'returned to sourcing and closing'}</div>
        </div>
        <div class="stat">
          <div class="stat__label">Senior interviewer hours freed</div>
          <div class="stat__val tnum">${Math.round(t.interviewerHours).toLocaleString('en-US')}<span class="stat__unit">hrs</span></div>
          <div class="stat__note">panel and debrief time returned to engineering</div>
        </div>
        <div class="stat stat--accent">
          <div class="stat__label">Combined</div>
          <div class="stat__val tnum">${Math.round(t.totalHours).toLocaleString('en-US')}<span class="stat__unit">hrs</span></div>
          <div class="stat__note">about ${t.workingDays.toFixed(0)} working days at 8 hours</div>
        </div>
      </div>

      <h3 class="sec-title" style="font-size:13pt;margin-bottom:4mm;">Where this leaves you</h3>
      <ul class="takeaways">
        <li>
          <strong>${formatMetric(d.metric.actual, d.metric.def.unit, (n) => money(n, cur))}</strong>
          on ${esc(d.metric.def.label.toLowerCase())}${d.metric.metTarget !== undefined
            ? `, ${d.metric.metTarget ? 'ahead of' : 'against'} the target set at the start of the pilot`
            : ''}.
        </li>
        <li>
          <strong>${money(d.result.savings, cur)}</strong> saved on screening and first-round cost,
          a ${multiple(d.result.roiMultiple)} return on what was spent with Fabric.
        </li>
        <li>
          <strong>${Math.round(t.totalHours).toLocaleString('en-US')} hours</strong> returned to
          recruiters and senior interviewers.
        </li>
        <li>
          <strong>${percent(passRate)}</strong> of interviewed candidates cleared, giving
          ${a.fabricInterviewsCleared.toLocaleString('en-US')} shortlisted profiles across
          ${d.summary.jobs.length} role${d.summary.jobs.length === 1 ? '' : 's'}.
        </li>
      </ul>

      ${projection(d)}

      ${quote}
    </div>
  </section>`;
}

/* ── Page 6: method ─────────────────────────────────────────── */
function methodPage(d: ReportData, pageNum: number, total: number): string {
  const cur = d.config.currency;
  const groups: Record<string, string> = {
    funnel: 'Funnel shape', effort: 'Time per task',
    coverage: 'What Fabric covers', rates: 'Rates and pricing',
  };

  // In report mode the volumes come from the export, so the modelled funnel
  // ratios drove nothing here. Listing them would imply they did.
  const usesModelledFunnel = d.result.volumes.source !== 'actual';
  const shown = usesModelledFunnel
    ? (['funnel', 'effort', 'coverage', 'rates'] as const)
    : (['effort', 'coverage', 'rates'] as const);

  const rows = (shown as readonly ('funnel' | 'effort' | 'coverage' | 'rates')[]).flatMap((group) => {
    const fields = ASSUMPTION_FIELDS.filter((f) => f.group === group);
    if (fields.length === 0) return [];
    const header = `<tr><th colspan="3" style="padding-top:4mm;color:${VIZ.fabric};font-size:7.5pt;letter-spacing:0.08em;text-transform:uppercase;border-bottom-width:0.4mm;">${groups[group]}</th></tr>`;
    const body = fields.map((f) => {
      const v = (d.assumptions[group] as unknown as Record<string, number>)[f.key] ?? 0;
      const shown = f.unit === 'percent' ? `${Math.round(v * 100)}%`
        : f.unit === 'minutes' ? `${v} min`
        : f.unit === 'hours' ? `${v} hrs`
        : f.unit === 'currency' ? money(v, cur)
        : v.toLocaleString('en-US');
      return `<tr>
        <th scope="row">${esc(f.label)}</th>
        <td class="basis" style="display:table-cell;">${esc(f.rationale)}</td>
        <td class="num tnum" style="font-weight:700;">${shown}</td>
      </tr>`;
    }).join('');
    return [header + body];
  }).join('');

  return `
  <section class="page">
    ${chrome(d, pageNum, total)}
    <div class="page__body">
      <span class="eyebrow">Method</span>
      <h2 class="sec-title">How every figure was calculated</h2>
      <p class="sec-lede">
        Volumes come from the analytics export. Everything else comes from the assumptions
        below. They are listed in full so any of them can be challenged, and the report
        regenerated with your own numbers.
      </p>

      <table>
        <thead>
          <tr>
            <th scope="col">Assumption</th>
            <th scope="col">Why this value</th>
            <th scope="col" class="num">Used</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="method-note">
        <strong>What this report does not claim.</strong>
        Candidate volumes are taken from the analytics export, not modelled, so no funnel
        estimate affects any figure here. Savings cover resume screening, phone screening and
        first-round interviews only: sourcing, later interview rounds, offer and onboarding
        costs are outside the comparison. Recruiter base salary appears on neither side,
        because it is paid with or without Fabric.
      </div>
    </div>
    <p class="foot">
      Generated from ${esc(d.config.client.name)}'s Fabric analytics export on
      ${dateStr(d.generatedAt)}. Salary rates supplied by ${esc(d.config.client.name)}:
      recruiter ${money(d.config.rates.recruiterSalary, cur)}/yr, senior interviewer
      ${money(d.config.rates.interviewerSalary, cur)}/yr.
    </p>
  </section>`;
}

/** Render the full report as a single self-contained HTML document. */
export function renderReportHtml(d: ReportData): string {
  const total = 6;
  const pages = [
    coverPage(d),
    metricPage(d, 2, total),
    analyticsPage(d, 3, total),
    costPage(d, 4, total),
    timePage(d, 5, total),
    methodPage(d, 6, total),
  ].join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(d.config.client.name)}, Fabric Pilot ROI Report</title>
<style>${reportCss}${reportCssExtra}</style>
</head>
<body>
${pages}
</body>
</html>`;
}
