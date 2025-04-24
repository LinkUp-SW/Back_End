import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../../middleware/asyncHandler.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import { NotificationRepository } from '../../repositories/notification.repository.ts';

const notificationRepo = new NotificationRepository();

/**
 * Get all notifications for the logged-in user
 */
const getNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  
  // Get notifications and total count
  const { notifications, total } = await notificationRepo.getUserNotifications(userId as string, limit, page);
  
  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;
  
  return res.status(200).json({
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage
    }
  });
});

/**
 * Get unread notifications count
 */
const getUnreadNotificationsCount = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  const count = await notificationRepo.getUnreadNotificationsCount(userId as string);
  
  return res.status(200).json({ count });
});

/**
 * Mark notification as read
 */
const markNotificationAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user;
  const { notificationId } = req.params;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  await notificationRepo.markAsRead(notificationId, userId as string);
  
  return res.status(200).json({ message: 'Notification marked as read' });
});

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.user;
  
  if (!userId) {
    throw new CustomError('User not authenticated', 401);
  }
  
  const result = await notificationRepo.markAllAsRead(userId as string);
  
  return res.status(200).json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
});

export {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
};