import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../../middleware/asyncHandler.ts';
import { CustomError } from '../../utils/customError.utils.ts';
import { NotificationRepository } from '../../repositories/notification.repository.ts';
import { UserRepository } from '../../repositories/user.repository.ts';

const notificationRepo = new NotificationRepository();
const userRepository = new UserRepository();

/**
 * Get all notifications for the logged-in user
 */
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
  const { notifications: rawNotifications, total } = await notificationRepo.getUserNotifications(userId as string, limit, page);
  
  const unReadCount = await notificationRepo.getUnreadNotificationsCount(userId as string);
  

  if (!rawNotifications || rawNotifications.length === 0) {
    return res.status(200).json({
      notifications: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      }
    });
  }

  // Format notifications with sender details
  const formattedNotifications = await Promise.all(
    rawNotifications.map(async (notification) => {
      const sender = await userRepository.findByUserId(notification.sender_id);
      
      return {
        id: notification._id,
        sender: {
          id: notification.sender_id,
          firstName: sender?.bio?.first_name || '',
          lastName: sender?.bio?.last_name || '',
          profilePhoto: sender?.profile_photo || null
        },
        createdAt: notification.created_at,
        content: notification.content || '',
        referenceId: notification.reference_id || null,
        type: notification.type,
        isRead: notification.is_read,
      };
    })
  );
  
  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;
  
  return res.status(200).json({
    notifications: formattedNotifications,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage
    },
    unReadCount: unReadCount || 0
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