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

    /**
     * Show inspection options for buyer after offer acceptance
     */
    static async getInspectionOptions(req, res) {
        try {
            const { offerId } = req.params;
            
            // Find the offer with populated data
            const offer = await Offer.findById(offerId)
                .populate('buyer', 'name email')
                .populate('seller', 'name email')
                .populate('listing', 'address city state zip image');
            
            if (!offer) {
                req.flash('error', 'Offer not found');
                return res.redirect('/users/dashboard');
            }
            
            // Verify user is the buyer
            if (!req.user._id.equals(offer.buyer._id)) {
                req.flash('error', 'Only the buyer can access inspection options');
                return res.redirect('/users/dashboard');
            }
            
            // Check if inspection has already been scheduled or waived
            if (offer.inspection && (offer.inspection.status === 'scheduled' || offer.inspection.status === 'waived')) {
                req.flash('info', 'Inspection has already been ' + offer.inspection.status);
                return res.redirect(`/closing/${offerId}`);
            }
            
            res.render('closing/inspectionPrompt', {
                offer,
                user: req.user
            });
        } catch (error) {
            logger.error('Error showing inspection options', { error: error.message });
            req.flash('error', 'Failed to load inspection options');
            res.redirect('/users/dashboard');
        }
    }

    /**
     * Show inspection scheduling form
     */
    static async getScheduleInspection(req, res) {
        try {
            const { offerId } = req.params;
            
            // Find the offer with populated data
            const offer = await Offer.findById(offerId)
                .populate('buyer', 'name email phone')
                .populate('seller', 'name email')
                .populate('listing', 'address city state zip county image');
            
            if (!offer) {
                req.flash('error', 'Offer not found');
                return res.redirect('/users/dashboard');
            }
            
            // Verify user is the buyer
            if (!req.user._id.equals(offer.buyer._id)) {
                req.flash('error', 'Only the buyer can schedule an inspection');
                return res.redirect('/users/dashboard');
            }
            
            // Find inspectors that service this county
            const inspectors = await Professional.find({
                professionalType: 'inspector',
                counties: { $in: [offer.listing.county] },
                isVerified: true
            }).sort('companyName');
            
            res.render('closing/scheduleInspection', {
                offer,
                inspectors,
                user: req.user
            });
        } catch (error) {
            logger.error('Error showing inspection scheduling form', { error: error.message });
            req.flash('error', 'Failed to load inspection scheduling form');
            res.redirect('/users/dashboard');
        }
    }

    /**
     * Process inspection scheduling
     */
    static async scheduleInspection(req, res) {
        try {
            const { offerId } = req.params;
            const {
                inspectorId,
                customInspector,
                customInspectorContact,
                inspectionDate,
                inspectionTime,
                alternateDate,
                notes,
                contactName,
                contactPhone,
                contactEmail,
                attendInspection
            } = req.body;
            
            // Find the offer
            const offer = await Offer.findById(offerId);
            
            if (!offer) {
                req.flash('error', 'Offer not found');
                return res.redirect('/users/dashboard');
            }
            
            // Verify user is the buyer
            if (!req.user._id.equals(offer.buyer._id)) {
                req.flash('error', 'Only the buyer can schedule an inspection');
                return res.redirect('/users/dashboard');
            }
            
            // Get inspector details if an ID was provided
            let inspectorDetails = null;
            if (inspectorId) {
                const inspector = await Professional.findById(inspectorId);
                if (inspector) {
                    inspectorDetails = {
                        id: inspector._id,
                        name: inspector.name,
                        companyName: inspector.companyName,
                        email: inspector.email,
                        phone: inspector.phone
                    };
                }
            }
            
            // Update offer with inspection details
            offer.inspection = {
                status: 'scheduled',
                scheduledDate: new Date(inspectionDate),
                timeSlot: inspectionTime,
                alternateDate: alternateDate ? new Date(alternateDate) : null,
                notes: notes || '',
                inspector: inspectorDetails || {
                    name: customInspector,
                    contact: customInspectorContact
                },
                contact: {
                    name: contactName,
                    phone: contactPhone,
                    email: contactEmail,
                    willAttend: attendInspection === 'true'
                },
                scheduledBy: req.user._id,
                scheduledAt: new Date()
            };
            
            // Update the Home Inspection step in closing steps
            const inspectionStepIndex = offer.closingSteps.findIndex(step => step.name === 'Home Inspection');
            if (inspectionStepIndex !== -1) {
                offer.closingSteps[inspectionStepIndex].status = 'in_progress';
                offer.closingSteps[inspectionStepIndex].notes = 'Inspection scheduled for ' + 
                    new Date(inspectionDate).toLocaleDateString() + ' (' + inspectionTime + ')';
            }
            
            await offer.save();
            
            // Notify seller
            await notificationController.createNotification(
                offer.seller,
                `Home inspection for ${offer.listing.address} has been scheduled for ${new Date(inspectionDate).toLocaleDateString()}`,
                'Inspection Scheduled',
                `/closing/${offerId}`,
                'INFO'
            );
            
            // Notify inspector if using platform inspector
            if (inspectorDetails && inspectorDetails.id) {
                await notificationController.createNotification(
                    inspectorDetails.id,
                    `New inspection request for ${offer.listing.address} on ${new Date(inspectionDate).toLocaleDateString()}`,
                    'New Inspection',
                    `/professional/inspections`,
                    'INFO'
                );
                
                // Send email to inspector
                await sendEmail(
                    inspectorDetails.email,
                    'New Inspection Request',
                    `You have a new inspection request for ${offer.listing.address} on ${new Date(inspectionDate).toLocaleDateString()} (${inspectionTime}). Please log in to your account to confirm this appointment.`
                );
            }
            
            req.flash('success', 'Inspection scheduled successfully');
            res.redirect(`/closing/${offerId}`);
        } catch (error) {
            logger.error('Error scheduling inspection', { error: error.message });
            req.flash('error', 'Failed to schedule inspection');
            res.redirect(`/closing/${req.params.offerId}/inspection-options`);
        }
    }

    /**
     * Process inspection waiver
     */
    static async waiveInspection(req, res) {
        try {
            const { offerId } = req.params;
            const { acknowledgments, reason, signature } = req.body;
            
            // Find the offer
            const offer = await Offer.findById(offerId);
            
            if (!offer) {
                req.flash('error', 'Offer not found');
                return res.redirect('/users/dashboard');
            }
            
            // Verify user is the buyer
            if (!req.user._id.equals(offer.buyer._id)) {
                req.flash('error', 'Only the buyer can waive an inspection');
                return res.redirect('/users/dashboard');
            }
            
            // Verify all acknowledgments are present
            if (!acknowledgments || acknowledgments.length < 4) {
                req.flash('error', 'All acknowledgments must be checked');
                return res.redirect(`/closing/${offerId}/inspection-options`);
            }
            
            // Verify signature
            if (!signature || signature.trim() !== req.user.name) {
                req.flash('error', 'Signature must match your full name');
                return res.redirect(`/closing/${offerId}/inspection-options`);
            }
            
            // Update offer with inspection waiver
            offer.inspection = {
                status: 'waived',
                waiverReason: reason || 'No reason provided',
                waiverAcknowledgments: acknowledgments,
                waiverSignature: signature,
                waivedBy: req.user._id,
                waivedAt: new Date()
            };
            
            // Update the Home Inspection step in closing steps
            const inspectionStepIndex = offer.closingSteps.findIndex(step => step.name === 'Home Inspection');
            if (inspectionStepIndex !== -1) {
                offer.closingSteps[inspectionStepIndex].status = 'complete';
                offer.closingSteps[inspectionStepIndex].notes = 'Inspection waived by buyer';
                offer.closingSteps[inspectionStepIndex].completedDate = new Date();
            }
            
            // Create inspection waiver document
            const waiverDocument = new ClosingDocument({
                offer: offerId,
                name: 'Inspection Waiver',
                category: 'inspection',
                documentType: 'waiver',
                uploadedBy: req.user._id,
                requiredSignatures: [
                    {
                        party: 'buyer',
                        user: req.user._id,
                        signed: true,
                        signatureDate: new Date()
                    }
                ],
                metadata: {
                    waiverReason: reason || 'No reason provided',
                    waiverAcknowledgments: acknowledgments,
                    waiverSignature: signature
                }
            });
            
            await Promise.all([offer.save(), waiverDocument.save()]);
            
            // Notify seller
            await notificationController.createNotification(
                offer.seller,
                `Buyer has waived the home inspection for ${offer.listing.address}`,
                'Inspection Waived',
                `/closing/${offerId}`,
                'INFO'
            );
            
            req.flash('success', 'Inspection waived successfully');
            res.redirect(`/closing/${offerId}`);
        } catch (error) {
            logger.error('Error waiving inspection', { error: error.message });
            req.flash('error', 'Failed to waive inspection');
            res.redirect(`/closing/${req.params.offerId}/inspection-options`);
        }
    }
}

module.exports = ClosingController;
