const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // New: Seller field
    date: { 
        type: Date, 
        required: true,
        validate: {
            validator: function (value) {
                // Only validate future dates when creating or approving showings
                if (this.isNew || this.status === "approved") {
                    return value > new Date();
                }
                return true;
            },
            message: "Showings must be scheduled in the future."
        }
    },
    status: { type: String, enum: ["pending", "confirmed", "canceled"], default: "pending" },
    messages: [{ 
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model("Schedule", scheduleSchema);
