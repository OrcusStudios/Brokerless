// middleware/messageMiddleware.js
const Message = require('../models/Message');

/**
 * Middleware to add unread message count to res.locals
 * for use in all views (particularly the header)
 */
const unreadMessageCount = async (req, res, next) => {
    if (req.isAuthenticated()) {
        try {
            const count = await Message.countDocuments({
                receiver: req.user._id,
                isRead: false
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

module.exports = {
    unreadMessageCount
};