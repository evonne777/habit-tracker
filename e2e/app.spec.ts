import { expect, test } from '@playwright/test'

test('adds a habit and completes it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '添加第一个习惯' }).click()
  await page.getByLabel('习惯名称').fill('每天阅读 20 分钟')
  await page.getByRole('button', { name: '添加', exact: true }).click()

  const todayList = page.getByRole('region', { name: '我的习惯' })
  await expect(todayList.getByText('每天阅读 20 分钟')).toBeVisible()
  await page.getByRole('button', { name: /完成“每天阅读 20 分钟”的今日打卡/ }).click()
  await expect(page.getByText('今日已完成')).toBeVisible()
  await expect(page.getByText('今天全部完成')).toBeVisible()
})

test('persists habits after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '添加第一个习惯' }).click()
  await page.getByLabel('习惯名称').fill('晨间散步')
  await page.getByRole('button', { name: '添加', exact: true }).click()
  await page.reload()

  await expect(page.getByRole('region', { name: '我的习惯' }).getByText('晨间散步')).toBeVisible()
})
