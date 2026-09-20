# Deploy no Netlify

## Opção recomendada: GitHub + deploy contínuo

1. Conecte o repositório `centrodeensinosantacasa-web/basecentrodeensino` ao Netlify.
2. Selecione a branch `main` como branch de produção.
3. Use:
   - **Base directory:** vazio
   - **Build command:** vazio
   - **Publish directory:** `.`
4. Publique o site.

O arquivo `netlify.toml` já contém essas configurações e headers básicos de segurança.

## Supabase

O frontend usa a URL e a chave pública do Supabase em `supabase-config.js`.

- A chave publicada no navegador deve ser uma chave pública/publishable.
- Nunca usar uma `service_role` key no frontend.
- A proteção dos dados depende de autenticação e RLS no Supabase.

## Primeiro acesso

1. Abra a URL gerada pelo Netlify.
2. Crie o primeiro usuário institucional pela tela de autenticação.
3. Confirme o e-mail caso a confirmação esteja habilitada no Supabase.
4. Entre no sistema e valide a leitura/gravação dos dados.

## Deploy manual temporário

Também é possível usar o Netlify Drop para uma publicação inicial. Para evolução contínua, prefira GitHub + deploy contínuo.
