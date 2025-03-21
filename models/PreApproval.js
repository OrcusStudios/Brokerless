const mongoose = require("mongoose");

const preApprovalSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lenderName: { type: String, required: false },
    approvalAmount: { type: Number, required: false },
    expirationDate: { type: Date, required: false },
    extractedText: { type: String, required: true },
    status: { type: String, enum: ["approved", "rejected"], required: true },
    rejectionReason: { type: String, required: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PreApproval", preApprovalSchema);
