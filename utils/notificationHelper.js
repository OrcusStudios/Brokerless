// utils/notificationHelper.js
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const { findUserById } = require('./messageUtils');
const messagingService = require('./messagingService');

/**
 * Create a notification for a new message
 * @param {Object} message - The message object
 * @returns {Promise<Object>} The created notification
 */
exports.createMessageNotification = async (message) => {
    try {
        // Get sender info
        const sender = await findUserById(message.sender, 'name');
        if (!sender) {
            console.error('Sender not found for message notification');
            return null;
        }
        
        // Create a notification
        const notification = new Notification({
            user: message.receiver,
            message: `New message from ${sender.name}`,
            type: 'MESSAGE',
            link: `/messages/conversation/${message.sender}`,
            isRead: false
        });
        
        await notification.save();
        
        // Also trigger a real-time notification through Socket.io
        messagingService.sendNotification(message.receiver, {
            id: notification._id,
            type: 'MESSAGE',
            message: `New message from ${sender.name}`,
            sender: {
                id: message.sender,
                name: sender.name
            },
            timestamp: new Date()
        });
        
        return notification;
    } catch (error) {
        console.error('Error creating message notification:', error);
        return null;
    }
};

/**
 * Get unread message count for a user
 * @param {String} userId - The user ID
 * @returns {Promise<Number>} The count of unread messages
 */
exports.getUnreadMessageCount = async (userId) => {
    try {
        return await Message.countDocuments({
            receiver: userId,
            isRead: false
        });
    } catch (error) {
        console.error('Error getting unread message count:', error);
        return 0;
    }
};

/**
 * Mark a notification as read
 * @param {String} notificationId - The notification ID
 * @returns {Promise<Boolean>} Success status
 */
exports.markNotificationAsRead = async (notificationId) => {
    try {
        const notification = await Notification.findById(notificationId);
        if (!notification) return false;
        
        notification.isRead = true;
        await notification.save();
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
};

/**
 * Mark all notifications as read for a user
 * @param {String} userId - The user ID
 * @returns {Promise<Number>} The number of notifications marked as read
 */
exports.markAllNotificationsAsRead = async (userId) => {
    try {
        const result = await Notification.updateMany(
            { user: userId, isRead: false },
            { $set: { isRead: true } }
        );
        
        return result.nModified || 0;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return 0;
    }
};

/**
 * Create a system notification for all users (broadcast)
 * @param {String} message - The notification message
 * @param {String} link - Optional link
 * @returns {Promise<Array>} The created notifications
 */
exports.createSystemNotification = async (message, link = null) => {
    try {
        // No implementation yet - would need a way to get all active users
        console.log('System notification:', message);
        return [];
    } catch (error) {
        console.error('Error creating system notification:', error);
        return [];
    }
};