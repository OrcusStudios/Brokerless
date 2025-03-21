// middleware/notificationMiddleware.js
const Notification = require('../models/Notification');

/**
 * Middleware to load notifications for the navbar dropdown
 */
const loadNotifications = async (req, res, next) => {
    if (req.isAuthenticated()) {
        try {
            // Find unread notifications for the current user
            const notifications = await Notification.find({ 
                user: req.user._id,
                read: false 
            })
            .sort({ createdAt: -1 })
            .limit(5);
            
            // Count total unread notifications
            const unreadNotificationCount = await Notification.countDocuments({
                user: req.user._id,
                read: false
            });
            
            // Make available in templates
            res.locals.notifications = notifications;
            res.locals.unreadNotificationCount = unreadNotificationCount;
        } catch (error) {
            console.error('Error loading notifications:', error);
            res.locals.notifications = [];
            res.locals.unreadNotificationCount = 0;
        }
    } else {
        res.locals.notifications = [];
        res.locals.unreadNotificationCount = 0;
    }
    
    next();
};

module.exports = {
    loadNotifications
};