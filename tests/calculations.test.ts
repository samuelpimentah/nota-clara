import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adjustedFirst, annual, analyze, ceilGrade, groupMean, parseGrade, remainingRequired, requiredSecond, semesterBounds } from '../src/lib/calculations';
import { ANNUAL_WEIGHTS, DISCIPLINES, emptySemester, newSubject, workspaceSchema, emptyWorkspace, upgradeWorkspace, setBlockGrade, setBlockMode, type Assessment, type Semester } from '../src/lib/model';
import Exact from '../src/lib/exact';
const item = (group: 'N1'|'N2', grade: number|null, weight = 1): Assessment => ({ id: crypto.randomUUID(), name: 'Avaliação de teste', group, grade, weight, type: 'Individual' });
const detailed = (items: Assessment[], weights = { N1: 50, N2: 50 }, completePlan = true): Semester => ({ ...emptySemester(), blocks: undefined, assessments: items, weights, completePlan });
const subject = (s1: number|null, s2: Semester) => ({ ...newSubject('Disciplina de teste'), s1: { ...emptySemester('direct'), direct: s1 }, s2 });

test('anexo e correção do usuário produzem 18 disciplinas, preservando os cursos com hífen', () => {
  assert.equal(DISCIPLINES.length, 18); assert.equal(new Set(DISCIPLINES).size, 18);
  for (const name of ['ESG','Estágio','Business Intelligence','Modelagem de Dados','Inteligência Artificial','Banco de Dados','Chefia e Liderança']) assert.ok(DISCIPLINES.includes(name));
  assert.ok(!DISCIPLINES.some(name => /^Matemática \d|^Biologia 2/.test(name)));
});
test('notas iniciais são ausentes e cada usuário recebe novos IDs', () => {
  const a = emptyWorkspace(), b = emptyWorkspace();
  assert.ok(a.subjects.every(s => s.s1.direct === null && !s.s2.assessments.length));
  assert.notEqual(a.subjects[0].id, b.subjects[0].id);
});
test('média anual tem pesos 1 e 2', () => { assert.equal(annual(8, 6.5).toNumber(), 7); });
test('a média recuperada é (S1+S2)/2, não S1+S2/2', () => { assert.equal(adjustedFirst(6, 7.2).toNumber(), 6.6); assert.equal(annual(6,7.2).toNumber(), 7); });
test('média recuperada é limitada a sete', () => { assert.equal(adjustedFirst(6,10).toNumber(), 7); });
test('a recuperação nunca reduz um S1 aprovado', () => { assert.equal(adjustedFirst(8,10).toNumber(), 8); });
test('S2 menor ou igual a S1 mantém S1', () => { assert.equal(adjustedFirst(6,5).toNumber(), 6); assert.equal(adjustedFirst(6,6).toNumber(), 6); });
test('metas de S2 incluem recuperação', () => {
  assert.equal(requiredSecond(6).toNumber(), 7.2); assert.equal(requiredSecond(0).toNumber(), 8.4);
  assert.equal(requiredSecond(7).toNumber(), 7); assert.equal(requiredSecond(10).toNumber(), 5.5);
});
test('metas contínuas satisfazem exatamente a média mínima para todos os S1 em centésimos', () => {
  for (let v = 0; v <= 1000; v++) { const first = new Exact(v).div(100), target = requiredSecond(first); assert.ok(annual(first,target).gte(7)); assert.ok(annual(first,target.minus('0.000001')).lt(7)); }
});
test('média aritmética simples por padrão', () => { assert.equal(groupMean(detailed([item('N1',6),item('N1',8)]),'N1'), 7); });
test('pesos individuais e pesos dos blocos são independentes', () => {
  const s = detailed([item('N1',6,1),item('N1',10,3),item('N2',7)], { N1:30, N2:70 });
  assert.equal(groupMean(s,'N1'),9); assert.equal(semesterBounds(s).final?.toNumber(),7.6);
});
test('pesos de blocos são normalizados, sem exigir soma 100', () => { assert.equal(semesterBounds(detailed([item('N1',4),item('N2',10)],{N1:1,N2:2})).final?.toNumber(), 8); });
test('zero é nota preenchida; ausência é pendência', () => {
  assert.equal(groupMean(detailed([item('N1',0)]),'N1'),0);
  assert.equal(groupMean(detailed([item('N1',null)]),'N1'),null);
  assert.equal(semesterBounds(detailed([item('N1',0),item('N2',null)])).filled,1);
});
test('bloco vazio mantém a média pendente e preserva a contribuição do outro bloco concluído', () => { const b = semesterBounds(detailed([item('N1',10)])); assert.equal(b.final,null); assert.equal(b.exact,false); assert.equal(b.min.toNumber(),5); assert.equal(b.max.toNumber(),10); });
test('plano aberto mantém limites conservadores mesmo com notas altas', () => { const s = subject(10,detailed([item('N1',10),item('N2',10)],undefined,false)); assert.equal(analyze(s).status,'possible'); assert.equal(analyze(s).second.final,null); });
test('aprovação garantida usa zero em todas as pendências cadastradas', () => { const s = subject(10,detailed([item('N1',10),item('N2',10,4),item('N2',null,1)])); assert.equal(analyze(s).status,'guaranteed'); });
test('parcial alta não é aprovação garantida', () => { const s = subject(6,detailed([item('N1',10),item('N2',null)])); assert.equal(analyze(s).status,'possible'); });
test('melhor cenário abaixo de sete é impossível na aprovação direta', () => { const s = subject(0,detailed([item('N1',0),item('N2',null)])); assert.equal(analyze(s).status,'impossible'); assert.ok(remainingRequired(s).grade! > 10); });
test('informações insuficientes geram situação cinza', () => { assert.equal(analyze(subject(null,emptySemester())).status,'unknown'); });
test('limites globais podem demonstrar impossibilidade mesmo com S1 ausente', () => { assert.equal(analyze(subject(null,{...emptySemester('direct'),direct:0})).status,'impossible'); });
test('média 6,999999 é reprovada diretamente, sem arredondamento de decisão', () => { assert.equal(analyze(subject(7,{...emptySemester('direct'),direct:6.999999})).status,'impossible'); });
test('médias periódicas se cancelam exatamente no limite da aprovação', () => {
  // N1 = 20/3, N2 = 22/3 => S2 = 7 exatamente.
  const s = subject(7,detailed([item('N1',6),item('N1',7),item('N1',7),item('N2',7),item('N2',7),item('N2',8)]));
  assert.equal(analyze(s).status,'guaranteed'); assert.equal(analyze(s).final?.toNumber(),7);
});
test('média direta ignora avaliações preservadas, sem contagem duplicada', () => { const s = { ...detailed([item('N1',0),item('N2',0)]), mode:'direct' as const, direct:8 }; assert.equal(semesterBounds(s).final?.toNumber(),8); assert.equal(semesterBounds({...s,mode:'detailed'}).final?.toNumber(),0); });
test('meta nas avaliações de N2 com N1 já preenchido', () => { const r = remainingRequired(subject(6,detailed([item('N1',8),item('N2',null)]))); assert.equal(r.grade,6.4); assert.equal(r.exact,true); });
test('meta restante respeita diferentes pesos dentro dos blocos', () => { const s = subject(7,detailed([item('N1',8),item('N2',6,1),item('N2',null,3)],{N1:30,N2:70})); assert.equal(remainingRequired(s).grade,6.77); });
test('planejamento não confirmado oferece apenas estimativa', () => { assert.equal(remainingRequired(subject(6,detailed([item('N1',8),item('N2',null)],undefined,false))).exact,false); });
test('bloco com peso zero não interfere e suas pendências não impedem conclusão', () => { const s = detailed([item('N1',8),item('N2',null)],{N1:100,N2:0}); assert.equal(semesterBounds(s).final?.toNumber(),8); assert.equal(remainingRequired(subject(7,s)).grade,null); });
test('metas já alcançadas são zero nas avaliações restantes', () => { assert.equal(remainingRequired(subject(10,detailed([item('N1',10),item('N2',10,4),item('N2',null,1)]))).grade,0); });
test('meta fracionária é arredondada para cima, sem erro no centésimo exato', () => { assert.equal(ceilGrade(new Exact(20).div(3)),6.67); assert.equal(ceilGrade(7.2),7.2); assert.equal(ceilGrade(7.200001),7.21); });
test('vírgulas, zero e vazios são tratados explicitamente', () => { assert.equal(parseGrade('7,5'),7.5); assert.equal(parseGrade('0'),0); assert.equal(parseGrade(''),null); assert.equal(parseGrade('  '),null); for (const input of ['11','-1','7,5.2','abc','Infinity']) assert.throws(() => parseGrade(input)); });
test('validação rejeita pesos nulos em conjunto e IDs duplicados', () => { const w = emptyWorkspace(); w.subjects[0].s2.weights = {N1:0,N2:0}; assert.equal(workspaceSchema.safeParse(w).success,false); const b = emptyWorkspace(); b.subjects.push(b.subjects[0]); assert.equal(workspaceSchema.safeParse(b).success,false); });
test('nota zero no S1 também pode ser recuperada, com teto', () => { assert.equal(adjustedFirst(0,10).toNumber(),5); assert.equal(annual(0,8.4).toNumber(),7); });
test('migrar Tecnologia para Estágio preserva IDs, notas, pesos, avaliações e visibilidade', () => {
  const legacy = emptyWorkspace(); delete legacy.catalogVersion;
  legacy.subjects[0].name = 'Tecnologia'; legacy.subjects[0].hidden = true;
  legacy.subjects[0].s1 = detailed([item('N1', 0, 3), item('N2', 8, 2)], {N1:30,N2:70});
  legacy.subjects[0].s2.direct = 7.2;
  const migrated = upgradeWorkspace(legacy);
  assert.equal(migrated.subjects[0].name,'Estágio'); assert.equal(migrated.catalogVersion,2);
  const {name: oldName,...before} = legacy.subjects[0], {name: newName,...after} = migrated.subjects[0];
  assert.deepEqual(after,before); assert.equal(legacy.subjects[0].name,'Tecnologia');
});
test('a migração do catálogo é aplicada uma vez e respeita futuras renomeações', () => {
  const current = emptyWorkspace(); current.subjects[0].name='Tecnologia';
  assert.equal(upgradeWorkspace(current).subjects[0].name,'Tecnologia');
  assert.deepEqual(upgradeWorkspace(upgradeWorkspace(current)),current);
});
test('os pesos anuais são fixos e não existe configuração semestral aceita', () => {
  assert.deepEqual(ANNUAL_WEIGHTS,{s1:1,s2:2}); assert.ok(Object.isFrozen(ANNUAL_WEIGHTS));
  assert.equal(workspaceSchema.safeParse({...emptyWorkspace(),subjects:[{...newSubject('Teste'),s1:{...emptySemester(),annualWeight:4}}]}).success,false);
  const w=emptyWorkspace();
  assert.equal(workspaceSchema.safeParse({...w,subjects:[{...w.subjects[0],s1:{...w.subjects[0].s1,weights:{N1:50,N2:50,S1:3}}}]}).success,false);
});
test('N1 e N2 do primeiro semestre entram na média e na meta, com pesos próprios', () => {
  const s = subject(null,emptySemester()); s.s1 = detailed([item('N1',6),item('N2',8)],{N1:25,N2:75});
  assert.equal(analyze(s).first.final?.toNumber(),7.5); assert.equal(analyze(s).target?.toNumber(),6.75);
  assert.deepEqual(s.s2.weights,{N1:50,N2:50});
});
test('mudar o peso de uma avaliação de N1 altera apenas a média interna desse bloco', () => {
  const s = detailed([item('N1',4,1),item('N1',10,1),item('N2',8,1)],{N1:40,N2:60});
  const changed = {...s,assessments:s.assessments.map((a,i)=>i===0?{...a,weight:3}:a)};
  assert.equal(groupMean(changed,'N1'),5.5); assert.equal(groupMean(changed,'N2'),8);
  assert.deepEqual(changed.weights,{N1:40,N2:60}); assert.equal(semesterBounds(changed).final?.toNumber(),7);
});
test('critérios de N1/N2 de S1 são independentes dos critérios de S2', () => {
  const s = subject(null,detailed([item('N1',10),item('N2',4)],{N1:20,N2:80}));
  s.s1 = detailed([item('N1',10),item('N2',4)],{N1:80,N2:20});
  assert.equal(analyze(s).first.final?.toNumber(),8.8); assert.equal(analyze(s).second.final?.toNumber(),5.2);
  assert.equal(analyze(s).final?.toNumber(),6.4);
});
test('N1 única igual a 7 em S2 recalcula a necessidade de N2 para 7,4, com S1=6', () => {
  const s=subject(6,setBlockGrade(emptySemester(),'N1',7)), r=remainingRequired(s);
  assert.equal(r.grade,7.4); assert.equal(r.scope,'N2'); assert.equal(r.exact,true);
  assert.equal(remainingRequired({...s,s2:setBlockGrade(s.s2,'N1',8)}).grade,6.4);
});
test('notas únicas de N1/N2 fecham a média sem precisar cadastrar avaliações', () => {
  const s=setBlockGrade(setBlockGrade(emptySemester(),'N1',6),'N2',8);
  assert.equal(semesterBounds(s).final?.toNumber(),7); assert.equal(s.assessments.length,0);
  assert.equal(semesterBounds(s).exact,true);
});
test('a necessidade dinâmica respeita pesos de N1/N2 personalizados', () => {
  const s=setBlockGrade(emptySemester(),'N1',7); s.weights={N1:30,N2:70};
  assert.equal(remainingRequired(subject(6,s)).grade,7.29);
});
test('N2 lançada antes de N1 calcula a meta de N1', () => {
  const r=remainingRequired(subject(6,setBlockGrade(emptySemester(),'N2',8)));
  assert.equal(r.scope,'N1'); assert.equal(r.grade,6.4);
});
test('zero na nota única não é confundido com vazio e pode tornar a meta impossível', () => {
  const s=setBlockGrade(emptySemester(),'N1',0);
  assert.equal(groupMean(s,'N1'),0); assert.equal(semesterBounds(s).filled,1);
  assert.ok(remainingRequired(subject(6,s)).grade!>10); assert.equal(analyze(subject(6,s)).status,'impossible');
});
test('alternar nota única e avaliações preserva ambas sem contagem dupla', () => {
  const original=detailed([item('N1',4),item('N1',10),item('N2',8)]);
  const direct=setBlockGrade(original,'N1',9);
  assert.equal(groupMean(direct,'N1'),9); assert.equal(groupMean(direct,'N2'),8);
  const restored=setBlockMode(direct,'N1','detailed');
  assert.equal(groupMean(restored,'N1'),7); assert.deepEqual(restored.assessments,original.assessments);
  assert.equal(restored.blocks?.N1.grade,9);
});
test('uma nota única pode coexistir com avaliações ponderadas no outro bloco', () => {
  const s=setBlockGrade(detailed([item('N2',6),item('N2',null,3)]),'N1',8);
  assert.equal(remainingRequired(subject(6,s)).grade,6.54); assert.equal(remainingRequired(subject(6,s)).exact,true);
  assert.equal(semesterBounds(s).min.toNumber(),4.75);
});
test('S1 parcial com N2 vazio não inventa uma média completa', () => {
  const s=subject(null,emptySemester()); s.s1=setBlockGrade(emptySemester(),'N1',7);
  assert.equal(analyze(s).first.final,null); assert.equal(remainingRequired(s).grade,null);
});
test('entrada rápida em uma planilha antiga vazia adota notas únicas sem exigir avaliações futuras', () => {
  const legacy={...emptySemester(),blocks:undefined};
  const s=setBlockGrade(legacy,'N1',7);
  assert.equal(s.blocks?.N2.mode,'direct'); assert.equal(remainingRequired(subject(6,s)).exact,true);
  assert.equal(remainingRequired(subject(6,s)).grade,7.4);
});
