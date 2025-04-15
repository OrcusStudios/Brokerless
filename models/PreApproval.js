const mongoose = require("mongoose");

const preApprovalSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lender: { type: mongoose.Schema.Types.ObjectId, ref: "Professional", required: false },
    lenderName: { type: String, required: false },
    approvalAmount: { type: Number, required: false },
    interestRate: { type: Number, required: false },
    term: { type: Number, required: false }, // Loan term in years (15, 20, 30)
    expirationDate: { type: Date, required: false },
    extractedText: { type: String, required: false, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected", "denied"], required: true },
    loanType: { type: String, enum: ["fha", "va", "conventional", "usda"], required: true },
    rejectionReason: { type: String, required: false },
    approvalDate: { type: Date, required: false },
    rejectionDate: { type: Date, required: false },
    additionalInfoRequested: { type: Boolean, default: false },
    additionalInfoDetails: { type: String, required: false },
    additionalInfoRequestDate: { type: Date, required: false },
    // Loan Progress Tracking
    loanProgress: {
        currentStage: { 
            type: String, 
            enum: [
                "application", 
                "processing", 
                "appraisal", 
                "underwriting", 
                "conditions", 
                "closing", 
                "funded", 
                "completed"
            ], 
            default: "application" 
        },
        completedSteps: {
            application: { type: Boolean, default: true },
            processing: { type: Boolean, default: false },
            appraisal: { type: Boolean, default: false },
            underwriting: { type: Boolean, default: false },
            conditions: { type: Boolean, default: false },
            closing: { type: Boolean, default: false },
            funded: { type: Boolean, default: false },
            completed: { type: Boolean, default: false }
        },
        notes: { type: String },
        lastUpdated: { type: Date, default: Date.now },
        history: [{
            stage: { type: String },
            completedAt: { type: Date, default: Date.now },
            notes: { type: String }
        }]
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PreApproval", preApprovalSchema);
