'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Calculator, Check, ChevronRight, Info, LockKeyhole, Plus, Trash2 } from 'lucide-react';
import { analyze, ceilGrade, fmt, groupMean, remainingLabel, remainingRequired, requiredSecond } from '@/lib/calculations';
import { ANNUAL_WEIGHTS, blockConfig, setBlockGrade, setBlockMode, type Assessment, type Semester, type Subject } from '@/lib/model';
import type { SemesterKey } from './semester-overview';
import { GradeInput, Modal, StatusBadge } from './ui';

export function SubjectPanel({ subject, onChange, onClose, saveLabel, saveError, onRetry, initialSemester = 's2', initialGroup = 'N1', goal = 7 }: {
  subject: Subject; onChange: (s: Subject) => void; onClose: () => void; saveLabel: string; saveError: string; onRetry: () => void;
  goal?: number; initialSemester?: SemesterKey; initialGroup?: 'N1' | 'N2';
}) {
  const [tab, setTab] = useState<SemesterKey>(initialSemester);
  const [group, setGroup] = useState<'N1' | 'N2'>(initialGroup);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const s = subject[tab], a = analyze(subject), remaining = remainingRequired(subject,goal);
  const config = blockConfig(s, group), semesterName = tab === 's1' ? '1º semestre' : '2º semestre';
  const items = s.assessments.filter(item => item.group === group);
  const requiresPlan = (['N1','N2'] as const).some(g => s.weights[g] > 0 && blockConfig(s,g).mode === 'detailed');
  function replace(next: Semester) { onChange({ ...subject, [tab]: next }); }
  function update(patch: Partial<Semester>) { replace({ ...s, ...patch }); }
  function changeAssessment(id: string, patch: Partial<Assessment>) {
    let next = { ...s, assessments: s.assessments.map(item => item.id === id ? { ...item, ...patch } : item) };
    if (patch.group && patch.group !== group) next = setBlockMode(next, patch.group, 'detailed');
    replace(next);
  }
  function addAssessment() {
    const next = setBlockMode(s, group, 'detailed');
    replace({ ...next, assessments: [...next.assessments, { id: crypto.randomUUID(), name: `Avaliação ${next.assessments.length + 1}`, group, grade: null, type: 'Individual', weight: 1 }] });
  }
  function move(index: number, direction: number) {
    const source = s.assessments.findIndex(item => item.id === items[index].id), target = s.assessments.findIndex(item => item.id === items[index + direction].id);
    const reordered = [...s.assessments]; [reordered[source], reordered[target]] = [reordered[target], reordered[source]];
    update({ assessments: reordered });
  }
  return <Modal title="Notas e avaliações" onClose={onClose} wide>
    <div className="subject-panel-title"><input aria-label="Nome da matéria" defaultValue={subject.name} maxLength={120} onBlur={e => { if (e.target.value.trim()) onChange({ ...subject, name: e.target.value.trim() }); else e.target.value = subject.name; }} /><StatusBadge status={a.status} /></div>
    <div className="target-card"><span className="small-icon"><Calculator size={21} /></span><div><span>{goal===7?'Falta para a aprovação direta':`Falta para sua meta pessoal de ${fmt(goal)}`}</span><strong>{remaining.grade === null ? a.min.gte(goal) ? 'Meta atingida' : remaining.scope === 'done' ? 'Meta pessoal não atingida' : remainingLabel(remaining.scope) : `${fmt(remaining.grade)} · ${remainingLabel(remaining.scope)}`}</strong></div></div>
    <div className="semester-tabs">{(['s1','s2'] as const).map(key => <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setConfirmDelete(null); }}>{key === 's1' ? '1º semestre' : '2º semestre'} <small>Peso anual fixo {ANNUAL_WEIGHTS[key]}</small></button>)}</div>
    <div className="panel-section">
      <p className="fixed-annual-note"><LockKeyhole size={14} /><span>Pesos anuais fixos: S1 = 1 e S2 = 2. Os pesos editáveis pertencem a N1, N2 e às avaliações dentro de cada bloco.</span></p>
      <div className="segmented semester-entry-mode"><button className={s.mode === 'detailed' ? 'selected' : ''} onClick={() => update({ mode: 'detailed' })}>Notas N1 e N2</button><button className={s.mode === 'direct' ? 'selected' : ''} onClick={() => update({ mode: 'direct' })}>Média final do semestre</button></div>
      {s.mode === 'direct' ? <div className="direct-grade"><label>Média final do {semesterName}<GradeInput label={`Média direta de ${tab.toUpperCase()}`} value={s.direct} onChange={value => update({ direct: value })} /></label><p>Somente esta média entra no cálculo. As notas N1/N2 e avaliações ficam guardadas.</p></div> : <>
        <div className="block-tabs" aria-label={`Blocos do ${semesterName}`}>{(['N1','N2'] as const).map(g => <button key={g} className={group === g ? 'active' : ''} onClick={() => { setGroup(g); setConfirmDelete(null); }}><span>{g}<small>{fmt(s.weights[g] / (s.weights.N1 + s.weights.N2) * 100,0)}% do semestre</small></span><strong>{fmt(groupMean(s,g))}</strong></button>)}</div>
        <section className="block-editor" aria-label={`${group} do ${semesterName}`}>
          <h3>{group} do {semesterName}</h3>
          <div className="segmented"><button className={config.mode === 'direct' ? 'selected' : ''} onClick={() => { if(config.mode !== 'direct') replace(setBlockMode(s, group, 'direct')); }}>Nota única de {group}</button><button className={config.mode === 'detailed' ? 'selected' : ''} onClick={() => { if(config.mode !== 'detailed') replace(setBlockMode(s, group, 'detailed')); }}>Avaliações de {group}</button></div>
          {config.mode === 'direct' ? <div className="single-block-grade"><label>Nota de {group}<GradeInput label={`Nota única de ${group}`} value={config.grade} onChange={grade => replace(setBlockGrade(s,group,grade))} /></label><p>Informe a média completa de {group}. Não precisa cadastrar provas nem atividades. Para detalhar, escolha “Avaliações de {group}”.</p></div> : <>
            <div className="section-label assessments-heading"><h3>Avaliações de {group} <span className="count">{items.length}</span></h3><button className="text-button" onClick={addAssessment}><Plus size={16} /> Adicionar avaliação</button></div>
            {!items.length && <div className="assessment-empty"><strong>Detalhe as notas de {group}.</strong><p>O peso de cada avaliação vale somente dentro deste bloco.</p><button className="button secondary" onClick={addAssessment}><Plus size={16} /> Primeira avaliação de {group}</button></div>}
            <div className="assessment-list">{items.map((item,index) => <div className="assessment" key={item.id}>
              <div className="assessment-name"><span className="assessment-number">{index + 1}</span><input aria-label={`Nome da avaliação ${index + 1} de ${group}`} defaultValue={item.name} maxLength={100} onBlur={e => { if (e.target.value.trim()) changeAssessment(item.id,{name:e.target.value.trim()}); else e.target.value=item.name; }} /><div className="reorder"><button className="icon-button" disabled={index===0} aria-label={`Mover ${item.name} para cima`} onClick={() => move(index,-1)}><ArrowUp size={15} /></button><button className="icon-button" disabled={index===items.length-1} aria-label={`Mover ${item.name} para baixo`} onClick={() => move(index,1)}><ArrowDown size={15} /></button><button className="icon-button danger" aria-label={`Remover ${item.name}`} onClick={() => setConfirmDelete(item.id)}><Trash2 size={16} /></button></div></div>
              {confirmDelete === item.id ? <div className="delete-confirm">Remover esta avaliação?<button className="text-button danger" onClick={() => { update({assessments:s.assessments.filter(other=>other.id!==item.id),completePlan:false}); setConfirmDelete(null); }}>Remover</button><button className="text-button" onClick={() => setConfirmDelete(null)}>Cancelar</button></div> : <>
                <div className="assessment-fields"><label>Bloco<select aria-label={`Bloco de ${item.name}`} value={item.group} onChange={e=>changeAssessment(item.id,{group:e.target.value as 'N1'|'N2'})}><option>N1</option><option>N2</option></select></label><label>Tipo<select aria-label={`Tipo de ${item.name}`} value={item.type} onChange={e=>changeAssessment(item.id,{type:e.target.value as Assessment['type']})}><option>Individual</option><option>Em grupo</option><option>Outro</option></select></label><label>Peso em {group}<input aria-label={`Peso de ${item.name} dentro de ${group}`} type="number" min="0.01" max="1000" step="0.01" value={item.weight} onChange={e=>{const v=Number(e.target.value);if(v>=.01&&v<=1000)changeAssessment(item.id,{weight:v});}} /></label><label>Nota<GradeInput label={`Nota de ${item.name}`} value={item.grade} onChange={grade=>changeAssessment(item.id,{grade})} /></label></div>
                <p className="assessment-weight-note">Esta avaliação representa <strong>{fmt(item.weight/items.reduce((sum,other)=>sum+other.weight,0)*100)}% de {group}</strong>. {group} continua valendo {fmt(s.weights[group]/(s.weights.N1+s.weights.N2)*100)}% deste semestre.</p>
              </>}
            </div>)}</div>
          </>}
        </section>
        <details className="block-weight-details"><summary>Personalizar os pesos de N1 e N2 <ChevronRight size={16} /></summary><div className="weight-settings"><div><strong>Pesos no {semesterName}</strong><span>Não alteram o peso anual do semestre.</span></div>{(['N1','N2'] as const).map(g=><label key={g}>{g}<input aria-label={`Peso de ${g}`} type="number" min="0" max="100" step="0.1" value={s.weights[g]} onChange={e=>{const v=Number(e.target.value);if(v>=0&&v<=100&&v+s.weights[g==='N1'?'N2':'N1']>0)update({weights:{...s.weights,[g]:v}});}} /><small>{fmt(s.weights[g]/(s.weights.N1+s.weights.N2)*100,0)}%</small></label>)}</div></details>
        {requiresPlan && <label className="plan-check"><input type="checkbox" checked={s.completePlan} onChange={e=>update({completePlan:e.target.checked})} /><span><strong>Cadastrei todas as avaliações dos blocos detalhados</strong><small>Inclua as avaliações futuras com nota vazia. Notas únicas de N1/N2 já são consideradas médias completas.</small></span></label>}
        <p className="hint entry-preservation">Alternar nota única e avaliações preserva os dois conjuntos. Somente o modo selecionado entra na média.</p>
      </>}
    </div>
    <div className="panel-insight"><span className="eyebrow"><Calculator size={14} /> O QUE FALTA PARA SUA META NO 2º SEMESTRE</span><strong>{remaining.grade === null ? remainingLabel(remaining.scope) : remaining.grade>10 ? `${fmt(remaining.grade)} · acima de 10` : `${fmt(remaining.grade)} · ${remainingLabel(remaining.scope)}`}</strong><p>{remaining.message}</p><span className={`precision-tag ${remaining.exact?'':'estimate'}`}>{remaining.exact?<Check size={12}/>:<Info size={12}/>}{remaining.exact?'Conforme as notas e os pesos informados':'Estimativa'}</span></div>
    <details className="formula-details"><summary>Entenda o cálculo <ChevronRight size={16}/></summary><div><p><strong>Média anual:</strong> (S1 ajustado + 2 × S2) ÷ 3, com aprovação escolar em 7,0. Sua meta pessoal atual é {fmt(goal)}.</p><p><strong>Cada bloco:</strong> nota única ou soma(nota × peso) ÷ soma dos pesos das avaliações desse bloco. N1 e N2 são combinados pelos pesos do semestre.</p><p><strong>Média recuperada:</strong> se S1 &lt; 7 e S2 &gt; S1, S1 ajustado = mínimo entre 7 e (S1 + S2) ÷ 2.</p>{a.target!==null&&<p>Média de S2 para aprovação escolar: <strong>{fmt(ceilGrade(a.target))}</strong>. “Falta tirar” desconta o que já foi preenchido.</p>}{goal>7&&a.first.final!==null&&<p>Média de S2 para sua meta pessoal: <strong>{fmt(ceilGrade(requiredSecond(a.first.final,goal)))}</strong>.</p>}{a.adjusted!==null&&a.first.final!==null&&a.adjusted.gt(a.first.final)&&<p className="recovery-note">S1 ajustado de {fmt(a.first.final)} para {fmt(a.adjusted)}.</p>}<p>Faixa anual possível: {fmt(a.min)} a {fmt(a.max)}. A aprovação usa precisão integral; metas são arredondadas para cima.</p></div></details>
    {saveError&&<div className="notice error panel-save-error" role="alert">{saveError} <button className="text-button" onClick={onRetry}>Tentar salvar</button></div>}
    <footer className="panel-footer"><span aria-live="polite"><Info size={14}/>{saveLabel}</span><button className="button primary" onClick={onClose}>Concluir <Check size={16}/></button></footer>
  </Modal>;
}
