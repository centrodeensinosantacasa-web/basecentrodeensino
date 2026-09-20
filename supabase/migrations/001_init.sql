-- Centro de Ensino Growth — baseline reproduzível do schema atual.
-- Não inserir dados institucionais além dos seeds explicitamente validados.
create extension if not exists pgcrypto;

create table if not exists public.organizations(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id),
  full_name text,
  role text not null default 'comercial' check(role in ('admin','marketing','comercial','coordenacao','direcao')),
  created_at timestamptz not null default now()
);

create table if not exists public.courses(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  status text not null default 'planejado' check(status in ('planejado','aberto','encerrado')),
  capacity integer check(capacity is null or capacity>=0),
  confirmed_enrollments integer check(confirmed_enrollments is null or confirmed_enrollments>=0),
  validated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  phone text,
  email text,
  course_id uuid references public.courses(id),
  source text,
  owner_id uuid references public.profiles(id),
  stage text not null default 'novo' check(stage in ('novo','aguardando_contato','em_atendimento','qualificado','oportunidade','matricula_iniciada','matricula_confirmada')),
  consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  budget numeric(12,2),
  spent numeric(12,2) not null default 0 check(spent>=0),
  status text not null default 'rascunho',
  utm_campaign text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  period text
);

create table if not exists public.tasks(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  title text not null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs(
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leads_org_stage_idx on public.leads(organization_id,stage);
create index if not exists leads_phone_idx on public.leads(organization_id,phone);
create index if not exists leads_course_idx on public.leads(organization_id,course_id);
create index if not exists leads_owner_idx on public.leads(organization_id,owner_id);
create index if not exists tasks_org_due_idx on public.tasks(organization_id,due_date);
create index if not exists profiles_org_idx on public.profiles(organization_id);
create index if not exists courses_org_idx on public.courses(organization_id);
create index if not exists campaigns_org_idx on public.campaigns(organization_id);
create index if not exists audit_logs_org_idx on public.audit_logs(organization_id);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.tasks enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_org()
returns uuid
language sql
stable
set search_path = public, pg_catalog
as $$
  select organization_id from public.profiles where id = (select auth.uid()) limit 1
$$;

create policy organizations_member_select on public.organizations
  for select to authenticated
  using (id = (select public.current_org()));

create policy organizations_bootstrap_select on public.organizations
  for select to authenticated
  using (slug = 'centro-de-ensino-santa-casa');

create policy profiles_self_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_self_insert on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid())
    and role = 'comercial'
    and organization_id = (select id from public.organizations where slug = 'centro-de-ensino-santa-casa' limit 1));

create policy courses_org_all on public.courses
  for all to authenticated
  using (organization_id = (select public.current_org()))
  with check (organization_id = (select public.current_org()));

create policy leads_org_all on public.leads
  for all to authenticated
  using (organization_id = (select public.current_org()))
  with check (organization_id = (select public.current_org()));

create policy campaigns_org_all on public.campaigns
  for all to authenticated
  using (organization_id = (select public.current_org()))
  with check (organization_id = (select public.current_org()));

create policy tasks_org_all on public.tasks
  for all to authenticated
  using (organization_id = (select public.current_org()))
  with check (organization_id = (select public.current_org()));

create policy audit_org_select on public.audit_logs
  for select to authenticated
  using (organization_id = (select public.current_org()));

grant select on public.organizations to authenticated;
grant select, insert on public.profiles to authenticated;
grant select, insert, update, delete on public.courses to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.audit_logs to authenticated;

revoke all on public.organizations, public.profiles, public.courses, public.leads, public.campaigns, public.tasks, public.audit_logs from anon;
