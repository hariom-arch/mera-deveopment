# Fabric ROI Report Builder

An automated pilot ROI report, plus a pre-sale estimate calculator, over one
shared calculation engine.

```sh
npm install
npm run report -- --pilot pilots/acme-corp    # CSV in, branded PDF out
npm run dev                                    # the estimate calculator
npm test                                       # 108 engine tests
```

## The pilot report

One command per pilot. Drop the analytics export and a small config into a
folder and run it:

```
pilots/acme-corp/
  pilot.json                   client, their salary rates, the metric to prove
  analytics_export_acme.csv    the Fabric analytics export
```

```sh
npm run report -- --pilot pilots/acme-corp
#  Acme Corp — Time to shortlist: 4.0 (target met)
#  Report written to out/acme-corp-fabric-pilot-roi.pdf
```

Six A4 pages, rendered through headless Chromium: cover, the success metric,
analytics, cost saved, time saved, and the method. Add `--out <file.pdf>` to
choose the path, `--html <file.html>` to dump the intermediate markup when
debugging a layout.

Because the config lives on disk, re-running the command on the same folder
produces the same PDF. It drops into CI or a cron with no browser dialog.

### pilot.json

```jsonc
{
  "client": { "name": "Acme Corp", "function": "Engineering", "poc": "Priya Sharma" },
  "currency": "INR",
  "rates": {                       // the client's own figures, not defaults
    "recruiterSalary": 900000,
    "interviewerSalary": 2400000,
    "numRecruiters": 2
  },
  "successMetric": {               // the one question the pilot was run to answer
    "id": "time-to-shortlist",
    "target": 7,                   // what good looked like
    "baseline": 21                 // what it was before
  },
  "outcomes": {                    // what the CSV cannot know
    "timeToShortlistDays": 4,
    "hiresMade": 6
  },
  "assumptions": {                 // optional per-pilot overrides
    "coverage": { "round1": 0.8 }
  },
  "quote": { "text": "...", "author": "Rahul Menon", "title": "Director of Engineering" }
}
```

Validation collects every problem before failing, so a rep fixing a config at
the end of a pilot does not fix one field, re-run, and discover the next.

### The success metric

Every client signs a pilot to answer one question. A report that leads with
cost saved when the client cared about time to shortlist answers the wrong
question, however good the number is. So the metric is chosen per pilot and
gets the top of the report, scored against its target and baseline.

| `successMetric.id` | Direction | Needs |
|---|---|---|
| `time-to-shortlist` | lower is better | `outcomes.timeToShortlistDays` |
| `interview-coverage` | higher is better | nothing, from the CSV |
| `shortlist-quality` | higher is better | nothing, from the CSV |
| `recruiter-capacity` | higher is better | nothing, from the CSV |
| `cost-per-shortlisted` | lower is better | nothing, from the CSV |
| `cost-per-hire` | lower is better | `outcomes.hiresMade` |
| `throughput` | higher is better | nothing, from the CSV |

A metric whose required outcome is missing is refused by name at validation,
rather than printing a blank hero.

## Brand

Fabric is purple (`#8A61FF`) on light surfaces with a black wordmark, Arial for
body and headers, Cambria italic for one accent phrase per title. The lockup in
`assets/` is the official asset from the brand kit.

An earlier build of this tool was dark green. That came from a prototype and was
never Fabric's palette. Arial resolves to Liberation Sans and Cambria to
Caladea where those are not installed, both metric-compatible, so the PDF holds
its layout on any machine.

## Chart colours

Validated with the dataviz palette validator against white, not chosen by eye:

- **Human cost stages**: a neutral ordinal ramp, `#ADA9B6` to `#8D8D97` to
  `#5B5B66`. They are ordered funnel stages, so the ramp carries meaning. Grey
  for the old way.
- **Fabric spend**: the brand purple. Purple for the new way.
- **Candidate funnel**: a purple ordinal ramp, `#BDA9FF` to `#8A61FF` to
  `#523D91`, since that is Fabric's own activity.

The neutral-to-purple pair sits in the CVD warn band, so every bar carries a
direct label and the cost table always prints.

## The model


Everything lives in `src/engine/`:

| File | Role |
|---|---|
| `types.ts` | The shape of the model: inputs, assumptions, result. |
| `defaults.ts` | Default assumptions, per-market pricing, the editable-field list. |
| `calc.ts` | `calculateRoi()` — the single source of truth. |
| `metrics.ts` | The success-metric registry and target scoring. |
| `config.ts` | `pilot.json` schema, validation and assumption merging. |
| `csv.ts` | Fabric analytics export parsing. |
| `format.ts` | Currency and number formatting. |

The report renderer is in `src/report/`: `theme.ts` and `css.ts` hold the brand,
`template.ts` builds the HTML, `render.ts` drives Chromium, `cli.ts` is the
command.

### What is compared

Savings are measured against **variable screening and first-round cost** —
resume review, phone screening and round 1. Recruiter base salary is shown for
context but sits in neither side of the comparison, because it is paid with or
without Fabric. Counting it, as the prototype did, both overstated the saving
and made the headline percentage drift with recruiter headcount even though
headcount cannot change the saving. There is a test for that.

```
baselineVariableCost  = resume + phone + round1          (all human)
withFabricVariableCost = residualHuman + fabricCost
savings                = baselineVariableCost - withFabricVariableCost
savingsPct             = savings / baselineVariableCost
roiMultiple            = savings / fabricCost            (return on Fabric spend)
```

`roiMultiple` is return on what you spend with Fabric. The prototype divided by
a total that included fixed payroll, which produced a number that did not mean
anything.

### The funnel

Modelled forward from hires, so stages stay consistent:

```
applications = hiresPerMonth x applicationsPerHire
phoneScreens = applications  x phoneScreenRate
round1       = phoneScreens  x round1Rate
```

Defaults are 60 applications, 25% to a screen, 40% of those to round 1 — about
15 screens and 6 panels per hire. The prototype hardcoded 500 resumes, 50
screens and 20 round 1 interviews *per hire*, none of them visible or editable.

### Assumptions are visible and editable

Every number that moves the result is in `ASSUMPTION_FIELDS`, rendered in the
Assumptions panel with the reason for its default beside it, and adjustable. A
figure a client cannot interrogate is a figure they will not sign off.

The blanket `+50% inefficiency` buffer is gone. Coordination, scheduling and
debrief time are named, separate assumptions. A client can argue with "10
minutes to schedule a screen"; they cannot argue with an unexplained +50%, they
can only distrust it.

### Coverage

Each stage has a coverage rate. At less than full coverage the human cost that
remains appears as a residual on the Fabric side, rather than the model
pretending the stage vanished.

### Time saved

Recruiter hours and senior interviewer hours are reported **separately**, and
recruiter hours are also expressed as a share of recruiting capacity. The
prototype pooled them and implied every hiring hour disappeared while the same
recruiters stayed on payroll — a claim that contradicts itself the moment
anyone asks where the money went.

### Periods

`calculateRoi()` prices whatever volumes it is given. Annualising needs to know
how long those volumes took, so it is a separate call:

```ts
annualise(result.savings, period)
```

The calculator passes `MONTHLY_PERIOD`. The pilot report derives the period from
the export's call-activity date range. A flat x12 of a four-week pilot misstates
the annual figure by roughly 9%.

### Currency

INR and USD each carry their own list price (₹300 / $4) rather than one being
converted from the other, so switching currency never silently changes what
Fabric costs.

## Report integrity

Computed values in the pilot report are **not** editable. Client details (name,
POC, period label, quote) are real form fields; the client's salary figures are
inputs that feed the model. The prototype made 42 computed values
`contenteditable`, so a rep could change "applications screened" without the
cost beneath it moving, and send a client a report that contradicted itself.

Numbers change by changing the data or an assumption. Never by typing over the
output.

## Display rules

Equations use **exact** values (`money()`); only headline tiles use abbreviated
ones (`moneyShort()`). Printing `₹18.7L − ₹2.1L = ₹16.6L` on the screen that
claims to show the full working is how an ROI page loses an audience.

## Charts

The cost comparison uses one shared scale across both bars, so the length
difference is the saving. Fills were chosen with the dataviz palette validator,
not by eye:

- Human cost stages use a single **ordinal blue ramp** — they are funnel stages,
  so the ordering carries meaning.
- Fabric spend uses a brand-family green stepped into each mode's lightness
  band. Brand `#7EE8A2` is a text accent; it is too light to use as a dark-mode
  fill (L 0.849 against a 0.48–0.67 band).
- Three light-mode fills sit below 3:1 contrast, so the table view is always
  available and always printed.

## Known gaps

- Defaults in `DEFAULT_ASSUMPTIONS` are reasonable industry figures, not
  Fabric's measured funnel data. Replace them when you have real numbers, and
  update the rationale strings in `ASSUMPTION_FIELDS` to cite the source at the
  same time. The report prints those rationales verbatim.
- The report has no e-mail or storage step. It writes a PDF to `out/`; sending
  or hosting it is left to whatever already does that.
- `cal.com` and demo links are hardcoded in `CalculatorMode.tsx`.
- The in-browser pilot preview still exists under the "Pilot report" tab. The
  PDF from `npm run report` is the deliverable; that tab is for checking a
  pilot's numbers quickly.
