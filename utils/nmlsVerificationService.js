// utils/nmlsVerificationService.js
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Service to verify NMLS IDs against the NMLS Consumer Access website
 */
class NMLSVerificationService {
    /**
     * Verify if an NMLS ID is valid
     * @param {String} nmlsId - The NMLS ID to verify
     * @returns {Promise<Object>} - Results of the verification
     */
    static async verifyNMLSId(nmlsId) {
        try {
            // Validate input
            if (!nmlsId || isNaN(Number(nmlsId))) {
                return {
                    isValid: false,
                    errors: ['Invalid NMLS ID format']
                };
            }

            // Make a request to the NMLS Consumer Access website
            const response = await axios.get(`https://www.nmlsconsumeraccess.org/EntityDetails.aspx/INDIVIDUAL/${nmlsId}`);
            
            // Parse the HTML response
            const $ = cheerio.load(response.data);
            
            // Check if the page shows "no results found" or an error message
            const errorMessage = $('.error-message').text();
            const noResults = $('body').text().includes('No results found') || 
                              $('body').text().includes('not found in the system');
            
            if (errorMessage || noResults) {
                return {
                    isValid: false,
                    errors: ['NMLS ID not found in the system']
                };
            }
            
            // Check if the status is active
            const statusText = $('.status').text();
            const isActive = statusText.includes('Active');
            
            if (!isActive) {
                return {
                    isValid: false,
                    errors: ['NMLS ID is not active']
                };
            }
            
            // If we made it here, the ID is valid
            return {
                isValid: true,
                errors: []
            };
        } catch (error) {
            console.error('Error verifying NMLS ID:', error);
            
            // Handle different error types
            if (error.response && error.response.status === 404) {
                return {
                    isValid: false,
                    errors: ['NMLS ID not found']
                };
            }
            
            return {
                isValid: false,
                errors: ['Verification service temporarily unavailable']
            };
        }
    }
}

module.exports = NMLSVerificationService;