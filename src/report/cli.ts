#!/usr/bin/env node
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateRoi } from '../engine/calc';
import { ConfigError, assumptionsFrom, inputsFrom, validateConfig } from '../engine/config';
import {
  isRecognisableExport,
  parseFabricExport,
  summariseExport,
} from '../engine/csv';
import { evaluateMetric } from '../engine/metrics';
import type { ReportPeriod } from '../engine/types';
import { logoDataUri, renderPdf } from './render';
import type { ReportData } from './template';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30.4375;

interface Args {
  pilotDir: string;
  outPath?: string;
  htmlPath?: string;
}

function usage(): never {
  console.error(`
Generate a Fabric pilot ROI report.

  npm run report -- --pilot <dir> [--out <file.pdf>] [--html <file.html>]

The pilot directory must contain:
  pilot.json              client details, their salary rates, and the metric
                          the pilot was run to prove
  *.csv                   the Fabric analytics export

Example:
  npm run report -- --pilot pilots/acme-corp
`.trim());
  process.exit(2);
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    switch (flag) {
      case '--pilot': if (!value) usage(); args.pilotDir = value; i++; break;
      case '--out': if (!value) usage(); args.outPath = value; i++; break;
      case '--html': if (!value) usage(); args.htmlPath = value; i++; break;
      case '-h': case '--help': usage(); break;
      default: console.error(`Unknown argument: ${flag}\n`); usage();
    }
  }
  if (!args.pilotDir) usage();
  return args as Args;
}

function derivePeriod(range: { from: Date; to: Date } | null): ReportPeriod {
  if (!range) return { label: 'pilot', months: 1, assumed: true };
  const days = (range.to.getTime() - range.from.getTime()) / MS_PER_DAY + 1;
  return { label: 'pilot', months: Math.max(days / DAYS_PER_MONTH, 1 / DAYS_PER_MONTH) };
}

function formatRange(range: { from: Date; to: Date } | null): string {
  if (!range) return 'Pilot period';
  const f = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${f(range.from)} – ${f(range.to)}`;
}

async function findCsv(dir: string): Promise<string> {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(dir);
  const csvs = entries.filter((e) => e.toLowerCase().endsWith('.csv'));
  if (csvs.length === 0) {
    throw new Error(`No .csv analytics export found in ${dir}`);
  }
  if (csvs.length > 1) {
    throw new Error(
      `Found ${csvs.length} CSV files in ${dir} (${csvs.join(', ')}). Leave only the analytics export.`,
    );
  }
  return join(dir, csvs[0]!);
}

/** Filesystem-safe slug for the output filename. */
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const pilotDir = resolve(args.pilotDir);

  if (!existsSync(pilotDir)) {
    throw new Error(`Pilot directory does not exist: ${pilotDir}`);
  }

  const configPath = join(pilotDir, 'pilot.json');
  if (!existsSync(configPath)) {
    throw new Error(
      `No pilot.json in ${pilotDir}. It holds the client details, their salary rates, ` +
      'and the metric the pilot was run to prove.',
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(configPath, 'utf8'));
  } catch (e) {
    throw new Error(`pilot.json is not valid JSON: ${(e as Error).message}`);
  }
  const config = validateConfig(raw);

  const csvPath = await findCsv(pilotDir);
  const parsed = parseFabricExport(await readFile(csvPath, 'utf8'));
  if (!isRecognisableExport(parsed)) {
    throw new Error(
      `${basename(csvPath)} has no snapshot metrics or job breakdown. ` +
      'It does not look like a Fabric analytics export.',
    );
  }
  const summary = summariseExport(parsed);

  const assumptions = assumptionsFrom(config);
  const inputs = inputsFrom(config);
  const result = calculateRoi(inputs, assumptions, summary.actuals);
  const period = derivePeriod(summary.dateRange);

  const metric = evaluateMetric(config.successMetric, {
    summary,
    result,
    outcomes: config.outcomes ?? {},
    numRecruiters: config.rates.numRecruiters,
    period,
  });

  const data: ReportData = {
    config,
    summary,
    result,
    assumptions,
    metric,
    period,
    periodLabel: config.client.periodLabel ?? formatRange(summary.dateRange),
    generatedAt: new Date(),
    logoDataUri: await logoDataUri(join(REPO_ROOT, 'assets', 'fabric_logo_full.png')),
  };

  const outDir = join(REPO_ROOT, 'out');
  await mkdir(outDir, { recursive: true });
  const outPath = args.outPath
    ? resolve(args.outPath)
    : join(outDir, `${slug(config.client.name)}-fabric-pilot-roi.pdf`);

  await renderPdf(data, {
    outPath,
    ...(args.htmlPath ? { htmlPath: resolve(args.htmlPath) } : {}),
  });

  for (const w of summary.warnings) console.warn(`  warning: ${w}`);
  console.log(`\n  ${config.client.name}, ${metric.def.label}: ` +
    `${metric.actual.toFixed(1)}${metric.metTarget === undefined ? '' : metric.metTarget ? ' (target met)' : ' (target missed)'}`);
  console.log(`  Report written to ${outPath}\n`);
}

main().catch((e: unknown) => {
  if (e instanceof ConfigError) {
    console.error(`\n${e.message}\n`);
  } else {
    console.error(`\n  ${(e as Error).message}\n`);
  }
  process.exit(1);
});
