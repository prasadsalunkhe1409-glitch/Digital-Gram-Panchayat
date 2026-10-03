import { body, param, query } from 'express-validator';
import { ROLES, WARDS } from '@dgp/shared';
import { WARD_FILTER_VALUES } from '../../utils/ward.js';

export const listUsersValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn([ROLES.CITIZEN, ROLES.OFFICER]),
  query('status').optional().isIn(['active', 'inactive']),
  // _FILTER_VALUES, not WARDS: the officer may also ask for the accounts with no ward.
  query('ward').optional().isIn(WARD_FILTER_VALUES),
];

export const userIdParamValidation = [param('id').isMongoId().withMessage('Invalid user id')];

export const statusValidation = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
];

export const wardValidation = [
  param('id').isMongoId().withMessage('Invalid user id'),
  // WARDS only: 'unset' is a filter token, never something an officer can assign.
  body('ward').isIn(WARDS).withMessage('Choose a valid ward'),
];

/**
 * Creating an officer account. `role` is deliberately absent: the service always writes
 * `officer`, so no request can mint a root admin or escalate one.
 */
export const createAdminValidation = [
  body('fullName').trim().isLength({ min: 2, max: 120 }).withMessage('Enter the full name'),
  // No normalizeEmail(): it lowercases, and the identifier is case-sensitive.
  body('email').trim().isEmail().withMessage('Enter a valid email'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters'),
  body('mobile')
    .optional({ values: 'falsy' })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit mobile'),
  body('ward').optional({ values: 'falsy' }).isIn(WARDS).withMessage('Choose a valid ward'),
];

export const adminStatusValidation = [
  param('id').isMongoId().withMessage('Invalid account id'),
  body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
];
