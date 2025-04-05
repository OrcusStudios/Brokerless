// controllers/titleController.js
const Offer = require('../models/Offer');
const ClosingDocument = require('../models/ClosingDocument');
const User = require('../models/User');
const Professional = require('../models/Professional');
const notificationController = require('./notificationController');
const { sendEmail } = require('../utils/emailService');
const { cloudinary } = require('../routes/cloudinary');
const { AppError } = require('../middleware/errorMiddleware');

// Confirm earnest money receipt
exports.confirmEarnestMoney = async (req, res) => {
  try {
    const { offerId, amount, receivedDate, confirmationNumber } = req.body;
    
    // Find the offer
    const offer = await Offer.findById(offerId)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('listing', 'address');
    
    if (!offer) {
      req.flash('error', 'Offer not found');
      return res.redirect('/professionals/dashboard');
    }
    
    // Verify this title company is assigned to this transaction
    if (!offer.titleCompanyDetails.company || 
        !offer.titleCompanyDetails.company.equals(req.user._id)) {
      req.flash('error', 'You are not authorized to update this transaction');
      return res.redirect('/professionals/dashboard');
    }
    
    // Update earnest money information
    offer.titleCompanyDetails.earnestMoneyReceived = {
      status: true,
      date: new Date(receivedDate),
      amount: parseFloat(amount),
      confirmationNumber
    };
    
    // Update related closing step
    const earnestMoneyStep = offer.closingSteps.find(step => 
      step.name.includes('Earnest Money')
    );
    
    if (earnestMoneyStep) {
      earnestMoneyStep.status = 'complete';
      earnestMoneyStep.completedDate = new Date();
      earnestMoneyStep.notes = `Earnest money of $${amount} received. Receipt #${confirmationNumber}`;
    }
    
    await offer.save();
    
    // Send notifications to buyer and seller
    await notificationController.createNotification(
      offer.buyer._id,
      `Earnest money confirmed for your offer on ${offer.listing.address}`,
      'Earnest Money Received',
      `/closing/${offerId}`,
      'SUCCESS'
    );
    
    await notificationController.createNotification(
      offer.seller._id,
      `Earnest money confirmed for ${offer.listing.address}`,
      'Earnest Money Received',
      `/closing/${offerId}`,
      'SUCCESS'
    );
    
    req.flash('success', 'Earnest money receipt confirmed successfully');
    return res.redirect('/professionals/dashboard');
  } catch (error) {
    console.error('Error confirming earnest money:', error);
    req.flash('error', 'Error confirming earnest money: ' + error.message);
    return res.redirect('/professionals/dashboard');
  }
};

// Update title work status
exports.updateTitleWorkStatus = async (req, res) => {
  try {
    const { offerId, stepIndex, status, notes, notifyParties } = req.body;
    
    // Find the offer
    const offer = await Offer.findById(offerId)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('listing', 'address');
    
    if (!offer) {
      req.flash('error', 'Offer not found');
      return res.redirect('/professionals/dashboard');
    }
    
    // Verify this title company is assigned to this transaction
    if (!offer.titleCompanyDetails.company || 
        !offer.titleCompanyDetails.company.equals(req.user._id)) {
      req.flash('error', 'You are not authorized to update this transaction');
      return res.redirect('/professionals/dashboard');
    }
    
    // Update the closing step
    if (offer.closingSteps[stepIndex]) {
      offer.closingSteps[stepIndex].status = status;
      offer.closingSteps[stepIndex].notes = notes;
      
      if (status === 'complete') {
        offer.closingSteps[stepIndex].completedDate = new Date();
        
        // If this is the title step and it's complete, update the closing status
        if (offer.closingSteps[stepIndex].name.includes('Title') && 
            offer.closingStatus === 'in_progress') {
          offer.closingStatus = 'title_review';
        }
      }
    }
    
    await offer.save();
    
    // Send notifications if requested
    if (notifyParties === 'on') {
      const statusText = {
        'pending': 'is pending',
        'in_progress': 'is in progress',
        'complete': 'has been completed',
        'issue': 'has an issue that needs attention'
      };
      
      await notificationController.createNotification(
        offer.buyer._id,
        `Title work for ${offer.listing.address} ${statusText[status]}`,
        'Title Work Update',
        `/closing/${offerId}`,
        status === 'issue' ? 'WARNING' : 'INFO'
      );
      
      await notificationController.createNotification(
        offer.seller._id,
        `Title work for ${offer.listing.address} ${statusText[status]}`,
        'Title Work Update',
        `/closing/${offerId}`,
        status === 'issue' ? 'WARNING' : 'INFO'
      );
    }
    
    req.flash('success', 'Title work status updated successfully');
    return res.redirect('/professionals/dashboard');
  } catch (error) {
    console.error('Error updating title work:', error);
    req.flash('error', 'Error updating title work: ' + error.message);
    return res.redirect('/professionals/dashboard');
  }
};

// Send settlement statements
exports.sendSettlementStatements = async (req, res) => {
  try {
    const { 
      offerId, 
      buyerEmail, 
      sellerEmail, 
      sendToBuyer, 
      sendToSeller, 
      message 
    } = req.body;
    
    // Get uploaded files
    const buyerFile = req.files?.buyerSettlementFile;
    const sellerFile = req.files?.sellerSettlementFile;
    
    // Find the offer
    const offer = await Offer.findById(offerId)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('listing', 'address');
    
    if (!offer) {
      req.flash('error', 'Offer not found');
      return res.redirect('/professionals/dashboard');
    }
    
    // Track if anything was sent
    let anyStatementSent = false;
    
    // Initialize settlement statements object if not exists
    if (!offer.settlementStatements) {
      offer.settlementStatements = {
        buyerSent: false,
        sellerSent: false,
        buyerUrl: null,
        sellerUrl: null,
        sentDate: null
      };
    }
    
    // Handle buyer statement
    if (buyerFile && sendToBuyer === 'on') {
      // Upload to Cloudinary
      const buyerResult = await cloudinary.uploader.upload(buyerFile.tempFilePath, {
        folder: 'settlement_statements',
        resource_type: 'auto'
      });
      
      // Store URL in offer
      offer.settlementStatements.buyerUrl = buyerResult.secure_url;
      offer.settlementStatements.buyerSent = true;
      
      // Send email to buyer
      await sendEmail({
        to: buyerEmail || offer.buyer.email,
        subject: `Settlement Statement for ${offer.listing.address}`,
        text: message,
        attachments: [
          {
            filename: `Settlement_Statement_${offer.listing.address.replace(/\s+/g, '_')}.pdf`,
            path: buyerResult.secure_url
          }
        ]
      });
      
      // Create notification
      await notificationController.createNotification(
        offer.buyer._id,
        `Settlement statement for ${offer.listing.address} has been sent to your email`,
        'Settlement Statement',
        `/closing/${offerId}`,
        'INFO'
      );
      
      anyStatementSent = true;
    }
    
    // Handle seller statement
    if (sellerFile && sendToSeller === 'on') {
      // Upload to Cloudinary
      const sellerResult = await cloudinary.uploader.upload(sellerFile.tempFilePath, {
        folder: 'settlement_statements',
        resource_type: 'auto'
      });
      
      // Store URL in offer
      offer.settlementStatements.sellerUrl = sellerResult.secure_url;
      offer.settlementStatements.sellerSent = true;
      
      // Send email to seller
      await sendEmail({
        to: sellerEmail || offer.seller.email,
        subject: `Settlement Statement for ${offer.listing.address}`,
        text: message,
        attachments: [
          {
            filename: `Settlement_Statement_${offer.listing.address.replace(/\s+/g, '_')}.pdf`,
            path: sellerResult.secure_url
          }
        ]
      });
      
      // Create notification
      await notificationController.createNotification(
        offer.seller._id,
        `Settlement statement for ${offer.listing.address} has been sent to your email`,
        'Settlement Statement',
        `/closing/${offerId}`,
        'INFO'
      );
      
      anyStatementSent = true;
    }
    
    // Update sent date if any statements were sent
    if (anyStatementSent) {
      offer.settlementStatements.sentDate = new Date();
      
      // Update closing step if it exists
      const disclosureStep = offer.closingSteps.find(step => 
        step.name.includes('Closing Disclosure') || 
        step.name.includes('Settlement') || 
        step.name.includes('Documents')
      );
      
      if (disclosureStep) {
        disclosureStep.status = 'complete';
        disclosureStep.completedDate = new Date();
        disclosureStep.notes = 'Settlement statements sent to parties';
      }
      
      // Increment closing status if appropriate
      if (offer.closingStatus === 'title_review') {
        offer.closingStatus = 'documents_ready';
      }
    }
    
    await offer.save();
    
    req.flash('success', 'Settlement statements sent successfully');
    return res.redirect('/professionals/dashboard');
  } catch (error) {
    console.error('Error sending settlement statements:', error);
    req.flash('error', 'Error sending settlement statements: ' + error.message);
    return res.redirect('/professionals/dashboard');
  }
};

// Update closing status
exports.updateClosingStatus = async (req, res) => {
  try {
    const { offerId, status, notes } = req.body;
    
    // Find the offer
    const offer = await Offer.findById(offerId)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('listing', 'address');
    
    if (!offer) {
      req.flash('error', 'Offer not found');
      return res.redirect('/professionals/dashboard');
    }
    
    // Verify this title company is assigned to this transaction
    if (!offer.titleCompanyDetails.company || 
        !offer.titleCompanyDetails.company.equals(req.user._id)) {
      req.flash('error', 'You are not authorized to update this transaction');
      return res.redirect('/professionals/dashboard');
    }
    
    // Update the closing status
    offer.closingStatus = status;
    
    // Update relevant step based on status
    let stepToUpdate;
    
    switch (status) {
      case 'title_review':
        stepToUpdate = offer.closingSteps.find(step => step.name.includes('Title'));
        break;
      case 'documents_ready':
        stepToUpdate = offer.closingSteps.find(step => 
          step.name.includes('Documents') || step.name.includes('Disclosure')
        );
        break;
      case 'signing_scheduled':
        stepToUpdate = offer.closingSteps.find(step => 
          step.name.includes('Signing') || step.name.includes('Closing') || 
          step.name.includes('Walk-Through')
        );
        break;
      case 'signed':
        stepToUpdate = offer.closingSteps.find(step => 
          step.name.includes('Signing') || step.name.includes('Closing')
        );
        break;
      case 'funded':
        stepToUpdate = offer.closingSteps.find(step => 
          step.name.includes('Funding') || step.name.includes('Closing')
        );
        break;
      case 'recorded':
      case 'closed':
        // For final statuses, mark all remaining steps complete
        offer.closingSteps.forEach(step => {
          if (step.status !== 'complete') {
            step.status = 'complete';
            step.completedDate = new Date();
            if (notes) {
              step.notes = notes;
            }
          }
        });
        break;
    }
    
    // Update the specific step if found
    if (stepToUpdate && stepToUpdate.status !== 'complete') {
      stepToUpdate.status = 'complete';
      stepToUpdate.completedDate = new Date();
      if (notes) {
        stepToUpdate.notes = notes;
      }
    }
    
    await offer.save();
    
    // Notify parties of status change
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
    
    req.flash('success', `Closing status updated to ${statusDisplay}`);
    return res.redirect('/professionals/dashboard');
  } catch (error) {
    console.error('Error updating closing status:', error);
    req.flash('error', 'Error updating closing status: ' + error.message);
    return res.redirect('/professionals/dashboard');
  }
};

// Complete closing
exports.completeClosing = async (req, res) => {
  try {
    const { offerId, recordingDate, recordingNumber, county, notes } = req.body;
    
    // Find the offer
    const offer = await Offer.findById(offerId)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('listing', 'address');
    
    if (!offer) {
      req.flash('error', 'Offer not found');
      return res.redirect('/professionals/dashboard');
    }
    
    // Verify this title company is assigned to this transaction
    if (!offer.titleCompanyDetails.company || 
        !offer.titleCompanyDetails.company.equals(req.user._id)) {
      req.flash('error', 'You are not authorized to update this transaction');
      return res.redirect('/professionals/dashboard');
    }
    
    // Update recording details
    offer.recordingDetails = {
      recordingDate: new Date(recordingDate),
      recordingNumber,
      county,
      notes
    };
    
    // Update closing status
    offer.closingStatus = 'closed';
    
    // Mark all remaining steps as complete
    offer.closingSteps.forEach(step => {
      if (step.status !== 'complete') {
        step.status = 'complete';
        step.completedDate = new Date();
      }
    });
    
    await offer.save();
    
    // Notify parties of completion
    await notificationController.createNotification(
      offer.buyer._id,
      `Closing for ${offer.listing.address} is now complete! The deed has been recorded.`,
      'Closing Complete',
      `/closing/${offerId}/complete`,
      'SUCCESS'
    );
    
    await notificationController.createNotification(
      offer.seller._id,
      `Closing for ${offer.listing.address} is now complete! The deed has been recorded.`,
      'Closing Complete',
      `/closing/${offerId}/complete`,
      'SUCCESS'
    );
    
    req.flash('success', 'Closing has been marked as complete');
    return res.redirect('/professionals/dashboard');
  } catch (error) {
    console.error('Error completing closing:', error);
    req.flash('error', 'Error completing closing: ' + error.message);
    return res.redirect('/professionals/dashboard');
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { 
      offerId, 
      method, 
      status, 
      checkNumber, 
      wireConfirmationNumber, 
      notes 
    } = req.body;
    
    // Find the offer
    const offer = await Offer.findById(offerId)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('listing', 'address');
    
    if (!offer) {
      req.flash('error', 'Offer not found');
      return res.redirect('/professionals/dashboard');
    }
    
    // Verify this title company is assigned to this transaction
    if (!offer.titleCompanyDetails.company || 
        !offer.titleCompanyDetails.company.equals(req.user._id)) {
      req.flash('error', 'You are not authorized to update this transaction');
      return res.redirect('/professionals/dashboard');
    }
    
    // Update payment status
    if (!offer.titleCompanyDetails.paymentStatus) {
      offer.titleCompanyDetails.paymentStatus = {};
    }
    
    offer.titleCompanyDetails.paymentStatus.method = method;
    offer.titleCompanyDetails.paymentStatus.status = status;
    
    if (method === 'check' && checkNumber) {
      offer.titleCompanyDetails.paymentStatus.checkNumber = checkNumber;
    }
    
    if (method === 'wire' && wireConfirmationNumber) {
      offer.titleCompanyDetails.paymentStatus.wireConfirmationNumber = wireConfirmationNumber;
    }
    
    if (notes) {
      offer.titleCompanyDetails.paymentStatus.notes = notes;
    }
    
    // Update dates based on status
    if (status === 'initiated' || status === 'sent') {
      offer.titleCompanyDetails.paymentStatus.initiatedDate = new Date();
    }
    
    if (status === 'received' || status === 'completed') {
      offer.titleCompanyDetails.paymentStatus.completedDate = new Date();
      
      // If payment is completed, update the closing step
      const fundingStep = offer.closingSteps.find(step => 
        step.name.toLowerCase().includes('funding') || 
        step.name.toLowerCase().includes('payment')
      );
      
      if (fundingStep) {
        fundingStep.status = 'complete';
        fundingStep.completedDate = new Date();
        fundingStep.notes = `Payment ${status} via ${method}. ${notes || ''}`;
      }
      
      // Update closing status if appropriate
      if (offer.closingStatus === 'signed') {
        offer.closingStatus = 'funded';
      }
    }
    
    await offer.save();
    
    // Notify parties of payment status
    const statusDisplay = status.charAt(0).toUpperCase() + status.slice(1);
    const methodDisplay = method.charAt(0).toUpperCase() + method.slice(1);
    
    await notificationController.createNotification(
      offer.buyer._id,
      `Payment for ${offer.listing.address} has been ${status} via ${method}`,
      'Payment Update',
      `/closing/${offerId}`,
      'INFO'
    );
    
    await notificationController.createNotification(
      offer.seller._id,
      `Payment for ${offer.listing.address} has been ${status} via ${method}`,
      'Payment Update',
      `/closing/${offerId}`,
      'INFO'
    );
    
    req.flash('success', `Payment status updated to ${statusDisplay}`);
    return res.redirect('/professionals/dashboard');
  } catch (error) {
    console.error('Error updating payment status:', error);
    req.flash('error', 'Error updating payment status: ' + error.message);
    return res.redirect('/professionals/dashboard');
  }
};
