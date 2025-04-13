// controllers/messageController.js
const Message = require("../models/Message");
const User = require("../models/User");
const Professional = require("../models/Professional");
const Notification = require("../models/Notification");
const Listing = require("../models/Listing");
const Offer = require("../models/Offer");
const mongoose = require("mongoose");
const { invalidateMessageCache } = require("../middleware/messageMiddleware");

// Cache for conversations to reduce database queries
const conversationsCache = new Map();
const CONVERSATIONS_CACHE_TTL = 60000; // 1 minute in milliseconds

// Get inbox with conversations
exports.getInbox = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const now = Date.now();
        
        // Check if we have a valid cached conversations
        if (conversationsCache.has(userId)) {
            const cachedData = conversationsCache.get(userId);
            // Use cache if it's still valid
            if (now - cachedData.timestamp < CONVERSATIONS_CACHE_TTL) {
                res.render('messages/inbox', { 
                    conversations: cachedData.conversations, 
                    user: req.user 
                });
                return;
            }
        }
        
        // Fallback to a simpler approach that's more reliable
        // Get all messages where the user is sender or receiver
        const messages = await Message.find({
            $or: [
                { sender: req.user._id },
                { receiver: req.user._id }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(100) // Limit to 100 most recent messages
        .lean();
        
        // Group messages by conversation
        const conversationsMap = new Map();
        
        // Get all unique user IDs from the messages
        const userIds = new Set();
        messages.forEach(message => {
            if (message.sender.toString() !== req.user._id.toString()) {
                userIds.add(message.sender.toString());
            }
            if (message.receiver.toString() !== req.user._id.toString()) {
                userIds.add(message.receiver.toString());
            }
        });
        
        // Fetch all users in one query
        const users = await User.find({ _id: { $in: Array.from(userIds) } })
            .select("name email profileImage")
            .lean();
            
        // Fetch all professionals in one query
        const professionals = await Professional.find({ _id: { $in: Array.from(userIds) } })
            .select("name email profileImage professionalType companyName")
            .lean();
            
        // Create a map of user/professional IDs to their data
        const participantsMap = new Map();
        users.forEach(user => participantsMap.set(user._id.toString(), user));
        professionals.forEach(prof => participantsMap.set(prof._id.toString(), prof));
        
        // Process each message
        for (const message of messages) {
            // Determine the other participant
            const otherParticipantId = message.sender.toString() === userId ? 
                message.receiver.toString() : message.sender.toString();
            
            const otherParticipantObj = participantsMap.get(otherParticipantId);
            
            // Skip if other participant not found
            if (!otherParticipantObj) continue;
            
            if (!conversationsMap.has(otherParticipantId)) {
                conversationsMap.set(otherParticipantId, {
                    otherParticipant: otherParticipantObj,
                    lastMessage: message,
                    unreadCount: message.receiver.toString() === userId && !message.isRead ? 1 : 0
                });
            } else {
                const conversation = conversationsMap.get(otherParticipantId);
                if (message.createdAt > conversation.lastMessage.createdAt) {
                    conversation.lastMessage = message;
                }
                if (message.receiver.toString() === userId && !message.isRead) {
                    conversation.unreadCount++;
                }
            }
        }
        
        // Convert map to array and sort by the most recent message
        const conversations = Array.from(conversationsMap.values())
            .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt)
            .slice(0, 20); // Limit to 20 most recent conversations
        
        // Cache the conversations
        conversationsCache.set(userId, {
            conversations,
            timestamp: now
        });
        
        res.render('messages/inbox', { 
            conversations, 
            user: req.user 
        });
    } catch (error) {
        console.error('Error getting inbox:', error);
        req.flash('error', 'Error loading inbox: ' + error.message);
        res.redirect('/'); // Redirecting to home instead of /dashboard
    }
};

// Function to invalidate conversations cache
const invalidateConversationsCache = (userId) => {
    if (userId) {
        conversationsCache.delete(userId.toString());
    }
};

// Cache for individual conversations
const conversationCache = new Map();
const CONVERSATION_CACHE_TTL = 60000; // 1 minute in milliseconds

// Get a specific conversation
exports.getConversation = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user._id.toString();
        const cacheKey = `${currentUserId}-${userId}`;
        const now = Date.now();
        
        // Check if we have a valid cached conversation
        if (conversationCache.has(cacheKey)) {
            const cachedData = conversationCache.get(cacheKey);
            // Use cache if it's still valid
            if (now - cachedData.timestamp < CONVERSATION_CACHE_TTL) {
                // Still mark messages as read even when using cache
                await Message.updateMany(
                    { sender: userId, receiver: req.user._id, isRead: false },
                    { $set: { isRead: true, readAt: new Date() } }
                );
                
                // Invalidate the message cache for this user
                invalidateMessageCache(req.user._id);
                
                // Invalidate the conversations cache for this user
                invalidateConversationsCache(req.user._id);
                
                res.render("messages/conversation", cachedData.data);
                return;
            }
        }
        
        // Validate that other user exists
        let otherUser;
        
        // Check both User and Professional models
        otherUser = await User.findById(userId)
            .select("name email profileImage roles")
            .lean();
        
        if (!otherUser) {
            otherUser = await Professional.findById(userId)
                .select("name email profileImage professionalType")
                .lean();
        }
        
        if (!otherUser) {
            req.flash("error", "User not found");
            return res.redirect("/messages/inbox");
        }
        
        // Get all messages between these users
        const messages = await Message.find({
            $or: [
                { sender: req.user._id, receiver: userId },
                { sender: userId, receiver: req.user._id }
            ]
        })
        .sort({ createdAt: 1 })
        .limit(100) // Limit to 100 most recent messages
        .lean();
        
        // Get all unique user IDs from the messages
        const userIds = new Set();
        const listingIds = new Set();
        const offerIds = new Set();
        
        messages.forEach(message => {
            userIds.add(message.sender.toString());
            userIds.add(message.receiver.toString());
            
            if (message.listingId) {
                listingIds.add(message.listingId.toString());
            }
            
            if (message.offerId) {
                offerIds.add(message.offerId.toString());
            }
        });
        
        // Fetch all users in one query
        const users = await User.find({ _id: { $in: Array.from(userIds) } })
            .select("name profileImage")
            .lean();
            
        // Create a map of user IDs to their data
        const usersMap = new Map();
        users.forEach(user => usersMap.set(user._id.toString(), user));
        
        // Fetch all listings in one query
        const listings = listingIds.size > 0 ? 
            await Listing.find({ _id: { $in: Array.from(listingIds) } })
                .select("address image")
                .lean() : 
            [];
            
        // Create a map of listing IDs to their data
        const listingsMap = new Map();
        listings.forEach(listing => listingsMap.set(listing._id.toString(), listing));
        
        // Fetch all offers in one query
        const offers = offerIds.size > 0 ? 
            await Offer.find({ _id: { $in: Array.from(offerIds) } })
                .select("offerPrice status listing")
                .populate("listing", "address image")
                .lean() : 
            [];
            
        // Create a map of offer IDs to their data
        const offersMap = new Map();
        offers.forEach(offer => offersMap.set(offer._id.toString(), offer));
        
        // Populate the messages with user, listing, and offer data
        const populatedMessages = messages.map(message => {
            const sender = usersMap.get(message.sender.toString());
            const receiver = usersMap.get(message.receiver.toString());
            const listing = message.listingId ? listingsMap.get(message.listingId.toString()) : null;
            const offer = message.offerId ? offersMap.get(message.offerId.toString()) : null;
            
            return {
                ...message,
                sender,
                receiver,
                listingId: listing,
                offerId: offer
            };
        });
        
        // Mark all unread messages as read
        await Message.updateMany(
            { sender: userId, receiver: req.user._id, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );
        
        // Invalidate the message cache for this user
        invalidateMessageCache(req.user._id);
        
        // Invalidate the conversations cache for this user
        invalidateConversationsCache(req.user._id);
        
        // Prepare data for the view
        const viewData = {
            user: req.user,
            otherUser,
            messages: populatedMessages,
            relatedListings: listings,
            relatedOffers: offers
        };
        
        // Cache the conversation data
        conversationCache.set(cacheKey, {
            data: viewData,
            timestamp: now
        });
        
        // Render the conversation view
        res.render("messages/conversation", viewData);
    } catch (error) {
        console.error("❌ Error loading conversation:", error);
        req.flash("error", "Failed to load conversation: " + error.message);
        res.redirect("/messages/inbox");
    }
};

// Function to invalidate conversation cache
const invalidateConversationCache = (userId1, userId2) => {
    if (userId1 && userId2) {
        conversationCache.delete(`${userId1.toString()}-${userId2.toString()}`);
        conversationCache.delete(`${userId2.toString()}-${userId1.toString()}`);
    }
};

// Compose a new message (form)
exports.composeMessage = async (req, res) => {
    try {
        const { recipient, listingId, offerId } = req.query;
        
        // Get recipient information
        let recipientUser;
        let professionals = [];
        let listing = null;
        let offer = null;
        let userListings = [];
        let savedListings = [];
        let userOffers = [];
        let transactionPartners = [];
        
        // If recipient is specified, get their info
        if (recipient) {
            // Check both User and Professional models
            recipientUser = await User.findById(recipient).select("name email profileImage roles");
            
            if (!recipientUser) {
                recipientUser = await Professional.findById(recipient).select("name email profileImage professionalType companyName");
            }
            
            if (!recipientUser) {
                req.flash("error", "Recipient not found");
                return res.redirect("/messages/inbox");
            }
        } else {
            // Find transaction partners - users that the current user has interacted with via offers
            // Step 1: Find offers where the current user is either buyer or seller
            const userOffersForPartners = await Offer.find({
                $or: [
                    { buyer: req.user._id },
                    { seller: req.user._id }
                ]
            });
            
            // Step 2: Extract unique partner IDs from those offers
            const partnerIds = new Set();
            userOffersForPartners.forEach(offer => {
                if (offer.buyer && offer.buyer.toString() !== req.user._id.toString()) {
                    partnerIds.add(offer.buyer.toString());
                }
                if (offer.seller && offer.seller.toString() !== req.user._id.toString()) {
                    partnerIds.add(offer.seller.toString());
                }
            });
            
            // Step 3: Fetch the user details for those partners
            if (partnerIds.size > 0) {
                transactionPartners = await User.find({
                    _id: { $in: Array.from(partnerIds) }
                }).select("name email profileImage roles").sort('name');
            }
            
            // Get professionals grouped by type
            professionals = await Professional.find()
                .select("name email profileImage professionalType companyName")
                .sort('name');
        }
        
        // Get related listing if provided
        if (listingId) {
            listing = await Listing.findById(listingId);
        }
        
        // Get related offer if provided
        if (offerId) {
            offer = await Offer.findById(offerId).populate("listing", "address");
        }
        
        // Get user's listings and offers for context options
        if (req.user.roles && req.user.roles.some(r => r.type === "seller" && r.active)) {
            userListings = await Listing.find({ seller: req.user._id }).select("address");
        }
        
        if (req.user.roles && req.user.roles.some(r => r.type === "buyer" && r.active)) {
            // Saved listings (if user is a buyer)
            if (req.user.buyer && req.user.buyer.savedListings) {
                savedListings = await Listing.find({ 
                    _id: { $in: req.user.buyer.savedListings } 
                }).select("address");
            }
            
            // User's offers
            userOffers = await Offer.find({ buyer: req.user._id })
                .populate("listing", "address")
                .select("offerPrice status");
        }
        
        // Render the compose form
        res.render("messages/compose", {
            user: req.user,
            recipient: recipientUser,
            transactionPartners,
            professionals,
            listing,
            offer,
            userListings,
            savedListings,
            userOffers
        });
    } catch (error) {
        console.error("❌ Error preparing compose form:", error);
        req.flash("error", "Failed to prepare message form");
        res.redirect("/messages/inbox");
    }
};

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, content, listingId, offerId } = req.body;
        const files = req.files;
        const receiverModel = await User.findById(receiverId) ? 'User' : 'Professional';

        if (!receiverId || !content) {
            req.flash("error", "Recipient and message content are required");
            return res.redirect("/messages/inbox");
        }
        
        const messageData = {
            sender: req.user._id,
            senderModel: req.user.professionalType ? 'Professional' : 'User',
            receiver: receiverId,
            receiverModel: receiverModel,
            content: content.trim(),
            isRead: false
            // ...other fields
        };
        
        // Add related contexts if available
        if (listingId && mongoose.Types.ObjectId.isValid(listingId)) {
            messageData.listingId = listingId;
        }
        
        if (offerId && mongoose.Types.ObjectId.isValid(offerId)) {
            messageData.offerId = offerId;
        }
        
        // Process attachments if any
        if (files && files.length > 0) {
            messageData.attachments = files.map(file => ({
                name: file.originalname,
                url: file.path,
                type: file.mimetype,
                size: file.size,
                uploadedAt: new Date()
            }));
        }
        
        // Create and save the message
        const message = new Message(messageData);
        await message.save();
        
        // Create notification for the recipient
        await Notification.create({
            user: receiverId,
            message: `New message from ${req.user.name}`,
            type: "MESSAGE",
            link: `/messages/conversation/${req.user._id}`
        });
        
        // Invalidate the message cache for the receiver
        invalidateMessageCache(receiverId);
        
        // Invalidate the conversations cache for both sender and receiver
        invalidateConversationsCache(req.user._id);
        invalidateConversationsCache(receiverId);
        
        // Invalidate the conversation cache for this specific conversation
        invalidateConversationCache(req.user._id, receiverId);
        
        // Redirect to the conversation
        req.flash("success", "Message sent");
        res.redirect(`/messages/conversation/${receiverId}`);
    } catch (error) {
        console.error("❌ Error sending message:", error);
        req.flash("error", "Failed to send message");
        res.redirect("/messages/inbox");
    }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the message
        const message = await Message.findById(id);
        
        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }
        
        // Check if user owns the message
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        
        // Delete the message
        await message.deleteOne();
        
        return res.json({ success: true, message: "Message deleted" });
    } catch (error) {
        console.error("❌ Error deleting message:", error);
        return res.status(500).json({ success: false, message: "Failed to delete message" });
    }
};

// Mark a message as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find and update the message
        const message = await Message.findById(id);
        
        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }
        
        // Check if user is the receiver
        if (message.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        
        // Update the message
        message.isRead = true;
        message.readAt = new Date();
        await message.save();
        
        // Invalidate the message cache for this user
        invalidateMessageCache(req.user._id);
        
        return res.json({ success: true, message: "Message marked as read" });
    } catch (error) {
        console.error("❌ Error marking message as read:", error);
        return res.status(500).json({ success: false, message: "Failed to mark message as read" });
    }
};

// Mark all messages in a conversation as read
exports.markConversationAsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Update all unread messages in the conversation where user is the receiver
        await Message.updateMany(
            { sender: userId, receiver: req.user._id, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );
        
        // Invalidate the message cache for this user
        invalidateMessageCache(req.user._id);
        
        return res.json({ success: true, message: "All messages marked as read" });
    } catch (error) {
        console.error("❌ Error marking conversation as read:", error);
        return res.status(500).json({ success: false, message: "Failed to mark conversation as read" });
    }
};

// Get unread message count for current user
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiver: req.user._id,
            isRead: false
        });
        
        return res.json({ count });
    } catch (error) {
        console.error("❌ Error getting unread count:", error);
        return res.status(500).json({ error: "Failed to get unread count" });
    }
};
