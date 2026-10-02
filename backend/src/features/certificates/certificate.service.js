import { ROLES, CERT_TYPE_FIELDS, CERT_DOC_REQUIREMENTS, CERT_DOC_TYPES } from '@dgp/shared';
import { parsePagination } from '../../utils/pagination.js';
import { CertificateApplication } from './certificate.model.js';
import { generateCertificatePdf } from './pdf.service.js';
import { generateVerificationId, generateQrPngBuffer } from './qr.service.js';
import { getNextSequence } from '../complaints/counter.model.js';
import { User } from '../auth/user.model.js';
import { AppError } from '../../utils/app-error.js';
import { uploadAttachments, uploadPdfBuffer } from '../../utils/upload.js';
import { translateToBoth } from '../translation/translation.service.js';
import { getPublicProfile } from '../village/village.service.js';
import { writeAudit } from '../audit/audit.service.js';
import { notifyDakhalaStatus } from '../notifications/notification.service.js';

function buildApplicationId(year, seq) {
  return `DKH-${year}-${String(seq).padStart(6, '0')}`;
}

// Short per-type code for the human-facing certificate serial.
const CERT_TYPE_CODE = {
  Marriage: 'MAR',
  Residence: 'RES',
  Birth: 'BIR',
  Death: 'DEA',
  SevenTwelve: '712',
  Other: 'OTH',
};

/** Build a unique certificate serial, distinct from the applicationId. */
async function buildCertificateNumber(type, year) {
  const seq = await getNextSequence(`certno-${type}-${year}`);
  return `CERT-${CERT_TYPE_CODE[type] || 'GEN'}-${year}-${String(seq).padStart(6, '0')}`;
}

/** Public shape returned by the certificate verification page. */
function toVerification(app) {
  return {
    valid: app.status === 'Approved' && Boolean(app.certificateNumber),
    status: app.status,
    certificateType: app.certificateType,
    certificateNumber: app.certificateNumber || null,
    /*
     * Whose certificate this is, for the public verification response.
     *
     * Each type names its subject differently, so this walks the type-specific field before
     * the generic one. Marriage has no `fullName` at all — without `groomName` here, verifying
     * a genuine marriage certificate returned a null name, which makes the check worthless to
     * whoever is holding the paper.
     */
    applicantName:
      app.applicationData?.fullName ||
      app.applicationData?.childName ||
      app.applicationData?.deceasedName ||
      (app.applicationData?.groomName && app.applicationData?.brideName
        ? `${app.applicationData.groomName} & ${app.applicationData.brideName}`
        : app.applicationData?.groomName) ||
      null,
    issuedAt: app.issuedAt || null,
  };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Dynamic per-type required-field validation (single source: CERT_TYPE_FIELDS). */
/** Parse the multipart `documentMeta` JSON string (array of { group, docType }). */
function parseDocumentMeta(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      throw new AppError(400, 'VALIDATION_ERROR', 'documentMeta must be valid JSON', {
        documentMeta: 'Invalid JSON',
      });
    }
  }
  return [];
}

/**
 * Every required document group for the type must be covered by at least one uploaded file
 * whose docType is allowed for that group. Unknown docTypes are rejected outright.
 */
function validateRequiredDocuments(type, meta) {
  const groups = CERT_DOC_REQUIREMENTS[type] || [];
  const errors = {};

  for (const entry of meta) {
    if (entry?.docType && !CERT_DOC_TYPES.includes(entry.docType)) {
      errors.documents = `Unknown document type "${entry.docType}"`;
    }
  }

  for (const group of groups) {
    if (!group.required) continue;
    const covered = meta.some((m) => m?.group === group.key && group.anyOf.includes(m?.docType));
    if (!covered) errors[`documents.${group.key}`] = `A valid ${group.key} document is required`;
  }

  if (Object.keys(errors).length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Required documents are missing', errors);
  }
}

function validateApplicationData(type, data) {
  const fields = CERT_TYPE_FIELDS[type] || [];
  const missing = {};
  for (const field of fields) {
    if (!field.required) continue;
    const value = data?.[field.key];
    if (value === undefined || value === null || String(value).trim() === '') {
      missing[field.key] = `${field.label} is required`;
    }
  }
  if (Object.keys(missing).length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Missing required fields', missing);
  }
}

function parseApplicationData(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new AppError(400, 'VALIDATION_ERROR', 'applicationData must be valid JSON', {
        applicationData: 'Invalid JSON',
      });
    }
  }
  return {};
}

async function audit(actorId, actorRole, action, app, before, after) {
  await writeAudit({
    actorId,
    actorRole,
    action,
    entity: 'dakhalaapplications',
    entityId: app.id,
    before,
    after,
  });
}

/** @param {{ citizenId: string, body: object, files?: Array }} params */
export async function apply({ citizenId, body, files }) {
  const certificateType = body.certificateType;
  if (!CERT_TYPE_FIELDS[certificateType]) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid certificate type', {
      certificateType: 'Unknown type',
    });
  }
  const applicationData = parseApplicationData(body.applicationData);
  validateApplicationData(certificateType, applicationData);

  // Per-file { group, docType }, positionally aligned with `files`.
  const documentMeta = parseDocumentMeta(body.documentMeta);
  validateRequiredDocuments(certificateType, documentMeta);

  const uploaded = await uploadAttachments(files, 'certificates/docs');
  const uploadedDocuments = uploaded.map((doc, i) => ({
    ...doc,
    group: documentMeta[i]?.group,
    docType: documentMeta[i]?.docType,
  }));

  const year = new Date().getFullYear();
  const seq = await getNextSequence(`dakhala-${year}`);

  const app = await CertificateApplication.create({
    applicationId: buildApplicationId(year, seq),
    citizenId,
    certificateType,
    applicationData,
    uploadedDocuments,
    status: 'Submitted',
    history: [{ status: 'Submitted', by: citizenId, at: new Date() }],
    createdBy: citizenId,
  });

  await audit(citizenId, ROLES.CITIZEN, 'dakhala.apply', app, null, {
    applicationId: app.applicationId,
    certificateType,
  });
  return app.toJSON();
}

/** @param {string} citizenId @param {object} query */
export async function listMine(citizenId, query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { citizenId, isActive: true };
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    CertificateApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CertificateApplication.countDocuments(filter),
  ]);
  return { data: items.map((a) => a.toJSON()), total, page, limit };
}

async function findActive(id) {
  const app = await CertificateApplication.findOne({ _id: id, isActive: true }).catch(() => null);
  if (!app) throw new AppError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
  return app;
}

/** @param {string} id @param {{ id: string, role: string }} user */
export async function getOne(id, user) {
  const app = await findActive(id);
  const isOwner = String(app.citizenId) === String(user.id);
  if (user.role !== ROLES.OFFICER && !isOwner) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot access this application');
  }
  return app.toJSON();
}

/** Access-controlled certificate URL — owner or officer, and only when Approved. */
export async function getCertificate(id, user) {
  const app = await findActive(id);
  const isOwner = String(app.citizenId) === String(user.id);
  if (user.role !== ROLES.OFFICER && !isOwner) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot access this certificate');
  }
  if (app.status !== 'Approved' || !app.pdfUrl) {
    throw new AppError(404, 'CERTIFICATE_NOT_READY', 'Certificate is not available yet');
  }
  return {
    applicationId: app.applicationId,
    pdfUrl: app.pdfUrl,
    certificateNumber: app.certificateNumber || null,
    verificationId: app.verificationId || null,
    issuedAt: app.issuedAt || null,
  };
}

/** @param {object} query */
export async function adminList(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { isActive: true };
  if (query.status) filter.status = query.status;
  if (query.certificateType) filter.certificateType = query.certificateType;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ applicationId: rx }];
  }

  const [items, total] = await Promise.all([
    CertificateApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CertificateApplication.countDocuments(filter),
  ]);
  return { data: items.map((a) => a.toJSON()), total, page, limit };
}

/** @param {string} id */
export async function adminGetOne(id) {
  const app = await findActive(id);
  return app.toJSON();
}

/** Move to UnderReview. @param {string} id @param {string} officerId */
export async function review(id, officerId) {
  const app = await findActive(id);
  if (app.status === 'Submitted') {
    app.status = 'UnderReview';
    app.reviewedBy = officerId;
    app.updatedBy = officerId;
    app.history.push({ status: 'UnderReview', by: officerId, at: new Date() });
    await app.save();
    await audit(
      officerId,
      ROLES.OFFICER,
      'dakhala.review',
      app,
      { status: 'Submitted' },
      { status: 'UnderReview' },
    );
  }
  return app.toJSON();
}

/** Village Profile is optional branding — never let its absence block issuance. */
async function loadVillageSafe() {
  try {
    return await getPublicProfile();
  } catch {
    return null;
  }
}

/**
 * Approve: optionally apply officer edits, then generate the official certificate (number,
 * verification id, QR, PDF), store it, mark Approved, notify + audit.
 *
 * `edits` is optional and backward compatible — an approve with no body behaves exactly as
 * before. Supported edits (all optional): `applicationData` (merged over the existing data and
 * re-validated for the type) and `officerRemarks` (printed on the certificate).
 *
 * @param {string} id
 * @param {string} officerId
 * @param {{ applicationData?: object, officerRemarks?: string }} [edits]
 */
export async function approve(id, officerId, edits = {}) {
  const app = await findActive(id);
  if (app.status === 'Approved') {
    // Idempotent — already approved.
    return app.toJSON();
  }
  if (app.status === 'Rejected') {
    throw new AppError(409, 'ALREADY_REJECTED', 'A rejected application cannot be approved');
  }

  // Officer edits before finalizing.
  const editData = parseApplicationData(edits.applicationData);
  if (Object.keys(editData).length > 0) {
    app.applicationData = { ...app.applicationData, ...editData };
    validateApplicationData(app.certificateType, app.applicationData);
    app.markModified('applicationData');
  }
  if (typeof edits.officerRemarks === 'string') {
    app.officerRemarks = edits.officerRemarks.trim() || undefined;
  }

  const [citizen, officer, village] = await Promise.all([
    User.findById(app.citizenId).select('fullName mobile village'),
    User.findById(officerId).select('fullName'),
    loadVillageSafe(),
  ]);

  const year = new Date().getFullYear();
  const certificateNumber = await buildCertificateNumber(app.certificateType, year);
  const verificationId = generateVerificationId();
  const issuedAt = new Date();
  const qrBuffer = await generateQrPngBuffer(verificationId).catch(() => null);

  const pdfBuffer = await generateCertificatePdf({
    application: app.toJSON(),
    citizen,
    officer,
    village,
    qrBuffer,
    certificateNumber,
    verificationId,
    issuedAt,
  });
  const pdfUrl = await uploadPdfBuffer(pdfBuffer, 'certificates/pdf');

  const before = { status: app.status };
  app.status = 'Approved';
  app.pdfUrl = pdfUrl;
  app.certificateNumber = certificateNumber;
  app.verificationId = verificationId;
  app.issuedAt = issuedAt;
  app.reviewedBy = officerId;
  app.updatedBy = officerId;
  app.rejectionReason = undefined;
  app.history.push({ status: 'Approved', by: officerId, at: issuedAt });
  await app.save();

  await audit(officerId, ROLES.OFFICER, 'dakhala.approve', app, before, {
    status: 'Approved',
    certificateNumber,
  });
  await notifyDakhalaStatus({
    recipientId: app.citizenId,
    mobile: citizen?.mobile,
    applicationId: app.applicationId,
    status: 'Approved',
    entityId: app.id,
  });

  return app.toJSON();
}

/**
 * Reject with a mandatory reason, notify + audit.
 * @param {string} id @param {string} officerId @param {string} reason
 */
export async function reject(id, officerId, reason) {
  if (!reason || !reason.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A rejection reason is required', {
      reason: 'Reason is required',
    });
  }
  const app = await findActive(id);
  if (app.status === 'Approved') {
    throw new AppError(409, 'ALREADY_APPROVED', 'An approved application cannot be rejected');
  }

  const before = { status: app.status };
  app.status = 'Rejected';
  app.rejectionReason = reason.trim();
  const both = await translateToBoth(reason.trim());
  app.rejectionReasonI18n = { en: both.en, mr: both.mr };
  app.reviewedBy = officerId;
  app.updatedBy = officerId;
  app.history.push({ status: 'Rejected', by: officerId, note: reason.trim(), at: new Date() });
  await app.save();

  await audit(officerId, ROLES.OFFICER, 'dakhala.reject', app, before, {
    status: 'Rejected',
    reason: reason.trim(),
  });

  const citizen = await User.findById(app.citizenId).select('mobile');
  await notifyDakhalaStatus({
    recipientId: app.citizenId,
    mobile: citizen?.mobile,
    applicationId: app.applicationId,
    status: 'Rejected',
    reason: reason.trim(),
    entityId: app.id,
  });

  return app.toJSON();
}

/**
 * Public certificate verification — no auth. Looks a certificate up by its opaque
 * verificationId (from a scanned QR) or by its certificate number. Returns only the
 * non-sensitive summary fields; if nothing matches, a "not valid" result (never a 404 leak).
 * @param {{ verificationId?: string, certificateNumber?: string }} query
 */
export async function verifyCertificate({ verificationId, certificateNumber }) {
  const filter = { isActive: true };
  if (verificationId) filter.verificationId = verificationId;
  else if (certificateNumber) filter.certificateNumber = certificateNumber.trim();
  else
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'A verification id or certificate number is required',
    );

  const app = await CertificateApplication.findOne(filter).catch(() => null);
  if (!app) return { valid: false };
  return toVerification(app.toJSON());
}

/** Internal soft delete. @param {string} id @param {string} officerId */
export async function softDelete(id, officerId) {
  const app = await findActive(id);
  app.isActive = false;
  app.updatedBy = officerId;
  await app.save();
  await audit(officerId, ROLES.OFFICER, 'dakhala.delete', app, null, { isActive: false });
  return { id: app.id };
}
