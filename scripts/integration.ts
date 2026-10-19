import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { transaction } from '../src/lib/local-store';
import type { Workspace } from '../src/lib/model';
import { emptySemester, setBlockGrade } from '../src/lib/model';
import { remainingRequired } from '../src/lib/calculations';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const password = randomBytes(24).toString('hex'), prefix = `qa_${Date.now()}`;
const created: string[] = [];
let passed = 0;
function ok(label: string) { passed++; console.log(`OK ${passed}: ${label}`); }
async function request(path: string, method = 'GET', body?: unknown, cookie?: string, origin = base) {
  const response = await fetch(base + path, { method, headers: { Origin: origin, 'Content-Type':'application/json', ...(cookie ? { Cookie:cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { response, body: await response.json() };
}
try {
  const configuration = await request('/api/auth');
  assert.equal(configuration.body.provider,'local','Use este teste apenas no provedor local, sem Supabase.');
  assert.equal((await request('/api/workspace')).response.status,401); ok('sem sessão, acesso às notas bloqueado');
  assert.equal((await request('/api/auth','POST',{action:'signup',username:prefix+'_a',password},undefined,'https://outro.exemplo')).response.status,403); ok('origem externa bloqueada');
  const a = await request('/api/auth','POST',{action:'signup',username:prefix+'_a',password,name:'Conta de teste A'});
  assert.equal(a.response.status,200);
  const cookieA = a.response.headers.get('set-cookie')!.split(';')[0];
  assert.match(a.response.headers.get('set-cookie')!,/HttpOnly/i); assert.match(a.response.headers.get('set-cookie')!,/SameSite=lax/i);
  const userA = (await request('/api/auth','GET',undefined,cookieA)).body.user; created.push(userA.id); ok('cadastro por usuário/senha e cookie protegido');
  const b = await request('/api/auth','POST',{action:'signup',username:prefix+'_b',password});
  assert.equal(b.response.status,200); const cookieB = b.response.headers.get('set-cookie')!.split(';')[0];
  const userB = (await request('/api/auth','GET',undefined,cookieB)).body.user; created.push(userB.id);
  assert.equal(userB.name,prefix+'_b'); assert.ok(!('email' in userB));
  const dataA = (await request('/api/workspace','GET',undefined,cookieA)).body as {data:Workspace;revision:number};
  const dataB = (await request('/api/workspace','GET',undefined,cookieB)).body;
  assert.equal(dataA.data.subjects.length,18); assert.ok(dataA.data.subjects.every(s => s.s1.direct === null)); ok('planilha inicia com 18 disciplinas, sem notas fictícias');
  dataA.data.subjects[0].s1.direct = 6;
  dataA.data.subjects[0].s1.mode = 'direct';
  const saved = await request('/api/workspace','PUT',dataA,cookieA); assert.equal(saved.response.status,200); ok('notas salvas no servidor');
  const separate = await request(`/api/workspace?user_id=${userA.id}`,'GET',undefined,cookieB);
  assert.equal(separate.body.data.subjects[0].s1.direct,null); assert.notEqual(separate.body.data.subjects[0].id,dataA.data.subjects[0].id); ok('outra conta não lê os dados, mesmo com ID na URL');
  assert.equal((await request('/api/workspace','PUT',{...dataB,user_id:userA.id},cookieB)).response.status,400); ok('tentativa de escolher proprietário no corpo é rejeitada');
  assert.equal((await request('/api/workspace','PUT',dataA,cookieA)).response.status,409); ok('revisão antiga não sobrescreve alterações recentes');
  const current = (await request('/api/workspace','GET',undefined,cookieA)).body;
  current.data.subjects[0].s1.direct=11;
  assert.equal((await request('/api/workspace','PUT',current,cookieA)).response.status,400); ok('nota fora da escala é rejeitada no servidor');
  const wrongAnnualWeight = structuredClone(current);
  wrongAnnualWeight.data.subjects[0].s1.direct = 6;
  wrongAnnualWeight.data.subjects[0].s1.annualWeight = 5;
  assert.equal((await request('/api/workspace','PUT',wrongAnnualWeight,cookieA)).response.status,400); ok('peso anual personalizado é rejeitado no servidor');
  current.data.subjects[0].s1.direct=null;
  const competing = await Promise.all([request('/api/workspace','PUT',current,cookieA),request('/api/workspace','PUT',current,cookieA)]);
  assert.deepEqual(competing.map(r=>r.response.status).sort(),[200,409]); ok('gravações concorrentes respeitam a revisão');
  const persisted = (await request('/api/workspace','GET',undefined,cookieA)).body;
  assert.equal(persisted.data.subjects[0].s1.direct,null); ok('nota vazia permanece null após persistência');
  await transaction(store=> { const user=store.users.find(u=>u.id===userA.id)!; assert.ok(!user.password.includes(password)); assert.equal(store.workspaces[userA.id].revision,persisted.revision); }); ok('dados persistidos em disco e senha armazenada como hash');
  assert.equal((await request('/api/auth','POST',{action:'logout'},cookieA)).response.status,200);
  assert.equal((await request('/api/workspace','GET',undefined,cookieA)).response.status,401); ok('logout invalida a sessão, inclusive ao reutilizar o cookie');
  assert.equal((await request('/api/auth','POST',{action:'login',username:prefix+'_a',password:'senha-incorreta'})).response.status,401); ok('senha incorreta não autentica');
  const login = await request('/api/auth','POST',{action:'login',username:(prefix+'_a').toUpperCase(),password}); assert.equal(login.response.status,200);
  const logged = login.response.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await request('/api/workspace','GET',undefined,logged)).body.revision,persisted.revision); ok('novo login recupera os dados; usuário ignora maiúsculas');
  const duplicated = await request('/api/auth','POST',{action:'signup',username:prefix+'_a',password}); assert.equal(duplicated.response.status,400); ok('nomes de usuário são únicos');
  await transaction(store => {
    const legacy = store.workspaces[userA.id].data;
    delete legacy.catalogVersion; legacy.subjects[0].name='Tecnologia'; legacy.subjects[0].s1.direct=6.5;
    legacy.subjects[0].s2.assessments=[{id:crypto.randomUUID(),name:'Nota legada',group:'N1',grade:0,weight:3,type:'Individual'}];
  });
  const migrated = (await request('/api/workspace','GET',undefined,logged)).body;
  assert.equal(migrated.data.subjects[0].name,'Estágio'); assert.equal(migrated.data.subjects[0].s1.direct,6.5);
  assert.equal(migrated.data.subjects[0].s2.assessments[0].grade,0); assert.equal(migrated.data.subjects[0].s2.assessments[0].weight,3);
  assert.equal(migrated.revision,persisted.revision+1); ok('Tecnologia é migrada para Estágio, preservando notas e pesos');
  assert.equal((await request('/api/workspace','GET',undefined,logged)).body.revision,migrated.revision); ok('migração do catálogo não se repete em cada acesso');
  migrated.data.subjects[0].s1={...emptySemester('direct'),direct:6};
  migrated.data.subjects[0].s2=setBlockGrade(emptySemester(),'N1',7);
  assert.equal((await request('/api/workspace','PUT',migrated,logged)).response.status,200);
  const quick=(await request('/api/workspace','GET',undefined,logged)).body;
  assert.equal(quick.data.subjects[0].s2.blocks.N1.grade,7);
  assert.equal(remainingRequired(quick.data.subjects[0]).grade,7.4); ok('N1 única é persistida e gera meta dinâmica de N2 após novo acesso');
  console.log(`\n${passed} verificações de integração local passaram.`);
} finally {
  // Exclusivamente as contas descartáveis criadas por esta execução.
  if (created.length) await transaction(store => {
    store.users = store.users.filter(user=>!created.includes(user.id));
    store.sessions = store.sessions.filter(session=>!created.includes(session.userId));
    for (const id of created) delete store.workspaces[id];
  });
}
