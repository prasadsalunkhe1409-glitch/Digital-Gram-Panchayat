import { successResponse } from '@dgp/shared';
import { asyncHandler } from '../../utils/async-handler.js';
import * as taxService from './tax.service.js';

// ---- Citizen (view-only) ----
export const listMine = asyncHandler(async (req, res) => {
  const result = await taxService.listMine(req.user.id, req.query);
  res.status(200).json(successResponse(result));
});

// ---- Officer ----
export const searchCitizens = asyncHandler(async (req, res) => {
  const citizens = await taxService.searchCitizens({ q: req.query.q, ward: req.query.ward });
  res.status(200).json(successResponse(citizens));
});

export const adminList = asyncHandler(async (req, res) => {
  const result = await taxService.adminList(req.query);
  res.status(200).json(successResponse(result));
});

export const adminGetOne = asyncHandler(async (req, res) => {
  const record = await taxService.adminGetOne(req.params.id);
  res.status(200).json(successResponse(record));
});

export const create = asyncHandler(async (req, res) => {
  const record = await taxService.createRecord({
    officerId: req.user.id,
    body: req.body,
    files: req.files,
  });
  res.status(201).json(successResponse(record));
});

export const update = asyncHandler(async (req, res) => {
  const record = await taxService.updateRecord(req.params.id, req.user.id, req.body);
  res.status(200).json(successResponse(record));
});

export const addPayment = asyncHandler(async (req, res) => {
  const record = await taxService.addPayment(req.params.id, req.user.id, req.body);
  res.status(201).json(successResponse(record));
});

export const history = asyncHandler(async (req, res) => {
  const result = await taxService.getHistory(req.params.id);
  res.status(200).json(successResponse(result));
});
