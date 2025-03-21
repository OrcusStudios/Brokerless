const Lender = require("../models/Professional"); // Assuming lenders are in "Professional"
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendEmail } = require("../utils/emailService"); // Ensure email service is set up

exports.applyForFinancing = async (req, res) => {
    try {
        const { lenderId } = req.body;
        if (!lenderId) {
            return res.status(400).json({ success: false, message: "Lender ID is required." });
        }
        
        const buyerId = req.user._id;

        // ✅ Validate that the lender exists
        const lender = await Lender.findById(lenderId);
        if (!lender) {
            return res.status(404).json({ success: false, message: "Lender not found." });
        }

        // ✅ Validate that the buyer exists
        const buyer = await User.findById(buyerId);
        if (!buyer) {
            return res.status(404).json({ success: false, message: "Buyer account not found." });
        }

        // ✅ Prevent duplicate applications
        if (buyer.preApprovalLender && buyer.preApprovalLender.toString() === lenderId) {
            return res.json({ 
                success: true, 
                message: "You have already applied to this lender.",
                applicationUrl: lender.preApprovalLink || "https://example.com/apply"
            });
        }

        // ✅ Update buyer's profile with lender reference
        buyer.preApprovalLender = lender._id;
        buyer.preApprovalStatus = "pending";
        await buyer.save();

        // ✅ Add buyer to lender's pre-approval list
        if (!lender.preApprovals) lender.preApprovals = [];
        
        // Check if the buyer is already in the list
        const existingApplication = lender.preApprovals.find(app => 
            app.buyer && app.buyer.toString() === buyerId.toString()
        );
        
        if (!existingApplication) {
            // Add a new application entry
            lender.preApprovals.push({
                buyer: buyerId,
                status: "pending",
                submittedAt: new Date()
            });
            await lender.save();
        }

        // ✅ Send Notification to Lender
        await Notification.create({
            user: lender._id,
            message: `${buyer.name} has applied for financing. Check your dashboard.`,
            type: "Approved",
            link: "/professionals/dashboard"
        });

        // Return the lender's application URL for redirection
        return res.json({ 
            success: true, 
            message: "Application submitted successfully. You will now be redirected to the lender's application page.",
            applicationUrl: lender.preApprovalLink || "https://example.com/apply" 
        });

    } catch (error) {
        console.error("❌ Error processing financing application:", error);
        return res.status(500).json({ 
            success: false, 
            message: "An error occurred. Please try again." 
        });
    }
};

exports.getLenderById = async (req, res) => {
    try {
        const lender = await Lender.findById(req.params.id)
            .select('-password'); // Exclude sensitive information

        if (!lender) {
            req.flash('error', 'Lender not found');
            return res.redirect('/lenderDirectory');
        }

        res.render('lenderView', { 
            lender,
            user: req.user // Pass current user for conditional rendering if needed
        });
    } catch (error) {
        console.error('Error fetching lender details:', error);
        req.flash('error', 'Unable to retrieve lender information');
        res.redirect('/lenderDirectory');
    }
};

// Existing method for dashboard
exports.getDashboard = async (req, res) => {
    // Your existing code for the dashboard
};

// Add the missing methods for applicant approval flow
exports.approveApplicant = async (req, res) => {
    try {
        const { applicantId, amount, term, interestRate, expirationDate, notes } = req.body;
        
        if (!applicantId) {
            return res.status(400).json({ success: false, message: 'Applicant ID is required' });
        }
        
        // Find the user (buyer)
        const buyer = await User.findById(applicantId);
        
        if (!buyer) {
            return res.status(404).json({ success: false, message: 'Buyer not found' });
        }
        
        // Update buyer's pre-approval status
        await buyer.updatePreApprovalStatus('approved', req.user._id, amount, expirationDate);
        
        // Find if there's an existing pre-approval to update
        let preApproval = await PreApproval.findOne({ buyer: buyer._id });
        
        if (preApproval) {
            preApproval.status = 'approved';
            preApproval.approvalAmount = amount;
            preApproval.interestRate = interestRate;
            preApproval.term = term;
            preApproval.expirationDate = expirationDate;
            preApproval.notes = notes;
            preApproval.approvalDate = new Date();
        } else {
            // Create new pre-approval record if it doesn't exist
            preApproval = new PreApproval({
                buyer: buyer._id,
                lender: req.user._id,
                status: 'approved',
                approvalAmount: amount,
                interestRate: interestRate,
                term: term,
                expirationDate: expirationDate,
                notes: notes,
                approvalDate: new Date()
            });
        }
        
        await preApproval.save();
        
        // Update lender's applicants list if needed
        if (req.user.lender && req.user.lender.applicants) {
            const applicantIndex = req.user.lender.applicants.findIndex(
                app => app.buyer.toString() === buyer._id.toString()
            );
            
            if (applicantIndex !== -1) {
                req.user.lender.applicants[applicantIndex].status = 'approved';
                req.user.lender.applicants[applicantIndex].amount = amount;
                req.user.lender.applicants[applicantIndex].term = term;
                req.user.lender.applicants[applicantIndex].interestRate = interestRate;
                req.user.lender.applicants[applicantIndex].notes = notes;
                await req.user.save();
            }
        }
        
        // Notify the buyer
        await notificationController.createNotification(
            buyer._id,
            'Your pre-approval application has been approved!',
            'Pre-Approval Approved',
            '/dashboard',
            'SUCCESS'
        );
        
        return res.status(200).json({ 
            success: true, 
            message: 'Pre-approval successfully approved',
            preApproval
        });
    } catch (error) {
        logger.error('Error approving pre-approval:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error while approving pre-approval'
        });
    }
};

exports.denyApplicant = async (req, res) => {
    try {
        const { applicantId, reason } = req.body;
        
        if (!applicantId) {
            return res.status(400).json({ success: false, message: 'Applicant ID is required' });
        }
        
        // Find the user (buyer)
        const buyer = await User.findById(applicantId);
        
        if (!buyer) {
            return res.status(404).json({ success: false, message: 'Buyer not found' });
        }
        
        // Update buyer's pre-approval status
        await buyer.updatePreApprovalStatus('denied', req.user._id);
        
        // Update pre-approval record if it exists
        let preApproval = await PreApproval.findOne({ buyer: buyer._id });
        
        if (preApproval) {
            preApproval.status = 'denied';
            preApproval.rejectionReason = reason;
            preApproval.rejectionDate = new Date();
            await preApproval.save();
        } else {
            // Create new pre-approval record with denied status
            preApproval = new PreApproval({
                buyer: buyer._id,
                lender: req.user._id,
                status: 'denied',
                rejectionReason: reason,
                rejectionDate: new Date()
            });
            await preApproval.save();
        }
        
        // Update lender's applicants list if needed
        if (req.user.lender && req.user.lender.applicants) {
            const applicantIndex = req.user.lender.applicants.findIndex(
                app => app.buyer.toString() === buyer._id.toString()
            );
            
            if (applicantIndex !== -1) {
                req.user.lender.applicants[applicantIndex].status = 'denied';
                req.user.lender.applicants[applicantIndex].notes = reason;
                await req.user.save();
            }
        }
        
        // Notify the buyer
        await notificationController.createNotification(
            buyer._id,
            'Your pre-approval application has been declined',
            'Pre-Approval Declined',
            '/dashboard',
            'WARNING'
        );
        
        return res.status(200).json({ 
            success: true, 
            message: 'Pre-approval application denied',
            preApproval
        });
    } catch (error) {
        logger.error('Error denying pre-approval:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error while denying pre-approval'
        });
    }
};

exports.requestMoreInfo = async (req, res) => {
    try {
        const { applicantId, requestDetails } = req.body;
        
        if (!applicantId || !requestDetails) {
            return res.status(400).json({ 
                success: false, 
                message: 'Applicant ID and request details are required' 
            });
        }
        
        // Find the user (buyer)
        const buyer = await User.findById(applicantId);
        
        if (!buyer) {
            return res.status(404).json({ success: false, message: 'Buyer not found' });
        }
        
        // Create or update pre-approval record
        let preApproval = await PreApproval.findOne({ buyer: buyer._id });
        
        if (preApproval) {
            preApproval.additionalInfoRequested = true;
            preApproval.additionalInfoDetails = requestDetails;
            preApproval.additionalInfoRequestDate = new Date();
            await preApproval.save();
        } else {
            preApproval = new PreApproval({
                buyer: buyer._id,
                lender: req.user._id,
                status: 'pending',
                additionalInfoRequested: true,
                additionalInfoDetails: requestDetails,
                additionalInfoRequestDate: new Date()
            });
            await preApproval.save();
        }
        
        // Notify the buyer
        await notificationController.createNotification(
            buyer._id,
            'Additional information requested for your pre-approval application',
            'Pre-Approval Info Request',
            '/pre-Approval/details',
            'INFO'
        );
        
        return res.status(200).json({ 
            success: true, 
            message: 'Additional information requested',
            preApproval
        });
    } catch (error) {
        logger.error('Error requesting additional information:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error while requesting additional information'
        });
    }
};

// Other existing lender controller methods
exports.getApplicants = async (req, res) => {
    // Your code for getting applicants
};

exports.getAnalytics = async (req, res) => {
    // Your code for getting analytics
};