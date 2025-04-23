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
      throw error;
    }
  }

  async getUserNotifications(userId: string, limit: number = 20, page: number = 1) {
    const skip = (page - 1) * limit;
    
    const notificationsList = await notifications.find({ recipient_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    return notificationsList;
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    return notifications.countDocuments({ recipient_id: userId, is_read: false });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await notifications.findById(notificationId);
    
    if (!notification) {
      throw new CustomError('Notification not found', 404);
    }
    
    if (notification.recipient_id !== userId) {
      throw new CustomError('Unauthorized access to notification', 403);
    }
    
    notification.is_read = true;
    await notification.save();
    
    return notification;
  }

  async markAllAsRead(userId: string) {
    const result = await notifications.updateMany(
      { recipient_id: userId, is_read: false },
      { $set: { is_read: true } }
    );
    
    return { modifiedCount: result.modifiedCount };
  }
}