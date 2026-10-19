import { z } from 'zod';

export const gradeSchema = z.number().finite().min(0).max(10).nullable();
const blockSchema = z.object({ mode: z.enum(['direct', 'detailed']), grade: gradeSchema });
export const assessmentSchema = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1).max(100),
  group: z.enum(['N1', 'N2']), type: z.enum(['Individual', 'Em grupo', 'Outro']),
  grade: gradeSchema, weight: z.number().finite().min(0.01).max(1000),
});
export const semesterSchema = z.object({
  mode: z.enum(['direct', 'detailed']), direct: gradeSchema,
  weights: z.object({ N1: z.number().min(0).max(100), N2: z.number().min(0).max(100) }).strict()
    .refine(w => w.N1 + w.N2 > 0, 'Ao menos um peso deve ser maior que zero.'),
  completePlan: z.boolean(), assessments: z.array(assessmentSchema).max(200),
  blocks: z.object({ N1: blockSchema, N2: blockSchema }).optional(),
}).strict().refine(s => new Set(s.assessments.map(a => a.id)).size === s.assessments.length, 'IDs de avaliações repetidos.');
export const subjectSchema = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1).max(120), hidden: z.boolean(),
  s1: semesterSchema, s2: semesterSchema,
});
export const workspaceSchema = z.object({
  version: z.literal(1), year: z.number().int().min(2000).max(2100),
  catalogVersion: z.literal(2).optional(),
  theme: z.enum(['light', 'dark']), subjects: z.array(subjectSchema).max(100),
}).refine(w => new Set(w.subjects.map(s => s.id)).size === w.subjects.length, 'IDs de matérias repetidos.');
export type Assessment = z.infer<typeof assessmentSchema>;
export type Semester = z.infer<typeof semesterSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export const ANNUAL_WEIGHTS = Object.freeze({ s1: 1, s2: 2 });

// Transcrição dos anexos + correção do usuário: manter cursos, remover prefixos.
export const DISCIPLINES = [
  'Estágio', 'ESG', 'Desenvolvimento', 'Desenvolvimento Aplicação Dinâmica',
  'Desenvolvimento de Aplicativo Móvel', 'Desenvolvimento e Operações Ágeis',
  'Engenharia e Qualidade de Software', 'Estatística', 'Business Intelligence',
  'Língua Inglesa', 'Chefia e Liderança', 'Língua Portuguesa e suas Literaturas',
  'Matemática', 'Modelagem de Dados', 'Inteligência Artificial', 'Banco de Dados',
  'Sociologia', 'UX',
];
export function emptySemester(mode: Semester['mode'] = 'detailed'): Semester {
  return { mode, direct: null, weights: { N1: 50, N2: 50 }, completePlan: false, assessments: [], blocks: { N1: { mode: 'direct', grade: null }, N2: { mode: 'direct', grade: null } } };
}
export function newSubject(name: string): Subject {
  return { id: crypto.randomUUID(), name, hidden: false, s1: emptySemester(), s2: emptySemester() };
}
export function emptyWorkspace(): Workspace {
  return { version: 1, catalogVersion: 2, year: 2026, theme: 'light', subjects: DISCIPLINES.map(newSubject) };
}
export function upgradeWorkspace(value: unknown): Workspace {
  const data = workspaceSchema.parse(value);
  if (data.catalogVersion === 2) return data;
  return { ...data, catalogVersion: 2, subjects: data.subjects.map(subject =>
    subject.name === 'Tecnologia' ? { ...subject, name: 'Estágio' } : subject,
  ) };
}
export function blockConfig(semester: Semester, group: 'N1' | 'N2') {
  // Dados antigos continuam usando suas avaliações detalhadas, sem migração destrutiva.
  return semester.blocks?.[group] ?? { mode: 'detailed' as const, grade: null };
}
export function setBlockGrade(semester: Semester, group: 'N1' | 'N2', grade: number | null): Semester {
  const initial = (g: 'N1' | 'N2') => !semester.blocks?.[g] && !semester.assessments.some(item => item.group === g)
    ? { mode: 'direct' as const, grade: null } : { ...blockConfig(semester,g) };
  return { ...semester, mode: 'detailed', blocks: {
    N1: initial('N1'), N2: initial('N2'),
    [group]: { mode: 'direct', grade },
  } };
}
export function setBlockMode(semester: Semester, group: 'N1' | 'N2', mode: 'direct' | 'detailed'): Semester {
  return { ...semester, mode: 'detailed', completePlan: mode === 'detailed' ? false : semester.completePlan,
    blocks: { N1: { ...blockConfig(semester, 'N1') }, N2: { ...blockConfig(semester, 'N2') }, [group]: { ...blockConfig(semester, group), mode } } };
}
