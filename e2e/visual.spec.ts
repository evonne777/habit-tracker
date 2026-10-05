import { expect, test } from '@playwright/test'

test('keeps long names and dialogs inside the viewport', async ({ page }, testInfo) => {
  const habitName = '每天阅读三十页并记录一条简短心得'

  await page.goto('/')
  await page.getByRole('button', { name: '添加第一个习惯' }).click()
  await page.getByLabel('习惯名称').fill(habitName)
  await page.getByRole('button', { name: '添加', exact: true }).click()

  const row = page.locator('.habit-row').filter({ hasText: habitName })
  await expect(row).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
    )
    .toBe(true)
  await expect
    .poll(() =>
      page.locator('button:visible').evaluateAll((buttons) =>
        buttons.every((button) => {
          const box = button.getBoundingClientRect()
          return box.width >= 44 && box.height >= 44
        })
      )
    )
    .toBe(true)

  const nameBox = await row.locator('.habit-name').boundingBox()
  const actionsBox = await row.locator('.habit-actions').boundingBox()
  expect(nameBox).not.toBeNull()
  expect(actionsBox).not.toBeNull()
  expect(nameBox!.x + nameBox!.width).toBeLessThanOrEqual(actionsBox!.x + 1)

  await page.screenshot({ path: testInfo.outputPath('long-name.png'), fullPage: true })

  await page.getByRole('button', { name: `修改“${habitName}”` }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  const dialogBox = await dialog.boundingBox()
  const viewport = page.viewportSize()
  expect(dialogBox).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0)
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0)
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width + 1)
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height + 1)

  await page.screenshot({ path: testInfo.outputPath('dialog.png') })
})

test('installs the app shell and works offline after first load', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)

  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    return link ? (await fetch(link.href)).json() : null
  })

  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', './apple-touch-icon.png')
  expect(manifest).toMatchObject({
    display: 'standalone',
    start_url: './',
    scope: './'
  })
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192' }),
      expect.objectContaining({ sizes: '512x512' })
    ])
  )

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('button', { name: '添加第一个习惯' })).toBeVisible()

  await page.getByRole('button', { name: '添加第一个习惯' }).click()
  await page.getByLabel('习惯名称').fill('离线也能打卡')
  await page.getByRole('button', { name: '添加', exact: true }).click()
  await expect(page.getByRole('region', { name: '我的习惯' }).getByText('离线也能打卡')).toBeVisible()
  await context.setOffline(false)
})
