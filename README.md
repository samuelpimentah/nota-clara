# Nota Clara

Planilha escolar com metas de aprovação direta, interface em português, modo claro/escuro, contas por **nome de usuário e senha** e salvamento automático.

**Publicado com autorização do proprietário:** [acessar Nota Clara](https://samuelpimentah.github.io/nota-clara/) · [repositório](https://github.com/samuelpimentah/nota-clara). O site usa GitHub Pages para a interface e Supabase para contas e notas. Cadastros online são separados das contas locais; notas locais não são transferidas automaticamente.

## Executar no Windows

Requer Node.js 20.9 ou superior. Desenvolvido e validado com Node.js 24.

```powershell
git clone https://github.com/samuelpimentah/nota-clara.git
cd nota-clara
npm ci
npm run dev
```

Abra **http://127.0.0.1:3000** e escolha **Criar conta**. Não há conta padrão, notas pré-preenchidas nem necessidade de cadastrar e-mail. Usuários têm entre 3 e 30 caracteres: letras sem acento, números, ponto, hífen ou sublinhado. Maiúsculas são normalizadas. Senhas novas têm pelo menos 10 caracteres. Não há recuperação de senha, conforme solicitado.

Para encerrar, use `Ctrl+C` no terminal. Para testar o build local de produção:

```powershell
npm run build
npm start
```

Se a porta 3000 estiver ocupada: `npm run dev -- --port 3001` e abra `http://127.0.0.1:3001`.

## O que funciona localmente

- Cadastro, login, logout e sessão persistente por 30 dias.
- Senhas derivadas com scrypt e sal aleatório; tokens de sessão aleatórios, armazenados no servidor apenas como SHA-256. Cookie HttpOnly e SameSite=Lax; Secure quando servido em HTTPS.
- Notas e preferências salvas em **`.local-data/database.json` no servidor**, sem localStorage. Cada conta tem uma planilha independente. `.local-data` e `.env` são ignorados pelo Git.
- Controle de concorrência por revisão e gravação atômica com trava de arquivo. Alterações conflitantes não sobrescrevem silenciosamente outra aba. A interface permite tentar salvar, exportar uma cópia e recarregar os dados.
- 18 matérias dos anexos, após a correção do usuário sobre prefixos. Matérias podem ser adicionadas, renomeadas e ocultadas; ocultar preserva suas notas.
- Entrada direta de média ou detalhada por avaliações para ambos os semestres. Alternar os modos preserva os valores e usa somente o modo selecionado.
- Entrada rápida de **uma nota completa de N1 ou N2 diretamente na célula**, sem cadastrar avaliações. O botão circular **+** abre o detalhamento daquele bloco e semestre.
- Avaliações com nome, bloco N1/N2, tipo, peso e nota opcional. Inclusão, edição, exclusão com confirmação e reordenação por setas.
- Pesos N1/N2 por matéria e semestre, normalizados proporcionalmente. Padrão 50/50; avaliações começam com peso 1.
- N1, N2 e média final dos dois semestres aparecem separadamente na planilha e nos cartões do celular. Cada coluna abre o semestre correspondente.
- Colunas de média final estreitas, fontes ampliadas e “Falta tirar” dinâmico: a meta mostra o bloco ou as avaliações restantes, considerando as notas já preenchidas.
- Metas, limites possíveis, explicações de fórmulas e indicação de média recuperada. Cálculos imediatos, entrada com vírgula, busca, filtros, exportação PDF do boletim estimado e tema persistente.
- Tabela no computador e cartões editáveis no celular, com painel de detalhes acessível por teclado.

O arquivo local é próprio para avaliação em um computador com uma instância do servidor. Não é a base de produção para múltiplas instâncias. Quem tem acesso administrativo ao sistema de arquivos do computador pode ler os arquivos locais. Não publique esse diretório nem as contas de teste.

## Regras escolares implementadas

O segundo anexo apresenta claramente uma fração: **média recuperada = (S1 + S2) / 2**, com limite 7,0. S2 é o segundo semestre, não uma prova de recuperação. O texto informa a aplicação quando S2 supera S1. No cenário de S1 abaixo de 7, o ajuste melhora a nota; uma nota de S1 já igual ou superior a 7 nunca é reduzida.

```text
Se S1 < 7 e S2 > S1:
  S1 ajustado = min(7, (S1 + S2) / 2)
Caso contrário:
  S1 ajustado = S1

Média anual = (S1 ajustado + 2 × S2) / 3
Aprovação direta: média anual >= 7

Meta S2, com a regra recuperada:
  S1 < 7:  max(7, (42 - S1) / 5)
  S1 >= 7: (21 - S1) / 2
```

Exemplo documentado na aplicação: S1 = 6 e S2 = 7,2 → S1 ajustado = 6,6 → média anual = 7. Sem recuperação de S1, a meta convencional seria 7,5.

O anexo também define `(recuperação final + média anual) / 2 >= 6`. Essa regra é explicada na ajuda, mas o produto calcula a **aprovação direta**, sem misturar recuperação final com média recuperada.

Não existe regra oficial de arredondamento nos anexos. O motor usa frações exatas com BigInt para pesos, médias, limites e decisões, inclusive resultados periódicos. A formatação visual não determina aprovação. A recomendação de nota é arredondada **para cima em centésimos**. As notas podem ser digitadas com até quatro casas decimais; isso não pressupõe regra oficial de arredondamento da escola.

### Avaliações futuras e situações

Por padrão, cada bloco N1/N2 recebe uma **nota única**, considerada sua média completa. Basta digitar; não é necessário criar provas, definir tipos ou confirmar um planejamento. Uma nota vazia continua pendente. O semestre fecha quando os blocos com peso têm suas médias completas.

Para detalhar, clique no **+** ao lado da nota e escolha **Avaliações de N1/N2**. Nos blocos detalhados, cadastre as atividades futuras com nota vazia e marque **Cadastrei todas as avaliações dos blocos detalhados**. Somente esses blocos precisam de planejamento confirmado. É possível usar N1 única e N2 detalhada, ou o contrário. Os pesos das atividades são normalizados apenas dentro do respectivo bloco. Um bloco com peso zero não interfere.

Um bloco detalhado sem planejamento confirmado ou sem avaliações permanece na faixa conservadora 0–10. Os outros blocos já concluídos continuam contribuindo normalmente. A meta é identificada como **estimativa** quando depende de planejamento incompleto. Incluir, excluir ou começar a detalhar avaliações reabre o planejamento.

Com planejamento completo, cada nota pendente assume 0 no pior cenário e 10 no melhor, preservando os pesos de todas as notas já recebidas. A média anual é monotônica em S1 e S2, inclusive com o ajuste, de modo que os extremos semestrais fornecem limites anuais seguros.

| Situação | Critério |
|---|---|
| Garantida | Média anual mínima ≥ 7, mesmo com zero nas pendências |
| Atenção | S1 definido, aprovação possível e ainda não garantida |
| Fora do alcance | Média anual máxima < 7, mesmo com 10 nas pendências |
| Sem definição | Dados insuficientes para concluir |

A meta nas pendências é a média ponderada necessária entre as notas ainda vazias, e não a nota única obrigatória para cada atividade. O aluno pode compensar uma nota menor com outra maior, conforme os pesos.

**Exemplo da meta dinâmica:** com S1=6 e pesos N1/N2 iguais, a meta da média de S2 é 7,2. Ao preencher N1 de S2 com 7, a coluna “Falta tirar” passa a mostrar **7,4 em N2 de S2**. Ao alterar N1 para 8, a necessidade em N2 passa a 6,4. Se N2 já estiver preenchida e N1 estiver vazia, a projeção funciona no sentido inverso. Notas acima de 10 e aprovação garantida são tratadas explicitamente.

Digitar uma nota única em uma célula antes calculada pelas avaliações seleciona o modo de nota única daquele bloco. As avaliações continuam guardadas e podem ser reativadas no **+**. A média final direta do semestre também continua disponível nas opções do semestre e usa somente esse valor.

O campo **Ano letivo** identifica a planilha atual. Alterá-lo não cria nem apaga um histórico anual separado.

Os pesos anuais são **fixos: S1 = 1 e S2 = 2**, sem configuração editável. Os campos de peso no painel são exclusivamente a participação de N1/N2 na média daquele semestre. O peso de uma avaliação é normalizado **dentro de seu próprio bloco**, sem mudar a participação do bloco nem as notas do outro bloco. A tela mostra essas duas porcentagens separadamente.

## Disciplinas

Conforme os anexos e a instrução posterior de manter as disciplinas com hífen e tirar o prefixo:

Estágio; ESG; Desenvolvimento; Desenvolvimento Aplicação Dinâmica; Desenvolvimento de Aplicativo Móvel; Desenvolvimento e Operações Ágeis; Engenharia e Qualidade de Software; Estatística; Business Intelligence; Língua Inglesa; Chefia e Liderança; Língua Portuguesa e suas Literaturas; Matemática; Modelagem de Dados; Inteligência Artificial; Banco de Dados; Sociologia; UX.

O nome inicialmente transcrito como “Tecnologia” passou a **Estágio**, conforme a correção do usuário. Planilhas existentes recebem uma migração única do catálogo, preservando IDs, notas, pesos, avaliações e visibilidade. A revisão de gravação é incrementada para respeitar conflitos entre abas. O formato dos dados permanece na versão 1, com um marcador adicional `catalogVersion: 2`; não é necessária alteração da estrutura do banco.

Não foram acrescentadas História, Geografia ou Física, que eram somente exemplos do pedido.

## Supabase e publicação no GitHub Pages

A integração foi configurada em um projeto Supabase real da conta samuelpimentah. Doze verificações online passaram: cadastro por senha, leitura e gravação, novo login, bloqueio de acesso entre contas, acesso anônimo negado e controle de revisões. A configuração abaixo documenta como preparar outro projeto.

1. Crie ou selecione um projeto Supabase sob sua conta.
2. Em um projeto novo, execute `supabase/migrations/001_workspaces.sql` e depois `002_preserve_preferences.sql` no SQL Editor. Em um projeto existente, execute somente a migração 002; ela não altera linhas existentes. O script cria a tabela, restrições, trigger de revisão e RLS por `auth.uid()`.
3. Em Authentication → Providers → Email, habilite o provedor de senha e **desabilite Confirm email**, pois o aluno entra apenas com usuário/senha.
4. Copie `.env.example` para `.env.local` e preencha a URL do projeto e a **publishable key**, disponível nas configurações de API do projeto. Nenhuma service_role é necessária.
5. Reinicie o servidor. O aviso de ambiente local deixará de aparecer quando a integração estiver configurada.
6. Crie duas contas de teste distintas e valide leitura e escrita isoladas, inclusive diretamente na API REST do Supabase com o token da outra conta. Verifique login, logout, nova sessão e conflito de revisões antes de considerar a integração aprovada.

O Supabase Auth exige um identificador de e-mail ou telefone internamente. Para preservar o cadastro apenas com usuário/senha, o servidor converte o username normalizado em um identificador determinístico `SHA-256(username)@accounts.notaclara.invalid`. Esse endereço reservado é **um identificador técnico sem caixa postal**, não um e-mail solicitado ao aluno. A senha é validada pelo Supabase Auth. Não são usados e-mails reais, confirmação ou recuperação por e-mail. Essa estratégia foi validada no projeto real, com confirmação por e-mail desabilitada por autorização explícita do proprietário.

As contas locais não são transferidas automaticamente para Supabase. Ao ativá-lo, o cadastro passa a pertencer ao provedor externo. Use Exportar boletim PDF para guardar uma estimativa legível. A importação de PDF permite revisar e trazer médias semestrais; não transfere avaliações detalhadas ou contas entre provedores.

O caminho de produção usa Next.js App Router e rotas de servidor. É compatível com uma futura publicação na Vercel; o armazenamento local é bloqueado quando `VERCEL` está definido. O cliente recebe somente URL/chave pública, e o servidor valida a identidade com `auth.getUser()` em cada operação. O banco aplica RLS independentemente do servidor. O proxy renova sessões Supabase conforme o fluxo oficial de SSR.

**GitHub Pages:** a publicação foi autorizada e a adaptação estática está preparada. O comando `npm run build:pages` cria uma cópia de build em `.pages-build`, remove apenas nessa cópia as rotas de servidor e o proxy e gera `.pages-build/out`. No Pages, a autenticação e persistência usam o Supabase diretamente pelo navegador, com RLS. O desenvolvimento local padrão mantém seu servidor e suas contas locais. A publicação foi concluída e validada com Supabase real e o workflow de Pages.

## Estrutura

```text
src/lib/model.ts                  Tipos, validação Zod e lista de matérias
src/lib/exact.ts                  Aritmética racional exata
src/lib/calculations.ts           Motor independente da interface
src/lib/local-store.ts            Persistência e senhas locais
src/lib/server.ts                 Provedor, identidade, origem e tratamento de erros
src/app/api/auth/route.ts         Cadastro, login e logout
src/app/api/workspace/route.ts    Leitura/escrita autenticada com revisão
src/proxy.ts                     Renovação de sessão Supabase
src/components/                  Interface e interações
supabase/migrations/             Estrutura e políticas PostgreSQL
tests/                          Testes do motor e validação
scripts/integration.ts           Teste HTTP com duas contas locais descartáveis
docs/VALIDACAO.md                Evidências e limites da validação
```

CSS próprio com componentes reutilizáveis, Lucide e fontes empacotadas localmente foi usado no lugar de Tailwind/shadcn: mantém a stack pequena e a aplicação funcionando sem carregar fontes de serviços externos.

## Testes

```powershell
npm test
npm run typecheck
npm run build
```

Com o servidor local rodando em outro terminal:

```powershell
npm run test:integration
```

Para outra porta:

```powershell
$env:TEST_BASE_URL = 'http://127.0.0.1:3001'
npm run test:integration
```

O teste HTTP exige o provedor local. Ele cria duas contas com prefixo `qa_`, não imprime senhas/tokens e remove somente as contas que criou. Se você definir `LOCAL_DATA_DIR`, use o mesmo valor nos terminais do servidor e do teste.

Roteiro de avaliação: cadastre sua conta; informe S1; abra uma matéria; adicione avaliações de N1 e N2 com algumas notas vazias; confirme o planejamento; altere os pesos; confira a meta e as fórmulas; alterne média direta/detalhada; feche e recarregue; faça logout/login; confirme que os dados voltam. Abra outra conta e confirme que a planilha está vazia. Teste também ocultar/reativar matérias, reordenar avaliações, tema e visual de celular.

Referências técnicas consultadas: [Next.js App Router](https://nextjs.org/docs/app/getting-started), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [exportação estática](https://nextjs.org/docs/app/guides/static-exports).

## Atributos de extensões e hidratação

O `<html>` usa `suppressHydrationWarning` somente no elemento raiz, para tolerar atributos inseridos por extensões antes da hidratação, como `data-lt-installed`. As verificações do restante da árvore permanecem ativas. Não são adicionados atributos da extensão ao HTML produzido pelo servidor. Referência: [orientação oficial do Next.js](https://nextjs.org/docs/messages/react-hydration-error).

A coluna **Final do ano**, ao lado da situação, mostra a média anual com o ajuste de S1 quando aplicável. Enquanto um semestre não estiver concluído, aparece **Pendente**; notas parciais não são apresentadas como resultado anual fechado.

### Exportação de notas

Em **Exportar minhas notas**, escolha **Baixar CSV** ou **Baixar Excel (.xlsx)**. Ambos incluem todas as matérias, inclusive ocultas, e o resumo com notas, metas, situação e média anual. O CSV usa UTF-8 com BOM, separador ponto e vírgula e vírgula decimal. O Excel possui as abas Notas e Avaliações, com notas numéricas, filtros e cabeçalho fixo. Avaliações preservadas que não participam do cálculo são identificadas. Campos sem nota ficam vazios; zero continua sendo zero. Os resultados são um retrato do momento da exportação, sem recálculo no arquivo nem importação automática. A cópia JSON técnica permanece disponível nas ações de recuperação de falha de salvamento.

## Boletim em PDF e preferências

**Exportar boletim PDF** gera uma tabela A4 intitulada **Estimativa de situação atual do boletim**, sem faltas ou frequência. Inclui médias semestrais, média anual quando concluída, meta restante e situação escolar. É um documento não oficial, com data de emissão e aviso de pendências. Não substitui o boletim da escola.

**Importar PDF** lê localmente PDFs com texto selecionável no formato do boletim anexado: Disciplinas, 1ºSem e 2ºSem. Não inclui OCR para documentos escaneados. Limites: 8 MB e 20 páginas. Antes de salvar, uma prévia permite conferir o vínculo de cada disciplina e selecionar cada média. Notas existentes vêm desmarcadas; traços não viram zero nem apagam dados. Ano divergente exige confirmação. Apenas os semestres selecionados recebem a média direta; pesos, avaliações, nomes, IDs, visibilidade e o restante da planilha permanecem guardados. Não importa frequência, recuperação final ou metadados do aluno.

A célula **Final** de cada semestre aceita edição direta. Apagá-la restaura o cálculo pelas N1/N2 guardadas. Digitar N1/N2 também volta a usar os blocos.

Em **Gerenciar**, a meta pessoal pode ir de 7 a 10, inclusive com vírgula decimal. Isso altera a projeção restante; as situações escolares continuam usando o critério oficial 7. A introdução aparece uma vez por conta e pode ser reaberta pela ajuda.

As novas preferências são opcionais no formato versão 1. Planilhas antigas usam meta 7 até uma alteração explícita; nenhuma nota é inicializada ou substituída ao atualizar. A migração 002 preserva essas preferências quando um cliente antigo as omite em uma gravação posterior.
