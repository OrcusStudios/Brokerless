const mongoose = require("mongoose");

const preApprovalSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lender: { type: mongoose.Schema.Types.ObjectId, ref: "Professional", required: false },
    lenderName: { type: String, required: false },
    approvalAmount: { type: Number, required: false },
    expirationDate: { type: Date, required: false },
    extractedText: { type: String, required: false, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected", "denied"], required: true },
    rejectionReason: { type: String, required: false },
    approvalDate: { type: Date, required: false },
    rejectionDate: { type: Date, required: false },
    additionalInfoRequested: { type: Boolean, default: false },
    additionalInfoDetails: { type: String, required: false },
    additionalInfoRequestDate: { type: Date, required: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PreApproval", preApprovalSchema);
