import { successResponse } from '@dgp/shared';
import { asyncHandler } from '../../utils/async-handler.js';
import * as service from './timetable.service.js';

/** GET /api/v1/timetable — the published schedule, grouped by service. */
export const publicTimetable = asyncHandler(async (_req, res) => {
  res.status(200).json(successResponse(await service.publicTimetable()));
});

export const list = asyncHandler(async (req, res) => {
  res.status(200).json(successResponse(await service.adminList(req.query)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(successResponse(await service.createEntry(req.user.id, req.body)));
});

export const update = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(successResponse(await service.updateEntry(req.params.id, req.user.id, req.body)));
});

export const remove = asyncHandler(async (req, res) => {
  res.status(200).json(successResponse(await service.deleteEntry(req.params.id, req.user.id)));
});
