import { successResponse } from '@dgp/shared';
import { asyncHandler } from '../../utils/async-handler.js';
import * as service from './timetable.service.js';

/**
 * GET /api/v1/timetable — the published schedule, grouped by service.
 *
 * Public, and stays public. `attachUserIfPresent` means a signed-in citizen gets their own
 * ward's rounds while an anonymous visitor still gets the village-wide schedule, without the
 * page turning into a login wall.
 */
export const publicTimetable = asyncHandler(async (req, res) => {
  res.status(200).json(successResponse(await service.publicTimetable(req.user?.ward ?? null)));
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
