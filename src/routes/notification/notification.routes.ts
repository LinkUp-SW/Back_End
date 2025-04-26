import express from 'express';
import * as notificationController from '../../controllers/notification/notification.controller.ts';
import { authorizeMessaging } from '../../middleware/authMiddleware.ts';

const router = express.Router();

// Get all notifications {/api/notifications/get-notifications}
router.get('/get-notifications', authorizeMessaging, notificationController.getNotifications);

// Get unread notifications count {/api/notifications/unread-count}
router.get('/unread-count', authorizeMessaging, notificationController.getUnreadNotificationsCount);

// Mark notification as read {/api/notifications/:notificationId/read}
router.put('/:notificationId/read', authorizeMessaging, notificationController.markNotificationAsRead);

// Mark all notifications as read {/api/notifications/read-all}
router.put('/read-all', authorizeMessaging, notificationController.markAllNotificationsAsRead);

export default router;