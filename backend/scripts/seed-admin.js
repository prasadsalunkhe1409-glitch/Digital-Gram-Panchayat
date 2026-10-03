/**
 * Seed one officer (admin-portal) account. Officers are never self-registered
 * (blueprint 5.1) — run this once per environment to create the first login.
 *
 *   node scripts/seed-admin.js
 *
 * Credentials come from env (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME)
 * or fall back to safe local-dev defaults. Idempotent: updates the password if the
 * officer already exists.
 *
 * Set SEED_ADMIN_ROLE=root_admin to provision the one account that may add and remove
 * officers. This script is the only way a root admin comes into existence — nothing in the
 * running application can create or escalate one, however privileged the caller. Run it from
 * an operator shell with the credentials in the environment, never committed:
 *
 *   SEED_ADMIN_EMAIL=root@example.org SEED_ADMIN_PASSWORD=... SEED_ADMIN_ROLE=root_admin  *     node scripts/seed-admin.js
 */
import { ROLES, ADMIN_ROLES } from '@dgp/shared';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { User } from '../src/features/auth/user.model.js';
import { hashPassword } from '../src/utils/password.js';
import { logger } from '../src/utils/logger.js';

const email = (process.env.SEED_ADMIN_EMAIL || 'admin@dgp.local').trim();
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
const fullName = process.env.SEED_ADMIN_NAME || 'Panchayat Officer';

// Officer unless explicitly asked for the root admin. Any other value is a typo, and a typo
// that silently seeded the wrong privilege would be the worst kind.
const requestedRole = (process.env.SEED_ADMIN_ROLE || ROLES.OFFICER).toLowerCase();
if (![ROLES.OFFICER, ROLES.ROOT_ADMIN].includes(requestedRole)) {
  logger.error(`SEED_ADMIN_ROLE must be "${ROLES.OFFICER}" or "${ROLES.ROOT_ADMIN}"`);
  process.exit(1);
}

async function run() {
  await connectDatabase();

  const passwordHash = await hashPassword(password);
  const existing = await User.findOne({ email, role: { $in: ADMIN_ROLES } });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.fullName = fullName;
    existing.isActive = true;
    // Promotion is explicit and operator-driven. The account is never demoted here: dropping
    // the last root admin by re-running the script with the default role would lock the
    // portal out of its own account management.
    if (requestedRole === ROLES.ROOT_ADMIN) existing.role = ROLES.ROOT_ADMIN;
    await existing.save();
    logger.info(`${existing.role} updated: ${email}`);
  } else {
    await User.create({ role: requestedRole, fullName, email, passwordHash });
    logger.info(`${requestedRole} created: ${email}`);
  }

  logger.info(`Login with email "${email}" and the seeded password.`);
  await disconnectDatabase();
}

run().catch(async (err) => {
  logger.error('Seed failed', err);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
