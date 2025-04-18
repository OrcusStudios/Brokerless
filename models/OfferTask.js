const mongoose = require("mongoose");

/**
 * OfferTask Schema
 * Tracks post-acceptance tasks for buyers and sellers
 */
const OfferTaskSchema = new mongoose.Schema({
  // Reference to the offer
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer",
    required: true
  },
  
  // Task details
  title: {
    type: String,
    required: true
  },
  
  description: {
    type: String
  },
  
  // Who is responsible for this task
  assignedTo: {
    type: String,
    enum: ["buyer", "seller", "both"],
    default: "buyer"
  },
  
  // Task status
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "skipped"],
    default: "pending"
  },
  
  // Task category
  category: {
    type: String,
    enum: ["inspection", "financing", "closing", "other"],
    default: "other"
  },
  
  // Due date (if applicable)
  dueDate: {
    type: Date
  },
  
  // Completion date (when marked as completed)
  completedAt: {
    type: Date
  },
  
  // Who completed the task
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  
  // Notes about the task
  notes: {
    type: String
  },
  
  // Order for display
  displayOrder: {
    type: Number,
    default: 0
  },
  
  // Is this a required task
  isRequired: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Create indexes for better query performance
OfferTaskSchema.index({ offer: 1, status: 1 });
OfferTaskSchema.index({ offer: 1, assignedTo: 1 });

module.exports = mongoose.model("OfferTask", OfferTaskSchema);
