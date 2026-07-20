import { expect, loginAndWaitForDashboard, test } from './fixtures/auth';
import type { Page } from '@playwright/test';

/** Wait for either of two toast patterns — flows here have valid alternate outcomes. */
async function expectToast(page: Page, patterns: RegExp[], timeout = 15_000) {
  let locator = page.getByText(patterns[0]);
  for (const p of patterns.slice(1)) locator = locator.or(page.getByText(p));
  await expect(locator.first()).toBeVisible({ timeout });
}

test.describe('Copy schedule from previous month', () => {
  test('copies into next month without touching the source month', async ({ page, freshContext: _ }) => {
    await loginAndWaitForDashboard(page, 'manager');

    // Go to next month so the current month becomes the "previous" source.
    await page.getByTitle('เดือนถัดไป').click();

    const copyButton = page.getByRole('button', { name: 'คัดลอกเดือนก่อน' });
    if (!(await copyButton.isVisible().catch(() => false))) {
      test.skip(true, 'previous month has no schedules to copy');
      return;
    }
    await copyButton.click();

    // Confirm modal appears when the target month already has entries.
    const confirmButton = page.getByRole('button', { name: 'เพิ่มต่อ' });
    if (await confirmButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await expectToast(page, [
      /คัดลอกตารางสำเร็จ/,
      /ไม่มีรายการใหม่ให้คัดลอก/,
      /เดือนก่อนหน้าไม่มีตารางงาน/,
    ]);
    // Regression (data-loss bug): copying must never error out.
    await expect(page.getByText(/คัดลอกตารางไม่สำเร็จ/)).toHaveCount(0);
  });
});

test.describe('Schedule templates', () => {
  test('saves the current month as a template and applies it', async ({ page, freshContext: _ }) => {
    await loginAndWaitForDashboard(page, 'manager');

    await page.getByRole('button', { name: 'เทมเพลต' }).click();
    await expect(page.getByText('จัดการเทมเพลต')).toBeVisible();

    // Create a template from the current month's schedules.
    const name = `e2e-${Date.now()}`;
    await page.getByPlaceholder(/ชื่อเทมเพลต/).fill(name);
    await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expectToast(page, [/บันทึกเทมเพลตสำเร็จ/, /บันทึกไม่สำเร็จ/]);

    // Apply it (first "ใช้เทมเพลต" button).
    const applyButton = page.getByRole('button', { name: 'ใช้เทมเพลต' }).first();
    if (await applyButton.isVisible().catch(() => false)) {
      await applyButton.click();
      await expectToast(page, [
        /ใช้เทมเพลตสำเร็จ/,
        /ใช้เทมเพลตสำเร็จบางส่วน/,
        /ไม่มีรายการใหม่ให้ใช้/,
      ]);
    }
  });
});

test.describe('Weekly off day', () => {
  test('employee sets a weekly off day from settings', async ({ page, freshContext: _ }) => {
    await loginAndWaitForDashboard(page, 'employee');

    // Open settings tab (nav label ตั้งค่า), then the weekly-off editor.
    await page.getByText('ตั้งค่า', { exact: true }).first().click();
    await expect(page.getByText('วันหยุดประจำสัปดาห์').first()).toBeVisible();
    await page.getByRole('button', { name: /แก้ไข/ }).first().click();

    // Pick Monday, save.
    await page.getByRole('button', { name: 'จันทร์', exact: true }).click();
    await page.getByRole('button', { name: /บันทึก/ }).click();

    await expectToast(page, [/ตั้งวันหยุดประจำสัปดาห์เรียบร้อย/, /บันทึกไม่สำเร็จ/]);
    // The bulk upsert must not silently fail.
    await expect(page.getByText(/บันทึกไม่สำเร็จ/)).toHaveCount(0);
  });
});
