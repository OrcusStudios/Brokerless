/**
 * Make Super Admin Script
 * 
 * This script makes a specific user a Super Admin.
 * Run this script with Node.js:
 * 
 * node scripts/makeSuperAdmin.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// User ID to make Super Admin
const USER_ID = '67fefcdfb42f7b66d5dd80b2';

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    makeSuperAdmin();
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Function to make a user a Super Admin
async function makeSuperAdmin() {
  try {
    // Find the user by ID
    const user = await User.findById(USER_ID);
    
    if (!user) {
      console.error(`❌ User with ID ${USER_ID} not found.`);
      mongoose.connection.close();
      process.exit(1);
    }
    
    console.log(`Found user: ${user.name} (${user.email})`);
    
    // Update the user to be a Super Admin
    user.isAdmin = true;
    user.adminRole = 'SUPER_ADMIN';
    user.adminPermissions = [
      'MANAGE_USERS',
      'MANAGE_ADMINS',
      'MANAGE_LISTINGS',
      'MANAGE_TRANSACTIONS',
      'MANAGE_CONTENT',
      'VIEW_ANALYTICS',
      'SYSTEM_SETTINGS'
    ];
    user.adminCreatedAt = new Date();
    
    await user.save();
    
    console.log(`\n✅ ${user.name} is now a Super Admin!`);
    console.log('You can now log in with this user and access the admin panel at /admin/dashboard');
    
    // Close the connection and exit
    mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.error('❌ Error making Super Admin:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
