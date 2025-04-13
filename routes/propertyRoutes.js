const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/propertyController");
const coSellerController = require("../controllers/coSellerController");
const { ensureAuthenticated, ensureRole } = require("../middleware/authMiddleware");
const { catchAsync } = require("../middleware/errorMiddleware");
const multer = require('multer');
const { storage } = require('./cloudinary')
const upload = multer({ storage });

router.get("/", catchAsync(propertyController.getListings));

// Handle listing creation with image upload
router.post("/", ensureAuthenticated, ensureRole("seller"), upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 }
]), propertyController.createListing);

// Show listing creation form
router.get("/new", ensureAuthenticated, ensureRole("seller"), propertyController.showCreateForm);

//Manage user listings
router.get("/manage", ensureAuthenticated, ensureRole("seller"), propertyController.getSellerListings);

// Show edit form
router.get("/:id/edit", ensureAuthenticated, ensureRole("seller"), propertyController.showEditForm);

// Handle listing update with optional image upload
router.put("/:id", ensureAuthenticated, ensureRole("seller"), upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 }
]), propertyController.updateListing);

// Handle listing deletion
router.delete("/:id", ensureAuthenticated, ensureRole("seller"), propertyController.deleteListing);

// fetch a single property
router.get("/:id", propertyController.getListingById);

// Co-Seller Management Routes
// Show co-seller management page
router.get("/:id/co-sellers", ensureAuthenticated, ensureRole("seller"), coSellerController.showCoSellerManagement);

// Send invitation to co-seller
router.post("/:id/co-sellers", ensureAuthenticated, ensureRole("seller"), coSellerController.inviteCoSeller);

// Resend invitation
router.post("/:id/co-sellers/invitations/:invitationId/resend", ensureAuthenticated, ensureRole("seller"), coSellerController.resendInvitation);

// Cancel invitation
router.delete("/:id/co-sellers/invitations/:invitationId", ensureAuthenticated, ensureRole("seller"), coSellerController.cancelInvitation);

// Remove co-seller
router.delete("/:id/co-sellers/:coSellerId", ensureAuthenticated, ensureRole("seller"), coSellerController.removeCoSeller);

// Invitation Routes (these don't require authentication initially)
// Show accept invitation page
router.get("/invitations/:token", coSellerController.showAcceptInvitation);

// Accept invitation
router.post("/invitations/:token/accept", ensureAuthenticated, coSellerController.acceptInvitation);

// Reject invitation
router.post("/invitations/:token/reject", coSellerController.rejectInvitation);

module.exports = router;
