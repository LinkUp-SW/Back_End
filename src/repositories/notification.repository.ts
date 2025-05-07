import notifications, { NotificationType } from '../models/notifications.model.ts';
import { CustomError } from '../utils/customError.utils.ts';
import { UserRepository } from './user.repository.ts';
import mongoose from 'mongoose';

const userRepository = new UserRepository();

export class NotificationRepository {
  async createNotification(
    recipientId: string, 
    senderId: string, 
    type: NotificationType, 
    referenceId?: mongoose.Types.ObjectId, 
    content?: string
  ) {
    try {
      // Check if users exist
      const [recipient, sender] = await Promise.all([
        userRepository.findByUserId(recipientId),
        userRepository.findByUserId(senderId)
      ]);
      
      if (!recipient || !sender) {
        throw new CustomError('User not found', 404);
      }

      const notification = await notifications.create({
        recipient_id: recipientId,
        sender_id: senderId,
        type,
        reference_id: referenceId,
        content,
        is_read: false
      });

      return notification;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error('CustomError:', error.message, error.statusCode);
        return null;
      }
      throw error;
    }
  }

  async getUserNotifications(userId: string, limit: number, page: number) {
    try {
      const skip = (page - 1) * limit;
      const [userNotifications, total] = await Promise.all([
        notifications.find({ recipient_id: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        notifications.countDocuments({ recipient_id: userId }),
      ]);
      return { notifications: userNotifications, total };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw new CustomError('Failed to fetch notifications', 500);
    }
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    try {
      const count = await notifications.countDocuments({ recipient_id: userId, is_read: false });
      return count;
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
      throw new CustomError('Failed to fetch unread notifications count', 500);
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await notifications.findOneAndUpdate(
        { _id: notificationId, recipient_id: userId, is_read: false },
        { $set: { is_read: true } },
        { new: true } // Return the updated notification
      );
      if (!notification) {
        throw new CustomError('Notification not found or already read', 404);
      }
      return notification;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error('CustomError:', error.message, error.statusCode);
        return null;
      }
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const result = await notifications.updateMany(
        { recipient_id: userId, is_read: false },
        { $set: { is_read: true } }
      );
      return result.modifiedCount;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new CustomError('Failed to mark notifications as read', 500);
    }
  }
}