const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/authMiddleware");

// Display the inspector directory
router.get("/", (req, res) => {
  res.render("inspectorDirectory");
});

// Display the inspector scheduling page
router.get("/schedule/:id", ensureAuthenticated, (req, res) => {
  res.render("inspectorSchedule", {
    inspectorId: req.params.id
  });
});

// Handle inspector scheduling form submission
router.post("/schedule/:id", ensureAuthenticated, (req, res) => {
  req.flash("success", "Inspection scheduled successfully!");
  res.redirect("/users/dashboard");
});

// API endpoint to search for inspectors
router.get("/api/search", (req, res) => {
  res.json({
    success: true,
    message: "Search functionality will be implemented in a future update."
  });
});

module.exports = router;
