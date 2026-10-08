import { describe, it, expect } from 'vitest';
import { parseSchedule, validateExpression, exportCsv, exportJson, gapLabel } from './engine';
const base = {
  expression: '0 9 * * 1-5',
  timeZone: 'Asia/Riyadh',
  startIso: '2026-10-08T06:00:00Z',
  count: 3,
};
describe('numeric five-field grammar', () => {
  it.each([
    '* * * * *',
    '0 9 * * 1-5',
    '*/15 * * * *',
    '0,30 8-18/2 * * 1,3,5',
    '0 0 1 1 *',
    '0 0 * * 7',
  ])('accepts %s', (s) => expect(validateExpression(s)).toBe(s));
  it.each([
    '',
    '* * * *',
    '0 * * * * *',
    '@daily',
    '0 9 * * MON',
    '0 9 L * *',
    'H * * * *',
    '*/0 * * * *',
    '60 * * * *',
    '0 24 * * *',
    '0 0 0 * *',
    '0 0 * 13 *',
    '0 0 * * 8',
    '5-2 * * * *',
    '-1 * * * *',
    '0 0 * * * command',
    '1,,2 * * * *',
    '1/99 * * * *',
  ])('rejects %s', (s) => expect(() => validateExpression(s)).toThrow());
  it('normalizes whitespace', () =>
    expect(validateExpression(' 0   9\t* * 1-5 ')).toBe('0 9 * * 1-5'));
  it('bounds input length', () =>
    expect(() => validateExpression('0,'.repeat(100))).toThrow(/180/));
});
describe('schedule instants', () => {
  it('uses strictly later instants and weekday skipping', () => {
    const r = parseSchedule(base);
    expect(r.occurrences.map((o) => o.iso)).toEqual([
      '2026-10-09T06:00:00.000Z',
      '2026-10-12T06:00:00.000Z',
      '2026-10-13T06:00:00.000Z',
    ]);
    expect(r.occurrences.map((o) => o.gapMinutes)).toEqual([null, 4320, 1440]);
  });
  it('preserves fractional-hour timezone offset', () => {
    const r = parseSchedule({
      ...base,
      expression: '0 9 * * *',
      timeZone: 'Asia/Kathmandu',
      startIso: '2026-10-08T00:00:00Z',
    });
    expect(r.occurrences[0].iso).toBe('2026-10-08T03:15:00.000Z');
    expect(r.occurrences[0].localTime).toBe('09:00');
    expect(r.occurrences[0].offset).toBe('UTC+05:45');
  });
  it('handles leap day', () => {
    const r = parseSchedule({ ...base, expression: '0 0 29 2 *', timeZone: 'UTC', count: 2 });
    expect(r.occurrences.map((o) => o.iso)).toEqual([
      '2028-02-29T00:00:00.000Z',
      '2032-02-29T00:00:00.000Z',
    ]);
  });
  it('skips nonexistent month dates', () => {
    const r = parseSchedule({ ...base, expression: '0 0 31 * *', timeZone: 'UTC' });
    expect(r.occurrences.map((o) => o.localDate)).toEqual([
      '2026-10-31',
      '2026-12-31',
      '2027-01-31',
    ]);
  });
  it('uses OR for day of month and weekday', () => {
    const r = parseSchedule({
      ...base,
      expression: '0 0 1 * 1',
      timeZone: 'UTC',
      startIso: '2026-10-31T00:00:00Z',
    });
    expect(r.occurrences.slice(0, 2).map((o) => o.localDate)).toEqual(['2026-11-01', '2026-11-02']);
    expect(r.warnings.join()).toContain('OR');
  });
  it('reports spring DST offset transition', () => {
    const r = parseSchedule({
      ...base,
      expression: '0 9 * * *',
      timeZone: 'America/New_York',
      startIso: '2027-03-12T00:00:00Z',
      count: 5,
    });
    expect(r.occurrences.map((o) => o.localTime)).toEqual(Array(5).fill('09:00'));
    expect(r.occurrences.map((o) => o.gapMinutes)).toContain(1380);
    expect(r.warnings.join()).toContain('offset change');
  });
  it('reports autumn DST offset transition', () => {
    const r = parseSchedule({
      ...base,
      expression: '0 9 * * *',
      timeZone: 'Europe/London',
      startIso: '2026-10-23T00:00:00Z',
      count: 5,
    });
    expect(r.occurrences.map((o) => o.gapMinutes)).toContain(1500);
    expect(r.warnings.join()).toContain('offset change');
  });
  it('pins cron-parser spring skipped-hour behavior', () => {
    const r = parseSchedule({
      ...base,
      expression: '30 2 * * *',
      timeZone: 'America/New_York',
      startIso: '2027-03-12T00:00:00Z',
      count: 4,
    });
    expect(r.occurrences[2].iso).toBe('2027-03-14T07:30:00.000Z');
    expect(r.occurrences[2].localTime).toBe('03:30');
  });
  it('pins cron-parser fall repeated-hour behavior', () => {
    const r = parseSchedule({
      ...base,
      expression: '30 1 * * *',
      timeZone: 'America/New_York',
      startIso: '2026-10-31T00:00:00Z',
      count: 4,
    });
    expect(r.occurrences.map((o) => o.iso)).toEqual([
      '2026-10-31T05:30:00.000Z',
      '2026-11-01T05:30:00.000Z',
      '2026-11-02T06:30:00.000Z',
      '2026-11-03T06:30:00.000Z',
    ]);
  });
  it('rejects impossible schedules', () =>
    expect(() => parseSchedule({ ...base, expression: '0 0 31 2 *' })).toThrow());
  it.each([
    'bad',
    '2026-02-30T00:00:00Z',
    '2026-13-01T00:00:00Z',
    '2026-10-08',
    '1969-01-01T00:00:00Z',
    '2096-01-01T00:00:00Z',
    '2026-10-08T24:00:00Z',
  ])('rejects invalid UTC start %s', (startIso) =>
    expect(() => parseSchedule({ ...base, startIso })).toThrow(),
  );
  it('rejects invalid timezone', () =>
    expect(() => parseSchedule({ ...base, timeZone: 'Mars/Olympus' })).toThrow(/IANA/));
  it.each([0, 101, 2.5, NaN])('bounds count %s', (count) =>
    expect(() => parseSchedule({ ...base, count })).toThrow(/100/),
  );
  it('has exactly requested count and monotonic timestamps', () => {
    const r = parseSchedule({ ...base, expression: '*/15 * * * *', count: 100 });
    expect(r.occurrences).toHaveLength(100);
    expect(r.occurrences.slice(1).every((o) => o.gapMinutes === 15)).toBe(true);
  });
});
describe('exports and labels', () => {
  it('roundtrips export metadata and UTC instants', () => {
    const r = parseSchedule(base);
    expect(JSON.parse(exportJson(r))).toEqual({ format: 'cronweave/v1', ...r });
  });
  it('exports one CSV row per run', () => {
    const csv = exportCsv(parseSchedule(base));
    expect(csv.trim().split('\r\n')).toHaveLength(4);
    expect(csv).toContain('"Asia/Riyadh"');
    expect(csv).toContain('"2026-10-09T06:00:00.000Z"');
  });
  it('quotes and neutralizes spreadsheet-formula fields', () => {
    const r = parseSchedule(base);
    r.expression = '=HYPERLINK("https://example.com")';
    expect(exportCsv(r)).toContain('"\'=HYPERLINK(""https://example.com"")"');
  });
  it.each([
    [null, 'First preview'],
    [15, '15 min'],
    [60, '1h'],
    [90, '1h 30m'],
    [1440, '1d'],
    [4320, '3d'],
  ] as const)('formats %s minutes', (minutes, label) => expect(gapLabel(minutes)).toBe(label));
});
