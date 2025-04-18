/**
 * Test script for e-signature functionality
 * This script demonstrates the e-signature feature by generating a signed document
 */

const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const eSignatureService = require('../utils/eSignatureService');

// Sample document content
const documentContent = `
<div class="section">
  <h2 class="section-title">Sample Agreement</h2>
  <p>
    This is a sample agreement between the parties listed below. This document demonstrates
    the e-signature capabilities of the RE-Marketplace platform.
  </p>
  
  <h3 class="mt-4">Terms and Conditions</h3>
  <ol>
    <li>This is a sample document for demonstration purposes only.</li>
    <li>No actual legal agreement is created by this document.</li>
    <li>The signatures on this document are electronically generated.</li>
    <li>This document shows how the e-signature feature works in the RE-Marketplace platform.</li>
  </ol>
  
  <p class="mt-4">
    By signing below, the parties acknowledge that they have read and understand the terms
    of this sample agreement.
  </p>
</div>
`;

// Sample document metadata
const documentMetadata = {
  title: 'Sample Agreement',
  type: 'Test Document',
  outputPath: path.join(__dirname, '../output/sample-signed-document.pdf')
};

// Main function to test the e-signature feature
async function testSignature() {
  try {
    console.log('Testing e-signature functionality...');
    
    // Create sample users with signature preferences
    const buyer = {
      _id: 'buyer123',
      name: 'John Buyer',
      email: 'john@example.com',
      signaturePreferences: {
        font: 'Dancing Script',
        size: 'medium',
        color: '#000080' // Navy blue
      }
    };
    
    const seller = {
      _id: 'seller456',
      name: 'Sarah Seller',
      email: 'sarah@example.com',
      signaturePreferences: {
        font: 'Great Vibes',
        size: 'large',
        color: '#800000' // Maroon
      }
    };
    
    // Create a sample document
    const document = {
      id: 'doc123',
      type: 'Agreement',
      content: documentContent,
      createdAt: new Date()
    };
    
    // Generate a signed document
    console.log('Generating signed document...');
    const result = await eSignatureService.createLocalSignatureRequest(
      document,
      [buyer, seller],
      documentMetadata
    );
    
    console.log('Signature request created successfully!');
    console.log('Request ID:', result.requestId);
    console.log('Status:', result.status);
    console.log('Completed at:', result.completedAt);
    console.log('Signers:', result.signers.length);
    
    if (result.filePath) {
      console.log('Signed document saved to:', result.filePath);
    }
    
    // Generate signature previews
    console.log('\nSignature Previews:');
    console.log('Buyer:', eSignatureService.generateSignaturePreview(buyer));
    console.log('Seller:', eSignatureService.generateSignaturePreview(seller));
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing e-signature functionality:', error);
  }
}

// Run the test
testSignature();
