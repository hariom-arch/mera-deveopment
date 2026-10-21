import { describe, expect, it } from 'vitest';
import {
  isRecognisableExport,
  parseDurationMinutes,
  parseExportDate,
  parseFabricExport,
  splitCsvLine,
  summariseExport,
} from '../csv';

const SAMPLE = `"Fabric Analytics Export"

"Snapshot Metrics"
Metric,Value
Total Applications,1240
AI Interviews Conducted,186
AI Interviews Cleared,92
Interview Credits,186
Avg Interview Duration,18m 30s

"Call Analytics"
call_time_day,calls
24-03-2025,12
08-04-2025,31
20-04-2025,9

"Job Breakdown"
Profile Name,Total Applications,AI Interviews Conducted,AI Interviews Cleared,Avg Interview Duration
"Senior Backend Engineer",640,96,51,19m 10s
"Growth Marketer, APAC",400,62,31,17m 40s
"Design Lead ""Brand""",200,28,10,16m 0s
Dormant Role,0,0,0,0m 0s
`;

describe('splitCsvLine', () => {
  it('keeps commas inside quoted fields', () => {
    expect(splitCsvLine('"Growth Marketer, APAC",400,62')).toEqual([
      'Growth Marketer, APAC', '400', '62',
    ]);
  });

  it('unescapes doubled quotes instead of dropping them', () => {
    expect(splitCsvLine('"Design Lead ""Brand""",200')).toEqual(['Design Lead "Brand"', '200']);
  });

  it('preserves empty trailing fields', () => {
    expect(splitCsvLine('a,,c,')).toEqual(['a', '', 'c', '']);
  });
});

describe('parseDurationMinutes', () => {
  it('reads minutes and seconds', () => {
    expect(parseDurationMinutes('18m 30s')).toBeCloseTo(18.5, 6);
  });

  it('reads minutes alone and seconds alone', () => {
    expect(parseDurationMinutes('18m')).toBe(18);
    expect(parseDurationMinutes('90s')).toBeCloseTo(1.5, 6);
  });

  it('falls back to a bare number of minutes', () => {
    expect(parseDurationMinutes('17')).toBe(17);
  });

  it('returns 0 for junk rather than NaN', () => {
    expect(parseDurationMinutes('')).toBe(0);
    expect(parseDurationMinutes('n/a')).toBe(0);
  });
});

describe('parseExportDate', () => {
  it('reads DD-MM-YYYY', () => {
    expect(parseExportDate('24-03-2025')!.toISOString().slice(0, 10)).toBe('2025-03-24');
  });

  it('reads YYYY-MM-DD', () => {
    expect(parseExportDate('2025-03-24')!.toISOString().slice(0, 10)).toBe('2025-03-24');
  });

  it('reads DD/MM/YYYY', () => {
    expect(parseExportDate('08/04/2025')!.toISOString().slice(0, 10)).toBe('2025-04-08');
  });

  it('rejects an impossible date', () => {
    expect(parseExportDate('32-13-2025')).toBeNull();
    expect(parseExportDate('not a date')).toBeNull();
  });
});

describe('parseFabricExport', () => {
  const parsed = parseFabricExport(SAMPLE);

  it('reads the snapshot section', () => {
    expect(parsed.snapshot['Total Applications']).toBe('1240');
    expect(parsed.snapshot['Avg Interview Duration']).toBe('18m 30s');
  });

  it('spans the call date range', () => {
    expect(parsed.dateRange!.from.toISOString().slice(0, 10)).toBe('2025-03-24');
    expect(parsed.dateRange!.to.toISOString().slice(0, 10)).toBe('2025-04-20');
  });

  it('keeps roles with activity and drops dormant ones', () => {
    expect(parsed.jobs.map((j) => j.profileName)).toEqual([
      'Senior Backend Engineer', 'Growth Marketer, APAC', 'Design Lead "Brand"',
    ]);
  });

  it('parses per-role durations', () => {
    expect(parsed.jobs[0]!.avgDurationMinutes).toBeCloseTo(19 + 10 / 60, 6);
  });

  it('resolves columns by name, so a reordered export still loads', () => {
    const reordered = `"Job Breakdown"
AI Interviews Cleared,Profile Name,Avg Interview Duration,Total Applications,AI Interviews Conducted
51,Senior Backend Engineer,19m 10s,640,96
`;
    const p = parseFabricExport(reordered);
    expect(p.jobs[0]).toMatchObject({
      profileName: 'Senior Backend Engineer',
      applications: 640,
      interviewsConducted: 96,
      interviewsCleared: 51,
    });
  });

  it('strips thousands separators from numbers', () => {
    const p = parseFabricExport(`"Snapshot Metrics"
Metric,Value
Total Applications,"1,240"
`);
    expect(summariseExport(p).actuals.applications).toBe(1240);
  });

  it('warns about unreadable call dates instead of failing', () => {
    const p = parseFabricExport(`"Call Analytics"
call_time_day,calls
not-a-date,3
24-03-2025,4
`);
    expect(p.warnings.some((w) => w.includes('unreadable date'))).toBe(true);
    expect(p.dateRange).not.toBeNull();
  });

  it('rejects a file that is not a Fabric export', () => {
    expect(isRecognisableExport(parseFabricExport('name,email\nfoo,bar@baz.com'))).toBe(false);
    expect(isRecognisableExport(parsed)).toBe(true);
  });
});

describe('summariseExport', () => {
  const summary = summariseExport(parseFabricExport(SAMPLE));

  it('maps snapshot values onto the volumes the engine prices', () => {
    expect(summary.actuals).toEqual({
      applications: 1240,
      fabricInterviews: 186,
      fabricInterviewsCleared: 92,
      round1Equivalents: 186,
      creditsUsed: 186,
    });
  });

  it('carries the average duration through', () => {
    expect(summary.avgDurationMinutes).toBeCloseTo(18.5, 6);
    expect(summary.avgDurationRaw).toBe('18m 30s');
  });

  it('falls back to summing roles when the snapshot is missing', () => {
    const noSnapshot = `"Job Breakdown"
Profile Name,Total Applications,AI Interviews Conducted,AI Interviews Cleared,Avg Interview Duration
Role A,100,20,10,15m 0s
Role B,200,30,12,17m 0s
`;
    const s = summariseExport(parseFabricExport(noSnapshot));
    expect(s.actuals.applications).toBe(300);
    expect(s.actuals.fabricInterviews).toBe(50);
    expect(s.actuals.fabricInterviewsCleared).toBe(22);
    expect(s.avgDurationMinutes).toBeCloseTo(16, 6);
  });

  it('warns when it has to guess at billing', () => {
    const noCredits = `"Snapshot Metrics"
Metric,Value
Total Applications,500
AI Interviews Conducted,80
`;
    const s = summariseExport(parseFabricExport(noCredits));
    expect(s.actuals.creditsUsed).toBe(80);
    expect(s.warnings.some((w) => w.includes('credits'))).toBe(true);
  });
});
