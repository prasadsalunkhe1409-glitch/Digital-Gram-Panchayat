import { AppError } from '../utils/app-error.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../features/auth/user.model.js';

/**
 * Verify the Bearer JWT, confirm the user still exists and is active, and attach
 * { id, role } to req.user. Rejects missing/invalid/expired tokens and deactivated
 * accounts (blueprint: deactivated user's token rejected on next request).
 */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const token = header.slice(7).trim();
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Session expired, please log in again');
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new AppError(401, 'UNAUTHORIZED', 'Account is no longer active');
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Identify the caller if they happen to be signed in, and carry on if they are not.
 *
 * For routes that are public by design but can personalise themselves — the timetable is
 * public so a villager can check the Ghantagadi without an account, yet a signed-in citizen
 * should see their own ward's rounds rather than all six.
 *
 * Deliberately silent: a missing, malformed, expired or deactivated token leaves `req.user`
 * undefined and the request proceeds as anonymous. It never rejects, because rejecting would
 * turn a public page into a login wall the moment a token went stale in someone's browser.
 * Anything that must not be public still goes behind `authenticate`.
 */
export async function attachUserIfPresent(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      const payload = verifyToken(header.slice(7).trim());
      const user = await User.findById(payload.sub);
      if (user && user.isActive) {
        req.user = { id: user.id, role: user.role, ward: user.ward ?? null };
      }
    }
  } catch {
    // Anonymous is a valid outcome here, not an error.
  }
  next();
}
