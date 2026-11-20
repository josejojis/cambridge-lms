import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const pages = ['/', '/cambridge', '/cbc', '/pricing', '/login', '/register', '/privacy']

for (const path of pages) {
  test(`${path} has no serious accessibility violations (WCAG 2.2 AA)`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    // Include the failing elements so a CI failure says exactly what to fix
    expect(serious.map((v) => `${v.id}: ${v.help} → ${v.nodes.slice(0, 5).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
  })
}

test('no horizontal scrolling on any public page', async ({ page }) => {
  for (const path of pages) {
    await page.goto(path)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
})

test('the app is installable: manifest and service worker', async ({ page }) => {
  await page.goto('/')
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json())
  expect(manifest.name).toBe('Elite Revision')
  expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true)
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()))).toBe(true)
})

test('language switch to Kiswahili', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('button', { name: 'Change language' }).first().click()
  await expect(page.getByRole('link', { name: 'Ingia' }).first()).toBeVisible()
})
