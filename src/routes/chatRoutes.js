// =====================================================
// CHAT ROUTES
// File: backend/src/routes/chatRoutes.js
// All REST API endpoints for chat functionality
// =====================================================

import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  // Conversations
  getConversations,
  getConversationById,
  createPrivateConversation,
  createGroupConversation,
  updateGroupConversation,
  deleteConversation,
  leaveConversation,
  updateMessage,
  // Messages
  getMessages,
  sendMessage,
  deleteMessage,
  markAsRead,
  uploadFile, uploadMiddleware,
  // Group Management
  addGroupMember,
  removeGroupMember,
  updateMemberRole,
  
  // Users
  searchUsers,
  getOnlineStatus
} from '../controllers/chatController.js';

const router = express.Router();

// 
// CONVERSATION ROUTES

// Get all conversations for current user
router.get('/conversations', verifyToken, getConversations);

// Get specific conversation details
router.get('/conversations/:id', verifyToken, getConversationById);

// Create new private conversation
router.post('/conversations/private', verifyToken, createPrivateConversation);

// Create new group conversation
router.post('/conversations/group', verifyToken, createGroupConversation);

// Update group info (name, description, avatar)
router.put('/conversations/:id', verifyToken, updateGroupConversation);

// Delete conversation (admin only for groups)
router.delete('/conversations/:id', verifyToken, deleteConversation);

// Leave group conversation
router.post('/conversations/:id/leave', verifyToken, leaveConversation);
// upload 
router.post('/upload', verifyToken, uploadMiddleware, uploadFile);


// MESSAGE ROUTES

// Get messages for a conversation
router.get('/conversations/:id/messages', verifyToken, getMessages);

// Send new message
router.post('/messages', verifyToken, sendMessage);
// update message 
router.put('/messages/:id', verifyToken, updateMessage);


// Delete message
router.delete('/messages/:id', verifyToken, deleteMessage);

// Mark message(s) as read
router.post('/messages/read', verifyToken, markAsRead);

// GROUP MANAGEMENT ROUTES

// Add member to group
router.post('/conversations/:id/members', verifyToken, addGroupMember);

// Remove member from group
router.delete('/conversations/:id/members/:userId', verifyToken, removeGroupMember);

// Update member role (admin/member)
router.put('/conversations/:id/members/:userId/role', verifyToken, updateMemberRole);

// USER ROUTES

// Search users to start conversation
router.get('/users/search', verifyToken, searchUsers);

// Get online status of users
router.post('/users/status', verifyToken, getOnlineStatus);

// FILE UPLOAD ROUTES (Optional - add multer middleware)

/*
import multer from 'multer';
import path from 'path';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/chat/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Invalid file type');
    }
  }
});

// Upload file endpoint
router.post('/upload', verifyToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  res.json({
    success: true,
    file: {
      filename: req.file.filename,
      path: `/uploads/chat/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
});
*/

export default router;