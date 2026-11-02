import { BRAND, PAGE, VIZ } from './theme';

/** Stylesheet for the printed report. Inlined into the HTML so the PDF is self-contained. */
export const reportCss = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --primary: ${BRAND.primary};
  --deep: ${BRAND.deep};
  --icon-bg: ${BRAND.iconBg};
  --light: ${BRAND.light};
  --tint-bg: ${BRAND.tintBg};
  --tint-border: ${BRAND.tintBorder};
  --bullet: ${BRAND.bullet};
  --black: ${BRAND.black};
  --gray: ${BRAND.gray};
  --gray-light: ${BRAND.grayLight};
  --line: ${BRAND.line};
  --dark-bg: ${BRAND.darkBg};
  --stage-1: ${VIZ.stage1};
  --stage-2: ${VIZ.stage2};
  --stage-3: ${VIZ.stage3};
  --fabric: ${VIZ.fabric};
}

@page { size: A4 portrait; margin: 0; }

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  font-family: Arial, 'Liberation Sans', Helvetica, sans-serif;
  color: var(--black);
  background: #fff;
  font-size: 10pt;
  line-height: 1.5;
}

.tnum { font-variant-numeric: tabular-nums; }

/* ── Page ─────────────────────────────────────────────────── */
.page {
  position: relative;
  width: ${PAGE.widthMm}mm;
  height: ${PAGE.heightMm}mm;
  padding: ${PAGE.marginMm}mm ${PAGE.marginMm}mm 18mm;
  background: #fff;
  overflow: hidden;
  break-after: page;
  display: flex;
  flex-direction: column;
}
.page:last-child { break-after: auto; }

/* Light gradient blobs, as used on the deck's title and closing slides. */
.page--blobs {
  background:
    radial-gradient(44% 36% at 88% 6%, rgba(138,97,255,0.20) 0%, rgba(138,97,255,0) 70%),
    radial-gradient(38% 32% at 4% 92%, rgba(195,177,255,0.26) 0%, rgba(195,177,255,0) 72%),
    radial-gradient(30% 26% at 70% 96%, rgba(106,86,223,0.12) 0%, rgba(106,86,223,0) 70%),
    #fff;
}
.page--dark {
  background:
    radial-gradient(50% 40% at 78% 12%, rgba(138,97,255,0.38) 0%, rgba(138,97,255,0) 72%),
    radial-gradient(40% 34% at 10% 88%, rgba(110,71,212,0.26) 0%, rgba(110,71,212,0) 74%),
    var(--dark-bg);
  color: #fff;
}
.page--dark .eyebrow { border-color: rgba(255,255,255,0.28); color: rgba(255,255,255,0.86); }
.page--dark .page-num { color: rgba(255,255,255,0.5); }
.page--dark .sec-title { color: #fff; }
.page--dark .sec-lede { color: rgba(255,255,255,0.72); }

/* ── Chrome ───────────────────────────────────────────────── */
.chrome {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 9mm;
  flex: none;
}
.chrome__logo { height: 8mm; width: auto; display: block; }
.page-num {
  font-size: 8pt;
  letter-spacing: 0.1em;
  color: var(--gray-light);
  padding-top: 1mm;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 2mm;
  border: 0.4mm solid var(--light);
  border-radius: 999px;
  padding: 1.1mm 3.4mm;
  font-size: 7.5pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 4mm;
  align-self: flex-start;
  flex: none;
}
.eyebrow::before {
  content: '';
  width: 1.6mm; height: 1.6mm;
  border-radius: 50%;
  background: var(--primary);
  flex: none;
}

.page__body { flex: 1 1 auto; min-height: 0; }

/* ── Cover ────────────────────────────────────────────────── */
.cover__meta {
  text-align: right;
  font-size: 8pt;
  line-height: 1.6;
  color: var(--gray-light);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.cover__title {
  font-size: 30pt;
  line-height: 1.16;
  font-weight: 700;
  letter-spacing: -0.015em;
  margin-bottom: 5mm;
  max-width: 150mm;
}
.cover__accent {
  font-family: Cambria, Caladea, Georgia, serif;
  font-style: italic;
  font-weight: 400;
  color: var(--primary);
}
.cover__for {
  font-size: 12pt;
  color: var(--gray);
  margin-bottom: 10mm;
}
.cover__for strong { color: var(--black); font-weight: 700; }

.cover__chips {
  display: grid;
  /* The period holds a full date range, so it gets a wider column. */
  grid-template-columns: 1.7fr 1fr 1.1fr 1.2fr;
  gap: 5mm;
  border-top: 0.3mm solid var(--line);
  padding-top: 5mm;
}
.cover__chip dt {
  font-size: 7.5pt;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--gray-light);
  margin-bottom: 1.2mm;
}
.cover__chip dd { font-size: 10.5pt; font-weight: 700; }

.cover__verdict {
  margin-top: auto;
  border: 0.4mm solid var(--tint-border);
  background: var(--tint-bg);
  border-radius: 3mm;
  padding: 6mm 7mm;
  display: flex;
  align-items: center;
  gap: 7mm;
}
.cover__verdict-val {
  font-size: 26pt;
  font-weight: 700;
  color: var(--primary);
  line-height: 1;
  white-space: nowrap;
}
.cover__verdict-text { font-size: 9.5pt; color: var(--gray); line-height: 1.5; }
.cover__verdict-text strong { color: var(--black); display: block; font-size: 10.5pt; margin-bottom: 1mm; }

/* ── Section headings ─────────────────────────────────────── */
.sec-title {
  font-size: 19pt;
  font-weight: 700;
  letter-spacing: -0.012em;
  line-height: 1.2;
  margin-bottom: 2.5mm;
}
.sec-lede {
  font-size: 9.5pt;
  color: var(--gray);
  max-width: 158mm;
  margin-bottom: 6mm;
}

/* ── Hero metric ──────────────────────────────────────────── */
.hero {
  border: 0.4mm solid var(--tint-border);
  background: var(--tint-bg);
  border-radius: 3mm;
  padding: 8mm;
  margin-bottom: 6mm;
}
.hero__question {
  font-family: Cambria, Caladea, Georgia, serif;
  font-style: italic;
  font-size: 12pt;
  color: var(--deep);
  margin-bottom: 5mm;
  max-width: 150mm;
}
.hero__row { display: flex; align-items: flex-end; gap: 10mm; }
.hero__figure { flex: none; }
.hero__label {
  font-size: 8pt;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--gray-light);
  margin-bottom: 2mm;
}
.hero__val {
  font-size: 44pt;
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--primary);
}
.hero__compare { display: grid; gap: 3mm; padding-bottom: 2mm; }
.hero__compare-row {
  display: grid;
  grid-template-columns: 26mm auto;
  align-items: baseline;
  gap: 4mm;
  font-size: 9.5pt;
}
.hero__compare-label {
  font-size: 8pt;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gray-light);
}
.hero__compare-val { font-weight: 700; }
.verdict-pill {
  display: inline-block;
  border-radius: 999px;
  padding: 0.8mm 3mm;
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.verdict-pill--met { background: var(--icon-bg); color: var(--button); }
.verdict-pill--missed { background: #F3F3F5; color: var(--gray); }
.hero__basis {
  font-size: 8.5pt;
  color: var(--gray);
  border-top: 0.3mm solid var(--tint-border);
  margin-top: 5mm;
  padding-top: 3.5mm;
}

/* ── Stat grid ────────────────────────────────────────────── */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4mm;
  margin-bottom: 6mm;
}
.stats--3 { grid-template-columns: repeat(3, 1fr); }
.stat {
  border: 0.3mm solid var(--line);
  border-radius: 2.5mm;
  padding: 5mm;
}
.stat--accent { border-color: var(--light); background: var(--tint-bg); }
.stat__label {
  font-size: 7.5pt;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gray-light);
  margin-bottom: 2.5mm;
  min-height: 7mm;
}
.stat__val { font-size: 21pt; font-weight: 700; line-height: 1; letter-spacing: -0.015em; }
.stat--accent .stat__val { color: var(--primary); }
.stat__unit { font-size: 10pt; font-weight: 400; color: var(--gray-light); margin-left: 1mm; }
.stat__note { font-size: 8pt; color: var(--gray); margin-top: 2mm; line-height: 1.4; }

/* ── Cost comparison chart ────────────────────────────────── */
.viz { margin-bottom: 6mm; }
.viz__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 2mm 6mm;
  list-style: none;
  margin-bottom: 5mm;
}
.viz__legend li {
  display: flex; align-items: center; gap: 2mm;
  font-size: 8.5pt; color: var(--gray);
}
.viz__swatch { width: 2.6mm; height: 2.6mm; border-radius: 0.8mm; flex: none; }

.viz__bar { margin-bottom: 4mm; }
.viz__bar-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 1.6mm;
}
.viz__bar-title { font-size: 9.5pt; font-weight: 700; }
.viz__bar-total { font-size: 10pt; font-weight: 700; }
.viz__track { display: flex; gap: 0.5mm; height: 9mm; }
.viz__seg { position: relative; min-width: 0.6mm; border-radius: 0.8mm; }
.viz__seg-label {
  position: absolute;
  inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 7.5pt; font-weight: 700; color: #fff;
  white-space: nowrap;
}
.viz__delta {
  display: flex; align-items: center; gap: 3mm;
  border-top: 0.3mm dashed var(--light);
  padding-top: 3mm;
  font-size: 9.5pt;
  color: var(--primary);
  font-weight: 700;
}

/* ── Equation ─────────────────────────────────────────────── */
.equation {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 8mm;
  border: 0.4mm solid var(--tint-border);
  background: var(--tint-bg);
  border-radius: 3mm;
  padding: 6mm 7mm;
}
.eq__row {
  display: grid;
  grid-template-columns: 4mm auto;
  gap: 2.5mm;
  align-items: baseline;
  margin-bottom: 2.5mm;
}
.eq__op { color: var(--gray-light); font-size: 11pt; text-align: center; }
.eq__val { font-size: 12pt; font-weight: 700; white-space: nowrap; }
.eq__note { font-size: 8pt; color: var(--gray); grid-column: 2; margin-top: -1mm; }
.eq__row--sum {
  border-top: 0.3mm solid var(--light);
  padding-top: 3mm;
  margin-top: 1mm;
}
.eq__row--sum .eq__val { font-size: 17pt; color: var(--primary); }
.eq__side { display: grid; gap: 4mm; align-content: start; border-left: 0.3mm solid var(--light); padding-left: 8mm; }
.eq__side-label {
  font-size: 7.5pt; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--gray-light);
}
.eq__side-val { font-size: 15pt; font-weight: 700; line-height: 1.1; }
.eq__side-note { font-size: 7.5pt; color: var(--gray); line-height: 1.4; }

/* ── Tables ───────────────────────────────────────────────── */
table { width: 100%; border-collapse: collapse; font-size: 9pt; }
th, td { padding: 2.4mm 3mm; text-align: left; vertical-align: top; border-bottom: 0.3mm solid var(--line); }
thead th {
  font-size: 7.5pt; letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--gray-light); font-weight: 700;
  border-bottom-width: 0.4mm;
}
tbody th { font-weight: 400; }
.num { text-align: right; white-space: nowrap; }
.basis { display: block; font-size: 7.5pt; color: var(--gray-light); margin-top: 0.8mm; line-height: 1.35; }
tfoot th, tfoot td { font-weight: 700; border-bottom: none; border-top: 0.4mm solid var(--black); }
.covered { color: var(--primary); font-weight: 700; }

/* ── Quote ────────────────────────────────────────────────── */
.quote {
  border-left: 0.8mm solid var(--primary);
  padding-left: 6mm;
  margin-top: 6mm;
}
.quote p {
  font-family: Cambria, Caladea, Georgia, serif;
  font-style: italic;
  font-size: 13pt;
  line-height: 1.45;
  margin-bottom: 2.5mm;
}
.quote footer {
  font-size: 8.5pt;
  color: var(--gray);
  font-weight: 700;
  letter-spacing: 0.01em;
}

/* ── Takeaways ────────────────────────────────────────────── */
.takeaways { list-style: none; display: grid; gap: 3mm; }
.takeaways li {
  position: relative;
  padding-left: 6mm;
  font-size: 10pt;
  line-height: 1.5;
}
.takeaways li::before {
  content: '';
  position: absolute; left: 0; top: 2.2mm;
  width: 2.2mm; height: 2.2mm;
  border-radius: 50%;
  background: var(--primary);
}

/* ── Footer note ──────────────────────────────────────────── */
.foot {
  margin-top: auto;
  border-top: 0.3mm solid var(--line);
  padding-top: 3.5mm;
  font-size: 7.5pt;
  color: var(--gray-light);
  flex: none;
}
`;

/** Blocks added after the first print review, to fill pages with real content. */
export const reportCssExtra = `
/* ── Cover contents list ──────────────────────────────────── */
.cover__lede {
  font-size: 11pt;
  line-height: 1.6;
  color: var(--gray);
  max-width: 142mm;
  margin-bottom: 9mm;
}
.contents {
  border-top: 0.3mm solid var(--line);
  padding-top: 5mm;
  margin-top: 9mm;
}
.contents__title {
  font-size: 7.5pt; letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--gray-light); margin-bottom: 3.5mm;
}
.contents__list {
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.4mm 10mm;
}
.contents__list li {
  display: grid;
  grid-template-columns: 7mm 1fr;
  font-size: 9.5pt;
  color: var(--gray);
  align-items: baseline;
}
.contents__list li strong { color: var(--black); font-weight: 700; }
.contents__num { color: var(--primary); font-weight: 700; font-size: 8.5pt; }

/* ── Funnel chart ─────────────────────────────────────────── */
.funnel { display: grid; gap: 3mm; margin-bottom: 2mm; }
.funnel__row { display: grid; grid-template-columns: 42mm 1fr; align-items: center; gap: 4mm; }
.funnel__label { font-size: 9pt; color: var(--gray); }
.funnel__label strong { display: block; color: var(--black); font-size: 9.5pt; font-weight: 700; }
.funnel__bar {
  height: 7.5mm;
  border-radius: 0.8mm;
  display: flex; align-items: center;
  /* A floor of 10mm made a 6-hire stage render as wide as a 92-candidate one.
     Keep it to a visible sliver so bar length stays true to the number. */
  min-width: 1.5mm;
  flex: none;
}
.funnel__bar:not(:empty) { padding: 0 2.5mm; }
.funnel__bar-val { font-size: 8.5pt; font-weight: 700; color: #fff; white-space: nowrap; }
.funnel__drop { font-size: 8pt; color: var(--gray-light); padding-left: 2.5mm; white-space: nowrap; }

/* ── Per-role bars ────────────────────────────────────────── */
.rolebars { display: grid; gap: 3.2mm; }
.rolebar { display: grid; grid-template-columns: 52mm 1fr 14mm; align-items: center; gap: 4mm; }
.rolebar__name { font-size: 9pt; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rolebar__track { height: 5mm; background: var(--tint-bg); border-radius: 0.8mm; overflow: hidden; }
.rolebar__fill { height: 100%; background: var(--primary); border-radius: 0.8mm; }
.rolebar__val { font-size: 9pt; font-weight: 700; text-align: right; }

/* ── Projection ───────────────────────────────────────────── */
.projection {
  border: 0.4mm solid var(--tint-border);
  background: var(--tint-bg);
  border-radius: 3mm;
  padding: 6mm 7mm;
  margin-top: 6mm;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7mm;
}
.projection__item { display: grid; gap: 1.2mm; }
.projection__label {
  font-size: 7.5pt; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--gray-light);
}
.projection__val { font-size: 17pt; font-weight: 700; color: var(--primary); line-height: 1.1; }
.projection__note { font-size: 7.5pt; color: var(--gray); line-height: 1.4; }
.projection__caveat {
  grid-column: 1 / -1;
  border-top: 0.3mm solid var(--light);
  padding-top: 3mm;
  font-size: 7.5pt;
  color: var(--gray);
}

/* ── Method note ──────────────────────────────────────────── */
.method-note {
  border-left: 0.8mm solid var(--light);
  padding-left: 5mm;
  margin-top: 6mm;
  font-size: 8.5pt;
  color: var(--gray);
  line-height: 1.55;
}
.method-note strong { color: var(--black); }
`;
