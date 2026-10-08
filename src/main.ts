import './style.css';
import { parseSchedule, gapLabel, exportJson, exportCsv, type Schedule } from './engine';

const samples = [
  {
    name: 'Weekday kickoff',
    expression: '0 9 * * 1-5',
    zone: 'Asia/Riyadh',
    subtitle: '09:00 · Monday–Friday',
  },
  {
    name: 'Every 15 minutes',
    expression: '*/15 * * * *',
    zone: 'UTC',
    subtitle: 'A steady quarter-hour pulse',
  },
  {
    name: 'Month-end check',
    expression: '0 18 28-31 * *',
    zone: 'Europe/London',
    subtitle: '18:00 · Valid days 28–31',
  },
  {
    name: 'Across daylight saving',
    expression: '30 2 * * *',
    zone: 'America/New_York',
    subtitle: '02:30 · Spring clock change',
    start: '2027-03-12T00:00',
  },
];
const defaultStart = new Date().toISOString().slice(0, 16);
const zoneList = [
  'UTC',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'Pacific/Auckland',
];
const icon =
  '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4 7h20M4 14h20M4 21h20M7 4v20M14 4v20M21 4v20" stroke="currentColor" stroke-width="2.4"/><circle cx="14" cy="14" r="3" fill="currentColor"/></svg>';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header><a class="brand" href="./" aria-label="CronWeave home"><span class="brand-icon">${icon}</span>CronWeave<span class="version">/ 01</span></a><nav aria-label="Main navigation"><a href="#guide">Field guide</a><a class="github" href="https://github.com/Tabisharaza/cronweave" target="_blank" rel="noreferrer">View source <span aria-hidden="true">↗</span></a></nav></header>
<main><section class="hero"><div><p class="eyebrow"><span></span> A SMALL LAB FOR TIME</p><h1 aria-label="Make time make sense.">Make time<br><em>make sense.</em></h1><p class="intro">Untangle your cron schedule. See every next run,<br class="desktop-break"> every time zone, and the gaps in between.</p></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-a"></div><div class="orbit orbit-b"></div><div class="orbit orbit-c"></div><div class="orbit-dot"></div><span class="art-center">09<span>:00</span></span><span class="art-label">A MOMENT, MADE VISIBLE</span></div></section>
<div class="workspace"><section class="editor panel" aria-labelledby="editor-title"><div class="panel-heading"><p class="eyebrow">01 / THE RECIPE</p><span class="local-badge">LOCAL-ONLY</span></div><h2 id="editor-title">Your schedule</h2><form id="schedule-form" novalidate><label for="expression">Cron expression <span class="hint">5 fields</span></label><input id="expression" name="expression" class="cron-input" value="0 9 * * 1-5" autocomplete="off" spellcheck="false" maxlength="180" aria-describedby="field-labels error"><div id="field-labels" class="field-labels"><span>MINUTE</span><span>HOUR</span><span>DAY</span><span>MONTH</span><span>WEEKDAY</span></div><label for="timezone">Schedule time zone</label><input id="timezone" name="timezone" value="Asia/Riyadh" aria-describedby="error" list="zones" autocomplete="off" spellcheck="false" maxlength="100"><datalist id="zones">${zoneList.map((z) => `<option value="${z}"></option>`).join('')}</datalist><p class="field-help">The expression follows this zone’s local clock.</p><label for="reference">Preview after <span class="hint">UTC</span></label><input id="reference" name="reference" type="datetime-local" aria-describedby="error" value="${defaultStart}" min="1970-01-01T00:00" max="2095-12-31T23:59" required><div class="reference-help"><span>This starting instant is always UTC.</span><button type="button" id="use-now">Use now ↺</button></div><button class="primary" type="submit">Weave my schedule <span aria-hidden="true">↗</span></button><p id="error" class="error" role="alert" hidden></p></form><div class="samples"><p class="eyebrow">START WITH A PATTERN</p>${samples.map((s, i) => `<button type="button" class="sample" data-sample="${i}"><span><strong>${s.name}</strong><small>${s.subtitle}</small></span><span class="sample-arrow" aria-hidden="true">↗</span></button>`).join('')}</div><p class="privacy">${icon}<span>Your schedule stays in this browser.<br>No account, uploads, or saved history.</span></p></section>
<section class="results panel" aria-labelledby="results-title"><div class="panel-heading"><p class="eyebrow">02 / THE BIG PICTURE</p><span class="status"><span></span>PREVIEW</span></div><div id="result-summary"></div><div id="warnings"></div><div class="rhythm"><div class="section-heading"><h3>Daily rhythm</h3><span>Next 24 runs, by local hour</span></div><div id="histogram" class="histogram" role="img"></div><div class="hour-axis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div></div><div class="section-heading runs-heading"><h3>Next in line <span id="run-count">24</span></h3><div class="exports"><button type="button" id="export-json">JSON ↓</button><button type="button" id="export-csv">CSV ↓</button></div></div><div class="table-wrap" tabindex="0" aria-label="Upcoming runs, scroll to see all 24"><table><thead><tr><th scope="col">#</th><th scope="col">LOCAL DATE</th><th scope="col">LOCAL TIME</th><th scope="col">UTC</th><th scope="col">GAP</th></tr></thead><tbody id="runs"></tbody></table></div><p class="table-note">Gaps measure real elapsed time between runs. All 24 entries are exportable.</p><p id="announcement" class="sr-only" role="status" aria-live="polite"></p></section></div>
<section id="guide" class="guide"><div><p class="eyebrow">03 / READ THE THREADS</p><h2>Five fields.<br>One clear plan.</h2><p>Standard numeric, five-field cron.<br>Each field narrows when the clock matches.</p></div><div class="guide-fields"><article><span>01</span><code>0–59</code><h3>Minute</h3><p>The minute of the hour</p></article><article><span>02</span><code>0–23</code><h3>Hour</h3><p>24-hour local clock</p></article><article><span>03</span><code>1–31</code><h3>Day</h3><p>The day of the month</p></article><article><span>04</span><code>1–12</code><h3>Month</h3><p>January to December</p></article><article><span>05</span><code>0–7</code><h3>Weekday</h3><p>Sunday is 0 or 7</p></article></div><div class="syntax"><span><code>*</code>Every value</span><span><code>1,3,5</code>A list</span><span><code>1-5</code>A range</span><span><code>*/15</code>Every 15</span></div><p class="caveat">An explorer, not a scheduler. Predictions use cron-parser and your browser’s time-zone data. Day-of-month and weekday restrictions use OR matching. Daylight-saving behavior and cron dialects vary by platform; verify with your deployment target. Seconds, names, macros, L/W/#/H, and commands are not supported.</p></section></main><footer><a class="brand footer-brand" href="./"><span class="brand-icon">${icon}</span>CronWeave</a><p>Open source. Built for curious builders.</p><a href="https://github.com/Tabisharaza/cronweave/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT licensed ↗</a></footer>`;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const expression = $<HTMLInputElement>('expression'),
  timezone = $<HTMLInputElement>('timezone'),
  reference = $<HTMLInputElement>('reference');
let schedule: Schedule | null = null;
function cell(text: string, tag = 'td') {
  const e = document.createElement(tag);
  e.textContent = text;
  return e;
}
function render() {
  try {
    const startIso =
      reference.value.length === 16 ? reference.value + ':00Z' : reference.value + 'Z';
    const next = parseSchedule({
      expression: expression.value,
      timeZone: timezone.value.trim(),
      startIso,
      count: 24,
    });
    schedule = next;
    expression.value = next.expression;
    $('error').hidden = true;
    expression.removeAttribute('aria-invalid');
    timezone.removeAttribute('aria-invalid');
    reference.removeAttribute('aria-invalid');
    const first = next.occurrences[0];
    const summary = $('result-summary');
    summary.replaceChildren();
    const title = cell('A little structure. A lot of clarity.', 'h2');
    title.id = 'results-title';
    summary.append(title);
    const zone = cell(next.timeZone, 'p');
    zone.className = 'result-zone';
    summary.append(zone);
    const feature = document.createElement('div');
    feature.className = 'next-feature';
    const label = cell('NEXT RUN', 'span');
    label.className = 'eyebrow';
    const time = cell(first.localTime, 'strong');
    const date = cell(`${first.weekday}, ${first.localDate} · ${first.offset}`, 'span');
    feature.append(label, time, date);
    summary.append(feature);
    const warningBox = $('warnings');
    warningBox.replaceChildren();
    for (const message of next.warnings) {
      const p = cell(message, 'p');
      p.className = 'warning';
      warningBox.append(p);
    }
    const counts = Array.from(
      { length: 24 },
      (_, h) => next.occurrences.filter((o) => o.hour === h).length,
    );
    const max = Math.max(...counts);
    const chart = $('histogram');
    chart.replaceChildren();
    chart.setAttribute(
      'aria-label',
      counts.map((n, h) => `${String(h).padStart(2, '0')}:00: ${n} runs`).join('; '),
    );
    counts.forEach((count, h) => {
      const b = document.createElement('div');
      b.className = 'bar-slot';
      const bar = document.createElement('span');
      bar.className = count ? 'bar active' : 'bar';
      bar.style.height = `${count ? Math.max(8, (count / max) * 100) : 3}%`;
      bar.title = `${String(h).padStart(2, '0')}:00 · ${count} ${count === 1 ? 'run' : 'runs'}`;
      b.append(bar);
      chart.append(b);
    });
    const body = $('runs');
    body.replaceChildren();
    next.occurrences.forEach((o, i) => {
      const tr = document.createElement('tr');
      tr.append(
        cell(String(i + 1).padStart(2, '0')),
        cell(`${o.weekday} ${o.localDate}`),
        cell(`${o.localTime} ${o.offset}`),
        cell(o.iso.slice(0, 16).replace('T', ' ')),
        cell(gapLabel(o.gapMinutes)),
      );
      body.append(tr);
    });
    $('announcement').textContent =
      `24 upcoming runs calculated for ${next.timeZone}. Next run ${first.localDate} at ${first.localTime}.`;
    $('export-json').removeAttribute('disabled');
    $('export-csv').removeAttribute('disabled');
  } catch (error) {
    schedule = null;
    const e = $('error');
    e.textContent = error instanceof Error ? error.message : 'Could not preview this schedule.';
    e.hidden = false;
    (e.textContent.includes('IANA')
      ? timezone
      : e.textContent.includes('UTC date')
        ? reference
        : expression
    ).setAttribute('aria-invalid', 'true');
    $('export-json').setAttribute('disabled', '');
    $('export-csv').setAttribute('disabled', '');
    $('announcement').textContent = 'Preview failed. Previous results are out of date.';
  }
  document.querySelector('.results')?.classList.toggle('stale', schedule === null);
}
$('schedule-form').addEventListener('submit', (e) => {
  e.preventDefault();
  render();
});
function markStale() {
  if (!schedule) return;
  schedule = null;
  document.querySelector('.results')?.classList.add('stale');
  $('export-json').setAttribute('disabled', '');
  $('export-csv').setAttribute('disabled', '');
  $('announcement').textContent = 'Inputs changed. Weave the schedule to update the preview.';
}
[expression, timezone, reference].forEach((el) => el.addEventListener('input', markStale));
$('use-now').addEventListener('click', () => {
  reference.value = new Date().toISOString().slice(0, 16);
  markStale();
});
document.querySelectorAll<HTMLButtonElement>('[data-sample]').forEach((button) =>
  button.addEventListener('click', () => {
    const sample = samples[Number(button.dataset.sample)];
    expression.value = sample.expression;
    timezone.value = sample.zone;
    reference.value = sample.start ?? defaultStart;
    render();
  }),
);
function download(type: 'json' | 'csv') {
  if (!schedule) return;
  const blob = new Blob([type === 'json' ? exportJson(schedule) : exportCsv(schedule)], {
    type: type === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cronweave-schedule.${type}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('announcement').textContent = `Schedule exported as ${type.toUpperCase()}.`;
}
$('export-json').addEventListener('click', () => download('json'));
$('export-csv').addEventListener('click', () => download('csv'));
render();
