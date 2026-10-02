import { ROLES } from '@dgp/shared';
import { parsePagination } from '../../utils/pagination.js';
import { citizenIdsFor } from '../../utils/ward.js';
import { TaxRecord } from './tax.model.js';
import { getNextSequence } from '../complaints/counter.model.js';
import { User } from '../auth/user.model.js';
import { AppError } from '../../utils/app-error.js';
import { uploadAttachments } from '../../utils/upload.js';
import { writeAudit } from '../audit/audit.service.js';
import { notifyTaxUpdate } from '../notifications/notification.service.js';

function buildTaxRecordId(year, seq) {
  return `TAX-${year}-${String(seq).padStart(6, '0')}`;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Derive balance + status from amount/amountPaid.
 *
 * `amount` is null when the officer raised the record from a scanned bill without transcribing
 * the figure. An unknown total is not a zero total: it can never settle to Paid, because nothing
 * knows what settling would mean. Balance stays 0 so the village dues figure never counts a
 * number it does not have.
 */
function recompute(record) {
  if (record.amount === null || record.amount === undefined) {
    record.balance = 0;
    record.paymentStatus = record.amountPaid > 0 ? 'Partial' : 'Unpaid';
    return;
  }
  record.balance = Math.max(0, record.amount - record.amountPaid);
  if (record.amountPaid <= 0) record.paymentStatus = 'Unpaid';
  else if (record.amountPaid >= record.amount) record.paymentStatus = 'Paid';
  else record.paymentStatus = 'Partial';
}

async function audit(officerId, action, record, before, after) {
  await writeAudit({
    actorId: officerId,
    actorRole: ROLES.OFFICER,
    action,
    entity: 'taxrecords',
    entityId: record.id,
    before,
    after,
  });
}

/**
 * Tax-scoped citizen lookup by mobile so an officer can attach a record to the right
 * person. Returns minimal fields only — full user management arrives in M8.
 * @param {string} mobile
 */
export async function lookupCitizen(mobile) {
  const citizen = await User.findOne({ mobile, role: ROLES.CITIZEN }).select(
    'fullName mobile village',
  );
  if (!citizen) throw new AppError(404, 'CITIZEN_NOT_FOUND', 'No citizen found with that mobile');
  return {
    id: citizen.id,
    fullName: citizen.fullName,
    mobile: citizen.mobile,
    village: citizen.village,
  };
}

/** @param {{ officerId: string, body: object }} params */
export async function createRecord({ officerId, body, files }) {
  const citizen = await User.findOne({ _id: body.citizenId, role: ROLES.CITIZEN }).catch(
    () => null,
  );
  if (!citizen) throw new AppError(404, 'CITIZEN_NOT_FOUND', 'Citizen not found');

  const year = new Date().getFullYear();
  const seq = await getNextSequence(`tax-${year}`);
  // Omitted amount means "read it off the scanned bill", which is the normal path now that the
  // officer attaches the bill instead of transcribing the figure. Kept distinct from 0, which
  // means a genuine nil demand and settles the record.
  const hasAmount = body.amount !== undefined && body.amount !== null && body.amount !== '';
  const amount = hasAmount ? Number(body.amount) : null;

  // Reuse the shared upload abstraction (Cloudinary or mock) — no duplicate logic.
  const bills = await uploadAttachments(files, 'tax');
  if (!bills.length && !hasAmount) {
    throw new AppError(
      400,
      'BILL_REQUIRED',
      'Attach the scanned bill, or enter the assessed amount',
    );
  }

  const record = await TaxRecord.create({
    taxRecordId: buildTaxRecordId(year, seq),
    citizenId: body.citizenId,
    propertyNumber: body.propertyNumber,
    taxType: body.taxType,
    financialYear: body.financialYear,
    amount,
    amountPaid: 0,
    balance: amount ?? 0,
    paymentStatus: amount === null || amount > 0 ? 'Unpaid' : 'Paid',
    dueDate: body.dueDate || undefined,
    bills,
    createdBy: officerId,
    history: [
      { action: 'create', field: 'amount', old: null, new: amount, by: officerId, at: new Date() },
    ],
  });

  await audit(officerId, 'tax.create', record, null, { taxRecordId: record.taxRecordId, amount });
  return record.toJSON();
}

/**
 * Update the record. Amount/propertyNumber/dueDate changes are appended to history —
 * previous values are preserved, never overwritten.
 * @param {string} id @param {string} officerId @param {object} body
 */
export async function updateRecord(id, officerId, body) {
  const record = await TaxRecord.findOne({ _id: id, isActive: true }).catch(() => null);
  if (!record) throw new AppError(404, 'TAX_NOT_FOUND', 'Tax record not found');

  const before = { amount: record.amount, propertyNumber: record.propertyNumber };
  const at = new Date();

  if (body.amount !== undefined && Number(body.amount) !== record.amount) {
    const oldAmount = record.amount;
    record.amount = Number(body.amount);
    record.history.push({
      action: 'update',
      field: 'amount',
      old: oldAmount,
      new: record.amount,
      by: officerId,
      at,
    });
  }
  if (body.propertyNumber !== undefined && body.propertyNumber !== record.propertyNumber) {
    const oldPn = record.propertyNumber;
    record.propertyNumber = body.propertyNumber;
    record.history.push({
      action: 'update',
      field: 'propertyNumber',
      old: oldPn,
      new: record.propertyNumber,
      by: officerId,
      at,
    });
  }
  if (body.dueDate !== undefined) {
    record.dueDate = body.dueDate || undefined;
    record.history.push({
      action: 'update',
      field: 'dueDate',
      old: null,
      new: record.dueDate,
      by: officerId,
      at,
    });
  }

  record.updatedBy = officerId;
  recompute(record);
  await record.save();

  await audit(officerId, 'tax.update', record, before, { amount: record.amount });
  return record.toJSON();
}

/**
 * Record a payment: append to payments[] + history[], recompute totals. Rejects an
 * amount that exceeds the outstanding balance.
 * @param {string} id @param {string} officerId @param {object} payload
 */
export async function addPayment(id, officerId, payload) {
  const record = await TaxRecord.findOne({ _id: id, isActive: true }).catch(() => null);
  if (!record) throw new AppError(404, 'TAX_NOT_FOUND', 'Tax record not found');

  const amount = Number(payload.amount);
  if (amount <= 0) throw new AppError(400, 'INVALID_PAYMENT', 'Payment must be greater than zero');
  // A record raised from a scanned bill has no assessed total, so there is no balance to exceed.
  // Refusing the receipt would be worse than accepting it: the citizen has paid either way.
  if (record.amount !== null && record.amount !== undefined && amount > record.balance) {
    throw new AppError(400, 'PAYMENT_EXCEEDS_BALANCE', 'Payment exceeds the outstanding balance');
  }

  const at = payload.paidAt ? new Date(payload.paidAt) : new Date();
  record.payments.push({
    amount,
    paidAt: at,
    receiptNo: payload.receiptNo || undefined,
    mode: payload.mode || undefined,
    receivedBy: officerId,
  });
  record.amountPaid += amount;
  record.history.push({
    action: 'payment',
    field: 'amountPaid',
    old: record.amountPaid - amount,
    new: record.amountPaid,
    by: officerId,
    at,
  });
  record.updatedBy = officerId;
  recompute(record);
  await record.save();

  await audit(officerId, 'tax.payment', record, null, { amount, amountPaid: record.amountPaid });

  // Notify the citizen a payment was recorded (in-app + SMS). Non-blocking.
  const citizen = await User.findById(record.citizenId).select('mobile');
  await notifyTaxUpdate({
    recipientId: record.citizenId,
    mobile: citizen?.mobile,
    taxRecordId: record.taxRecordId,
    message: `A payment of ₹${amount} was recorded for ${record.taxRecordId}. Balance: ₹${record.balance}.`,
    entityId: record.id,
  }).catch(() => {});

  return record.toJSON();
}

/** @param {string} id */
export async function getHistory(id) {
  const record = await TaxRecord.findOne({ _id: id, isActive: true }).catch(() => null);
  if (!record) throw new AppError(404, 'TAX_NOT_FOUND', 'Tax record not found');
  const json = record.toJSON();
  return { history: json.history, payments: json.payments };
}

function buildFilter(query) {
  const filter = { isActive: true };
  if (query.taxType) filter.taxType = query.taxType;
  if (query.financialYear) filter.financialYear = query.financialYear;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.citizenId) filter.citizenId = query.citizenId;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ taxRecordId: rx }, { propertyNumber: rx }];
  }
  return filter;
}

async function paginate(filter, query) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    TaxRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    TaxRecord.countDocuments(filter),
  ]);
  return { data: items.map((r) => r.toJSON()), total, page, limit };
}

/**
 * Officer tax list, with search and ward filtering.
 *
 * A tax record references a citizen; it does not copy their name or ward. Searching by either
 * therefore resolves citizens first and constrains the record query by the ids that come back.
 * Two `distinct` calls at most, regardless of how many records match — not one lookup per row.
 *
 * Ward and search are separate conditions on purpose. Ward narrows the whole result; `q` is a
 * disjunction over the record's own identifiers *or* the citizen's name. Folding them into one
 * `$or` would make a ward filter widen the result instead of narrowing it.
 */
export async function adminList(query) {
  const filter = buildFilter(query);
  const and = [];

  if (query.ward) {
    const wardIds = await citizenIdsFor({ ward: query.ward });
    // No citizen in that ward means no record in that ward. Returning early keeps the officer
    // from paging through every record because the filter silently did nothing.
    if (!wardIds || wardIds.length === 0) {
      const { page, limit } = parsePagination(query);
      return { data: [], total: 0, page, limit };
    }
    and.push({ citizenId: { $in: wardIds } });
  }

  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    const nameIds = (await citizenIdsFor({ name: query.q })) ?? [];
    // buildFilter already put the identifier arms in `$or`; replace it with the full
    // disjunction so a name match counts too, and so ward can sit beside it in `$and`.
    delete filter.$or;
    and.push({
      $or: [{ taxRecordId: rx }, { propertyNumber: rx }, { citizenId: { $in: nameIds } }],
    });
  }

  if (and.length) filter.$and = and;
  return paginate(filter, query);
}

/** @param {string} id */
export async function adminGetOne(id) {
  const record = await TaxRecord.findOne({ _id: id, isActive: true }).catch(() => null);
  if (!record) throw new AppError(404, 'TAX_NOT_FOUND', 'Tax record not found');
  return record.toJSON();
}

/**
 * Citizen's own records. Optional financialYear / taxType filter.
 * @param {string} citizenId @param {object} query
 */
export async function listMine(citizenId, query) {
  const filter = { citizenId, isActive: true };
  if (query.financialYear) filter.financialYear = query.financialYear;
  if (query.taxType) filter.taxType = query.taxType;

  const records = await TaxRecord.find(filter).sort({ financialYear: -1, taxType: 1 });
  const data = records.map((r) => r.toJSON());
  const totalDues = data.reduce((sum, r) => sum + r.balance, 0);
  return { data, totalDues };
}
