import PDFDocument from 'pdfkit';

/**
 * Renders the clinical report object (from reportService.buildClinicalReport)
 * into a real downloadable PDF file, streamed as a Buffer.
 *
 * Replaces the old behavior where /report/export just returned the same
 * JSON as the on-screen report — this now produces an actual .pdf file
 * a doctor could print or attach to an email.
 */
export function renderClinicalReportPdf(report: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const p = report.patient;

    doc.fontSize(20).text('MemoCare Clinical Report', { align: 'center' });
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .fillColor('#666')
      .text(`Generated ${new Date(report.generatedAt).toLocaleString()}`, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(1.5);

    // --- Patient info ---
    sectionHeading(doc, 'Patient');
    keyValueRow(doc, 'Name', `${p.firstName} ${p.lastName}`);
    keyValueRow(doc, 'Date of birth', formatDate(p.dateOfBirth));
    if (p.sex) keyValueRow(doc, 'Sex', p.sex);
    keyValueRow(doc, 'Diagnosis status', p.diagnosisStatus || 'Not set');
    if (p.medicalHistoryNotes) keyValueRow(doc, 'Medical history', p.medicalHistoryNotes);
    if (p.emergencyContactName) {
      keyValueRow(doc, 'Emergency contact', `${p.emergencyContactName} (${p.emergencyContactPhone || 'no phone on file'})`);
    }
    doc.moveDown(1);

    // --- Progress summary ---
    sectionHeading(doc, 'Progress Summary');
    if (report.summary) {
      keyValueRow(doc, 'Trend', String(report.summary.trend ?? 'N/A'));
      if (report.summary.latestRiskScore !== undefined) {
        keyValueRow(doc, 'Latest risk score', String(report.summary.latestRiskScore));
      }
      if (report.summary.averageRiskScore !== undefined) {
        keyValueRow(doc, 'Average risk score', String(report.summary.averageRiskScore));
      }
    } else {
      doc.fontSize(10).text('No summary data yet.');
    }
    doc.moveDown(1);

    // --- Flagged risk periods ---
    sectionHeading(doc, 'Flagged Risk Periods');
    if (report.flaggedRiskPeriods?.length) {
      report.flaggedRiskPeriods.forEach((f: any) => {
        doc
          .fontSize(10)
          .text(`• ${formatDate(f.date)} — ${f.riskLevel} risk (score ${f.riskScore ?? 'N/A'})${f.assessmentTag ? `, tag: ${f.assessmentTag}` : ''}`);
      });
    } else {
      doc.fontSize(10).text('None flagged.');
    }
    doc.moveDown(1);

    // --- Media sessions / speech analysis ---
    sectionHeading(doc, 'Speech & Media Sessions');
    if (report.mediaSessions?.length) {
      report.mediaSessions.forEach((m: any) => {
        doc.fontSize(10).fillColor('#000').text(`${formatDate(m.createdAt)} — ${m.mediaType} — ${m.status}`, { continued: false });
        const a = m.analysisResult;
        if (a) {
          doc
            .fontSize(9)
            .fillColor('#333')
            .text(
              `   Risk: ${a.riskLevel} (${a.riskScore ?? 'N/A'})  |  Speech rate: ${a.speechRateWpm ?? 'N/A'} wpm  |  Pauses: ${a.pauseCount ?? 'N/A'}  |  Fillers: ${a.fillerWordCount ?? 'N/A'}`
            );
          if (a.transcriptText) {
            doc.fontSize(9).fillColor('#555').text(`   Transcript: "${truncate(a.transcriptText, 300)}"`, { width: 480 });
          }
          doc.fillColor('#000');
        }
        doc.moveDown(0.4);
      });
    } else {
      doc.fontSize(10).text('No media sessions recorded.');
    }
    doc.moveDown(1);

    // --- Screening attempts ---
    sectionHeading(doc, 'Screening Test Attempts');
    if (report.screeningAttempts?.length) {
      report.screeningAttempts.forEach((s: any) => {
        doc.fontSize(10).text(`${formatDate(s.startedAt)} — ${s.test?.title ?? 'Test'} — score ${s.totalScore ?? 'N/A'}`);
      });
    } else {
      doc.fontSize(10).text('No screening attempts recorded.');
    }
    doc.moveDown(1);

    // --- Clinical notes ---
    sectionHeading(doc, 'Clinical Notes');
    if (report.notes?.length) {
      report.notes.forEach((n: any) => {
        doc
          .fontSize(10)
          .text(`${formatDate(n.createdAt)} — ${n.author?.firstName ?? ''} ${n.author?.lastName ?? ''} (${n.author?.role ?? ''}):`);
        doc.fontSize(9).fillColor('#333').text(n.body, { indent: 10, width: 480 });
        doc.fillColor('#000');
        doc.moveDown(0.3);
      });
    } else {
      doc.fontSize(10).text('No notes recorded.');
    }

    doc.end();
  });
}

function sectionHeading(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(13).fillColor('#1a3c6e').text(text);
  doc.fillColor('#000');
  doc.moveDown(0.3);
}

function keyValueRow(doc: PDFKit.PDFDocument, key: string, value: string) {
  doc.fontSize(10).text(`${key}: `, { continued: true }).fontSize(10).fillColor('#333').text(value);
  doc.fillColor('#000');
}

function formatDate(d: unknown): string {
  if (!d) return 'N/A';
  const date = new Date(d as string);
  return isNaN(date.getTime()) ? String(d) : date.toLocaleDateString();
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
