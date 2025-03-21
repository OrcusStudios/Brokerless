const express = require("express");
const router = express.Router();
const loginController = require("../controllers/loginController");
const professionalController = require("../controllers/professionalController");
const { ensureAuthenticated, ensureRole, ensureProfessional, ensureLender } = require("../middleware/authMiddleware");

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
// router.get("/manage-closings", ensureProfessional, professionalController.manageClosings);
// router.get("/manage-loans", ensureProfessional, professionalController.manageLoans);
// router.get("/manage-inspections", ensureProfessional, professionalController.manageInspections);
// router.get("/manage-repairs", ensureProfessional, professionalController.manageRepairs);

module.exports = router;
