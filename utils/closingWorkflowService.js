const Offer = require('../models/Offer');
const ClosingDocument = require('../models/ClosingDocument');
const User = require('../models/User');
const Professional = require('../models/Professional');
const notificationController = require('../controllers/notificationController');
const { sendEmail } = require('../utils/emailService');
const logger = require('../middleware/errorMiddleware').logger;

class ClosingWorkflowService {
    /**
     * Validate all prerequisites for closing
     * @param {string} offerId - ID of the offer
     * @returns {Promise<Object>} Validation results
     */
    static async validateClosingPrerequisites(offerId) {
        try {
            const offer = await Offer.findById(offerId)
                .populate('buyer')
                .populate('seller')
                .populate('listing');

            if (!offer) {
                throw new Error('Offer not found');
            }

            const validationResults = {
                isValid: true,
                errors: [],
                completedSteps: 0,
                totalSteps: 0
            };

            // Check document completeness
            const requiredDocuments = [
                'contract', 
                'disclosure', 
                'title', 
                'mortgage', 
                'identity'
            ];

            const documents = await ClosingDocument.find({ 
                offer: offerId, 
                category: { $in: requiredDocuments } 
            });

            // Validate document signatures
            const missingDocuments = requiredDocuments.filter(
                docType => !documents.some(doc => doc.category === docType)
            );

            if (missingDocuments.length > 0) {
                validationResults.isValid = false;
                validationResults.errors.push({
                    type: 'MISSING_DOCUMENTS',
                    documents: missingDocuments
                });
            }

            // Check financial readiness
            if (offer.financingType !== 'cash') {
                const lenderApproval = await this.checkLenderApproval(offer.buyer._id);
                if (!lenderApproval.approved) {
                    validationResults.isValid = false;
                    validationResults.errors.push({
                        type: 'FINANCING_INCOMPLETE',
                        details: lenderApproval.details
                    });
                }
            }

            // Check step completeness
            offer.closingSteps.forEach(step => {
                validationResults.totalSteps++;
                if (step.status === 'complete') {
                    validationResults.completedSteps++;
                }
            });

            return validationResults;
        } catch (error) {
            logger.error('Closing prerequisites validation failed', { 
                offerId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Check lender approval status
     * @param {string} buyerId - ID of the buyer
     * @returns {Promise<Object>} Lender approval details
     */
    static async checkLenderApproval(buyerId) {
        const buyer = await User.findById(buyerId);
        
        if (buyer.buyer.preApprovalStatus !== 'approved') {
            return {
                approved: false,
                details: 'Pre-approval not completed'
            };
        }

        return {
            approved: true,
            details: 'Pre-approval verified'
        };
    }

    /**
     * Generate comprehensive closing report
     * @param {string} offerId - ID of the offer
     * @returns {Promise<Object>} Closing report
     */
    static async generateClosingReport(offerId) {
        const offer = await Offer.findById(offerId)
            .populate('buyer')
            .populate('seller')
            .populate('listing')
            .populate('titleCompanyDetails.company');

        const documents = await ClosingDocument.find({ offer: offerId });

        return {
            offer: {
                id: offer._id,
                price: offer.offerPrice,
                address: offer.listing.address,
                closingDate: offer.closingDate
            },
            buyer: {
                name: offer.buyer.name,
                email: offer.buyer.email
            },
            seller: {
                name: offer.seller.name,
                email: offer.seller.email
            },
            titleCompany: {
                name: offer.titleCompanyDetails.company.companyName,
                contact: offer.titleCompanyDetails.contactPerson
            },
            documents: documents.map(doc => ({
                name: doc.name,
                category: doc.category,
                uploadedAt: doc.createdAt,
                signatureStatus: doc.requiredSignatures.map(sig => ({
                    signed: sig.signed,
                    signedAt: sig.signatureDate
                }))
            })),
            closingSteps: offer.closingSteps.map(step => ({
                name: step.name,
                status: step.status,
                completedDate: step.completedDate
            }))
        };
    }

    /**
     * Send closing completion notifications
     * @param {string} offerId - ID of the offer
     */
    static async notifyClosingCompletion(offerId) {
        const offer = await Offer.findById(offerId)
            .populate('buyer')
            .populate('seller')
            .populate('listing');

        // Notify buyer
        await notificationController.createNotification(
            offer.buyer._id,
            `Congratulations! Your home purchase at ${offer.listing.address} is complete.`,
            'Closing Completed',
            `/closing/${offerId}/complete`,
            'SUCCESS'
        );

        // Notify seller
        await notificationController.createNotification(
            offer.seller._id,
            `Your property at ${offer.listing.address} has been sold.`,
            'Closing Completed',
            `/closing/${offerId}/complete`,
            'SUCCESS'
        );

        // Send email notifications
        await Promise.all([
            sendEmail(offer.buyer.email, 'Closing Completed', 
                `Congratulations on completing your home purchase at ${offer.listing.address}!`),
            sendEmail(offer.seller.email, 'Property Sale Completed', 
                `Your property at ${offer.listing.address} has been successfully sold.`)
        ]);
    }

    /**
     * Finalize closing transaction
     * @param {string} offerId - ID of the offer
     * @returns {Promise<Object>} Closing finalization results
     */
    static async finalizeClosing(offerId) {
        const offer = await Offer.findById(offerId);

        // Verify all prerequisites
        const prerequisites = await this.validateClosingPrerequisites(offerId);
        
        if (!prerequisites.isValid) {
            throw new Error('Closing prerequisites not met', { 
                details: prerequisites.errors 
            });
        }

        // Update offer status
        offer.closingStatus = 'closed';
        offer.closingSteps.forEach(step => {
            if (step.status !== 'complete') {
                step.status = 'complete';
                step.completedDate = new Date();
            }
        });

        await offer.save();

        // Generate closing report
        const closingReport = await this.generateClosingReport(offerId);

        // Notify parties
        await this.notifyClosingCompletion(offerId);

        // Log closing event
        logger.info('Closing transaction completed', { 
            offerId, 
            price: offer.offerPrice,
            address: offer.listing.address 
        });

        return {
            status: 'SUCCESS',
            report: closingReport
        };
    }
}

module.exports = ClosingWorkflowService;