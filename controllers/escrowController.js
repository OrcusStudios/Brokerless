// controllers/escrowController.js
const Offer = require('../models/Offer');
const notificationController = require('./notificationController');

// Manage escrow details
exports.manageEscrow = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { 
      escrowNumber, 
      escrowStatus, 
      earnestMoneyReceived, 
      earnestMoneyAmount, 
      earnestMoneyDate, 
      notes 
    } = req.body;
    
    // Find the offer
    const offer = await Offer.findById(offerId)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('listing', 'address');
    
    if (!offer) {
      req.flash('error', 'Offer not found');
      return res.redirect('/dashboard');
    }
    
    // Check if user is the assigned title company
    const isTitleCompany = offer.titleCompanyDetails && 
                          offer.titleCompanyDetails.company && 
                          req.user._id.equals(offer.titleCompanyDetails.company);
    
    if (!isTitleCompany) {
      req.flash('error', 'Only the title company can update escrow details');
      return res.redirect(`/closing/${offerId}`);
    }
    
    // Update escrow details
    if (!offer.titleCompanyDetails) {
      offer.titleCompanyDetails = {};
    }
    
    if (escrowNumber) {
      offer.titleCompanyDetails.escrowNumber = escrowNumber;
    }
    
    // Update earnest money info if provided
    if (earnestMoneyReceived === 'on') {
      offer.titleCompanyDetails.earnestMoneyReceived = {
        status: true,
        date: earnestMoneyDate ? new Date(earnestMoneyDate) : new Date(),
        amount: earnestMoneyAmount || offer.earnestMoney,
        notes: notes
      };
      
      // Update related closing step
      const earnestMoneyStep = offer.closingSteps.find(step => 
        step.name.includes('Confirms Earnest Money')
      );
      
      if (earnestMoneyStep) {
        earnestMoneyStep.status = 'complete';
        earnestMoneyStep.completedDate = new Date();
        earnestMoneyStep.notes = notes || `Earnest money of $${earnestMoneyAmount || offer.earnestMoney} received.`;
      }
      
      // Notify buyer and seller
      await notificationController.createNotification(
        offer.buyer._id,
        `Earnest money received for your offer on ${offer.listing.address}`,
        'Earnest Money Received',
        `/closing/${offerId}`,
        'SUCCESS'
      );
      
      await notificationController.createNotification(
        offer.seller._id,
        `Earnest money received for ${offer.listing.address}`,
        'Earnest Money Received',
        `/closing/${offerId}`,
        'SUCCESS'
      );
    }
    
    await offer.save();
    
    req.flash('success', 'Escrow details updated successfully');
    return res.redirect(`/closing/${offerId}`);
  } catch (error) {
    console.error('Error updating escrow details:', error);
    req.flash('error', 'Error updating escrow details');
    return res.redirect(`/closing/${req.params.offerId}`);
  }
};

// Update escrow status
exports.updateEscrowStatus = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { status, notes } = req.body;
    
    // Find the offer
    const offer = await Offer.findById(offerId);
    
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
    
    // Check if user is the assigned title company
    const isTitleCompany = offer.titleCompanyDetails && 
                          offer.titleCompanyDetails.company && 
                          req.user._id.equals(offer.titleCompanyDetails.company);
    
    if (!isTitleCompany) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update escrow status' });
    }
    
    // Update escrow status
    offer.closingStatus = status;
    
    // Update related step based on status
    let stepToUpdate;
    
    switch (status) {
      case 'title_review':
        stepToUpdate = offer.closingSteps.find(step => step.name.includes('Title Review'));
        break;
      case 'documents_ready':
        stepToUpdate = offer.closingSteps.find(step => step.name.includes('Documents Preparation'));
        break;
      case 'signing_scheduled':
        stepToUpdate = offer.closingSteps.find(step => step.name.includes('Closing Appointment'));
        break;
      case 'signed':
        stepToUpdate = offer.closingSteps.find(step => step.name.includes('Closing Appointment'));
        break;
      case 'funded':
        stepToUpdate = offer.closingSteps.find(step => step.name.includes('Funding'));
        break;
      case 'recorded':
        stepToUpdate = offer.closingSteps.find(step => step.name.includes('Recording'));
        break;
      case 'closed':
        // Mark all remaining steps as complete when closing
        offer.closingSteps.forEach(step => {
          if (step.status !== 'complete') {
            step.status = 'complete';
            step.completedDate = new Date();
          }
        });
        break;
    }
    
    if (stepToUpdate) {
      stepToUpdate.status = 'complete';
      stepToUpdate.completedDate = new Date();
      if (notes) {
        stepToUpdate.notes = notes;
      }
    }
    
    await offer.save();
    
    // Notify buyer and seller
    const statusDisplay = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    await notificationController.createNotification(
      offer.buyer._id,
      `Closing status updated to "${statusDisplay}" for ${offer.listing.address}`,
      'Closing Update',
      `/closing/${offerId}`,
      'INFO'
    );
    
    await notificationController.createNotification(
      offer.seller._id,
      `Closing status updated to "${statusDisplay}" for ${offer.listing.address}`,
      'Closing Update',
      `/closing/${offerId}`,
      'INFO'
    );
    
    return res.json({ success: true, message: 'Escrow status updated successfully' });
  } catch (error) {
    console.error('Error updating escrow status:', error);
    return res.status(500).json({ success: false, message: 'Error updating escrow status' });
  }
};