/**
 * Signature Utilities
 * Functions for applying user signatures to documents
 */

/**
 * Generate a signature image as an HTML element with the user's signature preferences
 * @param {Object} user - User object with signature preferences
 * @param {String} text - Text to display as signature (usually user's name)
 * @returns {String} HTML string representing the signature
 */
exports.generateSignatureHTML = (user, text = null) => {
  if (!user) return '';
  
  // Use provided text or default to user's name
  const signatureText = text || user.name;
  
  // Get signature preferences with defaults
  const font = user.signaturePreferences?.font || 'Dancing Script';
  const size = user.signaturePreferences?.size || 'medium';
  const color = user.signaturePreferences?.color || '#000000';
  
  // Determine font size based on preference
  let fontSize;
  switch (size) {
    case 'small':
      fontSize = '1.5rem';
      break;
    case 'large':
      fontSize = '2.5rem';
      break;
    case 'medium':
    default:
      fontSize = '2rem';
      break;
  }
  
  // Generate HTML for signature
  return `<div class="signature" style="font-family: '${font}', cursive; font-size: ${fontSize}; color: ${color}; display: inline-block; border-bottom: 1px solid #000; padding-bottom: 5px;">${signatureText}</div>`;
};

/**
 * Generate a signature image as a data URL
 * This is more complex and would require canvas rendering
 * For a complete implementation, consider using a library like html2canvas
 * 
 * @param {Object} user - User object with signature preferences
 * @param {String} text - Text to display as signature (usually user's name)
 * @returns {Promise<String>} Promise resolving to data URL of signature image
 */
exports.generateSignatureImage = async (user, text = null) => {
  // This is a placeholder for a more complex implementation
  // In a real implementation, you would:
  // 1. Create a canvas element
  // 2. Draw the text with the user's signature preferences
  // 3. Convert the canvas to a data URL
  // 4. Return the data URL
  
  // For now, we'll just return a placeholder message
  return 'Signature image generation would be implemented here';
};

/**
 * Apply a signature to a PDF document
 * This would typically be used with a PDF generation library like PDFKit
 * 
 * @param {Object} pdfDoc - PDF document object (from PDFKit or similar)
 * @param {Object} user - User object with signature preferences
 * @param {Object} options - Options for signature placement
 * @returns {Object} Modified PDF document
 */
exports.applySignatureToPDF = (pdfDoc, user, options = {}) => {
  // This is a placeholder for a more complex implementation
  // In a real implementation, you would:
  // 1. Get the signature text and preferences
  // 2. Position the cursor at the signature location
  // 3. Add the signature to the PDF
  // 4. Return the modified PDF document
  
  // For example, with PDFKit:
  /*
  const { x, y, width } = options;
  const signatureText = user.name;
  const font = user.signaturePreferences?.font || 'Dancing Script';
  const size = user.signaturePreferences?.size || 'medium';
  const color = user.signaturePreferences?.color || '#000000';
  
  // Convert size to points
  let fontSize;
  switch (size) {
    case 'small': fontSize = 18; break;
    case 'large': fontSize = 30; break;
    case 'medium':
    default: fontSize = 24; break;
  }
  
  // Add signature to PDF
  pdfDoc
    .font(`fonts/${font}.ttf`)
    .fontSize(fontSize)
    .fillColor(color)
    .text(signatureText, x, y, { width });
  */
  
  return pdfDoc;
};

/**
 * Create a signature certificate with verification details
 * @param {Object} user - User who signed the document
 * @param {Object} document - Document that was signed
 * @param {Date} signedAt - Date when the document was signed
 * @returns {Object} Certificate data
 */
exports.createSignatureCertificate = (user, document, signedAt = new Date()) => {
  // Generate a unique package ID
  const packageId = generatePackageId();
  
  // Create certificate data
  return {
    packageId,
    status: 'SIGNED',
    originator: {
      name: user.name,
      email: user.email,
      ipAddress: user.lastIpAddress || 'Unknown',
      timestamp: signedAt
    },
    signers: [
      {
        name: user.name,
        email: user.email,
        ipAddress: user.lastIpAddress || 'Unknown',
        signedAt: signedAt
      }
    ],
    documents: [
      {
        name: document.name || 'Document',
        pages: document.pages || 1,
        hash: document.hash || generateDocumentHash(document)
      }
    ],
    timeZone: 'UTC',
    history: [
      {
        action: 'VIEWED',
        actor: user.name,
        timestamp: new Date(signedAt.getTime() - 60000) // 1 minute before signing
      },
      {
        action: 'SIGNED',
        actor: user.name,
        timestamp: signedAt
      },
      {
        action: 'COMPLETED',
        actor: 'System',
        timestamp: signedAt
      }
    ]
  };
};

/**
 * Generate a unique package ID for signature tracking
 * @returns {String} Unique package ID
 */
function generatePackageId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${randomStr}`.toUpperCase();
}

/**
 * Generate a hash for a document (for verification purposes)
 * @param {Object} document - Document to hash
 * @returns {String} Document hash
 */
function generateDocumentHash(document) {
  // In a real implementation, you would use a cryptographic hash function
  // For now, we'll just return a placeholder
  return `HASH-${Math.random().toString(36).substring(2, 15)}`;
}
