const express = require("express");
const router = express.Router();
const disclosureController = require("../controllers/disclosureController");
const { ensureAuthenticated, ensureRole } = require("../middleware/authMiddleware");
const { catchAsync } = require("../middleware/errorMiddleware");

// Edit disclosure sections
router.get("/listing/:listingId/edit/:section", ensureAuthenticated, ensureRole("seller"), catchAsync(disclosureController.editSection));
router.post("/listing/:listingId/update/:section", ensureAuthenticated, ensureRole("seller"), catchAsync(disclosureController.updateSection));

// Generate PDF disclosure document
router.get("/listing/:listingId/generate-pdf", ensureAuthenticated, ensureRole("seller"), catchAsync(disclosureController.generateDisclosurePDF));

// Acknowledge completed disclosure
router.post("/listing/:listingId/acknowledge", ensureAuthenticated, ensureRole("seller"), catchAsync(disclosureController.acknowledgeDisclosure));

module.exports = router;