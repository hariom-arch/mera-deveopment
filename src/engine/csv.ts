import type { ActualVolumes } from './types';

export interface JobRow {
  profileName: string;
  applications: number;
  interviewsConducted: number;
  interviewsCleared: number;
  avgDuration: string;
  avgDurationMinutes: number;
}

export interface ParsedExport {
  snapshot: Record<string, string>;
  jobs: JobRow[];
  dateRange: { from: Date; to: Date } | null;
  /** Non-fatal problems worth surfacing rather than silently absorbing. */
  warnings: string[];
}

/**
 * RFC 4180 field splitter: honours quoted fields and "" escapes.
 *
 * The previous implementation dropped every quote character it saw, which
 * corrupted any profile name containing one.
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Read "18m 30s", "18m", "90s" or a bare number of minutes. */
export function parseDurationMinutes(raw: string): number {
  if (!raw) return 0;
  const text = raw.trim();

  const ms = text.match(/(\d+(?:\.\d+)?)\s*m(?:in)?/i);
  const ss = text.match(/(\d+(?:\.\d+)?)\s*s(?:ec)?/i);
  if (ms || ss) {
    const mins = ms?.[1] ? parseFloat(ms[1]) : 0;
    const secs = ss?.[1] ? parseFloat(ss[1]) : 0;
    return mins + secs / 60;
  }

  const bare = parseFloat(text);
  return Number.isFinite(bare) ? bare : 0;
}

/** Accept DD-MM-YYYY, YYYY-MM-DD and DD/MM/YYYY. Returns null when unreadable. */
export function parseExportDate(raw: string): Date | null {
  const t = raw.trim();

  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return makeDate(+m[1]!, +m[2]!, +m[3]!);

  m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return makeDate(+m[3]!, +m[2]!, +m[1]!);

  return null;
}

function makeDate(y: number, mo: number, d: number): Date | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function num(raw: string | undefined): number {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

type Section = 'snapshot' | 'calls' | 'jobs' | null;

const JOB_FIELD_ALIASES: Record<keyof Omit<JobRow, 'avgDurationMinutes'>, string[]> = {
  profileName: ['profilename', 'jobtitle', 'role', 'job'],
  applications: ['totalapplications', 'applications', 'applied'],
  interviewsConducted: ['aiinterviewsconducted', 'interviewsconducted', 'interviewed'],
  interviewsCleared: ['aiinterviewscleared', 'interviewscleared', 'cleared'],
  avgDuration: ['avginterviewduration', 'avgduration', 'duration'],
};

function indexFor(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => aliases.includes(norm(h)));
}

/**
 * Parse a Fabric analytics export.
 *
 * Section headers are matched on a normalised substring and column positions are
 * resolved by name, so a reordered or renamed-but-recognisable export still
 * loads instead of producing a report full of zeroes.
 */
export function parseFabricExport(text: string): ParsedExport {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const snapshot: Record<string, string> = {};
  const jobs: JobRow[] = [];
  const warnings: string[] = [];
  let from: Date | null = null;
  let to: Date | null = null;

  let section: Section = null;
  let jobHeaders: string[] | null = null;
  let unreadableDates = 0;

  for (const line of lines) {
    const flat = norm(line);

    if (flat.includes('snapshotmetrics')) { section = 'snapshot'; continue; }
    if (flat.includes('callanalytics')) { section = 'calls'; continue; }
    if (flat.includes('jobbreakdown')) { section = 'jobs'; jobHeaders = null; continue; }

    const cols = splitCsvLine(line);

    if (section === 'snapshot') {
      const key = cols[0];
      if (!key || norm(key) === 'metric') continue;
      if (cols.length >= 2) snapshot[key] = cols[1] ?? '';
      continue;
    }

    if (section === 'calls') {
      const first = cols[0];
      if (!first || norm(first) === 'calltimeday') continue;
      const dt = parseExportDate(first);
      if (!dt) { unreadableDates++; continue; }
      if (!from || dt < from) from = dt;
      if (!to || dt > to) to = dt;
      continue;
    }

    if (section === 'jobs') {
      if (!jobHeaders) {
        if (indexFor(cols, JOB_FIELD_ALIASES.profileName) !== -1) jobHeaders = cols;
        continue;
      }
      const iName = indexFor(jobHeaders, JOB_FIELD_ALIASES.profileName);
      const iApps = indexFor(jobHeaders, JOB_FIELD_ALIASES.applications);
      const iDone = indexFor(jobHeaders, JOB_FIELD_ALIASES.interviewsConducted);
      const iClr = indexFor(jobHeaders, JOB_FIELD_ALIASES.interviewsCleared);
      const iDur = indexFor(jobHeaders, JOB_FIELD_ALIASES.avgDuration);

      const name = iName >= 0 ? (cols[iName] ?? '') : '';
      if (!name) continue;

      const applications = iApps >= 0 ? num(cols[iApps]) : 0;
      const interviewsConducted = iDone >= 0 ? num(cols[iDone]) : 0;
      if (applications <= 0 && interviewsConducted <= 0) continue;

      const avgDuration = iDur >= 0 ? (cols[iDur] ?? '') : '';
      jobs.push({
        profileName: name,
        applications,
        interviewsConducted,
        interviewsCleared: iClr >= 0 ? num(cols[iClr]) : 0,
        avgDuration,
        avgDurationMinutes: parseDurationMinutes(avgDuration),
      });
    }
  }

  if (unreadableDates > 0) {
    warnings.push(`${unreadableDates} call row${unreadableDates === 1 ? '' : 's'} had an unreadable date and were skipped.`);
  }

  return {
    snapshot,
    jobs,
    dateRange: from && to ? { from, to } : null,
    warnings,
  };
}

function snapshotValue(snapshot: Record<string, string>, aliases: string[]): string | undefined {
  for (const [k, v] of Object.entries(snapshot)) {
    if (aliases.includes(norm(k))) return v;
  }
  return undefined;
}

export interface ExportSummary {
  actuals: ActualVolumes;
  avgDurationMinutes: number;
  avgDurationRaw: string;
  dateRange: { from: Date; to: Date } | null;
  jobs: JobRow[];
  warnings: string[];
}

/**
 * Turn a parsed export into the volumes the engine prices.
 *
 * `round1Equivalents` falls back to interviews conducted: every AI interview
 * stood in for a first-round conversation a human would otherwise have run.
 */
export function summariseExport(parsed: ParsedExport): ExportSummary {
  const s = parsed.snapshot;
  const warnings = [...parsed.warnings];

  const applications = num(snapshotValue(s, ['totalapplications', 'applications']))
    || parsed.jobs.reduce((t, j) => t + j.applications, 0);
  const conducted = num(snapshotValue(s, ['aiinterviewsconducted', 'interviewsconducted']))
    || parsed.jobs.reduce((t, j) => t + j.interviewsConducted, 0);
  const cleared = num(snapshotValue(s, ['aiinterviewscleared', 'interviewscleared']))
    || parsed.jobs.reduce((t, j) => t + j.interviewsCleared, 0);

  const durRaw = snapshotValue(s, ['avginterviewduration', 'avgduration']) ?? '';
  let avgDurationMinutes = parseDurationMinutes(durRaw);
  if (avgDurationMinutes === 0 && parsed.jobs.length > 0) {
    const withDur = parsed.jobs.filter((j) => j.avgDurationMinutes > 0);
    if (withDur.length > 0) {
      avgDurationMinutes =
        withDur.reduce((t, j) => t + j.avgDurationMinutes, 0) / withDur.length;
    }
  }

  const creditsRaw = snapshotValue(s, ['interviewcredits', 'credits', 'creditsused']);
  let creditsUsed = num(creditsRaw);
  if (creditsRaw === undefined) {
    creditsUsed = conducted;
    warnings.push('No interview credits column found — billing falls back to interviews conducted.');
  }

  return {
    actuals: {
      applications,
      fabricInterviews: conducted,
      fabricInterviewsCleared: cleared,
      round1Equivalents: conducted,
      creditsUsed,
    },
    avgDurationMinutes,
    avgDurationRaw: durRaw,
    dateRange: parsed.dateRange,
    jobs: parsed.jobs,
    warnings,
  };
}

export function isRecognisableExport(parsed: ParsedExport): boolean {
  const hasSnapshot = Object.keys(parsed.snapshot).length > 0;
  return hasSnapshot || parsed.jobs.length > 0;
}
