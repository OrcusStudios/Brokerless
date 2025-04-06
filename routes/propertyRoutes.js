const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/propertyController");
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


module.exports = router;
