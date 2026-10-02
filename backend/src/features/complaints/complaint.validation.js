import { WARD_FILTER_VALUES } from '../../utils/ward.js';
import { body, param, query } from 'express-validator';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from '@dgp/shared';

export const createComplaintValidation = [
  body('category').isIn(COMPLAINT_CATEGORIES).withMessage('Choose a valid category'),
  body('title').trim().isLength({ min: 3, max: 120 }).withMessage('Title is required'),
  body('description').trim().isLength({ min: 5, max: 2000 }).withMessage('Description is required'),
  body('latitude')
    .optional({ values: 'falsy' })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('longitude')
    .optional({ values: 'falsy' })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
];

export const complaintIdParamValidation = [
  param('id').isMongoId().withMessage('Invalid complaint id'),
];

export const updateStatusValidation = [
  param('id').isMongoId().withMessage('Invalid complaint id'),
  body('status').isIn(COMPLAINT_STATUSES).withMessage('Invalid status'),
  body('remark')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remark is too long'),
  body('remark').custom((value, { req }) => {
    if (req.body.status === 'Resolved' && (!value || !value.trim())) {
      throw new Error('A remark is required when resolving a complaint');
    }
    return true;
  }),
];

export const listQueryValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(COMPLAINT_STATUSES),
  query('category').optional().isIn(COMPLAINT_CATEGORIES),
  /*
   * The service already read `query.ward` and built a filter from it, but nothing validated
   * it — an unchecked value went straight into a Mongo filter. Stored complaint wards are
   * free text from before this change, so 'unset' here matches null and '' as well.
   */
  query('ward').optional().isIn(WARD_FILTER_VALUES),
];
