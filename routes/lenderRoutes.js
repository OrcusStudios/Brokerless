const express = require("express");
const router = express.Router();
const lenderController = require("../controllers/lenderController.js");
const { ensureAuthenticated, ensureProfessional, ensureLender } = require("../middleware/authMiddleware");

// ✅ Apply for financing (buyer initiates request)
router.post("/apply", ensureAuthenticated, lenderController.applyForFinancing);


// ✅ Get Lender From Directory
router.get("/:id", ensureAuthenticated, lenderController.getLenderById);

// Existing routes for lender
router.get("/dashboard", ensureAuthenticated, ensureLender, lenderController.getDashboard);

// Make sure these routes exist for the lender approval flow
router.post("/approve-applicant", ensureAuthenticated, ensureLender, lenderController.approveApplicant);
router.post("/deny-applicant", ensureAuthenticated, ensureLender, lenderController.denyApplicant);
router.post("/request-info", ensureAuthenticated, ensureLender, lenderController.requestMoreInfo);

// Any other lender routes...
router.get("/applicants", ensureAuthenticated, ensureLender, lenderController.getApplicants);
router.get("/analytics", ensureAuthenticated, ensureLender, lenderController.getAnalytics);

module.exports = router;