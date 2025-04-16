const express = require("express");
const router = express.Router();
const loginController = require("../controllers/loginController");
const professionalController = require("../controllers/professionalController");
const { ensureAuthenticated, ensureRole, ensureProfessional, ensureLender, ensureTitleCompany, ensureInspector, ensurePhotographer, ensureContractor } = require("../middleware/authMiddleware");

//Apply for Pre-Approval
router.post("/preapproval/apply", ensureAuthenticated, ensureRole("buyer"), professionalController.applyForPreApproval);
router.post("/preapproval/approve/:buyerId", ensureAuthenticated, ensureRole("lender"), professionalController.approvePreApproval);
router.post("/preapproval/reject/:buyerId", ensureAuthenticated, ensureRole("lender"), professionalController.rejectPreApproval);

// Professional Registration & Login
router.get("/register", professionalController.showRegistrationForm);
router.post("/register", professionalController.registerProfessional);
router.get("/login", loginController.showLoginForm);
router.post("/login", loginController.loginUser);
router.post("/logout", loginController.logoutUser);

// Use this middleware for lender-specific routes
router.post("/preapproval/approve/:buyerId", ensureAuthenticated, ensureLender, professionalController.approvePreApproval);
router.post("/preapproval/reject/:buyerId", ensureAuthenticated, ensureLender, professionalController.rejectPreApproval);

// Keep the main dashboard as a router
router.get("/dashboard", ensureProfessional, professionalController.dashboard);


router.get("/counties", professionalController.getCountiesForState);

// ✅ Role-Specific Dashboards
router.get("/manage-closings", ensureTitleCompany, professionalController.manageClosings);
router.get("/manage-loans", ensureLender, professionalController.manageLoans);
router.get("/manage-inspections", ensureInspector, professionalController.manageInspections);
router.get("/manage-repairs", ensureContractor, professionalController.manageRepairs);
router.get("/manage-portfolio", ensurePhotographer, professionalController.managePortfolio);
router.post("/update-pricing", ensurePhotographer, professionalController.updatePricing);
router.post("/update-service-area", ensurePhotographer, professionalController.updateServiceArea);

module.exports = router;
