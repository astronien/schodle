# Deploy ขึ้น Production (Supabase + Vercel)

## 1. Supabase Setup

1. ไป [supabase.com](https://supabase.com) → Sign up/log in
2. New Project → ตั้งชื่อ `schodle` → เลือก Region `Southeast Asia (Singapore)`
3. รอสักครู่ให้ project พร้อม

## 2. สร้าง Database

1. ไปที่ **SQL Editor** ใน Supabase Dashboard
2. New query → วางโค้ดจากไฟล์ `supabase/schema.sql`
3. กด **Run**
4. ตรวจสอบใน **Table Editor** ว่ามี tables: `positions`, `employees`, `shift_types`, `schedules`

## 3. เอา API Key

1. ไปที่ **Project Settings** → **API**
2.  copy ค่าต่อไปนี้:
   - `URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`

## 4. สร้าง .env

สร้างไฟล์ `.env` ที่ root:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 5. Deploy บน Vercel

1. ไป [vercel.com](https://vercel.com) → Import Project → เลือก GitHub repo `astronien/schodle`
2. Framework Preset: `Vite`
3. Root Directory: `.`
4. Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. กด **Deploy**

## 6. ใช้งานจริง

- เข้า URL ที่ Vercel ให้มา
- ถ้า database ว่างเปล่า ให้ seed ข้อมูลพนักงานเพิ่มผ่าน Supabase Table Editor
- เปลี่ยน RLS policies ตามความเหมาะสม (ตอนนี้เปิดให้ทุกคนเข้าถึงได้ทั้งหมด)

## โครงสร้าง Database

| Table | ใช้เก็บ |
|---|---|
| positions | ตำแหน่งงาน (BSM, Cashier, ...) |
| employees | ข้อมูลพนักงาน |
| shift_types | ประเภทกะงาน |
| schedules | ตารางงานรายวัน |
