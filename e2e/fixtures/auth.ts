import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';

export type TestRole = 'manager' | 'employee';

export interface TestCredentials {
  employeeCode: string;
  password: string;
  role: TestRole;
}

export const TEST_USERS: Record<TestRole, TestCredentials> = {
  manager: {
    employeeCode: process.env.E2E_MANAGER_CODE ?? 'E001',
    password: process.env.E2E_MANAGER_PASSWORD ?? 'E001',
    role: 'manager',
  },
  employee: {
    employeeCode: process.env.E2E_EMPLOYEE_CODE ?? 'E002',
    password: process.env.E2E_EMPLOYEE_PASSWORD ?? 'E002',
    role: 'employee',
  },
};

export async function login(page: Page, role: TestRole): Promise<void> {
  const creds = TEST_USERS[role];
  await page.goto('/');
  await page.getByLabel('รหัสพนักงาน').fill(creds.employeeCode);
  await page.getByLabel('รหัสผ่าน').fill(creds.password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
}

export async function loginAndWaitForDashboard(page: Page, role: TestRole): Promise<void> {
  await login(page, role);
  // Toast on success or logout link should appear once auth settles.
  await expect(page.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible({ timeout: 15_000 });
}

export async function logout(page: Page): Promise<void> {
  const logoutButton = page.getByRole('button', { name: 'ออกจากระบบ' });
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await expect(page.getByLabel('รหัสพนักงาน')).toBeVisible({ timeout: 5_000 });
  }
}

export async function clearAuthState(context: BrowserContext): Promise<void> {
  await context.clearCookies();
  await context.addInitScript(() => {
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });
}

export const test = base.extend<{ freshContext: BrowserContext }>({
  freshContext: async ({ context }, use) => {
    await clearAuthState(context);
    await use(context);
  },
});

export { expect };
