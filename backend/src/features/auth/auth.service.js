import { ROLES, ADMIN_ROLES } from '@dgp/shared';
import { User } from './user.model.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import { AppError } from '../../utils/app-error.js';
import { notifyWelcome } from '../notifications/notification.service.js';

/**
 * Register a citizen. Mobile must be unique. Returns sanitized user + JWT.
 * @param {{ fullName: string, mobile: string, password: string, village: string, address: string, ward: string, email?: string }} input
 */
export async function registerCitizen(input) {
  const existing = await User.findOne({ mobile: input.mobile });
  if (existing) {
    throw new AppError(409, 'MOBILE_EXISTS', 'This mobile number is already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    role: ROLES.CITIZEN,
    fullName: input.fullName,
    mobile: input.mobile,
    email: input.email || undefined,
    village: input.village,
    address: input.address,
    ward: input.ward,
    passwordHash,
  });

  // Fire a welcome in-app notification. Never let it break registration.
  await notifyWelcome({ recipientId: user.id, fullName: user.fullName }).catch(() => {});

  const token = signToken({ id: user.id, role: user.role });
  return { user: user.toJSON(), token };
}

/**
 * Log a citizen in with mobile + password.
 * @param {{ mobile: string, password: string }} input
 */
export async function loginCitizen({ mobile, password }) {
  const user = await User.findOne({ mobile, role: ROLES.CITIZEN }).select('+passwordHash');
  await assertActiveCredentials(user, password);

  user.lastLogin = new Date();
  await user.save();

  const token = signToken({ id: user.id, role: user.role });
  return { user: user.toJSON(), token };
}

/**
 * Single shared login: one identifier field that may hold a mobile number (citizen) or an
 * email address (officer or citizen with email). Finds the account whichever way the user
 * identifies themselves, verifies the password, and returns the JWT plus role — the shared
 * login page routes the browser to the right app from the role. The role-specific endpoints
 * above stay untouched for backward compatibility.
 * @param {{ identifier: string, password: string }} input
 */
export async function loginUnified({ identifier, password }) {
  const id = String(identifier || '').trim();
  // Exact match on the identifier. Lowercasing here would re-introduce the behaviour where
  // any capitalisation of a registered email authenticates as that account.
  const query = /^[6-9]\d{9}$/.test(id) ? { mobile: id } : { email: id };
  const user = await User.findOne(query).select('+passwordHash');
  await assertActiveCredentials(user, password);

  user.lastLogin = new Date();
  await user.save();

  const token = signToken({ id: user.id, role: user.role });
  return { user: user.toJSON(), token };
}

/**
 * Log an officer (admin portal) in with email + password.
 *
 * A root admin signs in through this same door — it is an officer account with one extra
 * privilege, not a second authentication system. `assertActiveCredentials` still applies, so
 * a deactivated account of either role is refused here exactly as before.
 *
 * @param {{ email: string, password: string }} input
 */
export async function loginOfficer({ email, password }) {
  const user = await User.findOne({
    // Exact match — see loginUnified.
    email,
    role: { $in: ADMIN_ROLES },
  }).select('+passwordHash');
  await assertActiveCredentials(user, password);

  user.lastLogin = new Date();
  await user.save();

  const token = signToken({ id: user.id, role: user.role });
  return { user: user.toJSON(), token };
}

/**
 * @param {string} userId
 */
export async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return user.toJSON();
}

/**
 * @param {string} userId
 * @param {{ fullName?: string, village?: string, address?: string, email?: string }} updates
 */
export async function updateProfile(userId, updates) {
  const allowed = {
    fullName: updates.fullName,
    village: updates.village,
    address: updates.address,
    email: updates.email || undefined,
  };
  const user = await User.findByIdAndUpdate(userId, allowed, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return user.toJSON();
}

/**
 * Same generic failure for missing user, wrong password, or deactivated account —
 * no user enumeration (blueprint 5.1 security).
 */
async function assertActiveCredentials(user, password) {
  const invalid = new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  if (!user) throw invalid;

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw invalid;

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account has been deactivated');
  }
}
