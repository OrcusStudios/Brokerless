const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto"); 

const UserSchema = new mongoose.Schema({
  // Basic user information
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String },
  profileImage: { type: String, default: "/images/default-profile.jpg" },
  
  // Address information
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: "USA" }
  },
  
  // Roles system with active status
  roles: [{
    type: { 
      type: String, 
      enum: ["buyer", "seller", "lender", "title", "inspector", "agent", "professional"], 
      required: true 
    },
    active: { type: Boolean, default: true },
    activatedAt: { type: Date, default: Date.now }
  }],

  // Buyer-specific information
  buyer: {
    savedListings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],
    preApprovalStatus: {
      type: String,
      enum: ["none", "pending", "approved", "denied"],
      default: "none"
    },
    preApprovalLender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    preApprovalAmount: { type: Number },
    preApprovalExpiration: { type: Date },
    preApprovalDate: { type: Date, default: Date.now() },
    searchPreferences: {
      priceRange: {
        min: { type: Number, default: 0 },
        max: { type: Number }
      },
      bedrooms: { type: Number, min: 0 },
      bathrooms: { type: Number, min: 0 },
      propertyTypes: [{ type: String }],
      locations: [{ type: String }],
      amenities: [{ type: String }]
    },
    offers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Offer" }]
  },

  // Seller-specific information
  seller: {
    listings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified"],
      default: "unverified"
    },
    paymentInfo: {
      accountType: { type: String },
      accountDetails: { type: String },
      // Storing minimal payment info, with actual details in a payment processor
    },
    receivedOffers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Offer" }]
  },

  // Lender-specific information
  lender: {
    company: { type: String },
    title: { type: String },
    license: { type: String },
    specialties: [{ type: String }],
    rates: {
      conventional: { type: Number },
      fha: { type: Number },
      va: { type: Number },
      jumbo: { type: Number }
    },
    applicants: [
      {
        buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { 
          type: String, 
          enum: ["never applied", "pending", "approved", "denied"], 
          default: "never applied" 
        },
        appliedAt: { type: Date },
        amount: { type: Number },
        term: { type: Number }, // in months
        interestRate: { type: Number },
        notes: { type: String }
      }
    ],
    verified: { type: Boolean, default: false }
  },

  // Professional-specific information (for title, inspector, agent)
  professional: {
    type: { type: String },
    company: { type: String },
    license: { type: String },
    yearsExperience: { type: Number },
    serviceAreas: [{ type: String }],
    specialties: [{ type: String }],
    verified: { type: Boolean, default: false }
  },

  // Notification preferences
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false }
  },

  // Account information
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date }
}, { timestamps: true });

// Pre-save middleware to hash password
UserSchema.pre("save", async function(next) {
  const user = this;
  
  // Only hash the password if it's modified (or new)
  if (!user.isModified("password")) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    const hash = await bcrypt.hash(user.password, salt);
    // Replace the plain text password with the hash
    user.password = hash;
    next();
  } catch (error) {
    next(error);
  }
});

// Compare passwords for login
UserSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

// Role management methods
UserSchema.methods.addRole = function(roleType) {
  // Check if role already exists
  const existingRole = this.roles.find(r => r.type === roleType);
  
  if (!existingRole) {
    this.roles.push({ 
      type: roleType, 
      active: true,
      activatedAt: new Date()
    });
  } else if (!existingRole.active) {
    existingRole.active = true;
    existingRole.activatedAt = new Date();
  }
  
  return this.save();
};

UserSchema.methods.hasActiveRole = function(roleType) {
  return this.roles.some(r => r.type === roleType && r.active);
};

UserSchema.methods.deactivateRole = function(roleType) {
  const roleIndex = this.roles.findIndex(r => r.type === roleType);
  
  if (roleIndex !== -1) {
    this.roles[roleIndex].active = false;
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Get all active roles for a user
UserSchema.methods.getActiveRoles = function() {
  return this.roles
    .filter(role => role.active)
    .map(role => role.type);
};

// Check if user has any active roles from a list
UserSchema.methods.hasAnyActiveRole = function(roleTypes) {
  return this.roles.some(r => roleTypes.includes(r.type) && r.active);
};

// Add a saved listing for a buyer
UserSchema.methods.saveListing = function(listingId) {
  if (!this.buyer.savedListings.includes(listingId)) {
    this.buyer.savedListings.push(listingId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Remove a saved listing for a buyer
UserSchema.methods.unsaveListing = function(listingId) {
  this.buyer.savedListings = this.buyer.savedListings.filter(
    id => id.toString() !== listingId.toString()
  );
  return this.save();
};

// Update pre-approval status
UserSchema.methods.updatePreApprovalStatus = function(status, lenderId, amount, expirationDate) {
  this.buyer.preApprovalStatus = status;
  this.buyer.preApprovalLender = lenderId;
  
  if (amount) this.buyer.preApprovalAmount = amount;
  if (expirationDate) this.buyer.preApprovalExpiration = expirationDate;
  
  return this.save();
};

// Activate Buyer role with initial search preferences
UserSchema.methods.activateBuyerWithPreferences = function(preferences) {
  // Add buyer role if not present
  if (!this.hasActiveRole('buyer')) {
    this.addRole('buyer');
  }
  
  // Update search preferences
  if (preferences) {
    this.buyer.searchPreferences = {
      ...this.buyer.searchPreferences,
      ...preferences
    };
  }
  
  return this.save();
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = async function() {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash token and set to resetPasswordToken field
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  // Set expire time to 30 minutes
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000;
  
  await this.save();
  
  return resetToken;
};

// Virtual for full name (if you decide to split name into first/last)
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

// Indexes for better query performance
UserSchema.index({ 'roles.type': 1, 'roles.active': 1 });
UserSchema.index({ 'buyer.preApprovalStatus': 1 });
UserSchema.index({ 'seller.verificationStatus': 1 });

module.exports = mongoose.model("User", UserSchema);