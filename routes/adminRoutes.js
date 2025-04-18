const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { ensureAdmin, ensureSuperAdmin, hasPermission, logAdminActivity } = require("../middleware/adminMiddleware");

// Apply admin middleware to all routes in this file
router.use(ensureAdmin);
router.use(logAdminActivity("OTHER")); // Default activity type, will be overridden by specific routes

// Admin Dashboard
router.get("/dashboard", logAdminActivity("LOGIN"), adminController.getDashboard);

// User Management Routes
router.get("/users", 
  hasPermission("MANAGE_USERS"), 
  logAdminActivity("VIEW_USERS"), 
  adminController.getUsers
);

router.get("/users/:id", 
  hasPermission("MANAGE_USERS"), 
  logAdminActivity("VIEW_USER"), 
  adminController.getUserDetails
);

router.post("/users/:id", 
  hasPermission("MANAGE_USERS"), 
  logAdminActivity("UPDATE_USER"), 
  adminController.updateUser
);

router.post("/users/:id/deactivate", 
  hasPermission("MANAGE_USERS"), 
  logAdminActivity("DEACTIVATE_USER"), 
  adminController.deactivateUser
);

router.post("/users/:id/activate", 
  hasPermission("MANAGE_USERS"), 
  logAdminActivity("ACTIVATE_USER"), 
  adminController.activateUser
);

// Admin Management Routes (Super Admin only)
router.get("/admins", 
  ensureSuperAdmin, 
  logAdminActivity("VIEW_ADMINS"), 
  adminController.getAdmins
);

router.get("/admins/new", 
  ensureSuperAdmin, 
  adminController.getNewAdminForm
);

router.post("/admins/new", 
  ensureSuperAdmin, 
  logAdminActivity("CREATE_ADMIN"), 
  adminController.createAdmin
);

router.get("/admins/:id", 
  ensureSuperAdmin, 
  logAdminActivity("VIEW_ADMIN"), 
  adminController.getAdminDetails
);

router.post("/admins/:id", 
  ensureSuperAdmin, 
  logAdminActivity("UPDATE_ADMIN"), 
  adminController.updateAdmin
);

router.post("/admins/:id/remove", 
  ensureSuperAdmin, 
  logAdminActivity("REMOVE_ADMIN"), 
  adminController.removeAdmin
);

// Listing Management Routes
router.get("/listings", 
  hasPermission("MANAGE_LISTINGS"), 
  logAdminActivity("VIEW_LISTINGS"), 
  adminController.getListings
);

router.get("/listings/:id", 
  hasPermission("MANAGE_LISTINGS"), 
  logAdminActivity("VIEW_LISTING"), 
  adminController.getListingDetails
);

router.post("/listings/:id", 
  hasPermission("MANAGE_LISTINGS"), 
  logAdminActivity("UPDATE_LISTING"), 
  adminController.updateListing
);

router.post("/listings/:id/feature", 
  hasPermission("MANAGE_LISTINGS"), 
  logAdminActivity("FEATURE_LISTING"), 
  adminController.featureListing
);

router.post("/listings/:id/unfeature", 
  hasPermission("MANAGE_LISTINGS"), 
  logAdminActivity("UNFEATURE_LISTING"), 
  adminController.unfeatureListing
);

router.post("/listings/:id/remove", 
  hasPermission("MANAGE_LISTINGS"), 
  logAdminActivity("REMOVE_LISTING"), 
  adminController.removeListing
);

// Transaction Management Routes
router.get("/transactions", 
  hasPermission("MANAGE_TRANSACTIONS"), 
  logAdminActivity("VIEW_TRANSACTIONS"), 
  adminController.getTransactions
);

router.get("/transactions/:id", 
  hasPermission("MANAGE_TRANSACTIONS"), 
  logAdminActivity("VIEW_TRANSACTION"), 
  adminController.getTransactionDetails
);

router.post("/transactions/:id", 
  hasPermission("MANAGE_TRANSACTIONS"), 
  logAdminActivity("UPDATE_TRANSACTION"), 
  adminController.updateTransaction
);

// Professional Verification Routes
router.get("/professionals", 
  hasPermission("MANAGE_USERS"), 
  logAdminActivity("VIEW_PROFESSIONALS"), 
  adminController.getProfessionals
);

router.get("/professionals/pending", 
  hasPermission("MANAGE_USERS"), 
  logAdminActivity("VIEW_PENDING_PROFESSIONALS"), 
  adminController.getPendingProfessionals
);

router.get("/professionals/:id", 
  hasPermission("MANAGE_USERS"), 
  logAdminActivity("VIEW_PROFESSIONAL"), 
  adminController.getProfessionalDetails
);

router.post("/professionals/:id/verify", 
  hasPermission("MANAGE_USERS"), 
  logAdminActivity("VERIFY_PROFESSIONAL"), 
  adminController.verifyProfessional
);

router.post("/professionals/:id/deny", 
  hasPermission("MANAGE_USERS"), 
  logAdminActivity("DENY_PROFESSIONAL"), 
  adminController.denyProfessional
);

router.post("/professionals/:id/unverify", 
  hasPermission("MANAGE_USERS"), 
  logAdminActivity("UNVERIFY_PROFESSIONAL"), 
  adminController.unverifyProfessional
);

// Analytics Routes
router.get("/analytics", 
  hasPermission("VIEW_ANALYTICS"), 
  logAdminActivity("VIEW_ANALYTICS"), 
  adminController.getAnalytics
);

router.get("/analytics/users", 
  hasPermission("VIEW_ANALYTICS"), 
  logAdminActivity("VIEW_USER_ANALYTICS"), 
  adminController.getUserAnalytics
);

router.get("/analytics/listings", 
  hasPermission("VIEW_ANALYTICS"), 
  logAdminActivity("VIEW_LISTING_ANALYTICS"), 
  adminController.getListingAnalytics
);

router.get("/analytics/transactions", 
  hasPermission("VIEW_ANALYTICS"), 
  logAdminActivity("VIEW_TRANSACTION_ANALYTICS"), 
  adminController.getTransactionAnalytics
);

// System Settings Routes
router.get("/settings", 
  hasPermission("SYSTEM_SETTINGS"), 
  logAdminActivity("VIEW_SETTINGS"), 
  adminController.getSettings
);

router.post("/settings", 
  hasPermission("SYSTEM_SETTINGS"), 
  logAdminActivity("UPDATE_SETTINGS"), 
  adminController.updateSettings
);

// Admin Logs Routes
router.get("/logs", 
  ensureSuperAdmin, 
  logAdminActivity("VIEW_LOGS"), 
  adminController.getLogs
);

router.get("/logs/:id", 
  ensureSuperAdmin, 
  logAdminActivity("VIEW_LOG_DETAILS"), 
  adminController.getLogDetails
);

// Content Management Routes
router.get("/content", 
  hasPermission("MANAGE_CONTENT"), 
  logAdminActivity("VIEW_CONTENT"), 
  adminController.getContent
);

router.get("/content/:page", 
  hasPermission("MANAGE_CONTENT"), 
  logAdminActivity("VIEW_PAGE_CONTENT"), 
  adminController.getPageContent
);

router.post("/content/:page", 
  hasPermission("MANAGE_CONTENT"), 
  logAdminActivity("UPDATE_PAGE_CONTENT"), 
  adminController.updatePageContent
);

module.exports = router;
