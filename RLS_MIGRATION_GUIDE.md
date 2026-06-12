# RLS Migration Guide

## ภาพรวม

Migration นี้จะ tighten RLS policies เพื่อป้องกัน unauthorized access:
- **Part 1**: สร้าง helper functions และ RPC wrappers (ไม่ block อะไร)
- **Part 2**: Tighten RLS policies (block direct table writes)

## ขั้นตอนการ Deploy

### Step 1: Deploy Edge Functions

Edge Functions ใหม่ที่ต้อง deploy:
- `db-query` — ทำ database queries ผ่าน service role
- `apply-migration-016` — รัน migration (optional, ใช้สำหรับ automation)

**วิธี deploy:**

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref rgpvqxopsgxxnwvcnqnh

# Deploy Edge Functions
npx supabase functions deploy db-query
npx supabase functions deploy apply-migration-016
```

**หรือ deploy ผ่าน Supabase Dashboard:**
1. ไปที่ Edge Functions
2. คลิก "New Function"
3. Copy code จาก `supabase/functions/db-query/index.ts`
4. Deploy

### Step 2: Apply Migration Part 1

Migration Part 1 สร้าง helper functions และ RPC wrappers (ไม่ block อะไร)

**วิธี apply:**

1. ไปที่ Supabase Dashboard > SQL Editor
2. คลิก "New Query"
3. Copy SQL จาก `supabase/migrations/016a_create_rpc_functions.sql`
4. คลิก "Run"

**หรือรันผ่าน script:**

```bash
node scripts/apply-rls-migration.js
```

Script จะแสดง SQL ให้ copy ไปรัน

### Step 3: Update Client-Side Code

⚠️ **สำคัญ**: ต้องอัปเดต client-side code ให้ใช้ Edge Function `db-query` แทน direct table access ก่อนรัน Part 2

**ไฟล์ที่ต้องแก้:**
- `src/hooks/useData.ts` — เปลี่ยน `supabase.from()` เป็น `supabase.functions.invoke('db-query', ...)`

**ตัวอย่าง:**

```typescript
// Before (direct table access)
const { data, error } = await supabase.from('schedules').select('*');

// After (through Edge Function)
const { data, error } = await supabase.functions.invoke('db-query', {
  body: {
    table: 'schedules',
    operation: 'select',
  },
});
```

### Step 4: Apply Migration Part 2

หลังจากอัปเดต client-side code แล้ว ค่อยรัน Part 2 เพื่อ tighten RLS

**วิธี apply:**

1. ไปที่ Supabase Dashboard > SQL Editor
2. คลิก "New Query"
3. Copy SQL จาก `supabase/migrations/016b_tighten_rls_policies.sql`
4. คลิก "Run"

## สิ่งที่จะเกิดขึ้นหลัง Migration

### ก่อน Migration (ปัจจุบัน)
- ✅ ทุกคนอ่านข้อมูลได้
- ❌ ทุกคนเขียนข้อมูลได้ (อันตราย!)
- ❌ ไม่มีการตรวจสอบ role

### หลัง Migration
- ✅ Employees อ่านได้แค่ schedules ของตัวเอง + approved schedules
- ✅ Managers อ่าน/เขียนได้ทุกอย่าง
- ✅ Write operations ต้องผ่าน Edge Function `db-query`
- ✅ Direct table writes จาก client จะถูก block

## Testing

หลัง apply migration แล้ว ให้ทดสอบ:

1. **Login เป็น employee**
   - ✅ เห็น schedules ของตัวเอง
   - ✅ เห็น approved schedules ของคนอื่น
   - ❌ ไม่สามารถแก้ไข schedules ของคนอื่น
   - ❌ ไม่สามารถสร้าง/แก้ไข positions, shift types

2. **Login เป็น manager**
   - ✅ เห็น schedules ทั้งหมด
   - ✅ สามารถสร้าง/แก้ไข/ลบ schedules
   - ✅ สามารถจัดการ employees, positions, shift types

3. **Direct table access (ไม่ผ่าน Edge Function)**
   - ❌ ควรถูก block (ทดสอบด้วย Supabase Dashboard > Table Editor)

## Rollback

ถ้ามีปัญหา ให้ rollback ด้วย SQL นี้:

```sql
-- Drop restrictive policies
DROP POLICY IF EXISTS "Employees read all" ON employees;
DROP POLICY IF EXISTS "Positions read all" ON positions;
DROP POLICY IF EXISTS "Position groups read all" ON position_groups;
DROP POLICY IF EXISTS "Shift types read all" ON shift_types;
DROP POLICY IF EXISTS "Schedules read" ON schedules;
DROP POLICY IF EXISTS "Recurring schedules read" ON recurring_schedules;
DROP POLICY IF EXISTS "Settings read all" ON settings;
DROP POLICY IF EXISTS "Push subscriptions read" ON push_subscriptions;

DROP POLICY IF EXISTS "Positions write manager" ON positions;
DROP POLICY IF EXISTS "Position groups write manager" ON position_groups;
DROP POLICY IF EXISTS "Shift types write manager" ON shift_types;
DROP POLICY IF EXISTS "Schedules write" ON schedules;
DROP POLICY IF EXISTS "Employees write manager" ON employees;
DROP POLICY IF EXISTS "Recurring schedules write" ON recurring_schedules;
DROP POLICY IF EXISTS "Settings write manager" ON settings;
DROP POLICY IF EXISTS "Push subscriptions write" ON push_subscriptions;

-- Restore permissive policies
CREATE POLICY "Allow read" ON positions FOR SELECT USING (true);
CREATE POLICY "Allow read" ON position_groups FOR SELECT USING (true);
CREATE POLICY "Allow read" ON shift_types FOR SELECT USING (true);
CREATE POLICY "Allow read" ON schedules FOR SELECT USING (true);
CREATE POLICY "Allow read" ON employees FOR SELECT USING (true);
CREATE POLICY "Allow read" ON push_subscriptions FOR SELECT USING (true);

CREATE POLICY "Allow write" ON positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write" ON position_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write" ON shift_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write" ON schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete own push" ON push_subscriptions FOR DELETE USING (true);

CREATE POLICY "Allow read settings" ON settings FOR SELECT USING (true);
```

## Support

ถ้ามีปัญหา:
1. เช็ค Supabase Dashboard > Logs > Edge Functions
2. เช็ค Supabase Dashboard > Logs > Postgres
3. ทดสอบด้วย Supabase Dashboard > Table Editor (direct access)
