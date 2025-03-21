const express = require("express");
const router = express.Router();
const loginController = require("../controllers/loginController");
const userController = require("../controllers/userController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");
const { validate, validationRules } = require("../middleware/validationMiddleware");

// ===== Authentication Routes =====

// Show registration form
router.get("/register", userController.showRegisterForm);

router.post("/register", 
    validate(validationRules.registerUser), // Add this line
    userController.registerUser
);

// Show Login Page
router.get("/login", loginController.showLoginForm);

// Process Login with validation
router.post("/login", 
    validate(validationRules.loginUser), // Add this line
    loginController.loginUser
);

// Logout
router.get("/logout", loginController.logoutUser);

// Password reset request
router.get("/forgot-password", userController.showForgotPasswordForm);
router.post("/forgot-password", userController.forgotPassword);
router.get("/reset-password/:token", userController.showResetPasswordForm);
router.post("/reset-password/:token", userController.resetPassword);

// ===== Dashboard Routes =====

// Main dashboard (routes based on user roles)
router.get("/dashboard", ensureAuthenticated, userController.getDashboard);

// ===== Profile Management Routes =====

// View user profile
router.get("/profile", ensureAuthenticated, userController.getProfile);

// Update user profile
router.post("/profile", ensureAuthenticated, userController.updateProfile);

// Update profile image
router.post("/profile/image", ensureAuthenticated, userController.updateProfileImage);

// Update notification preferences
router.post("/preferences/notifications", ensureAuthenticated, userController.updateNotificationPreferences);

// ===== Role Management Routes =====

// Activate buyer role
router.post("/roles/activate/buyer", ensureAuthenticated, userController.activateBuyerRole);

// Activate seller role
router.post("/roles/activate/seller", ensureAuthenticated, userController.activateSellerRole);

// Activate professional role (lender, agent, inspector, title)
router.post("/roles/activate/professional", ensureAuthenticated, userController.activateProfessionalRole);

// Deactivate a role
router.post("/roles/deactivate/:role", ensureAuthenticated, userController.deactivateRole);

// ===== Buyer-specific Routes =====

// Save/unsave listings
router.post("/buyer/listings/save/:id", ensureAuthenticated, userController.saveListing);
router.post("/buyer/listings/unsave/:id", ensureAuthenticated, userController.unsaveListing);

// Get saved listings
router.get("/buyer/listings/saved", ensureAuthenticated, userController.getSavedListings);

// Update search preferences
router.post("/buyer/preferences", ensureAuthenticated, userController.updateSearchPreferences);

// ===== Seller-specific Routes =====

// View seller verification status
router.get("/seller/verification", ensureAuthenticated, userController.getVerificationStatus);

// Request seller verification
router.post("/seller/verification/request", ensureAuthenticated, userController.requestVerification);

// Update payment information
router.post("/seller/payment", ensureAuthenticated, userController.updatePaymentInfo);

// ===== Notifications Routes =====

// Get user notifications
//router.get("/notifications", ensureAuthenticated, notificationController.getUserNotifications);

// Mark notification as read
//router.post("/notifications/:id/read", ensureAuthenticated, notificationController.markAsRead);

// Delete notification
//router.delete("/notifications/:id", ensureAuthenticated, notificationController.deleteNotification);

module.exports = router;