/**
 * Migration script to convert existing offers and listings to support multiple buyers and sellers
 * 
 * This script updates:
 * 1. Offer documents to use the new buyers/sellers arrays
 * 2. Listing documents to use the new sellers array
 * 
 * Run with: node utils/migrateMultiParty.js
 */

const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const Listing = require('../models/Listing');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function migrateOffers() {
  console.log('Starting offer migration...');
  
  try {
    // Get all offers that don't have buyers/sellers arrays
    const offers = await Offer.find({
      $or: [
        { buyers: { $exists: false } },
        { buyers: { $size: 0 } },
        { sellers: { $exists: false } },
        { sellers: { $size: 0 } }
      ]
    });
    
    console.log(`Found ${offers.length} offers to migrate`);
    
    let migratedCount = 0;
    
    for (const offer of offers) {
      // Skip if already has both arrays populated
      if (offer.buyers && offer.buyers.length > 0 && offer.sellers && offer.sellers.length > 0) {
        continue;
      }
      
      // Create buyers array if needed
      if ((!offer.buyers || offer.buyers.length === 0) && offer.buyer) {
        offer.buyers = [{
          user: offer.buyer,
          role: 'primary',
          ownership: 100,
          signatureStatus: offer.signatures?.mainContract?.buyerSigned ? 'signed' : 'pending',
          signedAt: offer.signatures?.mainContract?.buyerSignedDate
        }];
      }
      
      // Create sellers array if needed
      if ((!offer.sellers || offer.sellers.length === 0) && offer.seller) {
        offer.sellers = [{
          user: offer.seller,
          role: 'primary',
          ownership: 100,
          signatureStatus: offer.signatures?.mainContract?.sellerSigned ? 'signed' : 'pending',
          signedAt: offer.signatures?.mainContract?.sellerSignedDate
        }];
      }
      
      // Update signature tracking
      if (offer.signatures && offer.signatures.mainContract) {
        // Set buyersSigned and sellersSigned based on existing flags
        offer.signatures.mainContract.buyersSigned = offer.signatures.mainContract.buyerSigned || false;
        offer.signatures.mainContract.sellersSigned = offer.signatures.mainContract.sellerSigned || false;
        
        // Create signature arrays if they don't exist
        if (!offer.signatures.mainContract.buyerSignatures) {
          offer.signatures.mainContract.buyerSignatures = [];
        }
        
        if (!offer.signatures.mainContract.sellerSignatures) {
          offer.signatures.mainContract.sellerSignatures = [];
        }
        
        // Add buyer signature if signed
        if (offer.signatures.mainContract.buyerSigned && offer.buyer) {
          const existingSignature = offer.signatures.mainContract.buyerSignatures.find(
            sig => sig.user && sig.user.equals(offer.buyer)
          );
          
          if (!existingSignature) {
            offer.signatures.mainContract.buyerSignatures.push({
              user: offer.buyer,
              signedDate: offer.signatures.mainContract.buyerSignedDate || new Date(),
              signatureMethod: 'electronic'
            });
          }
        }
        
        // Add seller signature if signed
        if (offer.signatures.mainContract.sellerSigned && offer.seller) {
          const existingSignature = offer.signatures.mainContract.sellerSignatures.find(
            sig => sig.user && sig.user.equals(offer.seller)
          );
          
          if (!existingSignature) {
            offer.signatures.mainContract.sellerSignatures.push({
              user: offer.seller,
              signedDate: offer.signatures.mainContract.sellerSignedDate || new Date(),
              signatureMethod: 'electronic'
            });
          }
        }
      }
      
      // Save the updated offer
      await offer.save();
      migratedCount++;
      
      if (migratedCount % 10 === 0) {
        console.log(`Migrated ${migratedCount} offers so far...`);
      }
    }
    
    console.log(`Successfully migrated ${migratedCount} offers`);
  } catch (error) {
    console.error('Error migrating offers:', error);
  }
}

async function migrateListings() {
  console.log('Starting listing migration...');
  
  try {
    // Get all listings that don't have sellers array
    const listings = await Listing.find({
      $or: [
        { sellers: { $exists: false } },
        { sellers: { $size: 0 } }
      ]
    });
    
    console.log(`Found ${listings.length} listings to migrate`);
    
    let migratedCount = 0;
    
    for (const listing of listings) {
      // Skip if already has sellers array populated
      if (listing.sellers && listing.sellers.length > 0) {
        continue;
      }
      
      // Create sellers array if needed
      if (listing.seller) {
        listing.sellers = [{
          user: listing.seller,
          role: 'primary',
          ownership: 100
        }];
      }
      
      // Save the updated listing
      await listing.save();
      migratedCount++;
      
      if (migratedCount % 10 === 0) {
        console.log(`Migrated ${migratedCount} listings so far...`);
      }
    }
    
    console.log(`Successfully migrated ${migratedCount} listings`);
  } catch (error) {
    console.error('Error migrating listings:', error);
  }
}

async function runMigration() {
  try {
    await migrateOffers();
    await migrateListings();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

runMigration();
