import { ROLES, WARDS } from '@dgp/shared';
import { wardCondition } from '../../utils/ward.js';
import { parsePagination } from '../../utils/pagination.js';
import { User } from '../auth/user.model.js';
import { AppError } from '../../utils/app-error.js';
import { writeAudit } from '../audit/audit.service.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Officer user list with search / role+status filter / pagination.
 * @param {object} query
 */
export async function listUsers(query) {
  const { page, limit, skip } = parsePagination(query);

  const filter = {};
  // Default to citizens (officers manage citizen accounts, blueprint 5.7).
  filter.role = query.role || ROLES.CITIZEN;
  // Account state is stored as the boolean isActive; the API exposes active|inactive.
  if (query.status) filter.isActive = query.status === 'active';
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ fullName: rx }, { mobile: rx }, { email: rx }];
  }
  // Composable with q and status: an officer narrowing to one ward keeps their search.
  const ward = wardCondition(query.ward);
  if (ward !== null) filter.ward = ward;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { data: items.map((u) => u.toJSON()), total, page, limit };
}

/** @param {string} id */
export async function getUser(id) {
  const user = await User.findById(id).catch(() => null);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  return user.toJSON();
}

/**
 * Activate/deactivate a user. An officer cannot deactivate their own account.
 * A deactivated user's token is rejected on the next request (auth middleware).
 * @param {string} id @param {string} officerId @param {'active'|'inactive'} status
 */
export async function setStatus(id, officerId, status) {
  if (String(id) === String(officerId) && status === 'inactive') {
    throw new AppError(400, 'CANNOT_SELF_DEACTIVATE', 'You cannot deactivate your own account');
  }
  const user = await User.findById(id).catch(() => null);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

  const before = { isActive: user.isActive };
  user.isActive = status === 'active';
  await user.save();

  await writeAudit({
    actorId: officerId,
    actorRole: ROLES.OFFICER,
    action: 'user.status.update',
    entity: 'users',
    entityId: user.id,
    before,
    after: { isActive: user.isActive },
  });

  return user.toJSON();
}

/**
 * Assign or correct a citizen's ward.
 *
 * The only way an account created before wards existed gets one. Deliberately an officer
 * action rather than a migration: nobody can know which ward a citizen lives in from the
 * data, so guessing would put real people in the wrong administrative list.
 *
 * @param {string} id @param {string} officerId @param {string} ward
 */
export async function setWard(id, officerId, ward) {
  if (!WARDS.includes(ward)) {
    throw new AppError(400, 'INVALID_WARD', 'Invalid ward');
  }
  const user = await User.findById(id).catch(() => null);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  if (user.role !== ROLES.CITIZEN) {
    throw new AppError(400, 'NOT_A_CITIZEN', 'Only a citizen account has a ward');
  }

  const before = { ward: user.ward };
  user.ward = ward;
  await user.save();

  await writeAudit({
    actorId: officerId,
    actorRole: ROLES.OFFICER,
    action: 'user.ward.update',
    entity: 'users',
    entityId: user.id,
    before,
    after: { ward: user.ward },
  });

  return user.toJSON();
}
