// =====================================================
// FIXED Firebase Notification Controller
// Fix the documentPath error in sendPushNotification
// =====================================================

import { db, messaging, admin } from '../config/firebase.js';

// =====================================================
// CREATE NOTIFICATION IN FIRESTORE
// =====================================================
export const createNotification = async (userId, notificationData) => {
  try {
    const notification = {
      userId: userId.toString(), // Make sure it's a string
      type: notificationData.type || 'system',
      title: notificationData.title,
      message: notificationData.message,
      link: notificationData.link || null,
      icon: notificationData.icon || '🔔',
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      readAt: null
    };

    const docRef = await db.collection('notifications').add(notification);
    
    return { 
      success: true, 
      id: docRef.id,
      notification: { ...notification, id: docRef.id }
    };
  } catch (error) {
    console.error('Create notification error:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// SEND PUSH NOTIFICATION (FCM) - FIXED VERSION
// =====================================================
export const sendPushNotification = async (userId, notificationData) => {
  try {
    // Convert userId to string to ensure valid document path
    const userIdString = userId.toString();
    
    console.log('📱 Attempting to send push notification to user:', userIdString);
    
    // Get user's FCM token from Firestore
    const userDocRef = db.collection('users').doc(userIdString);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      console.log('⚠️ User document not found:', userIdString);
      return { success: false, message: 'User document not found' };
    }
    
    const userData = userDoc.data();
    
    if (!userData || !userData.fcmToken) {
      console.log('⚠️ No FCM token found for user:', userIdString);
      return { success: false, message: 'No FCM token' };
    }

    const fcmToken = userData.fcmToken;
    console.log('✅ FCM token found for user:', userIdString);

    // Send push notification
    const message = {
      notification: {
        title: notificationData.title,
        body: notificationData.message,
        icon: notificationData.icon || '/logo192.png'
      },
      data: {
        link: notificationData.link || '/',
        type: notificationData.type || 'system'
      },
      token: fcmToken
    };

    const response = await messaging.send(message);
    console.log('✅ Push notification sent successfully:', response);
    
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Send push notification error:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// CREATE & SEND NOTIFICATION (ALL IN ONE)
// =====================================================
export const notifyUser = async (userId, notificationData) => {
  try {
    // Ensure userId is valid
    if (!userId) {
      console.error('❌ Invalid userId:', userId);
      return { success: false, error: 'Invalid userId' };
    }

    console.log('🔔 Sending notification to user:', userId);
    
    // Create in-app notification in Firestore
    const firestoreResult = await createNotification(userId, notificationData);
    console.log('📊 Firestore notification result:', firestoreResult);
    
    // Send push notification (don't fail if this doesn't work)
    let pushResult = { success: false, message: 'Push not attempted' };
    try {
      pushResult = await sendPushNotification(userId, notificationData);
      console.log('📱 Push notification result:', pushResult);
    } catch (pushError) {
      console.error('⚠️ Push notification failed, but continuing:', pushError.message);
    }
    
    return {
      success: true,
      firestore: firestoreResult,
      push: pushResult
    };
  } catch (error) {
    console.error('❌ Notify user error:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// SAVE USER FCM TOKEN
// =====================================================
export const saveFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;

    if (!fcmToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'FCM token is required' 
      });
    }

    // Convert to string
    const userIdString = userId.toString();

    await db.collection('users').doc(userIdString).set({
      fcmToken,
      fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ FCM token saved for user:', userIdString);

    res.json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    console.error('❌ Save FCM token error:', error);
    res.status(500).json({ success: false, message: 'Error saving token' });
  }
};

// =====================================================
// MARK NOTIFICATION AS READ
// =====================================================
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    const userIdString = userId.toString();

    const notifRef = db.collection('notifications').doc(notificationId);
    const notifDoc = await notifRef.get();

    if (!notifDoc.exists) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (notifDoc.data().userId !== userIdString) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await notifRef.update({
      isRead: true,
      readAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: 'Error' });
  }
};

// =====================================================
// MARK ALL AS READ
// =====================================================
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const userIdString = userId.toString();

    const batch = db.batch();
    const notifications = await db.collection('notifications')
      .where('userId', '==', userIdString)
      .where('isRead', '==', false)
      .get();

    notifications.forEach(doc => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, message: 'Error' });
  }
};

// =====================================================
// DELETE NOTIFICATION
// =====================================================
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    const userIdString = userId.toString();

    const notifRef = db.collection('notifications').doc(notificationId);
    const notifDoc = await notifRef.get();

    if (!notifDoc.exists) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (notifDoc.data().userId !== userIdString) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await notifRef.delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Error' });
  }
};