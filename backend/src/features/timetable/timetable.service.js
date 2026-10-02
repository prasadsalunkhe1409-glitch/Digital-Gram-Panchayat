import { ROLES, TIMETABLE_DAYS } from '@dgp/shared';
import { TimetableEntry } from './timetable.model.js';
import { AppError } from '../../utils/app-error.js';
import { writeAudit } from '../audit/audit.service.js';

/**
 * Sort order within a service: the order an officer arranged, then the week as a person reads
 * it. Sorting by `day` alphabetically would put Friday before Monday.
 */
const DAY_RANK = Object.fromEntries(TIMETABLE_DAYS.map((d, i) => [d, i]));

function byOrderThenDay(a, b) {
  if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
  const d = (DAY_RANK[a.day] ?? 99) - (DAY_RANK[b.day] ?? 99);
  if (d !== 0) return d;
  return String(a.startTime).localeCompare(String(b.startTime));
}

function shape(doc) {
  return doc.toJSON ? doc.toJSON() : { ...doc, id: String(doc._id), _id: undefined };
}

async function audit(officerId, action, entry, before) {
  await writeAudit({
    actorId: officerId,
    actorRole: ROLES.OFFICER,
    action,
    entity: 'timetable',
    entityId: entry.id ?? String(entry._id),
    before,
    after: { serviceType: entry.serviceType, day: entry.day, startTime: entry.startTime },
  });
}

/**
 * Citizen view: published slots only, grouped by service.
 *
 * Grouped here rather than on the client so the empty case is unambiguous. A service always
 * appears in the response with an entries array, even when that array is empty, so the screen
 * can say "not published yet" for one service while showing the other — instead of having to
 * infer absence from a missing key.
 */
export async function publicTimetable() {
  const rows = await TimetableEntry.find({ isActive: true, isPublished: true }).lean();
  const entries = rows.map(shape).sort(byOrderThenDay);
  return {
    Ghantagadi: entries.filter((e) => e.serviceType === 'Ghantagadi'),
    WaterSupply: entries.filter((e) => e.serviceType === 'WaterSupply'),
    updatedAt: rows.reduce(
      (latest, r) => (!latest || r.updatedAt > latest ? r.updatedAt : latest),
      null,
    ),
  };
}

/** Officer view: everything on the books, published or not. */
export async function adminList(query = {}) {
  const filter = { isActive: true };
  if (query.serviceType) filter.serviceType = query.serviceType;
  const rows = await TimetableEntry.find(filter).lean();
  return { data: rows.map(shape).sort(byOrderThenDay), total: rows.length };
}

export async function createEntry(officerId, body) {
  const entry = await TimetableEntry.create({
    serviceType: body.serviceType,
    title: body.title,
    titleMr: body.titleMr || '',
    area: body.area || '',
    areaMr: body.areaMr || '',
    day: body.day,
    startTime: body.startTime,
    endTime: body.endTime || '',
    note: body.note || '',
    noteMr: body.noteMr || '',
    isPublished: body.isPublished === true || body.isPublished === 'true',
    displayOrder: Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : 0,
    createdBy: officerId,
  });
  await audit(officerId, 'timetable.create', entry, null);
  return entry.toJSON();
}

const PATCHABLE = [
  'serviceType',
  'title',
  'titleMr',
  'area',
  'areaMr',
  'day',
  'startTime',
  'endTime',
  'note',
  'noteMr',
];

export async function updateEntry(id, officerId, body) {
  const entry = await TimetableEntry.findOne({ _id: id, isActive: true }).catch(() => null);
  if (!entry) throw new AppError(404, 'TIMETABLE_NOT_FOUND', 'Timetable entry not found');

  const before = { day: entry.day, startTime: entry.startTime, isPublished: entry.isPublished };
  PATCHABLE.forEach((f) => {
    if (body[f] !== undefined) entry[f] = body[f];
  });
  if (body.isPublished !== undefined) {
    entry.isPublished = body.isPublished === true || body.isPublished === 'true';
  }
  if (body.displayOrder !== undefined && Number.isFinite(Number(body.displayOrder))) {
    entry.displayOrder = Number(body.displayOrder);
  }
  entry.updatedBy = officerId;
  await entry.save();

  await audit(officerId, 'timetable.update', entry, before);
  return entry.toJSON();
}

/**
 * Soft delete, as every other module here does it: the row leaves both lists, but the audit
 * trail still points at something that exists.
 */
export async function deleteEntry(id, officerId) {
  const entry = await TimetableEntry.findOne({ _id: id, isActive: true }).catch(() => null);
  if (!entry) throw new AppError(404, 'TIMETABLE_NOT_FOUND', 'Timetable entry not found');
  entry.isActive = false;
  entry.updatedBy = officerId;
  await entry.save();
  await audit(officerId, 'timetable.delete', entry, { isActive: true });
  return { id: entry.id };
}
