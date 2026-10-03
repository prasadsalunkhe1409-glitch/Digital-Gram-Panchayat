import { Router } from 'express';
import { ROLES } from '@dgp/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  uploadCertificateDocuments,
  uploadIssuedCertificate,
} from '../../middlewares/upload.middleware.js';
import { certificateLimiter, generalLimiter } from '../../middlewares/rate-limit.middleware.js';
import * as controller from './certificate.controller.js';
import {
  applyValidation,
  idParamValidation,
  rejectValidation,
  listQueryValidation,
  officerCreateValidation,
} from './certificate.validation.js';

/**
 * Public certificate verification — no auth. Mounted at /api/v1/certificates.
 * Rate-limited to blunt certificate-number enumeration.
 */
export const certificateVerifyRouter = Router();
certificateVerifyRouter.get('/verify', generalLimiter, controller.verify);

/** Citizen certificate routes — mounted at /api/v1/dakhala. */
export const dakhalaRouter = Router();

dakhalaRouter.use(authenticate);

dakhalaRouter.post(
  '/',
  certificateLimiter,
  authorize(ROLES.CITIZEN),
  uploadCertificateDocuments,
  applyValidation,
  validate,
  controller.apply,
);
dakhalaRouter.get('/mine', authorize(ROLES.CITIZEN), controller.listMine);
dakhalaRouter.get('/:id', idParamValidation, validate, controller.getOne);
dakhalaRouter.get('/:id/certificate', idParamValidation, validate, controller.getCertificate);

/** Officer certificate routes — mounted at /api/v1/admin/dakhala. */
export const adminDakhalaRouter = Router();

adminDakhalaRouter.use(authenticate, authorize(ROLES.OFFICER));

adminDakhalaRouter.get('/', listQueryValidation, validate, controller.adminList);
// Supporting documents plus the prepared certificate; same magic-byte check either way.
adminDakhalaRouter.post(
  '/',
  uploadIssuedCertificate,
  officerCreateValidation,
  validate,
  controller.officerCreate,
);
adminDakhalaRouter.get('/:id', idParamValidation, validate, controller.adminGetOne);
adminDakhalaRouter.patch('/:id/review', idParamValidation, validate, controller.review);
adminDakhalaRouter.patch(
  '/:id/approve',
  uploadIssuedCertificate,
  idParamValidation,
  validate,
  controller.approve,
);
adminDakhalaRouter.patch('/:id/reject', rejectValidation, validate, controller.reject);
adminDakhalaRouter.delete('/:id', idParamValidation, validate, controller.remove);
