/**
 * E-Signature Service
 * Handles integration with e-signature provider (DocuSign/HelloSign/etc)
 * Also provides local signature generation capabilities
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');
const signatureUtils = require('./signatureUtils');
const pdfGenerator = require('./pdfGenerator');

// Configure with your chosen e-signature provider
// This example uses a generic approach that can be adapted to specific providers
class ESignatureService {
  constructor() {
    this.apiKey = process.env.ESIGN_API_KEY;
    this.apiSecret = process.env.ESIGN_API_SECRET;
    this.baseUrl = process.env.ESIGN_API_URL;
    this.accountId = process.env.ESIGN_ACCOUNT_ID;
    
    // Initialize the API client if credentials are available
    if (this.apiKey && this.baseUrl) {
      this.client = axios.create({
        baseURL: this.baseUrl,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
    }
  }
  
  /**
   * Create a signature request for a contract using external e-signature provider
   * @param {Object} document - Document object with file path or buffer
   * @param {Array} signers - Array of signer objects with name, email, and role
   * @param {Object} metadata - Additional metadata for the document
   * @returns {Promise} - Promise resolving to the signature request
   */
  async createSignatureRequest(document, signers, metadata = {}) {
    try {
      // Check if external e-signature provider is configured
      if (!this.client) {
        // Fall back to local signature generation if no external provider
        return this.createLocalSignatureRequest(document, signers, metadata);
      }
      
      logger.info('Creating signature request', { documentId: metadata.documentId });
      
      // Prepare signers in the format expected by the e-signature provider
      const formattedSigners = signers.map((signer, index) => ({
        email: signer.email,
        name: signer.name,
        role: signer.role,
        routingOrder: index + 1,
        recipientId: `${index + 1}`
      }));
      
      // Prepare document data
      let documentData;
      if (document.buffer) {
        // If document is provided as a buffer
        documentData = document.buffer.toString('base64');
      } else if (document.path) {
        // If document is provided as a file path
        documentData = fs.readFileSync(document.path).toString('base64');
      } else {
        throw new Error('Document must be provided as buffer or file path');
      }
      
      // Create the signature request payload
      // Note: This payload structure will vary based on the e-signature provider
      const payload = {
        documents: [{
          documentBase64: documentData,
          name: document.name || 'Contract Document',
          fileExtension: path.extname(document.name || 'document.pdf').substring(1),
          documentId: '1'
        }],
        recipients: {
          signers: formattedSigners
        },
        emailSubject: metadata.emailSubject || 'Please sign this document',
        emailBody: metadata.emailBody || 'Please review and sign this document.',
        status: 'sent',
        customFields: {
          textCustomFields: [
            {
              name: 'transactionId',
              value: metadata.transactionId || '',
              show: 'false'
            },
            {
              name: 'listingId',
              value: metadata.listingId || '',
              show: 'false'
            }
          ]
        }
      };
      
      // Send the request to the e-signature provider
      const response = await this.client.post('/signature/request', payload);
      
      return {
        requestId: response.data.envelopeId || response.data.signatureRequestId,
        status: response.data.status,
        signingUrls: this._extractSigningUrls(response.data)
      };
    } catch (error) {
      logger.error('Error creating signature request', { error: error.message });
      throw new Error(`Failed to create signature request: ${error.message}`);
    }
  }
  
  /**
   * Create a local signature request without using an external e-signature provider
   * This is useful for testing or when an external provider is not available
   * @param {Object} document - Document object with content and metadata
   * @param {Array} signers - Array of user objects who will sign the document
   * @param {Object} metadata - Additional metadata for the document
   * @returns {Promise} - Promise resolving to the signature request
   */
  async createLocalSignatureRequest(document, signers, metadata = {}) {
    try {
      logger.info('Creating local signature request', { documentId: metadata.documentId });
      
      // Generate a unique request ID
      const requestId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Format signers into a map for the PDF generator
      const signersMap = {};
      signers.forEach(signer => {
        signersMap[signer.role || 'signer'] = signer;
      });
      
      // Generate the signed PDF
      const pdfBuffer = await pdfGenerator.generateSignedPdf(
        document,
        signersMap,
        'signedDocument.ejs',
        {
          documentTitle: metadata.title || 'Signed Document',
          documentType: metadata.type || 'Contract',
          documentContent: document.content || null
        }
      );
      
      // Save the PDF to a file if outputPath is provided
      let filePath = null;
      if (metadata.outputPath) {
        const outputDir = path.dirname(metadata.outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(metadata.outputPath, pdfBuffer);
        filePath = metadata.outputPath;
      }
      
      // Create a signature certificate
      const certificate = signatureUtils.createSignatureCertificate(
        signers[0],
        {
          name: metadata.title || 'Document',
          pages: metadata.pages || 1,
          hash: metadata.hash || `HASH-${requestId}`
        }
      );
      
      return {
        requestId,
        status: 'completed',
        signers: signers.map(signer => ({
          email: signer.email,
          name: signer.name,
          status: 'signed',
          signedAt: new Date()
        })),
        completedAt: new Date(),
        certificate,
        filePath,
        buffer: pdfBuffer
      };
    } catch (error) {
      logger.error('Error creating local signature request', { error: error.message });
      throw new Error(`Failed to create local signature request: ${error.message}`);
    }
  }
  
  /**
   * Get the status of a signature request
   * @param {String} requestId - ID of the signature request
   * @returns {Promise} - Promise resolving to the signature request status
   */
  async getSignatureRequestStatus(requestId) {
    try {
      // Check if it's a local signature request
      if (requestId.startsWith('local-')) {
        return {
          requestId,
          status: 'completed',
          signers: [], // Would be populated from a database in a real implementation
          completedAt: new Date()
        };
      }
      
      // Check if external e-signature provider is configured
      if (!this.client) {
        throw new Error('External e-signature provider not configured');
      }
      
      logger.info('Getting signature request status', { requestId });
      
      const response = await this.client.get(`/signature/request/${requestId}`);
      
      return {
        requestId,
        status: response.data.status,
        signers: response.data.signers.map(signer => ({
          email: signer.email,
          name: signer.name,
          status: signer.status,
          signedAt: signer.signedAt
        })),
        completedAt: response.data.completedAt
      };
    } catch (error) {
      logger.error('Error getting signature request status', { error: error.message, requestId });
      throw new Error(`Failed to get signature request status: ${error.message}`);
    }
  }
  
  /**
   * Cancel a signature request
   * @param {String} requestId - ID of the signature request
   * @returns {Promise} - Promise resolving to the cancellation result
   */
  async cancelSignatureRequest(requestId) {
    try {
      // Check if it's a local signature request
      if (requestId.startsWith('local-')) {
        return {
          requestId,
          status: 'cancelled'
        };
      }
      
      // Check if external e-signature provider is configured
      if (!this.client) {
        throw new Error('External e-signature provider not configured');
      }
      
      logger.info('Cancelling signature request', { requestId });
      
      const response = await this.client.post(`/signature/request/${requestId}/cancel`);
      
      return {
        requestId,
        status: 'cancelled'
      };
    } catch (error) {
      logger.error('Error cancelling signature request', { error: error.message, requestId });
      throw new Error(`Failed to cancel signature request: ${error.message}`);
    }
  }
  
  /**
   * Download the signed document
   * @param {String} requestId - ID of the signature request
   * @returns {Promise} - Promise resolving to the document buffer
   */
  async downloadSignedDocument(requestId) {
    try {
      // Check if it's a local signature request
      if (requestId.startsWith('local-')) {
        // In a real implementation, you would retrieve the document from a database
        throw new Error('Local signature document retrieval not implemented');
      }
      
      // Check if external e-signature provider is configured
      if (!this.client) {
        throw new Error('External e-signature provider not configured');
      }
      
      logger.info('Downloading signed document', { requestId });
      
      const response = await this.client.get(`/signature/request/${requestId}/files`, {
        responseType: 'arraybuffer'
      });
      
      return {
        buffer: Buffer.from(response.data),
        contentType: response.headers['content-type']
      };
    } catch (error) {
      logger.error('Error downloading signed document', { error: error.message, requestId });
      throw new Error(`Failed to download signed document: ${error.message}`);
    }
  }
  
  /**
   * Generate a signature preview for a user
   * @param {Object} user - User object with signature preferences
   * @param {String} text - Optional text to use instead of user's name
   * @returns {String} - HTML string representing the signature
   */
  generateSignaturePreview(user, text = null) {
    return signatureUtils.generateSignatureHTML(user, text);
  }
  
  /**
   * Handle webhook events from the e-signature provider
   * @param {Object} event - Webhook event data
   * @returns {Object} - Processed event data
   */
  processWebhookEvent(event) {
    try {
      logger.info('Processing webhook event', { eventType: event.event });
      
      // Extract relevant information from the webhook event
      // This will vary based on the e-signature provider
      const eventData = {
        requestId: event.envelopeId || event.signatureRequestId,
        event: event.event,
        status: event.status,
        timestamp: new Date().toISOString(),
        metadata: event.customFields || {}
      };
      
      if (event.signers) {
        eventData.signers = event.signers.map(signer => ({
          email: signer.email,
          name: signer.name,
          status: signer.status,
          signedAt: signer.signedAt
        }));
      }
      
      return eventData;
    } catch (error) {
      logger.error('Error processing webhook event', { error: error.message });
      throw new Error(`Failed to process webhook event: ${error.message}`);
    }
  }
  
  /**
   * Extract signing URLs from the response
   * @param {Object} responseData - Response data from the e-signature provider
   * @returns {Array} - Array of signing URLs for each signer
   * @private
   */
  _extractSigningUrls(responseData) {
    // This implementation will vary based on the e-signature provider
    if (responseData.signingUrls) {
      return responseData.signingUrls;
    }
    
    if (responseData.recipients && responseData.recipients.signers) {
      return responseData.recipients.signers.map(signer => ({
        email: signer.email,
        url: signer.url
      }));
    }
    
    return [];
  }
}

module.exports = new ESignatureService();
