-- ============================================================================
-- DOT System — Supabase Schema (ครบทุกตารางที่แอปใช้งาน)
-- ============================================================================
-- วิธีใช้: คัดลอกไฟล์นี้ทั้งหมด ไปวางใน Supabase → SQL Editor แล้วกด Run
-- สคริปต์นี้รันซ้ำได้ปลอดภัย (idempotent) ด้วย IF NOT EXISTS / DROP POLICY IF EXISTS
--
-- หมายเหตุด้านสิทธิ์ (RLS):
--   แอปนี้ใช้ระบบล็อกอินเอง (username + password_hash ในตาราง officers)
--   ผ่าน anon key ไม่ได้ใช้ Supabase Auth ดังนั้น Policy จึงเปิดสิทธิ์ให้
--   role anon และ authenticated ทำงานได้ (select/insert/update/delete)
--   เพื่อป้องกัน Error สิทธิ์ในอนาคต หากต้องการความปลอดภัยระดับ production
--   ควรย้าย logic ที่มีสิทธิ์สูงไปไว้ฝั่ง server หรือปรับ Policy ให้เข้มขึ้น
-- ============================================================================

-- Extension สำหรับ gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) officers — เจ้าหน้าที่ / บัญชีผู้ใช้
-- ============================================================================
create table if not exists public.officers (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  password_hash text not null,
  name          text not null,
  rank          text not null default 'officer',
  department    text not null default 'civil_maintenance',
  status        text not null default 'active',   -- active | suspended | deleted
  is_on_duty    boolean not null default false,
  photo_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists officers_username_idx on public.officers (username);
create index if not exists officers_on_duty_idx  on public.officers (is_on_duty);

-- ============================================================================
-- 2) officer_ranks — ตำแหน่ง/ยศ (แก้ไขได้ในระบบ)
-- ============================================================================
create table if not exists public.officer_ranks (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  rank_key   text unique,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 3) system_settings — ตั้งค่าระบบ (แถวเดียว id = 1)
-- ============================================================================
create table if not exists public.system_settings (
  id                  integer primary key default 1,
  duty_system_enabled boolean not null default true,
  login_enabled       boolean not null default true,
  updated_at          timestamptz not null default now(),
  updated_by          uuid,
  updated_by_name     text,
  constraint system_settings_single_row check (id = 1)
);

-- ============================================================================
-- 4) duty_logs — บันทึกการเข้า-ออกเวร
-- ============================================================================
create table if not exists public.duty_logs (
  id               uuid primary key default gen_random_uuid(),
  officer_id       uuid references public.officers(id) on delete set null,
  officer_name     text not null,
  clock_in         timestamptz not null default now(),
  clock_out        timestamptz,
  duration_minutes integer,
  forced_by        uuid references public.officers(id) on delete set null,
  forced_by_name   text,
  checkout_method  text default 'self',            -- self | forced
  deleted_at       timestamptz,
  deleted_by       uuid references public.officers(id) on delete set null,
  deleted_by_name  text,
  delete_reason    text,
  created_at       timestamptz not null default now()
);
create index if not exists duty_logs_officer_idx  on public.duty_logs (officer_id);
create index if not exists duty_logs_clock_in_idx on public.duty_logs (clock_in desc);
create index if not exists duty_logs_active_idx   on public.duty_logs (officer_id, clock_out) where clock_out is null;

-- ============================================================================
-- 5) audit_logs — บันทึกการกระทำสำคัญในระบบ
-- ============================================================================
create table if not exists public.audit_logs (
  id                uuid primary key default gen_random_uuid(),
  action            text not null,
  target_type       text not null,
  target_id         uuid,
  performed_by      uuid,
  performed_by_name text not null default '',
  details           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- ============================================================================
-- 6) announcements — ประกาศ
-- ============================================================================
create table if not exists public.announcements (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  content         text not null default '',
  image_url       text,
  is_pinned       boolean not null default false,
  created_by      uuid,
  created_by_name text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists announcements_pinned_idx on public.announcements (is_pinned, created_at desc);

-- ============================================================================
-- 7) citizens — ประชาชน
-- ============================================================================
create table if not exists public.citizens (
  id               uuid primary key default gen_random_uuid(),
  roblox_username  text not null,
  discord_username text,
  status           text not null default 'normal',  -- normal | watched | suspended
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists citizens_roblox_idx on public.citizens (roblox_username);

-- ============================================================================
-- 8) service_rates — อัตราค่าบริการ
-- ============================================================================
create table if not exists public.service_rates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  price       numeric not null default 0,
  category    text not null default '',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- 9) service_records — บันทึกการให้บริการ
-- ============================================================================
create table if not exists public.service_records (
  id               uuid primary key default gen_random_uuid(),
  roblox_username  text not null default '',
  discord_username text not null default '',
  service_rate_id  uuid references public.service_rates(id) on delete set null,
  service_name     text not null default '',
  amount           numeric not null default 0,
  status           text not null default 'unpaid',  -- paid | unpaid
  service_type     text not null default 'normal',  -- normal | impound
  officer_id       uuid references public.officers(id) on delete set null,
  officer_name     text not null default '',
  notes            text not null default '',
  evidence_url     text,
  service_date     timestamptz not null default now(),
  citizen_id       uuid references public.citizens(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists service_records_officer_idx on public.service_records (officer_id);
create index if not exists service_records_date_idx    on public.service_records (service_date desc);

-- ============================================================================
-- 10) licenses — ใบอนุญาต
-- ============================================================================
create table if not exists public.licenses (
  id               uuid primary key default gen_random_uuid(),
  roblox_username  text not null,
  discord_username text,
  license_type     text not null default '',
  license_number   text,
  issue_date       timestamptz not null default now(),
  expiry_date      timestamptz,
  status           text not null default 'active',
  issued_by        uuid,
  issued_by_name   text,
  notes            text,
  citizen_id       uuid references public.citizens(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================================
-- 11) complaints — เรื่องร้องเรียน
-- ============================================================================
create table if not exists public.complaints (
  id                  uuid primary key default gen_random_uuid(),
  complainant_name    text,
  complainant_contact text,
  officer_name        text,
  category            text,
  description         text,
  discord_username    text,
  incident_datetime   timestamptz,
  details             text,
  evidence_url        text,
  status              text not null default 'pending',
  created_at          timestamptz not null default now()
);

-- ============================================================================
-- 12) emergency_reports — แจ้งเหตุฉุกเฉิน
-- ============================================================================
create table if not exists public.emergency_reports (
  id                uuid primary key default gen_random_uuid(),
  discord_username  text not null,
  report_type       text not null default 'other',   -- accident | breakdown | towing | other
  details           text not null default '',
  location          text not null default '',
  image_url         text,
  status            text not null default 'pending',  -- pending | responding | resolved | dismissed
  responded_by      uuid,
  responded_by_name text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists emergency_reports_status_idx on public.emergency_reports (status, created_at desc);

-- ============================================================================
-- 13) vehicles — ยานพาหนะ / การอายัด
-- ============================================================================
create table if not exists public.vehicles (
  id                uuid primary key default gen_random_uuid(),
  license_plate     text not null,
  owner_name        text,
  vehicle_type      text not null default 'other',   -- sedan | suv | pickup | motorcycle | truck | van | other
  color             text,
  brand_model       text,
  vehicle_category  text,
  citizen_id        uuid references public.citizens(id) on delete set null,
  is_impounded      boolean not null default false,
  impound_reason    text,
  impound_location  text,
  impounded_at      timestamptz,
  impounded_by      uuid,
  impounded_by_name text,
  released_at       timestamptz,
  released_by       uuid,
  released_by_name  text,
  notes             text,
  image_url         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists vehicles_plate_idx    on public.vehicles (license_plate);
create index if not exists vehicles_impound_idx  on public.vehicles (is_impounded);

-- ============================================================================
-- 14) officer_leaves — การลาของเจ้าหน้าที่
-- ============================================================================
create table if not exists public.officer_leaves (
  id               uuid primary key default gen_random_uuid(),
  officer_id       uuid references public.officers(id) on delete set null,
  officer_name     text not null,
  leave_type       text not null default 'other',    -- sick | personal | vacation | maternity | ordained | other
  start_date       timestamptz not null,
  end_date         timestamptz not null,
  status           text not null default 'pending',  -- pending | approved | rejected | cancelled
  reason           text,
  reviewed_by      uuid,
  reviewed_by_name text,
  reviewed_at      timestamptz,
  review_note      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists officer_leaves_officer_idx on public.officer_leaves (officer_id);
create index if not exists officer_leaves_status_idx  on public.officer_leaves (status);

-- ============================================================================
-- Row Level Security + Policies (เปิดสิทธิ์ให้ anon + authenticated ทุกตาราง)
-- ============================================================================
do $$
declare
  t text;
  tables text[] := array[
    'officers','officer_ranks','system_settings','duty_logs','audit_logs',
    'announcements','citizens','service_rates','service_records','licenses',
    'complaints','emergency_reports','vehicles','officer_leaves'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_all_access', t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true);',
      t || '_all_access', t
    );
  end loop;
end $$;

-- ============================================================================
-- Realtime — เพิ่มตารางเข้า publication เพื่อให้ supabase.channel() ทำงาน
-- (หน้า Operations subscribe: officers, duty_logs, system_settings)
-- ============================================================================
alter table public.officers        replica identity full;
alter table public.duty_logs       replica identity full;
alter table public.system_settings replica identity full;

do $$
begin
  begin alter publication supabase_realtime add table public.officers;        exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.duty_logs;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.system_settings; exception when duplicate_object then null; end;
end $$;

-- ============================================================================
-- Seed ข้อมูลเริ่มต้น
-- ============================================================================
-- แถวตั้งค่าระบบ (เปิดใช้งานทั้ง duty และ login เป็นค่าเริ่มต้น)
insert into public.system_settings (id, duty_system_enabled, login_enabled)
values (1, true, true)
on conflict (id) do nothing;

-- ยศเริ่มต้น
insert into public.officer_ranks (label, rank_key, sort_order, is_active) values
  ('หัวหน้ากรมขนส่ง', 'commissioner', 0, true),
  ('ผู้คุมสอบกรมขนส่ง', 'inspector', 1, true),
  ('พนักงาน', 'officer', 2, true)
on conflict (rank_key) do nothing;

-- บัญชีหัวหน้ากรมตัวอย่าง — username: admin / password: admin123
-- (password_hash = SHA-256 hex ของ "admin123" ให้ตรงกับ hashPassword() ในโค้ด)
-- แนะนำให้เปลี่ยนรหัสผ่านหลังเข้าใช้งานครั้งแรก
insert into public.officers (username, password_hash, name, rank, department, status, is_on_duty)
values (
  'admin',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'หัวหน้ากรมขนส่ง',
  'commissioner',
  'civil_maintenance',
  'active',
  false
)
on conflict (username) do nothing;
