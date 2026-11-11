# Revisão de cálculos e orientação de uso

Data: 11/11/2026. Revisão local concluída e publicação autorizada pelo proprietário.

A verificação de manutenção descrita abaixo pertence à etapa anterior à autorização. Para esta publicação, a página inicial voltou ao Dashboard e os avisos de ambiente local foram removidos. A flag de prévia local não é mais necessária.

## Regras conferidas

As fórmulas seguem o documento da escola anexado à conversa e a regra informada para S1 abaixo de 7. S2 é a média do segundo semestre, não uma prova de recuperação final.

- Avaliação dentro do bloco: soma(nota × peso) / soma dos pesos daquele bloco.
- Semestre: (N1 × peso N1 + N2 × peso N2) / soma dos pesos de N1 e N2.
- Média direta do semestre substitui N1/N2 no cálculo, sem apagar as avaliações.
- Se S1 < 7 e S2 > S1: S1 ajustado = min(7, (S1 + S2) / 2). Caso contrário, S1 não muda.
- Média anual: (S1 ajustado + 2 × S2) / 3. Aprovação direta a partir de 7.
- Meta pessoal de 7 a 10 altera somente o alvo, não a regra de aprovação.
- Não há regra oficial de arredondamento no anexo. A decisão usa frações exatas; a recomendação sobe para o próximo centésimo.
- Zero é nota preenchida; null é pendência. Sem planejamento completo dos blocos detalhados, a meta é identificada como estimativa e os limites permanecem conservadores.

Para uma meta T ≥ 7, quando S1 < 7, o alvo de S2 é:

```
max((3 × T - 7) / 2, (6 × T - S1) / 5)
```

Isso decorre de exigir que ambas as expressões, (7 + 2 × S2) / 3 e (S1 + 5 × S2) / 6, alcancem T. Se S1 ≥ 7, não há ajuste: alvo = (3 × T - S1) / 2. A rotina desconta a contribuição ponderada das notas já preenchidas e divide pela participação das pendências para calcular a média necessária nelas.

## Problemas reproduzidos e corrigidos

| Caso | Antes | Depois |
|---|---|---|
| S1 = 7; N1 = N2 = 7; pesos N1 = 0,1 e N2 = 0,2 | Média 6,999999999999999 e status Fora do alcance | Média exata 7 e status Garantida |
| S1 = 7; N2 = 8; N1 detalhada com prova 2 e outra pendente, pesos iguais | Necessidade 10 rotulada como N1 inteira | Necessidade 10 nas pendências de N1; a média total de N1 será 6 |

A primeira falha veio da soma dos pesos feita como Number em dois denominadores. Agora os denominadores também usam frações exatas. A segunda falha era de interpretação do escopo; o valor necessário para a prova estava correto, mas o rótulo confundia prova pendente com média completa do bloco.

## Exemplos de conferência

| Dados | Resultado |
|---|---|
| S1 = 6; S2 = 7,2 | S1 ajustado = 6,6; anual = 7 |
| S1 = 5,5; S2 = 8,875 | S1 ajustado limitado a 7; anual = 8,25 |
| S1 = 0 | Necessidade de S2 = 8,4 para anual 7 |
| S1 = 8 | Necessidade de S2 = 6,5 para anual 7 |
| S1 = 6; N1 de S2 = 7; N1/N2 iguais | Necessidade em N2 = 7,4 |
| Prova 6 peso 1; trabalho 10 peso 3 | N1 = 9 |
| N1 = 9, N2 = 7; pesos 30 e 70 | Semestre = 7,6 |
| S1 = 6; meta pessoal 8 | Necessidade de S2 = 8,5; aprovação escolar continua em 7 |

## Verificação executada

- `npm run typecheck`: aprovado.
- `npm test`: 78 testes aprovados, zero falhas ou testes ignorados.
- A auditoria nova inclui 10.201 pares de semestres comparados com um oráculo independente em inteiros; 707 alvos mínimos em centésimos; 108 cenários independentes com pesos decimais aninhados, metas pessoais e limites das pendências; testes de média ponderada, arredondamento e escopo da recomendação.
- `npm run test:integration`: 20 verificações HTTP aprovadas no provedor local, com contas descartáveis e dados isolados.
- Build estático do Pages aprovado. A manutenção permanece na página inicial; a flag de revisão local não permite abrir o Dashboard no build estático.
- Navegador desktop: entrada sem login, aviso de responsabilidade, média dinâmica, pesos com vírgula, rejeição de pesos ambos zero, preservação de notas ao alternar modos, tutorial e carregamento das quatro imagens.
- Navegador a 390 × 844: formulários, aviso de entrada, regras e cartões de notas. Largura do documento igual à largura útil, sem transbordamento horizontal.
- Rascunho recuperado após recarregar e escolher Usar sem login. O hash do banco local de teste permaneceu igual antes/depois da edição do rascunho.
- Os testes existentes continuam verificando preservação de IDs, notas, pesos e preferências; importação/exportação de PDF; separação entre contas e ausência de sobrescrita por revisões antigas.

Esses resultados cobrem o motor implementado e os cenários descritos. Não representam homologação pela escola nem teste das políticas de acesso do Supabase em produção. Recuperação final não faz parte da classificação de aprovação direta.

## Rascunho sem login

Chave exclusiva `nota-clara.guest-draft.v1`, separada de autenticação e dados da conta. Guarda apenas a planilha provisória. Não faz PUT no servidor ou no Supabase; entrar na conta não copia o rascunho automaticamente.

A leitura não renova a expiração. Uma edição válida renova o prazo de 24 horas. O rascunho expirado ou inválido é descartado ao tentar recuperá-lo. Limpar o navegador pode removê-lo antes disso. Quem usa o mesmo navegador pode ver o rascunho. Se o armazenamento for bloqueado ou ficar sem espaço, a interface informa que as alterações existem apenas na aba e oferece exportação.

O botão Limpar rascunho pede confirmação e remove somente essa chave. Notas da conta, sessão e banco de dados não são apagados. Nenhuma migração de dados ou alteração de schema de contas foi adicionada.

## Executar a revisão local

```powershell
npm ci
$env:NOTA_CLARA_PREVIEW = 'true'
npm run dev -- --port 3002
```

Abra http://127.0.0.1:3002. O build para Pages força `NEXT_PUBLIC_STATIC_HOST=true`; a prévia local não altera a página de manutenção publicada.

Para repetir a integração, use um diretório de dados descartável no servidor e no processo de teste, sem credenciais de Supabase:

```powershell
$env:LOCAL_DATA_DIR = Join-Path (Get-Location) '.local-data/revisao'
$env:NOTA_CLARA_PREVIEW = 'true'
npm run dev -- --port 3002
```

Em outro terminal na mesma pasta:

```powershell
$env:LOCAL_DATA_DIR = Join-Path (Get-Location) '.local-data/revisao'
$env:TEST_BASE_URL = 'http://127.0.0.1:3002'
npm run test:integration
```

## Capturas do tutorial

`public/guide/pesos-1.png` até `pesos-4.png` são capturas reais da interface local, realizadas com um rascunho de exemplo. O tutorial explica que não são notas de usuários reais. Elas mostram o +, os pesos de N1/N2, os pesos das avaliações e a confirmação do planejamento.

As capturas de conferência em `docs/preview/` ficam somente na cópia local e são ignoradas pelo Git.
