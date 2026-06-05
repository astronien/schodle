import { expect, test } from './fixtures/auth';

test.describe('Authentication', () => {
  test('rejects empty credentials', async ({ page, freshContext: _ }) => {
    await page.goto('/');
    await page.getByLabel('รหัสพนักงาน').fill('');
    await page.getByLabel('รหัสผ่าน').fill('');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page.getByText('กรุณากรอกรหัสพนักงานและรหัสผ่าน')).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page, freshContext: _ }) => {
    await page.goto('/');
    await page.getByLabel('รหัสพนักงาน').fill('INVALID');
    await page.getByLabel('รหัสผ่าน').fill('wrong-password');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page.getByText(/รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง/i)).toBeVisible({ timeout: 10_000 });
  });

  test('logs in manager and reaches the dashboard', async ({ page, freshContext: _ }) => {
    await page.goto('/');
    await page.getByLabel('รหัสพนักงาน').fill(process.env.E2E_MANAGER_CODE ?? 'E001');
    await page.getByLabel('รหัสผ่าน').fill(process.env.E2E_MANAGER_PASSWORD ?? 'E001');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'จัดตาราง AI' })).toBeVisible();
  });

  test('logs in employee and reaches the dashboard', async ({ page, freshContext: _ }) => {
    await page.goto('/');
    await page.getByLabel('รหัสพนักงาน').fill(process.env.E2E_EMPLOYEE_CODE ?? 'E002');
    await page.getByLabel('รหัสผ่าน').fill(process.env.E2E_EMPLOYEE_PASSWORD ?? 'E002');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible({ timeout: 15_000 });
    // Employee dashboard should NOT show manager-only "จัดตาราง AI" button.
    await expect(page.getByRole('button', { name: 'จัดตาราง AI' })).toHaveCount(0);
  });
});
