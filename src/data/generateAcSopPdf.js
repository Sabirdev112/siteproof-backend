import PDFDocument from 'pdfkit';
import { AC_SOP } from './acSop.js';

export function buildAcSopPdf() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: AC_SOP.title, Author: 'SiteProof' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(AC_SOP.title);
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#333')
      .text(`${AC_SOP.docNo}  |  Revision ${AC_SOP.revision}  |  Vertical: ${AC_SOP.vertical}`)
      .text('KeepCodeIn / SiteProof field inspection rulebook. Cite clauses as SOP §n.n.');
    doc.moveDown();
    doc.fillColor('#000');

    for (const section of AC_SOP.sections) {
      doc.fontSize(13).text(section.heading);
      doc.moveDown(0.3);
      for (const clause of section.clauses) {
        doc.fontSize(11).text(`SOP §${clause.ref} ${clause.title}`);
        doc.fontSize(10).fillColor('#222').text(clause.body, { align: 'justify' });
        doc.fillColor('#000').moveDown(0.55);
      }
    }

    doc.fontSize(9).fillColor('#666').text('End of SOP. Workers capture evidence; compliance uses these clauses.');
    doc.end();
  });
}
