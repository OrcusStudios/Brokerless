const express = require("express");
const router = express.Router();
const photographerController = require("../controllers/photographerController");
const { ensureAuthenticated, ensureRole } = require("../middleware/authMiddleware");

// Middleware to ensure user is a seller
const ensureSeller = (req, res, next) => {
    if (!req.user || !req.user.roles || !req.user.roles.some(role => role.type === 'seller' && role.active)) {
        req.flash("error", "Only sellers can access the photographer directory.");
        return res.redirect("/dashboard");
    }
    next();
};

// Photographer directory routes
router.get("/", ensureAuthenticated, ensureSeller, photographerController.showDirectory);
router.get("/:id", ensureAuthenticated, ensureSeller, photographerController.showProfile);
router.get("/:id/book", ensureAuthenticated, ensureSeller, photographerController.showBookingForm);
router.post("/:id/book", ensureAuthenticated, ensureSeller, photographerController.processBooking);

module.exports = router;
