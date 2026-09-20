begin;

select plan(16);

select has_table('public','organizations','organizations table exists');
select has_table('public','profiles','profiles table exists');
select has_table('public','courses','courses table exists');
select has_table('public','leads','leads table exists');
select has_table('public','campaigns','campaigns table exists');
select has_table('public','tasks','tasks table exists');
select has_table('public','audit_logs','audit_logs table exists');

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
