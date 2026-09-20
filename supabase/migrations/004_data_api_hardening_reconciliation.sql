-- Reconciliation for the hardening applied after the initial production migrations.
-- Keeps the repository's desired Data API grants and bootstrap policy explicit.
revoke all on public.organizations, public.profiles, public.courses, public.leads, public.campaigns, public.tasks, public.audit_logs from anon;

grant select on public.organizations to authenticated;
grant select, insert on public.profiles to authenticated;
grant select, insert, update, delete on public.courses to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.audit_logs to authenticated;

drop policy if exists organizations_bootstrap_select on public.organizations;
create policy organizations_bootstrap_select on public.organizations
for select to authenticated
using (slug='centro-de-ensino-santa-casa');

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
for insert to authenticated
with check (
  id=(select auth.uid())
  and role='comercial'
  and organization_id=(select id from public.organizations where slug='centro-de-ensino-santa-casa' limit 1)
);
