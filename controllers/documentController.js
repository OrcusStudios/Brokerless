// controllers/documentController.js
const ClosingDocument = require('../models/ClosingDocument');
const Offer = require('../models/Offer');
const { cloudinary } = require('../routes/cloudinary');
const { AppError } = require('../middleware/errorMiddleware');

// Get documents for a specific offer/closing
exports.getDocuments = async (req, res) => {
  try {
    const { offerId } = req.params;
    
    // Find all documents for this offer
    const documents = await ClosingDocument.find({ offer: offerId })
      .populate('uploadedBy', 'name email')
      .sort('-createdAt');
    
    // Get the offer details
    const offer = await Offer.findById(offerId)
      .populate('buyer', 'name')
      .populate('seller', 'name')
      .populate('listing', 'address');
    
    if (!offer) {
      req.flash('error', 'Offer not found');
      return res.redirect('/dashboard');
    }
    
    // Check authorization
    const isAuthorized = req.user._id.equals(offer.buyer._id) || 
                         req.user._id.equals(offer.seller._id) ||
                         (offer.titleCompanyDetails && 
                          offer.titleCompanyDetails.company &&
                          req.user._id.equals(offer.titleCompanyDetails.company));
    
    if (!isAuthorized) {
      req.flash('error', 'You are not authorized to view these documents');
      return res.redirect('/dashboard');
    }
    
    // Group documents by category
    const groupedDocuments = {
      contract: documents.filter(doc => doc.category === 'contract'),
      disclosure: documents.filter(doc => doc.category === 'disclosure'),
      inspection: documents.filter(doc => doc.category === 'inspection'),
      title: documents.filter(doc => doc.category === 'title'),
      mortgage: documents.filter(doc => doc.category === 'mortgage'),
      identity: documents.filter(doc => doc.category === 'identity'),
      other: documents.filter(doc => doc.category === 'other')
    };
    
    // Determine required signatures based on user role
    const requiredSignatures = documents.filter(doc => {
      return doc.requiredSignatures.some(sig => sig.user.equals(req.user._id) && !sig.signed);
    });
    
    res.render('closing/documents', {
      offer,
      documents,
      groupedDocuments,
      requiredSignatures,
      user: req.user
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    req.flash('error', 'Error loading documents');
    return res.redirect(`/closing/${req.params.offerId}`);
  }
};

// Upload a new document
exports.uploadDocument = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { name, category, requireBuyerSignature, requireSellerSignature } = req.body;
    
    if (!req.file) {
      req.flash('error', 'No file uploaded');
      return res.redirect(`/closing/${offerId}/documents`);
    }
    
    // Find the offer
    const offer = await Offer.findById(offerId)
      .populate('buyer')
      .populate('seller');
    
    if (!offer) {
      req.flash('error', 'Offer not found');
      return res.redirect('/dashboard');
    }
    
    // Check authorization (title company or authorized agent)
    const isTitleCompany = offer.titleCompanyDetails && 
                          offer.titleCompanyDetails.company && 
                          req.user._id.equals(offer.titleCompanyDetails.company);
    
    const isBuyer = req.user._id.equals(offer.buyer._id);
    const isSeller = req.user._id.equals(offer.seller._id);
    
    const isAuthorized = isTitleCompany || 
                         (isBuyer && category === 'inspection') || 
                         (isSeller && ['disclosure', 'contract'].includes(category));
    
    if (!isAuthorized) {
      req.flash('error', 'You are not authorized to upload this type of document');
      return res.redirect(`/closing/${offerId}/documents`);
    }
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'closing_documents',
      resource_type: 'auto'
    });
    
    // Create required signatures array
    const requiredSignatures = [];
    
    if (requireBuyerSignature === 'on') {
      requiredSignatures.push({
        user: offer.buyer._id,
        signed: false
      });
    }
    
    if (requireSellerSignature === 'on') {
      requiredSignatures.push({
        user: offer.seller._id,
        signed: false
      });
    }
    
    // Create the document
    const document = new ClosingDocument({
      offer: offerId,
      name,
      category,
      url: result.secure_url,
      uploadedBy: req.user._id,
      requiredSignatures
    });
    
    await document.save();
    
    // Update relevant closing step if applicable
    if (category === 'title' && isTitleCompany) {
      const titleReviewStep = offer.closingSteps.find(step => step.name.includes('Title Review'));
      if (titleReviewStep && titleReviewStep.status !== 'complete') {
        titleReviewStep.status = 'in_progress';
        titleReviewStep.notes = `Title document "${name}" uploaded`;
        await offer.save();
      }
    } else if (category === 'inspection' && isBuyer) {
      const inspectionStep = offer.closingSteps.find(step => step.name.includes('Inspection'));
      if (inspectionStep && inspectionStep.status !== 'complete') {
        inspectionStep.status = 'in_progress';
        inspectionStep.notes = `Inspection document "${name}" uploaded`;
        await offer.save();
      }
    }
    
    // Send notifications about required signatures
    if (requireBuyerSignature === 'on' && !isBuyer) {
      await notificationController.createNotification(
        offer.buyer._id,
        `Your signature is required on "${name}" for ${offer.listing.address}`,
        'Document Signature Required',
        `/closing/${offerId}/documents`,
        'INFO'
      );
    }
    
    if (requireSellerSignature === 'on' && !isSeller) {
      await notificationController.createNotification(
        offer.seller._id,
        `Your signature is required on "${name}" for ${offer.listing.address}`,
        'Document Signature Required',
        `/closing/${offerId}/documents`,
        'INFO'
      );
    }
    
    req.flash('success', 'Document uploaded successfully');
    return res.redirect(`/closing/${offerId}/documents`);
  } catch (error) {
    console.error('Error uploading document:', error);
    req.flash('error', 'Error uploading document');
    return res.redirect(`/closing/${req.params.offerId}/documents`);
  }
};

// Sign a document
exports.signDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { signatureData } = req.body; // Base64 encoded signature image
    
    const document = await ClosingDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    // Find if this user is in requiredSignatures
    const signatureIndex = document.requiredSignatures.findIndex(
      sig => sig.user.toString() === req.user._id.toString()
    );
    
    if (signatureIndex === -1) {
      return res.status(403).json({ success: false, message: 'You are not authorized to sign this document' });
    }
    
    // Upload signature image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(signatureData, {
      folder: 'signatures',
      format: 'png'
    });
    
    // Update document with signature info
    document.requiredSignatures[signatureIndex].signed = true;
    document.requiredSignatures[signatureIndex].signatureDate = new Date();
    document.requiredSignatures[signatureIndex].signatureUrl = uploadResult.secure_url;
    
    await document.save();
    
    // Check if all required signatures are completed
    const allSigned = document.requiredSignatures.every(sig => sig.signed);
    
    // Find the offer
    const offer = await Offer.findById(document.offer);
    
    // If this completes a closing step, update it
    if (allSigned && offer) {
      // Find relevant step based on document category
      let relevantStep;
      
      switch (document.category) {
        case 'contract':
          relevantStep = offer.closingSteps.find(step => 
            step.name.toLowerCase().includes('document') || 
            step.name.toLowerCase().includes('contract')
          );
          break;
        case 'disclosure':
          relevantStep = offer.closingSteps.find(step => 
            step.name.toLowerCase().includes('disclosure')
          );
          break;
        case 'mortgage':
          relevantStep = offer.closingSteps.find(step => 
            step.name.toLowerCase().includes('loan') || 
            step.name.toLowerCase().includes('financing')
          );
          break;
        case 'title':
          relevantStep = offer.closingSteps.find(step => 
            step.name.toLowerCase().includes('title')
          );
          break;
        default:
          break;
      }
      
      if (relevantStep) {
        relevantStep.status = 'complete';
        relevantStep.completedDate = new Date();
        relevantStep.notes = `${document.name} fully signed on ${new Date().toLocaleDateString()}`;
        await offer.save();
      }
      
      // Notify document uploader
      await notificationController.createNotification(
        document.uploadedBy,
        `All required signatures completed for "${document.name}"`,
        'Document Signed',
        `/closing/${offer._id}/documents`,
        'SUCCESS'
      );
    }
    
    return res.json({ 
      success: true, 
      message: 'Document signed successfully',
      allSignaturesComplete: allSigned
    });
  } catch (error) {
    console.error('Error signing document:', error);
    return res.status(500).json({ success: false, message: 'Error processing signature' });
  }
};