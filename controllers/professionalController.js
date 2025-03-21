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
          county 
      } = req.body;

      let professional = await Professional.findOne({ email });
      if (professional) {
          req.flash("error", "Email is already registered.");
          return res.redirect("/professionals/register");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
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
          paymentTier: professionalType === "Lender" ? (paymentTier || "Basic") : undefined,
          preApprovals: []
      });

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
        if (lender && lender.professionalType === "Lender") {
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
      
      // Organize by status
      const pendingApplicants = preApprovals.filter(app => app.status === 'pending');
      const approvedApplicants = preApprovals.filter(app => app.status === 'approved');
      const deniedApplicants = preApprovals.filter(app => app.status === 'rejected');
      
      Object.assign(dashboardData, {
        pendingApplicants,
        approvedApplicants,
        deniedApplicants,
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
    if (req.user.professionalType !== "Title Company") {
        req.flash("error", "Access denied.");
        return res.redirect("/professionals/dashboard");
    }
    res.render("professionals/manageClosings", { user: req.user });
};

// Lender Dashboard
exports.manageLoans = (req, res) => {
    if (req.user.professionalType !== "Lender") {
        req.flash("error", "Access denied.");
        return res.redirect("/professionals/dashboard");
    }
    res.render("professionals/manageLoans", { user: req.user });
};

// Inspector Dashboard
exports.manageInspections = (req, res) => {
    if (req.user.professionalType !== "Inspector") {
        req.flash("error", "Access denied.");
        return res.redirect("/professionals/dashboard");
    }
    res.render("professionals/manageInspections", { user: req.user });
};

// Contractor Dashboard
exports.manageRepairs = (req, res) => {
    if (req.user.professionalType !== "Contractor") {
        req.flash("error", "Access denied.");
        return res.redirect("/professionals/dashboard");
    }
    res.render("professionals/manageRepairs", { user: req.user });
};

// ✅ Apply for Pre-Approval (Prevent Multiple Applications)
exports.applyForPreApproval = async (req, res) => {
    try {
        const { lenderId } = req.body;

        // ✅ Ensure lender exists
        const lender = await Professional.findById(lenderId);
        if (!lender || lender.professionalType !== "Lender") {
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
      lender.preApprovals[applicationIndex].status = "rejected";
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