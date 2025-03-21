// controllers/messageController.js
const Message = require("../models/Message");
const User = require("../models/User");
const Professional = require("../models/Professional");
const Notification = require("../models/Notification");
const Listing = require("../models/Listing");
const Offer = require("../models/Offer");
const mongoose = require("mongoose");

// Get inbox with conversations
exports.getInbox = async (req, res) => {
    try {
        const userId = req.user._id;
        // Get all messages where the user is sender or receiver
        const messages = await Message.find({
            $or: [
                { sender: req.user._id },
                { receiver: req.user._id }
            ]
        })
        .sort({ createdAt: -1 });
        
        // Group messages by conversation
        const conversationsMap = new Map();
        
        // Process each message
        for (const message of messages) {
            // First, let's fully populate the sender and receiver
            let senderObj, receiverObj;
            
            // Check User model
            senderObj = await User.findById(message.sender).select("name email profileImage");
            if (!senderObj) {
                // If not found in User model, check Professional model
                senderObj = await Professional.findById(message.sender).select("name email profileImage");
            }
            
            // Same for receiver
            receiverObj = await User.findById(message.receiver).select("name email profileImage");
            if (!receiverObj) {
                receiverObj = await Professional.findById(message.receiver).select("name email profileImage");
            }
            
            // Skip if either sender or receiver not found
            if (!senderObj || !receiverObj) continue;
            
            // Determine the other participant
            const otherParticipantObj = message.sender.equals(userId) ? receiverObj : senderObj;
            const otherParticipantId = message.sender.equals(userId) ? message.receiver : message.sender;
            
            // Now we're sure otherParticipantObj exists with name field
            if (!conversationsMap.has(otherParticipantId.toString())) {
                conversationsMap.set(otherParticipantId.toString(), {
                    otherParticipant: otherParticipantObj,
                    lastMessage: message,
                    unreadCount: message.receiver.equals(userId) && !message.isRead ? 1 : 0
                });
            } else {
                const conversation = conversationsMap.get(otherParticipantId.toString());
                if (message.createdAt > conversation.lastMessage.createdAt) {
                    conversation.lastMessage = message;
                }
                if (message.receiver.equals(userId) && !message.isRead) {
                    conversation.unreadCount++;
                }
            }
        }
        
        // Convert map to array and sort by the most recent message
        const conversations = Array.from(conversationsMap.values())
            .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
        
        res.render('messages/inbox', { 
            conversations, 
            user: req.user 
        });
    } catch (error) {
        console.error('Error getting inbox:', error);
        req.flash('error', 'Error loading inbox');
        res.redirect('/'); // Redirecting to home instead of /dashboard
    }
};

// Get a specific conversation
exports.getConversation = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Validate that other user exists
        let otherUser;
        
        // Check both User and Professional models
        otherUser = await User.findById(userId).select("name email profileImage roles");
        
        if (!otherUser) {
            otherUser = await Professional.findById(userId).select("name email profileImage professionalType");
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
        .populate("sender", "name profileImage")
        .populate("receiver", "name profileImage")
        .populate("listingId", "address image")
        .populate("offerId", "offerPrice status");
        
        // Mark all unread messages as read
        await Message.updateMany(
            { sender: userId, receiver: req.user._id, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );
        
        // Get any related listings (for context)
        let relatedListings = [];
        let relatedOffers = [];
        
        if (messages.length > 0) {
            // Get unique listing IDs from messages
            const listingIds = [...new Set(
                messages
                    .filter(m => m.listingId)
                    .map(m => m.listingId._id.toString())
            )];
            
            // Get unique offer IDs from messages
            const offerIds = [...new Set(
                messages
                    .filter(m => m.offerId)
                    .map(m => m.offerId._id.toString())
            )];
            
            // Fetch related listings
            if (listingIds.length > 0) {
                relatedListings = await Listing.find({ _id: { $in: listingIds } });
            }
            
            // Fetch related offers
            if (offerIds.length > 0) {
                relatedOffers = await Offer.find({ _id: { $in: offerIds } })
                    .populate("listing", "address image");
            }
        }
        
        // Render the conversation view
        res.render("messages/conversation", {
            user: req.user,
            otherUser,
            messages,
            relatedListings,
            relatedOffers
        });
    } catch (error) {
        console.error("❌ Error loading conversation:", error);
        req.flash("error", "Failed to load conversation");
        res.redirect("/messages/inbox");
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