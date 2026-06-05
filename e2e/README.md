# E2E Tests (Playwright)

End-to-end tests that exercise the running app against a real Supabase test
instance. They cover the critical paths: login, schedule generation, and the
swap-request approval flow.

## Prerequisites

1. **A Supabase test project** (separate from production)
   - Run every migration: `001_*` … `011_atomic_swap_rpc.sql`
   - Seed at least: 1 position group, 1 position, 1 shift type `X`, 4+ employees
     with the BSM/ABSM position (manager) and at least 1 regular employee
   - Deploy Edge Functions: `verify-password`, `change-password`, `create-employee`,
     `swap-schedule-shifts`, `send-push`
   - Set Edge Function secrets: `SCHODLE_SESSION_SECRET`, `VAPID_PUBLIC_KEY`,
     `VAPID_PRIVATE_KEY`

2. **Test users** (default credentials in fixtures):
   - Manager: `E001` / `E001` (or override via env)
   - Employee: `E002` / `E002`
   - The default password equals the employee code by design (the create-employee
     Edge Function uses the code as the default password and sets
     `must_change_password = true`).

3. **Environment variables** (e.g. in `.env.test` or your shell):
   ```env
   E2E_BASE_URL=http://localhost:5173          # default
   E2E_PORT=5173                               # for the dev server
   E2E_MANAGER_CODE=E001
   E2E_MANAGER_PASSWORD=E001
   E2E_EMPLOYEE_CODE=E002
   E2E_EMPLOYEE_PASSWORD=E002
   ```

4. **App config** (`.env` or `.env.test`):
   ```env
   VITE_SUPABASE_URL=https://<test-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   VITE_VAPID_PUBLIC_KEY=<public>
   ```

## Running

```bash
# Install browsers once
npx playwright install chromium

# Auto-starts the dev server
npm run e2e

# Headed mode for debugging
npm run e2e:headed

# Open the HTML report after a run
npm run e2e:report
```

If the dev server is already running on `E2E_PORT`, Playwright reuses it. To
disable the auto-started server entirely (e.g. in CI when you start it
yourself), set `E2E_NO_SERVER=1`.

## What's covered

| Spec | Path |
|------|------|
| `auth.spec.ts` | login validation, manager/employee reach the right dashboard |
| `schedule-generate.spec.ts` | `จัดตาราง AI` button generates a schedule (success or known failure toast) |
| `swap-approve.spec.ts` | employee creates a swap request, manager approves it |

The swap-approve spec is best-effort: it gracefully skips if the test env
doesn't yet have a pending swap request.

## Adding a new test

1. Create `e2e/<feature>.spec.ts`
2. Reuse `loginAndWaitForDashboard` / `logout` from `e2e/fixtures/auth.ts`
3. Use `page.getByLabel('…')`, `page.getByRole('button', { name: '…' })`,
   `page.getByText('…')` — these are the most stable selectors
4. Run `npm run e2e:ui` for the Playwright inspector

## CI

In CI set `CI=1` to:
- retry failed tests up to 2 times
- use the `github` reporter (in addition to `list`)
- require the dev server (don't reuse a possibly-stale local one)
