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
