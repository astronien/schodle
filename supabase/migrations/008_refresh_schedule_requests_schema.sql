-- Normalize schedule_requests to match production expectations

create table if not exists public.schedule_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  date text not null,
  shift_type_id uuid not null references public.shift_types(id),
  request_type text not null default 'shift_change'
    check (request_type in ('leave', 'swap', 'shift_change', 'late_scan', 'off_request')),
  status text not null default 'pending'
    check (status in ('draft', 'submitted', 'approved', 'rejected', 'pending')),
  employee_note text,
  manager_remark text,
  swap_with_id uuid references public.employees(id),
  evidence_url text,
  revert_shift_type_id uuid references public.shift_types(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schedule_requests_employee_date
  on public.schedule_requests(employee_id, date);

create index if not exists idx_schedule_requests_date
  on public.schedule_requests(date);

create index if not exists idx_schedule_requests_status
  on public.schedule_requests(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_schedule_requests_updated_at on public.schedule_requests;
create trigger trg_schedule_requests_updated_at
before update on public.schedule_requests
for each row
execute function public.set_updated_at();

alter table public.schedule_requests enable row level security;

drop policy if exists "Allow all" on public.schedule_requests;
create policy "Allow all"
on public.schedule_requests
for all
to authenticated, anon
using (true)
with check (true);
