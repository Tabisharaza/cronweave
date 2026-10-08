<div align="center">
<img src="public/favicon.svg" width="64" alt="CronWeave woven clock mark" />

# CronWeave

### Make time make sense.

A local-only cron playground that turns five fields into a clear, timezone-aware schedule.

[How it works](#how-it-works) · [Contribute](CONTRIBUTING.md)

![CI](https://github.com/Tabisharaza/cronweave/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-d9ed99?labelColor=17372c)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

</div>

Browser checks and live deployment are in progress. Actual screenshots will be added after verification.

## A schedule you can actually see

Cron is compact. Its surprises usually aren't. CronWeave brings the next 24 execution times into one view, with local dates, exact UTC instants, offsets, and real elapsed gaps.

- **Explore across time zones.** Preview Riyadh workdays, Kathmandu's quarter-hour offset, or New York's spring clock change.
- **Spot the rhythm.** An accessible hourly chart summarizes the next 24 occurrences, alongside a scrollable data table.
- **See offset changes.** Preview warnings call out daylight-saving transitions and day-of-month/weekday OR semantics.
- **Keep inputs local.** Parsing and downloads happen in your browser. No account, uploads, analytics, storage, or job execution.
- **Take the results with you.** Export all 24 rows as CSV or structured JSON with expression and timezone metadata.
- **Learn by changing a pattern.** Built-in examples, a five-field guide, clear validation errors, and stale-result protection.

## Quick start

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the localhost URL shown by Vite. Edit the expression and zone, pick a **UTC** starting instant, and select **Weave my schedule**. The first result is strictly after that instant. Changes mark old results stale and disable export until you calculate again.

```text
┌────────── minute        0–59
│ ┌──────── hour          0–23
│ │ ┌────── day of month  1–31
│ │ │ ┌──── month         1–12
│ │ │ │ ┌── day of week   0–7 (Sunday = 0 or 7)
│ │ │ │ │
0 9 * * 1-5
```

## How it works

CronWeave adds a focused validation, visualization and export layer around [cron-parser](https://github.com/harrisiirak/cron-parser), using the browser's time-zone data through Intl and Luxon. The schedule engine is kept separate from the DOM so its behavior can be regression-tested directly.

```text
Numeric expression + IANA zone + UTC reference
                 ↓
       Validation → cron-parser
                 ↓
     UTC occurrences + local formatting
                 ↓
       Rhythm chart / table / exports
```

### Supported dialect

Exactly five numeric fields, using `*`, lists (`0,30`), inclusive ranges (`1-5`) and steps (`*/15`). Seconds, names, commands, macros, `L`, `W`, `#`, and `H` are intentionally rejected.

If day of month and day of week are both restricted, matching is **OR**, not AND. Invalid dates, zones and field values never silently fall back to defaults. The engine accepts 1–100 occurrences; the interface always previews 24. Expression length is bounded at 180 characters, and reference years at 1970–2095.

### Important boundaries

- This is a preview tool, not a scheduler. It does not create tasks or execute commands.
- A cron expression is interpreted against the selected zone. The reference input is always UTC, regardless of your device zone.
- Daylight-saving behavior depends on the parser and the target scheduler. A skipped or repeated local clock hour may be handled differently by your platform. For example, with this pinned parser, New York `30 2 * * *` becomes 03:30 on March 14, 2027; `30 1 * * *` runs only once through the repeated 01:30 on November 1, 2026. Regression tests pin both examples. Compare the UTC instants and verify with the deployment target.
- The hourly chart summarizes only the displayed 24 runs. It does not estimate total daily frequency.
- Future time-zone rules can change. Browser/OS time-zone databases can differ.
- The app keeps no history. Reloading resets the editor. Downloaded files contain your expression and schedule; share them deliberately.
- Loading the hosted app contacts GitHub Pages for static assets. User-entered schedule values are not transmitted. External source/license links and README badges contact their respective hosts when opened or loaded.

## Development

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run check` runs lint, typechecking, engine tests and the production build. Browser tests exercise desktop and mobile layouts, valid/invalid flows, stale exports, DST samples, repeated interactions, keyboard submit, and real JSON/CSV downloads. They also produce actual screenshots in `docs/screenshots/`.

CI runs the same checks, uploads browser artifacts, and publishes the verified static build to GitHub Pages on pushes to main. A pull request validates without deploying. To use your own Pages deployment, set the repository's Pages source to **GitHub Actions**.

### Project map

| Path                 | Purpose                                                    |
| -------------------- | ---------------------------------------------------------- |
| `src/engine.ts`      | Pure validation, schedule calculation, formatting, exports |
| `src/engine.test.ts` | Date, timezone, grammar and export regression tests        |
| `src/main.ts`        | Accessible form, result rendering and interactions         |
| `src/style.css`      | Responsive visual system without remote fonts              |
| `tests/app.spec.ts`  | Desktop/mobile browser flows and screenshots               |

## Build with us

Useful directions: an accessible calendar view, comparison of two schedules, validated human-readable explanations, and explicit scheduler dialect adapters. See [CONTRIBUTING.md](CONTRIBUTING.md) for the testing bar and [the issues](https://github.com/Tabisharaza/cronweave/issues) for focused starter tasks.

Original project by [Tabish A. Raza](https://github.com/Tabisharaza), built with AI-assisted engineering. Dependency authors retain credit for the parsing engine and tooling. No claim is made that the cron algorithm itself is original.

## License

[MIT](LICENSE). Dependency notices and source references are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
