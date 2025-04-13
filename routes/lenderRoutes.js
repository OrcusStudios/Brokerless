const express = require("express");
const router = express.Router();
const lenderController = require("../controllers/lenderController.js");
const { ensureAuthenticated, ensureProfessional, ensureLender } = require("../middleware/authMiddleware");

// ✅ Apply for financing (buyer initiates request)
router.post("/apply", lenderController.applyForFinancing);

// Make sure these routes exist for the lender approval flow - MUST be before /:id route
router.post("/approve", ensureAuthenticated, ensureLender, lenderController.approveApplicant);
router.get("/approve", ensureAuthenticated, ensureLender, lenderController.approveApplicantGet);
router.post("/deny", ensureAuthenticated, ensureLender, lenderController.denyApplicant);
router.get("/deny", ensureAuthenticated, ensureLender, lenderController.denyApplicantGet);
router.post("/request", ensureAuthenticated, ensureLender, lenderController.requestMoreInfo);

// Update application link
router.post("/update-application-link", ensureAuthenticated, ensureLender, lenderController.updateApplicationLink);

// Any other lender routes...
router.get("/applicants", ensureAuthenticated, ensureLender, lenderController.getApplicants);
router.get("/analytics", ensureAuthenticated, ensureLender, lenderController.getAnalytics);

// Existing routes for lender
router.get("/dashboard", ensureAuthenticated, ensureLender, lenderController.getDashboard);

// ✅ Get Lender From Directory - MUST be last because it's a catch-all route
router.get("/:id", ensureAuthenticated, lenderController.getLenderById);

module.exports = router;
