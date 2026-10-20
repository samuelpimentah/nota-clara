# GitHub Pages + Supabase

Publicado com autorização em https://samuelpimentah.github.io/nota-clara/. Repositório: https://github.com/samuelpimentah/nota-clara. O workflow 39348989321 concluiu build e deploy com sucesso. Os passos abaixo documentam a configuração para manutenção ou reprodução.

1. Criar um projeto Supabase gratuito e executar `supabase/migrations/001_workspaces.sql` em um banco novo. Não reutilizar uma tabela de outro aplicativo.
2. Habilitar autenticação por senha e desabilitar confirmação de e-mail para os identificadores técnicos de username. Nenhum e-mail é solicitado ao aluno.
3. Testar duas contas: cadastro, login, logout, sessão persistente, salvamento, acesso cruzado negado pelo banco e conflito de revisões.
4. Criar o repositório pessoal `samuelpimentah/nota-clara`, sem dados de `.local-data`, `.env` ou imagens de notas pessoais. Não usar repositórios de organizações.
5. Em Settings → Secrets and variables → Actions → Variables, definir `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. São valores públicos; não usar service_role ou senha do banco.
6. Em Settings → Pages, escolher GitHub Actions. O workflow `.github/workflows/pages.yml` testa, gera e publica os arquivos estáticos.
7. Abrir o site publicado e repetir as verificações de conta, dados, responsividade e exportação.

## Validação local estática

```powershell
$env:PAGES_BASE_PATH='/nota-clara'
# Defina também os dois valores públicos de um projeto Supabase real para testar login e banco.
npm run build:pages
```

`NEXT_PUBLIC_STATIC_HOST=true` é definido pelo script de build; não é necessário alterar o servidor local. Nenhuma senha ou nota local entra no build. A geração sem configuração de Supabase valida somente os arquivos estáticos e apresenta um erro de configuração ao tentar acessar contas; o workflow impede publicar sem as duas variáveis públicas.

## Contas e notas existentes

As contas locais e seus dados continuam no computador. Elas não são automaticamente copiadas ao Supabase. Antes de trocar de ambiente, mantenha uma cópia local e exporte suas notas; não publique esses arquivos no repositório. A migração autenticada de uma planilha deve ser tratada separadamente, sem copiar senhas locais nem divulgar notas.

## Modelo de sessão

No Pages, o Supabase gerencia a sessão persistente do navegador e armazena as notas em PostgreSQL. Somente a sessão utiliza o armazenamento do navegador; as notas não dependem exclusivamente dele. A política do banco exige `auth.uid() = user_id` em cada operação. O proprietário vem da sessão; tentativas de alterar a consulta pelo navegador continuam sujeitas à RLS.
