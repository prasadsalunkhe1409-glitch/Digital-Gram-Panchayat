import mongoose from 'mongoose';
import { ROLES, WARDS } from '@dgp/shared';

const { Schema, model } = mongoose;

/**
 * Single users collection with a role discriminator (blueprint 4: shared auth logic,
 * simple role gate). Citizens are keyed by mobile, officers by email — both sparse
 * unique so one role's absence of the other's key never collides.
 */
const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: [ROLES.CITIZEN, ROLES.OFFICER, ROLES.ROOT_ADMIN],
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      match: /^[6-9]\d{9}$/,
    },
    /*
     * Stored exactly as it was entered.
     *
     * The field used to lowercase on write, which made `Admin@dgp.local` and
     * `admin@dgp.local` the same account. The unique index has no collation, so it is already
     * case-sensitive at the database level — dropping the setter is all that is needed for
     * two capitalisations to be two identities, and for a login to have to match the one that
     * was registered.
     */
    email: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    // Never selected by default — must be explicitly requested for login comparison.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    village: {
      type: String,
      trim: true,
    },
    /*
     * The citizen's ward.
     *
     * Required at registration, optional in the schema. Those are not in conflict: accounts
     * created before wards existed have none, and making the field required would make every
     * one of them fail to save the next time an officer touched it. Nothing is backfilled —
     * an officer assigns the ward from User Management, and until then it reads "Ward not set".
     */
    ward: {
      type: String,
      enum: { values: [...WARDS, null], message: 'Invalid ward' },
      default: null,
      index: true,
    },
    address: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

export const User = model('User', userSchema);
