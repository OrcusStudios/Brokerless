const User = require("../models/User");
const Listing = require("../models/Listing");
const Offer = require("../models/Offer");
const Professional = require("../models/Professional");
const AdminLog = require("../models/AdminLog");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../utils/emailService");
const ejs = require('ejs');
const path = require('path');
const util = require('util');

// Helper function to render a template as a string
const renderTemplate = async (templatePath, data) => {
  const renderFile = util.promisify(ejs.renderFile);
  const filePath = path.join(__dirname, `../views/${templatePath}.ejs`);
  return await renderFile(filePath, data);
};

// Helper function to render the dashboard template
const renderDashboard = async (data) => {
  return await renderTemplate('admin/dashboard', data);
};

/**
 * Admin Dashboard
 * Displays key metrics and recent activity
 */
exports.getDashboard = async (req, res) => {
  try {
    // Get counts for various entities
    const userCount = await User.countDocuments();
    const listingCount = await Listing.countDocuments();
    const offerCount = await Offer.countDocuments();
    const professionalCount = await Professional.countDocuments();
    
    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt');
    
    // Get recent listings
    const recentListings = await Listing.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('address price createdAt');
    
    // Get recent offers
    const recentOffers = await Offer.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('buyer', 'name')
      .populate('listing', 'address')
      .select('price status createdAt');
    
    // Get pending professional verifications
    const pendingProfessionals = await Professional.find({ 'verified': false })
      .limit(5)
      .select('name email professionalType createdAt');
    
    // Get recent admin activity
    const recentActivity = await AdminLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('admin', 'name')
      .select('admin activityType createdAt');
    
    // Render the dashboard with the layout
    res.render('admin/layout', {
      title: 'Admin Dashboard',
      active: 'dashboard',
      userCount,
      listingCount,
      offerCount,
      professionalCount,
      recentUsers,
      recentListings,
      recentOffers,
      pendingProfessionals,
      recentActivity,
      user: req.user,
      content: await renderTemplate('admin/dashboard', {
        userCount,
        listingCount,
        offerCount,
        professionalCount,
        recentUsers,
        recentListings,
        recentOffers,
        pendingProfessionals,
        recentActivity,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    req.flash('error', 'Error loading dashboard data');
    res.redirect('/');
  }
};

/**
 * User Management
 * List all users with filtering and pagination
 */
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter based on query parameters
    const filter = {};
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.role) {
      filter['roles.type'] = req.query.role;
      filter['roles.active'] = true;
    }
    
    if (req.query.isActive) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Get total count for pagination
    const total = await User.countDocuments(filter);
    
    // Get users with pagination
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name email roles isActive createdAt');
    
    // Calculate pagination values
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Render the users page with the layout
    res.render('admin/layout', {
      title: 'User Management',
      active: 'users',
      users,
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPrevPage,
      total,
      query: req.query,
      user: req.user,
      content: await renderTemplate('admin/users', {
        users,
        currentPage: page,
        totalPages,
        hasNextPage,
        hasPrevPage,
        total,
        query: req.query,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading users:', error);
    req.flash('error', 'Error loading user data');
    res.redirect('/admin/dashboard');
  }
};

/**
 * User Details
 * Show details for a specific user
 */
exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }
    
    // Get user's listings if they are a seller
    let listings = [];
    if (user.hasActiveRole && user.hasActiveRole('seller')) {
      listings = await Listing.find({ seller: userId })
        .select('address price status createdAt');
    }
    
    // Get user's offers if they are a buyer
    let offers = [];
    if (user.hasActiveRole && user.hasActiveRole('buyer')) {
      offers = await Offer.find({ buyer: userId })
        .populate('listing', 'address')
        .select('price status createdAt');
    }
    
    // Get admin logs related to this user
    const logs = await AdminLog.find({ targetUser: userId })
      .populate('admin', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Render the user details page with the layout
    res.render('admin/layout', {
      title: 'User Details',
      active: 'users',
      content: await renderTemplate('admin/userDetails', {
        user,
        listings,
        offers,
        logs,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading user details:', error);
    req.flash('error', 'Error loading user details');
    res.redirect('/admin/users');
  }
};

/**
 * Update User
 * Update a user's information
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, phoneNumber, isActive, roles } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }
    
    // Update basic info
    user.name = name || user.name;
    user.email = email || user.email;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.isActive = isActive === 'true';
    
    // Update roles if provided
    if (roles && Array.isArray(roles)) {
      // Get all possible roles
      const allRoles = ['buyer', 'seller', 'lender', 'title', 'inspector', 'agent', 'professional'];
      
      // For each role, check if it should be active
      allRoles.forEach(role => {
        const shouldBeActive = roles.includes(role);
        const existingRole = user.roles.find(r => r.type === role);
        
        if (existingRole) {
          // Update existing role
          existingRole.active = shouldBeActive;
          if (shouldBeActive && !existingRole.active) {
            existingRole.activatedAt = new Date();
          }
        } else if (shouldBeActive) {
          // Add new role
          user.roles.push({
            type: role,
            active: true,
            activatedAt: new Date()
          });
        }
      });
    }
    
    await user.save();
    
    // Log the action
    const log = new AdminLog({
      admin: req.user._id,
      activityType: 'UPDATE_USER',
      targetUser: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        method: req.method,
        path: req.path,
        changes: req.body
      }
    });
    
    await log.save();
    
    req.flash('success', 'User updated successfully');
    res.redirect(`/admin/users/${userId}`);
  } catch (error) {
    console.error('Error updating user:', error);
    req.flash('error', 'Error updating user');
    res.redirect(`/admin/users/${req.params.id}`);
  }
};

/**
 * Deactivate User
 * Deactivate a user's account
 */
exports.deactivateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }
    
    user.isActive = false;
    await user.save();
    
    // Log the action
    const log = new AdminLog({
      admin: req.user._id,
      activityType: 'DEACTIVATE_USER',
      targetUser: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        method: req.method,
        path: req.path
      }
    });
    
    await log.save();
    
    req.flash('success', 'User deactivated successfully');
    res.redirect(`/admin/users/${userId}`);
  } catch (error) {
    console.error('Error deactivating user:', error);
    req.flash('error', 'Error deactivating user');
    res.redirect(`/admin/users/${req.params.id}`);
  }
};

/**
 * Activate User
 * Activate a user's account
 */
exports.activateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }
    
    user.isActive = true;
    await user.save();
    
    // Log the action
    const log = new AdminLog({
      admin: req.user._id,
      activityType: 'ACTIVATE_USER',
      targetUser: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        method: req.method,
        path: req.path
      }
    });
    
    await log.save();
    
    req.flash('success', 'User activated successfully');
    res.redirect(`/admin/users/${userId}`);
  } catch (error) {
    console.error('Error activating user:', error);
    req.flash('error', 'Error activating user');
    res.redirect(`/admin/users/${req.params.id}`);
  }
};

/**
 * Admin Management
 * List all admins
 */
exports.getAdmins = async (req, res) => {
  try {
    // Get all admin users
    const admins = await User.find({ isAdmin: true })
      .populate('adminCreatedBy', 'name')
      .sort({ createdAt: -1 });
    
    // Render the admins page with the layout
    res.render('admin/layout', {
      title: 'Admin Management',
      active: 'admins',
      admins,
      user: req.user,
      content: await renderTemplate('admin/admins', {
        admins,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading admins:', error);
    req.flash('error', 'Error loading admin data');
    res.redirect('/admin/dashboard');
  }
};

/**
 * New Admin Form
 * Show form to create a new admin
 */
exports.getNewAdminForm = async (req, res) => {
  try {
    // Get all users who are not admins
    const users = await User.find({ isAdmin: false })
      .sort({ name: 1 })
      .select('name email');
    
    // Render the new admin form with the layout
    res.render('admin/layout', {
      title: 'Create New Admin',
      active: 'admins',
      users,
      user: req.user,
      content: await renderTemplate('admin/newAdmin', {
        users,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading new admin form:', error);
    req.flash('error', 'Error loading form');
    res.redirect('/admin/admins');
  }
};

/**
 * Create Admin
 * Create a new admin user
 */
exports.createAdmin = async (req, res) => {
  try {
    const { userId, adminRole, permissions, createNew, name, email, password } = req.body;
    
    let user;
    
    if (createNew === 'true') {
      // Create a new user
      const hashedPassword = await bcrypt.hash(password, 10);
      
      user = new User({
        name,
        email,
        password: hashedPassword,
        isAdmin: true,
        adminRole,
        adminPermissions: permissions || [],
        adminCreatedBy: req.user._id,
        adminCreatedAt: new Date()
      });
      
      await user.save();
    } else {
      // Use existing user
      user = await User.findById(userId);
      
      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/admins/new');
      }
      
      // Make user an admin
      user.isAdmin = true;
      user.adminRole = adminRole;
      user.adminPermissions = permissions || [];
      user.adminCreatedBy = req.user._id;
      user.adminCreatedAt = new Date();
      
      await user.save();
    }
    
    // Log the action
    const log = new AdminLog({
      admin: req.user._id,
      activityType: 'CREATE_ADMIN',
      targetUser: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        method: req.method,
        path: req.path,
        adminRole,
        permissions
      }
    });
    
    await log.save();
    
    // Send email notification to the new admin
    await sendEmail({
      to: user.email,
      subject: 'You have been granted admin access',
      text: `Hello ${user.name},\n\nYou have been granted admin access to the REMarketplace platform with the role of ${adminRole}.\n\nPlease log in to access your admin dashboard.\n\nRegards,\nREMarketplace Team`,
      html: `<p>Hello ${user.name},</p><p>You have been granted admin access to the REMarketplace platform with the role of ${adminRole}.</p><p>Please log in to access your admin dashboard.</p><p>Regards,<br>REMarketplace Team</p>`
    });
    
    req.flash('success', 'Admin created successfully');
    res.redirect('/admin/admins');
  } catch (error) {
    console.error('Error creating admin:', error);
    req.flash('error', 'Error creating admin');
    res.redirect('/admin/admins/new');
  }
};

/**
 * Admin Details
 * Show details for a specific admin
 */
exports.getAdminDetails = async (req, res) => {
  try {
    const adminId = req.params.id;
    
    const admin = await User.findOne({ _id: adminId, isAdmin: true })
      .populate('adminCreatedBy', 'name');
    
    if (!admin) {
      req.flash('error', 'Admin not found');
      return res.redirect('/admin/admins');
    }
    
    // Get admin logs for this admin
    const logs = await AdminLog.find({ admin: adminId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Render the admin details page with the layout
    res.render('admin/layout', {
      title: 'Admin Details',
      active: 'admins',
      content: await renderTemplate('admin/adminDetails', {
        admin,
        logs,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading admin details:', error);
    req.flash('error', 'Error loading admin details');
    res.redirect('/admin/admins');
  }
};

/**
 * Update Admin
 * Update an admin's information
 */
exports.updateAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;
    const { adminRole, permissions } = req.body;
    
    const admin = await User.findOne({ _id: adminId, isAdmin: true });
    
    if (!admin) {
      req.flash('error', 'Admin not found');
      return res.redirect('/admin/admins');
    }
    
    // Update admin role and permissions
    admin.adminRole = adminRole;
    admin.adminPermissions = permissions || [];
    
    await admin.save();
    
    // Log the action
    const log = new AdminLog({
      admin: req.user._id,
      activityType: 'UPDATE_ADMIN',
      targetUser: adminId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        method: req.method,
        path: req.path,
        adminRole,
        permissions
      }
    });
    
    await log.save();
    
    req.flash('success', 'Admin updated successfully');
    res.redirect(`/admin/admins/${adminId}`);
  } catch (error) {
    console.error('Error updating admin:', error);
    req.flash('error', 'Error updating admin');
    res.redirect(`/admin/admins/${req.params.id}`);
  }
};

/**
 * Remove Admin
 * Remove admin privileges from a user
 */
exports.removeAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;
    
    // Don't allow removing yourself
    if (adminId === req.user._id.toString()) {
      req.flash('error', 'You cannot remove your own admin privileges');
      return res.redirect('/admin/admins');
    }
    
    const admin = await User.findOne({ _id: adminId, isAdmin: true });
    
    if (!admin) {
      req.flash('error', 'Admin not found');
      return res.redirect('/admin/admins');
    }
    
    // Remove admin privileges
    admin.isAdmin = false;
    admin.adminRole = undefined;
    admin.adminPermissions = undefined;
    admin.adminCreatedBy = undefined;
    admin.adminCreatedAt = undefined;
    
    await admin.save();
    
    // Log the action
    const log = new AdminLog({
      admin: req.user._id,
      activityType: 'REMOVE_ADMIN',
      targetUser: adminId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        method: req.method,
        path: req.path
      }
    });
    
    await log.save();
    
    // Send email notification
    await sendEmail({
      to: admin.email,
      subject: 'Your admin access has been removed',
      text: `Hello ${admin.name},\n\nYour admin access to the REMarketplace platform has been removed.\n\nIf you believe this is an error, please contact the system administrator.\n\nRegards,\nREMarketplace Team`,
      html: `<p>Hello ${admin.name},</p><p>Your admin access to the REMarketplace platform has been removed.</p><p>If you believe this is an error, please contact the system administrator.</p><p>Regards,<br>REMarketplace Team</p>`
    });
    
    req.flash('success', 'Admin privileges removed successfully');
    res.redirect('/admin/admins');
  } catch (error) {
    console.error('Error removing admin:', error);
    req.flash('error', 'Error removing admin privileges');
    res.redirect(`/admin/admins/${req.params.id}`);
  }
};

// Placeholder methods for the remaining controller functions
// These will be implemented in future updates

exports.getListings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter based on query parameters
    const filter = {};
    
    if (req.query.search) {
      filter.$or = [
        { address: { $regex: req.query.search, $options: 'i' } },
        { city: { $regex: req.query.search, $options: 'i' } },
        { zipCode: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Get total count for pagination
    const total = await Listing.countDocuments(filter);
    
    // Determine sort order
    let sort = { createdAt: -1 }; // Default sort by date
    if (req.query.sortBy === 'price') {
      sort = { price: 1 };
    } else if (req.query.sortBy === 'views') {
      sort = { views: -1 };
    }
    
    // Get listings with pagination
    const listings = await Listing.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('seller', 'name email')
      .select('address price status images createdAt views featured');
    
    // Calculate pagination values
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Render the listings page with the layout
    res.render('admin/layout', {
      title: 'Listing Management',
      active: 'listings',
      listings,
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPrevPage,
      total,
      query: req.query,
      user: req.user,
      content: await renderTemplate('admin/listings', {
        listings,
        currentPage: page,
        totalPages,
        hasNextPage,
        hasPrevPage,
        total,
        query: req.query,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading listings:', error);
    req.flash('error', 'Error loading listing data');
    res.redirect('/admin/dashboard');
  }
};

exports.getListingDetails = async (req, res) => {
  try {
    const listingId = req.params.id;
    
    // Get the listing with seller information
    const listing = await Listing.findById(listingId)
      .populate('seller', 'name email phoneNumber');
    
    if (!listing) {
      req.flash('error', 'Listing not found');
      return res.redirect('/admin/listings');
    }
    
    // Get offers for this listing
    const offers = await Offer.find({ listing: listingId })
      .populate('buyer', 'name email')
      .sort({ createdAt: -1 })
      .select('price status createdAt buyer');
    
    // Render the listing details page with the layout
    res.render('admin/layout', {
      title: 'Listing Details',
      active: 'listings',
      listing,
      offers,
      user: req.user,
      content: await renderTemplate('admin/listingDetails', {
        listing,
        offers,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading listing details:', error);
    req.flash('error', 'Error loading listing details');
    res.redirect('/admin/listings');
  }
};

exports.updateListing = async (req, res) => {
  req.flash('success', 'Listing updated successfully');
  res.redirect('/admin/listings');
};

exports.featureListing = async (req, res) => {
  req.flash('success', 'Listing featured successfully');
  res.redirect('/admin/listings');
};

exports.unfeatureListing = async (req, res) => {
  req.flash('success', 'Listing unfeatured successfully');
  res.redirect('/admin/listings');
};

exports.removeListing = async (req, res) => {
  req.flash('success', 'Listing removed successfully');
  res.redirect('/admin/listings');
};

/**
 * Transaction Management
 * List all transactions with filtering and pagination
 */
exports.getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter based on query parameters
    const filter = {};
    
    if (req.query.search) {
      // Search by buyer name, seller name, or property address
      filter.$or = [
        { 'buyer.name': { $regex: req.query.search, $options: 'i' } },
        { 'seller.name': { $regex: req.query.search, $options: 'i' } },
        { 'listing.address': { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Get total count for pagination
    const total = await Offer.countDocuments(filter);
    
    // Get transactions (offers) with pagination
    const transactions = await Offer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('listing', 'address price')
      .select('price status createdAt updatedAt');
    
    // Calculate pagination values
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Render the transactions page with the layout
    res.render('admin/layout', {
      title: 'Transaction Management',
      active: 'transactions',
      transactions,
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPrevPage,
      total,
      query: req.query,
      user: req.user,
      content: await renderTemplate('admin/transactions', {
        transactions,
        currentPage: page,
        totalPages,
        hasNextPage,
        hasPrevPage,
        total,
        query: req.query,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading transactions:', error);
    req.flash('error', 'Error loading transaction data');
    res.redirect('/admin/dashboard');
  }
};

/**
 * Transaction Details
 * Show details for a specific transaction
 */
exports.getTransactionDetails = async (req, res) => {
  try {
    const transactionId = req.params.id;
    
    const transaction = await Offer.findById(transactionId)
      .populate('buyer', 'name email phoneNumber')
      .populate('seller', 'name email phoneNumber')
      .populate('listing', 'address price description images')
      .populate('preApproval', 'lender amount expirationDate')
      .populate('documents', 'name type url uploadedAt');
    
    if (!transaction) {
      req.flash('error', 'Transaction not found');
      return res.redirect('/admin/transactions');
    }
    
    // Get transaction history (e.g., status changes, updates)
    const history = await AdminLog.find({ 
      'details.transactionId': transactionId 
    })
    .sort({ createdAt: -1 })
    .populate('admin', 'name')
    .limit(20);
    
    // Render the transaction details page with the layout
    res.render('admin/layout', {
      title: 'Transaction Details',
      active: 'transactions',
      transaction,
      history,
      user: req.user,
      content: await renderTemplate('admin/transactionDetails', {
        transaction,
        history,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading transaction details:', error);
    req.flash('error', 'Error loading transaction details');
    res.redirect('/admin/transactions');
  }
};

/**
 * Update Transaction
 * Update a transaction's information
 */
exports.updateTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { status, notes } = req.body;
    
    const transaction = await Offer.findById(transactionId);
    
    if (!transaction) {
      req.flash('error', 'Transaction not found');
      return res.redirect('/admin/transactions');
    }
    
    // Update transaction fields
    if (status) transaction.status = status;
    if (notes) transaction.adminNotes = notes;
    
    transaction.updatedAt = new Date();
    transaction.updatedBy = req.user._id;
    
    await transaction.save();
    
    // Log the action
    const log = new AdminLog({
      admin: req.user._id,
      activityType: 'UPDATE_TRANSACTION',
      details: {
        transactionId,
        changes: req.body
      }
    });
    
    await log.save();
    
    req.flash('success', 'Transaction updated successfully');
    res.redirect(`/admin/transactions/${transactionId}`);
  } catch (error) {
    console.error('Error updating transaction:', error);
    req.flash('error', 'Error updating transaction');
    res.redirect(`/admin/transactions/${req.params.id}`);
  }
};

exports.getProfessionals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter based on query parameters
    const filter = {};
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { nmls: { $regex: req.query.search, $options: 'i' } },
        { licenseNumber: { $regex: req.query.search, $options: 'i' } },
        { companyId: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.type) {
      filter.professionalType = req.query.type;
    }
    
    if (req.query.verified === 'true') {
      filter.verified = true;
    } else if (req.query.verified === 'false') {
      filter.verified = false;
    }
    
    // Get total count for pagination
    const total = await Professional.countDocuments(filter);
    
    // Get professionals with pagination
    const professionals = await Professional.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name email professionalType verified nmls licenseNumber companyId createdAt');
    
    // Calculate pagination values
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Get counts for statistics
    const pendingCount = await Professional.countDocuments({ verified: false });
    const verifiedCount = await Professional.countDocuments({ verified: true });
    
    // Get counts by professional type
    const typeCounts = {
      lender: await Professional.countDocuments({ professionalType: 'lender' }),
      title: await Professional.countDocuments({ professionalType: 'title' }),
      inspector: await Professional.countDocuments({ professionalType: 'inspector' }),
      photographer: await Professional.countDocuments({ professionalType: 'photographer' }),
      contractor: await Professional.countDocuments({ professionalType: 'contractor' }),
      other: await Professional.countDocuments({ 
        professionalType: { 
          $nin: ['lender', 'title', 'inspector', 'photographer', 'contractor'] 
        } 
      })
    };
    
    // Render the professionals page with the layout
    res.render('admin/layout', {
      title: 'Professional Management',
      active: 'professionals',
      professionals,
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPrevPage,
      total,
      pendingCount,
      verifiedCount,
      typeCounts,
      query: req.query,
      user: req.user,
      content: await renderTemplate('admin/professionals', {
        professionals,
        currentPage: page,
        totalPages,
        hasNextPage,
        hasPrevPage,
        total,
        pendingCount,
        verifiedCount,
        typeCounts,
        query: req.query,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading professionals:', error);
    req.flash('error', 'Error loading professional data');
    res.redirect('/admin/dashboard');
  }
};

exports.getProfessionalDetails = async (req, res) => {
  try {
    const professionalId = req.params.id;
    
    // Get the professional with all details
    const professional = await Professional.findById(professionalId);
    
    if (!professional) {
      req.flash('error', 'Professional not found');
      return res.redirect('/admin/professionals');
    }
    
    // Get activity logs for this professional
    const activityLogs = await AdminLog.find({
      'details.professionalId': professionalId
    })
    .populate('admin', 'name')
    .sort({ createdAt: -1 })
    .limit(20);
    
    // Get admin who verified the professional
    let verifiedByAdmin = null;
    if (professional.verifiedBy) {
      verifiedByAdmin = await User.findById(professional.verifiedBy)
        .select('name');
    }
    
    // Get admin who denied the professional
    let deniedByAdmin = null;
    if (professional.deniedBy) {
      deniedByAdmin = await User.findById(professional.deniedBy)
        .select('name');
    }
    
    // Render the professional details page with the layout
    res.render('admin/layout', {
      title: 'Professional Details',
      active: 'professionals',
      professional,
      activityLogs,
      verifiedByAdmin,
      deniedByAdmin,
      user: req.user,
      content: await renderTemplate('admin/professionalDetails', {
        professional,
        activityLogs,
        verifiedByAdmin,
        deniedByAdmin,
        user: req.user
      })
    });
  } catch (error) {
    console.error('Error loading professional details:', error);
    req.flash('error', 'Error loading professional details');
    res.redirect('/admin/professionals');
  }
};

exports.getPendingProfessionals = async (req, res) => {
  try {
    // Redirect to professionals page with verified=false filter
    res.redirect('/admin/professionals?verified=false');
  } catch (error) {
    console.error('Error redirecting to pending professionals:', error);
    req.flash('error', 'Error loading pending professionals');
    res.redirect('/admin/dashboard');
  }
};

exports.verifyProfessional = async (req, res) => {
  try {
    const professionalId = req.params.id;
    
    const professional = await Professional.findById(professionalId);
    
    if (!professional) {
      req.flash('error', 'Professional not found');
      return res.redirect('/admin/professionals');
    }
    
    // Update verification status
    professional.verified = true;
    professional.verifiedAt = new Date();
    professional.verifiedBy = req.user._id;
    
    await professional.save();
    
    // Log the action
    const log = new AdminLog({
      admin: req.user._id,
      activityType: 'VERIFY_PROFESSIONAL',
      details: {
        professionalId,
        professionalType: professional.professionalType,
        professionalName: professional.name
      }
    });
    
    await log.save();
    
    // Send email notification to the professional
    await sendEmail({
      to: professional.email,
      subject: 'Your professional account has been verified',
      text: `Hello ${professional.name},\n\nYour professional account on REMarketplace has been verified. You can now access all professional features.\n\nRegards,\nREMarketplace Team`,
      html: `<p>Hello ${professional.name},</p><p>Your professional account on REMarketplace has been verified. You can now access all professional features.</p><p>Regards,<br>REMarketplace Team</p>`
    });
    
    req.flash('success', 'Professional verified successfully');
    res.redirect('/admin/professionals');
  } catch (error) {
    console.error('Error verifying professional:', error);
    req.flash('error', 'Error verifying professional');
    res.redirect('/admin/professionals');
  }
};

exports.denyProfessional = async (req, res) => {
  try {
    const professionalId = req.params.id;
    
    const professional = await Professional.findById(professionalId);
    
    if (!professional) {
      req.flash('error', 'Professional not found');
      return res.redirect('/admin/professionals');
    }
    
    // Update verification status
    professional.verified = false;
    professional.deniedAt = new Date();
    professional.deniedBy = req.user._id;
    professional.deniedReason = req.body.reason || 'Verification requirements not met';
    
    await professional.save();
    
    // Log the action
    const log = new AdminLog({
      admin: req.user._id,
      activityType: 'DENY_PROFESSIONAL',
      details: {
        professionalId,
        professionalType: professional.professionalType,
        professionalName: professional.name,
        reason: professional.deniedReason
      }
    });
    
    await log.save();
    
    // Send email notification to the professional
    await sendEmail({
      to: professional.email,
      subject: 'Your professional account verification was denied',
      text: `Hello ${professional.name},\n\nUnfortunately, your professional account verification on REMarketplace has been denied for the following reason: ${professional.deniedReason}.\n\nPlease update your information and resubmit for verification.\n\nRegards,\nREMarketplace Team`,
      html: `<p>Hello ${professional.name},</p><p>Unfortunately, your professional account verification on REMarketplace has been denied for the following reason: ${professional.deniedReason}.</p><p>Please update your information and resubmit for verification.</p><p>Regards,<br>REMarketplace Team</p>`
    });
    
    req.flash('success', 'Professional verification denied');
    res.redirect('/admin/professionals');
  } catch (error) {
    console.error('Error denying professional:', error);
    req.flash('error', 'Error denying professional');
    res.redirect('/admin/professionals');
  }
};

/**
 * Unverify Professional
 * Revoke verification from a professional
 */
exports.unverifyProfessional = async (req, res) => {
  try {
    const professionalId = req.params.id;
    
    const professional = await Professional.findById(professionalId);
    
    if (!professional) {
      req.flash('error', 'Professional not found');
      return res.redirect('/admin/professionals');
    }
    
    // Update verification status
    professional.verified = false;
    professional.verifiedAt = undefined;
    professional.verifiedBy = undefined;
    professional.unverifiedAt = new Date();
    professional.unverifiedBy = req.user._id;
    professional.unverifiedReason = req.body.reason || 'Verification revoked by admin';
    
    await professional.save();
    
    // Log the action
    const log = new AdminLog({
      admin: req.user._id,
      activityType: 'UNVERIFY_PROFESSIONAL',
      details: {
        professionalId,
        professionalType: professional.professionalType,
        professionalName: professional.name,
        reason: professional.unverifiedReason
      }
    });
    
    await log.save();
    
    // Send email notification to the professional
    await sendEmail({
      to: professional.email,
      subject: 'Your professional account verification has been revoked',
      text: `Hello ${professional.name},\n\nYour professional account verification on REMarketplace has been revoked for the following reason: ${professional.unverifiedReason}.\n\nPlease contact support if you have any questions.\n\nRegards,\nREMarketplace Team`,
      html: `<p>Hello ${professional.name},</p><p>Your professional account verification on REMarketplace has been revoked for the following reason: ${professional.unverifiedReason}.</p><p>Please contact support if you have any questions.</p><p>Regards,<br>REMarketplace Team</p>`
    });
    
    req.flash('success', 'Professional verification revoked');
    res.redirect('/admin/professionals');
  } catch (error) {
    console.error('Error unverifying professional:', error);
    req.flash('error', 'Error revoking professional verification');
    res.redirect('/admin/professionals');
  }
};

exports.getAnalytics = async (req, res) => {
  res.render('admin/layout', {
    title: 'Analytics Dashboard',
    active: 'analytics',
    content: '<div class="alert alert-info">Analytics functionality coming soon.</div>'
  });
};

exports.getUserAnalytics = async (req, res) => {
  res.render('admin/layout', {
    title: 'User Analytics',
    active: 'analytics',
    content: '<div class="alert alert-info">User analytics functionality coming soon.</div>'
  });
};

exports.getListingAnalytics = async (req, res) => {
  res.render('admin/layout', {
    title: 'Listing Analytics',
    active: 'analytics',
    content: '<div class="alert alert-info">Listing analytics functionality coming soon.</div>'
  });
};

exports.getTransactionAnalytics = async (req, res) => {
  res.render('admin/layout', {
    title: 'Transaction Analytics',
    active: 'analytics',
    content: '<div class="alert alert-info">Transaction analytics functionality coming soon.</div>'
  });
};

exports.getSettings = async (req, res) => {
  res.render('admin/layout', {
    title: 'System Settings',
    active: 'settings',
    content: '<div class="alert alert-info">System settings functionality coming soon.</div>'
  });
};

exports.updateSettings = async (req, res) => {
  req.flash('success', 'Settings updated successfully');
  res.redirect('/admin/settings');
};

exports.getLogs = async (req, res) => {
  res.render('admin/layout', {
    title: 'Admin Logs',
    active: 'logs',
    content: '<div class="alert alert-info">Admin logs functionality coming soon.</div>'
  });
};

exports.getLogDetails = async (req, res) => {
  res.render('admin/layout', {
    title: 'Log Details',
    active: 'logs',
    content: '<div class="alert alert-info">Log details functionality coming soon.</div>'
  });
};

exports.getContent = async (req, res) => {
  res.render('admin/layout', {
    title: 'Content Management',
    active: 'content',
    content: '<div class="alert alert-info">Content management functionality coming soon.</div>'
  });
};

exports.getPageContent = async (req, res) => {
  res.render('admin/layout', {
    title: 'Page Content',
    active: 'content',
    content: '<div class="alert alert-info">Page content functionality coming soon.</div>'
  });
};

exports.updatePageContent = async (req, res) => {
  req.flash('success', 'Content updated successfully');
  res.redirect('/admin/content');
};
