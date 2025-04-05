const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  // Parties Information
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
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

// Document Signature Tracking
signatures: {
  mainContract: {
    buyerSigned: { type: Boolean, default: false },
    buyerSignedDate: { type: Date },
    sellerSigned: { type: Boolean, default: false },
    sellerSignedDate: { type: Date }
  },
  
  // Signature tracking for each rider
  riders: {
    sightUnseen: {
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date }
    },
    
    fee: {
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date }
    },
    
    wireFraudAdvisory: {
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date }
    },
    
    homeInspectionAdvisory: {
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date }
    },
    
    governmentLoan: {
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date }
    },
    
    contingencyForSale: {
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date }
    },
    
    contingencyForClosing: {
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date }
    },
    
    amendment: {
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date }
    },
    
    walkThrough: {
      buyerSigned: { type: Boolean, default: false },
      buyerSignedDate: { type: Date },
      sellerSigned: { type: Boolean, default: false },
      sellerSignedDate: { type: Date }
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

module.exports = mongoose.model('Offer', OfferSchema);
