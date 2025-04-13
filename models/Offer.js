const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  // Parties Information
  // Primary buyer and additional buyers
  buyers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['primary', 'co-buyer'],
      default: 'primary'
    },
    ownership: {
      type: Number, // Percentage of ownership
      default: 100
    },
    relationship: String, // e.g., "Spouse", "Partner", "Family member"
    signatureStatus: {
      type: String,
      enum: ['pending', 'invited', 'viewed', 'signed', 'rejected'],
      default: 'pending'
    },
    signatureMethod: {
      type: String,
      enum: ['electronic', 'in-person', 'notarized'],
      default: 'electronic'
    },
    signatureToken: String, // Unique token for signature verification
    signatureIP: String,
    signatureUserAgent: String,
    invitedAt: Date,
    viewedAt: Date,
    signedAt: Date
  }],
  
  // Primary seller and additional sellers
  sellers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['primary', 'co-seller'],
      default: 'primary'
    },
    ownership: {
      type: Number, // Percentage of ownership
      default: 100
    },
    relationship: String,
    signatureStatus: {
      type: String,
      enum: ['pending', 'invited', 'viewed', 'signed', 'rejected'],
      default: 'pending'
    },
    signatureMethod: {
      type: String,
      enum: ['electronic', 'in-person', 'notarized'],
      default: 'electronic'
    },
    signatureToken: String,
    signatureIP: String,
    signatureUserAgent: String,
    invitedAt: Date,
    viewedAt: Date,
    signedAt: Date
  }],
  
  // For backward compatibility
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },

  // Purchase Details
  offerPrice: {
    type: Number,
    required: true
  },
  
  // Add to the Offer schema
  offerExpiration: {
    type: Date,
    required: true
  },

  // For non-populated cases or direct form submissions
  buyerDetails: {
    name: String,
    email: String
  },

  sellerDetails: {
    name: String,
    email: String
  },

  // Purchase Details
  propertyType: {
    type: String,
    enum: ["single_family", "condominium", "townhouse", "duplex"]
  },
  
  // Financing Information
  financingType: {
    type: String,
    enum: ['cash', 'bank', 'seller'],
    required: true
  },
  // Personal Property
  includedPersonalProperty: {
    type: String,
    default: ''
  },
  excludedPersonalProperty: {
    type: String,
    default: ''
  },
  loanType: {
    type: String,
    enum: ['conventional', 'fha', 'va', 'usda', null],
    default: null
  },
  loanAmount: {
    type: Number,
    default: null
  },
  interestRate: {
    type: Number,
    default: null
  },
  loanTerm: {
    type: Number,
    default: null
  },
  loanApprovalDeadline: {
    type: Number,
    default: null
  },
  // Lender Information
  lenderInfo: {
    name: {
      type: String,
      default: null
    },
    email: {
      type: String,
      default: null
    },
    phone: {
      type: String,
      default: null
    },
    company: {
      type: String,
      default: null
    },
    notificationSent: {
      type: Boolean,
      default: false
    }
  },

  // Earnest Money
  earnestMoney: {
    type: Number,
    required: true
  },
  earnestDueDate: {
    type: Date,
    required: true
  },
  escrowAgent: {
    type: String,
    default: ''
  },

  // Closing Details
  closingDate: {
    type: Date,
    required: true
  },
  titleCompany: {
    type: String,
    required: true
  },
  titleCompanyAddress: {
    type: String,
    default: ''
  },

  // Contingencies
  contingencies: [{
    type: String,
    enum: ['appraisal', 'financing', 'inspection']
  }],
  
  // Contingency Specific Details
  appraisalDeadlineDays: {
    type: Number,
    default: null
  },
  loanApprovalDeadlineDays: {
    type: Number,
    default: null
  },
  inspectionDeadlineDays: {
    type: Number,
    default: null
  },
  saleOfAnotherAddress: {
    type: String,
    default: null
  },

  // Appraisal
  appraisalRequired: {
    type: Boolean,
    default: true
  },

  // Closing Costs
  closingCosts: {
    type: String,
    enum: ['buyer', 'seller', 'split', 'each_pays_own'],
    default: 'each_pays_own'
  },

    // Closing Costs
    maxConcession: {
      type: Number,
      default: null
    },

  // Offer Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'countered', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  
  // Negotiation History
  offerHistory: [{
    counteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    previousPrice: Number,
    newPrice: Number,
    previousDeadlines: {
      appraisalDeadlineDays: Number,
      loanApprovalDeadlineDays: Number,
      inspectionDeadlineDays: Number,
      closingDate: Number
    },
    newDeadlines: {
      appraisalDeadlineDays: Number,
      loanApprovalDeadlineDays: Number,
      inspectionDeadlineDays: Number,
      closingDate: Number
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Additional Acknowledgments
  acknowledgment: {
    type: Boolean,
    required: true
  },
  agreeDocuments: {
    type: Boolean,
    required: true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  //Closing
  closingStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'title_review', 'documents_ready', 'signing_scheduled', 'signed', 'funded', 'recorded', 'closed'],
    default: 'pending'
  },
  closingSteps: [{
    name: String,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'complete', 'issue'],
      default: 'pending'
    },
    dueDate: Date,
    completedDate: Date,
    notes: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional'
    }
  }],
  titleCompanyDetails: {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Professional'
    },
    contactPerson: String,
    phoneNumber: String,
    email: String,
    escrowNumber: String,
    earnestMoneyReceived: {
      status: {
        type: Boolean,
        default: false
      },
      date: Date,
      amount: Number,
      confirmationNumber: String
    },
    // Add payment tracking
    paymentStatus: {
      method: { 
        type: String, 
        enum: ['check', 'wire', 'other'], 
        default: null 
      },
      status: { 
        type: String, 
        enum: ['pending', 'initiated', 'sent', 'received', 'completed'], 
        default: 'pending' 
      },
      initiatedDate: Date,
      completedDate: Date,
      checkNumber: String,
      wireConfirmationNumber: String,
      notes: String
    }
  },  
// Rider Support
riders: {
  // Sight Unseen Rider
  sightUnseen: {
    included: { type: Boolean, default: false },
    reserveRightToView: { type: Boolean, default: false },
    propertyViewingPeriod: { type: Number, default: 5 } // days
  },
  
  // Fee Rider (Platform Fee Disclosure)
  fee: {
    included: { type: Boolean, default: false },
    platformFee: { type: Number, default: 0 },
    feeAcknowledged: { type: Boolean, default: false }
  },
  
  // Wire Fraud Advisory
  wireFraudAdvisory: {
    included: { type: Boolean, default: false },
    acknowledged: { type: Boolean, default: false },
    acknowledgedDate: { type: Date }
  },
  
  // For Your Protection: Get a Home Inspection
  homeInspectionAdvisory: {
    included: { type: Boolean, default: false },
    acknowledged: { type: Boolean, default: false },
    acknowledgedDate: { type: Date }
  },
  
  // Government Loan Rider
  governmentLoan: {
    included: { type: Boolean, default: false },
    loanType: { type: String, enum: ['FHA', 'VA', 'USDA', 'Other'], default: null },
    loanPercentage: { type: Number, default: null },
    loanContingencyDeadline: { type: Number, default: 25 }, // days
    appraisalValue: { type: Number, default: null }
  },
  
  // Contingency for Sale of Buyer's Existing Property
  contingencyForSale: {
    included: { type: Boolean, default: false },
    existingPropertyAddress: { type: String, default: null },
    existingPropertyClosingDeadline: { type: Date, default: null },
    kickOutHours: { type: Number, default: 72 }
  },
  
  // Contingency for Closing of Buyer's Existing Property
  contingencyForClosing: {
    included: { type: Boolean, default: false },
    existingPropertyContractDate: { type: Date, default: null },
    existingPropertyAddress: { type: String, default: null },
    existingPropertyContainsContingency: { type: Boolean, default: false }
  },
},

// Inspection Details
inspection: {
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'completed', 'waived'],
    default: 'pending'
  },
  // For scheduled inspections
  scheduledDate: { type: Date },
  timeSlot: { 
    type: String,
    enum: ['morning', 'afternoon', 'evening']
  },
  alternateDate: { type: Date },
  notes: { type: String },
  inspector: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional' },
    name: { type: String },
    companyName: { type: String },
    email: { type: String },
    phone: { type: String },
    contact: { type: String } // For custom inspectors
  },
  contact: {
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    willAttend: { type: Boolean, default: true }
  },
  scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledAt: { type: Date },
  
  // For completed inspections
  completedDate: { type: Date },
  report: {
    fileUrl: { type: String },
    uploadedAt: { type: Date },
    findings: { type: String },
    recommendations: { type: String }
  },
  
  // For waived inspections
  waiverReason: { type: String },
  waiverAcknowledgments: [{ type: String }],
  waiverSignature: { type: String },
  waivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  waivedAt: { type: Date }
},

// Document Signature Tracking
signatures: {
  mainContract: {
    // For backward compatibility
    buyerSigned: { type: Boolean, default: false },
    buyerSignedDate: { type: Date },
    sellerSigned: { type: Boolean, default: false },
    sellerSignedDate: { type: Date },
    
    // New multi-party signature tracking
    buyersSigned: { type: Boolean, default: false }, // All buyers have signed
    sellersSigned: { type: Boolean, default: false }, // All sellers have signed
    buyerSignatures: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      signedDate: Date,
      signatureMethod: {
        type: String,
        enum: ['electronic', 'in-person', 'notarized'],
        default: 'electronic'
      },
      signatureIP: String,
      signatureUserAgent: String
    }],
    sellerSignatures: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      signedDate: Date,
      signatureMethod: {
        type: String,
        enum: ['electronic', 'in-person', 'notarized'],
        default: 'electronic'
      },
      signatureIP: String,
      signatureUserAgent: String
    }]
  },
  
  // Signature tracking for each rider
  riders: {
    sightUnseen: {
      // For backward compatibility
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date },
      
      // New multi-party signature tracking
      buyersSigned: { type: Boolean, default: false },
      sellersSigned: { type: Boolean, default: false },
      buyerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }],
      sellerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }]
    },
    
    fee: {
      // For backward compatibility
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      
      // New multi-party signature tracking
      buyersSigned: { type: Boolean, default: false },
      buyerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }]
    },
    
    wireFraudAdvisory: {
      // For backward compatibility
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date },
      
      // New multi-party signature tracking
      buyersSigned: { type: Boolean, default: false },
      sellersSigned: { type: Boolean, default: false },
      buyerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }],
      sellerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }]
    },
    
    homeInspectionAdvisory: {
      // For backward compatibility
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      
      // New multi-party signature tracking
      buyersSigned: { type: Boolean, default: false },
      buyerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }]
    },
    
    governmentLoan: {
      // For backward compatibility
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date },
      
      // New multi-party signature tracking
      buyersSigned: { type: Boolean, default: false },
      sellersSigned: { type: Boolean, default: false },
      buyerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }],
      sellerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }]
    },
    
    contingencyForSale: {
      // For backward compatibility
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date },
      
      // New multi-party signature tracking
      buyersSigned: { type: Boolean, default: false },
      sellersSigned: { type: Boolean, default: false },
      buyerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }],
      sellerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }]
    },
    
    contingencyForClosing: {
      // For backward compatibility
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date },
      
      // New multi-party signature tracking
      buyersSigned: { type: Boolean, default: false },
      sellersSigned: { type: Boolean, default: false },
      buyerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }],
      sellerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }]
    },
    
    amendment: {
      // For backward compatibility
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date },
      
      // New multi-party signature tracking
      buyersSigned: { type: Boolean, default: false },
      sellersSigned: { type: Boolean, default: false },
      buyerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }],
      sellerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }]
    },
    
    walkThrough: {
      // For backward compatibility
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date },
      
      // New multi-party signature tracking
      buyersSigned: { type: Boolean, default: false },
      sellersSigned: { type: Boolean, default: false },
      buyerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }],
      sellerSignatures: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        signedDate: Date
      }]
    }
  }
}
});

// Helper methods
OfferSchema.methods.hasRider = function(riderName) {
return this.riders && this.riders[riderName] && this.riders[riderName].included;
};

OfferSchema.methods.getActiveRiders = function() {
const result = [];
if (this.riders) {
  for (const [key, rider] of Object.entries(this.riders)) {
    if (rider.included) {
      result.push(key);
    }
  }
}
return result;
};

OfferSchema.methods.checkRequiredRiders = function() {
const missingRiders = [];

// Check if financing type requires government loan rider
if (this.financingType === 'bank' && 
    ['fha', 'va', 'usda'].includes(this.loanType) && 
    !this.hasRider('governmentLoan')) {
  missingRiders.push('Government Loan Rider');
}

// Check if offer includes saleOfAnotherHome contingency
if (this.contingencies.includes('saleOfAnotherHome') && 
    !this.hasRider('contingencyForSale') && 
    !this.hasRider('contingencyForClosing')) {
  missingRiders.push('Contingency for Sale of Buyer\'s Existing Property or Contingency for Closing of Buyer\'s Existing Property');
}

return missingRiders;
};

// Helper method to check if all buyers have signed the main contract
OfferSchema.methods.allBuyersSigned = function() {
  // For backward compatibility
  if (!this.buyers || this.buyers.length === 0) {
    return this.signatures.mainContract.buyerSigned;
  }
  
  // Check if all buyers have signed
  return this.buyers.every(buyer => buyer.signatureStatus === 'signed');
};

// Helper method to check if all sellers have signed the main contract
OfferSchema.methods.allSellersSigned = function() {
  // For backward compatibility
  if (!this.sellers || this.sellers.length === 0) {
    return this.signatures.mainContract.sellerSigned;
  }
  
  // Check if all sellers have signed
  return this.sellers.every(seller => seller.signatureStatus === 'signed');
};

// Helper method to check if all parties have signed the main contract
OfferSchema.methods.isFullySigned = function() {
  return this.allBuyersSigned() && this.allSellersSigned();
};

// Helper method to check if a specific user is a buyer in this offer
OfferSchema.methods.isUserBuyer = function(userId) {
  // For backward compatibility
  if (this.buyer && this.buyer.equals(userId)) {
    return true;
  }
  
  // Check in buyers array
  return this.buyers && this.buyers.some(buyer => 
    buyer.user && buyer.user.equals(userId)
  );
};

// Helper method to check if a specific user is a seller in this offer
OfferSchema.methods.isUserSeller = function(userId) {
  // For backward compatibility
  if (this.seller && this.seller.equals(userId)) {
    return true;
  }
  
  // Check in sellers array
  return this.sellers && this.sellers.some(seller => 
    seller.user && seller.user.equals(userId)
  );
};

// Helper method to get a user's role in this offer
OfferSchema.methods.getUserRole = function(userId) {
  // Check if user is a buyer
  if (this.isUserBuyer(userId)) {
    // Check if user is the primary buyer
    const buyerEntry = this.buyers && this.buyers.find(buyer => 
      buyer.user && buyer.user.equals(userId)
    );
    
    if (buyerEntry) {
      return buyerEntry.role; // 'primary' or 'co-buyer'
    }
    
    return 'buyer'; // For backward compatibility
  }
  
  // Check if user is a seller
  if (this.isUserSeller(userId)) {
    // Check if user is the primary seller
    const sellerEntry = this.sellers && this.sellers.find(seller => 
      seller.user && seller.user.equals(userId)
    );
    
    if (sellerEntry) {
      return sellerEntry.role; // 'primary' or 'co-seller'
    }
    
    return 'seller'; // For backward compatibility
  }
  
  return null; // User is not involved in this offer
};

// Helper method to get all buyers' user IDs
OfferSchema.methods.getBuyerIds = function() {
  const buyerIds = [];
  
  // For backward compatibility
  if (this.buyer) {
    buyerIds.push(this.buyer);
  }
  
  // Add from buyers array
  if (this.buyers && this.buyers.length > 0) {
    this.buyers.forEach(buyer => {
      if (buyer.user && !buyerIds.includes(buyer.user)) {
        buyerIds.push(buyer.user);
      }
    });
  }
  
  return buyerIds;
};

// Helper method to get all sellers' user IDs
OfferSchema.methods.getSellerIds = function() {
  const sellerIds = [];
  
  // For backward compatibility
  if (this.seller) {
    sellerIds.push(this.seller);
  }
  
  // Add from sellers array
  if (this.sellers && this.sellers.length > 0) {
    this.sellers.forEach(seller => {
      if (seller.user && !sellerIds.includes(seller.user)) {
        sellerIds.push(seller.user);
      }
    });
  }
  
  return sellerIds;
};

// Helper method to update signature status for a user
OfferSchema.methods.updateSignatureStatus = function(userId, status, metadata = {}) {
  let updated = false;
  
  // Update in buyers array
  if (this.buyers && this.buyers.length > 0) {
    this.buyers.forEach(buyer => {
      if (buyer.user && buyer.user.equals(userId)) {
        buyer.signatureStatus = status;
        buyer.signedAt = status === 'signed' ? new Date() : buyer.signedAt;
        
        // Add additional metadata if provided
        if (metadata.signatureMethod) buyer.signatureMethod = metadata.signatureMethod;
        if (metadata.signatureIP) buyer.signatureIP = metadata.signatureIP;
        if (metadata.signatureUserAgent) buyer.signatureUserAgent = metadata.signatureUserAgent;
        
        updated = true;
      }
    });
  }
  
  // Update in sellers array
  if (this.sellers && this.sellers.length > 0) {
    this.sellers.forEach(seller => {
      if (seller.user && seller.user.equals(userId)) {
        seller.signatureStatus = status;
        seller.signedAt = status === 'signed' ? new Date() : seller.signedAt;
        
        // Add additional metadata if provided
        if (metadata.signatureMethod) seller.signatureMethod = metadata.signatureMethod;
        if (metadata.signatureIP) seller.signatureIP = metadata.signatureIP;
        if (metadata.signatureUserAgent) seller.signatureUserAgent = metadata.signatureUserAgent;
        
        updated = true;
      }
    });
  }
  
  // Update signature tracking
  if (updated && status === 'signed') {
    // Check if user is a buyer
    if (this.isUserBuyer(userId)) {
      // Add to buyer signatures
      const existingSignature = this.signatures.mainContract.buyerSignatures.find(
        sig => sig.user && sig.user.equals(userId)
      );
      
      if (!existingSignature) {
        this.signatures.mainContract.buyerSignatures.push({
          user: userId,
          signedDate: new Date(),
          signatureMethod: metadata.signatureMethod || 'electronic',
          signatureIP: metadata.signatureIP,
          signatureUserAgent: metadata.signatureUserAgent
        });
      }
      
      // Update buyersSigned flag
      this.signatures.mainContract.buyersSigned = this.allBuyersSigned();
      
      // For backward compatibility
      if (this.buyer && this.buyer.equals(userId)) {
        this.signatures.mainContract.buyerSigned = true;
        this.signatures.mainContract.buyerSignedDate = new Date();
      }
    }
    
    // Check if user is a seller
    if (this.isUserSeller(userId)) {
      // Add to seller signatures
      const existingSignature = this.signatures.mainContract.sellerSignatures.find(
        sig => sig.user && sig.user.equals(userId)
      );
      
      if (!existingSignature) {
        this.signatures.mainContract.sellerSignatures.push({
          user: userId,
          signedDate: new Date(),
          signatureMethod: metadata.signatureMethod || 'electronic',
          signatureIP: metadata.signatureIP,
          signatureUserAgent: metadata.signatureUserAgent
        });
      }
      
      // Update sellersSigned flag
      this.signatures.mainContract.sellersSigned = this.allSellersSigned();
      
      // For backward compatibility
      if (this.seller && this.seller.equals(userId)) {
        this.signatures.mainContract.sellerSigned = true;
        this.signatures.mainContract.sellerSignedDate = new Date();
      }
    }
  }
  
  return updated;
};

module.exports = mongoose.model('Offer', OfferSchema);
