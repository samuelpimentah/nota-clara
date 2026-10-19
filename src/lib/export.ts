import { analyze, groupMean, remainingLabel, remainingRequired } from './calculations';
import type { Workspace } from './model';

type Cell = string | number | null;
const labels = { guaranteed: 'Garantida', possible: 'Atenção', impossible: 'Fora do alcance', unknown: 'Sem definição' };
export function exportRows(workspace: Workspace): Cell[][] {
  return [['Ano', 'Matéria', 'Oculta', 'N1 S1 (atual)', 'N2 S1 (atual)', 'S1 final', 'S1 ajustado', 'N1 S2 (atual)', 'N2 S2 (atual)', 'S2 final', 'Nota necessária', 'Onde falta tirar', 'Precisão da meta', 'Situação', 'Final do ano'],
    ...workspace.subjects.map(subject => {
      const a = analyze(subject), remaining = remainingRequired(subject);
      const group = (key: 's1' | 's2', name: 'N1' | 'N2') => subject[key].mode === 'direct' ? null : groupMean(subject[key], name);
      return [workspace.year, subject.name, subject.hidden ? 'Sim' : 'Não', group('s1','N1'), group('s1','N2'), a.first.final?.toNumber() ?? null, a.adjusted?.toNumber() ?? null, group('s2','N1'), group('s2','N2'), a.second.final?.toNumber() ?? null, remaining.grade, remainingLabel(remaining.scope), remaining.grade === null ? '' : remaining.exact ? 'Exata' : 'Estimativa', labels[a.status], a.final?.toNumber() ?? null];
    })];
}
export function createCsv(workspace: Workspace): string {
  const cell = (value: Cell) => {
    if (value === null) return '';
    if (typeof value === 'number') return String(value).replace('.', ',');
    // Treat user-entered names as text when opened by spreadsheet programs.
    const safe = /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? "'" + value : value;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  return '\uFEFF' + exportRows(workspace).map(row => row.map(cell).join(';')).join('\r\n') + '\r\n';
}
export async function createExcel(workspace: Workspace): Promise<Uint8Array> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nota Clara';
  const summary = workbook.addWorksheet('Notas');
  summary.addRows(exportRows(workspace));
  const details = workbook.addWorksheet('Avaliações');
  details.addRow(['Ano', 'Matéria', 'Semestre', 'Bloco', 'Avaliação', 'Tipo', 'Nota', 'Peso dentro do bloco', 'Usada no cálculo']);
  for (const subject of workspace.subjects) for (const key of ['s1','s2'] as const) {
    const semester = subject[key];
    for (const item of semester.assessments) details.addRow([workspace.year, subject.name, key === 's1' ? '1º semestre' : '2º semestre', item.group, item.name, item.type, item.grade, item.weight, semester.mode === 'detailed' && (semester.blocks?.[item.group].mode ?? 'detailed') === 'detailed' ? 'Sim' : 'Não (nota única ativa)']);
  }
  for (const sheet of [summary, details]) {
    sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 2 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1,sheet.rowCount), column: sheet.columnCount } };
    sheet.getRow(1).height = 34;
    sheet.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF127766' } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
    sheet.columns.forEach((column, index) => { column.width = index === 1 ? 42 : 22; });
    sheet.eachRow((row, index) => { if (index === 1) return; row.height = 32; row.eachCell(cell => { cell.font = { size: 12 }; cell.alignment = { vertical: 'middle', wrapText: true }; if (typeof cell.value === 'number' && cell.col !== 'A') cell.numFmt = '0.00########'; }); });
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
