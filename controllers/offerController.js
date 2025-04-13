const mongoose = require("mongoose");
const path = require('path');
const fs = require('fs');
const Offer = require("../models/Offer");
const Listing = require("../models/Listing");
const Professional = require("../models/Professional");
const User = require("../models/User");
const { AppError, catchAsync } = require('../middleware/errorMiddleware');
const notificationController = require('../controllers/notificationController');
const { sendEmail } = require("../utils/emailService");
const { generatePdfFromTemplate } = require('../utils/pdfGenerator');

// In offerController.js
exports.getOfferById = async (req, res) => {
    try {
        // Make sure we're using a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            req.flash("error", "Invalid offer ID format");
            return res.redirect("/users/dashboard");
        }

        // Only select the fields needed for the offer view page
        const offer = await Offer.findById(req.params.id)
            // For backward compatibility
            .populate("buyer", "name email")
            .populate("seller", "name email")
            // New multi-party support
            .populate("buyers.user", "name email")
            .populate("sellers.user", "name email")
            .populate("listing", "address city state zip price image")
            .populate("offerHistory.counteredBy", "name email")
            .select('buyers sellers buyer seller listing offerPrice financingType loanType earnestMoney earnestDueDate contingencies appraisalDeadlineDays loanApprovalDeadlineDays inspectionDeadlineDays closingDate titleCompany closingCosts status offerHistory signatures riders')
            .lean(); // Return plain JavaScript objects instead of Mongoose documents
            
        if (!offer) {
            req.flash("error", "Offer not found");
            return res.redirect("/users/dashboard");
        }
        
        // Check if user is authorized to view this offer (either buyer or seller)
        const isUserBuyer = offer.buyers && offer.buyers.some(buyer => 
            buyer.user && buyer.user._id && buyer.user._id.toString() === req.user._id.toString()
        );
        const isUserSeller = offer.sellers && offer.sellers.some(seller => 
            seller.user && seller.user._id && seller.user._id.toString() === req.user._id.toString()
        );
        
        // For backward compatibility
        const isLegacyBuyer = offer.buyer && offer.buyer._id && offer.buyer._id.toString() === req.user._id.toString();
        const isLegacySeller = offer.seller && offer.seller._id && offer.seller._id.toString() === req.user._id.toString();
        
        if (!isUserBuyer && !isUserSeller && !isLegacyBuyer && !isLegacySeller) {
            req.flash("error", "You are not authorized to view this offer");
            return res.redirect("/users/dashboard");
        }
        
        // Get user's role in this offer
        let userRole = null;
        if (isUserBuyer || isLegacyBuyer) {
            if (isUserBuyer) {
                const buyerEntry = offer.buyers.find(buyer => 
                    buyer.user && buyer.user._id && buyer.user._id.toString() === req.user._id.toString()
                );
                userRole = buyerEntry ? buyerEntry.role : 'buyer';
            } else {
                userRole = 'buyer';
            }
        } else if (isUserSeller || isLegacySeller) {
            if (isUserSeller) {
                const sellerEntry = offer.sellers.find(seller => 
                    seller.user && seller.user._id && seller.user._id.toString() === req.user._id.toString()
                );
                userRole = sellerEntry ? sellerEntry.role : 'seller';
            } else {
                userRole = 'seller';
            }
        }
        
        res.render("offers/view", { 
            offer, 
            user: req.user,
            userRole: userRole,
            isUserBuyer: isUserBuyer || isLegacyBuyer,
            isUserSeller: isUserSeller || isLegacySeller,
            isPrimaryBuyer: isUserBuyer && offer.buyers.some(buyer => 
                buyer.user && buyer.user._id && buyer.user._id.toString() === req.user._id.toString() && buyer.role === 'primary'
            ),
            isPrimarySeller: isUserSeller && offer.sellers.some(seller => 
                seller.user && seller.user._id && seller.user._id.toString() === req.user._id.toString() && seller.role === 'primary'
            )
        });
    } catch (error) {
        console.error("Error viewing offer:", error);
        req.flash("error", "Error loading offer");
        res.redirect("/users/dashboard");
    }
};

// Render the Mutual Release of Earnest Money Deposit form
exports.showReleaseForm = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate("buyer", "name email")
            .populate("seller", "name email")
            .populate("listing", "address city state zip price county")
            .lean();

        if (!offer) {
            req.flash("error", "Offer not found.");
            return res.redirect("/offers/manage");
        }

        // Auth check (buyer or seller)
        if (!req.user._id.equals(offer.buyer._id) && !req.user._id.equals(offer.seller._id)) {
            req.flash("error", "Unauthorized access.");
            return res.redirect("/offers/manage");
        }

        res.render("offers/mutualRelease", { offer });
    } catch (error) {
        console.error("❌ Error rendering mutual release form:", error);
        req.flash("error", "Error loading release form.");
        res.redirect("/offers/manage");
    }
};

exports.submitRelease = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            req.flash("error", "Offer not found.");
            return res.redirect("/offers/manage");
        }

        if (!req.user._id.equals(offer.buyer) && !req.user._id.equals(offer.seller)) {
            req.flash("error", "Unauthorized.");
            return res.redirect("/offers/manage");
        }

        offer.release = {
            reason: req.body.reason || '',
            payouts: req.body.payouts || [], // Array of objects { recipientName, amount, deliveryMethod, address }
            note: req.body.note || ''
        };

        // Optionally mark the offer as released
        offer.status = "released";
        await offer.save();

        req.flash("success", "Mutual release submitted.");
        res.redirect(`/offers/${offer._id}`);
    } catch (error) {
        console.error("❌ Error submitting release:", error);
        req.flash("error", "Error submitting release.");
        res.redirect("/offers/manage");
    }
};

// Render the Amendment to Contract form
exports.showAmendForm = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate("buyer", "name email")
            .populate("seller", "name email")
            .populate("listing", "address city state zip price county")
            .lean();

        if (!offer) {
            req.flash("error", "Offer not found.");
            return res.redirect("/offers/manage");
        }

        if (!req.user._id.equals(offer.buyer._id) && !req.user._id.equals(offer.seller._id)) {
            req.flash("error", "Unauthorized access.");
            return res.redirect("/offers/manage");
        }

        res.render("offers/amend", { offer });
    } catch (error) {
        console.error("❌ Error rendering amendment form:", error);
        req.flash("error", "Error loading amendment form.");
        res.redirect("/offers/manage");
    }
};

exports.submitAmendment = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            req.flash("error", "Offer not found.");
            return res.redirect("/offers/manage");
        }

        // Ensure role
        if (!req.user._id.equals(offer.buyer) && !req.user._id.equals(offer.seller)) {
            req.flash("error", "Unauthorized.");
            return res.redirect("/offers/manage");
        }

        offer.amendment = {
            closingDate: req.body.closingDate,
            possessionDate: req.body.possessionDate,
            changedConditions: req.body.changedConditions || [],
            removedConditions: req.body.removedConditions || [],
            newPurchasePrice: req.body.newPurchasePrice,
            newEarnestMoney: req.body.newEarnestMoney,
            additionalTerms: req.body.additionalTerms
        };

        await offer.save();
        req.flash("success", "Amendment submitted successfully.");
        res.redirect(`/offers/${offer._id}`);
    } catch (error) {
        console.error("❌ Error submitting amendment:", error);
        req.flash("error", "Error submitting amendment.");
        res.redirect("/offers/manage");
    }
};


// Render the Walk-Through Notice form
exports.showWalkThroughForm = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate("buyer", "name email")
            .populate("seller", "name email")
            .populate("listing", "address city state zip price county")
            .lean();

        if (!offer) {
            req.flash("error", "Offer not found.");
            return res.redirect("/offers/manage");
        }

        if (!req.user._id.equals(offer.buyer._id) && !req.user._id.equals(offer.seller._id)) {
            req.flash("error", "Unauthorized access.");
            return res.redirect("/offers/manage");
        }

        res.render("offers/walkThrough", { offer });
    } catch (error) {
        console.error("❌ Error rendering walk-through form:", error);
        req.flash("error", "Error loading walk-through form.");
        res.redirect("/offers/manage");
    }
};

exports.previewAmendment = async (req, res) => {  };
exports.previewRelease = async (req, res) => {  };
exports.previewWalkThrough = async (req, res) => {  };


exports.submitWalkThrough = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            req.flash("error", "Offer not found.");
            return res.redirect("/offers/manage");
        }

        if (!req.user._id.equals(offer.buyer)) {
            req.flash("error", "Only buyers can submit a walk-through.");
            return res.redirect("/offers/manage");
        }

        offer.walkThrough = {
            date: req.body.date,
            buyerAction: req.body.buyerAction,
            issues: req.body.issues || '',
            sellerResponse: req.body.sellerResponse || '',
            buyerResponse: req.body.buyerFinalResponse || ''
        };

        await offer.save();
        req.flash("success", "Walk-through notice submitted.");
        res.redirect(`/offers/${offer._id}`);
    } catch (error) {
        console.error("❌ Error submitting walk-through:", error);
        req.flash("error", "Error submitting walk-through notice.");
        res.redirect("/offers/manage");
    }
};

// In offerController.js - showOfferForm function
exports.showOfferForm = async (req, res) => {
    try {
        const listing = await Listing.findById(req.query.listingId)
            .populate("seller", "name");

        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }

        // Get title companies that service this county
        const titleCompanies = await Professional.find({
            professionalType: "title",
            counties: listing.county,
            isVerified: true
        }).sort('companyName');

        res.render("offers/new", { 
            listing,
            titleCompanies,
            googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
        });
    } catch (error) {
        console.error("Error fetching listing for offer:", error);
        res.status(500).send("Error loading offer page.");
    }
};

// Counter Offer Functions for offerController.js

// Render counter offer form
exports.showCounterOfferForm = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate("buyer", "name email")
            .populate("seller", "name email")
            .populate("listing", "address city state zip price county propertyType");

        if (!offer) {
            req.flash("error", "Offer not found.");
            return res.redirect("/offers/manage");
        }

        // Check if user is either the buyer or seller
        const isBuyer = req.user._id.toString() === offer.buyer._id.toString();
        const isSeller = req.user._id.toString() === offer.seller._id.toString();
        
        if (!isBuyer && !isSeller) {
            req.flash("error", "Unauthorized to counter this offer.");
            return res.redirect("/offers/manage");
        }

        // Get title companies for dropdown
        const titleCompanies = await Professional.find({
            professionalType: "title",
            counties: offer.listing.county,
            isVerified: true
        }).sort('companyName');

        res.render("offers/counter", { 
            offer,
            titleCompanies,
            user: req.user,
            isBuyer: isBuyer,
            isSeller: isSeller
        });
    } catch (error) {
        console.error("❌ Error loading counteroffer form:", error);
        req.flash("error", "Error loading counteroffer form.");
        res.redirect("/offers/manage");
    }
};

// Process counter offer

exports.counterOffer = async (req, res) => { 
try {
    if (!req.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/users/login");
    }

    const offer = await Offer.findById(req.params.id)
        .populate("listing", "address")
        .populate("buyer", "name")
        .populate("seller", "name");
    
    if (!offer) {
        req.flash("error", "Offer not found.");
        return res.redirect("/offers/manage");
    }

    // Check if user is either buyer or seller
    const isBuyer = req.user._id.toString() === offer.buyer._id.toString();
    const isSeller = req.user._id.toString() === offer.seller._id.toString();

    if (!isBuyer && !isSeller) {
        req.flash("error", "Unauthorized to counter this offer.");
        return res.redirect("/offers/manage");
    }

    // Use offerPrice from the form instead of counterPrice
    const newPrice = req.body.offerPrice;
    
    if (!newPrice) {
        req.flash("error", "Offer price is required.");
        return res.redirect(`/offers/${req.params.id}/counter`);
    }

    // Store the original price before we change it
    const originalPrice = offer.offerPrice;
    
    // Add to offer history
    if (!offer.offerHistory) {
        offer.offerHistory = [];
    }
    
    offer.offerHistory.push({
        counteredBy: req.user._id,
        previousPrice: originalPrice,
        newPrice: parseFloat(newPrice),
        previousDeadlines: {
            appraisalDeadlineDays: offer.appraisalDeadlineDays,
            loanApprovalDeadlineDays: offer.loanApprovalDeadlineDays,
            inspectionDeadlineDays: offer.inspectionDeadlineDays,
        },
        newDeadlines: {
            appraisalDeadlineDays: req.body.appraisalDeadlineDays || offer.appraisalDeadlineDays,
            loanApprovalDeadlineDays: req.body.loanApprovalDeadlineDays || offer.loanApprovalDeadlineDays,
            inspectionDeadlineDays: req.body.inspectionDeadlineDays || offer.inspectionDeadlineDays,
        },
        timestamp: new Date()
    });

    // Update offer with new details
    offer.offerPrice = parseFloat(newPrice);
    offer.earnestMoney = req.body.earnestMoney ? parseFloat(req.body.earnestMoney) : offer.earnestMoney;
    offer.earnestDueDate = req.body.earnestDueDate ? new Date(req.body.earnestDueDate) : offer.earnestDueDate;
    offer.escrowAgent = req.body.escrowAgent || offer.escrowAgent;
    offer.titleCompany = req.body.titleCompany || offer.titleCompany;
    offer.closingDate = req.body.closingDate ? new Date(req.body.closingDate) : offer.closingDate;
    offer.closingCosts = req.body.closingCosts || offer.closingCosts;
    offer.status = "countered";
    
    // Update contingency deadlines if they exist
    if (offer.contingencies && offer.contingencies.includes("appraisal") && req.body.appraisalDeadlineDays) {
        offer.appraisalDeadlineDays = parseInt(req.body.appraisalDeadlineDays);
    }
    
    if (offer.contingencies && offer.contingencies.includes("financing") && req.body.loanApprovalDeadlineDays) {
        offer.loanApprovalDeadlineDays = parseInt(req.body.loanApprovalDeadlineDays);
    }
    
    if (offer.contingencies && offer.contingencies.includes("inspection") && req.body.inspectionDeadlineDays) {
        offer.inspectionDeadlineDays = parseInt(req.body.inspectionDeadlineDays);
    }
    
    // Update personal property fields
    offer.includedPersonalProperty = req.body.includedPersonalProperty || offer.includedPersonalProperty;
    offer.excludedPersonalProperty = req.body.excludedPersonalProperty || offer.excludedPersonalProperty;

        // Update rider settings
        // 1. Process Government Loan Rider if it's included
        if (req.body.riders && req.body.riders.governmentLoan && 
            (req.body.riders.governmentLoan.included === 'on' || req.body.riders.governmentLoan.included === true)) {
            
            if (!offer.riders) {
                offer.riders = {};
            }
            
            offer.riders.governmentLoan = {
                included: true,
                loanType: req.body.riders.governmentLoan.loanType || (offer.riders && offer.riders.governmentLoan ? offer.riders.governmentLoan.loanType : ''),
                loanPercentage: req.body.riders.governmentLoan.loanPercentage ? 
                                parseFloat(req.body.riders.governmentLoan.loanPercentage) : 
                                (offer.riders && offer.riders.governmentLoan ? offer.riders.governmentLoan.loanPercentage : null),
                loanContingencyDeadline: req.body.riders.governmentLoan.loanContingencyDeadline ? 
                                        parseInt(req.body.riders.governmentLoan.loanContingencyDeadline) : 
                                        (offer.riders && offer.riders.governmentLoan ? offer.riders.governmentLoan.loanContingencyDeadline : 25)
            };
        } else if (offer.riders && offer.riders.governmentLoan) {
            // Keep the existing rider if it was required (for FHA, VA, USDA loans)
            if (offer.financingType === 'bank' && ['fha', 'va', 'usda'].includes(offer.loanType)) {
                // Keep the rider but don't update it
            } else {
                // Otherwise remove it if it's not checked in the form
                offer.riders.governmentLoan.included = false;
            }
        }
        
        // 2. Process Sight Unseen Rider
        if (req.body.riders && req.body.riders.sightUnseen && 
            (req.body.riders.sightUnseen.included === 'on' || req.body.riders.sightUnseen.included === true)) {
            
            if (!offer.riders) {
                offer.riders = {};
            }
            
            offer.riders.sightUnseen = {
                included: true,
                reserveRightToView: req.body.riders.sightUnseen.reserveRightToView === 'true',
                propertyViewingPeriod: req.body.riders.sightUnseen.propertyViewingPeriod ? 
                                     parseInt(req.body.riders.sightUnseen.propertyViewingPeriod) : 5
            };
        } else if (offer.riders && offer.riders.sightUnseen) {
            offer.riders.sightUnseen.included = false;
        }
        
        // 3. Process Contingency for Sale Rider
        if (req.body.riders && req.body.riders.contingencyForSale && 
            (req.body.riders.contingencyForSale.included === 'on' || req.body.riders.contingencyForSale.included === true)) {
            
            if (!offer.riders) {
                offer.riders = {};
            }
            
            offer.riders.contingencyForSale = {
                included: true,
                existingPropertyAddress: req.body.riders.contingencyForSale.existingPropertyAddress,
                existingPropertyClosingDeadline: new Date(req.body.riders.contingencyForSale.existingPropertyClosingDeadline),
                kickOutHours: req.body.riders.contingencyForSale.kickOutHours ? 
                             parseInt(req.body.riders.contingencyForSale.kickOutHours) : 72
            };
        } else if (offer.riders && offer.riders.contingencyForSale) {
            offer.riders.contingencyForSale.included = false;
        }
        
        // 4. Process Contingency for Closing Rider
        if (req.body.riders && req.body.riders.contingencyForClosing && 
            (req.body.riders.contingencyForClosing.included === 'on' || req.body.riders.contingencyForClosing.included === true)) {
            
            if (!offer.riders) {
                offer.riders = {};
            }
            
            offer.riders.contingencyForClosing = {
                included: true,
                existingPropertyContractDate: new Date(req.body.riders.contingencyForClosing.existingPropertyContractDate),
                existingPropertyAddress: req.body.riders.contingencyForClosing.existingPropertyAddress,
                existingPropertyContainsContingency: req.body.riders.contingencyForClosing.existingPropertyContainsContingency === 'on' ||
                                                  req.body.riders.contingencyForClosing.existingPropertyContainsContingency === true
            };
        } else if (offer.riders && offer.riders.contingencyForClosing) {
            offer.riders.contingencyForClosing.included = false;
        }
                        
        // Always ensure required riders are included
        if (!offer.riders) {
            offer.riders = {};
        }
        
        // Wire Fraud Advisory - Always required
        offer.riders.wireFraudAdvisory = {
            included: true,
            acknowledged: true,
            acknowledgedDate: new Date()
        };
        
        // Home Inspection Advisory - Always required
        offer.riders.homeInspectionAdvisory = {
            included: true,
            acknowledged: true,
            acknowledgedDate: new Date()
        };
        
        // Platform Fee - Always required
        offer.riders.fee = {
            included: true,
            platformFee: req.body.riders && req.body.riders.fee && req.body.riders.fee.platformFee ? 
                        parseFloat(req.body.riders.fee.platformFee) : 
                        (offer.riders && offer.riders.fee ? offer.riders.fee.platformFee : 250),
            feeAcknowledged: true
        };
        
        // 🔹 Add notification for the buyer using notificationController
        try {
            // Format the price for the notification message
            const formattedPrice = parseFloat(newPrice).toLocaleString();
            
            // Determine recipient (opposite of current user)
            const recipient = isBuyer ? offer.seller : offer.buyer;
            const senderName = isBuyer ? offer.buyer.name : offer.seller.name;

            if (offer.listing && offer.listing.address) {
                await notificationController.createNotification(
                    recipient,
                    `${senderName} has countered the offer on ${offer.listing.address} at $${formattedPrice}.`,
                    "Countered",  // Using the valid enum value from your schema
                    `/offers/${offer._id}`,
                    "OFFER"
                );
            } else {
                await notificationController.createNotification(
                    recipient,
                    `${senderName} has countered the offer on ${offer.listing.address} at $${formattedPrice}.`,
                    "Countered",  // Using the valid enum value from your schema
                    `/offers/${offer._id}`,
                    "OFFER"
                );
            }
        } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
            // Continue with the process even if notification fails
        }
        
        // Save the updated offer
        await offer.save();
        
        req.flash("success", "Counteroffer sent successfully.");

        if (isBuyer) {
            res.redirect("/offers/buyer");
        } else {
            res.redirect("/offers/manage?viewAs=seller");
        }
    } catch (error) {
        console.error("❌ Error submitting counter offer:", error);
        req.flash("error", "Error submitting counter offer: " + error.message);
        res.redirect(`/offers/${req.params.id}/counter`);
    }
};

// Preview for counter offer - Enhanced to support counter offers
exports.previewOfferContract = async (req, res) => {
    try {
        
        const rawOffer = formatQueryToOffer(req.query);
        
        // Check if this is a counter offer preview
        const isCounterOffer = req.query.isCounterOffer === 'true';
        let originalOffer = null;
        
        // If this is a counter offer, try to get the original offer details
        if (isCounterOffer && req.query.originalOfferId) {
            try {
                originalOffer = await Offer.findById(req.query.originalOfferId);
            } catch (err) {
                console.error("Error fetching original offer:", err);
                // Continue even if original offer can't be found
            }
        }
        
        // Determine the return URL
        let returnUrl = '/offers/new';
        if (req.query.listingId) {
            returnUrl += '?listingId=' + req.query.listingId;
        } else if (isCounterOffer && req.query.originalOfferId) {
            returnUrl = '/offers/' + req.query.originalOfferId + '/counter';
        }
        
        // Flatten for preview like PDF does
        const offerData = {
        ...rawOffer,
        buyerName: rawOffer.buyer?.name || rawOffer.buyerFullName || '',
        sellerName: rawOffer.seller?.name || rawOffer.sellerName || '',
        listingAddress: rawOffer.listing?.address || rawOffer.propertyAddress?.split(',')[0] || '',
        listingCity: rawOffer.listing?.city || rawOffer.propertyAddress?.split(',')[1]?.trim() || '',
        listingState: rawOffer.listing?.state || rawOffer.propertyAddress?.split(',')[2]?.split(' ')[0] || '',
        listingZip: rawOffer.listing?.zip || rawOffer.propertyAddress?.split(',')[2]?.split(' ')[1] || '',
        listingCounty: rawOffer.listing?.county || rawOffer.propertyAddress?.split(',')[2]?.split(' ')[1] || '',
        earnestDueDate: rawOffer.earnestDueDate || '',
        closingDate: rawOffer.closingDate || '',
        loanAmount: rawOffer.loanAmount || 0,
        interestRate: rawOffer.interestRate || 0,
        maxConcession: rawOffer.maxConcession || 0,
        loanType: rawOffer.loanType || '',
        offerPrice: rawOffer.offerPrice || 0,
        contingencies: rawOffer.contingencies || [],
        titleCompany: rawOffer.titleCompany || '',
        titleCompanyAddress: rawOffer.titleCompanyAddress || '',
        earnestMoney: rawOffer.earnestMoney || '',
        includedPersonalProperty: rawOffer.includedPersonalProperty || '',
        excludedPersonalProperty: rawOffer.excludedPersonalProperty || '',
        riders: rawOffer.riders || {}
        };

        // Render the preview template with all necessary variables
        res.render('contracts/preview', {
            offer: offerData,
            showExplanations: true,
            returnUrl,
            isCounterOffer,
            originalOffer
        });
    } catch (error) {
        console.error("Error generating contract preview:", error);
        res.status(500).send("Error generating preview. Please try again.");
    }
};

exports.previewAmendment = async (req, res) => {
    const data = req.query;
    res.render('contracts/previewAmendment', { data, returnUrl: '/offers/:id/showAmend' });
  };
  
  exports.previewRelease = async (req, res) => {
    const data = req.query;
    res.render('contracts/previewRelease', { data, returnUrl: '/offers/:id/showRelease' });
  };
  
  exports.previewWalkThrough = async (req, res) => {
    const data = req.query;
    res.render('contracts/previewWalkThrough', { data, returnUrl: '/offers/:id' });
  };

// Generate PDF for an offer or counter offer
exports.generateOfferPDF = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate("buyer", "name email")
            .populate("seller", "name email")
            .populate("listing", "address city state zip county price image")
            .lean();
            
        if (!offer) {
            req.flash("error", "Offer not found.");
            return res.redirect("/offers/manage");
        }
        
        // Check if user is authorized to access this offer
        if (!req.user._id.equals(offer.buyer._id) && !req.user._id.equals(offer.seller._id)) {
            req.flash("error", "You are not authorized to access this offer.");
            return res.redirect("/offers/manage");
        }
        
        // Create a filename for the download
        const filename = `Purchase_Agreement_${offer._id}.pdf`;
        
        // IMPORTANT: Import the function directly and call it with the offer object
        
        const { generateOfferPdf } = require('../utils/pdfGenerator');
        
        // Generate PDF directly from the offer data - no HTML step needed
        const pdfBuffer = await generateOfferPdf(offer);
        
        // Set the appropriate headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send the PDF as a download
        return res.end(pdfBuffer);
    } catch (error) {
        console.error("Error generating PDF:", error);
        req.flash("error", "Error generating PDF.");
        res.redirect("/offers/manage");
    }
};

exports.generateAmendmentPDF = async (req, res) => {
    const formData = req.query;    
    const pdfBuffer = await generatePdfFromTemplate('amendmentPdf.ejs', formData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Amendment.pdf"');
    res.end(pdfBuffer);
  };
  
  exports.generateReleasePDF = async (req, res) => {
    const formData = req.query;    
    const pdfBuffer = await generatePdfFromTemplate('mutualReleasePdf.ejs', formData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Mutual_Release.pdf"');
    res.end(pdfBuffer);
  };

  exports.generateDiclosurePDF = async (req, res) => {
    const { listingId } = req.params;
    const listing = await Listing.findById(listingId)
            .populate('seller', 'name email')
            .lean();   

    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings/manage");
    }
    // Import the function directly and call it with the listing object
    const { generateDisclosurePdf } = require('../utils/pdfGenerator');
    const pdfBuffer = await generateDisclosurePdf('views/listings/addons/sellersDisclosures.ejs', listing);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="SellersDisclosures.pdf"');
    res.end(pdfBuffer);
  };
  
  exports.generateWalkThroughPDF = async (req, res) => {
    const formData = req.query;
    const pdfBuffer = await generatePdfFromTemplate('walkThroughPdf.ejs', formData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Walk_Through_Notice.pdf"');
    res.end(pdfBuffer);
};

// Update the existing submitOffer function in offerController.js
exports.submitOffer = catchAsync(async (req, res, next) => {
    const buyer = await User.findById(req.user._id);

    if (!buyer) {
        return next(new AppError("Authentication error. Please log in again.", 401));
    }
    
    // Basic offer details
    const {
        listingId,
        offerPrice,
        financingType,
        loanType,
        loanAmount,
        interestRate,
        earnestMoney,
        earnestDueDate,
        contingencies = [],
        propertyType,
        appraisalDeadlineDays,
        maxConcession,
        loanApprovalDeadlineDays,
        inspectionDeadlineDays,
        saleOfAnotherAddress,
        closingDate,
        titleCompany,
        titleCompanyClosing,
        titleCompanyAddress,
        closingCosts,
        offerExpiration,
        acknowledgment,
        agreeDocuments,
        includedPersonalProperty,
        excludedPersonalProperty,
        // Co-buyer information
        coBuyers = [],
        coBuyerOwnership = [],
        coBuyerRelationship = []
    } = req.body;

    // Allow cash offers without pre-approval
    let isPreApproved = false;
    
    // Check for pre-approval in new user model
    if (buyer.buyer && buyer.buyer.preApprovalStatus === "approved") {
        isPreApproved = true;
    } 
    
    else if (buyer.preApprovalStatus === "approved") {
        isPreApproved = true;
    }
    
    if (financingType !== "cash" && !isPreApproved) {
        return next(new AppError("You must be pre-approved to submit a financed offer.", 403));
    }

    // Validate required fields
    if (!listingId || !offerPrice || !closingCosts || !earnestDueDate || !offerExpiration) {
        return next(new AppError("All required fields must be filled.", 400));
    }

    // Validate that listing exists
    const listing = await Listing.findById(listingId);

    if (!listing) {
        return next(new AppError("Listing not found.", 404));
    }

    // Get sellers from the listing
    let sellers = [];
    
    // For backward compatibility
    if (listing.seller) {
        sellers.push({
            user: listing.seller,
            role: 'primary',
            ownership: 100
        });
    } 
    // Use sellers array if available
    else if (listing.sellers && listing.sellers.length > 0) {
        sellers = listing.sellers;
    }
    // If no sellers found, return error
    else {
        return next(new AppError("No sellers found for this listing.", 404));
    }

    // Convert checkboxes to Boolean values
    const formattedAcknowledgment = acknowledgment === "true";
    const formattedAgreeDocuments = agreeDocuments === "true";

    // Ensure date fields are properly formatted
    const formattedEarnestDueDate = new Date(earnestDueDate);
    const formattedOfferExpiration = new Date(offerExpiration);
    const formattedClosingDate = new Date(closingDate);

    // Ensure contingencies are an array
    const formattedContingencies = Array.isArray(contingencies) ? contingencies : [contingencies];

    // Process buyers array
    const buyers = [];
    
    // Add primary buyer (current user)
    buyers.push({
        user: req.user._id,
        role: 'primary',
        ownership: 100 - (coBuyers.length > 0 ? coBuyerOwnership.reduce((sum, val) => sum + (parseInt(val) || 0), 0) : 0),
        signatureStatus: 'pending'
    });
    
    // Add co-buyers if any
    if (Array.isArray(coBuyers) && coBuyers.length > 0) {
        for (let i = 0; i < coBuyers.length; i++) {
            if (coBuyers[i]) {
                buyers.push({
                    user: coBuyers[i],
                    role: 'co-buyer',
                    ownership: parseInt(coBuyerOwnership[i]) || 0,
                    relationship: coBuyerRelationship[i] || '',
                    signatureStatus: 'pending'
                });
            }
        }
    }

    // Build the basic offer object
    const offerData = {
        listing: listingId,
        // For backward compatibility
        buyer: req.user._id,
        seller: sellers[0].user,
        // New multi-party support
        buyers: buyers,
        sellers: sellers,
        offerPrice,
        financingType,
        propertyType,
        loanType: financingType === "bank" ? loanType : null, // Only store loanType if bank financing is selected
        loanAmount,
        interestRate,
        earnestMoney,
        maxConcession,
        includedPersonalProperty: includedPersonalProperty || '',
        excludedPersonalProperty: excludedPersonalProperty || '',
        earnestDueDate: formattedEarnestDueDate,
        contingencies: formattedContingencies,
        appraisalDeadlineDays: formattedContingencies.includes("appraisal") ? appraisalDeadlineDays : null,
        loanApprovalDeadlineDays: formattedContingencies.includes("financing") ? loanApprovalDeadlineDays : null,
        inspectionDeadlineDays: formattedContingencies.includes("inspection") ? inspectionDeadlineDays : null,
        saleOfAnotherAddress: formattedContingencies.includes("saleOfAnotherHome") ? saleOfAnotherAddress : null,
        closingDate: formattedClosingDate,
        titleCompany,
        titleCompanyClosing,
        titleCompanyAddress,
        closingCosts,
        offerExpiration: formattedOfferExpiration,
        acknowledgment: formattedAcknowledgment,
        agreeDocuments: formattedAgreeDocuments,
        status: "pending",
        finalized: false,
        notifications: [
            {
                message: `New offer received for ${listing.address} at $${offerPrice.toLocaleString()}.`,
                read: false
            }
        ]
    };
    
    // Process rider data
    offerData.riders = {};
    
    // Required riders
    offerData.riders.wireFraudAdvisory = {
        included: true,
        acknowledged: req.body.riders?.wireFraudAdvisory?.acknowledged === 'on' || req.body.riders?.wireFraudAdvisory?.acknowledged === true,
        acknowledgedDate: new Date()
    };
    
    offerData.riders.homeInspectionAdvisory = {
        included: true,
        acknowledged: req.body.riders?.homeInspectionAdvisory?.acknowledged === 'on' || req.body.riders?.homeInspectionAdvisory?.acknowledged === true,
        acknowledgedDate: new Date()
    };
    
    offerData.riders.fee = {
        included: true,
        platformFee: req.body.riders?.fee?.platformFee ? parseFloat(req.body.riders?.fee?.platformFee) : 250,
        feeAcknowledged: req.body.riders?.fee?.feeAcknowledged === 'on' || req.body.riders?.fee?.feeAcknowledged === true
    };
    
    // Government Loan Rider
    if (req.body.riders?.governmentLoan?.included === 'on' || req.body.riders?.governmentLoan?.included === true) {
        offerData.riders.governmentLoan = {
            included: true,
            loanType: req.body.riders.governmentLoan.loanType,
            loanPercentage: req.body.riders.governmentLoan.loanPercentage ? 
                            parseFloat(req.body.riders.governmentLoan.loanPercentage) : null,
            loanContingencyDeadline: req.body.riders.governmentLoan.loanContingencyDeadline ? 
                                    parseInt(req.body.riders.governmentLoan.loanContingencyDeadline) : 25,
            appraisalValue: req.body.riders.governmentLoan.appraisalValue ? 
                           parseFloat(req.body.riders.governmentLoan.appraisalValue) : offerPrice
        };
    }
    
    // Sight Unseen Rider
    if (req.body.riders?.sightUnseen?.included === 'on' || req.body.riders?.sightUnseen?.included === true) {
        offerData.riders.sightUnseen = {
            included: true,
            reserveRightToView: req.body.riders.sightUnseen.reserveRightToView === 'true',
            propertyViewingPeriod: req.body.riders.sightUnseen.propertyViewingPeriod ? 
                                 parseInt(req.body.riders.sightUnseen.propertyViewingPeriod) : 5
        };
    }
    
    // Contingency for Sale of Buyer's Existing Property
    if (req.body.riders?.contingencyForSale?.included === 'on' || req.body.riders?.contingencyForSale?.included === true) {
        offerData.riders.contingencyForSale = {
            included: true,
            existingPropertyAddress: req.body.riders.contingencyForSale.existingPropertyAddress,
            existingPropertyClosingDeadline: new Date(req.body.riders.contingencyForSale.existingPropertyClosingDeadline),
            kickOutHours: req.body.riders.contingencyForSale.kickOutHours ? 
                         parseInt(req.body.riders.contingencyForSale.kickOutHours) : 72
        };
    }
    
    // Contingency for Closing of Buyer's Existing Property
    if (req.body.riders?.contingencyForClosing?.included === 'on' || req.body.riders?.contingencyForClosing?.included === true) {
        offerData.riders.contingencyForClosing = {
            included: true,
            existingPropertyContractDate: new Date(req.body.riders.contingencyForClosing.existingPropertyContractDate),
            existingPropertyAddress: req.body.riders.contingencyForClosing.existingPropertyAddress,
            existingPropertyContainsContingency: req.body.riders.contingencyForClosing.existingPropertyContainsContingency === 'on' ||
                                              req.body.riders.contingencyForClosing.existingPropertyContainsContingency === true
        };
    }
        
    // Initialize signature tracking for all included riders
    offerData.signatures = {
        mainContract: {
            buyerSigned: false,
            sellerSigned: false,
            buyersSigned: false,
            sellersSigned: false,
            buyerSignatures: [],
            sellerSignatures: []
        },
        riders: {}
    };
    
    // Add signature tracking for each included rider
    for (const riderKey in offerData.riders) {
        if (offerData.riders[riderKey].included) {
            offerData.signatures.riders[riderKey] = {
                buyerSigned: false,
                sellerSigned: false,
                buyersSigned: false,
                sellersSigned: false,
                buyerSignatures: [],
                sellerSignatures: []
            };
        }
    }

    // Create and save the offer
    const offer = new Offer(offerData);
    await offer.save();

    // Send notification to all sellers
    for (const seller of sellers) {
        await notificationController.createNotification(
            seller.user,  // seller's user ID
            `New offer received for ${listing.address} at $${offerPrice.toLocaleString()}.`,
            "Offer",
            `/offers/${offer._id}`,  // Link to view the offer
            "OFFER"  // Notification type
        );
    }

    // Send notification to co-buyers
    for (const buyer of buyers) {
        if (buyer.role === 'co-buyer') {
            await notificationController.createNotification(
                buyer.user,  // co-buyer's user ID
                `You've been added as a co-buyer on an offer for ${listing.address} at $${offerPrice.toLocaleString()}.`,
                "Offer",
                `/offers/${offer._id}`,  // Link to view the offer
                "OFFER"  // Notification type
            );
        }
    }

    req.flash("success", "Offer submitted successfully!");
    res.redirect(`/listings/${listingId}`);
});

// Accept Offer
exports.acceptOffer = async (req, res) => {
    try {
        // Make sure we're using a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            req.flash("error", "Invalid offer ID format");
            return res.redirect("/offers/seller");
        }
        
        const offer = await Offer.findById(req.params.id)
            .populate("buyer", "name email")
            .populate("seller", "name email")
            .populate("listing", "address city state zip price image");
            
        if (!offer || offer.seller._id.toString() !== req.user._id.toString()) {
            req.flash("error", "Unauthorized to accept this offer.");
            return res.redirect("/offers/seller");
        }

        offer.status = "accepted";
        offer.finalized = true;
        await offer.save();

        try {
            // Import the functions directly
            const { generateOfferPdf } = require('../utils/pdfGenerator');
            
            // Create a filename for this specific offer
            const filename = `Purchase_Agreement_${offer._id}.pdf`;
            
            // First generate the PDF buffer
            const pdfBuffer = await generateOfferPdf(offer);
            
            // Create directory if it doesn't exist
            const dir = path.join(__dirname, '../public/forms');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Save the PDF to file
            const filePath = path.join(dir, filename);
            fs.writeFileSync(filePath, pdfBuffer);
            
            // Distribute PDF to lender and title company if needed
            await distributeOfferPDF(offer, filePath);
        } catch (pdfError) {
            console.error("Error generating PDF during offer acceptance:", pdfError);
            // Continue with acceptance even if PDF generation fails
        }

        // Add notification for buyer
        await notificationController.createNotification(
            offer.buyer._id,
            `Your offer for ${offer.listing.address} has been accepted!`,
            'Accepted',
            `/offers/${offer._id}`,
            'SUCCESS'
        );

        req.flash("success", "Offer accepted successfully!");
        res.redirect("/offers/seller");
    } catch (error) {
        console.error("Error accepting offer:", error);
        req.flash("error", "Error accepting offer: " + error.message);
        res.redirect("/offers/seller");
    }
};

// Reject Offer
exports.rejectOffer = async (req, res) => {
    try {
        // Make sure we're using a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            req.flash("error", "Invalid offer ID format");
            return res.redirect("/offers/seller");
        }
        
        const offer = await Offer.findById(req.params.id);
        if (!offer || offer.seller.toString() !== req.user._id.toString()) {
            req.flash("error", "Unauthorized to reject this offer.");
            return res.redirect("/offers/seller");
        }

        // Update only the status field, don't recreate the entire document
        await Offer.findByIdAndUpdate(offer._id, { 
            status: "rejected" 
        }, { 
            runValidators: false // Skip validation since we're only updating status
        });

        req.flash("success", "Offer rejected.");
        res.redirect("/offers/seller");
    } catch (error) {
        console.error("Error rejecting offer:", error);
        req.flash("error", "Error rejecting offer.");
        res.redirect("/offers/seller");
    }
};

// Helper function for formatting closing costs
function formatClosingCosts(closingCosts) {
    const options = {
        'buyer': 'Buyer pays all closing costs',
        'seller': 'Seller pays all closing costs',
        'split': 'Split equally between buyer and seller',
        'each_pays_own': 'Each party pays their own closing costs'
    };
    return options[closingCosts] || 'Not specified';
}

exports.getOfferDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the offer with all related data
        const offer = await Offer.findById(id)
            .populate('buyer', 'name email')
            .populate('seller', 'name email')
            .populate({
                path: 'listing',
                select: 'address city state zip county price'
            });
            
        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }
        
        // Check authorization - either the buyer or seller can view
        if (!req.user._id.equals(offer.buyer._id) && !req.user._id.equals(offer.seller._id)) {
            return res.status(403).json({ error: "Unauthorized to view this offer" });
        }
        
        // Format data for display
        const offerData = {
            buyerName: offer.buyer.name,
            buyerEmail: offer.buyer.email,
            sellerName: offer.seller.name,
            propertyAddress: `${offer.listing.address}, ${offer.listing.city}, ${offer.listing.state} ${offer.listing.zip}`,
            propertyCounty: offer.listing.county,
            propertyType: getPropertyTypeLabel(offer.listing.propertyType),
            offerPrice: `$${offer.offerPrice.toLocaleString()}`,
            financingMethod: capitalizeFirstLetter(offer.financingType) + ' Financing',
            loanType: offer.loanType || 'N/A',
            loanAmount: offer.loanAmount ? `$${offer.loanAmount.toLocaleString()}` : 'N/A',
            interestRate: offer.interestRate ? `${offer.interestRate}%` : 'N/A',
            earnestMoney: `$${offer.earnestMoney.toLocaleString()}`,
            earnestDueDate: formatDate(offer.earnestDueDate),
            escrowAgent: offer.escrowAgent || 'Not Specified',
            contingencies: formatContingencies(offer),
            closingDate: formatDate(offer.closingDate),
            titleCompany: offer.titleCompany || 'Not Specified',
            closingCosts: formatClosingCosts(offer.closingCosts),
            pre1978Property: offer.preseventyEightProperty === 'yes' ? 'Before 1978' : 'After 1978',
            includedPersonalProperty: offer.includedPersonalProperty || 'None',
            excludedPersonalProperty: offer.excludedPersonalProperty || 'None',
            legalAcknowledgment: offer.acknowledgment ? 'Legally Binding Contract Acknowledged' : 'Not Acknowledged',
            documentAgreement: offer.agreeDocuments ? 'Agreement to Provide Necessary Documents' : 'No Agreement to Provide Documents',
            offerDate: formatDate(offer.createdAt),
            offerStatus: capitalizeFirstLetter(offer.status)
        };
        
        // Generate contract HTML using the contract preview template
        const contractHtml = await generateContractHtml(offerData);
        
        // Return the contract HTML
        res.json({ contractHtml });
        
    } catch (error) {
        console.error("❌ Error fetching offer details:", error);
        res.status(500).json({ error: "Error fetching offer details" });
    }
};

// Helper functions for formatting data
function formatDate(dateString) {
    if (!dateString) return 'Not Specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function capitalizeFirstLetter(string) {
    if (!string) return 'Not Specified';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Add this with your other helper functions at the bottom of offerController.js
function getTitleCompanyName(companyId) {
    const companies = {
        "company1": "First Title Services",
        "company2": "Reliable Title",
        "company3": "State Title Company"
    };
    return companies[companyId] || companyId;
}

function getPropertyTypeLabel(type) {
    const types = {
        'single_family': 'Single-Family Home',
        'condominium': 'Condominium',
        'townhouse': 'Townhouse',
        'duplex': 'Duplex'
    };
    return types[type] || 'Not Specified';
}

function formatClosingCosts(closingCosts) {
    const options = {
        'buyer': 'Buyer pays all closing costs',
        'seller': 'Seller pays all closing costs',
        'split': 'Split equally between buyer and seller',
        'each_pays_own': 'Each party pays their own closing costs'
    };
    return options[closingCosts] || 'Not Specified';
}

function formatContingencies(offer) {
    if (!offer.contingencies || offer.contingencies.length === 0) {
        return 'None Applicable';
    }
    
    const contingencyLabels = {
        'inspection': `Inspection Contingency (${offer.inspectionDeadlineDays} days)`,
        'appraisal': `Appraisal Contingency (${offer.appraisalDeadlineDays} days)`,
        'financing': `Financing Contingency (${offer.loanApprovalDeadlineDays} days)`,
        'saleOfAnotherHome': `Sale of Another Property Contingency (${offer.saleOfAnotherAddress})`
    };
    
    return offer.contingencies.map(c => contingencyLabels[c] || c).join(', ');
}

// Generate contract HTML from a template
// utils/contractGenerator.js

/**
 * Generate full contract HTML for an offer
 * @param {Object} offerData - Formatted offer data
 * @param {Boolean} forPdf - Whether generating for PDF (includes signatures, etc)
 * @returns {String} Complete HTML for the contract
 */
const generateContractHtml = async (offerData, forPdf = false) => {
    // Generate main contract HTML
    let html = `
        <div class="contract-container">
            <div class="contract-header">
                <h1>MISSOURI RESIDENTIAL REAL ESTATE PURCHASE AGREEMENT</h1>
                ${!forPdf ? '<div class="preview-banner">PREVIEW ONLY - NOT A BINDING CONTRACT</div>' : ''}
            </div>
            
            <!-- Property and Parties Section -->
            <div class="contract-section">
                <h2>1. PROPERTY AND PARTIES</h2>
                <p>This Agreement is made on ${new Date().toLocaleDateString()} between:</p>
                <p><strong>Buyer:</strong> ${offerData.buyerName}</p>
                <p><strong>Seller:</strong> ${offerData.sellerName}</p>
                <p><strong>Property Address:</strong> ${offerData.propertyAddress}</p>
            </div>
            
            <!-- Purchase Price Section -->
            <div class="contract-section">
                <h2>2. PURCHASE PRICE AND FINANCING</h2>
                <p>The total purchase price is ${offerData.offerPrice}</p>
                <p>Financing: ${offerData.financingMethod}</p>
                ${offerData.financingMethod.includes('Bank') ? `
                    <div class="financing-details">
                        <p>Loan Type: ${offerData.loanType}</p>
                        <p>Loan Amount: ${offerData.loanAmount}</p>
                    </div>
                ` : ''}
            </div>
            
            <!-- Additional contract sections -->
            ${generateEarnestMoneySection(offerData)}
            ${generateContingenciesSection(offerData)}
            ${generateClosingSection(offerData)}
            
            <!-- Include riders based on offer data -->
            ${offerData.riders.wireFraudAdvisory ? generateWireFraudAdvisoryHtml(offerData) : ''}
            ${offerData.riders.homeInspectionAdvisory ? generateHomeInspectionAdvisoryHtml(offerData) : ''}
            ${offerData.riders.governmentLoan ? generateGovernmentLoanRiderHtml(offerData) : ''}
            ${offerData.riders.sightUnseen ? generateSightUnseenRiderHtml(offerData) : ''}
            ${offerData.riders.contingencyForSale ? generateContingencyForSaleRiderHtml(offerData) : ''}
            
            <!-- Signature Section -->
            ${generateSignatureSection(offerData, forPdf)}
        </div>
    `;
    
    return html;
};

// Helper functions for each section
const generateEarnestMoneySection = (offerData) => { /* ... */ };
const generateContingenciesSection = (offerData) => { /* ... */ };
const generateClosingSection = (offerData) => { /* ... */ };
const generateSignatureSection = (offerData, forPdf) => { /* ... */ };

// Rider template functions
const generateGovernmentLoanRiderHtml = (offerData) => {
    return `
        <div class="rider-section government-loan-rider">
            <h2>GOVERNMENT LOAN RIDER</h2>
            <p>This Government Loan Rider is incorporated into and made part of the Purchase Agreement.</p>
            <p>Loan Type: ${offerData.riders.governmentLoan.loanType}</p>
            <p>Loan Percentage: ${offerData.riders.governmentLoan.loanPercentage}%</p>
            <!-- Additional government loan content -->
        </div>
    `;
};

function getStatusBadgeClass(status) {
    const statusClasses = {
        'Pending': 'bg-warning text-dark',
        'Accepted': 'bg-success',
        'Rejected': 'bg-danger',
        'Countered': 'bg-info'
    };
    return statusClasses[status] || 'bg-secondary';
}

/**
 * Distribute the offer PDF to title company and lender
 * @param {Object} offer - The offer object with populated fields
 * @param {String} pdfPath - Path to the generated PDF file
 * @returns {Promise<boolean>} - Success status
 */
async function distributeOfferPDF(offer, pdfPath) {
    try {
        console.log("Starting distribution of offer PDF to title company and lender");
        
        // Ensure offer is fully populated
        if (!offer.listing || !offer.buyer || !offer.seller) {
            console.error("Offer is missing required populated fields");
            return false;
        }
        
        // Format property address for email
        const propertyAddress = offer.listing.address + 
            (offer.listing.city ? `, ${offer.listing.city}` : '') + 
            (offer.listing.state ? `, ${offer.listing.state}` : '') + 
            (offer.listing.zip ? ` ${offer.listing.zip}` : '');
        
        // Create detailed email content with party information
        const emailContent = `
        A new offer has been accepted for ${propertyAddress}.

        TRANSACTION DETAILS:
        -------------------
        Property: ${propertyAddress}
        Purchase Price: $${offer.offerPrice.toLocaleString()}
        Closing Date: ${new Date(offer.closingDate).toLocaleDateString()}

        BUYER INFORMATION:
        -----------------
        Name: ${offer.buyer.name}
        Email: ${offer.buyer.email}
        ${offer.buyer.phone ? `Phone: ${offer.buyer.phone}` : ''}

        SELLER INFORMATION:
        ------------------
        Name: ${offer.seller.name}
        Email: ${offer.seller.email}
        ${offer.seller.phone ? `Phone: ${offer.seller.phone}` : ''}

        FINANCING DETAILS:
        -----------------
        Type: ${offer.financingType.charAt(0).toUpperCase() + offer.financingType.slice(1)}
        ${offer.financingType === 'bank' ? `Loan Type: ${offer.loanType || 'Not specified'}` : ''}
        ${offer.financingType === 'bank' ? `Loan Amount: $${offer.loanAmount ? offer.loanAmount.toLocaleString() : 'Not specified'}` : ''}

        EARNEST MONEY:
        -------------
        Amount: $${offer.earnestMoney.toLocaleString()}
        Due Date: ${new Date(offer.earnestDueDate).toLocaleDateString()}

        CONTINGENCIES:
        -------------
        ${offer.contingencies && offer.contingencies.length > 0 ? 
        offer.contingencies.map(c => {
            if (c === 'inspection') return `Inspection (${offer.inspectionDeadlineDays} days)`;
            if (c === 'appraisal') return `Appraisal (${offer.appraisalDeadlineDays} days)`;
            if (c === 'financing') return `Financing (${offer.loanApprovalDeadlineDays} days)`;
            return c;
        }).join(', ') 
        : 'None'}

        Please find the purchase agreement attached. This document contains all the terms and conditions of the accepted offer.

        If you have any questions or need additional information, please contact the appropriate party directly.

        Thank you,
        Real Estate Platform
        `;  

        // Get title company email and details
        let titleCompanyEmail = null;
        let titleCompanyName = null;
        
        // First check if title company details are in the offer
        if (offer.titleCompanyDetails && offer.titleCompanyDetails.email) {
            titleCompanyEmail = offer.titleCompanyDetails.email;
            titleCompanyName = offer.titleCompanyDetails.company ? 
                (typeof offer.titleCompanyDetails.company === 'object' ? 
                    offer.titleCompanyDetails.company.companyName : 
                    offer.titleCompanyDetails.company) : 
                offer.titleCompany;
        } else {
            // Look up title company email if not in offer
            const titleCompany = await Professional.findOne({
                $or: [
                    { companyName: offer.titleCompany },
                    { name: offer.titleCompany }
                ],
                professionalType: "title"
            });
            
            if (titleCompany) {
                titleCompanyEmail = titleCompany.email;
                titleCompanyName = titleCompany.companyName || titleCompany.name;
            }
        }
        
        // Send email to title company
        if (titleCompanyEmail) {
            console.log(`Sending email to title company: ${titleCompanyEmail}`);
            
            try {
                await sendEmail(
                    titleCompanyEmail,
                    `New Accepted Offer - ${propertyAddress}`,
                    emailContent,
                    pdfPath
                );
                console.log(`Email sent successfully to title company: ${titleCompanyName}`);
            } catch (emailError) {
                console.error(`Error sending email to title company: ${emailError.message}`);
            }
        } else {
            console.warn(`No email found for title company: ${offer.titleCompany}`);
        }
        
            // If bank financing, send to lender if available
            if (offer.financingType === 'bank') {
                // Get lender email if available
                let lenderEmail = null;
                let lenderName = null;
                
                // First check if lender info is directly in the offer (new field)
                if (offer.lenderInfo && offer.lenderInfo.email) {
                    lenderEmail = offer.lenderInfo.email;
                    lenderName = offer.lenderInfo.name;
                    console.log(`Using lender info from offer: ${lenderName} (${lenderEmail})`);
                } else {
                    // Look up lender email from pre-approval
                    const buyer = await User.findById(offer.buyer._id);
                    
                    // Check both the old and new user model structures for pre-approval lender
                    if (buyer) {
                        let lenderId = null;
                        
                        // Check new structure first (buyer.buyer.preApprovalLender)
                        if (buyer.buyer && buyer.buyer.preApprovalLender) {
                            lenderId = buyer.buyer.preApprovalLender;
                        } 
                        // Fall back to old structure (buyer.preApprovalLender)
                        else if (buyer.preApprovalLender) {
                            lenderId = buyer.preApprovalLender;
                        }
                        
                        if (lenderId) {
                            const lender = await Professional.findById(lenderId);
                            if (lender) {
                                lenderEmail = lender.email;
                                lenderName = lender.companyName || lender.name;
                            }
                        }
                    }
                    
                    // If no lender found from pre-approval, try to find by lender name in the offer
                    if (!lenderEmail && offer.lenderName) {
                        const lender = await Professional.findOne({
                            $or: [
                                { companyName: offer.lenderName },
                                { name: offer.lenderName }
                            ],
                            professionalType: "lender"
                        });
                        
                        if (lender) {
                            lenderEmail = lender.email;
                            lenderName = lender.companyName || lender.name;
                        }
                    }
                }
            
            if (lenderEmail) {
                console.log(`Sending email to lender: ${lenderEmail}`);
                
                try {
                    await sendEmail(
                        lenderEmail,
                        `New Accepted Offer - ${propertyAddress}`,
                        emailContent,
                        pdfPath
                    );
                    console.log(`Email sent successfully to lender: ${lenderName}`);
                } catch (emailError) {
                    console.error(`Error sending email to lender: ${emailError.message}`);
                }
            } else {
                console.warn("No lender email found for bank financing offer");
            }
        }
        
        return true;
    } catch (error) {
        console.error("Error distributing offer PDF:", error);
        return false;
    }
}

// Updated formatQueryToOffer function for offerController.js
function formatQueryToOffer(query) {
    // Fix the date handling for offerExpiration
    let formattedOfferExpiration = null;
    if (query.offerExpiration) {
        // Get just the date part if it contains a T
        const dateOnly = query.offerExpiration.split('T')[0]; 
        // Set to midnight local time
        formattedOfferExpiration = new Date(dateOnly + 'T00:00:00');
    }
    // Transform query parameters to match the structure of an Offer object
    return {
        buyerFullName: query.buyerFullName || '',
        buyerEmail: query.buyerEmail || '',
        sellerName: query.sellerName || '',
        propertyAddress: query.propertyAddress || '',
        propertyCounty: query.propertyCounty || '',
        propertyType: query.propertyType || '',
        offerPrice: parseInt(query.offerPrice) || 0,
        offerExpiration: formattedOfferExpiration,
        financingType: query.financingType || 'cash',
        loanType: query.loanType || '',
        loanAmount: parseInt(query.loanAmount) || 0,
        interestRate: parseFloat(query.interestRate) || 0,
        earnestMoney: parseInt(query.earnestMoney) || 0,
        earnestDueDate: query.earnestDueDate || '',
        escrowAgent: query.escrowAgent || '',
        contingencies: Array.isArray(query.contingencies) ? query.contingencies : 
                      (query.contingencies ? [query.contingencies] : []),
        appraisalDeadlineDays: parseInt(query.appraisalDeadlineDays) || 21,
        loanApprovalDeadlineDays: parseInt(query.loanApprovalDeadlineDays) || 30,
        inspectionDeadlineDays: parseInt(query.inspectionDeadlineDays) || 10,
        saleOfAnotherAddress: query.saleOfAnotherAddress || '',
        closingDate: query.closingDate || '',
        titleCompany: query.titleCompany || '',
        closingCosts: query.closingCosts || 'each_pays_own',
        includedPersonalProperty: query.includedPersonalProperty || '',
        excludedPersonalProperty: query.excludedPersonalProperty || '',
        acknowledgment: query.acknowledgment === 'true',
        agreeDocuments: query.agreeDocuments === 'true',
        
        // Reference to listing but structured for preview
        listing: {
            _id: query.listingId || '',
            address: query.propertyAddress?.split(',')[0]?.trim() || '',
            city: query.propertyAddress?.split(',')[1]?.trim() || '',
            state: query.propertyAddress?.split(',')[2]?.trim()?.split(' ')[0] || '',
            zip: query.propertyAddress?.split(',')[2]?.trim()?.split(' ')[1] || '',
            county: query.propertyCounty || '',
            propertyType: query.propertyType || '',
            price: parseInt(query.listingPrice) || parseInt(query.offerPrice) || 0
        },

        // Handle riders more effectively
        riders: {
            // Wire Fraud Advisory - Required
            wireFraudAdvisory: {
                included: true, // This is required
                acknowledged: query['riders.wireFraudAdvisory.acknowledged'] === 'on' || 
                              query['riders.wireFraudAdvisory.acknowledged'] === 'true',
                acknowledgedDate: new Date()
            },
            
            // Home Inspection Advisory - Required
            homeInspectionAdvisory: {
                included: true, // This is required
                acknowledged: query['riders.homeInspectionAdvisory.acknowledged'] === 'on' || 
                              query['riders.homeInspectionAdvisory.acknowledged'] === 'true',
                acknowledgedDate: new Date()
            },
            
            // Platform Fee - Required
            fee: {
                included: true, // This is required
                platformFee: parseFloat(query['riders.fee.platformFee']) || 250,
                feeAcknowledged: query['riders.fee.feeAcknowledged'] === 'on' || 
                                 query['riders.fee.feeAcknowledged'] === 'true'
            },
            
            // Government Loan Rider - Optional
            governmentLoan: {
                included: query['riders.governmentLoan.included'] === 'on' || 
                          query['riders.governmentLoan.included'] === 'true',
                loanType: query['riders.governmentLoan.loanType'] || '',
                loanPercentage: parseFloat(query['riders.governmentLoan.loanPercentage']) || 0,
                loanContingencyDeadline: parseInt(query['riders.governmentLoan.loanContingencyDeadline']) || 25,
                appraisalValue: parseFloat(query['riders.governmentLoan.appraisalValue']) || 0
            },
            
            // Sight Unseen Rider - Optional
            sightUnseen: {
                included: query['riders.sightUnseen.included'] === 'on' || 
                          query['riders.sightUnseen.included'] === 'true',
                reserveRightToView: query['riders.sightUnseen.reserveRightToView'] === 'true',
                propertyViewingPeriod: parseInt(query['riders.sightUnseen.propertyViewingPeriod']) || 5
            },
            
            // Contingency for Sale of Buyer's Existing Property - Optional
            contingencyForSale: {
                included: query['riders.contingencyForSale.included'] === 'on' || 
                          query['riders.contingencyForSale.included'] === 'true',
                existingPropertyAddress: query['riders.contingencyForSale.existingPropertyAddress'] || '',
                existingPropertyClosingDeadline: query['riders.contingencyForSale.existingPropertyClosingDeadline'] || '',
                kickOutHours: parseInt(query['riders.contingencyForSale.kickOutHours']) || 72
            },
            
            // Contingency for Closing of Buyer's Existing Property - Optional
            contingencyForClosing: {
                included: query['riders.contingencyForClosing.included'] === 'on' || 
                          query['riders.contingencyForClosing.included'] === 'true',
                existingPropertyContractDate: query['riders.contingencyForClosing.existingPropertyContractDate'] || '',
                existingPropertyAddress: query['riders.contingencyForClosing.existingPropertyAddress'] || '',
                existingPropertyContainsContingency: query['riders.contingencyForClosing.existingPropertyContainsContingency'] === 'on' || 
                                                   query['riders.contingencyForClosing.existingPropertyContainsContingency'] === 'true'
            },            
        }
    };
}

exports.withdrawOffer = async (req, res) => {
    try {
        // Make sure we're using a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            req.flash("error", "Invalid offer ID format");
            return res.redirect("/offers/buyer");
        }
        
        const offer = await Offer.findById(req.params.id)
            .populate("buyer", "name email")
            .populate("seller", "name email")
            .populate("listing", "address city state zip price image");
            
        if (!offer) {
            req.flash("error", "Offer not found");
            return res.redirect("/offers/buyer");
        }
        
        // Ensure the current user is the buyer who submitted the offer
        if (!req.user._id.equals(offer.buyer._id)) {
            req.flash("error", "You are not authorized to withdraw this offer");
            return res.redirect("/offers/buyer");
        }
        
        // Only allow withdrawal if offer is in pending or countered status
        if (offer.status !== 'pending' && offer.status !== 'countered') {
            req.flash("error", `Cannot withdraw offer in ${offer.status} status`);
            return res.redirect("/offers/buyer");
        }
        
        // Update offer status to withdrawn
        offer.status = "withdrawn";
        
        // Add a withdrawal record to the offer history
        offer.offerHistory.push({
            counteredBy: req.user._id,
            previousPrice: offer.offerPrice,
            newPrice: 0, // Zero indicates a withdrawal
            previousDeadlines: {
                appraisalDeadlineDays: offer.appraisalDeadlineDays,
                loanApprovalDeadlineDays: offer.loanApprovalDeadlineDays,
                inspectionDeadlineDays: offer.inspectionDeadlineDays,
            },
            newDeadlines: {
                appraisalDeadlineDays: 0,
                loanApprovalDeadlineDays: 0,
                inspectionDeadlineDays: 0,
            },
            timestamp: new Date()
        });
        
        // Create notification for the seller
        await notificationController.createNotification(
            offer.seller._id,
            `The offer on ${offer.listing.address} has been withdrawn by the buyer.`,
            "Withdrawn",
            `/offers/${offer._id}`,
            "OFFER"
        );
        
        // Save the updated offer
        await offer.save();
        
        req.flash("success", "Offer successfully withdrawn");
        res.redirect("/offers/buyer");
    } catch (error) {
        console.error("❌ Error withdrawing offer:", error);
        req.flash("error", "Error withdrawing offer");
        res.redirect("/offers/buyer");
    }
};
