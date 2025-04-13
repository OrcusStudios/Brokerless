const mongoose = require("mongoose");

const ListingSchema = new mongoose.Schema({
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: Number, required: true },
    county: { type: String, required: true },
    propertyType: { 
        type: String, 
        enum: ["single_family", "condominium", "townhouse", "duplex", "land"], 
        required: true 
    },
    price: { type: Number, required: true },
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    squareFootage: { type: Number, required: true },
    description: { type: String, required: true },
    acres: { type: Number, required: true },
    // Multiple sellers support
    sellers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        role: {
            type: String,
            enum: ['primary', 'co-seller'],
            default: 'primary'
        },
        relationship: String // e.g., "Spouse", "Partner", "Family member"
    }],
    // For backward compatibility
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lat: {type: Number, required: true},
    lng: {type: Number, required: true},
    image: { type: String, default: "" }, // Single main image
    images: { type: [String], default: [] }, // Additional images
    measurementSources: { type: [String], default: [] },
    otherMeasurementSource: { type: String },
    measurementDisclaimerAcknowledged: { type: Boolean, default: false },

   // Seller disclosure tracking
disclosures: {
    // Status tracking
    status: {
        section1Completed: { type: Boolean, default: false },
        section2Completed: { type: Boolean, default: false },
        section3Completed: { type: Boolean, default: false },
        section4Completed: { type: Boolean, default: false },
        fullyCompleted: { type: Boolean, default: false },
        lastUpdated: { type: Date }
    },
    
    // Section 1: Statutory Disclosures
    statutory: {
        yearBuilt: { type: Number },
        dateAcquired: { type: Date },
        isVacant: { type: Boolean },
        sellerOccupies: { type: Boolean },
        sellerOccupiedPast: { type: Boolean },
        isForeignPerson: { type: Boolean },
        vacancyExplanation: { type: String },
        
        // Required statutory disclosures
        methDisclosure: { type: Boolean, default: false },
        leadPaintDisclosure: { type: Boolean, default: false },
        wasteDisposalDisclosure: { type: Boolean, default: false },
        radioactiveDisclosure: { type: Boolean, default: false },
        
        // No additional disclosures option
        noAdditionalDisclosures: { type: Boolean, default: false },
        noDisclosureReason: { type: String }
    },
    
    // Section 2: Property Systems
    systems: {
        // HVAC
        hvacIssues: { type: Boolean },
        hvacExplanation: { type: String },
        
        // Electrical
        electricalIssues: { type: Boolean },
        electricalExplanation: { type: String },
        
        // Plumbing
        plumbingIssues: { type: Boolean },
        plumbingExplanation: { type: String },
        
        // Water
        waterSource: { type: String, enum: ["public", "well", "other"] },
        waterIssues: { type: Boolean },
        waterExplanation: { type: String },
        
        // Sewage
        sewageSystem: { type: String, enum: ["public", "septic", "lagoon", "other"] },
        sewageIssues: { type: Boolean },
        sewageExplanation: { type: String }
    },
    
    // Section 3: Structure & Exterior
    structure: {
        // Roof
        roofAge: { type: Number },
        roofLeaked: { type: Boolean },
        roofExplanation: { type: String },
        
        // Foundation
        foundationIssues: { type: Boolean },
        foundationExplanation: { type: String },
        
        // Basement/Water Issues
        basementWaterIssues: { type: Boolean },
        basementExplanation: { type: String },
        
        // Termites/Wood Issues
        termiteIssues: { type: Boolean },
        termiteExplanation: { type: String }
    },
    
    // Section 4: Environmental & Other
    environmental: {
        // Environmental concerns
        asbestosPresent: { type: Boolean },
        moldPresent: { type: Boolean },
        radonPresent: { type: Boolean },
        leadHazards: { type: Boolean },
        otherEnvironmentalConcerns: { type: Boolean },
        environmentalExplanation: { type: String },
        
        // HOA
        hasHOA: { type: Boolean },
        hoaName: { type: String },
        hoaFees: { type: Number },
        hoaFeePeriod: { type: String },
        
        // Insurance & Flooding
        insuranceClaims: { type: Boolean },
        insuranceExplanation: { type: String },
        inFloodZone: { type: Boolean },
        floodZoneExplanation: { type: String },
        
        // Additional information
        additionalDefects: { type: Boolean },
        additionalExplanation: { type: String }
    },
    
    // PDF Document Generation
    pdf: {
        generated: { type: Boolean, default: false },
        url: { type: String },
        generatedAt: { type: Date }
    },
    
    // Seller acknowledgment
    acknowledgment: {
        acknowledged: { type: Boolean, default: false },
        acknowledgedAt: { type: Date },
        sellerIp: { type: String }
    }
  },

    createdAt: { type: Date, default: Date.now }
});

// Helper methods for disclosure completion
ListingSchema.methods.isDisclosureComplete = function() {
    if (!this.disclosures || !this.disclosures.status) return false;
    
    return this.disclosures.status.section1Completed && 
           this.disclosures.status.section2Completed && 
           this.disclosures.status.section3Completed && 
           this.disclosures.status.section4Completed;
  };
  
  ListingSchema.methods.calculateDisclosureProgress = function() {
    if (!this.disclosures || !this.disclosures.status) {
        return {
            percent: 0,
            completedSections: 0,
            totalSections: 4
        };
    }
    
    let completedSections = 0;
    if (this.disclosures.status.section1Completed) completedSections++;
    if (this.disclosures.status.section2Completed) completedSections++;
    if (this.disclosures.status.section3Completed) completedSections++;
    if (this.disclosures.status.section4Completed) completedSections++;
    
    return {
        percent: (completedSections / 4) * 100,
        completedSections: completedSections,
        totalSections: 4
    };
  };

// Helper method to check if a user is a seller of this listing
ListingSchema.methods.isUserSeller = function(userId) {
  // For backward compatibility
  if (this.seller && this.seller.equals(userId)) {
    return true;
  }
  
  // Check in sellers array
  return this.sellers && this.sellers.some(seller => 
    seller.user && seller.user.equals(userId)
  );
};

// Helper method to get a user's role in this listing
ListingSchema.methods.getUserRole = function(userId) {
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
  
  return null; // User is not involved in this listing
};

// Helper method to get all sellers' user IDs
ListingSchema.methods.getSellerIds = function() {
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

// Helper method to get the primary seller
ListingSchema.methods.getPrimarySeller = function() {
  // For backward compatibility
  if (!this.sellers || this.sellers.length === 0) {
    return this.seller;
  }
  
  // Find primary seller in sellers array
  const primarySeller = this.sellers.find(seller => seller.role === 'primary');
  return primarySeller ? primarySeller.user : null;
};

// Helper method to add a co-seller to the listing
ListingSchema.methods.addCoSeller = function(userId, relationship) {
  if (!this.sellers) {
    this.sellers = [];
  }
  
  // Check if user is already a seller
  const existingSeller = this.sellers.find(seller => 
    seller.user && seller.user.equals(userId)
  );
  
  if (existingSeller) {
    return false; // User is already a seller
  }
  
  // Add new co-seller
  this.sellers.push({
    user: userId,
    role: 'co-seller',
    relationship: relationship || ''
  });
  
  return true;
};

// Helper method to remove a co-seller from the listing
ListingSchema.methods.removeCoSeller = function(userId) {
  if (!this.sellers || this.sellers.length === 0) {
    return false;
  }
  
  // Cannot remove primary seller
  const sellerToRemove = this.sellers.find(seller => 
    seller.user && seller.user.equals(userId) && seller.role === 'co-seller'
  );
  
  if (!sellerToRemove) {
    return false; // User is not a co-seller
  }
  
  // Remove co-seller
  this.sellers = this.sellers.filter(seller => 
    !seller.user.equals(userId)
  );
  
  return true;
};


module.exports = mongoose.model("Listing", ListingSchema);
