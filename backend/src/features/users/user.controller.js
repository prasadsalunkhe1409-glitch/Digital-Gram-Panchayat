import { successResponse } from '@dgp/shared';
import { asyncHandler } from '../../utils/async-handler.js';
import * as userService from './user.service.js';
import * as adminAccounts from './admin-account.service.js';

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

/* ---------------------------------------------------------------- root-admin: officer accounts */

export const listAdminAccounts = asyncHandler(async (_req, res) => {
  res.status(200).json(successResponse(await adminAccounts.listAdminAccounts()));
});

export const createAdminAccount = asyncHandler(async (req, res) => {
  const created = await adminAccounts.createAdminAccount({
    actorId: req.user.id,
    body: req.body,
  });
  res.status(201).json(successResponse(created));
});

export const setAdminAccountStatus = asyncHandler(async (req, res) => {
  const updated = await adminAccounts.setAdminAccountStatus({
    id: req.params.id,
    actorId: req.user.id,
    isActive: req.body.status === 'active',
  });
  res.status(200).json(successResponse(updated));
});

export const deleteAdminAccount = asyncHandler(async (req, res) => {
  const removed = await adminAccounts.deleteAdminAccount({
    id: req.params.id,
    actorId: req.user.id,
  });
  res.status(200).json(successResponse(removed));
});
