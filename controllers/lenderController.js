const Lender = require("../models/Professional"); // Assuming lenders are in "Professional"
const User = require("../models/User");
const Notification = require("../models/Notification");
const PreApproval = require("../models/PreApproval");
const { sendEmail } = require("../utils/emailService"); // Ensure email service is set up

exports.applyForFinancing = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            if (req.xhr) {
                return res.status(401).json({ 
                    success: false, 
                    message: "You must be logged in to apply for financing." 
                });
            } else {
                req.flash('error', 'You must be logged in to apply for financing.');
                return res.redirect('/users/login');
            }
        }
        
        const { lenderId } = req.body;
        if (!lenderId) {
            if (req.xhr) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Lender ID is required." 
                });
            } else {
                req.flash('error', 'Lender ID is required.');
                return res.redirect('/lenderDirectory');
            }
        }
        
        const buyerId = req.user._id;

        // ✅ Validate that the lender exists
        const lender = await Lender.findById(lenderId);
        if (!lender) {
            if (req.xhr) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Lender not found." 
                });
            } else {
                req.flash('error', 'Lender not found.');
                return res.redirect('/lenderDirectory');
            }
        }

        // ✅ Validate that the buyer exists
        const buyer = await User.findById(buyerId);
        if (!buyer) {
            if (req.xhr) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Buyer account not found." 
                });
            } else {
                req.flash('error', 'Buyer account not found.');
                return res.redirect('/lenderDirectory');
            }
        }

        // Check if the buyer has a previous application with this lender
        console.log('==== CHECKING PREVIOUS APPLICATION ====');
        console.log('Buyer:', buyer._id, buyer.name);
        console.log('Buyer preApprovalLender:', buyer.buyer.preApprovalLender);
        console.log('Lender ID:', lenderId);
        console.log('Buyer preApprovalStatus:', buyer.buyer.preApprovalStatus);
        
        if (buyer.buyer.preApprovalLender && buyer.buyer.preApprovalLender.toString() === lenderId) {
            console.log('Buyer has previous application with this lender');
            console.log('Current status:', buyer.buyer.preApprovalStatus);
            
            // If the previous application was denied, allow reapplying
            if (buyer.buyer.preApprovalStatus === 'denied') {
                console.log('Previous application was denied, allowing reapplication');
                
                // Update buyer's status to pending
                buyer.buyer.preApprovalStatus = 'pending';
                await buyer.save();
                console.log('Buyer status updated to pending');
                
                // Update PreApproval record if it exists
                const preApproval = await PreApproval.findOne({ buyer: buyer._id });
                if (preApproval) {
                    preApproval.status = 'pending';
                    preApproval.submittedAt = new Date();
                    // Clear any rejection data
                    preApproval.rejectionDate = null;
                    await preApproval.save();
                    console.log('PreApproval record updated to pending');
                }
                
                // Update lender's preApprovals array
                console.log('Checking lender preApprovals array');
                console.log('Lender preApprovals:', lender.preApprovals);
                console.log('Buyer ID for comparison:', buyerId);
                
                const applicationIndex = lender.preApprovals.findIndex(app => {
                    console.log('Checking application:', app);
                    console.log('App buyer:', app.buyer);
                    console.log('App buyer toString():', app.buyer ? app.buyer.toString() : 'undefined');
                    console.log('Buyer ID toString():', buyerId.toString());
                    console.log('Comparison result:', app.buyer && app.buyer.toString() === buyerId.toString());
                    return app.buyer && app.buyer.toString() === buyerId.toString();
                });
                
                // We don't need to update the lender's preApprovals array with status information
                // since we're now only storing the buyer ID in the array
                // The status information is stored in the PreApproval model
                console.log('Lender preApprovals array already contains the buyer ID');
                
                // Create a new notification for the lender
                await Notification.create({
                    user: lender._id,
                    message: `${buyer.name} has reapplied for financing after previous denial. Check your dashboard.`,
                    type: "Approved",
                    link: "/professionals/dashboard"
                });
                console.log('Reapplication notification created for lender');
                
                // Continue with the application process (redirect to lender's application page)
                if (req.xhr) {
                    return res.json({ 
                        success: true, 
                        message: "You will now be redirected to the lender's application page.",
                        applicationUrl: lender.preApprovalLink || "https://example.com/apply" 
                    });
                } else {
                    req.flash('success', 'You will now be redirected to the lender\'s application page.');
                    return res.redirect(lender.preApprovalLink || "https://example.com/apply");
                }
            } else {
                // Prevent duplicate applications for non-denied statuses
                console.log('Previous application is still active, preventing duplicate');
                // Check if this is an AJAX request or a form submission
                if (req.xhr) {
                    return res.json({ 
                        success: true, 
                        message: "You have already applied to this lender.",
                        applicationUrl: lender.preApprovalLink || "https://example.com/apply"
                    });
                } else {
                    req.flash('info', 'You have already applied to this lender.');
                    return res.redirect(lender.preApprovalLink || "https://example.com/apply");
                }
            }
        } else {
            console.log('Buyer does not have a previous application with this lender');
            
            // Check if the buyer has a previous application with a different lender
            if (buyer.buyer.preApprovalLender) {
                console.log('Buyer has a previous application with a different lender');
                console.log('Previous lender:', buyer.buyer.preApprovalLender);
                console.log('Current status:', buyer.buyer.preApprovalStatus);
                
                // Update the buyer's lender reference and status
                buyer.buyer.preApprovalLender = lender._id;
                buyer.buyer.preApprovalStatus = "pending";
                await buyer.save();
                console.log('Buyer updated with new lender reference');
                
                // Update PreApproval record if it exists
                const preApproval = await PreApproval.findOne({ buyer: buyer._id });
                if (preApproval) {
                    preApproval.lender = lender._id;
                    preApproval.status = 'pending';
                    preApproval.submittedAt = new Date();
                    // Clear any rejection data
                    preApproval.rejectionDate = null;
                    await preApproval.save();
                    console.log('PreApproval record updated with new lender');
                }
            } else {
                // ✅ Update buyer's profile with lender reference
                buyer.buyer.preApprovalLender = lender._id;
                buyer.buyer.preApprovalStatus = "pending";
                await buyer.save();
                console.log('Buyer updated with new lender reference (first application)');
            }
        }

        // ✅ Add buyer to lender's pre-approval list (only store the buyer ID)
        if (!lender.preApprovals) lender.preApprovals = [];
        
        // Check if the buyer is already in the list
        const existingApplication = lender.preApprovals.find(app => 
            app.buyer && app.buyer.toString() === buyerId.toString()
        );
        
        if (!existingApplication) {
            // Add a new application entry with only the buyer ID
            lender.preApprovals.push({
                buyer: buyerId
            });
            await lender.save();
            console.log('Added buyer to lender preApprovals array (minimal data)');
        }

        // ✅ Send Notification to Lender
        await Notification.create({
            user: lender._id,
            message: `${buyer.name} has applied for financing. Check your dashboard.`,
            type: "Approved",
            link: "/professionals/dashboard"
        });

        // Check if this is an AJAX request or a form submission
        if (req.xhr) {
            return res.json({ 
                success: true, 
                message: "You will now be redirected to the lender's application page.",
                applicationUrl: lender.preApprovalLink || "https://example.com/apply" 
            });
        } else {
            req.flash('success', 'You will now be redirected to the lender\'s application page.');
            return res.redirect(lender.preApprovalLink || "https://example.com/apply");
        }

    } catch (error) {
        console.error("❌ Error processing financing application:", error);
        
        // Check if this is an AJAX request or a form submission
        if (req.xhr) {
            return res.status(500).json({ 
                success: false, 
                message: "An error occurred. Please try again." 
            });
        } else {
            req.flash('error', 'An error occurred. Please try again.');
            return res.redirect('/lenderDirectory');
        }
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

// Add the missing methods for applicant approval flow
exports.approveApplicant = async (req, res) => {
    console.log('==== APPROVE APPLICATION ====');
    console.log('Request body:', req.body);
    console.log('Request user:', req.user ? req.user._id : 'No user');
    
    try {
        const { applicantId, amount, term, interestRate, expirationDate, notes } = req.body;
        
        if (!applicantId) {
            console.log('ERROR: No applicant ID provided');
            return res.status(400).json({ success: false, message: 'Applicant ID is required' });
        }
        
        // Find the user (buyer)
        console.log('Finding buyer with ID:', applicantId);
        const buyer = await User.findById(applicantId);
        console.log('Buyer found:', buyer ? 'Yes' : 'No');
        
        if (!buyer) {
            console.log('ERROR: Buyer not found');
            return res.status(404).json({ success: false, message: 'Buyer not found' });
        }
        
        console.log('Buyer details before update:', {
            id: buyer._id,
            name: buyer.name,
            email: buyer.email,
            currentStatus: buyer.buyer.preApprovalStatus
        });
        
        // Update buyer's pre-approval status
        console.log('Updating buyer pre-approval status to approved');
        await buyer.updatePreApprovalStatus('approved', req.user._id, amount, expirationDate);
        
        // Fetch the buyer again to verify the update
        const updatedBuyer = await User.findById(applicantId);
        console.log('Buyer details after update:', {
            id: updatedBuyer._id,
            name: updatedBuyer.name,
            email: updatedBuyer.email,
            currentStatus: updatedBuyer.buyer.preApprovalStatus,
            lender: updatedBuyer.buyer.preApprovalLender
        });
        
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
        await Notification.create({
            user: buyer._id,
            message: 'Your pre-approval application has been approved!',
            type: 'success',
            link: '/dashboard'
        });
        
        return res.status(200).json({ 
            success: true, 
            message: 'Pre-approval successfully approved',
            preApproval
        });
    } catch (error) {
        console.error('Error approving pre-approval:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error while approving pre-approval'
        });
    }
};

exports.approveApplicantGet = async (req, res) => {
    console.log('approveApplicantGet function called with query:', req.query);
    try {
        const applicantId = req.query.id;
        console.log("ID: " + applicantId);
        
        if (!applicantId) {
            req.flash('error', 'Applicant ID is required');
            return res.redirect('/professionals/dashboard');
        }
        
        // Find the user (buyer)
        const buyer = await User.findById(applicantId);
        console.log("Buyer: " + buyer);
        
        if (!buyer) {
            req.flash('error', 'Buyer not found');
            return res.redirect('/professionals/dashboard');
        }
        
        // Prompt for amount
        const amount = req.query.amount;
        if (!amount) {
            // If no amount provided, redirect to a form to enter amount
            return res.render('professionals/approveForm', { 
                buyer, 
                applicantId,
                user: req.user
            });
        }
        
        // Update buyer's pre-approval status
        console.log('Updating buyer pre-approval status to approved');
        console.log('Buyer before update:', {
            id: buyer._id,
            name: buyer.name,
            email: buyer.email,
            currentStatus: buyer.buyer.preApprovalStatus
        });
        
        // Use the updatePreApprovalStatus method which should handle the nested structure
        await buyer.updatePreApprovalStatus('approved', req.user._id, amount);
        
        console.log('Buyer after update:', {
            id: buyer._id,
            name: buyer.name,
            email: buyer.email,
            currentStatus: buyer.buyer.preApprovalStatus
        });
        
        // Update pre-approval record if it exists
        let preApproval = await PreApproval.findOne({ buyer: buyer._id });
        
        if (preApproval) {
            preApproval.status = 'approved';
            preApproval.approvalAmount = amount;
            preApproval.approvalDate = new Date();
            await preApproval.save();
        } else {
            // Create new pre-approval record with approved status
            preApproval = new PreApproval({
                buyer: buyer._id,
                lender: req.user._id,
                status: 'approved',
                approvalAmount: amount,
                approvalDate: new Date()
            });
            await preApproval.save();
        }
        
        // Update lender's applicants list if needed
        if (req.user.lender && req.user.lender.applicants) {
            const applicantIndex = req.user.lender.applicants.findIndex(
                app => app.buyer.toString() === buyer._id.toString()
            );
            
            if (applicantIndex !== -1) {
                req.user.lender.applicants[applicantIndex].status = 'approved';
                req.user.lender.applicants[applicantIndex].amount = amount;
                await req.user.save();
            }
        }
        
        // Notify the buyer
        await Notification.create({
            user: buyer._id,
            message: 'Your pre-approval application has been approved!',
            type: 'success',
            link: '/dashboard'
        });
        
        req.flash('success', 'Application approved successfully');
        return res.redirect('/professionals/dashboard');
    } catch (error) {
        console.error('Error approving pre-approval:', error);
        req.flash('error', 'Server error while approving pre-approval');
        return res.redirect('/professionals/dashboard');
    }
};

exports.denyApplicant = async (req, res) => {
    console.log('==== DENY APPLICATION POST ====');
    console.log('Request body:', req.body);
    console.log('Request user:', req.user ? req.user._id : 'No user');
    
    try {
        const { applicantId } = req.body;
        
        if (!applicantId) {
            console.log('ERROR: No applicant ID provided');
            return res.status(400).json({ success: false, message: 'Applicant ID is required' });
        }
        
        // Find the user (buyer)
        console.log('Finding buyer with ID:', applicantId);
        const buyer = await User.findById(applicantId);
        console.log('Buyer found:', buyer ? 'Yes' : 'No');
        
        if (!buyer) {
            console.log('ERROR: Buyer not found');
            return res.status(404).json({ success: false, message: 'Buyer not found' });
        }
        
        console.log('Buyer details before update:', {
            id: buyer._id,
            name: buyer.name,
            email: buyer.email,
            currentStatus: buyer.buyer.preApprovalStatus
        });
        
        // Update buyer's pre-approval status
        console.log('Updating buyer pre-approval status to denied');
        await buyer.updatePreApprovalStatus('denied', req.user._id);
        
        // Fetch the buyer again to verify the update
        const updatedBuyer = await User.findById(applicantId);
        console.log('Buyer details after update:', {
            id: updatedBuyer._id,
            name: updatedBuyer.name,
            email: updatedBuyer.email,
            currentStatus: updatedBuyer.buyer.preApprovalStatus,
            lender: updatedBuyer.buyer.preApprovalLender
        });
        
        // Update pre-approval record if it exists
        let preApproval = await PreApproval.findOne({ buyer: buyer._id });
        
        if (preApproval) {
            preApproval.status = 'denied';
            preApproval.rejectionDate = new Date();
            await preApproval.save();
        } else {
            // Create new pre-approval record with denied status
            preApproval = new PreApproval({
                buyer: buyer._id,
                lender: req.user._id,
                status: 'denied',
                extractedText: "",
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
                await req.user.save();
            }
        }
        
        // Notify the buyer
        await Notification.create({
            user: buyer._id,
            message: 'Your pre-approval application has been declined',
            type: 'Denied', // Changed from 'WARNING' to 'Denied' to match the enum in Notification model
            link: '/dashboard'
        });
        
        return res.status(200).json({ 
            success: true, 
            message: 'Pre-approval application denied',
            preApproval
        });
    } catch (error) {
        console.error('Error denying pre-approval:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error while denying pre-approval'
        });
    }
};

exports.requestMoreInfo = async (req, res) => {
    console.log('==== REQUEST MORE INFO ====');
    console.log('Request body:', req.body);
    console.log('Request user:', req.user ? req.user._id : 'No user');
    
    try {
        const { applicantId, requestDetails } = req.body;
        
        if (!applicantId || !requestDetails) {
            console.log('ERROR: Missing required fields');
            return res.status(400).json({ 
                success: false, 
                message: 'Applicant ID and request details are required' 
            });
        }
        
        // Find the user (buyer)
        console.log('Finding buyer with ID:', applicantId);
        const buyer = await User.findById(applicantId);
        console.log('Buyer found:', buyer ? 'Yes' : 'No');
        
        if (!buyer) {
            console.log('ERROR: Buyer not found');
            return res.status(404).json({ success: false, message: 'Buyer not found' });
        }
        
        console.log('Buyer details:', {
            id: buyer._id,
            name: buyer.name,
            email: buyer.email,
            currentStatus: buyer.buyer.preApprovalStatus
        });
        
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
        await Notification.create({
            user: buyer._id,
            message: 'Additional information requested for your pre-approval application',
            type: 'info',
            link: '/pre-Approval/details'
        });
        
        return res.status(200).json({ 
            success: true, 
            message: 'Additional information requested',
            preApproval
        });
    } catch (error) {
        console.error('Error requesting additional information:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error while requesting additional information'
        });
    }
};

// Update application link
exports.updateApplicationLink = async (req, res) => {
    try {
        const { preApprovalLink } = req.body;
        
        if (!preApprovalLink) {
            req.flash('error', 'Application link is required');
            return res.redirect('/professionals/dashboard');
        }
        
        // Validate URL format
        try {
            new URL(preApprovalLink);
        } catch (err) {
            req.flash('error', 'Please enter a valid URL (including https://)');
            return res.redirect('/professionals/dashboard');
        }
        
        // Update the lender's preApprovalLink
        const lender = await Lender.findById(req.user._id);
        
        if (!lender) {
            req.flash('error', 'Lender account not found');
            return res.redirect('/professionals/dashboard');
        }
        
        lender.preApprovalLink = preApprovalLink;
        await lender.save();
        
        req.flash('success', 'Application link updated successfully');
        return res.redirect('/professionals/dashboard');
    } catch (error) {
        console.error('Error updating application link:', error);
        req.flash('error', 'Failed to update application link');
        return res.redirect('/professionals/dashboard');
    }
};

// GET method for denying applications (for anchor tag links)
exports.denyApplicantGet = async (req, res) => {
    console.log('==== DENY APPLICATION GET ====');
    console.log('Request query:', req.query);
    console.log('Request user:', req.user ? req.user._id : 'No user');
    console.log('Notification model:', Notification ? 'Loaded' : 'Not loaded');
    
    try {
        // Get the buyer ID from the query parameter
        const buyerId = req.query.id;
        console.log('Buyer ID from query:', buyerId);
        
        if (!buyerId) {
            console.log('ERROR: No buyer ID provided');
            req.flash('error', 'Buyer ID is required');
            return res.redirect('/professionals/dashboard');
        }
        
        // Find the buyer
        console.log('Finding buyer with ID:', buyerId);
        const buyer = await User.findById(buyerId);
        console.log('Buyer found:', buyer ? 'Yes' : 'No');
        
        if (!buyer) {
            console.log('ERROR: Buyer not found');
            req.flash('error', 'Buyer not found');
            return res.redirect('/professionals/dashboard');
        }
        
        console.log('Buyer details:', {
            id: buyer._id,
            name: buyer.name,
            email: buyer.email,
            currentStatus: buyer.buyer.preApprovalStatus
        });
        
        // Set the buyer's pre-approval status to denied
        console.log('Updating buyer pre-approval status to denied');
        buyer.buyer.preApprovalStatus = 'denied';
        buyer.buyer.preApprovalLender = req.user._id;
        await buyer.save();
        console.log('Buyer updated successfully');
        
        // Create or update the pre-approval record
        console.log('Creating/updating pre-approval record');
        try {
            const preApproval = await PreApproval.findOneAndUpdate(
                { buyer: buyerId },
                { 
                    status: 'denied',
                    lender: req.user._id,
                    rejectionDate: new Date()
                },
                { upsert: true, new: true }
            );
            console.log('PreApproval record updated:', preApproval ? preApproval._id : 'Failed');
        } catch (preApprovalError) {
            console.error('Error updating pre-approval record:', preApprovalError);
        }
        
        // Update the lender's preApprovals array
        console.log('Updating lender preApprovals array');
        try {
            const lender = await Lender.findById(req.user._id);
            if (lender) {
                console.log('Lender found:', lender._id);
                // Find the application in the preApprovals array
                const applicationIndex = lender.preApprovals.findIndex(
                    app => app.buyer && app.buyer.toString() === buyerId
                );
                
                console.log('Application index:', applicationIndex);
                
                if (applicationIndex !== -1) {
                    // We don't need to update the lender's preApprovals array with status information
                    // since we're now only storing the buyer ID in the array
                    console.log('Lender preApprovals array already contains the buyer ID');
                } else {
                    console.log('Application not found in lender preApprovals array');
                    // Add a new entry with only the buyer ID if not found
                    lender.preApprovals.push({
                        buyer: buyerId
                    });
                    await lender.save();
                    console.log('Added buyer to lender preApprovals array (minimal data)');
                }
            } else {
                console.log('Lender not found');
            }
        } catch (lenderError) {
            console.error('Error updating lender preApprovals:', lenderError);
        }
        
        // Notify the buyer
        console.log('Creating notification for buyer');
        try {
            const notification = await Notification.create({
                user: buyerId,
                message: 'Your pre-approval application has been declined',
                type: 'Denied', // Changed from 'WARNING' to 'Denied' to match the enum in Notification model
                link: '/dashboard'
            });
            console.log('Notification created:', notification ? notification._id : 'Failed');
        } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
            console.error('Notification error details:', notificationError.message);
            console.error('Notification error stack:', notificationError.stack);
        }
        
        console.log('Setting success flash message');
        req.flash('success', 'Application denied successfully');
        console.log('Redirecting to dashboard');
        return res.redirect('/professionals/dashboard');
    } catch (error) {
        console.error('==== ERROR DENYING APPLICATION ====');
        console.error('Error details:', error);
        console.error('Stack trace:', error.stack);
        req.flash('error', 'An error occurred while denying the application');
        return res.redirect('/professionals/dashboard');
    }
};

// Lender Dashboard
exports.getDashboard = async (req, res) => {
    try {
        // Redirect to professional dashboard which handles different professional types
        return res.redirect('/professionals/dashboard');
    } catch (error) {
        console.error('Error loading lender dashboard:', error);
        req.flash('error', 'Error loading dashboard');
        return res.redirect('/');
    }
};

// Other existing lender controller methods
exports.getApplicants = async (req, res) => {
    // Your code for getting applicants
};

exports.getAnalytics = async (req, res) => {
    // Your code for getting analytics
};
