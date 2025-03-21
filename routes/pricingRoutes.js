const express = require("express");
const router = express.Router();
const pricingController = require("../controllers/pricingController"); // ✅ Ensure correct path

// Closing step routes
router.get('/', pricingController.getPricing);

module.exports = router;