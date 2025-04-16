const Professional = require("../models/Professional");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const passport = require("passport");

// Show Registration Form
exports.showRegistrationForm = (req, res) => {
    res.render("registerProfessional");
};

exports.registerProfessional = async (req, res) => {
  try {
      const { 
          name, 
          email, 
          password, 
          companyName, 
          phone, 
          address, 
          state, 
          professionalType, 
          licenseNumber, 
          paymentTier,
          county,
          specialties,
          equipmentDetails,
          'pricingTiers.basic': basicPrice,
          'pricingTiers.standard': standardPrice,
          'pricingTiers.premium': premiumPrice
      } = req.body;

      let professional = await Professional.findOne({ email });
      if (professional) {
          req.flash("error", "Email is already registered.");
          return res.redirect("/professionals/register");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create base professional object
      professional = new Professional({
          name,
          email,
          password: hashedPassword,
          companyName,
          phone,
          address,
          professionalType,
          state,
          counties: county ? [county] : [], 
          licenseNumber,
          preApprovals: []
      });
      
      // Add professional type specific fields
      if (professionalType === "lender") {
          professional.paymentTier = paymentTier || "Basic";
      } else if (professionalType === "photographer") {
          // Handle specialties (convert to array if needed)
          if (specialties) {
              professional.specialties = Array.isArray(specialties) ? specialties : [specialties];
          }
          
          // Add equipment details
          if (equipmentDetails) {
              professional.equipmentDetails = equipmentDetails;
          }
          
          // Add pricing tiers
          professional.pricingTiers = {
              basic: basicPrice ? Number(basicPrice) : undefined,
              standard: standardPrice ? Number(standardPrice) : undefined,
              premium: premiumPrice ? Number(premiumPrice) : undefined
          };
      }

      await professional.save();
      req.flash("success", "Registration successful! Please log in.");
      res.redirect("/professionals/login");
  } catch (error) {
      console.error("❌ Error registering professional:", error);
      req.flash("error", "Error processing registration.");
      res.redirect("/professionals/register");
  }
};

// New method to get counties for a state
exports.getCountiesForState = (req, res) => {
  const { state } = req.query;
  const countyOptionsHTML = generateCountyOptionsHTML(state || 'MO');
  res.send(countyOptionsHTML);
};

// ✅ Update Lender Status
exports.updateLenderStatus = async (lenderId) => {
    try {
        const lender = await Professional.findById(lenderId);
        if (lender && lender.professionalType === "lender") {
            lender.closedDeals += 1;

            // ✅ Promotion Logic
            if (lender.closedDeals >= 6) {
                lender.paymentTier = "Ultra-Preferred";
            } else if (lender.paymentTier === "Basic" && lender.closedDeals > 0) {
                lender.paymentTier = "Preferred";
            }

            await lender.save();
            console.log(`🔹 Lender ${lender.name} promoted to ${lender.paymentTier} (${lender.closedDeals} deals closed)`);
        }
    } catch (error) {
        console.error("❌ Error updating lender status:", error);
    }
};

// Show Login Form
exports.showLoginForm = (req, res) => {
    res.render("loginProfessional");
};

// Professional Login
exports.loginProfessional = (req, res, next) => {
    passport.authenticate("local", {
        successRedirect: "/professionals/dashboard",
        failureRedirect: "/professionals/login",
        failureFlash: true,
    })(req, res, next);
};

// For the Professional Dashboard
exports.dashboard = async (req, res) => {
  try {
    if (!req.user.professionalType) {
      req.flash("error", "Access denied. You are not a professional user.");
      return res.redirect("/professionals/dashboard");
    }
    
    // Normalize to lowercase for consistent comparison
    const professionalType = req.user.professionalType.toLowerCase();
    
    // Prepare data for the dashboard based on professional type
    let dashboardData = { user: req.user };
    
    if (professionalType === "lender") {
      // Fetch lender with populated buyer information
      const professional = await Professional.findById(req.user._id)
        .populate({
          path: 'preApprovals.buyer',
          select: 'name email'
        });
      
      // Make sure preApprovals exists
      const preApprovals = professional.preApprovals || [];
      
      // Get all buyer IDs from preApprovals
      const buyerIds = preApprovals.map(app => app.buyer && app.buyer._id).filter(Boolean);
      
      // Fetch PreApproval records for these buyers
      const PreApproval = require('../models/PreApproval');
      const preApprovalRecords = await PreApproval.find({
        buyer: { $in: buyerIds },
        lender: req.user._id
      });
      
      // Create a map of buyer ID to PreApproval record for quick lookup
      const preApprovalMap = {};
      preApprovalRecords.forEach(record => {
        preApprovalMap[record.buyer.toString()] = record;
      });
      
      // Enhance preApprovals with PreApproval records
      const enhancedPreApprovals = preApprovals.map(app => {
        if (app.buyer && app.buyer._id) {
          const buyerId = app.buyer._id.toString();
          const preApproval = preApprovalMap[buyerId];
          return {
            ...app.toObject(),
            preApproval: preApproval || null
          };
        }
        return app;
      });
      
      // Organize by status from the PreApproval records
      const pendingApplicants = enhancedPreApprovals.filter(app => {
        const preApproval = app.preApproval;
        return preApproval ? preApproval.status === 'pending' : app.status === 'pending';
      });
      
      const approvedApplicants = enhancedPreApprovals.filter(app => {
        const preApproval = app.preApproval;
        return preApproval ? preApproval.status === 'approved' : app.status === 'approved';
      });
      
      const deniedApplicants = enhancedPreApprovals.filter(app => {
        const preApproval = app.preApproval;
        return preApproval ? (preApproval.status === 'rejected' || preApproval.status === 'denied') : 
                            (app.status === 'rejected' || app.status === 'denied');
      });
      
      console.log('DEBUG - Professional Dashboard:');
      console.log('Total preApprovals:', preApprovals.length);
      console.log('Pending applicants:', pendingApplicants.length);
      console.log('Approved applicants:', approvedApplicants.length);
      console.log('Denied applicants:', deniedApplicants.length);
      console.log('PreApprovals statuses:', preApprovals.map(app => app.status));
      
      // Fetch active loans (offers with bank financing where this lender is involved)
      const Offer = require('../models/Offer');
      let activeLoans = [];
      
      try {
        // Find offers where:
        // 1. Financing type is bank
        // 2. Status is accepted
        // 3. Either:
        //    a. This lender is explicitly set as the lender in lenderInfo
        //    b. A buyer has this lender as their preApprovalLender
        activeLoans = await Offer.find({
          financingType: 'bank',
          status: 'accepted',
          $or: [
            { 'lenderInfo.email': professional.email },
            { 'lenderInfo.name': professional.name },
            { 'lenderInfo.company': professional.companyName }
          ]
        })
        .populate('buyer', 'name email')
        .populate('listing', 'address city state zip')
        .sort({ closingDate: 1 });
        
        // If no direct matches, try to find through buyer's preApprovalLender
        if (activeLoans.length === 0) {
          const approvedBuyerIds = approvedApplicants
            .filter(app => app.buyer && app.buyer._id)
            .map(app => app.buyer._id);
            
          if (approvedBuyerIds.length > 0) {
            const buyerLoans = await Offer.find({
              financingType: 'bank',
              status: 'accepted',
              buyer: { $in: approvedBuyerIds }
            })
            .populate('buyer', 'name email')
            .populate('listing', 'address city state zip')
            .sort({ closingDate: 1 });
            
            activeLoans = [...activeLoans, ...buyerLoans];
          }
        }
        
      } catch (error) {
        console.error("Error fetching active loans:", error);
        // Continue with empty activeLoans array
      }
      
      Object.assign(dashboardData, {
        pendingApplicants,
        approvedApplicants,
        deniedApplicants,
        activeLoans,
        pendingCount: pendingApplicants.length,
        approvedCount: approvedApplicants.length,
        deniedCount: deniedApplicants.length,
        totalCount: preApprovals.length
      });
    } 
    else if (professionalType === "title") {
      // Get all offers where this title company is handling closing
      const Offer = require('../models/Offer'); // Make sure to require the model
      
      const pendingClosings = await Offer.find({
        'titleCompanyDetails.company': req.user._id,
        'closingStatus': { $nin: ['closed'] }
      })
      .populate('buyer', 'name email phoneNumber')
      .populate('seller', 'name email phoneNumber')
      .populate('listing', 'address city state zip image')
      .sort({ closingDate: 1 });
      
      // Get closed transactions
      const completedClosings = await Offer.find({
        'titleCompanyDetails.company': req.user._id,
        'closingStatus': 'closed'
      })
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('listing', 'address city state zip')
      .sort({ closingDate: -1 })
      .limit(10);
      
      // Get upcoming closings (in next 7 days)
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      
      const upcomingClosings = pendingClosings.filter(closing => 
        new Date(closing.closingDate) <= oneWeekFromNow
      );
      
      // Helper functions for formatting
      const getStatusBadgeClass = (status) => {
        const statusMap = {
          'pending': 'warning',
          'in_progress': 'info',
          'title_review': 'primary',
          'documents_ready': 'info',
          'signing_scheduled': 'primary',
          'signed': 'info',
          'funded': 'info',
          'recorded': 'success',
          'closed': 'success'
        };
        return statusMap[status] || 'secondary';
      };
      
      const formatClosingStatus = (status) => {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      };
      
      const getTaskStatusBadge = (status) => {
        const statusMap = {
          'pending': 'warning',
          'in_progress': 'info',
          'complete': 'success',
          'issue': 'danger'
        };
        return statusMap[status] || 'secondary';
      };
      
      const formatTaskStatus = (status) => {
        return status.replace(/\b\w/g, l => l.toUpperCase());
      };
      
      Object.assign(dashboardData, {
        pendingClosings,
        completedClosings,
        upcomingClosings,
        getStatusBadgeClass,
        formatClosingStatus,
        getTaskStatusBadge,
        formatTaskStatus
      });
    }
    else if (professionalType === "photographer") {
      // Get all listings where this photographer might be needed
      const User = require('../models/User');
      const Listing = require('../models/Listing');
      
      // Find sellers in the photographer's service counties
      const sellersInServiceArea = await User.find({
        'roles.type': 'seller',
        'roles.active': true,
        'seller.listings': { $exists: true, $ne: [] }
      })
      .select('name email seller.listings');
      
      // Get the listings for these sellers
      const sellerListingIds = sellersInServiceArea.flatMap(seller => 
        seller.seller.listings || []
      );
      
      // Get active listings in the photographer's service counties
      const activeListings = await Listing.find({
        _id: { $in: sellerListingIds },
        county: { $in: req.user.counties }
      })
      .populate('sellers.user', 'name email')
      .sort({ createdAt: -1 });
      
      // Get upcoming appointments (this would be implemented with a Schedule model)
      const upcomingAppointments = []; // Placeholder for future implementation
      
      // Get completed shoots (this would be implemented with a tracking system)
      const completedShoots = []; // Placeholder for future implementation
      
      Object.assign(dashboardData, {
        activeListings,
        upcomingAppointments,
        completedShoots,
        serviceCounties: req.user.counties,
        portfolio: req.user.portfolio || [],
        specialties: req.user.specialties || [],
        pricingTiers: req.user.pricingTiers || {}
      });
    }
    // Add cases for other professional types as needed
    // else if (professionalType === "inspector") { ... }
    
    res.render("dashboardProfessional", dashboardData);
  } catch (error) {
    console.error("Error loading professional dashboard:", error);
    req.flash("error", "Error loading dashboard data: " + error.message);
    res.redirect("/");
  }
};

// Title Company Dashboard
exports.manageClosings = (req, res) => {
    if (req.user.professionalType !== "title") {
        req.flash("error", "Access denied.");
        return res.redirect("/professionals/dashboard");
    }
    res.render("professionals/manageClosings", { user: req.user });
};

// Lender Dashboard
exports.manageLoans = (req, res) => {
    if (req.user.professionalType !== "lender") {
        req.flash("error", "Access denied.");
        return res.redirect("/professionals/dashboard");
    }
    res.render("professionals/manageLoans", { user: req.user });
};

// Inspector Dashboard
exports.manageInspections = (req, res) => {
    if (req.user.professionalType !== "inspector") {
        req.flash("error", "Access denied.");
        return res.redirect("/professionals/dashboard");
    }
    res.render("professionals/manageInspections", { user: req.user });
};

// Contractor Dashboard
exports.manageRepairs = (req, res) => {
    if (req.user.professionalType !== "contractor") {
        req.flash("error", "Access denied.");
        return res.redirect("/professionals/dashboard");
    }
    res.render("professionals/manageRepairs", { user: req.user });
};

// Photographer Dashboard
exports.managePortfolio = async (req, res) => {
    try {
        if (req.user.professionalType !== "photographer") {
            req.flash("error", "Access denied.");
            return res.redirect("/professionals/dashboard");
        }
        
        // Get all listings where this photographer might be needed
        const User = require('../models/User');
        const Listing = require('../models/Listing');
        
        // Find sellers in the photographer's service counties
        const sellersInServiceArea = await User.find({
            'roles.type': 'seller',
            'roles.active': true,
            'seller.listings': { $exists: true, $ne: [] }
        })
        .select('name email seller.listings');
        
        // Get the listings for these sellers
        const sellerListingIds = sellersInServiceArea.flatMap(seller => 
            seller.seller.listings || []
        );
        
        // Get active listings in the photographer's service counties
        const activeListings = await Listing.find({
            _id: { $in: sellerListingIds },
            county: { $in: req.user.counties || [] }
        })
        .populate('sellers.user', 'name email')
        .sort({ createdAt: -1 });
        
        // Get upcoming appointments (this would be implemented with a Schedule model)
        const upcomingAppointments = []; // Placeholder for future implementation
        
        // Get completed shoots (this would be implemented with a tracking system)
        const completedShoots = []; // Placeholder for future implementation
        
        res.render("professionals/photographerDashboard", {
            user: req.user,
            activeListings,
            upcomingAppointments,
            completedShoots,
            serviceCounties: req.user.counties || [],
            portfolio: req.user.portfolio || [],
            specialties: req.user.specialties || [],
            pricingTiers: req.user.pricingTiers || {}
        });
    } catch (error) {
        console.error("Error loading photographer dashboard:", error);
        req.flash("error", "Error loading dashboard data: " + error.message);
        res.redirect("/professionals/dashboard");
    }
};

// ✅ Apply for Pre-Approval (Prevent Multiple Applications)
exports.applyForPreApproval = async (req, res) => {
    try {
        const { lenderId } = req.body;

        // ✅ Ensure lender exists
        const lender = await Professional.findById(lenderId);
        if (!lender || lender.professionalType !== "lender") {
            req.flash("error", "Invalid lender selection.");
            return res.redirect("/directory");
        }

        // ✅ Prevent duplicate applications
        const user = await User.findById(req.user._id);
        if (user.preApprovalStatus !== "none") {
            req.flash("error", "You have already applied for pre-approval.");
            return res.redirect("/dashboard");
        }

        // ✅ Update User Pre-Approval Status
        user.preApprovalStatus = "pending";
        user.preApprovalLender = lender._id;
        await user.save();

        // ✅ Add Buyer to Lender's Pre-Approval List
        lender.preApprovals.push({ buyer: req.user._id, status: "pending" });
        await lender.save();

        req.flash("success", "Pre-Approval request submitted successfully.");
        res.redirect("/dashboard");
    } catch (error) {
        console.error("❌ Error applying for pre-approval:", error);
        req.flash("error", "Error submitting pre-approval request.");
        res.redirect("/dashboard");
    }
};

// Lender approves pre-approval
exports.approvePreApproval = async (req, res) => {
    try {
      const { buyerId } = req.params;
      
      // Ensure the lender has this buyer in their applications
      const lender = await Professional.findById(req.user._id);
      const applicationIndex = lender.preApprovals.findIndex(app => 
        app.buyer && app.buyer.toString() === buyerId
      );
      
      if (applicationIndex === -1) {
        req.flash("error", "Buyer not found in your applications.");
        return res.redirect("/professionals/dashboard");
      }
      
      // Update the lender's record
      lender.preApprovals[applicationIndex].status = "approved";
      lender.preApprovals[applicationIndex].approvedAt = new Date();
      await lender.save();
      
      // Update the buyer's record
      await User.findByIdAndUpdate(buyerId, {
        preApprovalStatus: "approved"
      });
      
      // Create notification for the buyer
      await Notification.create({
        user: buyerId,
        message: `Your financing application with ${lender.companyName} has been approved!`,
        type: "Approved",
        link: "/dashboard"
      });
      
      req.flash("success", "Buyer has been approved for financing.");
      res.redirect("/professionals/dashboard");
    } catch (error) {
      console.error("Error approving financing:", error);
      req.flash("error", "Failed to approve financing.");
      res.redirect("/professionals/dashboard");
    }
  };
  
  // Lender denies pre-approval
  exports.rejectPreApproval = async (req, res) => {
    try {
      const { buyerId } = req.params;
      
      // Ensure the lender has this buyer in their applications
      const lender = await Professional.findById(req.user._id);
      const applicationIndex = lender.preApprovals.findIndex(app => 
        app.buyer && app.buyer.toString() === buyerId
      );
      
      if (applicationIndex === -1) {
        req.flash("error", "Buyer not found in your applications.");
        return res.redirect("/professionals/dashboard");
      }
      
      // Update the lender's record
      lender.preApprovals[applicationIndex].status = "denied";
      lender.preApprovals[applicationIndex].deniedAt = new Date();
      await lender.save();
      
      // Update the buyer's record
      await User.findByIdAndUpdate(buyerId, {
        preApprovalStatus: "denied"
      });
      
      // Create notification for the buyer
      await Notification.create({
        user: buyerId,
        message: `Your financing application with ${lender.companyName} has been denied.`,
        type: "Denied",
        link: "/dashboard"
      });
      
      req.flash("success", "Buyer financing application has been denied.");
      res.redirect("/professionals/dashboard");
    } catch (error) {
      console.error("Error denying financing:", error);
      req.flash("error", "Failed to deny financing.");
      res.redirect("/professionals/dashboard");
    }
  };

// Update photographer pricing tiers
exports.updatePricing = async (req, res) => {
  try {
    // Ensure user is a photographer
    if (req.user.professionalType !== "photographer") {
      req.flash("error", "Access denied. You need to be a photographer.");
      return res.redirect("/professionals/dashboard");
    }

    // Get pricing data from form
    const { 
      'pricingTiers.basic': basicPrice, 
      'pricingTiers.standard': standardPrice, 
      'pricingTiers.premium': premiumPrice,
      basicDescription,
      standardDescription,
      premiumDescription
    } = req.body;

    // Update photographer pricing tiers
    const photographer = await Professional.findById(req.user._id);
    
    // Initialize pricingTiers if it doesn't exist
    if (!photographer.pricingTiers) {
      photographer.pricingTiers = {};
    }
    
    // Update pricing tiers
    photographer.pricingTiers.basic = basicPrice ? Number(basicPrice) : 0;
    photographer.pricingTiers.standard = standardPrice ? Number(standardPrice) : 0;
    photographer.pricingTiers.premium = premiumPrice ? Number(premiumPrice) : 0;
    
    // Update package descriptions
    if (!photographer.packageDescriptions) {
      photographer.packageDescriptions = {};
    }
    
    photographer.packageDescriptions.basic = basicDescription || '';
    photographer.packageDescriptions.standard = standardDescription || '';
    photographer.packageDescriptions.premium = premiumDescription || '';
    
    await photographer.save();
    
    req.flash("success", "Pricing packages updated successfully.");
    res.redirect("/professionals/dashboard");
  } catch (error) {
    console.error("Error updating pricing:", error);
    req.flash("error", "Error updating pricing packages.");
    res.redirect("/professionals/dashboard");
  }
};

// Update photographer service area
exports.updateServiceArea = async (req, res) => {
  try {
    // Ensure user is a photographer
    if (req.user.professionalType !== "photographer") {
      req.flash("error", "Access denied. You need to be a photographer.");
      return res.redirect("/professionals/dashboard");
    }

    // Get service area data from form
    const { state, counties } = req.body;
    
    // Update photographer service area
    const photographer = await Professional.findById(req.user._id);
    
    // Update state
    photographer.state = state;
    
    // Update counties (ensure it's an array)
    photographer.counties = Array.isArray(counties) ? counties : [counties];
    
    await photographer.save();
    
    req.flash("success", "Service area updated successfully.");
    res.redirect("/professionals/dashboard");
  } catch (error) {
    console.error("Error updating service area:", error);
    req.flash("error", "Error updating service area.");
    res.redirect("/professionals/dashboard");
  }
};
