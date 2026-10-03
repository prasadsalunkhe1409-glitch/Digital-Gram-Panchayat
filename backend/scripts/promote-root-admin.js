/**
 * Promote an existing officer account to root admin.
 *
 *   node scripts/promote-root-admin.js                       # admin@dgp.local
 *   ROOT_ADMIN_EMAIL=someone@example.org node scripts/promote-root-admin.js
 *
 * Deliberately separate from seed-admin.js, which writes a password hash. This touches the
 * `role` field and nothing else: the account keeps its email, its password, its login history
 * and everything it has ever done. Promoting the person already running the portal is the
 * normal case, and resetting their password to do it would be a worse outcome than the
 * problem it solves.
 *
 * The promotion is recorded in the audit log as a system action, because a change in who may
 * add and remove officers should never be invisible.
 */
import { ROLES, ADMIN_ROLES } from '@dgp/shared';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { User } from '../src/features/auth/user.model.js';
import { writeAudit } from '../src/features/audit/audit.service.js';
import { logger } from '../src/utils/logger.js';

const email = (process.env.ROOT_ADMIN_EMAIL || 'admin@dgp.local').trim();

async function run() {
  await connectDatabase();

  const user = await User.findOne({ email, role: { $in: ADMIN_ROLES } });

  if (!user) {
    logger.error(`No administrative account found for "${email}".`);
    logger.error('Create one first with: npm run seed:admin -w backend');
    await disconnectDatabase();
    process.exit(1);
  }

  if (user.role === ROLES.ROOT_ADMIN) {
    logger.info(`"${email}" is already the root admin — nothing to do.`);
    await disconnectDatabase();
    return;
  }

  const before = { role: user.role };
  user.role = ROLES.ROOT_ADMIN;
  // Only `role` is assigned. passwordHash, email, fullName, isActive and lastLogin are left
  // exactly as they were, so the existing credentials keep working unchanged.
  await user.save();

  await writeAudit({
    actorId: user._id,
    actorRole: 'system',
    action: 'admin.account.promote',
    entity: 'users',
    entityId: user._id,
    before,
    after: { role: user.role, email: user.email },
  });

  logger.info(`Promoted "${email}" to ${ROLES.ROOT_ADMIN}. The password is unchanged.`);
  await disconnectDatabase();
}

run().catch(async (err) => {
  logger.error('Promotion failed', err);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
