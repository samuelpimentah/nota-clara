# Validação da Nota Clara

## Resultado atual

Aplicação publicada, com autorização explícita, em https://samuelpimentah.github.io/nota-clara/. Repositório pessoal: https://github.com/samuelpimentah/nota-clara.

GitHub Actions: https://github.com/samuelpimentah/nota-clara/actions/runs/39421109152 — build e deploy concluídos com sucesso. Os avisos do workflow são de migração de runtime de actions oficiais e imagem Ubuntu; não houve falha.

## Cálculos e exportação

60 testes automatizados passaram na revisão de PDF. Cobrem média anual, recuperação com teto, precisão racional, pendências, pesos, metas dinâmicas e pessoais, compatibilidade com planilhas antigas e importação seletiva. O teste de PDF lê o arquivo gerado para conferir título, notas, vazios e ausência de frequência. CSV/Excel foram substituídos por PDF.

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
- Na revisão anterior havia CSV/Excel. Na atualização atual foram substituídos por PDF; geração pela interface local sem erros no console. O arquivo produzido pelo mesmo gerador foi aberto, extraído e renderizado para conferência.
- Console da revisão publicada sem erros ou avisos.
- Capturas locais em docs/preview mostram contas descartáveis de QA e estão excluídas do Git, assim como anexos pessoais, ambientes e dados locais.

## Ambiente local e limites

O servidor local padrão e suas contas continuam separados do site online. A revisão anterior passou em 20 verificações HTTP locais, com sessão, persistência, concorrência e isolamento. A versão estática remove rotas API e proxy apenas em `.pages-build`; o código local permanece disponível.

As notas reais do proprietário continuam no computador e não foram migradas automaticamente ao Supabase. O site exige criar uma conta online. Há exportação PDF e importação revisada de médias semestrais; não existe histórico independente de anos. Não existe recuperação de senha, conforme solicitado. A conferência móvel usou viewport do navegador, não aparelho físico.

## Atualização de boletim PDF

- PDF original anexado: 18 disciplinas reconhecidas e vinculadas corretamente; todas as notas de S2 ausentes permaneceram nulas. Não se importam frequência, faltas, médias anuais ou recuperação final.
- Interface local: introdução no primeiro acesso, persistência após recarregar, edição direta da média do semestre, retorno às notas N1/N2 guardadas, prévia com conflitos desmarcados e aplicação somente das notas selecionadas.
- Meta pessoal 8: S1=6 e N1(S2)=7 exigem N2=10. Com N2=7,4 a aprovação escolar fica Garantida, mas a meta pessoal não foi atingida. Regra oficial não alterada.
- PDF A4 com tabela, aviso não oficial e data; inspeção visual de uma página e de todas as seis páginas de um cenário com 100 nomes longos. Linhas não são quebradas entre páginas e o rodapé não sobrepõe a tabela.
- Migração 002 aplicada sem atualizar linhas. Os nove registros e sua assinatura de conteúdo, revisão e data ficaram idênticos antes/depois. Teste real posterior, apenas na conta qa_ui, confirmou que um cliente antigo não apaga as preferências; todas as suas notas permaneceram idênticas.
- Limites: PDFs precisam conter texto selecionável; não há OCR. A conferência do viewport móvel da revisão anterior permanece documentada acima; a ferramenta de viewport não aplicou o novo tamanho nesta sessão, portanto não foi registrada uma nova validação móvel.

### Publicação desta atualização

Commit 22a12b2 publicado pelo workflow 39421109152: build e deploy concluídos com sucesso. No endereço público, conferidos a introdução, os campos finais editáveis e os novos controles PDF. Console sem erros ou avisos. Worker PDF e fontes retornaram HTTP 200 no caminho /nota-clara/. A sessão existente foi mantida, sem gravações de teste na planilha do usuário; os testes de edição/importação foram feitos na conta local de QA. Nenhum dado do anexo foi enviado ao repositório.

## Correção da mensagem de planejamento

63 testes passaram, incluindo S1 direto 5,5 e S2 com N1 detalhada 7,75 e N2 única 10. Sem planejamento confirmado, a mensagem agora pede confirmação das avaliações de S2, mantendo limites conservadores. Com confirmação, S2=8,875 e média anual=8,25. Sem S1, a solicitação de S1 permanece; zero é considerado nota. Nenhuma migração ou alteração nas notas dos usuários.

## Card Média geral

66 testes passaram e TypeScript sem erros. Testes cobrem notas ausentes versus zero, exclusão de matérias ocultas, semestres parciais, médias anuais com recuperação, pesos iguais entre disciplinas, resultado vazio e preservação da entrada. Interface local conferida com cinco cards, valor decimal, identificação parcial e contagem. Nenhuma alteração no formato dos dados ou no banco.
