import express from 'express';
import {
  saveFCMToken,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/firebaseNotificationController.js';
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Save FCM token for push notifications
router.post('/fcm-token', verifyToken, saveFCMToken);

// Mark notification as read
router.patch('/:notificationId/read', verifyToken, markAsRead);

// Mark all as read
router.patch('/read-all', verifyToken, markAllAsRead);

// Delete notification
router.delete('/:notificationId', verifyToken, deleteNotification);

export default router;