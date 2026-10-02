import { ROLES } from '@dgp/shared';
import { parsePagination } from '../../utils/pagination.js';
import { wardCondition } from '../../utils/ward.js';
import { Complaint } from './complaint.model.js';
import { getNextSequence } from './counter.model.js';
import { User } from '../auth/user.model.js';
import { AppError } from '../../utils/app-error.js';
import { uploadImages } from '../../utils/upload.js';
import { translateToBoth } from '../translation/translation.service.js';
import { writeAudit } from '../audit/audit.service.js';
import { notifyComplaintStatus } from '../notifications/notification.service.js';

function buildComplaintId(year, seq) {
  return `CMP-${year}-${String(seq).padStart(6, '0')}`;
}

/**
 * Create a complaint for the authenticated citizen. Uploads any images, generates a
 * sequential human id, seeds the status history, and writes an audit entry.
 * @param {{ citizenId: string, body: object, files?: Array }} params
 */
export async function createComplaint({ citizenId, body, files }) {
  const images = await uploadImages(files);

  const year = new Date().getFullYear();
  const seq = await getNextSequence(`complaint-${year}`);
  const complaintId = buildComplaintId(year, seq);

  const doc = {
    complaintId,
    citizenId,
    category: body.category,
    title: body.title,
    description: body.description,
    images,
    address: body.address || undefined,
    ward: body.ward || undefined,
    priority: body.priority || 'Medium',
    status: 'Pending',
    statusHistory: [{ status: 'Pending', by: citizenId, at: new Date() }],
  };

  const lat = body.latitude !== undefined ? Number(body.latitude) : undefined;
  const lng = body.longitude !== undefined ? Number(body.longitude) : undefined;
  if (lat !== undefined && lng !== undefined && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    doc.location = { type: 'Point', coordinates: [lng, lat] };
    if (body.accuracy !== undefined) doc.accuracy = Number(body.accuracy);
  }

  const complaint = await Complaint.create(doc);

  await writeAudit({
    actorId: citizenId,
    actorRole: ROLES.CITIZEN,
    action: 'complaint.create',
    entity: 'complaints',
    entityId: complaint.id,
    after: { complaintId, status: 'Pending' },
  });

  return complaint.toJSON();
}

/**
 * @param {string} citizenId
 * @param {{ page?: number, limit?: number }} query
 */
export async function listMine(citizenId, query) {
  const { page, limit, skip } = parsePagination(query);

  const filter = { citizenId };
  const [items, total] = await Promise.all([
    Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Complaint.countDocuments(filter),
  ]);

  return { data: items.map((c) => c.toJSON()), total, page, limit };
}

/**
 * @param {string} id
 * @param {{ id: string, role: string }} user
 */
export async function getOne(id, user) {
  const complaint = await Complaint.findById(id).catch(() => null);
  if (!complaint) {
    throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint not found');
  }
  const isOwner = String(complaint.citizenId) === String(user.id);
  if (user.role !== ROLES.OFFICER && !isOwner) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot access this complaint');
  }
  return complaint.toJSON();
}

/**
 * Officer list with search / filter / sort / pagination.
 * @param {object} query
 */
export async function adminList(query) {
  const { page, limit, skip } = parsePagination(query);

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  // wardCondition, so 'unset' finds the complaints filed before the ward field carried a
  // validated value — they hold null or an empty string and both must match.
  const wardFilter = wardCondition(query.ward);
  if (wardFilter !== null) filter.ward = wardFilter;
  if (query.priority) filter.priority = query.priority;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ complaintId: rx }, { title: rx }, { description: rx }];
  }

  const sortField = ['createdAt', 'status', 'category', 'priority'].includes(query.sortBy)
    ? query.sortBy
    : 'createdAt';
  const sortDir = query.sortDir === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments(filter),
  ]);

  return { data: items.map((c) => c.toJSON()), total, page, limit };
}

/**
 * Officer status update: appends status history, optional remark, audits, and notifies
 * the citizen (mock SMS in M1–M3).
 * @param {string} id
 * @param {{ id: string }} officer
 * @param {{ status: string, remark?: string }} payload
 */
export async function updateStatus(id, officer, payload) {
  const complaint = await Complaint.findById(id).catch(() => null);
  if (!complaint) {
    throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint not found');
  }

  const before = { status: complaint.status };
  complaint.status = payload.status;
  complaint.statusHistory.push({ status: payload.status, by: officer.id, at: new Date() });
  if (payload.remark && payload.remark.trim()) {
    const note = payload.remark.trim();
    const both = await translateToBoth(note, payload.lang);
    complaint.remarks.push({
      officerId: officer.id,
      note,
      i18n: { en: both.en, mr: both.mr },
      at: new Date(),
    });
  }
  await complaint.save();

  await writeAudit({
    actorId: officer.id,
    actorRole: ROLES.OFFICER,
    action: 'complaint.status.update',
    entity: 'complaints',
    entityId: complaint.id,
    before,
    after: { status: complaint.status },
  });

  const citizen = await User.findById(complaint.citizenId).select('mobile');
  await notifyComplaintStatus({
    recipientId: complaint.citizenId,
    mobile: citizen?.mobile,
    complaintId: complaint.complaintId,
    status: complaint.status,
    entityId: complaint.id,
  });

  return complaint.toJSON();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
