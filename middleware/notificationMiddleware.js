// middleware/notificationMiddleware.js
const Notification = require('../models/Notification');

// Cache for notifications to reduce database queries
const notificationCache = new Map();
const CACHE_TTL = 60000; // 1 minute in milliseconds

/**
 * Middleware to load notifications for the navbar dropdown
 */
const loadNotifications = async (req, res, next) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user._id.toString();
            const now = Date.now();
            
            // Check if we have a valid cached notifications
            if (notificationCache.has(userId)) {
                const cachedData = notificationCache.get(userId);
                // Use cache if it's still valid
                if (now - cachedData.timestamp < CACHE_TTL) {
                    res.locals.notifications = cachedData.notifications;
                    res.locals.unreadNotificationCount = cachedData.count;
                    next();
                    return;
                }
            }
            
            // If no valid cache, query the database
            const notifications = await Notification.find({ 
                user: req.user._id,
                read: false 
            })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(); // Use lean() for better performance
            
            // Count total unread notifications
            const unreadNotificationCount = await Notification.countDocuments({
                user: req.user._id,
                read: false
            });
            
            // Update the cache
            notificationCache.set(userId, {
                notifications: notifications,
                count: unreadNotificationCount,
                timestamp: now
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

// Function to invalidate cache for a user (call this when notifications are read or created)
const invalidateNotificationCache = (userId) => {
    if (userId) {
        notificationCache.delete(userId.toString());
    }
};

module.exports = {
    loadNotifications,
    invalidateNotificationCache
};
