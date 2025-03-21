// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const multer = require("multer");
const { storage } = require("../routes/cloudinary");
const upload = multer({ storage });

// Main inbox view - shows all conversations
router.get("/inbox", ensureAuthenticated, messageController.getInbox);

// View a specific conversation with another user
router.get("/conversation/:userId", ensureAuthenticated, messageController.getConversation);

// Compose a new message form (with optional recipient, listing, or offer parameters)
router.get("/compose", ensureAuthenticated, messageController.composeMessage);

// Send a message with optional attachments
router.post("/send", ensureAuthenticated, upload.array("attachments", 5), messageController.sendMessage);

// API Routes for message management

// Mark a specific message as read
router.patch("/:id/read", ensureAuthenticated, messageController.markAsRead);

// Mark all messages in a conversation as read
router.patch("/conversation/:userId/read", ensureAuthenticated, messageController.markConversationAsRead);

// Delete a message
router.delete("/:id", ensureAuthenticated, messageController.deleteMessage);

// Get unread message count (for notifications)
router.get("/unread/count", ensureAuthenticated, messageController.getUnreadCount);

// Search for users to message
//router.get("/search-users", ensureAuthenticated, messageController.searchUsers);

// Get recent contacts (for quick messaging)
//router.get("/recent-contacts", ensureAuthenticated, messageController.getRecentContacts);

module.exports = router;