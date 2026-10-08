import { CronExpressionParser } from 'cron-parser';

export interface ScheduleInput {
  expression: string;
  timeZone: string;
  startIso: string;
  count?: number;
}
export interface Occurrence {
  iso: string;
  localDate: string;
  localTime: string;
  weekday: string;
  offset: string;
  hour: number;
  gapMinutes: number | null;
}
export interface Schedule {
  expression: string;
  timeZone: string;
  startIso: string;
  occurrences: Occurrence[];
  warnings: string[];
}
const bounds = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
];
const names = ['Minute', 'Hour', 'Day of month', 'Month', 'Day of week'];
export function validateExpression(expression: string): string {
  if (expression.length > 180) throw new Error('Keep the expression under 180 characters.');
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5)
    throw new Error('Use exactly five fields: minute, hour, day of month, month, day of week.');
  parts.forEach((field, index) => {
    if (
      !/^(\*|\d{1,2}(?:-\d{1,2})?)(?:\/\d{1,2})?(?:,(\*|\d{1,2}(?:-\d{1,2})?)(?:\/\d{1,2})?)*$/.test(
        field,
      )
    )
      throw new Error(
        `${names[index]}: use numbers, *, ranges (-), lists (,), and steps (/) only.`,
      );
    for (const item of field.split(',')) {
      const [range, step] = item.split('/');
      if (step !== undefined && (+step < 1 || +step > bounds[index][1] - bounds[index][0] + 1))
        throw new Error(`${names[index]}: the step is outside the field's range.`);
      if (range !== '*') {
        const [first, last = first] = range.split('-').map(Number);
        if (first < bounds[index][0] || last > bounds[index][1] || first > last)
          throw new Error(
            `${names[index]}: use values from ${bounds[index][0]} to ${bounds[index][1]} in ascending ranges.`,
          );
      }
    }
  });
  return parts.join(' ');
}
export function formatOccurrence(iso: string, timeZone: string, previous?: string): Occurrence {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return {
    iso,
    localDate: `${get('year')}-${get('month')}-${get('day')}`,
    localTime: `${get('hour')}:${get('minute')}`,
    weekday: get('weekday'),
    offset: get('timeZoneName').replace('GMT', 'UTC'),
    hour: +get('hour'),
    gapMinutes: previous ? (date.getTime() - new Date(previous).getTime()) / 60000 : null,
  };
}
export function parseSchedule(input: ScheduleInput): Schedule {
  const expression = validateExpression(input.expression);
  const count = input.count ?? 24;
  if (!Number.isInteger(count) || count < 1 || count > 100)
    throw new Error('Choose between 1 and 100 occurrences.');
  if (input.timeZone.length > 100)
    throw new Error('Enter a valid IANA time zone, such as Europe/London.');
  try {
    new Intl.DateTimeFormat('en', { timeZone: input.timeZone }).format();
  } catch {
    throw new Error('Enter a valid IANA time zone, such as Europe/London.');
  }
  const start = new Date(input.startIso);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(input.startIso) ||
    !Number.isFinite(start.getTime()) ||
    start.toISOString().replace('.000Z', 'Z') !== input.startIso.replace('.000Z', 'Z') ||
    start.getUTCFullYear() < 1970 ||
    start.getUTCFullYear() > 2095
  )
    throw new Error('Enter a real UTC date between 1970 and 2095.');
  const iterator = CronExpressionParser.parse(expression, {
    currentDate: start,
    tz: input.timeZone,
  });
  const occurrences: Occurrence[] = [];
  try {
    for (let i = 0; i < count; i++) {
      const iso = iterator.next().toDate().toISOString();
      occurrences.push(formatOccurrence(iso, input.timeZone, occurrences.at(-1)?.iso));
    }
  } catch {
    throw new Error(
      'No matching date was found within the parser’s search limit. Check the day and month fields.',
    );
  }
  const fields = expression.split(' ');
  const warnings: string[] = [];
  if (fields[2] !== '*' && fields[4] !== '*')
    warnings.push(
      'Day of month and day of week use OR matching: either field can trigger a run. Check your scheduler’s dialect before deploying.',
    );
  const startOffset = formatOccurrence(start.toISOString(), input.timeZone).offset;
  if (new Set([startOffset, ...occurrences.map((o) => o.offset)]).size > 1)
    warnings.push(
      'A UTC offset change occurs in this preview. Local clock times and elapsed gaps can differ around daylight saving.',
    );
  return {
    expression,
    timeZone: input.timeZone,
    startIso: start.toISOString(),
    occurrences,
    warnings,
  };
}
export function gapLabel(minutes: number | null): string {
  if (minutes === null) return 'First preview';
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
export function exportJson(schedule: Schedule): string {
  return JSON.stringify({ format: 'cronweave/v1', ...schedule }, null, 2);
}
const csvCell = (value: string) =>
  `"${(/^[=+\-@\t\r]/.test(value) ? "'" : '') + value.replace(/"/g, '""')}"`;
export function exportCsv(schedule: Schedule): string {
  const rows = [
    ['expression', 'time_zone', 'utc', 'local_date', 'local_time', 'utc_offset', 'gap_minutes'],
    ...schedule.occurrences.map((o) => [
      schedule.expression,
      schedule.timeZone,
      o.iso,
      o.localDate,
      o.localTime,
      o.offset,
      String(o.gapMinutes ?? ''),
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
