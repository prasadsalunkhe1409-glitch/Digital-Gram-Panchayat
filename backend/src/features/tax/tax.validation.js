import { body, param, query } from 'express-validator';
import { TAX_TYPES, PAYMENT_STATUSES } from '@dgp/shared';
import { WARD_FILTER_VALUES } from '../../utils/ward.js';

export const citizenSearchValidation = [
  // A fragment, not a whole number: one character is enough to start narrowing, and the
  // service escapes it before it reaches a RegExp.
  query('q').trim().isLength({ min: 1, max: 80 }).withMessage('Enter a name or number to search'),
  query('ward').optional({ values: 'falsy' }).isIn(WARD_FILTER_VALUES),
];

export const createTaxValidation = [
  body('citizenId').isMongoId().withMessage('Valid citizen is required'),
  body('propertyNumber').trim().notEmpty().withMessage('Property number is required'),
  body('taxType').isIn(TAX_TYPES).withMessage('Invalid tax type'),
  body('financialYear')
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Financial year must look like 2025-2026'),
  // Optional: the officer may attach the scanned bill instead. The service rejects a record
  // that carries neither.
  body('amount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('Amount cannot be negative'),
  body('dueDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid due date'),
];

export const updateTaxValidation = [
  param('id').isMongoId().withMessage('Invalid tax record id'),
  body('propertyNumber').optional({ values: 'falsy' }).trim().notEmpty(),
  body('amount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('Amount cannot be negative'),
  body('dueDate').optional({ values: 'falsy' }).isISO8601(),
];

export const paymentValidation = [
  param('id').isMongoId().withMessage('Invalid tax record id'),
  body('amount').isFloat({ gt: 0 }).withMessage('Payment must be greater than zero'),
  body('paidAt').optional({ values: 'falsy' }).isISO8601(),
  body('receiptNo').optional({ values: 'falsy' }).trim().isLength({ max: 60 }),
  body('mode').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
];

export const taxIdParamValidation = [param('id').isMongoId().withMessage('Invalid tax record id')];

export const listQueryValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('taxType').optional().isIn(TAX_TYPES),
  query('paymentStatus').optional().isIn(PAYMENT_STATUSES),
  query('financialYear')
    .optional()
    .matches(/^\d{4}-\d{4}$/),
  // `q` was read by the service but never declared here. Bounded, so a pathological regex
  // source cannot be pushed through the search path.
  query('q').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
  query('ward').optional().isIn(WARD_FILTER_VALUES),
];

export const mineQueryValidation = [
  query('taxType').optional().isIn(TAX_TYPES),
  query('financialYear')
    .optional()
    .matches(/^\d{4}-\d{4}$/),
];
