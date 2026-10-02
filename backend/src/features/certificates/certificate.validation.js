import { body, param, query } from 'express-validator';
import { CERT_TYPES, CERT_TYPES_ALL, DAKHALA_STATUSES } from '@dgp/shared';
import { WARD_FILTER_VALUES } from '../../utils/ward.js';

// Per-type applicationData required fields are validated in the service (dynamic).
export const applyValidation = [
  // CERT_TYPES (not _ALL): this is the one place a withdrawn type must be refused.
  body('certificateType').isIn(CERT_TYPES).withMessage('Choose a valid certificate type'),
];

export const idParamValidation = [param('id').isMongoId().withMessage('Invalid application id')];

export const rejectValidation = [
  param('id').isMongoId().withMessage('Invalid application id'),
  body('reason').trim().isLength({ min: 3 }).withMessage('A rejection reason is required'),
];

export const listQueryValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(DAKHALA_STATUSES),
  // _ALL here, so an officer can still filter the historical Residence applications.
  query('certificateType').optional().isIn(CERT_TYPES_ALL),
  // Resolved through the applicant — see adminList. _FILTER_VALUES so an officer can
  // also pull up the applications whose citizen has no ward recorded.
  query('ward').optional().isIn(WARD_FILTER_VALUES),
];

/**
 * An officer recording a certificate directly. Same type gate as a citizen application —
 * Residence is withdrawn for new certificates however they are raised — plus the citizen the
 * certificate belongs to, which a citizen application takes from the token instead.
 */
export const officerCreateValidation = [
  body('certificateType').isIn(CERT_TYPES).withMessage('Choose a valid certificate type'),
  body('citizenId').isMongoId().withMessage('Choose the citizen this certificate is for'),
];
