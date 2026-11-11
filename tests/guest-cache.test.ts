import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyWorkspace } from '../src/lib/model';
import { clearGuestDraft, GUEST_CACHE_KEY, GUEST_CACHE_TTL, readGuestDraft, writeGuestDraft } from '../src/lib/guest-cache';
const memory=()=> { const data=new Map<string,string>(); return {data,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}}; };
test('rascunho preserva zeros, pendências, pesos e preferências, sem tocar na conta',()=>{
  const storage=memory(),w=emptyWorkspace();w.subjects[0].s1.direct=0;w.subjects[0].s1.weights={N1:0.1,N2:0.2}; w.personalGoal=8;
  storage.setItem('nota-clara.auth','sessão preservada'); const before=structuredClone(w);
  writeGuestDraft(storage,w,100);assert.deepEqual(readGuestDraft(storage,101),w);assert.deepEqual(w,before);
  clearGuestDraft(storage); assert.equal(storage.getItem('nota-clara.auth'),'sessão preservada');assert.equal(readGuestDraft(storage,101),null);
});
test('rascunho expira em 24h e somente uma edição renova o prazo',()=>{
  const s=memory();writeGuestDraft(s,emptyWorkspace(),100);assert.ok(readGuestDraft(s,100+GUEST_CACHE_TTL-1));
  assert.equal(readGuestDraft(s,100+GUEST_CACHE_TTL),null);assert.equal(s.getItem(GUEST_CACHE_KEY),null);
});
test('cache inválido ou versão desconhecida nunca chega à planilha',()=>{
  const s=memory();for(const raw of ['{',JSON.stringify({version:2,expiresAt:200,data:emptyWorkspace()}),JSON.stringify({version:1,expiresAt:200,data:{}})]) {s.setItem(GUEST_CACHE_KEY,raw);assert.equal(readGuestDraft(s,100),null);}
});
test('falha de armazenamento é explícita e não apaga o rascunho válido',()=>{
  const s=memory();writeGuestDraft(s,emptyWorkspace(),100);const before=s.getItem(GUEST_CACHE_KEY);
  assert.throws(()=>writeGuestDraft({...s,setItem:()=>{throw new Error('Quota');}},emptyWorkspace(),100));assert.equal(s.getItem(GUEST_CACHE_KEY),before);
});
