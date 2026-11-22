import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as notificationService from '../services/notificationService';

export const listMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const unreadOnly = req.query.unreadOnly === 'true';
  const notifications = await notificationService.listNotificationsForUser(req.auth!.userId, unreadOnly);
  res.status(200).json({ data: notifications });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markNotificationRead(req.auth!.userId, req.params.notificationId);
  res.status(204).send();
});

export const listPreferences = asyncHandler(async (req: Request, res: Response) => {
  const prefs = await notificationService.listNotificationPreferences(req.auth!.userId);
  res.status(200).json({ data: prefs });
});

export const setPreference = asyncHandler(async (req: Request, res: Response) => {
  const pref = await notificationService.setNotificationPreference(
    req.auth!.userId,
    req.body.type,
    req.body.inAppEnabled,
    req.body.emailEnabled
  );
  res.status(200).json({ data: pref });
});
