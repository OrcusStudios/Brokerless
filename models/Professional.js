const mongoose = require("mongoose");

const ProfessionalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    companyName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    state: { type: String, required: true },
    // Add this to your Professional model schema
    counties: { 
        type: [String], 
        default: [] 
    },
    professionalType: {
        type: String,
        enum: ["title", "lender", "inspector", "contractor"],
        required: true
    },
    loanTypes: { type: [String], default: [] }, 
    licenseNumber: { type: String }, 
    isVerified: { type: Boolean, default: false },
    
    // ✅ Pre-Approval Management
    preApprovals: [{
        buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["pending", "approved", "rejected", "denied"], default: "pending" },
        submittedAt: { type: Date, default: Date.now },
        approvedAt: { type: Date },
        deniedAt: { type: Date }
    }],

    // Only for Lenders
    paymentTier: {
        type: String,
        enum: ["Basic", "Preferred", "Ultra-Preferred"],
        default: "Basic"
    },
    closedDeals: { type: Number, default: 0 }, 
    preApprovalLink: { type: String, default: "" }, // 🔹 New field for lender application links
    profileImage: { type: String, default: "/images/lenderimage.jpg" },

    // Ratings and Reviews
    rating: { type: Number, default: 0 },
    reviews: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        comment: { type: String },
        rating: { type: Number, min: 1, max: 5 }
    }]

}, { timestamps: true });

module.exports = mongoose.model("Professional", ProfessionalSchema);
