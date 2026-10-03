import multer from 'multer';
import { MAX_UPLOAD_SIZE_BYTES, MAX_COMPLAINT_PHOTOS } from '@dgp/shared';
import { AppError } from '../utils/app-error.js';
import { verifyUploadedFiles } from '../utils/file-signature.js';

// Files held in memory, streamed to Cloudinary — never written to local disk.
const storage = multer.memoryStorage();

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only JPG, PNG, or WEBP images are allowed'));
  },
});

/**
 * Accept up to MAX_COMPLAINT_PHOTOS images under the `images` field, translating multer's
 * own errors into our uniform AppError envelope.
 */
export function uploadComplaintImages(req, res, next) {
  const handler = upload.array('images', MAX_COMPLAINT_PHOTOS);
  handler(req, res, (err) => {
    if (!err) {
      // Client mimetype passed multer's filter; now confirm the real bytes match it.
      verifyUploadedFiles(req, res, next);
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'FILE_TOO_LARGE', 'Each image must be 5MB or smaller'));
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      next(
        new AppError(
          400,
          'TOO_MANY_FILES',
          `You can upload at most ${MAX_COMPLAINT_PHOTOS} images`,
        ),
      );
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'Image upload failed'));
  });
}

const ALLOWED_ATTACHMENT_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const attachmentUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_ATTACHMENT_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new AppError(400, 'INVALID_FILE_TYPE', 'Attachment must be a PDF or image'));
  },
});

/**
 * Accept a single optional notice attachment (PDF or image, <=5MB) under `attachment`.
 */
export function uploadNoticeAttachment(req, res, next) {
  const handler = attachmentUpload.single('attachment');
  handler(req, res, (err) => {
    if (!err) {
      // Client mimetype passed multer's filter; now confirm the real bytes match it.
      verifyUploadedFiles(req, res, next);
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'FILE_TOO_LARGE', 'The attachment must be 5MB or smaller'));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'Attachment upload failed'));
  });
}

/**
 * Accept up to 5 certificate supporting documents (PDF/image, <=5MB each) under `documents`.
 */
export function uploadCertificateDocuments(req, res, next) {
  const handler = attachmentUpload.array('documents', 5);
  handler(req, res, (err) => {
    if (!err) {
      // Client mimetype passed multer's filter; now confirm the real bytes match it.
      verifyUploadedFiles(req, res, next);
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'FILE_TOO_LARGE', 'Each document must be 5MB or smaller'));
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      next(new AppError(400, 'TOO_MANY_FILES', 'You can upload at most 5 documents'));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'Document upload failed'));
  });
}

/**
 * Certificate issuance at the counter: up to 5 supporting documents under `documents`, plus
 * the single prepared certificate the officer issues, under `certificate`.
 *
 * The two fields are held to different rules on purpose. A citizen's supporting document is
 * usually a phone photograph of a paper record, so images are accepted there. The issued
 * certificate is the official artefact and must be a PDF: an image of a certificate is not a
 * certificate, and once stored it is what the citizen downloads forever after.
 *
 * The declared type is only the claim. `verifyUploadedFiles` then reads the leading bytes, so
 * a JPEG renamed to .pdf is rejected before the service ever sees it.
 */
const issuedCertificateUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    if (file.fieldname === 'certificate') {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
        return;
      }
      cb(new AppError(400, 'INVALID_FILE_TYPE', 'The certificate must be a PDF'));
      return;
    }
    if (ALLOWED_ATTACHMENT_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new AppError(400, 'INVALID_FILE_TYPE', 'Attachment must be a PDF or image'));
  },
});

export function uploadIssuedCertificate(req, res, next) {
  const handler = issuedCertificateUpload.fields([
    { name: 'documents', maxCount: 5 },
    { name: 'certificate', maxCount: 1 },
  ]);
  handler(req, res, (err) => {
    if (!err) {
      verifyUploadedFiles(req, res, next);
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'FILE_TOO_LARGE', 'Each file must be 5MB or smaller'));
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      next(new AppError(400, 'TOO_MANY_FILES', 'You can upload at most 5 documents'));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'Upload failed'));
  });
}

/**
 * Accept up to 5 tax-bill scans (PDF/image, <=5MB each) under `bills`. Reuses the shared
 * attachment upload — no duplicate upload logic. No-ops on JSON requests (backward compatible).
 */
export function uploadTaxBills(req, res, next) {
  const handler = attachmentUpload.array('bills', 5);
  handler(req, res, (err) => {
    if (!err) {
      // Client mimetype passed multer's filter; now confirm the real bytes match it.
      verifyUploadedFiles(req, res, next);
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'FILE_TOO_LARGE', 'Each bill must be 5MB or smaller'));
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      next(new AppError(400, 'TOO_MANY_FILES', 'You can upload at most 5 bills'));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'Bill upload failed'));
  });
}

/**
 * Village profile media: one optional `logo` and one optional `banner` image. Both optional —
 * a profile save that only edits text sends neither.
 */
export function uploadVillageImages(req, res, next) {
  const handler = upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]);
  handler(req, res, (err) => {
    if (!err) {
      // Client mimetype passed multer's filter; now confirm the real bytes match it.
      verifyUploadedFiles(req, res, next);
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'FILE_TOO_LARGE', 'Each image must be 5MB or smaller'));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'Image upload failed'));
  });
}

/**
 * Scheme media: one optional banner image under `image` plus up to 5 optional PDF/image
 * attachments under `attachments`. Uses the attachment filter (PDF or image); the service
 * additionally requires the `image` field to actually be an image.
 */
export function uploadSchemeFiles(req, res, next) {
  const handler = attachmentUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'attachments', maxCount: 5 },
  ]);
  handler(req, res, (err) => {
    if (!err) {
      // Client mimetype passed multer's filter; now confirm the real bytes match it.
      verifyUploadedFiles(req, res, next);
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'FILE_TOO_LARGE', 'Each file must be 5MB or smaller'));
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      next(new AppError(400, 'TOO_MANY_FILES', 'You can upload at most 5 attachments'));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'File upload failed'));
  });
}

/**
 * Accept a single optional image (<=5MB) under `image` — reuses the image-only filter.
 */
export function uploadSingleImage(req, res, next) {
  const handler = upload.single('image');
  handler(req, res, (err) => {
    if (!err) {
      // Client mimetype passed multer's filter; now confirm the real bytes match it.
      verifyUploadedFiles(req, res, next);
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'FILE_TOO_LARGE', 'The image must be 5MB or smaller'));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'Image upload failed'));
  });
}

/**
 * Gram Sabha meeting media: the statutory notice PDF, an optional banner image, and (after the
 * meeting) the minutes PDF — each optional, each at most one file. Uses the attachment filter,
 * so a PDF or an image is accepted and the real bytes are verified afterwards.
 */
export function uploadMeetingFiles(req, res, next) {
  const handler = attachmentUpload.fields([
    { name: 'notice', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
    { name: 'minutes', maxCount: 1 },
  ]);
  handler(req, res, (err) => {
    if (!err) {
      verifyUploadedFiles(req, res, next);
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'FILE_TOO_LARGE', 'Each file must be 5MB or smaller'));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'File upload failed'));
  });
}

/** A single published document (form, circular, map, report) under `file`. */
export function uploadDocumentFile(req, res, next) {
  const handler = attachmentUpload.single('file');
  handler(req, res, (err) => {
    if (!err) {
      verifyUploadedFiles(req, res, next);
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'FILE_TOO_LARGE', 'The document must be 5MB or smaller'));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'Document upload failed'));
  });
}

/** Up to 6 progress photos for a development project, under `photos`. */
export function uploadProjectPhotos(req, res, next) {
  const handler = upload.array('photos', 6);
  handler(req, res, (err) => {
    if (!err) {
      verifyUploadedFiles(req, res, next);
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'FILE_TOO_LARGE', 'Each image must be 5MB or smaller'));
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      next(new AppError(400, 'TOO_MANY_FILES', 'You can upload at most 6 photos'));
      return;
    }
    next(new AppError(400, 'UPLOAD_ERROR', 'Photo upload failed'));
  });
}
