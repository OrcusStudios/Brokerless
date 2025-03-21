const express = require("express");
const scheduleController = require("../controllers/scheduleController");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/authMiddleware");

// Buyer - View Scheduled Showings
router.get("/", ensureAuthenticated, scheduleController.getShowings);

// Route for requesting a showing (linked to a property)
router.post("/:listingId/request", ensureAuthenticated, scheduleController.requestShowing);

// Confirm Showing Route
router.post("/:id/confirm", scheduleController.confirmShowing);

// Cancel Showing Route
router.post("/:id/cancel", scheduleController.cancelShowing);

module.exports = router;