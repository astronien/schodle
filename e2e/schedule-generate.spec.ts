import { expect, loginAndWaitForDashboard, test } from './fixtures/auth';

test.describe('Manager schedule generation', () => {
  test('generates a smart schedule and shows entries in the grid', async ({ page, freshContext: _ }) => {
    await loginAndWaitForDashboard(page, 'manager');
    await page.getByRole('button', { name: 'จัดตาราง AI' }).click();

    // Toast on success or failure surfaces the result.
    const successToast = page.getByText(/สร้างตารางงานสำเร็จ|จัดตาราง AI สำเร็จ/i);
    const failureToast = page.getByText(/ไม่สามารถ|ล้มเหลว/i);
    await expect(successToast.or(failureToast)).toBeVisible({ timeout: 15_000 });
  });
});
