/**
 * Admin Middleware
 * Provides middleware functions for protecting admin routes and checking admin permissions
 */

// Ensure user is authenticated and is an admin
exports.ensureAdmin = (req, res, next) => {
  // First check if user is authenticated
  if (!req.isAuthenticated()) {
    req.flash('error', 'You must be logged in to access this page');
    return res.redirect('/users/login');
  }
  
  // Then check if user is an admin
  if (!req.user.isAdmin) {
    req.flash('error', 'You do not have permission to access this page');
    return res.redirect('/users/dashboard');
  }
  
  // User is authenticated and is an admin
  next();
};

// Ensure user is a Super Admin
exports.ensureSuperAdmin = (req, res, next) => {
  // First check if user is authenticated and is an admin
  if (!req.isAuthenticated() || !req.user.isAdmin) {
    req.flash('error', 'You do not have permission to access this page');
    return res.redirect('/users/dashboard');
  }
  
  // Then check if user is a Super Admin
  if (req.user.adminRole !== 'SUPER_ADMIN') {
    req.flash('error', 'This action requires Super Admin privileges');
    return res.redirect('/admin/dashboard');
  }
  
  // User is authenticated and is a Super Admin
  next();
};

// Check if user has specific admin permission
exports.hasPermission = (permission) => {
  return (req, res, next) => {
    // First check if user is authenticated and is an admin
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      req.flash('error', 'You do not have permission to access this page');
      return res.redirect('/users/dashboard');
    }
    
    // Super Admins have all permissions
    if (req.user.adminRole === 'SUPER_ADMIN') {
      return next();
    }
    
    // Check if user has the required permission
    if (!req.user.adminPermissions.includes(permission)) {
      req.flash('error', 'You do not have permission to perform this action');
      return res.redirect('/admin/dashboard');
    }
    
    // User has the required permission
    next();
  };
};

// Admin activity logger middleware
exports.logAdminActivity = (activityType) => {
  return (req, res, next) => {
    // Only log if user is authenticated and is an admin
    if (req.isAuthenticated() && req.user.isAdmin) {
      // Create a log entry
      const AdminLog = require('../models/AdminLog');
      
      const log = new AdminLog({
        admin: req.user._id,
        activityType,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          body: req.method === 'POST' ? req.body : undefined
        }
      });
      
      // Save log asynchronously (don't wait for it to complete)
      log.save().catch(err => console.error('Error saving admin log:', err));
    }
    
    next();
  };
};
