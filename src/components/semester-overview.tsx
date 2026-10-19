'use client';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { fmt, groupMean, semesterBounds } from '@/lib/calculations';
import { ANNUAL_WEIGHTS, type Semester } from '@/lib/model';
import { GradeInput } from './ui';
import { BlockGrade } from './block-grade';

export type SemesterKey = 's1' | 's2';
export function SemesterOverview({ semester, semesterKey, subjectName, onDirectChange, onOpen, onBlockChange }: {
  semester: Semester; semesterKey: SemesterKey; subjectName: string;
  onDirectChange: (grade: number | null) => void; onOpen: (group?: 'N1' | 'N2') => void; onBlockChange: (group: 'N1' | 'N2', grade: number | null) => void;
}) {
  const label = semesterKey === 's1' ? '1º semestre' : '2º semestre';
  const bounds = semesterBounds(semester);
  return <section className="mobile-semester" aria-label={`${label} de ${subjectName}`}>
    <header><strong>{label}</strong><span><LockKeyhole size={10} /> Peso fixo {ANNUAL_WEIGHTS[semesterKey]}</span></header>
    <div className="mobile-semester-grades">{(['N1', 'N2'] as const).map(group => <div className="mobile-block-grade" key={group}>
      <span>{group}</span><BlockGrade semester={semester} semesterKey={semesterKey} group={group} subjectName={subjectName} onChange={grade => onBlockChange(group,grade)} onDetails={() => onOpen(group)} />
      <small>{semester.mode === 'direct' ? 'Média direta' : `${fmt(semester.weights[group] / (semester.weights.N1 + semester.weights.N2) * 100, 0)}% do semestre`}</small>
    </div>)}<div className="mobile-semester-average"><span>FINAL</span>
      {semester.mode === 'direct' ? <GradeInput compact label={`${semesterKey.toUpperCase()} de ${subjectName}`} value={semester.direct} onChange={onDirectChange} /> : <button className="cell-button" onClick={() => onOpen()}>{bounds.final !== null ? fmt(bounds.final) : '—'}</button>}
    </div></div>
    <button className="text-button semester-edit" onClick={() => onOpen()}>Opções do {label} <ArrowRight size={12} /></button>
  </section>;
}
