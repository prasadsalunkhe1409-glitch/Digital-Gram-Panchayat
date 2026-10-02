import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ROLES, TIMETABLE_SERVICES, TIMETABLE_DAYS, TIME_HHMM_PATTERN } from '@dgp/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as controller from './timetable.controller.js';

const entryValidation = [
  body('serviceType').isIn(TIMETABLE_SERVICES).withMessage('Choose a valid service'),
  body('title').trim().isLength({ min: 2, max: 120 }).withMessage('Title is required'),
  body('titleMr').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('day').isIn(TIMETABLE_DAYS).withMessage('Choose a valid day'),
  body('startTime').matches(TIME_HHMM_PATTERN).withMessage('Use a 24-hour time like 07:30'),
  // Optional: a Ghantagadi slot is often a single arrival time, not a window.
  body('endTime').optional({ values: 'falsy' }).matches(TIME_HHMM_PATTERN),
  body('area').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('areaMr').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('noteMr').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('displayOrder').optional({ values: 'falsy' }).isInt({ min: 0, max: 999 }).toInt(),
];

// A patch: every field optional, but anything supplied is held to the create rules. Leaving
// update unvalidated is how a malformed time reaches a public page.
const entryUpdateValidation = [
  param('id').isMongoId().withMessage('Invalid timetable entry id'),
  body('serviceType').optional({ values: 'falsy' }).isIn(TIMETABLE_SERVICES),
  body('title').optional({ values: 'falsy' }).trim().isLength({ min: 2, max: 120 }),
  body('titleMr').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('day').optional({ values: 'falsy' }).isIn(TIMETABLE_DAYS),
  body('startTime').optional({ values: 'falsy' }).matches(TIME_HHMM_PATTERN),
  body('endTime').optional({ values: 'falsy' }).matches(TIME_HHMM_PATTERN),
  body('area').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('areaMr').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('noteMr').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('displayOrder').optional({ values: 'falsy' }).isInt({ min: 0, max: 999 }).toInt(),
];

const idParam = [param('id').isMongoId().withMessage('Invalid timetable entry id')];

/** Public schedule — mounted at /api/v1/timetable. Published entries only. */
export const timetableRouter = Router();
timetableRouter.get('/', controller.publicTimetable);

/** Officer management — mounted at /api/v1/admin/timetable. */
export const adminTimetableRouter = Router();
adminTimetableRouter.use(authenticate, authorize(ROLES.OFFICER));
adminTimetableRouter.get(
  '/',
  [query('serviceType').optional().isIn(TIMETABLE_SERVICES)],
  validate,
  controller.list,
);
adminTimetableRouter.post('/', entryValidation, validate, controller.create);
adminTimetableRouter.put('/:id', entryUpdateValidation, validate, controller.update);
adminTimetableRouter.delete('/:id', idParam, validate, controller.remove);
