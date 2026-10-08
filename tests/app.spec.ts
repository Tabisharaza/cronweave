import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});
test('initial render and local schedule preview', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Make time make sense.' })).toBeVisible();
  await expect(page.locator('#runs tr')).toHaveCount(24);
  await expect(page.locator('#error')).toBeHidden();
  await expect(page.locator('#result-summary')).toContainText('Asia/Riyadh');
});
test('edits cannot export stale data and invalid input recovers', async ({ page }) => {
  await page.getByLabel('Cron expression').fill('60 * * * *');
  await expect(page.getByRole('button', { name: 'JSON ↓' })).toBeDisabled();
  await page.getByRole('button', { name: 'Weave my schedule' }).click();
  await expect(page.getByRole('alert')).toContainText('0 to 59');
  await expect(page.locator('.results')).toHaveClass(/stale/);
  await page.getByLabel('Cron expression').fill('*/15 * * * *');
  await page.getByRole('button', { name: 'Weave my schedule' }).click();
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.locator('#runs tr')).toHaveCount(24);
  await expect(page.getByRole('button', { name: 'JSON ↓' })).toBeEnabled();
});
test('samples and DST preview', async ({ page }) => {
  await page.getByRole('button', { name: /Across daylight saving/ }).click();
  await expect(page.getByLabel('Schedule time zone')).toHaveValue('America/New_York');
  await expect(page.locator('#warnings')).toContainText('offset change');
  await expect(page.locator('#runs')).toContainText('2027-03-14');
  await page.getByRole('button', { name: /Every 15 minutes/ }).click();
  await expect(page.locator('#result-summary')).toContainText('UTC');
  await expect(page.locator('#runs')).toContainText('15 min');
});
test('invalid timezone and missing date', async ({ page }) => {
  await page.getByLabel('Schedule time zone').fill('Bad/Zone');
  await page.getByRole('button', { name: 'Weave my schedule' }).click();
  await expect(page.getByRole('alert')).toContainText('IANA');
  await page.getByLabel('Schedule time zone').fill('UTC');
  await page.getByLabel('Preview after').fill('');
  await page.getByRole('button', { name: 'Weave my schedule' }).click();
  await expect(page.getByRole('alert')).toContainText('real UTC date');
});
test('JSON and CSV files contain all 24 runs', async ({ page }) => {
  for (const type of ['JSON', 'CSV']) {
    const promise = page.waitForEvent('download');
    await page.getByRole('button', { name: `${type} ↓` }).click();
    const d = await promise;
    const path = await d.path();
    const content = await readFile(path!, 'utf8');
    if (type === 'JSON') expect(JSON.parse(content).occurrences).toHaveLength(24);
    else expect(content.trim().split('\r\n')).toHaveLength(25);
  }
});
test('no horizontal overflow and actual screenshot', async ({ page }, info) => {
  await page.getByLabel('Preview after').fill('2026-10-08T00:00');
  await page.getByRole('button', { name: 'Weave my schedule' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: `docs/screenshots/${info.project.name}.png`, fullPage: true });
});
test('keyboard submits and repeated presets stay stable', async ({ page }) => {
  await page.getByLabel('Cron expression').fill('0 12 * * *');
  await page.getByLabel('Cron expression').press('Enter');
  await expect(page.locator('#result-summary')).toContainText('12:00');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Weekday kickoff/ }).click();
  await expect(page.locator('#runs tr')).toHaveCount(24);
  await expect(page.locator('#error')).toBeHidden();
});
