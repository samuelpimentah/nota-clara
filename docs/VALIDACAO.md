# Validação da Nota Clara

## Resultado atual

Aplicação publicada, com autorização explícita, em https://samuelpimentah.github.io/nota-clara/. Repositório pessoal: https://github.com/samuelpimentah/nota-clara.

GitHub Actions: https://github.com/samuelpimentah/nota-clara/actions/runs/39348989321 — build e deploy concluídos com sucesso. Os avisos do workflow são de migração de runtime de actions oficiais e imagem Ubuntu; não houve falha.

## Cálculos e exportação

52 testes automatizados passaram e também foram executados pelo workflow de publicação. Cobrem média anual com pesos fixos 1 e 2, recuperação de S1 com teto 7, precisão racional, limites das pendências, notas ausentes versus zero, notas únicas e detalhadas, pesos internos de avaliações, pesos N1/N2 independentes e metas dinâmicas. Há testes de CSV e leitura do XLSX gerado, com acentos, números, vazios, zero, aspas, quebras de linha e nomes que poderiam ser interpretados como fórmulas. O identificador técnico de username corresponde no servidor e navegador.

Exemplo validado: S1=6, N1 de S2=7 → necessidade de 7,4 em N2. Com N2=7,4, S2=7,2; S1 ajustado=6,6; média anual=7, situação Garantida. Notas parciais não fecham a média anual. Pesos das avaliações só afetam seu próprio bloco. Os pesos anuais não são editáveis.

## Supabase real e isolamento

Organização pessoal Nota Clara, projeto nota-clara no plano Free de samuelpimentah. Migração 001 executada, com RLS, políticas por proprietário e trigger de revisão. Confirmação de e-mail desabilitada com autorização explícita no momento da alteração; cadastro pede somente username e senha. Site URL configurada para o endereço publicado. Nenhuma chave privilegiada ou senha do banco foi utilizada no cliente, no repositório ou no build.

`scripts/verify-supabase.ts` passou em 12 verificações reais:

1. Cadastro sem confirmação de e-mail configurado.
2. Duas contas de QA criadas com sessão e senha.
3. Planilha autenticada inserida.
4. Anônimo não acessa notas.
5. Conta B não lê notas da conta A.
6. Conta B não altera notas da conta A.
7. Inserção em nome de outro proprietário é negada.
8. Salvamento incrementa a revisão.
9. Revisão antiga não sobrescreve dados.
10. Trigger rejeita incremento inválido de revisão.
11. Logout remove acesso autenticado.
12. Novo login recupera as notas salvas.

As duas contas `qa_online_*` e uma conta `qa_ui_*` foram criadas exclusivamente para validação. Seus dados são exemplos de teste; não são notas reais do proprietário. As senhas de QA não foram publicadas.

## Interface publicada

- Login por username/senha funcionou na versão estática local e no endereço HTTPS público.
- Notas preenchidas na versão estática local foram recuperadas no endereço público pelo Supabase, demonstrando armazenamento fora do navegador.
- Entrada com vírgula, meta dinâmica 7,4, média anual 7 e ajuste de S1 conferidos visualmente. Após recarregar, sessão e notas foram recuperadas.
- Coluna Final do ano ao lado da situação. Sem semestres concluídos, resultado Pendente.
- Viewport 390×844: largura do documento 375 px, sem transbordamento horizontal. Cartões móveis exibem situação e média anual juntos.
- Opções CSV e Excel presentes no site publicado. O clique no Excel iniciou a geração sem erro no console; o recebimento pelo gerenciador de downloads da ferramenta não foi confirmado. Não houve abertura no Microsoft Excel.
- Console da revisão publicada sem erros ou avisos.
- Capturas locais em docs/preview mostram contas descartáveis de QA e estão excluídas do Git, assim como anexos pessoais, ambientes e dados locais.

## Ambiente local e limites

O servidor local padrão e suas contas continuam separados do site online. A revisão anterior passou em 20 verificações HTTP locais, com sessão, persistência, concorrência e isolamento. A versão estática remove rotas API e proxy apenas em `.pages-build`; o código local permanece disponível.

As notas reais do proprietário continuam no computador e não foram migradas automaticamente ao Supabase. O site exige criar uma conta online. Há exportação, mas não há importação automática nem histórico independente de anos. Não existe recuperação de senha, conforme solicitado. A conferência móvel usou viewport do navegador, não aparelho físico.
