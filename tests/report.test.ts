import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyWorkspace, emptySemester, newSubject, setBlockGrade, setSemesterGrade, preservePreferences, workspaceSchema } from '../src/lib/model';
import { annual, analyze, requiredSecond, remainingRequired } from '../src/lib/calculations';
import { parseReportPages, applyReportImport, matchSubject, type PdfItem } from '../src/lib/report-import';
import { createReportPdf } from '../src/lib/pdf-report';
function table(rows:{name:string;first:string;second:string}[]): PdfItem[] {
  const headers=['Disciplinas','1ºSem','Faltas','2ºSem','Faltas','MA','RF','MF','% Freq','Situação'];
  const centers=[80,280,318,356,394,424,448,470,506,556];
  const items:PdfItem[]=headers.map((text,index)=>({text,x:centers[index]-10,y:700,width:20}));
  items.push({text:'ANO LETIVO: 2026',x:400,y:750,width:110});
  rows.forEach((row,index)=>[row.name,row.first,'0',row.second,'0','8.5','0','0','100.00%','-'].forEach((text,column)=>items.push({text,x:column===0?20:centers[column]-5,y:680-index*16,width:column===0?170:10})));
  return items;
}
test('planilha anterior permanece idêntica ao validar sem preferências novas',()=>{
  const old=emptyWorkspace(),before=structuredClone(old); assert.deepEqual(workspaceSchema.parse(old),before); assert.equal(old.personalGoal,undefined); assert.equal(old.onboardingSeen,undefined);
});
test('média direta e retorno a N1/N2 preservam notas, avaliações e pesos',()=>{
  const semester=setBlockGrade(setBlockGrade(emptySemester(),'N1',6),'N2',8); semester.weights={N1:40,N2:60};
  semester.assessments.push({id:crypto.randomUUID(),name:'Prova preservada',grade:5,group:'N1',type:'Individual',weight:3});
  const before=structuredClone(semester),direct=setSemesterGrade(semester,9),restored=setSemesterGrade(direct,null);
  assert.equal(direct.mode,'direct'); assert.equal(direct.direct,9); assert.deepEqual(direct.blocks,before.blocks); assert.deepEqual(direct.assessments,before.assessments); assert.deepEqual(restored.weights,before.weights); assert.equal(restored.mode,'detailed'); assert.equal(analyze({...newSubject('Teste'),s1:restored}).first.final?.toNumber(),7.2); assert.deepEqual(semester,before);
});
test('meta pessoal respeita recuperação limitada a sete e não muda situação escolar',()=>{
  assert.equal(requiredSecond(6,8).toNumber(),8.5); assert.equal(requiredSecond(9,8).toNumber(),7.5); assert.equal(annual(6,8.5).toNumber(),8);
  const subject=newSubject('Teste');subject.s1=setSemesterGrade(subject.s1,6);subject.s2=setBlockGrade(subject.s2,'N1',7);
  assert.equal(remainingRequired(subject,7).grade,7.4);assert.equal(remainingRequired(subject,8).grade,10);assert.equal(analyze(subject).status,'possible');assert.ok(requiredSecond(6,10).toNumber()>10);
  assert.throws(()=>requiredSecond(6,6));assert.throws(()=>requiredSecond(6,11));
});
test('metas variadas invertem exatamente a média anual em ambas as faixas de recuperação',()=>{
  for(const first of [0,3,5.5,6,6.99,7,9,10])for(const goal of [7,7.1,7.5,8,8.5,9,10]) {
    const needed=requiredSecond(first,goal);assert.equal(annual(first,needed).toNumber(),goal);assert.ok(annual(first,needed.minus('0.000001')).lt(goal));
  }
});
test('preferências não desaparecem quando um cliente antigo as omite',()=>{
  const current={...emptyWorkspace(),personalGoal:8,onboardingSeen:true},legacy=emptyWorkspace();legacy.subjects=current.subjects;
  const preserved=preservePreferences(current,legacy);assert.equal(preserved.personalGoal,8);assert.equal(preserved.onboardingSeen,true);
  assert.equal(preservePreferences(current,{...legacy,personalGoal:7}).personalGoal,7);
});
test('leitura usa as colunas dos semestres e ignora faltas, frequência e médias externas',()=>{
  const workspace=emptyWorkspace(),report=parseReportPages([table([{name:'Matemática',first:'5.50',second:'-'},{name:'Estatística 1-Business Intelligence',first:'8.75',second:'0'}])],workspace);
  assert.equal(report.rows.length,2);assert.equal(report.year,2026);assert.equal(report.rows[0].s1,5.5);assert.equal(report.rows[0].s2,null);assert.equal(report.rows[1].s2,0);assert.equal(report.rows[1].subjectId,workspace.subjects.find(s=>s.name==='Business Intelligence')!.id);
});
test('aliases do boletim não descartam disciplinas com prefixos',()=>{
  const workspace=emptyWorkspace(); for(const name of ['Biologia 2-ESG-Environment, Social and Governance','Matemática 14 - Inteligência Artificial','Língua Portuguesa 2-Chefia e Liderança','Aulas Práticas Estágio - Tecnologia'])assert.ok(matchSubject(name,workspace));
  assert.equal(matchSubject('Matéria desconhecida',workspace),null);
});
test('importação somente aplica seleções e preserva todo o restante da planilha',()=>{
  const workspace={...emptyWorkspace(),personalGoal:8,onboardingSeen:true};const subject=workspace.subjects[0];subject.hidden=true;subject.s1=setBlockGrade(subject.s1,'N1',7);subject.s1.weights={N1:30,N2:70};const before=structuredClone(workspace);
  const report=parseReportPages([table([{name:'Aulas Práticas Estágio - Tecnologia',first:'9.00',second:'-'}])],workspace);
  assert.equal(applyReportImport(workspace,report,[]),workspace);
  const next=applyReportImport(workspace,report,[{rowId:report.rows[0].id,subjectId:subject.id,semester:'s1'}]);
  assert.equal(next.subjects[0].s1.direct,9);assert.equal(next.subjects[0].s1.mode,'direct');assert.deepEqual(next.subjects[0].s1.blocks,before.subjects[0].s1.blocks);assert.deepEqual(next.subjects[0].s1.weights,before.subjects[0].s1.weights);assert.deepEqual(next.subjects[0].s2,before.subjects[0].s2);assert.deepEqual(next.subjects.slice(1),before.subjects.slice(1));assert.equal(next.personalGoal,8);assert.equal(next.year,before.year);assert.equal(next.subjects[0].id,subject.id);assert.equal(next.subjects[0].hidden,true);assert.deepEqual(workspace,before);
});
test('PDF vazio, sem tabela ou com nota fora de escala não modifica a planilha',()=>{
  const workspace=emptyWorkspace(),before=structuredClone(workspace);assert.throws(()=>parseReportPages([[]],workspace));assert.throws(()=>parseReportPages([table([{name:'Matemática',first:'11',second:'-'}])],workspace));assert.deepEqual(workspace,before);
});
test('seleções duplicadas ou notas vazias são rejeitadas antes de aplicar qualquer mudança',()=>{
  const workspace=emptyWorkspace(),report=parseReportPages([table([{name:'Matemática',first:'6',second:'-'}])],workspace),selection={rowId:report.rows[0].id,subjectId:report.rows[0].subjectId!,semester:'s1' as const};
  assert.throws(()=>applyReportImport(workspace,report,[selection,selection]));assert.throws(()=>applyReportImport(workspace,report,[{...selection,semester:'s2'}]));
});
test('PDF gerado é identificado como estimativa, sem frequência, e conserva notas ausentes',async()=>{
  const workspace=emptyWorkspace();workspace.subjects=workspace.subjects.slice(0,1);workspace.subjects[0].s1=setSemesterGrade(workspace.subjects[0].s1,6);workspace.subjects[0].s2=setBlockGrade(workspace.subjects[0].s2,'N1',7);
  const bytes=createReportPdf(workspace,'Conta de teste',new Date(2026,9,20));assert.ok(Buffer.from(bytes).subarray(0,5).toString().startsWith('%PDF'));
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:bytes,standardFontDataUrl:process.cwd().replace(/\\/g,'/')+'/node_modules/pdfjs-dist/standard_fonts/'});try{const pdf=await task.promise;const text=(await (await pdf.getPage(1)).getTextContent()).items.filter(x=>'str' in x).map(x=>x.str).join(' ');assert.ok(text.includes('Estimativa de situação atual do boletim'));assert.ok(text.includes('Documento não oficial'));assert.ok(text.includes('7,4'));assert.ok(!/frequ[eê]ncia|faltas|% Freq/i.test(text));assert.ok(text.includes('MA'));}finally{await task.destroy();}
});
