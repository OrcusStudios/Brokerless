// utils/messageUtils.js

const User = require('../models/User');
const Professional = require('../models/Professional');
const Message = require('../models/Message');

/**
 * Find a user by ID, checking both User and Professional models
 * @param {String} userId - The user ID to look up
 * @param {String} select - Fields to select (optional)
 * @returns {Object} The user object or null if not found
 */
exports.findUserById = async (userId, select = '') => {
    try {
        // First try regular user model
        let user = await User.findById(userId).select(select);
        
        // If not found, try professional model
        if (!user) {
            user = await Professional.findById(userId).select(select);
        }
        
        return user;
    } catch (error) {
        console.error('Error finding user:', error);
        return null;
    }
};

/**
 * Get unread message count for a user
 * @param {String} userId - The user ID to check
 * @returns {Number} Count of unread messages
 */
exports.getUnreadCount = async (userId) => {
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
 * Format a message timestamp for display
 * @param {Date} date - The date to format
 * @returns {String} Formatted date string
 */
exports.formatMessageTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    
    // If today, show time only
    if (messageDate.toDateString() === now.toDateString()) {
        return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (messageDate.getFullYear() === now.getFullYear()) {
        return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show full date
    return messageDate.toLocaleDateString();
};

/**
 * Get recent contacts for a user (people they've messaged with)
 * @param {String} userId - The user ID to check
 * @param {Number} limit - Maximum number of contacts to return
 * @returns {Array} Array of contact objects with user details
 */
exports.getRecentContacts = async (userId, limit = 5) => {
    try {
        // Find recent conversations
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: userId },
                        { receiver: userId }
                    ]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$sender", userId] },
                            "$receiver",
                            "$sender"
                        ]
                    },
                    lastMessage: { $first: "$$ROOT" }
                }
            },
            { $limit: limit }
        ]);
        
        // Get user details for each contact
        const contacts = await Promise.all(
            conversations.map(async (conv) => {
                const contact = await exports.findUserById(
                    conv._id, 
                    'name email profileImage roles professionalType'
                );
                
                return {
                    user: contact,
                    lastMessage: conv.lastMessage
                };
            })
        );
        
        return contacts.filter(contact => contact.user !== null);
    } catch (error) {
        console.error('Error getting recent contacts:', error);
        return [];
    }
};

/**
 * Create a system message (automated message)
 * @param {String} senderId - The sender ID (system user)
 * @param {String} receiverId - The receiver ID
 * @param {String} content - Message content
 * @param {Object} context - Optional context (listingId, offerId)
 * @returns {Object} The created message
 */
exports.createSystemMessage = async (senderId, receiverId, content, context = {}) => {
    try {
        const message = new Message({
            sender: senderId,
            receiver: receiverId,
            content,
            isRead: false,
            ...context
        });
        
        await message.save();
        return message;
    } catch (error) {
        console.error('Error creating system message:', error);
        return null;
    }
};