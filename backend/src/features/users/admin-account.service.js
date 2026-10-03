import { ROLES, ADMIN_ROLES } from '@dgp/shared';
import { User } from '../auth/user.model.js';
import { AuditLog } from '../audit/audit.model.js';
import { Complaint } from '../complaints/complaint.model.js';
import { CertificateApplication } from '../certificates/certificate.model.js';
import { TaxRecord } from '../tax/tax.model.js';
import { Notice } from '../notices/notice.model.js';
import { Scheme } from '../schemes/scheme.model.js';
import { TimetableEntry } from '../timetable/timetable.model.js';
import { AppError } from '../../utils/app-error.js';
import { hashPassword } from '../../utils/password.js';
import { writeAudit } from '../audit/audit.service.js';

/**
 * Root-admin management of officer accounts.
 *
 * Deliberately a thin layer over the same User collection, the same password hashing and the
 * same audit log that everything else uses — a second user store is how two sources of truth
 * about who may sign in get created.
 *
 * What is not here is as important as what is: no password ever leaves these functions (the
 * model's toJSON strips the hash), no role other than `officer` can be created, and nothing
 * is hard-deleted. Removal is the existing `isActive` flag, so a deactivated officer keeps
 * their name on the complaints they resolved and the certificates they issued.
 */

/** Officer and root-admin accounts, newest first. Never citizens. */
export async function listAdminAccounts() {
  const rows = await User.find({ role: { $in: ADMIN_ROLES } })
    .sort({ createdAt: -1 })
    .lean();

  return rows.map((u) => ({
    id: String(u._id),
    fullName: u.fullName,
    email: u.email ?? null,
    mobile: u.mobile ?? null,
    role: u.role,
    ward: u.ward ?? null,
    isActive: u.isActive !== false,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin ?? null,
  }));
}

/**
 * Create an officer account.
 *
 * `role` is not an input. The portal can mint officers and nothing else — a root admin is
 * provisioned by the seeding script alone, so no request, however authorised, can create one
 * or escalate an existing account into one.
 *
 * @param {{ actorId: string, body: { fullName, email, password, mobile?, ward? } }} params
 */
export async function createAdminAccount({ actorId, body }) {
  // Stored as typed: the officer signs in with exactly the address they were given.
  const email = String(body.email).trim();

  // The unique indexes would catch this too, but a duplicate-key error reads like a crash.
  const clash = await User.findOne({ email });
  if (clash) {
    throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists', {
      email: 'This email is already registered',
    });
  }
  if (body.mobile) {
    const mobileClash = await User.findOne({ mobile: body.mobile });
    if (mobileClash) {
      throw new AppError(409, 'MOBILE_EXISTS', 'An account with this mobile already exists', {
        mobile: 'This mobile is already registered',
      });
    }
  }

  const user = await User.create({
    role: ROLES.OFFICER,
    fullName: body.fullName.trim(),
    email,
    ...(body.mobile ? { mobile: body.mobile } : {}),
    ...(body.ward ? { ward: body.ward } : {}),
    passwordHash: await hashPassword(body.password),
  });

  await writeAudit({
    actorId,
    actorRole: ROLES.ROOT_ADMIN,
    action: 'admin.account.create',
    entity: 'users',
    entityId: user.id,
    // Identity only. The password and its hash are never written to the trail.
    after: { email: user.email, fullName: user.fullName, role: user.role },
  });

  return user.toJSON();
}

/**
 * Deactivate or reactivate an officer account.
 *
 * Three refusals, all of them about not locking the village out of its own portal:
 * a root admin cannot switch themselves off, cannot switch off the last remaining root
 * admin, and cannot reach a citizen through this route — citizens are managed on the
 * existing Users screen, which is unchanged.
 *
 * @param {{ id: string, actorId: string, isActive: boolean }} params
 */
export async function setAdminAccountStatus({ id, actorId, isActive }) {
  if (String(id) === String(actorId) && !isActive) {
    throw new AppError(400, 'CANNOT_SELF_DEACTIVATE', 'You cannot deactivate your own account');
  }

  const user = await User.findById(id).catch(() => null);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Account not found');

  if (!ADMIN_ROLES.includes(user.role)) {
    throw new AppError(400, 'NOT_AN_ADMIN_ACCOUNT', 'This is not an administrative account');
  }

  if (user.role === ROLES.ROOT_ADMIN && !isActive) {
    const otherActiveRoots = await User.countDocuments({
      role: ROLES.ROOT_ADMIN,
      isActive: true,
      _id: { $ne: user._id },
    });
    if (otherActiveRoots === 0) {
      throw new AppError(
        400,
        'LAST_ROOT_ADMIN',
        'The last root admin cannot be deactivated — the portal would have no one who can manage officers',
      );
    }
  }

  const before = { isActive: user.isActive };
  user.isActive = isActive;
  await user.save();

  await writeAudit({
    actorId,
    actorRole: ROLES.ROOT_ADMIN,
    action: isActive ? 'admin.account.activate' : 'admin.account.deactivate',
    entity: 'users',
    entityId: user.id,
    before,
    after: { isActive: user.isActive, email: user.email },
  });

  return user.toJSON();
}

/**
 * Everything this officer is on the record for.
 *
 * Deletion is refused if any of it exists, so the question has to be asked of the fields an
 * officer actually authors — not of a single table. A resolved complaint, an issued
 * certificate, a raised tax demand and a published notice all carry the id of whoever did it,
 * and a dangling id is a record that can no longer say who acted.
 *
 * Audit rows count only where the officer is the *actor*. Rows where they are merely the
 * subject — created by the root admin, deactivated by the root admin — are records about
 * them, and those survive deletion rather than preventing it.
 */
export async function countOfficerReferences(userId) {
  const [complaints, certificates, tax, notices, schemes, timetable, auditActions] =
    await Promise.all([
      Complaint.countDocuments({
        $or: [{ 'statusHistory.by': userId }, { 'remarks.officerId': userId }],
      }),
      CertificateApplication.countDocuments({
        $or: [
          { createdBy: userId },
          { updatedBy: userId },
          { reviewedBy: userId },
          { 'history.by': userId },
        ],
      }),
      TaxRecord.countDocuments({
        $or: [
          { createdBy: userId },
          { updatedBy: userId },
          { 'payments.receivedBy': userId },
          { 'history.by': userId },
        ],
      }),
      Notice.countDocuments({ createdBy: userId }),
      Scheme.countDocuments({ createdBy: userId }),
      TimetableEntry.countDocuments({ $or: [{ createdBy: userId }, { updatedBy: userId }] }),
      AuditLog.countDocuments({ actorId: userId }),
    ]);

  const breakdown = { complaints, certificates, tax, notices, schemes, timetable, auditActions };
  return { breakdown, total: Object.values(breakdown).reduce((a, b) => a + b, 0) };
}

/**
 * Permanently remove an officer account.
 *
 * Deliberately narrow. The portal's established way of removing someone is deactivation,
 * which keeps their name on the work they did; this exists only for the account that was
 * created in error and never used. If the officer is referenced anywhere, the call is refused
 * and the caller is told exactly what stands in the way, rather than the system silently
 * orphaning a complaint or a certificate.
 *
 * Nothing but the user document is removed. Audit rows naming this account as their subject
 * are kept, so the trail still shows that it existed, who created it and who deleted it.
 *
 * @param {{ id: string, actorId: string }} params
 */
export async function deleteAdminAccount({ id, actorId }) {
  if (String(id) === String(actorId)) {
    throw new AppError(400, 'CANNOT_SELF_DELETE', 'You cannot delete your own account');
  }

  const user = await User.findById(id).catch(() => null);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Account not found');

  if (!ADMIN_ROLES.includes(user.role)) {
    throw new AppError(400, 'NOT_AN_ADMIN_ACCOUNT', 'This is not an administrative account');
  }
  if (user.role === ROLES.ROOT_ADMIN) {
    throw new AppError(400, 'CANNOT_DELETE_ROOT_ADMIN', 'A root admin cannot be deleted');
  }

  const { breakdown, total } = await countOfficerReferences(user._id);
  if (total > 0) {
    throw new AppError(
      409,
      'ACCOUNT_HAS_HISTORY',
      'This officer is named on existing records, so the account cannot be deleted. Deactivate it instead — that blocks sign-in and keeps the history intact.',
      breakdown,
    );
  }

  const removed = { email: user.email, fullName: user.fullName, role: user.role };
  await User.deleteOne({ _id: user._id });

  await writeAudit({
    actorId,
    actorRole: ROLES.ROOT_ADMIN,
    action: 'admin.account.delete',
    entity: 'users',
    entityId: user._id,
    before: removed,
  });

  return { id: String(user._id), ...removed };
}
