# Fabric ROI Report Builder

Two outputs, one calculation engine:

- **Estimate** — a prospect-facing calculator for use before a pilot.
- **Pilot report** — a client deliverable built from a real Fabric analytics
  export, after a pilot.

Both call the same `calculateRoi()`. That is the point of the rebuild: the
previous prototype had the calculator and the report each carrying their own
copy of the maths, and the two priced a human first-round interview differently
(60 minutes versus the AI's own ~18), so the same client could be shown two
different ROI stories.

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # engine tests
npm run build      # typecheck + static build into dist/
```

Static output — deploy `dist/` anywhere.

## The model

Everything lives in `src/engine/`:

| File | Role |
|---|---|
| `types.ts` | The shape of the model: inputs, assumptions, result. |
| `defaults.ts` | Default assumptions, per-market pricing, the editable-field list. |
| `calc.ts` | `calculateRoi()` — the single source of truth. |
| `csv.ts` | Fabric analytics export parsing. |
| `format.ts` | Currency and number formatting. |

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

- No persistence or shareable links. Reports are generated client-side and
  exported via print-to-PDF. A saved-report backend would need a server.
- The logo is a placeholder inline SVG in `src/components/Logo.tsx`. The
  prototype pulled it from a Google image-cache URL, which would break; replace
  this with the real asset.
- `cal.com` and demo links are hardcoded in `CalculatorMode.tsx`.
- Defaults are reasonable industry figures, not Fabric's measured funnel data.
  Replace the values in `DEFAULT_ASSUMPTIONS` with real numbers when you have
  them — the rationale strings in `ASSUMPTION_FIELDS` should be updated to cite
  the source at the same time.
