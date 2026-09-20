begin;

select plan(31);

select has_table('public','organizations','organizations table exists');
select has_table('public','profiles','profiles table exists');
select has_table('public','courses','courses table exists');
select has_table('public','leads','leads table exists');
select has_table('public','campaigns','campaigns table exists');
select has_table('public','tasks','tasks table exists');
select has_table('public','audit_logs','audit_logs table exists');
select has_table('public','rdstation_connections','rdstation_connections table exists');
select has_table('public','rdstation_sync_runs','rdstation_sync_runs table exists');
select has_table('public','rdstation_credentials','rdstation_credentials table exists');

select ok(
  (select count(*) = 7
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and c.relrowsecurity),
  'all seven exposed growth tables have RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.leads', 'SELECT'),
  'anon cannot select leads'
);

select ok(
  not has_table_privilege('anon', 'public.courses', 'SELECT'),
  'anon cannot select courses'
);

select ok(
  has_table_privilege('authenticated', 'public.leads', 'SELECT'),
  'authenticated can select leads subject to RLS'
);

select ok(
  has_table_privilege('authenticated', 'public.leads', 'INSERT'),
  'authenticated can insert leads subject to RLS'
);

select ok(
  has_table_privilege('authenticated', 'public.leads', 'UPDATE'),
  'authenticated can update leads subject to RLS'
);

select ok(
  has_table_privilege('authenticated', 'public.leads', 'DELETE'),
  'authenticated can delete leads subject to RLS'
);

select has_column('public','leads','utm_source','leads has utm_source');
select has_column('public','leads','utm_campaign','leads has utm_campaign');
select has_column('public','leads','external_source','leads has external_source');
select has_column('public','leads','external_id','leads has external_id');

select ok((select relrowsecurity from pg_class where oid='public.rdstation_connections'::regclass),'RD connections has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.rdstation_sync_runs'::regclass),'RD sync runs has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.rdstation_credentials'::regclass),'RD credentials has RLS enabled');

select policies_are(
  'public','organizations',
  ARRAY['organizations_authenticated_select'],
  'organizations exposes only the consolidated authenticated select policy'
);

select policies_are(
  'public','profiles',
  ARRAY['profiles_self_select','profiles_self_insert'],
  'profiles exposes only the expected self policies'
);

select policies_are(
  'public','courses',
  ARRAY['courses_org_all'],
  'courses exposes only the organization policy'
);

select policies_are(
  'public','leads',
  ARRAY['leads_org_all'],
  'leads exposes only the organization policy'
);

select policies_are(
  'public','campaigns',
  ARRAY['campaigns_org_all'],
  'campaigns exposes only the organization policy'
);

select policies_are(
  'public','tasks',
  ARRAY['tasks_org_all'],
  'tasks exposes only the organization policy'
);

select policies_are(
  'public','audit_logs',
  ARRAY['audit_org_select'],
  'audit_logs exposes only the organization select policy'
);

select policies_are(
  'public','rdstation_connections',
  ARRAY['rdstation_connections_org_all'],
  'RD connections exposes only the organization policy'
);

select policies_are(
  'public','rdstation_sync_runs',
  ARRAY['rdstation_sync_runs_org_select'],
  'RD sync runs exposes only the organization select policy'
);

select policies_are(
  'public','rdstation_credentials',
  ARRAY['rdstation_credentials_backend_all'],
  'RD credentials exposes only the backend policy'
);

select ok(not has_table_privilege('anon','public.rdstation_credentials','SELECT'),'anon cannot select RD credentials');
select ok(not has_table_privilege('authenticated','public.rdstation_credentials','SELECT'),'authenticated cannot select RD credentials');

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'audit_growth_change'
  ),
  'audit trigger function exists in private schema'
);

select * from finish();

rollback;
