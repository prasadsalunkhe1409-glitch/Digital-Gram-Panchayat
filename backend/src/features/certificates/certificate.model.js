import mongoose from 'mongoose';
import { CERT_TYPES_ALL, DAKHALA_STATUSES } from '@dgp/shared';

const { Schema, model } = mongoose;

const documentSchema = new Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['pdf', 'image'], required: true },
    name: { type: String },
    // Which requirement the file satisfies (e.g. 'identity') and what it is (e.g. 'Aadhaar').
    // Optional so applications created before this change still load unchanged.
    group: { type: String },
    docType: { type: String },
  },
  { _id: false },
);

// Append-only status trail.
const statusEntrySchema = new Schema(
  {
    status: { type: String, enum: DAKHALA_STATUSES, required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const certificateSchema = new Schema(
  {
    applicationId: { type: String, required: true, unique: true },
    citizenId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // CERT_TYPES_ALL, not CERT_TYPES: the enum has to admit every type already stored.
    // Residence is closed to new applications by the create validator, not by the schema —
    // narrowing the schema would make existing Residence records fail to save.
    certificateType: { type: String, enum: CERT_TYPES_ALL, required: true, index: true },
    applicationData: { type: Schema.Types.Mixed, default: {} },
    uploadedDocuments: { type: [documentSchema], default: [] },
    status: { type: String, enum: DAKHALA_STATUSES, default: 'Submitted', index: true },
    rejectionReason: { type: String },
    // Auto-generated bilingual { en, mr } of the rejection reason.
    rejectionReasonI18n: { type: Schema.Types.Mixed },
    pdfUrl: { type: String },

    // ---- Issued-certificate fields (set on approval; all optional so pre-existing
    // Approved applications created before this feature still load unchanged) ----
    // Human-facing serial, distinct from applicationId, e.g. CERT-RES-2026-000123.
    certificateNumber: { type: String },
    // Opaque public token embedded in the QR code and used by the public verify page.
    verificationId: { type: String },
    issuedAt: { type: Date },
    // Officer-authored remarks printed on the certificate (optional).
    officerRemarks: { type: String },
    // Increments each time an approved certificate is re-generated / re-issued.
    reissueCount: { type: Number, default: 0 },
    history: { type: [statusEntrySchema], default: [] },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    // Internal soft delete only — never exposed to citizens.
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

certificateSchema.index({ createdAt: -1 });
// Serve the list queries (filter + newest-first) without scans.
certificateSchema.index({ citizenId: 1, createdAt: -1 }); // citizen "my applications"
certificateSchema.index({ status: 1, createdAt: -1 }); // officer status filter
// Sparse + unique: only issued certificates carry these, and each value is one-of-a-kind.
certificateSchema.index({ certificateNumber: 1 }, { unique: true, sparse: true });
certificateSchema.index({ verificationId: 1 }, { unique: true, sparse: true });

export const CertificateApplication = model('CertificateApplication', certificateSchema);
