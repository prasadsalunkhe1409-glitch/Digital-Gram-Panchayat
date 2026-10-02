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
} from './user.validation.js';

/** Officer user management — mounted at /api/v1/admin/users. */
export const adminUserRouter = Router();

adminUserRouter.use(authenticate, authorize(ROLES.OFFICER));

adminUserRouter.get('/', listUsersValidation, validate, controller.list);
adminUserRouter.get('/:id', userIdParamValidation, validate, controller.getOne);
adminUserRouter.patch('/:id/status', statusValidation, validate, controller.setStatus);
adminUserRouter.patch('/:id/ward', wardValidation, validate, controller.setWard);
