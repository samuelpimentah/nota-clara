import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { createCsv, createExcel, exportRows } from '../src/lib/export';
import { emptyWorkspace, newSubject, setBlockGrade } from '../src/lib/model';
function fixture() {
  const workspace = emptyWorkspace();
  const subject = newSubject('História; "Brasil"');
  subject.s1 = setBlockGrade(setBlockGrade(subject.s1, 'N1', 6), 'N2', 6);
  subject.s2 = setBlockGrade(subject.s2, 'N1', 7);
  subject.s2.assessments.push({ id: crypto.randomUUID(), name: 'Atividade preservada', group: 'N1', type: 'Em grupo', grade: 0, weight: 2 });
  workspace.subjects = [subject];
  return workspace;
}
test('CSV tem BOM, ponto e vírgula, vírgula decimal e preserva vazio versus zero', () => {
  const workspace = fixture();
  workspace.subjects[0].name = '=SUM(A1:A2)';
  workspace.subjects[0].hidden = true;
  const csv = createCsv(workspace);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('7,4')); assert.ok(csv.includes('"\'=SUM(A1:A2)"')); assert.ok(csv.includes('"Sim"'));
  const row = exportRows(workspace)[1];
  assert.equal(row[8], null); assert.equal(row[14], null);
  workspace.subjects[0].s2 = setBlockGrade(workspace.subjects[0].s2,'N2',0);
  assert.equal(exportRows(workspace)[1][8],0);
});
test('CSV escapa separadores, aspas e quebras de linha', () => {
  const workspace = fixture(); workspace.subjects[0].name += '\nII';
  assert.ok(createCsv(workspace).includes('"História; ""Brasil""\nII"'));
});
test('Excel abre com resumo, números, pendências e avaliações preservadas identificadas', async () => {
  const workspace = fixture();
  const bytes = await createExcel(workspace);
  const book = new ExcelJS.Workbook(); await book.xlsx.load(new Uint8Array(bytes).buffer);
  const summary = book.getWorksheet('Notas')!, details = book.getWorksheet('Avaliações')!;
  assert.equal(summary.getCell('B2').value, 'História; "Brasil"');
  assert.equal(summary.getCell('K2').value,7.4); assert.equal(summary.getCell('O2').value,null);
  assert.equal(details.getCell('G2').value,0); assert.equal(details.getCell('H2').value,2);
  assert.equal(details.getCell('I2').value,'Não (nota única ativa)');
  workspace.subjects[0].s2 = setBlockGrade(workspace.subjects[0].s2,'N2',7.4);
  await book.xlsx.load(new Uint8Array(await createExcel(workspace)).buffer);
  assert.equal(book.getWorksheet('Notas')!.getCell('O2').value,7);
  assert.equal(book.getWorksheet('Notas')!.getCell('N2').value,'Garantida');
});
