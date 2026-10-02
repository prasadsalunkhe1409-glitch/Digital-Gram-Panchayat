# Certificate (Dakhala) API (Milestone 7)

Base: `/api/v1`. Envelope `{ success, data }` / `{ success, error }`. JWT required.

## Citizen

### POST /dakhala

Apply. `multipart/form-data`. Role: **citizen**.

| Field           | Type        | Notes                                                              |
| --------------- | ----------- | ------------------------------------------------------------------ |
| certificateType | string      | Marriage / Birth / Death / SevenTwelve / Other                     |
| applicationData | JSON string | type-specific fields (see below); required keys validated per type |
| documents       | file[]      | optional, ≤5, PDF or image, ≤5MB each                              |

`201` → the application (`applicationId` like `DKH-2026-000001`, `status: "Submitted"`).
`400` if a required per-type field is missing.

### GET /dakhala/mine

Own applications, paginated. Query: `status`, `page`, `limit`.

### GET /dakhala/:id

Single application. Role: **citizen (owner)** or **officer**. `403` for another citizen's.

### GET /dakhala/:id/certificate

Access-controlled certificate URL. Owner or officer, and only when **Approved**.
`200` → `{ applicationId, pdfUrl }`; `403` if not owner/officer; `404` if not approved yet.

## Officer — role **officer**

### GET /admin/dakhala

List with filter + pagination. Query: `q` (applicationId), `status`, `certificateType`, `page`, `limit`.

### GET /admin/dakhala/:id

Single application (any).

### PATCH /admin/dakhala/:id/review

Move `Submitted` → `UnderReview` (idempotent otherwise).

### PATCH /admin/dakhala/:id/approve

Generate the PDF certificate, store it, set `Approved` + `pdfUrl`, notify the citizen, audit.
Idempotent if already Approved; `409` if already Rejected.

### PATCH /admin/dakhala/:id/reject

Body: `{ reason }` (**required**, ≥3 chars → `400` otherwise). Sets `Rejected` + `rejectionReason`,
notifies the citizen, audits. `409` if already Approved.

### DELETE /admin/dakhala/:id

**Internal soft delete** (`isActive: false`). Never exposed to citizens.

## Per-type required fields (`applicationData`)

- **Marriage**: groomName, brideName, marriageDate, marriagePlace, mobile, address
- _Residence_ is withdrawn from new applications. Existing Residence records still read,
  download and appear in the officer filter; `POST` rejects the type with 400.
- **Income**: fullName, annualIncome, occupation, purpose
- **Birth**: childName, dateOfBirth, placeOfBirth, fatherName, motherName
- **Death**: deceasedName, dateOfDeath, placeOfDeath, relationToApplicant
- **Character**: fullName, purpose
- **Other**: fullName, details, purpose

Single source: `CERT_TYPE_FIELDS` in `@dgp/shared` — the citizen form renders from it and the
backend validates against it.

## Certificate issuance (on approve)

Approving an application generates the official certificate. The service:

1. applies optional officer edits — `PATCH /admin/dakhala/:id/approve` accepts an optional body
   `{ applicationData?, officerRemarks? }`; `applicationData` is merged over the existing data
   and re-validated for the type. An approve with no body behaves exactly as before.
2. mints a unique **certificate number** `CERT-<TYPE>-<YEAR>-<seq>` (distinct from the
   `applicationId`), an opaque **verificationId**, and an **issuedAt** timestamp;
3. renders a **QR** PNG of the verification URL (`CORS_ORIGIN_CITIZEN/verify/<verificationId>`);
4. loads the **Village Profile** for Gram Panchayat / village branding;
5. generates the PDF and stores it, then marks Approved, notifies + audits.

These fields are optional + sparse-unique on the model, so Approved applications created before
this feature remain valid.

## Public verification (no auth)

### GET /certificates/verify?verificationId= | certificateNumber=

Public, rate-limited. Looks a certificate up by its scanned `verificationId` or by
`certificateNumber`. Returns only a non-sensitive summary and never leaks a 404:

```json
{
  "valid": true,
  "status": "Approved",
  "certificateType": "Marriage",
  "certificateNumber": "CERT-RES-2026-000123",
  "applicantName": "…",
  "issuedAt": "…"
}
```

Unknown values return `{ "valid": false }`; a request with neither param returns `400`. The
citizen app serves this at `/verify` (manual number lookup) and `/verify/:id` (the QR target).

## PDF generation

Isolated in `certificate/pdf.service.js` (PDFKit) → returns a Buffer, uploaded via the shared upload
abstraction. Template: royal-blue government double border, faint diagonal watermark of the Gram
Panchayat name, Government-of-Maharashtra header with the Village-Profile-driven panchayat/village
names, certificate number, embedded QR, applicant + type-specific details, officer remarks,
official-seal slot (the village logo when configured) + signature slot, and a verification footer
(certificate number + verification id). All issued-certificate params are optional so callers
passing only `application/citizen/officer` still work. A Devanagari TTF dropped at
`backend/assets/fonts/` is auto-registered to enable Marathi rendering (English until then).

### Adding a future certificate type

Add the type to `CERT_TYPES` + its fields to `CERT_TYPE_FIELDS`/`CERT_DOC_REQUIREMENTS` in
`@dgp/shared`, a title in `pdf.service.js` `TITLES`, and a code in `CERT_TYPE_CODE`
(`certificate.service.js`). No other change — the apply form, validation, PDF, QR, and
verification all derive from those maps.

## Notes

- Every apply / review / approve / reject / delete writes an `auditlogs` entry.
- Approve + reject call the notification service (`dakhalaUpdate`, mock SMS in M1–M7).
- Documents + generated PDF use Cloudinary (mock URL when unconfigured).
