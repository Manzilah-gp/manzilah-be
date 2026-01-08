

import db from '../config/db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { notifyUser } from './firebaseNotificationController.js'; 
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/chat';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images, PDFs, and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  }
});

// File upload controller
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Return file URL
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
};

// Export the multer middleware
export const uploadMiddleware = upload.single('file');
// CONVERSATION MANAGEMENT

// Get all conversations for current user
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const [conversations] = await db.execute(`
      SELECT 
        c.*,
        cp.last_read_at,
        cp.is_muted,
        cp.role as my_role,
        -- Get the other user's info for private chats
        (SELECT u.full_name 
         FROM conversation_participant cp2 
         JOIN user u ON cp2.user_id = u.id 
         WHERE cp2.conversation_id = c.id 
           AND cp2.user_id != ? 
         LIMIT 1) as other_user_name,
        (SELECT u.id 
         FROM conversation_participant cp2 
         JOIN user u ON cp2.user_id = u.id 
         WHERE cp2.conversation_id = c.id 
           AND cp2.user_id != ? 
         LIMIT 1) as other_user_id,
        -- Get latest message
        (SELECT message_text FROM message 
         WHERE conversation_id = c.id 
           AND is_deleted = FALSE 
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM message 
         WHERE conversation_id = c.id 
           AND is_deleted = FALSE 
         ORDER BY created_at DESC LIMIT 1) as last_message_at,
        -- Get unread count
        (SELECT COUNT(*) FROM message 
         WHERE conversation_id = c.id 
           AND created_at > COALESCE(cp.last_read_at, '1970-01-01')
           AND sender_id != ?
           AND is_deleted = FALSE) as unread_count,
        -- Get participant count
        (SELECT COUNT(*) FROM conversation_participant 
         WHERE conversation_id = c.id 
           AND left_at IS NULL) as participant_count
      FROM conversation c
      JOIN conversation_participant cp ON c.id = cp.conversation_id
      WHERE cp.user_id = ?
        AND cp.left_at IS NULL
      ORDER BY c.updated_at DESC
    `, [userId, userId, userId, userId]);

    res.json({
      success: true,
      conversations: conversations.map(conv => ({
        ...conv,
        // For private chats, use other user's name
        display_name: conv.type === 'private' ? conv.other_user_name : conv.name,
        display_id: conv.type === 'private' ? conv.other_user_id : conv.id
      }))
    });

  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
};

// Get specific conversation details
export const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get conversation
    const [conversations] = await db.execute(`
      SELECT c.*, cp.role as my_role
      FROM conversation c
      JOIN conversation_participant cp ON c.id = cp.conversation_id
      WHERE c.id = ? AND cp.user_id = ? AND cp.left_at IS NULL
    `, [id, userId]);

    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const conversation = conversations[0];

    // Get participants
    const [participants] = await db.execute(`
      SELECT 
        cp.*,
        u.full_name,
        u.email
      FROM conversation_participant cp
      JOIN user u ON cp.user_id = u.id
      WHERE cp.conversation_id = ? AND cp.left_at IS NULL
    `, [id]);

    res.json({
      success: true,
      conversation: {
        ...conversation,
        participants
      }
    });

  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation',
      error: error.message
    });
  }
};

// Create private conversation
export const createPrivateConversation = async (req, res) => {
  try {
    const { other_user_id } = req.body;
    const userId = req.user.id;

    if (!other_user_id) {
      return res.status(400).json({
        success: false,
        message: 'other_user_id is required'
      });
    }

    // Check if conversation already exists
    const [existing] = await db.execute(`
      SELECT c.id
      FROM conversation c
      JOIN conversation_participant cp1 ON c.id = cp1.conversation_id
      JOIN conversation_participant cp2 ON c.id = cp2.conversation_id
      WHERE c.type = 'private'
        AND cp1.user_id = ?
        AND cp2.user_id = ?
        AND cp1.left_at IS NULL
        AND cp2.left_at IS NULL
    `, [userId, other_user_id]);

    if (existing.length > 0) {
      return res.json({
        success: true,
        conversation_id: existing[0].id,
        message: 'Conversation already exists'
      });
    }

    // Create new conversation
    const [result] = await db.execute(`
      INSERT INTO conversation (type, created_by)
      VALUES ('private', ?)
    `, [userId]);

    const conversationId = result.insertId;

    // Add both participants
    await db.execute(`
      INSERT INTO conversation_participant (conversation_id, user_id)
      VALUES (?, ?), (?, ?)
    `, [conversationId, userId, conversationId, other_user_id]);

    res.json({
      success: true,
      conversation_id: conversationId,
      message: 'Private conversation created'
    });

  } catch (error) {
    console.error('Error creating private conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
      error: error.message
    });
  }
};

// Create group conversation
export const createGroupConversation = async (req, res) => {
  try {
    const { name, description, member_ids } = req.body;
    const userId = req.user.id;

    if (!name || !member_ids || member_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Group name and members are required'
      });
    }

    // Create group
    const [result] = await db.execute(`
      INSERT INTO conversation (type, name, description, created_by)
      VALUES ('group', ?, ?, ?)
    `, [name, description || null, userId]);

    const conversationId = result.insertId;

    // Add creator as admin
    await db.execute(`
      INSERT INTO conversation_participant (conversation_id, user_id, role)
      VALUES (?, ?, 'admin')
    `, [conversationId, userId]);

    // Add other members
    const memberValues = member_ids.map(memberId => [conversationId, memberId, 'member']);
    for (const values of memberValues) {
      await db.execute(`
        INSERT INTO conversation_participant (conversation_id, user_id, role)
        VALUES (?, ?, ?)
      `, values);
    }

    // Create system message
    await db.execute(`
      INSERT INTO message (conversation_id, sender_id, message_text, message_type)
      VALUES (?, ?, ?, 'system')
    `, [conversationId, userId, `${req.user.full_name} created the group`]);

    res.json({
      success: true,
      conversation_id: conversationId,
      message: 'Group created successfully'
    });

  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group',
      error: error.message
    });
  }
};

// Update group conversation
export const updateGroupConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, avatar_url } = req.body;
    const userId = req.user.id;

    // Check if user is admin
    const [participants] = await db.execute(`
      SELECT role FROM conversation_participant
      WHERE conversation_id = ? AND user_id = ?
    `, [id, userId]);

    if (participants.length === 0 || participants[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can update group info'
      });
    }

    // Update group
    await db.execute(`
      UPDATE conversation
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          avatar_url = COALESCE(?, avatar_url)
      WHERE id = ?
    `, [name, description, avatar_url, id]);

    res.json({
      success: true,
      message: 'Group updated successfully'
    });

  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group',
      error: error.message
    });
  }
};

// Delete conversation
export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check permissions
    const [conv] = await db.execute(`
      SELECT c.type, cp.role
      FROM conversation c
      JOIN conversation_participant cp ON c.id = cp.conversation_id
      WHERE c.id = ? AND cp.user_id = ?
    `, [id, userId]);

    if (conv.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // For groups, only admin can delete
    if (conv[0].type === 'group' && conv[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can delete the group'
      });
    }

    // Delete conversation (cascade will delete messages and participants)
    await db.execute('DELETE FROM conversation WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
};

// Leave group conversation
export const leaveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Mark as left
    await db.execute(`
      UPDATE conversation_participant
      SET left_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ?
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Left conversation successfully'
    });

  } catch (error) {
    console.error('Error leaving conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave conversation',
      error: error.message
    });
  }
};

// MESSAGE MANAGEMENT


// =====================================================
// EXACT REPLACEMENT FOR getMessages FUNCTION
// Location: chatController.js around line 398
// =====================================================

// FIND THIS FUNCTION (it's currently broken) and REPLACE with:

export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check access
    const [check] = await db.execute(
      'SELECT 1 FROM conversation_participant WHERE conversation_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (check.length === 0) {
      return res.status(403).json({ success: false, message: 'No access' });
    }
    
    // Get messages with ALL columns including file info
    const [messages] = await db.execute(
      `SELECT m.id, m.sender_id, m.message_text, m.message_type, 
              m.file_url, m.file_name, m.file_size,
              m.created_at, m.updated_at, u.full_name as sender_name 
       FROM message m 
       JOIN user u ON m.sender_id = u.id 
       WHERE m.conversation_id = ? AND m.is_deleted = 0 
       ORDER BY m.created_at ASC`,
      [id]
    );
    
    res.json({ success: true, messages });
    
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ success: false, message: 'Error fetching messages', error: err.message });
  }
};
// Send message
export const sendMessage = async (req, res) => {
  try {
    const { conversation_id, message_text, reply_to_message_id } = req.body;
    const userId = req.user.id;

    if (!conversation_id || !message_text) {
      return res.status(400).json({
        success: false,
        message: 'conversation_id and message_text are required'
      });
    }

    // Verify user is in conversation
    const [participants] = await db.execute(`
      SELECT 1 FROM conversation_participant
      WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL
    `, [conversation_id, userId]);

    if (participants.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this conversation'
      });
    }

    // Insert message
    const [result] = await db.execute(`
      INSERT INTO message (conversation_id, sender_id, message_text, reply_to_message_id)
      VALUES (?, ?, ?, ?)
    `, [conversation_id, userId, message_text, reply_to_message_id || null]);

    // Get the created message
    const [messages] = await db.execute(`
      SELECT m.*, u.full_name as sender_name
      FROM message m
      JOIN user u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [result.insertId]);
 // ⬇️⬇️⬇️ ADD THIS ENTIRE BLOCK HERE ⬇️⬇️⬇️
    
  // Get sender's full name from database (once, before loop)
const [sender] = await db.execute(
  'SELECT full_name FROM user WHERE id = ?',
  [userId]
);

const senderName = sender[0]?.full_name || 'Someone';

// Get other participants to notify
const [otherParticipants] = await db.execute(`
  SELECT user_id 
  FROM conversation_participant
  WHERE conversation_id = ? 
    AND user_id != ? 
    AND left_at IS NULL
`, [conversation_id, userId]);

// Get conversation info
const [convInfo] = await db.execute(`
  SELECT type, name FROM conversation WHERE id = ?
`, [conversation_id]);

const conversationType = convInfo[0]?.type;
const conversationName = convInfo[0]?.name;

// Send notification to each participant
for (const participant of otherParticipants) {
  const receiverId = participant.user_id;
  
  let notificationTitle = 'New Message';
  let notificationMessage = `${senderName} sent you a message`;
  
  if (conversationType === 'group' && conversationName) {
    notificationTitle = `New message in ${conversationName}`;
    notificationMessage = `${senderName}: ${message_text.substring(0, 50)}${message_text.length > 50 ? '...' : ''}`;
  }

  try {
    await notifyUser(receiverId, {
      type: 'message',
      title: notificationTitle,
      message: notificationMessage,
      link: `/chat?conversation=${conversation_id}`,
      icon: '💬'
    });
  } catch (notifError) {
    console.error('Notification error:', notifError);
  }
}
    
    // ⬆️⬆️⬆️ END OF NOTIFICATION CODE ⬆️⬆️⬆️
    res.json({
      success: true,
      message: messages[0]
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Mark message as deleted
    await db.execute(`
      UPDATE message
      SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP
      WHERE id = ? AND sender_id = ?
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const { conversation_id } = req.body;
    const userId = req.user.id;

    // Update last_read_at
    await db.execute(`
      UPDATE conversation_participant
      SET last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ?
    `, [conversation_id, userId]);

    res.json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read',
      error: error.message
    });
  }
};

// GROUP MANAGEMENT

// Add member to group
export const addGroupMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const currentUserId = req.user.id;

    // Check if current user is admin
    const [admins] = await db.execute(`
      SELECT 1 FROM conversation_participant
      WHERE conversation_id = ? AND user_id = ? AND role = 'admin'
    `, [id, currentUserId]);

    if (admins.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can add members'
      });
    }

    // Add member
    await db.execute(`
      INSERT INTO conversation_participant (conversation_id, user_id, role)
      VALUES (?, ?, 'member')
      ON DUPLICATE KEY UPDATE left_at = NULL
    `, [id, user_id]);

    res.json({
      success: true,
      message: 'Member added successfully'
    });

  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member',
      error: error.message
    });
  }
};

// Remove member from group
export const removeGroupMember = async (req, res) => {
  try {
    const { id, userId: memberToRemove } = req.params;
    const currentUserId = req.user.id;

    // Check if current user is admin
    const [admins] = await db.execute(`
      SELECT 1 FROM conversation_participant
      WHERE conversation_id = ? AND user_id = ? AND role = 'admin'
    `, [id, currentUserId]);

    if (admins.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove members'
      });
    }

    // Remove member
    await db.execute(`
      UPDATE conversation_participant
      SET left_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ?
    `, [id, memberToRemove]);

    res.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member',
      error: error.message
    });
  }
};

// Update member role
export const updateMemberRole = async (req, res) => {
  try {
    const { id, userId: memberId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.id;

    // Check if current user is admin
    const [admins] = await db.execute(`
      SELECT 1 FROM conversation_participant
      WHERE conversation_id = ? AND user_id = ? AND role = 'admin'
    `, [id, currentUserId]);

    if (admins.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update roles'
      });
    }

    // Update role
    await db.execute(`
      UPDATE conversation_participant
      SET role = ?
      WHERE conversation_id = ? AND user_id = ?
    `, [role, id, memberId]);

    res.json({
      success: true,
      message: 'Role updated successfully'
    });

  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message
    });
  }
};

// USER SEARCH

// Search users
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        users: []
      });
    }

    // Join with role_assignment to get roles
    const [users] = await db.execute(`
      SELECT 
        u.id, 
        u.full_name, 
        u.email,
        GROUP_CONCAT(DISTINCT r.name) as roles
      FROM user u
      LEFT JOIN role_assignment ra ON u.id = ra.user_id
      LEFT JOIN role r ON ra.role_id = r.id
      WHERE (u.full_name LIKE ? OR u.email LIKE ?)
        AND u.id != ?
      GROUP BY u.id
      LIMIT 20
    `, [`%${q}%`, `%${q}%`, userId]);

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
};

// Get online status
export const getOnlineStatus = async (req, res) => {
  try {
    const { user_ids } = req.body;
    
    // This would check Socket.io connected users
    // For now, return empty array
    res.json({
      success: true,
      online_users: []
    });

  } catch (error) {
    console.error('Error getting online status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get online status',
      error: error.message
    });
  }
};

export const updateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message_text } = req.body;
    const userId = req.user.id;

    if (!message_text || !message_text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    // Verify message belongs to user
    const [messages] = await db.execute(
      'SELECT * FROM message WHERE id = ? AND sender_id = ?',
      [id, userId]
    );

    if (messages.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // Update message
    await db.execute(
      'UPDATE message SET message_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [message_text, id]
    );

    res.json({
      success: true,
      message: 'Message updated successfully'
    });

  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message',
      error: error.message
    });
  }
};