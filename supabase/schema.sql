-- =====================================================================
-- DOT System — Supabase Schema
-- ตาราง: officers, duty_logs, system_settings (+ audit_logs)
-- พร้อม RLS Policy และเปิด Realtime
-- คัดลอกทั้งไฟล์นี้ไปวางใน Supabase > SQL Editor แล้วกด Run ได้ทันที
-- =====================================================================

-- ต้องมี extension สำหรับสร้าง UUID
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1) ตาราง officers — ข้อมูลเจ้าหน้าที่ / บัญชีเข้าสู่ระบบ
-- ---------------------------------------------------------------------
create table if not exists public.officers (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  password_hash text not null,
  name          text not null,
  rank          text not null default 'officer',
  department    text not null default 'traffic_management',
  status        text not null default 'active',   -- active | suspended | deleted
  is_on_duty    boolean not null default false,
  photo_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists officers_username_idx on public.officers (username);
create index if not exists officers_on_duty_idx  on public.officers (is_on_duty);

-- ---------------------------------------------------------------------
-- 2) ตาราง duty_logs — ประวัติการเข้า-ออกเวร
-- ---------------------------------------------------------------------
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

create index if not exists duty_logs_officer_idx   on public.duty_logs (officer_id);
create index if not exists duty_logs_clock_in_idx  on public.duty_logs (clock_in desc);
create index if not exists duty_logs_active_idx     on public.duty_logs (officer_id, clock_out) where clock_out is null;

-- ---------------------------------------------------------------------
-- 3) ตาราง system_settings — ค่าตั้งค่าระบบ (แถวเดียว id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.system_settings (
  id                  integer primary key default 1,
  duty_system_enabled boolean not null default true,
  login_enabled       boolean not null default true,
  updated_at          timestamptz not null default now(),
  updated_by          uuid,
  updated_by_name     text,
  constraint system_settings_single_row check (id = 1)
);

-- แถวเริ่มต้น (login เปิดใช้งานเสมอ)
insert into public.system_settings (id, duty_system_enabled, login_enabled)
values (1, true, true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 4) ตาราง audit_logs — บันทึกการกระทำสำคัญ (อ้างอิงในหน้า Operations)
-- ---------------------------------------------------------------------
create table if not exists public.audit_logs (
  id                uuid primary key default gen_random_uuid(),
  action            text not null,
  target_type       text not null,
  target_id         uuid,
  performed_by      uuid,
  performed_by_name text not null,
  details           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- =====================================================================
-- Row Level Security (RLS)
-- แอปใช้การยืนยันตัวตนเองผ่านตาราง officers ด้วย anon key
-- จึงต้องเปิดสิทธิ์ให้ role anon อ่าน/เขียนได้ตามการใช้งานจริง
-- =====================================================================

alter table public.officers        enable row level security;
alter table public.duty_logs       enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs      enable row level security;

-- ลบ policy เดิม (ถ้ามี) เพื่อให้รันซ้ำได้อย่างปลอดภัย
drop policy if exists "officers_select"        on public.officers;
drop policy if exists "officers_insert"        on public.officers;
drop policy if exists "officers_update"        on public.officers;
drop policy if exists "duty_logs_select"       on public.duty_logs;
drop policy if exists "duty_logs_insert"       on public.duty_logs;
drop policy if exists "duty_logs_update"       on public.duty_logs;
drop policy if exists "system_settings_select" on public.system_settings;
drop policy if exists "system_settings_update" on public.system_settings;
drop policy if exists "system_settings_insert" on public.system_settings;
drop policy if exists "audit_logs_select"      on public.audit_logs;
drop policy if exists "audit_logs_insert"      on public.audit_logs;

-- officers: อ่าน + เพิ่ม + แก้ไข (เข้าสู่ระบบ, สลับสถานะเข้าเวร, จัดการเจ้าหน้าที่)
create policy "officers_select" on public.officers for select to anon, authenticated using (true);
create policy "officers_insert" on public.officers for insert to anon, authenticated with check (true);
create policy "officers_update" on public.officers for update to anon, authenticated using (true) with check (true);

-- duty_logs: อ่าน + เพิ่ม + แก้ไข (เข้า-ออกเวร, บังคับออก, ลบแบบ soft-delete)
create policy "duty_logs_select" on public.duty_logs for select to anon, authenticated using (true);
create policy "duty_logs_insert" on public.duty_logs for insert to anon, authenticated with check (true);
create policy "duty_logs_update" on public.duty_logs for update to anon, authenticated using (true) with check (true);

-- system_settings: อ่าน + แก้ไข + เพิ่ม (เปิด/ปิดระบบเข้าเวร)
create policy "system_settings_select" on public.system_settings for select to anon, authenticated using (true);
create policy "system_settings_update" on public.system_settings for update to anon, authenticated using (true) with check (true);
create policy "system_settings_insert" on public.system_settings for insert to anon, authenticated with check (true);

-- audit_logs: อ่าน + เพิ่ม
create policy "audit_logs_select" on public.audit_logs for select to anon, authenticated using (true);
create policy "audit_logs_insert" on public.audit_logs for insert to anon, authenticated with check (true);

-- =====================================================================
-- เปิด Realtime ให้ตารางที่หน้า Operations ใช้ subscribe
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.officers;
    alter publication supabase_realtime add table public.duty_logs;
    alter publication supabase_realtime add table public.system_settings;
  end if;
exception
  when duplicate_object then null;  -- ตารางอยู่ใน publication อยู่แล้ว
end $$;

-- ให้ Realtime ส่งข้อมูลแถวเดิม (old record) ครบถ้วนเวลา UPDATE/DELETE
alter table public.officers        replica identity full;
alter table public.duty_logs       replica identity full;
alter table public.system_settings replica identity full;

-- =====================================================================
-- (ตัวอย่าง) สร้างบัญชีหัวหน้ากรมเริ่มต้น
-- password_hash คือ SHA-256 ของรหัสผ่าน — ตัวอย่างด้านล่างคือ hash ของคำว่า "admin123"
-- แนะนำให้เปลี่ยนรหัสผ่านหลังเข้าใช้งานครั้งแรก
-- =====================================================================
insert into public.officers (username, password_hash, name, rank, department, status)
values (
  'admin',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',  -- SHA-256("admin123")
  'หัวหน้ากรมขนส่ง',
  'commissioner',
  'traffic_management',
  'active'
)
on conflict (username) do nothing;
