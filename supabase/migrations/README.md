# Migrations

Migration ทั้งหมดรันด้วยมือผ่าน **Supabase Dashboard → SQL Editor** (ไม่ได้ใช้ `supabase db push`)
รันตามลำดับเลขไฟล์: `001 → 002 → … → 024`

## หมายเหตุเรื่องเลขไฟล์

- **`008_` มี 2 ไฟล์** (`008_create_recurring_schedules.sql` และ `008_refresh_schedule_requests_schema.sql`)
  เป็นคนละเรื่องกัน รันได้ทั้งคู่ ลำดับระหว่างกันไม่สำคัญ — เก็บชื่อไฟล์เดิมไว้เพราะถูก apply ไปแล้ว
- **ไม่มี `013`–`014`** — ข้ามเลขไป ไม่ได้หายไปไหน
- **`016a` + `016b`** คือ migration 016 ที่แยกเป็น 2 ส่วนเพื่อ deploy แบบไม่มี downtime:
  - `016a` สร้าง helper functions + RPC (รันได้ทันที ไม่ block อะไร)
  - `016b` tighten RLS (รันหลัง deploy client ที่ใช้ Edge Functions แล้วเท่านั้น — ดู `RLS_MIGRATION_GUIDE.md`)
- **`023`** แก้ RPC `swap_schedule_shifts` ที่เวอร์ชันใน `_APPLY_PENDING.sql` เขียนผิด (ใช้คอลัมน์ `shift_id` ที่ไม่มีจริง)
- **`024`** แก้ RPC `swap_schedule_shifts` อีกรอบ — `RETURNS TABLE (id, …)` ทำให้ชื่อคอลัมน์กลายเป็นตัวแปรใน scope
  ของฟังก์ชัน ทำให้ `where id = …` ที่ไม่ได้ qualify กำกวม (`column reference "id" is ambiguous`) และผู้จัดการกดอนุมัติ
  คำขอสลับกะไม่ได้ แก้โดย qualify ทุกคอลัมน์ด้วย alias + `#variable_conflict use_column`

## `archive/`

ไฟล์ที่ **ห้ามรันซ้ำ** เก็บไว้เพื่ออ้างอิงเท่านั้น:

- `archive/_APPLY_PENDING.sql` — สคริปต์รวม migration 002–012 ที่เคยใช้ apply ครั้งเดียวใน production
  (มี swap RPC เวอร์ชันที่พังอยู่ข้างใน ซึ่งถูกแก้แล้วโดย `023`)
- `archive/016_tighten_rls_policies.sql` — เวอร์ชันรวมของ `016a` + `016b` (เนื้อหาเหมือนกันทุกประการ ถูกแทนที่ด้วยเวอร์ชันแยก)

## การเพิ่ม migration ใหม่

1. ตั้งชื่อไฟล์เลขถัดไป (ปัจจุบันคือ `025_…`) พร้อมคำอธิบายสั้น ๆ
2. เขียนให้ idempotent เท่าที่ทำได้ (`IF NOT EXISTS`, `DROP … IF EXISTS`, `CREATE OR REPLACE`)
3. รันใน SQL Editor ของ production แล้ว commit ไฟล์ทันที
