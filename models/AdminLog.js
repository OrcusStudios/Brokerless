const mongoose = require("mongoose");

const AdminLogSchema = new mongoose.Schema({
  // Admin who performed the action
  admin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  // Type of activity
  activityType: { 
    type: String, 
    required: true,
    enum: [
      "LOGIN", 
      "LOGOUT",
      "CREATE_ADMIN",
      "UPDATE_ADMIN",
      "REMOVE_ADMIN",
      "UPDATE_USER",
      "DELETE_USER",
      "CREATE_LISTING",
      "UPDATE_LISTING",
      "DELETE_LISTING",
      "APPROVE_PROFESSIONAL",
      "DENY_PROFESSIONAL",
      "SYSTEM_SETTINGS",
      "VIEW_ANALYTICS",
      "OTHER"
    ]
  },
  
  // Target of the action (if applicable)
  targetUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  
  targetListing: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Listing" 
  },
  
  // IP address of the admin
  ipAddress: { 
    type: String 
  },
  
  // User agent of the admin
  userAgent: { 
    type: String 
  },
  
  // Additional details about the action
  details: {
    method: { type: String },
    path: { type: String },
    params: { type: mongoose.Schema.Types.Mixed },
    query: { type: mongoose.Schema.Types.Mixed },
    body: { type: mongoose.Schema.Types.Mixed }
  },
  
  // Success or failure
  success: { 
    type: Boolean, 
    default: true 
  },
  
  // Error message if action failed
  errorMessage: { 
    type: String 
  },
  
  // Timestamp
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Indexes for better query performance
AdminLogSchema.index({ admin: 1 });
AdminLogSchema.index({ activityType: 1 });
AdminLogSchema.index({ createdAt: 1 });
AdminLogSchema.index({ targetUser: 1 });
AdminLogSchema.index({ targetListing: 1 });

module.exports = mongoose.model("AdminLog", AdminLogSchema);
