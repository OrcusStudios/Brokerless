const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    type: {
        type: String,
        enum: [
            "Showing",       // Showing request
            "Approved",      // General approval (showing or financing)
            "Declined",      // Showing was declined
            "Rejected",      // Offer was rejected
            "Denied",        // Loan or financial denial
            "Completed",     // Transaction completed
            "Offer",         // New offer submitted
            "Countered",     // Offer countered
            "Withdrawn",    // Offer Withhdrawn
            "Accepted",     // Offer countered
            "General",       // General notification
            "info",          // Informational notification
            "success",       // Success notification
            "warning",       // Warning notification
            "error"          // Error notification
        ],
        default: "General"
    },
    link: { type: String }, // Optional: Directs user to relevant page
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);