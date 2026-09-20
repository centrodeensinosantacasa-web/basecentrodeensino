# Centro de Ensino Growth — MVP funcional

MVP funcional baseado no briefing do Centro de Ensino, com frontend responsivo, autenticação, CRM, Command Center, cursos, campanhas, tarefas, Supabase/PostgreSQL, RLS, auditoria, testes e configuração para Netlify.

## Executar localmente

Requer Node.js 18+.

```bash
npm run serve
```

Abra `http://127.0.0.1:4173`.

Teste automatizado:

```bash
npm test
```

## Funcionalidades entregues

- Command Center com KPIs, funil e indicadores que permanecem como “não disponível” quando não há denominador/dado validado.
- CRM comercial com cadastro mínimo de lead, consentimento, origem, curso, responsável e etapas do funil.
- Cinco formações do briefing, sem inventar vagas ou matrículas.
- Marketing Intelligence com campanha outubro–dezembro/2026, orçamento, gasto limitado ao orçamento e UTM.
- Campo de período da campanha persistido no Supabase.
- Tarefas e calendário operacional básico.
- Backup JSON via interface.
- Autenticação Supabase por e-mail/senha e sessão persistente.
- Persistência Supabase com escopo por organização, RLS, grants mínimos para `authenticated` e auditoria por triggers.
- Configuração Netlify (`netlify.toml`) e documentação de publicação.

## Dados institucionais

O sistema não deve publicar ou inventar preços, horários, vagas, depoimentos, metas ou outros dados não validados. Onde o briefing não fornece um valor institucional confirmado, a interface usa “não informado”, “a validar” ou estado equivalente.

Os valores de mídia Google Ads R$ 600, Meta Ads R$ 750 e reserva R$ 150/mês são apresentados como proposta do briefing, não como gasto confirmado.

## Supabase

O frontend usa uma chave pública/publishable. Nunca colocar `service_role`/secret key no navegador.

O projeto Supabase conectado durante o desenvolvimento está em São Paulo (`sa-east-1`) e usa RLS com escopo por organização. O primeiro usuário precisa se cadastrar/logar para que o perfil comercial inicial seja criado pela aplicação.

Os arquivos em `supabase/migrations/` foram reconciliados para refletir o schema funcional atual e podem ser usados como referência de infraestrutura. A instância de produção/desenvolvimento já existente tem seu próprio histórico de migrations no Supabase.

## Deploy Netlify

A configuração está preparada para GitHub + deploy contínuo. Veja `docs/NETLIFY.md`.

O Netlify pode publicar a partir de um repositório Git e redeployar automaticamente após pushes na branch de produção. Consulte a documentação oficial de deploy do Netlify para os passos de conexão.

## Estado atual

O repositório GitHub `centrodeensinosantacasa-web/basecentrodeensino` está populado com o MVP funcional, migrações, testes, documentação e configuração de CI/Netlify. O primeiro deploy Netlify ainda depende de conectar este repositório a um site Netlify e autorizar o acesso da conta Netlify.
