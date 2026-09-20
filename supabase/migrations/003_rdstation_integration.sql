-- RD Station Marketing integration.
create table if not exists public.rdstation_connections(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'rd_station_marketing' check(provider = 'rd_station_marketing'),
  status text not null default 'pending' check(status in ('pending','connected','error','disabled')),
  rd_account_id text,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, provider)
);

create table if not exists public.rdstation_sync_runs(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.rdstation_connections(id) on delete set null,
  mode text not null check(mode in ('import','webhook')),
  status text not null check(status in ('started','completed','failed')),
  fetched_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.rdstation_credentials(
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text not null,
  access_token_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.leads
  add column if not exists external_source text,
  add column if not exists external_id text;

create unique index if not exists leads_external_source_id_uidx
  on public.leads(organization_id, external_source, external_id)
  where external_source is not null and external_id is not null;

create index if not exists rdstation_connections_org_idx
  on public.rdstation_connections(organization_id);

create index if not exists rdstation_sync_runs_org_started_idx
  on public.rdstation_sync_runs(organization_id, started_at desc);

alter table public.rdstation_connections enable row level security;
alter table public.rdstation_sync_runs enable row level security;
alter table public.rdstation_credentials enable row level security;

drop policy if exists rdstation_connections_org_all on public.rdstation_connections;
create policy rdstation_connections_org_all on public.rdstation_connections
  for all to authenticated
  using (organization_id = (select public.current_org()))
  with check (organization_id = (select public.current_org()));

drop policy if exists rdstation_sync_runs_org_select on public.rdstation_sync_runs;
create policy rdstation_sync_runs_org_select on public.rdstation_sync_runs
  for select to authenticated
  using (organization_id = (select public.current_org()));

revoke all on public.rdstation_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.rdstation_credentials to service_role;
grant select, insert, update, delete on public.rdstation_connections to authenticated;
grant select on public.rdstation_sync_runs to authenticated;
revoke all on public.rdstation_connections, public.rdstation_sync_runs from anon;

comment on table public.rdstation_credentials is 'Encrypted RD Station OAuth tokens. Accessible only to backend service_role; ciphertext is unusable without the Edge Function encryption secret.';
