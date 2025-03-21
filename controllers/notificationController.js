const Notification = require("../models/Notification");
const socket = require("../utils/socket"); // Import Socket.io helper

// 📌 Create Notification
exports.createNotification = async (userId, message, type = "Showing", link = "") => {
    try {
        const notification = new Notification({
            user: userId,
            message: message,
            type: type,
            link: link
        });
        await notification.save();

        
        // ✅ Get the initialized Socket.io instance and emit event
        const io = socket.getIo(); 
        io.emit(`notification-${userId}`, { message, type, link });
    } catch (error) {
        console.error("❌ Error creating notification:", error);
    }
};

// 📌 Fetch User Notifications
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ 
            user: req.user._id,
            isRead: false // Only fetch unread notifications
        }).sort({ createdAt: -1 });
        res.json({ notifications });
    } catch (error) {
        console.error("❌ Error fetching notifications:", error);
        res.status(500).json({ error: "Error fetching notifications." });
    }
};

// 📌 Fetch All Notifications (for history page)
exports.getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ 
            user: req.user._id
        }).sort({ createdAt: -1 });
        res.json({ notifications });
    } catch (error) {
        console.error("❌ Error fetching all notifications:", error);
        res.status(500).json({ error: "Error fetching all notifications." });
    }
};

// 📌 Mark All Notifications as Read (now deletes them)
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.deleteMany({ user: req.user._id, isRead: false });
        res.json({ success: true });
    } catch (error) {
        console.error("❌ Error deleting all notifications:", error);
        res.status(500).json({ error: "Error deleting all notifications." });
    }
};

// 📌 Mark a Single Notification as Read (now deletes it)
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        console.error("❌ Error deleting notification:", error);
        res.status(500).json({ error: "Error deleting notification." });
    }
};

// 📌 Delete a Single Notification (explicit delete function)
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        console.error("❌ Error deleting notification:", error);
        res.status(500).json({ error: "Error deleting notification." });
    }
};

// Add this function to notificationController.js
exports.getUnreadCount = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const count = await Notification.countDocuments({
            user: req.user._id,
            isRead: false
        });

        return res.json({ count });
    } catch (error) {
        console.error("❌ Error getting unread count:", error);
        return res.status(500).json({ error: "Failed to get unread count" });
    }
};

// Add this method to your notificationController.js
exports.getNotificationData = async (req, res) => {
    try {
        // Count unread notifications
        const count = await Notification.countDocuments({ 
            user: req.user._id,
            read: false
        });
        
        // Get recent unread notifications
        const notifications = await Notification.find({ 
            user: req.user._id,
            read: false 
        })
        .sort({ createdAt: -1 })
        .limit(5);
        
        // Return as JSON
        return res.json({ 
            success: true, 
            count, 
            notifications
        });
    } catch (error) {
        console.error('Error fetching notifications data:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch notifications' 
        });
    }
};