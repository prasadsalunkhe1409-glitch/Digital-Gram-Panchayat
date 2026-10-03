import { Router } from 'express';
import { ROLES } from '@dgp/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as controller from './user.controller.js';
import {
  listUsersValidation,
  userIdParamValidation,
  statusValidation,
  wardValidation,
  createAdminValidation,
  adminStatusValidation,
} from './user.validation.js';

/** Officer user management — mounted at /api/v1/admin/users. */
export const adminUserRouter = Router();

adminUserRouter.use(authenticate, authorize(ROLES.OFFICER));

adminUserRouter.get('/', listUsersValidation, validate, controller.list);
adminUserRouter.get('/:id', userIdParamValidation, validate, controller.getOne);
adminUserRouter.patch('/:id/status', statusValidation, validate, controller.setStatus);
adminUserRouter.patch('/:id/ward', wardValidation, validate, controller.setWard);

/**
 * Root-admin management of officer accounts — mounted at /api/v1/admin/admins.
 *
 * A separate router rather than extra routes on the officer one, because the gate is
 * different: ROOT_ADMIN only, which `authorize` does not satisfy from an officer token. The
 * officer routes above are untouched and behave exactly as they did.
 */
export const rootAdminRouter = Router();

rootAdminRouter.use(authenticate, authorize(ROLES.ROOT_ADMIN));

rootAdminRouter.get('/', controller.listAdminAccounts);
rootAdminRouter.post('/', createAdminValidation, validate, controller.createAdminAccount);
rootAdminRouter.patch(
  '/:id/status',
  adminStatusValidation,
  validate,
  controller.setAdminAccountStatus,
);
rootAdminRouter.delete('/:id', userIdParamValidation, validate, controller.deleteAdminAccount);
