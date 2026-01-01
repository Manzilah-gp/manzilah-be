

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// Store connected users (in-memory)
// Format: { userId: socketId }
const connectedUsers = new Map();

// Store typing indicators
// Format: { conversationId: Set(userIds) }
const typingUsers = new Map();

// Initialize Socket.io server
export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Connection timeout
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication Middleware
  // Verify JWT token before allowing connection
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Attach user info to socket
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      
      console.log(`✅ User ${decoded.id} authenticated for Socket.io`);
      next();
    } catch (error) {
      console.error('❌ Socket authentication failed:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection Event
  // When a user connects to Socket.io
  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User ${userId} connected (Socket ID: ${socket.id})`);

    // Store user's socket connection
    connectedUsers.set(userId, socket.id);

    // Emit online status to all users
    io.emit('user:online', { userId });

    // Event: Join Conversation
    // User joins a specific conversation room
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`👥 User ${userId} joined conversation ${conversationId}`);

      // Notify others in the room
      socket.to(`conversation:${conversationId}`).emit('user:joined', {
        userId,
        conversationId
      });
    });

    // Event: Leave Conversation
    // User leaves a conversation room
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`👋 User ${userId} left conversation ${conversationId}`);

      // Stop typing indicator if active
      handleStopTyping(conversationId, userId, socket);
    });

    // Event: Send Message
    socket.on('message:send', (data) => {
      const { conversationId, messageId, message, recipientIds } = data;
      
      console.log(`💬 Message ${messageId} sent to conversation ${conversationId}`);

      // Broadcast message to all users in the conversation
      io.to(`conversation:${conversationId}`).emit('message:new', {
        conversationId,
        messageId,
        message,
        senderId: userId,
        timestamp: new Date()
      });

      // notifyOfflineUsers(recipientIds, message);
    });

    // Show "User is typing..." to others
    socket.on('typing:start', (conversationId) => {
      console.log(`⌨️  User ${userId} is typing in ${conversationId}`);

      // Add user to typing list
      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      typingUsers.get(conversationId).add(userId);

      // Broadcast to others in conversation
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId
      });

      // Auto-stop typing after 5 seconds
      setTimeout(() => {
        handleStopTyping(conversationId, userId, socket);
      }, 5000);
    });

    socket.on('typing:stop', (conversationId) => {
      handleStopTyping(conversationId, userId, socket);
    });

    // Event: Message Read
    socket.on('message:read', (data) => {
      const { conversationId, messageId } = data;
      
      console.log(`✅ User ${userId} read message ${messageId}`);

      // Broadcast read receipt to sender
      socket.to(`conversation:${conversationId}`).emit('message:read', {
        conversationId,
        messageId,
        readBy: userId,
        readAt: new Date()
      });
    });

    // Event: Message Deleted
    socket.on('message:delete', (data) => {
      const { conversationId, messageId } = data;
      
      console.log(`  Message ${messageId} deleted in ${conversationId}`);

      // Broadcast deletion to all users in conversation
      io.to(`conversation:${conversationId}`).emit('message:deleted', {
        conversationId,
        messageId,
        deletedBy: userId
      });
    });

    
    socket.on('group:created', (data) => {
      const { conversationId, memberIds, groupName } = data;
      
      console.log(`👥 Group ${groupName} created with ID ${conversationId}`);

      // Notify all group members
      memberIds.forEach((memberId) => {
        const memberSocketId = connectedUsers.get(memberId);
        if (memberSocketId) {
          io.to(memberSocketId).emit('group:created', {
            conversationId,
            groupName,
            createdBy: userId
          });
        }
      });
    });

    // Event: User Added to Group
    socket.on('group:member-added', (data) => {
      const { conversationId, newMemberId } = data;
      
      // Notify existing members
      io.to(`conversation:${conversationId}`).emit('group:member-added', {
        conversationId,
        newMemberId,
        addedBy: userId
      });

      // Notify the new member
      const newMemberSocketId = connectedUsers.get(newMemberId);
      if (newMemberSocketId) {
        io.to(newMemberSocketId).emit('group:added', {
          conversationId
        });
      }
    });

    
    // Event: Disconnect
    // Clean up when user disconnects
    socket.on('disconnect', () => {
      console.log(` User ${userId} disconnected`);

      // Remove from connected users
      connectedUsers.delete(userId);

      // Remove from all typing indicators
      typingUsers.forEach((users, conversationId) => {
        if (users.has(userId)) {
          users.delete(userId);
          io.to(`conversation:${conversationId}`).emit('typing:stop', {
            conversationId,
            userId
          });
        }
      });

      // Emit offline status
      io.emit('user:offline', { userId });
    });

    // =====================================================
    // Event: Error Handling
    // =====================================================
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${userId}:`, error);
    });
  });

  console.log('✅ Socket.io server initialized');
  return io;
};

// =====================================================
// Helper Functions
// =====================================================

// Handle stop typing
function handleStopTyping(conversationId, userId, socket) {
  const typingSet = typingUsers.get(conversationId);
  if (typingSet && typingSet.has(userId)) {
    typingSet.delete(userId);
    
    // Broadcast stop typing
    socket.to(`conversation:${conversationId}`).emit('typing:stop', {
      conversationId,
      userId
    });

    console.log(`⌨️  User ${userId} stopped typing in ${conversationId}`);
  }
}

// Get online users
export const getOnlineUsers = () => {
  return Array.from(connectedUsers.keys());
};

// Check if user is online
export const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

// Send message to specific user
export const sendToUser = (userId, event, data) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

export default initializeSocket;