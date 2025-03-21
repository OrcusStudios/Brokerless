// routes/apiRoutes.js

const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const { catchAsync } = require("../middleware/errorMiddleware");

// Basic API endpoint for testing rate limiting
router.get("/listings", catchAsync(async (req, res) => {
    const listings = await Listing.find().limit(10).lean();
    res.json({ success: true, data: listings });
}));

module.exports = router;