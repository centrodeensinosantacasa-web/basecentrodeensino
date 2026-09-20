begin;

select plan(7);

insert into public.organizations(id,name,slug) values
  ('00000000-0000-0000-0000-000000000101','RLS Test Org 1','rls-test-org-1'),
  ('00000000-0000-0000-0000-000000000102','RLS Test Org 2','rls-test-org-2');

insert into auth.users(id,email,aud,role,encrypted_password) values
  ('00000000-0000-0000-0000-000000000201','rls-test-1@example.invalid','authenticated','authenticated','x'),
  ('00000000-0000-0000-0000-000000000202','rls-test-2@example.invalid','authenticated','authenticated','x');

insert into public.profiles(id,organization_id,full_name,role) values
  ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','RLS Test 1','comercial'),
  ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000102','RLS Test 2','comercial');

insert into public.courses(id,organization_id,name,status) values
  ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000101','RLS Course 1','aberto'),
  ('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000102','RLS Course 2','aberto');

insert into public.leads(id,organization_id,name,course_id,consent) values
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000101','RLS Lead 1','00000000-0000-0000-0000-000000000301',true),
  ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000102','RLS Lead 2','00000000-0000-0000-0000-000000000302',true);

create temp table rls_results(name text primary key, passed boolean);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000201',true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;

select ok((select count(*) = 1 from public.leads),'authenticated user sees only own organization leads');
select ok(exists(select 1 from public.leads where id='00000000-0000-0000-0000-000000000401'),'own organization lead is visible');
select ok(not exists(select 1 from public.leads where id='00000000-0000-0000-0000-000000000402'),'cross-organization lead is hidden');

do $$
begin
  begin
    insert into public.leads(organization_id,name,consent)
    values ('00000000-0000-0000-0000-000000000101','RLS Insert Allowed',true);
    insert into rls_results values ('own_insert',true);
  exception when others then
    insert into rls_results values ('own_insert',false);
  end;

  begin
    insert into public.leads(organization_id,name,consent)
    values ('00000000-0000-0000-0000-000000000102','RLS Insert Denied',true);
    insert into rls_results values ('cross_insert',false);
  exception when others then
    insert into rls_results values ('cross_insert',true);
  end;
end $$;

select ok((select passed from rls_results where name='own_insert'),'authenticated user can insert into own organization');
select ok((select passed from rls_results where name='cross_insert'),'cross-organization insert is denied');

update public.leads set name='RLS Lead 1 Updated' where id='00000000-0000-0000-0000-000000000401';
select ok(exists(select 1 from public.leads where id='00000000-0000-0000-0000-000000000401' and name='RLS Lead 1 Updated'),'own organization update is allowed');

delete from public.leads where id='00000000-0000-0000-0000-000000000401';
select ok(not exists(select 1 from public.leads where id='00000000-0000-0000-0000-000000000401'),'own organization delete is allowed');

select * from finish();

rollback;
