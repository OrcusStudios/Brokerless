// middleware/messageMiddleware.js
const Message = require('../models/Message');

// Cache for message counts to reduce database queries
const messageCountCache = new Map();
const CACHE_TTL = 60000; // 1 minute in milliseconds

/**
 * Middleware to add unread message count to res.locals
 * for use in all views (particularly the header)
 */
const unreadMessageCount = async (req, res, next) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user._id.toString();
            const now = Date.now();
            
            // Check if we have a valid cached count
            if (messageCountCache.has(userId)) {
                const cachedData = messageCountCache.get(userId);
                // Use cache if it's still valid
                if (now - cachedData.timestamp < CACHE_TTL) {
                    res.locals.unreadMessageCount = cachedData.count;
                    next();
                    return;
                }
            }
            
            // If no valid cache, query the database
            const count = await Message.countDocuments({
                receiver: req.user._id,
                isRead: false
            }).lean(); // Use lean() for better performance
            
            // Update the cache
            messageCountCache.set(userId, {
                count: count,
                timestamp: now
            });
            
            res.locals.unreadMessageCount = count;
        } catch (error) {
            console.error('Error getting unread message count:', error);
            res.locals.unreadMessageCount = 0;
        }
    } else {
        res.locals.unreadMessageCount = 0;
    }
    
    next();
};

// Function to invalidate cache for a user (call this when messages are read)
const invalidateMessageCache = (userId) => {
    if (userId) {
        messageCountCache.delete(userId.toString());
    }
};

module.exports = {
    unreadMessageCount,
    invalidateMessageCache
};
