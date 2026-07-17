# Schodle — Shift Scheduler

เว็บแอปจัดตารางกะพนักงานสำหรับหน้าร้าน (PWA) — พนักงานดูตาราง/ขอลา/สลับกะจากมือถือ ผู้จัดการจัดตาราง อนุมัติคำขอ และดูรายงานได้จากหน้าเดียว

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 (PWA ผ่าน `vite-plugin-pwa`)
- **Backend:** Supabase (Postgres + RLS, Edge Functions, Realtime, Storage)
- **Auth:** ระบบล็อกอินด้วยรหัสพนักงาน + รหัสผ่าน (bcrypt ใน Edge Function, session เป็น HMAC-signed JWT)
- **ทดสอบ:** Vitest (unit) + Playwright (e2e)

## ฟีเจอร์หลัก

- ตารางกะรายเดือนแบบ realtime (Supabase Realtime + polling fallback)
- พนักงาน: ดูตาราง, ขอลา/สลับกะพร้อมแนบหลักฐาน, ตั้งวันหยุดประจำสัปดาห์, ยืนยันรับทราบตาราง
- ผู้จัดการ: จัดกะแบบ drag & drop, อนุมัติ/ปฏิเสธคำขอ, จัดตารางอัตโนมัติ (smart schedule), ตารางซ้ำรายสัปดาห์, template, รายงาน + export PDF/ปฏิทิน
- Push notification (Web Push + VAPID)
- ใช้งาน offline ได้บางส่วน (service worker + local cache)

## เริ่มต้นพัฒนา

```bash
cp .env.example .env   # ใส่ค่า VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_VAPID_PUBLIC_KEY
npm install
npm run dev
```

คำสั่งที่ใช้บ่อย:

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server |
| `npm run verify` | typecheck + lint + build + unit tests (รันก่อน commit) |
| `npm test` | unit tests (Vitest) |
| `npm run e2e` | e2e tests (Playwright) |
| `npm run deploy:functions` | deploy Supabase Edge Functions |

## โครงสร้างโค้ด

```
src/
├── components/
│   ├── auth/        # login, เปลี่ยนรหัสผ่าน
│   ├── employee/    # dashboard พนักงาน, ปฏิทิน, ขอลา, ตั้งค่า
│   ├── manager/     # dashboard ผู้จัดการ, coverage grid, อนุมัติคำขอ, admin tabs
│   │   └── hooks/   # handlers ของ manager dashboard
│   └── layout/      # header, mobile nav, update prompt
├── hooks/
│   ├── useData.ts   # facade รวม data hooks ทั้งหมด (ดู hooks/data/)
│   ├── data/        # useCoreData, mutations แยกตาม domain, realtime, push
│   ├── useAuth.ts   # session + login/logout
│   └── ...
├── lib/             # utilities: dates, validators, schedule generator, exports ฯลฯ
└── types/           # TypeScript types

supabase/
├── functions/       # Edge Functions (verify-password, db-query, send-push ฯลฯ)
└── migrations/      # SQL migrations — ดู supabase/migrations/README.md
```

## เอกสารเพิ่มเติม

- [DEPLOY.md](DEPLOY.md) — ขั้นตอน deploy
- [RLS_MIGRATION_GUIDE.md](RLS_MIGRATION_GUIDE.md) — คู่มือ migration RLS (016a/016b)
- [supabase/migrations/README.md](supabase/migrations/README.md) — ลำดับและหมายเหตุของ migrations
