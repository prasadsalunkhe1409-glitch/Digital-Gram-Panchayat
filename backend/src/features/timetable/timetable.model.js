import mongoose from 'mongoose';
import { TIMETABLE_SERVICES, TIMETABLE_DAYS, TIMETABLE_WARDS } from '@dgp/shared';

const { Schema, model } = mongoose;

/**
 * One published slot in a village service schedule — when the Ghantagadi reaches a ward, when
 * the water supply runs.
 *
 * A row, not a document. The alternative was one record per service holding a week of slots,
 * which makes "change Tuesday's time" a read-modify-write of the whole week and makes two
 * officers editing different days overwrite each other. A row per slot is also what the
 * citizen screen groups and what an officer publishes or withdraws individually.
 *
 * Nothing here is seeded. A village that has not entered its schedule shows an empty state,
 * because a made-up timing on a public page is worse than no timing: a citizen stands at the
 * roadside with their bin at a time nobody collects.
 */
const timetableEntrySchema = new Schema(
  {
    serviceType: { type: String, enum: TIMETABLE_SERVICES, required: true, index: true },

    // Bilingual, stored side by side the way notices and schemes already are, so a village
    // can publish in Marathi alone, English alone, or both.
    title: { type: String, required: true, trim: true },
    titleMr: { type: String, default: '', trim: true },

    /**
     * Which ward this slot applies to, or 'All Wards' for a village-wide schedule.
     *
     * Distinct from `area` below, which stays exactly as it was: `area` is descriptive — the
     * lane, the tank, the stretch of road — and is printed for the citizen to recognise.
     * `ward` is administrative: it decides who the slot is shown to and which officer filter
     * it falls under. Collapsing the two would make a filter depend on prose.
     *
     * Nullable, and null is not backfilled. Entries published before wards existed were
     * published to the whole village, so they keep being shown to the whole village — the one
     * reading that neither hides a live schedule nor claims it belongs to a ward it may not.
     */
    ward: {
      type: String,
      enum: { values: [...TIMETABLE_WARDS, null], message: 'Invalid ward' },
      default: null,
      index: true,
    },

    /** Which lane, tank or stretch this slot covers. Descriptive, not administrative. */
    area: { type: String, default: '', trim: true },
    areaMr: { type: String, default: '', trim: true },

    day: { type: String, enum: TIMETABLE_DAYS, required: true, index: true },
    // 24-hour "HH:mm". Stored as a string, not a Date: this is a recurring wall-clock time
    // with no date attached, and a Date would drag a timezone into a village timetable.
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, default: '', trim: true },

    note: { type: String, default: '', trim: true },
    noteMr: { type: String, default: '', trim: true },

    isPublished: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// The citizen query: published slots for a service, in the order an officer arranged them.
timetableEntrySchema.index({
  isActive: 1,
  isPublished: 1,
  ward: 1,
  serviceType: 1,
  displayOrder: 1,
});

export const TimetableEntry = model('TimetableEntry', timetableEntrySchema);
