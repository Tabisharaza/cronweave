# Contributing to CronWeave

Thanks for helping make schedules easier to understand.

1. Open an issue describing a reproducible problem or a focused improvement. For behavior bugs, include the expression, IANA zone, UTC reference and expected versus actual instants. Use synthetic examples and avoid sensitive job names or configuration.
2. Fork the repository and create a focused branch.
3. Run `npm ci`, `npm run check`, `npx playwright install chromium` and `npm run test:e2e`.
4. For a calculation fix, add a regression that fails before the fix. For UI work, cover keyboard use, narrow screens and invalid input.
5. Open a pull request explaining what changed, why, and which checks passed. Disclose AI assistance and personally review generated changes. Don't invent test results.

Keep the application local-only. Do not add tracking, remote fonts, telemetry or server-side processing without discussing the privacy change first. Do not silently broaden the cron dialect or hide scheduler differences. A change to date semantics should document and test skipped/repeated local clock hours.

Small, readable pull requests are easiest to review. We cannot promise response times, merges or releases.
