import { ROLES } from '@dgp/shared';
import { AppError } from '../utils/app-error.js';

/**
 * Gate a route to one or more roles. Must run after authenticate (needs req.user).
 * A citizen token hitting an officer-only route gets 403 (blueprint 4.2.2).
 *
 * A root admin counts as an officer wherever officer access is required. That is what makes
 * the role additive: the twenty existing `authorize(ROLES.OFFICER)` routes keep their exact
 * behaviour, and only the handful of root-admin-only routes name ROOT_ADMIN explicitly. It
 * works one way only — asking for ROOT_ADMIN never admits a plain officer, and asking for
 * CITIZEN never admits either of them.
 *
 * @param {...('citizen'|'officer'|'root_admin')} roles
 */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }
    const satisfied =
      roles.includes(req.user.role) ||
      (req.user.role === ROLES.ROOT_ADMIN && roles.includes(ROLES.OFFICER));
    if (!satisfied) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have access to this resource'));
      return;
    }
    next();
  };
}
