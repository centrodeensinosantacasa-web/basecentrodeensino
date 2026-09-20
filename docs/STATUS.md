# Status — Centro de Ensino Growth

Atualizado em 20/09/2026.

## Entregue
- MVP responsivo com Command Center, CRM, cursos, campanhas e tarefas.
- Autenticação Supabase por e-mail/senha e sessão persistente.
- Persistência Supabase/PostgreSQL com escopo por organização e RLS.
- Grants mínimos para `authenticated`; acesso `anon` revogado nas tabelas do MVP.
- Cinco cursos do briefing cadastrados sem inventar capacidade ou matrículas.
- Campanha-base outubro–dezembro/2026 com orçamento de proposta de R$ 4.500 e UTM.
- Campo de período de campanha persistido no banco.
- Trilha de auditoria por triggers para cursos, leads, campanhas e tarefas; metadados do trigger não armazenam PII do lead.
- `updated_at` automatizado por trigger para cursos, leads e campanhas.
- Segurança: RLS/grants/triggers foram conferidos; o advisor atual mantém 1 aviso de Auth para proteção contra senhas vazadas desabilitada. A documentação atual do Supabase indica esse recurso como disponível no Pro ou superior.
- Projeto preparado para publicação no Netlify e repositório GitHub institucional.

## Testado
- `node --check app.js`
- `node --check auth.js`
- `npm test` (smoke tests)
- Estrutura do banco conferida após as alterações.
- Grants e políticas RLS conferidos por consulta ao catálogo PostgreSQL.
- Advisor de segurança conferido após hardening.

## Pendente / próximo bloco
- Primeiro usuário institucional precisa se cadastrar/logar para validar o fluxo autenticado ponta a ponta.
- Atribuição de lead agora persiste o `profiles.id` real e exibe o nome do usuário atual quando disponível; distribuição entre outros usuários ainda depende de uma política/listagem de perfis adequada.
- Histórico detalhado de etapas/interações ainda será expandido conforme Fase D do briefing.
- Backup/restauração automatizado e teste formal de restauração ainda pendentes.
- Integrações Google Ads/Meta/WhatsApp e publicação externa continuam dependentes de contas, credenciais e autorização.
- Conectar o repositório ao Netlify e realizar primeiro deploy de produção.
