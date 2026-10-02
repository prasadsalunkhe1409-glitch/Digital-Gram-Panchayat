import { WARDS, WARD_UNSET, TIMETABLE_WARDS } from '@dgp/shared';
import { User } from '../features/auth/user.model.js';

/**
 * Every value an officer's ward filter may carry, for records that belong to a person —
 * users, complaints, tax, certificates. A person lives in one of the six wards or in none
 * yet; 'All Wards' is not somewhere anyone lives.
 */
export const WARD_FILTER_VALUES = [...WARDS, WARD_UNSET];

/**
 * The same, for records that have an applicability rather than a residence. A timetable slot
 * may be village-wide, so the officer must be able to filter for exactly those too.
 */
export const TIMETABLE_WARD_FILTER_VALUES = [...TIMETABLE_WARDS, WARD_UNSET];

/**
 * A Mongo condition for a stored `ward` field.
 *
 * `unset` is a filter token, never a stored value: nothing was backfilled, so records that
 * predate the ward field hold null (or an empty string, for the free-text ward complaints
 * carried before this). Both have to match, or the officer cleaning up old records cannot
 * find them.
 */
export function wardCondition(value) {
  if (!value) return null;
  if (value === WARD_UNSET) return { $in: [null, ''] };
  return value;
}

/**
 * Citizen ids for a ward and/or a name search, for the collections that reference a citizen
 * instead of storing a ward of their own — tax records and certificates.
 *
 * Returns `null` when neither filter was asked for, meaning "do not constrain by citizen".
 * Returns `[]` when the filters matched nobody, which the caller must treat as an empty
 * result rather than an absent filter — the difference between "no ward given" and "no such
 * citizen" is the difference between every row and none.
 *
 * One query, not one per row: the ids come back in a single `distinct`, so adding a name or
 * ward filter costs one extra round trip regardless of page size.
 *
 * @param {{ ward?: string, name?: string }} params
 * @returns {Promise<string[]|null>}
 */
export async function citizenIdsFor({ ward, name } = {}) {
  const filter = {};
  if (ward) {
    const cond = wardCondition(ward);
    if (cond !== null) filter.ward = cond;
  }
  if (name) {
    filter.fullName = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  if (Object.keys(filter).length === 0) return null;

  return User.distinct('_id', filter);
}
