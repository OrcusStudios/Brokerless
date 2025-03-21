// routes/offerRoutes.js
const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const { ensureAuthenticated, ensureRole, ensureAnyRole } = require("../middleware/authMiddleware");

// Show offer form to create new offer
router.get("/new", ensureAuthenticated, ensureRole("buyer"), offerController.showOfferForm);

// Submit a new offer
router.post("/", ensureAuthenticated, ensureRole("buyer"), offerController.submitOffer);

// Contract preview before submission
router.get("/preview", ensureAuthenticated, ensureAnyRole(["buyer", "seller"]), offerController.previewOfferContract);

// Render counteroffer form
router.get("/:id/counter", ensureAuthenticated, ensureAnyRole(["buyer", "seller"]), offerController.showCounterOfferForm);

// Submit counteroffer
router.post("/:id/counter", ensureAuthenticated, ensureAnyRole(["buyer", "seller"]), offerController.counterOffer);

// Accept an offer
router.post("/:id/accept", ensureAuthenticated, ensureAnyRole(["buyer", "seller"]), offerController.acceptOffer);

// Reject an offer
router.post("/:id/reject", ensureAuthenticated, ensureAnyRole(["buyer", "seller"]), offerController.rejectOffer);

// Withdraw an offer
router.post("/:id/withdraw", ensureAuthenticated, ensureRole("buyer"), offerController.withdrawOffer);

// Amend a current offer
router.get("/:id/showAmend", ensureAuthenticated, offerController.showAmendForm);

// Mutually Release a current offer
router.get("/:id/showRelease", ensureAuthenticated, offerController.showReleaseForm);

// Generate PDF of an offer
// Modified: Allow both buyers and sellers to generate PDFs of offers they're involved in
router.get("/:id/pdf", ensureAuthenticated, ensureAnyRole(["buyer", "seller"]), offerController.generateOfferPDF);

// Get offer details as JSON (for AJAX requests)
router.get("/:id/details", ensureAuthenticated, offerController.getOfferDetails);

// View specific offer details
router.get("/:id", ensureAuthenticated, offerController.getOfferById);

module.exports = router;