const Message = require('../models/Message');

const setupChatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Join a session room
    socket.on('join_session', (sessionId) => {
      socket.join(sessionId);
      console.log(`👤 User ${socket.id} joined session: ${sessionId}`);
    });

    // Handle sending a message
    socket.on('send_message', async (data) => {
      const { sessionId, senderId, content, type } = data;

      try {
        // Save message to database
        const message = await Message.create({
          sessionId,
          senderId,
          content,
          type: type || 'text',
        });

        // Broadcast to everyone in the session room
        io.to(sessionId).emit('receive_message', {
          _id: message._id,
          sessionId: message.sessionId,
          senderId: message.senderId,
          content: message.content,
          type: message.type,
          createdAt: message.createdAt,
        });
      } catch (error) {
        console.error('Error saving message:', error.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { sessionId, userId, userName } = data;
      socket.to(sessionId).emit('user_typing', { userId, userName });
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
      const { sessionId, userId } = data;
      socket.to(sessionId).emit('user_stop_typing', { userId });
    });

    // Leave session
    socket.on('leave_session', (sessionId) => {
      socket.leave(sessionId);
      console.log(`👤 User ${socket.id} left session: ${sessionId}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupChatSocket;
