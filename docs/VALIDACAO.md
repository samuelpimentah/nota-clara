# Validação local — 18 e 19/10/2026

## Resultado

- **50 testes de cálculo, validação e exportação passaram**, incluindo notas únicas por bloco, modos mistos, preservação de avaliações antigas, pesos fixos e projeções dinâmicas.
- **20 verificações HTTP de integração passaram**, incluindo persistência de N1/N2 únicas, migração de Estágio e recuperação da meta após novo acesso. Os testes foram executados também na cópia de Downloads e no servidor da porta 3000.
- TypeScript sem erros e build otimizado do Next.js concluído.
- Servidor de desenvolvimento encerrado e build de produção iniciado localmente; sessão, matérias, preferências e notas foram recuperadas após o reinício.
- Nenhum erro ou aviso no console do navegador durante os fluxos visuais verificados.

## Cenários cobertos pelo motor

Pesos anuais; média recuperada correta e seu teto; preservação de S1 quando o ajuste não se aplica; metas de S2; médias simples e ponderadas; normalização dos pesos de N1/N2; zero e notas ausentes; blocos sem avaliações; planejamento aberto; limites mínimos/máximos; garantia com pendências; impossibilidade; dados insuficientes; médias periódicas exatas; médias imediatamente abaixo de 7; alternância entre entrada direta e detalhada; metas ponderadas restantes; notas necessárias acima de 10; blocos com peso zero; metas arredondadas para cima; vírgula decimal; rejeição de pesos inválidos e IDs duplicados; lista de matérias sem notas inventadas.

## Cenários HTTP locais

1. Requisição sem sessão bloqueada.
2. Mutação com origem externa bloqueada.
3. Cadastro por username e senha, cookie HttpOnly e SameSite=Lax.
4. Planilha inicial com 18 disciplinas e notas null.
5. Gravação de notas no servidor.
6. Outra conta não lê a primeira, mesmo fornecendo seu ID na URL.
7. Tentativa de escolher o proprietário no corpo rejeitada.
8. Revisão antiga rejeitada com HTTP 409.
9. Nota acima de 10 rejeitada no servidor.
10. Gravações concorrentes resultam em um sucesso e um conflito.
11. Nota vazia permanece null após persistência.
12. Persistência em disco e senha como hash, sem texto puro.
13. Logout invalida o cookie anterior.
14. Senha incorreta não autentica.
15. Novo login recupera os dados; usernames normalizam maiúsculas.
16. Username duplicado rejeitado.
17. Tentativa de configurar o peso anual de um semestre rejeitada.
18. Migração de Tecnologia para Estágio preserva notas, avaliações e pesos.
19. Migração do catálogo aplicada apenas uma vez, sem incrementar revisões a cada leitura.
20. Nota única de N1 persistida e meta dinâmica de N2 recuperada após novo acesso.

## Verificação visual

Navegador local em 1280 × 900 e 390 × 844. No celular, a largura do documento permaneceu dentro do viewport e a tabela foi substituída por cartões editáveis.

- Cadastro sem e-mail nem recuperação de senha.
- Lançamento rápido de S1 com vírgula decimal.
- Criação de avaliações N1/N2; tipo individual/em grupo.
- Planejamento completo e meta restante de N2.
- Pesos 30/70 produzem meta restante 6,86 no cenário S1=6 e N1=8.
- Pesos 50/50, S1=6, N1=8 e N2=6,4 produzem S2=7,2, S1 ajustado=6,6 e aprovação direta garantida.
- Troca para média direta e retorno ao modo detalhado preservam as avaliações e suas notas.
- Reordenação, remoção confirmada e preservação das avaliações restantes.
- Ocultar ESG reduz a contagem para 17; reativar restaura as 18 disciplinas.
- Modo claro/escuro e indicadores de salvamento.
- Inclusão de uma disciplina personalizada, busca pelo nome e ocultação posterior.
- Planilha com dois cabeçalhos de semestre: N1, N2 e média de S1 e S2; o atalho de N1 de S1 abre o primeiro semestre.
- No primeiro semestre, avaliações de N1 com notas 4 e 10 e pesos 3 e 1 geram N1=5,5; N2 permanece 8. Com N1/N2 em 40/60, S1=7 e a meta de S2=7.
- A interface mostra 75%/25% dentro de N1 e, separadamente, a participação de 40% de N1 na média semestral; os pesos anuais 1 e 2 não são editáveis.
- Entrada de N1=6 e N2=6 em S1 diretamente nas células, sem avaliações, seguida de N1=7 em S2: a coluna “Falta tirar” mostra 7,4 em N2. Alterar N1 de S2 para 8 muda a necessidade para 6,4 imediatamente.
- O botão circular + abre o bloco correto; nota única e avaliações detalhadas mantêm os dados ao alternar os modos. Peso e tipo em grupo foram editados nesse painel.
- Após recarregar a página, as notas únicas e a necessidade de 7,4 em N2 foram recuperadas corretamente. A revisão atual não registrou erros ou avisos no console; os cartões móveis ficaram dentro do viewport de 390 px.
- Com N1=7 e N2=7,4 em S2, a média 7,2 gera média anual 7 com a recuperação de S1 e a indicação de aprovação garantida. Limpar N2 restaura a necessidade de 7,4.

O caso de atributos externos no `<html>` foi tratado com a exceção de hidratação restrita ao elemento raiz. O navegador de teste não apresentou os atributos da extensão informados pelo usuário; a navegação e a hidratação normais foram verificadas sem erros no console.

As imagens em `preview/desktop.jpg` e `preview/mobile.jpg` mostram **uma conta descartável de avaliação**, com o cenário de teste descrito acima. Não representam notas reais do proprietário. Toda conta nova começa sem notas.

## Limites explícitos

- Supabase Auth, PostgreSQL, renovação externa de sessão, sincronização entre dispositivos e RLS em serviço real **dependem de configuração e não foram validados ao vivo**. O SQL e os adaptadores estão preparados; não foram criadas credenciais fictícias.
- Não houve push, criação de repositório remoto ou publicação. Nenhuma Vercel ou GitHub Pages foi configurada.
- Não há recuperação de senha, conforme instrução do usuário.
- Não houve acesso físico por um celular; a verificação usou viewport móvel no navegador.
- Um ano letivo por planilha; sem histórico de anos independente.
- Os dados locais ficam em arquivo no servidor. A versão de produção com múltiplas instâncias deve usar Supabase.

Reproduza com os comandos e o roteiro do `README.md`.

## Ajuste de leitura e resultado anual

- Conferido na cópia em execução na porta 3000: legenda, exportação e aviso com 14 px; contador e rodapé com 13 px.
- A coluna Final do ano aparece junto à situação; disciplinas com semestre pendente exibem Pendente. No móvel, o resultado aparece na mesma linha da situação.
- Viewport de 390 px: largura do documento de 375 px, sem transbordamento horizontal; console sem erros ou avisos.
- Após este ajuste visual, os 47 testes unitários e a compilação de produção passaram novamente.

## Exportação CSV e Excel

- 50 testes passaram e a compilação de produção passou após a implementação.
- Testes geraram e reabriram um XLSX com duas abas: conferidos números, zero, vazios, média anual com recuperação, meta dinâmica e avaliações preservadas. CSV conferido com BOM, decimal brasileiro, aspas, separadores, quebras de linha e tratamento de nomes que poderiam ser interpretados como fórmulas.
- Na porta 3000, o diálogo e os dois botões foram verificados; os cliques retornaram sem erro visível ou erro no console. A ferramenta do navegador travou ao observar o evento de download, portanto o recebimento final pelo gerenciador de downloads não foi confirmado. Não houve abertura no aplicativo Microsoft Excel.
- A biblioteca ExcelJS é carregada sob demanda no navegador. O override de uuid usa versão corrigida compatível com sua chamada v4; npm install final informou zero vulnerabilidades.

## Preparação para GitHub Pages

- Publicação autorizada pelo usuário. Ainda não houve publicação ou criação de repositório: acesso ao Supabase pendente.
- 52 testes passaram, incluindo igualdade do identificador de username no servidor e navegador. A compilação estática foi gerada com sucesso em `.pages-build/out`, sem rotas API nem proxy.
- O adaptador do navegador usa Supabase Auth e PostgreSQL com RLS; as operações reais e o isolamento online ainda dependem de configuração e teste no projeto Supabase.
- O build local padrão continua disponível. O workflow de Pages está preparado e bloqueia publicação sem as variáveis públicas de Supabase. Capturas de notas pessoais estão excluídas do Git.

## Supabase real configurado

- Organização pessoal Nota Clara, projeto nota-clara no plano Free da conta samuelpimentah.
- Migração 001 executada com sucesso. RLS, políticas por proprietário e trigger de revisão instalados. Confirmação de e-mail desabilitada com autorização explícita no momento da alteração.
- `scripts/verify-supabase.ts`: 12 verificações reais passaram: duas contas com sessão, gravação autenticada, acesso anônimo negado, leitura e alteração cruzadas bloqueadas, tentativa de inserir em nome de outro usuário negada, revisão incrementada, conflito rejeitado, trigger de revisão inválida, logout e recuperação após novo login.
- Duas contas próprias identificadas pelo prefixo qa_online foram criadas somente para QA; suas notas de exemplo não são notas reais do proprietário. Não foi usada chave privilegiada ou senha do banco.
- Repositório samuelpimentah/nota-clara criado e código enviado. GitHub Pages configurado para Actions, com somente URL e chave pública de Supabase nas variáveis do repositório. Capturas e anexos pessoais excluídos do Git.
