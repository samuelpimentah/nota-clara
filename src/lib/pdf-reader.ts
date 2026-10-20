import { parseReportPages, type PdfItem } from './report-import';
import type { Workspace } from './model';
export async function readReportPdf(file: File, workspace: Workspace) {
  if (file.size>8*1024*1024) throw new Error('Escolha um PDF de até 8 MB.');
  if (!/\.pdf$/i.test(file.name)) throw new Error('Escolha um arquivo PDF.');
  const pdfjs=await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc=`${process.env.NEXT_PUBLIC_APP_BASE_PATH || ''}/pdf.worker.min.mjs`;
  const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),standardFontDataUrl:`${process.env.NEXT_PUBLIC_APP_BASE_PATH || ''}/pdf-standard-fonts/`});
  try {
    const pdf=await task.promise;
    if (pdf.numPages>20) throw new Error('Escolha um boletim com até 20 páginas.');
    const pages:PdfItem[][]=[];
    for(let index=1;index<=pdf.numPages;index++) {
      const content=await (await pdf.getPage(index)).getTextContent();
      pages.push(content.items.filter(item=>'str' in item).map(item=>{const text=item as {str:string;transform:number[];width:number};return {text:text.str,x:text.transform[4],y:text.transform[5],width:text.width};}));
    }
    return parseReportPages(pages,workspace);
  } catch(error) {
    if (error instanceof Error && error.name==='PasswordException') throw new Error('O PDF está protegido por senha. Envie uma cópia sem proteção.');
    throw error;
  } finally { await task.destroy(); }
}
