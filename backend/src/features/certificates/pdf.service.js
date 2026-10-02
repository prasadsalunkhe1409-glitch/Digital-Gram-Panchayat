import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import PDFDocument from 'pdfkit';
import { APP_NAME } from '@dgp/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Drop a Devanagari TTF here to render Marathi text (e.g. NotoSansDevanagari-Regular.ttf).
// PDFKit's built-in fonts have no Devanagari glyphs, so the template stays English until
// this font is present; then the labels below can switch to Marathi without code changes.
const DEVANAGARI_FONT_PATH = join(
  __dirname,
  '../../../assets/fonts/NotoSansDevanagari-Regular.ttf',
);

const DEFAULT_PANCHAYAT_NAME = 'Grampanchayat Sakharale';
const PRIMARY = '#1E3A8A'; // royal blue (design-system primary)
const INK = '#0F172A';
const MUTED = '#475569';
const HAIRLINE = '#CBD5E1';

const TITLES = {
  Marriage: 'Marriage Certificate',
  Residence: 'Residence Certificate',
  Birth: 'Birth Certificate',
  Death: 'Death Certificate',
  SevenTwelve: '7/12 & 8A Extract Certificate',
  Other: 'Certificate',
};

/** Title for a certificate ("Other" carries its own citizen-supplied title). */
function certificateTitle(application) {
  if (application.certificateType === 'Other') {
    return application.applicationData?.certificateTitle || 'Certificate';
  }
  return TITLES[application.certificateType] || 'Certificate';
}

/** Draw a labelled dashed placeholder box (seal / signature fallback). */
function placeholderBox(doc, x, y, w, h, label) {
  doc.save();
  doc.rect(x, y, w, h).dash(2, { space: 2 }).stroke(HAIRLINE);
  doc.undash();
  doc
    .fontSize(8)
    .fillColor('#94A3B8')
    .text(label, x, y + h / 2 - 4, { width: w, align: 'center' });
  doc.restore();
  doc.fillColor(INK);
}

/** Faint diagonal watermark across the page — a light tamper-evidence cue. */
function drawWatermark(doc, text) {
  doc.save();
  doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
  doc
    .fontSize(64)
    .fillColor('#0F172A')
    .opacity(0.05)
    .text(text, 0, doc.page.height / 2 - 40, { width: doc.page.width, align: 'center' });
  doc.opacity(1).restore();
  doc.fillColor(INK);
}

/**
 * Generate a professional certificate PDF and resolve a Buffer. Template is isolated here so it
 * stays reusable across certificate types; adding a new type only needs a TITLES entry.
 *
 * All the issued-certificate params are optional so the function keeps working for callers /
 * tests that pass only the core three. When a `village` profile is supplied its Gram Panchayat
 * and village names brand the header — so any panchayat re-brands the certificate from Admin.
 *
 * @param {object} params
 * @param {object} params.application
 * @param {object} params.citizen
 * @param {object} params.officer
 * @param {object} [params.village]        Village Profile (general.panchayatName/villageName)
 * @param {Buffer} [params.qrBuffer]       PNG QR of the verification URL
 * @param {string} [params.certificateNumber]
 * @param {string} [params.verificationId]
 * @param {Date}   [params.issuedAt]
 * @returns {Promise<Buffer>}
 */
export function generateCertificatePdf({
  application,
  citizen,
  officer,
  village,
  qrBuffer,
  certificateNumber,
  verificationId,
  issuedAt,
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const hasDevanagari = existsSync(DEVANAGARI_FONT_PATH);
    if (hasDevanagari) doc.registerFont('devanagari', DEVANAGARI_FONT_PATH);

    const g = village?.general || {};
    const panchayatName = g.panchayatName || DEFAULT_PANCHAYAT_NAME;
    const villageName = g.villageName || '';
    const issued = issuedAt ? new Date(issuedAt) : new Date();
    const certNo = certificateNumber || application.applicationId;
    const pageWidth = doc.page.width - 100;
    const left = 50;
    const right = doc.page.width - 50;

    drawWatermark(doc, panchayatName);

    // ---- Decorative government border ----
    doc
      .save()
      .lineWidth(1.5)
      .strokeColor(PRIMARY)
      .rect(28, 28, doc.page.width - 56, doc.page.height - 56)
      .stroke()
      .lineWidth(0.5)
      .rect(34, 34, doc.page.width - 68, doc.page.height - 68)
      .stroke()
      .restore();

    // ---- Government header ----
    doc.fontSize(11).fillColor(MUTED).text('Government of Maharashtra', left, 52, {
      width: pageWidth,
      align: 'center',
    });
    doc.moveDown(0.2);
    doc.fontSize(17).fillColor(PRIMARY).text(panchayatName, { align: 'center' });
    doc
      .fontSize(10)
      .fillColor(MUTED)
      .text(villageName ? `Village ${villageName} · ${APP_NAME}` : APP_NAME, { align: 'center' });
    doc
      .moveTo(left, doc.y + 6)
      .lineTo(right, doc.y + 6)
      .strokeColor(PRIMARY)
      .stroke();
    doc.moveDown(1.2);

    // ---- Title + certificate number ----
    doc.fontSize(16).fillColor(INK).text(certificateTitle(application), {
      align: 'center',
      underline: true,
    });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor(MUTED).text(`Certificate No: ${certNo}`, { align: 'center' });
    doc.moveDown(1.2);

    // ---- QR (top-right, inside the border) ----
    if (qrBuffer) {
      doc.image(qrBuffer, right - 78, 96, { fit: [70, 70] });
      doc
        .fontSize(7)
        .fillColor(MUTED)
        .text('Scan to verify', right - 88, 168, {
          width: 90,
          align: 'center',
        });
    } else {
      placeholderBox(doc, right - 78, 96, 70, 70, 'QR');
    }

    // ---- Body ----
    doc.fontSize(11).fillColor(INK);
    doc.text(
      `This is to certify that the following details, submitted to ${panchayatName}, ` +
        `have been verified and recorded in the official register.`,
      left,
      doc.y,
      { width: pageWidth, align: 'left' },
    );
    doc.moveDown(0.8);

    doc.fontSize(11).fillColor(INK).text(`Applicant: ${citizen.fullName}`);
    if (citizen.mobile) doc.text(`Mobile: ${citizen.mobile}`);
    if (citizen.village) doc.text(`Village: ${citizen.village}`);
    doc.moveDown(0.6);

    // Certificate-type specific fields from applicationData.
    doc.fontSize(11).fillColor(INK).text('Certificate details:', { underline: true });
    doc.moveDown(0.2);
    const data = application.applicationData || {};
    Object.entries(data).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      doc.fontSize(10).fillColor(MUTED).text(`${label}: ${value}`, { width: pageWidth });
    });

    if (application.officerRemarks) {
      doc.moveDown(0.6);
      doc.fontSize(10).fillColor(INK).text('Remarks:', { underline: true });
      doc.fontSize(10).fillColor(MUTED).text(application.officerRemarks, { width: pageWidth });
    }
    doc.moveDown(1);

    doc
      .fontSize(10)
      .fillColor(MUTED)
      .text(
        `Issue date: ${issued.toLocaleDateString('en-IN')} ${issued.toLocaleTimeString('en-IN')}`,
      );
    doc.moveDown(2);

    // ---- Seal + signature ----
    const bottomY = Math.min(doc.y, doc.page.height - 200);
    if (g.logo) {
      // Village logo doubles as the official seal when configured.
      try {
        doc.image(g.logo, left, bottomY, { fit: [60, 60] });
      } catch {
        placeholderBox(doc, left, bottomY, 130, 60, 'Official Seal');
      }
      doc
        .fontSize(8)
        .fillColor(MUTED)
        .text('Official Seal', left, bottomY + 62, { width: 60 });
    } else {
      placeholderBox(doc, left, bottomY, 130, 60, 'Official Seal');
    }
    placeholderBox(doc, right - 130, bottomY, 130, 60, 'Signature');
    doc
      .fontSize(9)
      .fillColor(INK)
      .text(officer?.fullName || 'Panchayat Officer', right - 130, bottomY + 64, {
        width: 130,
        align: 'center',
      });
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text('Authorised Officer', right - 130, bottomY + 76, {
        width: 130,
        align: 'center',
      });

    // ---- Verification footer ----
    const footerY = doc.page.height - 78;
    doc
      .moveTo(left, footerY - 8)
      .lineTo(right, footerY - 8)
      .strokeColor(HAIRLINE)
      .stroke();
    const footerLines = [
      'This certificate is digitally generated and valid without a physical signature.',
    ];
    if (verificationId) {
      footerLines.push(
        `Verify online with Certificate No ${certNo} · Verification ID ${verificationId}`,
      );
    } else {
      footerLines.push('Verify via the QR code or certificate number.');
    }
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text(footerLines.join('\n'), left, footerY, { width: pageWidth, align: 'center' });

    doc.end();
  });
}
