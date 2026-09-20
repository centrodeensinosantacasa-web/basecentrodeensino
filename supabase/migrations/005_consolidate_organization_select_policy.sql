-- Keep the bootstrap path for the first authenticated profile while avoiding
-- multiple permissive SELECT policies on organizations.
drop policy if exists organizations_bootstrap_select on public.organizations;
drop policy if exists organizations_member_select on public.organizations;

create policy organizations_authenticated_select
on public.organizations
for select
to authenticated
using (
  slug = 'centro-de-ensino-santa-casa'
  or id = (select public.current_org())
);
