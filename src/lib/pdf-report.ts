import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { analyze, fmt, remainingLabel, remainingRequired } from './calculations';
import type { Workspace } from './model';
const statusLabels={guaranteed:'Garantida',possible:'Atenção',impossible:'Fora do alcance',unknown:'Sem definição'};
export function createReportPdf(workspace: Workspace, studentName: string, issuedAt = new Date()): Uint8Array {
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'}), goal=workspace.personalGoal ?? 7;
  doc.setProperties({title:'Estimativa de situação atual do boletim',subject:'Relatório não oficial gerado a partir das notas informadas no Nota Clara',author:'Nota Clara'});
  const margin=12,width=186;
  const rows=workspace.subjects.filter(subject=>!subject.hidden).map(subject=>{
    const a=analyze(subject),remaining=remainingRequired(subject,goal);
    const annualValue=a.final!==null && a.final.lt(7) && a.final.gte(6.995) ? '< 7,00' : fmt(a.final).replace('—','-');
    const first=fmt(a.first.final).replace('—','-')+(a.adjusted!==null && a.first.final!==null && a.adjusted.gt(a.first.final) ? `\n(aj. ${fmt(a.adjusted)})` : '');
    const required=remaining.grade===null ? a.min.gte(goal) ? 'Meta atingida' : a.final!==null ? 'Meta não atingida' : remainingLabel(remaining.scope) : `${fmt(remaining.grade)}\n${remainingLabel(remaining.scope)}${!remaining.exact?' (estimativa)':''}`;
    return [subject.name,first,fmt(a.second.final).replace('—','-'),annualValue,required,statusLabels[a.status]];
  });
  autoTable(doc,{
    startY:54,margin:{top:54,left:margin,right:margin,bottom:31},
    head:[['Disciplinas','1º Sem','2º Sem','MA','Falta p/ meta','Situação atual']],body:rows,
    rowPageBreak:'avoid',
    theme:'grid',styles:{font:'helvetica',fontSize:8,cellPadding:2.2,lineColor:[30,30,30],lineWidth:0.2,textColor:[20,20,20],overflow:'linebreak',valign:'middle'},
    headStyles:{fillColor:[241,243,244],textColor:[20,20,20],fontStyle:'bold',halign:'center'},
    columnStyles:{0:{cellWidth:72},1:{cellWidth:17,halign:'center'},2:{cellWidth:17,halign:'center'},3:{cellWidth:16,halign:'center'},4:{cellWidth:36,halign:'center'},5:{cellWidth:28,halign:'center'}},
    didDrawPage:()=>{
      doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(20,20,20);doc.text('NOTA CLARA',margin,12);
      doc.setFontSize(15);doc.text('Estimativa de situação atual do boletim',margin,22);
      doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text('Documento não oficial. Baseado nas notas cadastradas até o momento da emissão.',margin,29);
      doc.setDrawColor(100);doc.rect(margin,34,width,15);
      const name=doc.splitTextToSize(`Estudante: ${studentName}`,126);doc.text(name.slice(0,2),margin+3,40);
      doc.text(`Ano letivo: ${workspace.year}`,margin+width-3,40,{align:'right'});
      doc.text(`Emissão: ${issuedAt.toLocaleDateString('pt-BR')}`,margin+width-3,46,{align:'right'});
      doc.setFontSize(8);doc.text(`Meta pessoal: ${fmt(goal)} | Aprovação direta da escola: média anual a partir de 7,0.`,margin,273);
      doc.text('MA: média anual com eventual ajuste de S1. Não inclui recuperação final.',margin,279);
      doc.text('Notas pendentes aparecem como traço. Esta estimativa não substitui o boletim oficial.',margin,285);
      doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`,198,291,{align:'right'});
    },
  });
  return new Uint8Array(doc.output('arraybuffer'));
}
