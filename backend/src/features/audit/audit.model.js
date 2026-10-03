import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Append-only audit trail (blueprint 5.10 / 4 auditlogs). Loosely references any entity
 * by kind + id — no hard ref, so any feature can log without coupling.
 */
const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: {
      type: String,
      // root_admin joins the existing three. Without it `writeAudit` fails validation and the
      // error is swallowed by design, so a privileged action would go unrecorded.
      enum: ['citizen', 'officer', 'root_admin', 'system'],
      required: true,
    },
    action: { type: String, required: true }, // e.g. complaint.create, complaint.status.update
    entity: { type: String, required: true }, // collection name
    entityId: { type: Schema.Types.ObjectId },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    at: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

export const AuditLog = model('AuditLog', auditLogSchema);
