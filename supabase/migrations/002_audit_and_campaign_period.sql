-- Auditoria e timestamps automáticos.
create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at before update on public.courses
for each row execute function private.set_updated_at();

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at before update on public.campaigns
for each row execute function private.set_updated_at();

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads
for each row execute function private.set_updated_at();

create or replace function private.audit_growth_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  org_id uuid;
  entity_id uuid;
  actor uuid;
begin
  org_id := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  entity_id := case when tg_op = 'DELETE' then old.id else new.id end;
  actor := auth.uid();
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
  values(org_id,actor,lower(tg_op),tg_table_name,entity_id,
         jsonb_build_object('source','database_trigger','table',tg_table_name));
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.audit_growth_change() from public, anon, authenticated;

drop trigger if exists audit_courses on public.courses;
create trigger audit_courses after insert or update or delete on public.courses
for each row execute function private.audit_growth_change();

drop trigger if exists audit_leads on public.leads;
create trigger audit_leads after insert or update or delete on public.leads
for each row execute function private.audit_growth_change();

drop trigger if exists audit_campaigns on public.campaigns;
create trigger audit_campaigns after insert or update or delete on public.campaigns
for each row execute function private.audit_growth_change();

drop trigger if exists audit_tasks on public.tasks;
create trigger audit_tasks after insert or update or delete on public.tasks
for each row execute function private.audit_growth_change();

comment on column public.campaigns.period is 'Período editorial/operacional informado pela aplicação; não representa publicação confirmada.';
