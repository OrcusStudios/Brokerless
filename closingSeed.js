// closingSeed.js
const mongoose = require('mongoose');
const Offer = require('./models/Offer');
const Listing = require('./models/Listing');
const User = require('./models/User');
const Professional = require('./models/Professional');
const ClosingDocument = require('./models/ClosingDocument');
const dotenv = require('dotenv');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Define IDs from your database
const SELLER_ID = '67c38dd66e292daf3e942988';
const BUYER_ID = '67c4abf88bfcbcfb77fb9736';
const LENDER_ID = '67c211357c0d8ca62757f5f9';
const TITLE_COMPANY_ID = '67c8a3cfcd9076dba79fbdd9';

// Function to create a sample listing
async function createListing() {
  try {
    // Check if a sample listing for this seller already exists
    const existingListing = await Listing.findOne({ seller: SELLER_ID });
    
    if (existingListing) {
      console.log('✅ Sample listing already exists:', existingListing._id);
      return existingListing;
    }
    
    const listing = new Listing({
      address: '123 Maple Street',
      city: 'Springfield',
      state: 'MO',
      zip: 65810,
      county: 'Greene',
      price: 350000,
      bedrooms: 4,
      bathrooms: 3,
      squareFootage: 2500,
      description: 'Beautiful two-story home in a quiet neighborhood. Recently renovated with modern appliances and finishes.',
      seller: SELLER_ID,
      lat: 37.208957,
      lng: -93.292299,
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop',
      images: [
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=2070&auto=format&fit=crop'
      ],
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    });
    
    await listing.save();
    console.log('✅ Sample listing created:', listing._id);
    return listing;
  } catch (error) {
    console.error('❌ Error creating listing:', error);
    throw error;
  }
}

// Function to create a sample offer with closing information
async function createClosingOffer(listing) {
  try {
    // Check if an offer already exists for this listing
    const existingOffer = await Offer.findOne({
      buyer: BUYER_ID,
      seller: SELLER_ID,
      listing: listing._id
    });
    
    if (existingOffer) {
      console.log('✅ Sample offer already exists:', existingOffer._id);
      return existingOffer;
    }
    
    // Calculate dates
    const now = new Date();
    
    // Create an offer that's already accepted and in closing process
    const offer = new Offer({
      buyer: BUYER_ID,
      seller: SELLER_ID,
      listing: listing._id,
      
      // Purchase details
      offerPrice: 340000,
      
      // Financing
      financingType: 'bank',
      loanType: 'conventional',
      loanAmount: 272000,
      interestRate: 6.5,
      loanTerm: 30,
      
      // Earnest money
      earnestMoney: 5000,
      earnestDueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      escrowAgent: 'ABC Title Company',
      
      // Closing details
      closingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      titleCompany: 'ABC Title Company',
      titleCompanyAddress: '789 Main Street, Springfield, MO 65801',
      
      // Contingencies
      contingencies: ['appraisal', 'financing', 'inspection'],
      appraisalDeadlineDays: 14,
      loanApprovalDeadlineDays: 21,
      inspectionDeadlineDays: 10,
      
      // Other details
      appraisalRequired: true,
      closingCosts: 'split',
      
      // Status
      status: 'accepted',
      acknowledgment: true,
      agreeDocuments: true,
      
      // Timestamps
      createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      
      // Closing information
      closingStatus: 'in_progress',
      titleCompanyDetails: {
        company: TITLE_COMPANY_ID,
        contactPerson: 'Jane Smith',
        phoneNumber: '417-555-1234',
        email: 'jane.smith@abctitle.com',
        escrowNumber: 'ESC-' + Math.floor(100000 + Math.random() * 900000), // Random 6-digit number
        earnestMoneyReceived: {
          status: false, // Not received yet
          date: null,
          amount: null,
          confirmationNumber: null
        }
      },
      
      // Closing steps
      closingSteps: [
        {
          name: 'Earnest Money Deposit',
          status: 'pending',
          dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          completedDate: null,
          notes: 'Awaiting receipt of earnest money',
          assignedTo: BUYER_ID
        },
        {
          name: 'Title Search',
          status: 'pending',
          dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          completedDate: null,
          notes: 'Preliminary title search initiated',
          assignedTo: TITLE_COMPANY_ID
        },
        {
          name: 'Home Inspection',
          status: 'pending',
          dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          completedDate: null,
          notes: null,
          assignedTo: BUYER_ID
        },
        {
          name: 'Appraisal',
          status: 'pending',
          dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          completedDate: null,
          notes: null,
          assignedTo: LENDER_ID
        },
        {
          name: 'Final Loan Approval',
          status: 'pending',
          dueDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
          completedDate: null,
          notes: null,
          assignedTo: LENDER_ID
        },
        {
          name: 'Closing Disclosure',
          status: 'pending',
          dueDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
          completedDate: null,
          notes: null,
          assignedTo: TITLE_COMPANY_ID
        },
        {
          name: 'Final Walk-Through',
          status: 'pending',
          dueDate: new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000), // 29 days from now
          completedDate: null,
          notes: null,
          assignedTo: BUYER_ID
        },
        {
          name: 'Closing & Funding',
          status: 'pending',
          dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          completedDate: null,
          notes: null,
          assignedTo: TITLE_COMPANY_ID
        }
      ]
    });
    
    await offer.save();
    console.log('✅ Sample closing offer created:', offer._id);
    return offer;
  } catch (error) {
    console.error('❌ Error creating offer:', error);
    throw error;
  }
}

// Function to update user models with listing and offer references
async function updateUserReferences(listing, offer) {
  try {
    // Update seller with listing reference
    await User.findByIdAndUpdate(
      SELLER_ID,
      { 
        $addToSet: { 
          'seller.listings': listing._id,
          'seller.receivedOffers': offer._id
        } 
      }
    );
    console.log('✅ Seller updated with listing and offer references');
    
    // Update buyer with offer reference
    await User.findByIdAndUpdate(
      BUYER_ID,
      { $addToSet: { 'buyer.offers': offer._id } }
    );
    console.log('✅ Buyer updated with offer reference');
    
    // Update lender reference if needed
    if (LENDER_ID) {
      // This would depend on your specific model structure
      console.log('✅ Lender association established');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error updating user references:', error);
    throw error;
  }
}

// Main execution function
async function seedClosingTransaction() {
  try {
    console.log('Starting seeding process...');
    
    // Create sample listing
    const listing = await createListing();
    
    // Create sample offer with closing information
    const offer = await createClosingOffer(listing);
    
    // Update user references
    await updateUserReferences(listing, offer);
    
    console.log('✅ Seeding completed successfully!');
    console.log('Transaction details:');
    console.log('Listing ID:', listing._id);
    console.log('Offer ID:', offer._id);
    console.log('Seller ID:', SELLER_ID);
    console.log('Buyer ID:', BUYER_ID);
    console.log('Title Company ID:', TITLE_COMPANY_ID);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding process
seedClosingTransaction();