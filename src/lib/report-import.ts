import { semesterBounds } from './calculations';
import { setSemesterGrade, type Workspace, type Semester } from './model';
export type PdfItem = { text: string; x: number; y: number; width: number };
export type ImportRow = { id: string; originalName: string; subjectId: string | null; s1: number | null; s2: number | null; page: number };
export type ParsedReport = { rows: ImportRow[]; year: number | null; warnings: string[] };
export type ImportSelection = { rowId: string; subjectId: string; semester: 's1' | 's2' };
const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const aliases: Record<string,string[]> = {
  'Estágio': ['Aulas Práticas Estágio - Tecnologia','Tecnologia'],
  'ESG': ['Biologia 2-ESG-Environment, Social and Governance'],
  'Business Intelligence': ['Estatística 1-Business Intelligence'],
  'Chefia e Liderança': ['Língua Portuguesa 2-Chefia e Liderança'],
  'Modelagem de Dados': ['Matemática 10-Modelagem de Dados'],
  'Inteligência Artificial': ['Matemática 14 - Inteligência Artificial'],
  'Banco de Dados': ['Matemática 9-Banco de Dados'],
};
export function matchSubject(name: string, workspace: Workspace): string | null {
  const key = normalize(name).replace(/\s*-\s*/g,'-');
  const matches = workspace.subjects.filter(subject => [subject.name,...(aliases[subject.name] || [])].some(alias => normalize(alias).replace(/\s*-\s*/g,'-') === key));
  return matches.length === 1 ? matches[0].id : null;
}
const gradeToken = (text: string): number | null | undefined => {
  const value = text.replace(/\s/g,'');
  if (!value || /^[-–—]$/.test(value)) return null;
  if (!/^\d{1,2}([.,]\d{1,4})?$/.test(value)) return undefined;
  const grade = Number(value.replace(',','.'));
  return grade >= 0 && grade <= 10 ? grade : undefined;
};
export function parseReportPages(pages: PdfItem[][], workspace: Workspace): ParsedReport {
  const rows: ImportRow[] = [], warnings: string[] = [];
  let year: number | null = null;
  for (const [pageIndex,items] of pages.entries()) {
    const lines: {y:number; items:PdfItem[]}[] = [];
    for (const item of [...items].filter(item => item.text.trim()).sort((a,b)=>b.y-a.y || a.x-b.x)) {
      let line = lines.find(line=>Math.abs(line.y-item.y)<2);
      if (!line) { line={y:item.y,items:[]}; lines.push(line); }
      line.items.push(item);
    }
    let columns: { center:number; name:string }[] = [], first = -1, second = -1;
    for (const line of lines) {
      line.items.sort((a,b)=>a.x-b.x);
      const text=line.items.map(item=>item.text).join(' '), foundYear=text.match(/ano\s+letivo\s*[: -]?\s*(20\d{2})/i);
      if (foundYear) year=Number(foundYear[1]);
      const labels=line.items.map(item=>normalize(item.text).replace(/\s/g,''));
      const firstIndex=labels.findIndex(label=>/^(1[oº°]?(sem|semestre)|s1)$/.test(label));
      const secondIndex=labels.findIndex(label=>/^(2[oº°]?(sem|semestre)|s2)$/.test(label));
      if (labels.includes('disciplinas') && firstIndex>=0 && secondIndex>=0) {
        columns=line.items.map(item=>({center:item.x+item.width/2,name:item.text})); first=firstIndex;second=secondIndex;continue;
      }
      if (first<1 || second<1) continue;
      const bounds=(index:number) => {
        const center=columns[index].center;
        return { left: index===1 ? center-(columns[index+1].center-center)/2 : (columns[index-1].center+center)/2, right: index+1<columns.length ? (center+columns[index+1].center)/2 : Infinity };
      };
      const s1Bounds=bounds(first),s2Bounds=bounds(second);
      const name=line.items.filter(item=>item.x<s1Bounds.left && item.x+item.width/2<s1Bounds.left).map(item=>item.text).join(' ').trim();
      const inColumn=(range:{left:number;right:number})=>line.items.filter(item=>item.x+item.width/2>=range.left && item.x+item.width/2<range.right).map(item=>item.text).join('');
      const raw1=inColumn(s1Bounds),raw2=inColumn(s2Bounds);
      if (!name || (!raw1 && !raw2)) continue;
      const s1=gradeToken(raw1),s2=gradeToken(raw2);
      if (s1===undefined || s2===undefined) { if (matchSubject(name,workspace)) warnings.push(`Linha de ${name} contém nota inválida e não foi importada.`); continue; }
      rows.push({id:`${pageIndex+1}-${rows.length}`,originalName:name,subjectId:matchSubject(name,workspace),s1,s2,page:pageIndex+1});
    }
  }
  if (!rows.length) throw new Error('Não reconhecemos a tabela de disciplinas, 1º Sem e 2º Sem. Use o PDF original do boletim, com texto selecionável. Nenhuma nota foi alterada.');
  if (rows.length>100) throw new Error('O PDF ultrapassa o limite de 100 disciplinas.');
  if (rows.some(row=>row.subjectId===null)) warnings.push('Algumas matérias precisam ser associadas manualmente. Nenhuma matéria será criada automaticamente.');
  const matched=rows.map(row=>row.subjectId).filter(Boolean);
  if (new Set(matched).size!==matched.length) warnings.push('Existem matérias repetidas. Selecione apenas uma linha por matéria e semestre.');
  return {rows,year,warnings};
}
export function hasSemesterNotes(semester: Semester): boolean {
  return semester.direct!==null || semester.assessments.some(item=>item.grade!==null) || Object.values(semester.blocks || {}).some(block=>block.grade!==null);
}
export function semesterSummary(semester: Semester): string {
  const result=semesterBounds(semester).final;
  return result!==null ? String(result.toNumber()).replace('.',',') : hasSemesterNotes(semester) ? 'Notas parciais cadastradas' : 'Vazio';
}
export function applyReportImport(workspace: Workspace, report: ParsedReport, selections: ImportSelection[]): Workspace {
  const seen = new Set<string>();
  const changes = selections.map(selection=>{
    const row=report.rows.find(row=>row.id===selection.rowId), subject=workspace.subjects.find(subject=>subject.id===selection.subjectId);
    if (!row || !subject || !['s1','s2'].includes(selection.semester)) throw new Error('Revise a associação das matérias antes de importar.');
    const grade=row[selection.semester];
    if (grade===null || !Number.isFinite(grade) || grade<0 || grade>10) throw new Error('Notas vazias ou inválidas não substituem informações existentes.');
    const key=`${subject.id}/${selection.semester}`;
    if (seen.has(key)) throw new Error('Selecione apenas uma nota por matéria e semestre.');
    seen.add(key);
    return {subjectId:subject.id,semester:selection.semester,grade};
  });
  if (!changes.length) return workspace;
  return {...workspace,subjects:workspace.subjects.map(subject=>{
    const selected=changes.filter(change=>change.subjectId===subject.id);
    return selected.reduce((next,change)=>({...next,[change.semester]:setSemesterGrade(next[change.semester],change.grade)}),subject);
  })};
}
