// utils/messagingService.js

const socketIo = require('socket.io');
const Message = require('../models/Message');
const User = require('../models/User');
const Professional = require('../models/Professional');
const { findUserById } = require('./messageUtils');

let io;

/**
 * Initialize the messaging service with the server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.io instance
 */
exports.init = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // In production, restrict this to your domain
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    
    // Set up socket connections and event handlers
    io.on('connection', (socket) => {
        
        // Associate the socket with the user ID for private messaging
        socket.on('register', async (userId) => {
            if (!userId) return;
            
            // Join a room specific to this user
            socket.join(`user:${userId}`);
        });
        
        // Handle new messages
        socket.on('send_message', async (data) => {
            try {
                const { senderId, receiverId, content, listingId, offerId, attachments } = data;
                
                // Create new message in database
                const newMessage = new Message({
                    sender: senderId,
                    receiver: receiverId,
                    content,
                    isRead: false,
                    listingId,
                    offerId,
                    attachments
                });
                
                await newMessage.save();
                
                // Fetch sender details for the frontend
                const sender = await findUserById(senderId, 'name profileImage');
                
                // Add sender details to message object
                const messageWithSender = {
                    ...newMessage.toObject(),
                    sender: {
                        _id: sender._id,
                        name: sender.name,
                        profileImage: sender.profileImage
                    }
                };
                
                // Send message to the recipient's room
                io.to(`user:${receiverId}`).emit('new_message', messageWithSender);
                
                // Also inform sender's room that message was sent successfully
                io.to(`user:${senderId}`).emit('message_sent', messageWithSender);
            } catch (error) {
                console.error('Error sending message:', error);
                // Notify sender about the error
                socket.emit('message_error', { error: 'Failed to send message' });
            }
        });
        
        // Handle read receipts
        socket.on('mark_read', async (data) => {
            try {
                const { messageId, userId } = data;
                
                // Update message in database
                const message = await Message.findById(messageId);
                
                if (message && message.receiver.toString() === userId) {
                    message.isRead = true;
                    message.readAt = new Date();
                    await message.save();
                    
                    // Notify the original sender that their message was read
                    io.to(`user:${message.sender}`).emit('message_read', { messageId });
                }
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        });
        
        // Handle typing indicators
        socket.on('typing', ({ senderId, receiverId }) => {
            io.to(`user:${receiverId}`).emit('user_typing', { userId: senderId });
        });
        
        socket.on('stop_typing', ({ senderId, receiverId }) => {
            io.to(`user:${receiverId}`).emit('user_stopped_typing', { userId: senderId });
        });
        
        // Handle disconnect
        socket.on('disconnect', () => {
        });
    });
    
    return io;
};

/**
 * Get the Socket.io instance
 * @returns {Object} Socket.io instance
 */
exports.getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

/**
 * Send a notification to a specific user
 * @param {String} userId - The user ID to notify
 * @param {Object} notification - The notification object
 */
exports.sendNotification = (userId, notification) => {
    if (!io) return;
    
    io.to(`user:${userId}`).emit('notification', notification);
};

/**
 * Broadcast a message to all connected users
 * @param {String} event - The event name
 * @param {Object} data - The data to broadcast
 */
exports.broadcast = (event, data) => {
    if (!io) return;
    
    io.emit(event, data);
};

/**
 * Send a system message to a user
 * @param {String} userId - The user ID to send to
 * @param {String} message - The message content
 */
exports.sendSystemMessage = (userId, message) => {
    if (!io) return;
    
    io.to(`user:${userId}`).emit('system_message', {
        content: message,
        timestamp: new Date()
    });
};