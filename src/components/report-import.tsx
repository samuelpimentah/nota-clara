'use client';
import { useState } from 'react';
import { FileUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import { fmt } from '@/lib/calculations';
import { applyReportImport, hasSemesterNotes, semesterSummary, type ImportSelection, type ParsedReport } from '@/lib/report-import';
import type { Workspace } from '@/lib/model';
import { Modal } from './ui';
export function ReportImport({workspace,report,onClose,onApply}:{workspace:Workspace;report:ParsedReport;onClose:()=>void;onApply:(change:(current:Workspace)=>Workspace)=>void}) {
  const [mapping,setMapping]=useState<Record<string,string>>(Object.fromEntries(report.rows.map(row=>[row.id,row.subjectId || ''])));
  const [selected,setSelected]=useState<Set<string>>(()=>{
    const values=new Set<string>(),counts=new Map<string,number>();
    report.rows.forEach(row=>{if(row.subjectId)counts.set(row.subjectId,(counts.get(row.subjectId)||0)+1);});
    for(const row of report.rows) {
      const subject=workspace.subjects.find(subject=>subject.id===row.subjectId);
      if(!subject || counts.get(subject.id)!==1)continue;
      for(const semester of ['s1','s2'] as const) if(row[semester]!==null && !hasSemesterNotes(subject[semester])) values.add(`${row.id}/${semester}`);
    }
    return values;
  });
  const [confirmYear,setConfirmYear]=useState(false),[error,setError]=useState('');
  const yearMismatch=report.year!==null && report.year!==workspace.year;
  const selections:ImportSelection[]=report.rows.flatMap(row=>(['s1','s2'] as const).filter(semester=>selected.has(`${row.id}/${semester}`)).map(semester=>({rowId:row.id,subjectId:mapping[row.id],semester})));
  const replacements=selections.filter(selection=>{const subject=workspace.subjects.find(subject=>subject.id===selection.subjectId);return subject && hasSemesterNotes(subject[selection.semester]);}).length;
  function toggle(key:string) {setSelected(current=>{const next=new Set(current);if(next.has(key))next.delete(key);else next.add(key);return next;});setError('');}
  return <Modal title="Revisar importação do boletim" onClose={onClose} wide><div className="report-import">
    <p className="import-intro"><ShieldCheck size={20}/>O PDF é lido neste navegador. Somente as notas que você selecionar abaixo serão salvas na sua conta.</p>
    <div className="notice">Identificamos {report.rows.length} disciplinas{report.year ? ` no ano ${report.year}` : ''}. Campos vazios e traços do PDF nunca apagam notas. Por padrão, notas já cadastradas não são selecionadas.</div>
    {report.warnings.map((warning,index)=><p className="import-warning" key={index}><AlertTriangle size={16}/>{warning}</p>)}
    {yearMismatch && <label className="import-year"><input type="checkbox" checked={confirmYear} onChange={event=>setConfirmYear(event.target.checked)}/><span>O PDF é de {report.year} e esta planilha é de {workspace.year}. Confirmo que quero importar somente as notas; o ano da planilha será mantido.</span></label>}
    <div className="import-rows">{report.rows.map(row=>{
      const subject=workspace.subjects.find(subject=>subject.id===mapping[row.id]);
      return <section className="import-row" key={row.id}><header><strong>{row.originalName}</strong><label>Associar à matéria<select aria-label={`Matéria para ${row.originalName}`} value={mapping[row.id]} onChange={event=>{setMapping({...mapping,[row.id]:event.target.value});setSelected(current=>new Set([...current].filter(key=>!key.startsWith(row.id+'/'))));}}><option value="">Selecione a matéria</option>{workspace.subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}{subject.hidden?' (oculta)':''}</option>)}</select></label></header>
        <div className="import-semesters">{(['s1','s2'] as const).map(semester=>{
          const hasData=subject && hasSemesterNotes(subject[semester]);
          return <label className={`import-grade ${hasData?'conflict':''}`} key={semester}><input type="checkbox" aria-label={`Importar ${semester.toUpperCase()} de ${row.originalName}`} disabled={!subject || row[semester]===null} checked={selected.has(`${row.id}/${semester}`)} onChange={()=>toggle(`${row.id}/${semester}`)}/><span><strong>{semester==='s1'?'1º semestre':'2º semestre'}: {fmt(row[semester])}</strong><small>{row[semester]===null?'Sem nota no PDF; nada será apagado.':hasData?`Atual: ${semesterSummary(subject![semester])}. Marque somente se quiser substituir a média ativa.`:'Campo vazio no aplicativo.'}</small></span></label>;
        })}</div>
      </section>;
    })}</div>
    <p className="hint">Importar a média ativa o modo direto desse semestre. N1, N2, avaliações, pesos, nomes e visibilidade continuam guardados. Não importamos faltas, frequência, MA, recuperação final ou situação: o app calcula sua própria estimativa.</p>
    {replacements>0 && <p className="notice">Você selecionou {replacements} média(s) em semestres que já têm notas. Essas médias ativas serão substituídas; o detalhamento fica preservado.</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
    <footer className="import-footer"><span>{selections.length} nota(s) selecionada(s)</span><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={!selections.length || (yearMismatch && !confirmYear)} onClick={()=>{try{applyReportImport(workspace,report,selections);onApply(current=>applyReportImport(current,report,selections));}catch(error){setError((error as Error).message);}}}><FileUp size={17}/>Aplicar {selections.length} nota(s)</button></footer>
  </div></Modal>;
}
