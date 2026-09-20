-- Seeds explicitamente definidos no briefing/MVP. Capacidades e matrículas permanecem nulas.
insert into public.organizations(name,slug)
values ('Centro de Ensino Santa Casa','centro-de-ensino-santa-casa')
on conflict (slug) do update set name = excluded.name;

insert into public.courses(organization_id,name,status,capacity,confirmed_enrollments,validated)
select o.id,v.name,v.status,null,null,false
from public.organizations o
cross join (values
  ('Técnico em Enfermagem','aberto'),
  ('Técnico em Segurança do Trabalho','aberto'),
  ('Técnico em Radiologia','aberto'),
  ('Instrumentação Cirúrgica','planejado'),
  ('Técnico em Equipamentos Biomédicos','aberto')
) as v(name,status)
where o.slug='centro-de-ensino-santa-casa'
  and not exists (
    select 1 from public.courses c where c.organization_id=o.id and c.name=v.name
  );
