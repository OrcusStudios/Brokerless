/**
 * Create Super Admin Script
 * 
 * This script creates a new Super Admin user in the database.
 * Run this script with Node.js to create the first admin user:
 * 
 * node scripts/createSuperAdmin.js
 * 
 * You will be prompted to enter details for the new Super Admin user.
 */

const mongoose = require('mongoose');
const readline = require('readline');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    createSuperAdmin();
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Function to create a new Super Admin
async function createSuperAdmin() {
  try {
    console.log('\n=== Create Super Admin User ===\n');
    
    // Get user details
    const name = await askQuestion('Enter name: ');
    const email = await askQuestion('Enter email: ');
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error(`❌ A user with email ${email} already exists.`);
      const makeAdmin = await askQuestion('Would you like to make this existing user a Super Admin? (y/n): ');
      
      if (makeAdmin.toLowerCase() === 'y' || makeAdmin.toLowerCase() === 'yes') {
        return updateExistingUser(existingUser);
      } else {
        console.log('Operation cancelled.');
        mongoose.connection.close();
        rl.close();
        return;
      }
    }
    
    const password = await askQuestion('Enter password (min 8 characters): ');
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters long.');
      return createSuperAdmin();
    }
    
    // Hash the password with the same configuration as used in the User model
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    console.log('Password hashing details:');
    console.log('- Salt rounds:', 10);
    console.log('- Password length:', password.length);
    console.log('- Hashed password length:', hashedPassword.length);
    
    // Create the user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      isAdmin: true,
      adminRole: 'SUPER_ADMIN',
      adminPermissions: [
        'MANAGE_USERS',
        'MANAGE_ADMINS',
        'MANAGE_LISTINGS',
        'MANAGE_TRANSACTIONS',
        'MANAGE_CONTENT',
        'VIEW_ANALYTICS',
        'SYSTEM_SETTINGS'
      ],
      adminCreatedAt: new Date(),
      roles: [
        {
          type: 'buyer',
          active: true,
          activatedAt: new Date()
        }
      ]
    });
    
    await user.save();
    
    console.log(`\n✅ Super Admin created successfully!`);
    console.log(`\nName: ${name}`);
    console.log(`Email: ${email}`);
    console.log('\nYou can now log in with these credentials and access the admin panel at /admin/dashboard');
    
    // Close the connection and exit
    mongoose.connection.close();
    rl.close();
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error);
    mongoose.connection.close();
    rl.close();
  }
}

// Function to update an existing user to be a Super Admin
async function updateExistingUser(user) {
  try {
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
    rl.close();
  } catch (error) {
    console.error('❌ Error updating user to Super Admin:', error);
    mongoose.connection.close();
    rl.close();
  }
}

// Helper function to ask a question and get the answer
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Handle readline close
rl.on('close', () => {
  process.exit(0);
});
