import Exact, { type ExactValue } from './exact';
import type { Assessment, Semester, Subject } from './model';
import { ANNUAL_WEIGHTS, blockConfig } from './model';
const d = (n: ExactValue) => new Exact(n);
const weighted = (items: Assessment[], fallback: number): Exact => {
  const total = items.reduce((sum, a) => sum.plus(a.weight), d(0));
  return items.length ? items.reduce((sum, a) => sum.plus(d(a.grade ?? fallback).mul(a.weight)), d(0)).div(total) : d(fallback);
};
export function groupMean(semester: Semester, group: 'N1' | 'N2'): number | null {
  const config = blockConfig(semester, group);
  if (config.mode === 'direct') return config.grade;
  const items = semester.assessments.filter(a => a.group === group);
  if (!items.length || items.some(a => a.grade === null)) return null;
  return weighted(items, 0).toNumber();
}
export type Bounds = { min: Exact; max: Exact; final: Exact | null; exact: boolean; filled: number; total: number };
export function groupBounds(s: Semester, group: 'N1' | 'N2'): Bounds {
  const config = blockConfig(s, group);
  if (config.mode === 'direct') return { min: d(config.grade ?? 0), max: d(config.grade ?? 10), final: config.grade === null ? null : d(config.grade), exact: true, filled: config.grade === null ? 0 : 1, total: 1 };
  const items = s.assessments.filter(item => item.group === group), exact = s.completePlan && items.length > 0;
  return { min: exact ? weighted(items, 0) : d(0), max: exact ? weighted(items, 10) : d(10),
    final: exact && items.every(item => item.grade !== null) ? weighted(items, 0) : null,
    exact, filled: items.filter(item => item.grade !== null).length, total: items.length };
}
export function semesterBounds(s: Semester): Bounds {
  if (s.mode === 'direct') return {
    min: d(s.direct ?? 0), max: d(s.direct ?? 10), final: s.direct === null ? null : d(s.direct),
    exact: true, filled: s.direct === null ? 0 : 1, total: 1,
  };
  const active = (['N1','N2'] as const).filter(g => s.weights[g] > 0);
  const groups = { N1: groupBounds(s, 'N1'), N2: groupBounds(s, 'N2') };
  const exact = active.every(g => groups[g].exact);
  const combine = (bound: 'min' | 'max') => active.reduce((sum, g) => sum.plus(groups[g][bound].mul(s.weights[g])), d(0)).div(s.weights.N1 + s.weights.N2);
  return {
    min: combine('min'), max: combine('max'),
    final: exact && active.every(g => groups[g].final !== null) ? combine('min') : null,
    exact, filled: groups.N1.filled + groups.N2.filled, total: groups.N1.total + groups.N2.total,
  };
}
export function adjustedFirst(s1: ExactValue, s2: ExactValue): Exact {
  const first = d(s1), second = d(s2);
  return first.lt(7) && second.gt(first) ? Exact.max(first, Exact.min(7, first.plus(second).div(2))) : first;
}
export function annual(s1: ExactValue, s2: ExactValue): Exact {
  return adjustedFirst(s1, s2).mul(ANNUAL_WEIGHTS.s1).plus(d(s2).mul(ANNUAL_WEIGHTS.s2)).div(ANNUAL_WEIGHTS.s1 + ANNUAL_WEIGHTS.s2);
}
export function requiredSecond(s1: ExactValue, goal = 7): Exact {
  if (!Number.isFinite(goal) || goal < 7 || goal > 10) throw new Error('A meta pessoal deve estar entre 7 e 10.');
  const first = d(s1), target = d(goal);
  return first.lt(7) ? Exact.max(target.mul(3).minus(7).div(2), target.mul(6).minus(first).div(5)) : target.mul(3).minus(first).div(2);
}
// Menor nota em centésimos que satisfaz o alvo; arredondamento só da recomendação.
export function ceilGrade(value: ExactValue): number {
  return d(value).ceilHundredths();
}
export type Status = 'guaranteed' | 'possible' | 'impossible' | 'unknown';
export function analyze(subject: Subject) {
  const first = semesterBounds(subject.s1), second = semesterBounds(subject.s2);
  const min = annual(first.min, second.min), max = annual(first.max, second.max);
  const informative = first.filled > 0 || second.filled > 0;
  const status: Status = !informative ? 'unknown' : min.gte(7) ? 'guaranteed' : max.lt(7) ? 'impossible'
    : first.final === null ? 'unknown' : 'possible';
  return {
    first, second, min, max, status,
    target: first.final === null ? null : requiredSecond(first.final),
    baseTarget: first.final === null ? null : d(21).minus(first.final).div(2),
    final: first.final !== null && second.final !== null ? annual(first.final, second.final) : null,
    adjusted: first.final !== null && second.final !== null ? adjustedFirst(first.final, second.final) : null,
  };
}
export type Remaining = { grade: number | null; exact: boolean; message: string; scope: 'semester' | 'N1' | 'N2' | 'remaining' | 'done' | 'planning' | 'unknown' };
export function remainingRequired(subject: Subject, goal = 7): Remaining {
  const a = analyze(subject), s = subject.s2;
  if (a.target === null) return { grade: null, exact: false, scope: 'unknown', message: 'Conclua ou informe a média de S1 para calcular a meta.' };
  const target = requiredSecond(a.first.final!, goal);
  if (s.mode === 'direct') return s.direct === null ? { grade: ceilGrade(target), exact: true, scope: 'semester', message: 'Meta para a média final do segundo semestre.' }
    : { grade: null, exact: true, scope: 'done', message: 'A média final de S2 já foi informada.' };
  let fixed = d(0), pending = d(0);
  let exact = true, anyFilled = false;
  const pendingGroups: ('N1' | 'N2')[] = [];
  for (const group of ['N1','N2'] as const) {
    if (s.weights[group] === 0) continue;
    const share = d(s.weights[group]).div(s.weights.N1 + s.weights.N2);
    const config = blockConfig(s, group);
    if (config.mode === 'direct') {
      if (config.grade === null) { pending = pending.plus(share); pendingGroups.push(group); }
      else { fixed = fixed.plus(share.mul(config.grade)); anyFilled = true; }
      continue;
    }
    const items = s.assessments.filter(item => item.group === group);
    const total = items.reduce((v, item) => v.plus(item.weight), d(0));
    exact = exact && s.completePlan && items.length > 0;
    if (total.isZero()) { pending = pending.plus(share); pendingGroups.push(group); continue; }
    let groupPending = false;
    for (const item of items) {
      const coefficient = share.mul(item.weight).div(total);
      if (item.grade === null) { pending = pending.plus(coefficient); groupPending = true; }
      else { fixed = fixed.plus(coefficient.mul(item.grade)); anyFilled = true; }
    }
    if (groupPending) pendingGroups.push(group);
  }
  if (pending.isZero()) return { grade: null, exact, scope: exact ? 'done' : 'planning', message: exact ? 'Todas as notas com peso foram preenchidas.' : `S1 de ${fmt(a.first.final)} já foi considerado. Todas as avaliações cadastradas em S2 têm nota, mas o cadastro completo ainda não foi confirmado. No + de S2, confirme que cadastrou todas as avaliações ou inclua as que faltam com nota vazia.` };
  const grade = Exact.max(0, target.minus(fixed).div(pending));
  const scope = !anyFilled ? 'semester' : pendingGroups.length === 1 ? pendingGroups[0] : 'remaining';
  return { grade: ceilGrade(grade), exact, scope, message: exact
    ? scope === 'N1' || scope === 'N2' ? `Nota necessária em ${scope} do segundo semestre, considerando as notas já lançadas e os pesos configurados.` : 'Média ponderada necessária nas notas restantes, conforme os pesos configurados.'
    : 'Estimativa com as avaliações cadastradas. Complete o planejamento para confirmar a meta restante.' };
}
export function remainingLabel(scope: Remaining['scope']): string {
  return scope === 'N1' || scope === 'N2' ? `${scope} de S2` : scope === 'semester' ? 'média de S2' : scope === 'remaining' ? 'nas restantes de S2' : scope === 'done' ? 'Sem pendências' : scope === 'planning' ? 'Confirme avaliações de S2' : 'Informe S1';
}
export function parseGrade(text: string): number | null {
  if (!text.trim()) return null;
  if (!/^\d{1,2}([.,]\d{1,4})?$/.test(text.trim())) throw new Error('Use uma nota de 0 a 10, como 7,5.');
  const value = Number(text.replace(',', '.'));
  if (value < 0 || value > 10) throw new Error('A nota deve ficar entre 0 e 10.');
  return value;
}
export function fmt(value: ExactValue | null | undefined, digits = 2): string {
  return value == null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: Math.min(1, digits) }).format(d(value).toNumber());
}
