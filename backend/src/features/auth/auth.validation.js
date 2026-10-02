import { body } from 'express-validator';
import { VALIDATION, WARDS } from '@dgp/shared';

export const registerValidation = [
  body('fullName')
    .trim()
    .isLength({ min: VALIDATION.FULLNAME_MIN_LENGTH, max: VALIDATION.FULLNAME_MAX_LENGTH })
    .withMessage('Full name is required'),
  body('mobile').matches(VALIDATION.MOBILE_REGEX).withMessage(VALIDATION.MOBILE_MESSAGE),
  body('password')
    .isLength({ min: VALIDATION.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`),
  body('village').trim().notEmpty().withMessage('Village is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  // Required here and nowhere else. The schema leaves ward optional so accounts created
  // before wards existed still save; this is the one gate new accounts pass through.
  body('ward').isIn(WARDS).withMessage('Choose your ward'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid email'),
];

export const loginValidation = [
  body('mobile').matches(VALIDATION.MOBILE_REGEX).withMessage(VALIDATION.MOBILE_MESSAGE),
  body('password').notEmpty().withMessage('Password is required'),
];

export const officerLoginValidation = [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

/** Shared login page: one field holding either a mobile number or an email address. */
export const unifiedLoginValidation = [
  body('identifier')
    .trim()
    .custom((value) => {
      if (VALIDATION.MOBILE_REGEX.test(value) || VALIDATION.EMAIL_REGEX.test(value)) return true;
      throw new Error('Enter a valid mobile number or email address');
    }),
  body('password').notEmpty().withMessage('Password is required'),
];

export const updateProfileValidation = [
  body('fullName')
    .trim()
    .isLength({ min: VALIDATION.FULLNAME_MIN_LENGTH, max: VALIDATION.FULLNAME_MAX_LENGTH })
    .withMessage('Full name is required'),
  body('village').trim().notEmpty().withMessage('Village is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid email'),
];
