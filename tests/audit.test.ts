import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annual, adjustedFirst, analyze, remainingRequired, remainingLabel, semesterBounds, requiredSecond } from '../src/lib/calculations';
import { emptySemester, newSubject, setSemesterGrade, setBlockGrade } from '../src/lib/model';

test('pesos decimais não convertem média 7 em reprovação por ponto flutuante', () => {
  for (const weights of [{N1:0.1,N2:0.2},{N1:0.7,N2:0.1},{N1:33.3,N2:66.6}]) {
    const s = newSubject('Limite'); s.s1 = setSemesterGrade(s.s1,7);
    s.s2 = {...setBlockGrade(setBlockGrade(s.s2,'N1',7),'N2',7),weights};
    assert.equal(semesterBounds(s.s2).final?.toNumber(),7);
    assert.equal(analyze(s).status,'guaranteed'); assert.equal(analyze(s).final?.toNumber(),7);
    s.s2 = setBlockGrade(s.s2,'N2',null); assert.equal(remainingRequired(s).grade,7);
  }
});
test('meta de avaliação restante não é apresentada como média inteira de N1', () => {
  const s=newSubject('Escopo'); s.s1=setSemesterGrade(s.s1,7); s.s2=setBlockGrade(s.s2,'N2',8);
  s.s2.blocks!.N1.mode='detailed'; s.s2.completePlan=true;
  s.s2.assessments=[2,null].map(grade=>({id:crypto.randomUUID(),name:'Prova',group:'N1',type:'Individual',weight:1,grade}));
  const r=remainingRequired(s); assert.equal(r.grade,10); assert.equal(r.scope,'remaining-N1');
  assert.equal(remainingLabel(r.scope),'pendências de N1 de S2');
});
// Oráculo independente em inteiros: S1/S2 em centésimos, anual com denominador 600.
function annual600(first: number, second: number): number {
  const recovered200=first<700 && second>first ? Math.min(1400, first+second) : 2*first;
  return recovered200+4*second;
}
test('auditoria: 10.201 combinações anuais comparadas a oráculo inteiro independente', () => {
  for(let first=0;first<=1000;first+=10) for(let second=0;second<=1000;second+=10) {
    assert.equal(annual(first/100,second/100).gte(7),annual600(first,second)>=4200);
    assert.ok(Math.abs(annual(first/100,second/100).toNumber()-annual600(first,second)/600)<1e-12);
  }
});
test('auditoria: menor meta em centésimos para todos os S1 em décimos e sete metas pessoais', () => {
  for(let first=0;first<=1000;first+=10) for(const goal of [700,710,750,800,850,900,1000]) {
    let needed=0; while(needed<=1200 && annual600(first,needed)<goal*6) needed++;
    // A recomendação pode ultrapassar 10; ela deve permanecer visível como impossível.
    const exact=requiredSecond(first/100,goal/100).ceilHundredths();
    assert.ok(Math.abs(exact-needed/100)<1e-10,`${first}, ${goal}`);
  }
});
test('auditoria: médias ponderadas e metas pendentes preservam o limite em pesos decimais', () => {
  for(const n1 of [0,2,6,7,10]) for(const first of [0,5.5,6,7,10]) for(const weights of [{N1:0.1,N2:0.2},{N1:30,N2:70},{N1:0,N2:2},{N1:2,N2:0}]) {
    const s=newSubject('Pesos'); s.s1=setSemesterGrade(s.s1,first); s.s2={...setBlockGrade(s.s2,'N1',n1),weights};
    const r=remainingRequired(s); if(r.grade===null || r.grade>10)continue;
    const done={...s,s2:setBlockGrade(s.s2,'N2',r.grade)};
    assert.ok(analyze(done).final!.gte(7),JSON.stringify({first,n1,weights,r}));
    if(r.grade>0 && weights.N2>0) assert.ok(analyze({...done,s2:setBlockGrade(done.s2,'N2',r.grade-0.01)}).final!.lt(7));
  }
});
test('exemplos explicativos: S1 não vira 7 automaticamente e recuperada nunca reduz S1', () => {
  assert.equal(adjustedFirst(6,7.2).toNumber(),6.6); assert.equal(adjustedFirst(5.5,10).toNumber(),7);
  assert.equal(adjustedFirst(8,10).toNumber(),8); assert.equal(adjustedFirst(6,5).toNumber(),6);
  assert.equal(annual(5.5,8.875).toNumber(),8.25);
});

test('auditoria independente: 108 cenários com pesos decimais aninhados, metas e limites de pendências', () => {
  for(const first of [0,600,700,1000]) for(const fixedN1 of [0,600,1000]) for(const fixedN2 of [0,800,1000]) for(const goal of [700,800,1000]) {
    // Pesos de blocos 1:2; provas de N1 em 1:3 e de N2 em 2:3:5.
    // S2, em centésimos, tem numerador 5*fixedN1 + 8*fixedN2 + 47*x e denominador 60.
    function reaches(x: number, target: number) {
      const n=5*fixedN1+8*fixedN2+47*x, den=60;
      const recovered=first<700 && n>first*den ? Math.min(1400*den,first*den+n) : 2*first*den;
      return recovered+4*n >= 6*den*target;
    }
    const s=newSubject('Oráculo');s.s1=setSemesterGrade(s.s1,first/100);
    s.s2={...emptySemester(),blocks:undefined,completePlan:true,weights:{N1:0.1,N2:0.2},assessments:[
      {group:'N1' as const,grade:fixedN1/100,weight:0.1}, {group:'N1' as const,grade:null,weight:0.3},
      {group:'N2' as const,grade:fixedN2/100,weight:0.2}, {group:'N2' as const,grade:null,weight:0.3}, {group:'N2' as const,grade:null,weight:0.5},
    ].map(a=>({...a,id:crypto.randomUUID(),name:'Teste',type:'Individual' as const}))};
    let cents=0;while(cents<2000 && !reaches(cents,goal))cents++;
    assert.equal(remainingRequired(s,goal/100).grade,cents/100,JSON.stringify({first,fixedN1,fixedN2,goal}));
    assert.equal(analyze(s).status,reaches(0,700)?'guaranteed':reaches(1000,700)?'possible':'impossible');
  }
});
test('médias de provas com pesos decimais também preservam sete exato', () => {
  const s=newSubject('Blocos');s.s1=setSemesterGrade(s.s1,7);
  s.s2={...emptySemester(),blocks:undefined,completePlan:true,weights:{N1:0.1,N2:0.2},assessments:([
    ['N1',0.1],['N1',0.2],['N2',0.7],['N2',0.1],
  ] as const).map(([group,weight])=>({id:crypto.randomUUID(),name:'Teste',group,weight,grade:7,type:'Individual'}))};
  assert.equal(analyze(s).final?.toNumber(),7); assert.equal(analyze(s).status,'guaranteed');
});
