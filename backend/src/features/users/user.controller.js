import { successResponse } from '@dgp/shared';
import { asyncHandler } from '../../utils/async-handler.js';
import * as userService from './user.service.js';

export const list = asyncHandler(async (req, res) => {
  res.status(200).json(successResponse(await userService.listUsers(req.query)));
});

export const getOne = asyncHandler(async (req, res) => {
  res.status(200).json(successResponse(await userService.getUser(req.params.id)));
});

export const setStatus = asyncHandler(async (req, res) => {
  const user = await userService.setStatus(req.params.id, req.user.id, req.body.status);
  res.status(200).json(successResponse(user));
});

export const setWard = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(successResponse(await userService.setWard(req.params.id, req.user.id, req.body.ward)));
});
