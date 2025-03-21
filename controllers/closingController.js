const Offer = require('../models/Offer');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Professional = require('../models/Professional');
const ClosingDocument = require('../models/ClosingDocument');
const ClosingWorkflowService = require('../utils/closingWorkflowService');
const ClosingAnalyticsService = require('../utils/closingAnalyticsService');
const notificationController = require('./notificationController');
const { sendEmail } = require('../utils/emailService');
const logger = require('../middleware/errorMiddleware').logger;

class ClosingController {
    /**
     * Initialize the closing process for an accepted offer
     */
    static async initializeClosing(req, res) {
        try {
            const { offerId } = req.params;
            
            // Find the offer with populated data
            const offer = await Offer.findById(offerId)
                .populate('buyer')
                .populate('seller')
                .populate('listing');
            
            if (!offer) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Offer not found' 
                });
            }
            
            // Verify offer is in an acceptable state
            if (offer.status !== 'accepted') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Offer must be accepted to start closing process' 
                });
            }
            
            // Find appropriate title company
            const titleCompany = await Professional.findOne({
                professionalType: 'title',
                serviceAreas: { $in: [offer.listing.county] }
            });
            
            if (!titleCompany) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No title company available in this area' 
                });
            }
            
            // Set up closing steps
            offer.closingSteps = [
                {
                    name: 'Earnest Money Deposit',
                    status: 'pending',
                    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
                    assignedTo: offer.buyer._id
                },
                {
                    name: 'Title Search',
                    status: 'pending',
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
                    assignedTo: titleCompany._id
                },
                {
                    name: 'Home Inspection',
                    status: 'pending',
                    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
                    assignedTo: offer.buyer._id
                },
                {
                    name: 'Appraisal',
                    status: 'pending',
                    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
                    assignedTo: offer.buyer._id
                },
                {
                    name: 'Final Walk-Through',
                    status: 'pending',
                    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks
                    assignedTo: offer.buyer._id
                },
                {
                    name: 'Closing',
                    status: 'pending',
                    dueDate: offer.closingDate,
                    assignedTo: titleCompany._id
                }
            ];
            
            // Update offer status
            offer.closingStatus = 'in_progress';
            offer.titleCompanyDetails = {
                company: titleCompany._id,
                contactPerson: titleCompany.name,
                phoneNumber: titleCompany.phone,
                email: titleCompany.email
            };
            
            await offer.save();
            
            // Notify parties
            await notificationController.createNotification(
                offer.buyer._id,
                `Closing process started for ${offer.listing.address}. First step: Earnest Money Deposit`,
                'Closing Started',
                `/closing/${offerId}`,
                'INFO'
            );
            
            await notificationController.createNotification(
                offer.seller._id,
                `Closing process started for ${offer.listing.address}`,
                'Closing Started',
                `/closing/${offerId}`,
                'INFO'
            );
            
            await notificationController.createNotification(
                titleCompany._id,
                `New closing assigned: ${offer.listing.address}`,
                'Closing Assignment',
                `/closing/${offerId}`,
                'INFO'
            );
            
            res.status(200).json({
                success: true,
                message: 'Closing process initialized',
                offerId: offer._id
            });
        } catch (error) {
            logger.error('Error initializing closing', { error: error.message });
            res.status(500).json({ 
                success: false, 
                message: 'Failed to initialize closing process' 
            });
        }
    }

    /**
     * Get the closing dashboard for an offer
     */
    static async getClosingDashboard(req, res) {
        try {
            const { offerId } = req.params;
            
            // Find the offer with detailed population
            const offer = await Offer.findById(offerId)
                .populate('buyer', 'name email')
                .populate('seller', 'name email')
                .populate('listing', 'address city state zip')
                .populate('titleCompanyDetails.company', 'name companyName email phone');
            
            if (!offer) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Offer not found' 
                });
            }
            
            // Get related documents
            const documents = await ClosingDocument.find({ offer: offerId })
                .populate('uploadedBy', 'name');
            
            // Calculate progress
            const totalSteps = offer.closingSteps.length;
            const completedSteps = offer.closingSteps.filter(step => step.status === 'complete').length;
            const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
            
            res.render('closing/dashboard', {
                offer,
                documents,
                progressPercentage,
                user: req.user
            });
        } catch (error) {
            logger.error('Error getting closing dashboard', { error: error.message });
            res.status(500).json({ 
                success: false, 
                message: 'Failed to retrieve closing dashboard' 
            });
        }
    }

    /**
     * Update a specific closing step
     */
    static async updateClosingStep(req, res) {
        try {
            const { offerId, stepId } = req.params;
            const { status, notes } = req.body;
            
            const offer = await Offer.findById(offerId);
            
            if (!offer) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Offer not found' 
                });
            }
            
            // Validate step
            if (stepId < 0 || stepId >= offer.closingSteps.length) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid step' 
                });
            }
            
            const step = offer.closingSteps[stepId];
            
            // Update step
            step.status = status;
            step.notes = notes || step.notes;
            step.completedDate = status === 'complete' ? new Date() : null;
            
            // Update overall closing status if all steps complete
            if (offer.closingSteps.every(s => s.status === 'complete')) {
                offer.closingStatus = 'closed';
            }
            
            await offer.save();
            
            // Notify relevant parties
            await notificationController.createNotification(
                offer.buyer._id,
                `Closing step "${step.name}" updated to ${status}`,
                'Closing Update',
                `/closing/${offerId}`,
                'INFO'
            );
            
            res.status(200).json({
                success: true,
                message: 'Closing step updated',
                step
            });
        } catch (error) {
            logger.error('Error updating closing step', { error: error.message });
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update closing step' 
            });
        }
    }

    /**
     * Get closing completion summary
     */
    static async getCompletionSummary(req, res) {
        try {
            const { offerId } = req.params;
            
            // Validate closing
            const offer = await Offer.findById(offerId)
                .populate('buyer', 'name email')
                .populate('seller', 'name email')
                .populate('listing', 'address city state zip');
            
            if (!offer || offer.closingStatus !== 'closed') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Closing not completed' 
                });
            }
            
            // Get closing documents
            const documents = await ClosingDocument.find({ offer: offerId });
            
            // Generate comprehensive report
            const closingReport = await ClosingWorkflowService.generateClosingReport(offerId);
            
            res.render('closing/complete', {
                offer,
                documents,
                closingReport,
                user: req.user
            });
        } catch (error) {
            logger.error('Error getting completion summary', { error: error.message });
            res.status(500).json({ 
                success: false, 
                message: 'Failed to retrieve completion summary' 
            });
        }
    }

    /**
     * Get closing analytics
     */
    static async getClosingAnalytics(req, res) {
        try {
            // Aggregate market metrics
            const marketMetrics = await ClosingAnalyticsService.getMarketClosingMetrics({
                startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
            });
            
            // Monthly trends
            const monthlyTrends = await ClosingAnalyticsService.getMonthlyClosingTrends();
            
            // Buyer/Seller insights
            const buyerSellerInsights = await ClosingAnalyticsService.getBuyerSellerInsights();
            
            // Closing failure analysis
            const failureAnalysis = await ClosingAnalyticsService.getClosingFailureAnalysis();
            
            res.status(200).json({
                success: true,
                marketMetrics,
                monthlyTrends,
                buyerSellerInsights,
                failureAnalysis
            });
        } catch (error) {
            logger.error('Error getting closing analytics', { error: error.message });
            res.status(500).json({ 
                success: false, 
                message: 'Failed to retrieve closing analytics' 
            });
        }
    }
}

module.exports = ClosingController;