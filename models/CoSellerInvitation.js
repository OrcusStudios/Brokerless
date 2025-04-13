const mongoose = require('mongoose');

const CoSellerInvitationSchema = new mongoose.Schema({
  // The listing this invitation is for
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  
  // The user who sent the invitation (primary seller)
  inviter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Email of the invited co-seller
  email: {
    type: String,
    required: true
  },
  
  // Relationship to the primary seller
  relationship: {
    type: String,
    required: true
  },
  
  // Unique token for accepting the invitation
  token: {
    type: String,
    required: true,
    unique: true
  },
  
  // Status of the invitation
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  
  // When the invitation expires
  expiresAt: {
    type: Date,
    required: true
  },
  
  // When the invitation was last sent (for resending)
  lastSentAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster lookups
CoSellerInvitationSchema.index({ listing: 1, email: 1 });
CoSellerInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

// Check if invitation is expired
CoSellerInvitationSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Generate a new token and update expiration
CoSellerInvitationSchema.methods.refreshToken = function() {
  const crypto = require('crypto');
  this.token = crypto.randomBytes(32).toString('hex');
  
  // Set expiration to 7 days from now
  const now = new Date();
  this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  this.lastSentAt = now;
  
  return this.save();
};

// Static method to create a new invitation
CoSellerInvitationSchema.statics.createInvitation = async function(listingId, inviterId, email, relationship) {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiration to 7 days from now
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // Check if an invitation already exists for this listing and email
  const existingInvitation = await this.findOne({
    listing: listingId,
    email: email,
    status: 'pending'
  });
  
  if (existingInvitation) {
    // Update existing invitation
    existingInvitation.relationship = relationship;
    existingInvitation.token = token;
    existingInvitation.expiresAt = expiresAt;
    existingInvitation.lastSentAt = now;
    
    return existingInvitation.save();
  }
  
  // Create new invitation
  return this.create({
    listing: listingId,
    inviter: inviterId,
    email,
    relationship,
    token,
    expiresAt,
    lastSentAt: now
  });
};

module.exports = mongoose.model('CoSellerInvitation', CoSellerInvitationSchema);
