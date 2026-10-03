import { successResponse } from '@dgp/shared';
import { asyncHandler } from '../../utils/async-handler.js';
import * as service from './certificate.service.js';

// ---- Citizen ----
export const apply = asyncHandler(async (req, res) => {
  const app = await service.apply({ citizenId: req.user.id, body: req.body, files: req.files });
  res.status(201).json(successResponse(app));
});

export const listMine = asyncHandler(async (req, res) => {
  const result = await service.listMine(req.user.id, req.query);
  res.status(200).json(successResponse(result));
});

export const getOne = asyncHandler(async (req, res) => {
  const app = await service.getOne(req.params.id, req.user);
  res.status(200).json(successResponse(app));
});

export const getCertificate = asyncHandler(async (req, res) => {
  const result = await service.getCertificate(req.params.id, req.user);
  res.status(200).json(successResponse(result));
});

// ---- Officer ----
export const adminList = asyncHandler(async (req, res) => {
  const result = await service.adminList(req.query);
  res.status(200).json(successResponse(result));
});

export const adminGetOne = asyncHandler(async (req, res) => {
  const app = await service.adminGetOne(req.params.id);
  res.status(200).json(successResponse(app));
});

export const review = asyncHandler(async (req, res) => {
  const app = await service.review(req.params.id, req.user.id);
  res.status(200).json(successResponse(app));
});

export const approve = asyncHandler(async (req, res) => {
  // `fields()` upload, so the prepared certificate arrives under req.files.certificate.
  const [certificate] = req.files?.certificate ?? [];
  const app = await service.approve(
    req.params.id,
    req.user.id,
    { applicationData: req.body?.applicationData, officerRemarks: req.body?.officerRemarks },
    certificate ?? null,
  );
  res.status(200).json(successResponse(app));
});

// ---- Public (no auth) ----
export const verify = asyncHandler(async (req, res) => {
  const result = await service.verifyCertificate({
    verificationId: req.query.verificationId,
    certificateNumber: req.query.certificateNumber,
  });
  res.status(200).json(successResponse(result));
});

export const reject = asyncHandler(async (req, res) => {
  const app = await service.reject(req.params.id, req.user.id, req.body.reason);
  res.status(200).json(successResponse(app));
});

export const remove = asyncHandler(async (req, res) => {
  const result = await service.softDelete(req.params.id, req.user.id);
  res.status(200).json(successResponse(result));
});

/** POST /api/v1/admin/dakhala — officer records and issues a certificate directly. */
export const officerCreate = asyncHandler(async (req, res) => {
  res.status(201).json(
    successResponse(
      await service.createByOfficer({
        officerId: req.user.id,
        body: req.body,
        files: req.files?.documents ?? [],
        certificateFile: (req.files?.certificate ?? [])[0] ?? null,
      }),
    ),
  );
});
