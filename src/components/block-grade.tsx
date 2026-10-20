'use client';
import { Plus } from 'lucide-react';
import { analyze, fmt, groupMean, remainingLabel, remainingRequired, semesterBounds } from '@/lib/calculations';
import { blockConfig, type Semester, type Subject } from '@/lib/model';
import { GradeInput } from './ui';
import type { SemesterKey } from './semester-overview';
export function BlockGrade({ semester, semesterKey, group, subjectName, onChange, onDetails }: {
  semester: Semester; semesterKey: SemesterKey; group: 'N1' | 'N2'; subjectName: string;
  onChange: (grade: number | null) => void; onDetails: () => void;
}) {
  const label = `${group} do ${semesterKey === 's1' ? '1º' : '2º'} semestre de ${subjectName}`;
  const detailed = blockConfig(semester, group).mode === 'detailed';
  return <div className="block-grade" title={detailed ? 'Média calculada pelas avaliações. Digitar aqui usa uma nota única; o + preserva o acesso às avaliações.' : 'Digite a nota completa de N1/N2. Use + para cadastrar avaliações e pesos.'}>
    <GradeInput compact label={label} value={groupMean(semester, group)} onChange={onChange} />
    <button className="block-plus" aria-label={`Detalhar ${label}`} title="Avaliações, pesos e tipo de atividade" onClick={onDetails}><Plus size={14} /></button>
  </div>;
}
export function RemainingTarget({ subject, goal = 7 }: { subject: Subject; goal?: number }) {
  const remaining = remainingRequired(subject, goal), a = analyze(subject);
  const done = a.min.gte(goal) && remaining.grade === null;
  const belowGoal = a.final !== null && a.final.lt(goal);
  return <span className={`dynamic-target ${remaining.grade !== null && remaining.grade > 10 ? 'unreachable-target' : ''}`} title={remaining.message}>
    <strong>{remaining.grade !== null ? fmt(remaining.grade) : done ? '✓' : '—'}</strong>
    <small>{done ? 'Meta atingida' : belowGoal ? 'Meta não atingida' : remainingLabel(remaining.scope)}</small>
    {!remaining.exact && remaining.grade !== null && <small className="estimate-label">Estimativa</small>}
  </span>;
}
export function AnnualGrade({ subject }: { subject: Subject }) {
  const { final } = analyze(subject);
  // Keep a value just below the threshold visibly below seven as well.
  const nearThreshold = final !== null && final.lt(7) && final.gte(6.995);
  return <span className="annual-grade" aria-label={`Nota final do ano de ${subject.name}: ${final === null ? 'pendente' : nearThreshold ? 'abaixo de 7' : fmt(final)}`} title={final === null ? 'Disponível quando os dois semestres estiverem concluídos.' : 'Média anual: (S1 ajustado + 2 × S2) ÷ 3. Inclui o ajuste de S1 quando aplicável.'}>
    <strong>{final === null ? '—' : nearThreshold ? '< 7,0' : fmt(final)}</strong>
    {final === null && <small>Pendente</small>}
  </span>;
}

export function SemesterGrade({ semester, semesterKey, subjectName, onChange }: {
  semester: Semester; semesterKey: 's1' | 's2'; subjectName: string; onChange: (grade: number | null) => void;
}) {
  const value = semester.mode === 'direct' ? semester.direct : semesterBounds(semester).final;
  return <span className={`semester-inline-grade ${semester.mode === 'direct' ? 'direct' : ''}`} title="Digite a média final do semestre. N1, N2 e avaliações ficam guardadas. Apague a média direta para voltar a usá-las.">
    <GradeInput compact label={`Média do ${semesterKey === 's1' ? '1º' : '2º'} semestre de ${subjectName}`} value={typeof value === 'number' || value === null ? value : value.toNumber()} onChange={onChange} />
    <small>{semester.mode === 'direct' ? 'Direta' : 'N1/N2'}</small>
  </span>;
}
