-- Separate employee requests from approved schedules
create table if not exists schedule_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date text not null,
  shift_type_id uuid not null references shift_types(id),
  request_type text not null default 'shift_change' check (request_type in ('leave', 'swap', 'shift_change', 'late_scan', 'off_request')),
  status text not null default 'pending' check (status in ('draft', 'submitted', 'approved', 'rejected', 'pending')),
  employee_note text,
  manager_remark text,
  swap_with_id uuid references employees(id),
  evidence_url text,
  revert_shift_type_id uuid references shift_types(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_schedule_requests_employee_date on schedule_requests(employee_id, date);
create index if not exists idx_schedule_requests_date on schedule_requests(date);
create index if not exists idx_schedule_requests_status on schedule_requests(status);

alter table schedule_requests enable row level security;

create policy "Allow all" on schedule_requests for all using (true) with check (true);
