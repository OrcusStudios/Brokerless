const User = require("../models/User");
const Offer = require("../models/Offer");
const Listing = require("../models/Listing");
const PreApproval = require("../models/PreApproval");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const Notification = require("../models/Notification");
const Schedule = require("../models/Schedule");
const crypto = require("crypto");
const { sendEmail } = require("../utils/emailService");
const cloudinary = require("../routes/cloudinary");
const path = require("path");
const fs = require("fs");

// Show registration form
exports.showRegisterForm = (req, res) => {
    res.render("register");
};

// Handle user registration
exports.registerUser = async (req, res, next) => {
    try {
        const { name, email, password, confirmPassword, phoneNumber } = req.body;
                
        // Validate password match
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/users/register');
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'User already exists');
            return res.redirect('/users/register');
        }

        // Process roles - handle both array and single values
        let userRoles = [];
        
        if (req.body.roles) {
            // If roles is already an array, use it
            if (Array.isArray(req.body.roles)) {
                userRoles = req.body.roles.map(role => ({ type: role, active: true }));
            } 
            // If roles is a single string, make it an array with one element
            else {
                userRoles = [{ type: req.body.roles, active: true }];
            }
        } else {
            // Default to buyer if no role selected
            userRoles = [{ type: "buyer", active: true }];
        }
                
        // Create new user (password hashing happens in pre-save middleware)
        const newUser = new User({
            name,
            email,
            password,
            phoneNumber,
            roles: userRoles
        });

        await newUser.save();
        
        // Initialize buyer data if they have the buyer role
        if (userRoles.some(r => r.type === "buyer")) {
            newUser.buyer = {
                savedListings: [],
                preApprovalStatus: "none",
                searchPreferences: {
                    priceRange: { min: 0 }
                }
            };
        }
        
        // Initialize seller data if they have the seller role
        if (userRoles.some(r => r.type === "seller")) {
            newUser.seller = {
                listings: [],
                verificationStatus: "unverified"
            };
        }
        
        // Save again with role-specific data
        await newUser.save();

        // Log in the user
        req.login(newUser, (err) => {
            if (err) {
                console.error(err);
                return res.redirect('/users/login');
            }
            req.flash('success', 'Registration successful');
            return res.redirect('/users/dashboard');
        });
    } catch (error) {
        req.flash('error', 'Registration failed');
        res.redirect('/');
    }
};

exports.getDashboard = async (req, res) => {
    try {
        if (!req.user) {
            console.error("❌ No user session detected.");
            return res.status(401).send("Unauthorized");
        }

        // Get all active roles
        const activeRoles = req.user.getActiveRoles();
        
        // Arrays to store role-specific data
        let buyerData = { offers: [], showings: [] };
        let sellerData = { listings: [], receivedOffers: [], showings: [] };
        let lenderData = { applicants: [] };
        let professionalData = { appointments: [] };
        
        // Common data for all users
        const notifications = await Notification.find({ user: req.user._id, isRead: false })
            .sort({ createdAt: -1 })
            .lean();

        // Fetch data based on user roles
        if (activeRoles.includes("buyer")) {
            // Buyer's offers
            buyerData.offers = await Offer.find({ buyer: req.user._id })
                .populate("listing", "address city state zip photos price")
                .lean();
                
            // Buyer's showings
            buyerData.showings = await Schedule.find({ buyer: req.user._id })
                .populate("listing", "address city state zip photos")
                .lean();
                
            // Saved listings
            buyerData.savedListings = await Listing.find({ 
                _id: { $in: req.user.buyer.savedListings } 
            }).lean();
            
            // Pre-approval info from User model
            buyerData.preApprovalStatus = req.user.buyer.preApprovalStatus;
            
            // Get full PreApproval document with populated lender
            const preApproval = await PreApproval.findOne({ 
                buyer: req.user._id 
            })
            .populate('lender', 'name companyName')
            .sort({ createdAt: -1 });
            
            if (preApproval) {
                buyerData.preApproval = preApproval;
            } else {
                // Create a default preApproval object with data from user model
                buyerData.preApproval = {
                    lenderName: "Not Specified",
                    approvalAmount: req.user.buyer.preApprovalAmount,
                    expirationDate: req.user.buyer.preApprovalExpiration,
                    createdAt: req.user.buyer.preApprovalDate,
                    status: req.user.buyer.preApprovalStatus
                };
            }
                        
            // Lender info if available
            if (req.user.buyer.preApprovalLender) {
                buyerData.preApprovalLender = await User.findById(
                    req.user.buyer.preApprovalLender, 
                    "name company email"
                );
            }
        }

        if (activeRoles.includes("seller")) {
            // Seller's listings
            sellerData.listings = await Listing.find({ seller: req.user._id }).lean();
            
            // Offers received on seller's listings
            sellerData.receivedOffers = await Offer.find({ seller: req.user._id })
                .populate("buyer", "name email")
                .populate("listing", "address city state zip photos price")
                .lean();
                
            // Showing requests for seller's properties
            sellerData.showings = await Schedule.find({ seller: req.user._id })
                .populate("buyer", "name email")
                .populate("listing", "address city state zip photos")
                .lean();
        }
        
        if (activeRoles.includes("lender")) {
            // Lender's applicants
            lenderData.applicants = await Promise.all(req.user.lender.applicants.map(async (applicant) => {
                const buyer = await User.findById(applicant.buyer, "name email phoneNumber");
                return {
                    ...applicant.toObject(),
                    buyer
                };
            }));
        }
        
        if (activeRoles.includes("professional")) {
            // Professional's appointments (inspector, title, etc.)
            professionalData.appointments = await Schedule.find({ 
                $or: [
                    { inspector: req.user._id },
                    { titleAgent: req.user._id }
                ]
            })
            .populate("listing", "address city state zip photos")
            .populate("buyer", "name email")
            .populate("seller", "name email")
            .lean();
        }

        // Determine which dashboard view to render based on active roles
        let dashboardView = "dashboard"; // default view
        
        // For professionals, use their specific dashboard if they only have that role
        if (activeRoles.length === 1) {
            if (activeRoles[0] === "lender") {
                dashboardView = "professionals/lenderDashboard";
            } else if (activeRoles[0] === "title") {
                dashboardView = "professionals/titleDashboard";
            } else if (activeRoles[0] === "inspector") {
                dashboardView = "professionals/inspectorDashboard";
            }
        }
        
        // Combine user data and buyerData.preApprovalStatus for template compatibility
        const userData = req.user.toObject ? req.user.toObject() : {...req.user};
        userData.preApprovalStatus = buyerData.preApprovalStatus;
        userData.preApproval = buyerData.preApproval;
        
        // Render the appropriate dashboard view with all data
        res.render(dashboardView, {
            user: userData,
            roles: activeRoles,
            notifications,
            buyerData,
            sellerData,
            lenderData,
            professionalData
        });
    } catch (error) {
        console.error("❌ Error loading dashboard:", error);
        res.status(500).send("Error loading dashboard: " + error.message);
    }
};

// Profile Management
exports.getProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).send("Unauthorized");
        }

        // Helper function for role icons
        const getRoleIcon = (role) => {
            const icons = {
                'buyer': 'fas fa-home',
                'seller': 'fas fa-tag',
                'lender': 'fas fa-hand-holding-usd',
                'title': 'fas fa-file-contract',
                'inspector': 'fas fa-clipboard-check',
                'agent': 'fas fa-user-tie',
                'professional': 'fas fa-briefcase'
            };
            return icons[role] || 'fas fa-user';
        };
        
        res.render("profile", {
            user: req.user,
            roles: req.user.getActiveRoles(),
            getRoleIcon
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).send("Error loading profile");
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, phoneNumber, street, city, state, zipCode, country, roles } = req.body;
        
        const user = await User.findById(req.user._id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/users/profile');
        }
        
        // Update basic info
        user.name = name || user.name;
        user.phoneNumber = phoneNumber || user.phoneNumber;
        
        // Update address
        user.address = {
            street: street || user.address?.street,
            city: city || user.address?.city,
            state: state || user.address?.state,
            zipCode: zipCode || user.address?.zipCode,
            country: country || user.address?.country || "USA"
        };
        
        // Update roles (only buyer and seller)
        const availableRoles = ['buyer', 'seller'];
        
        // Convert roles to array if it's not already (handles single selection)
        const selectedRoles = Array.isArray(roles) ? roles : (roles ? [roles] : []);
        
        // Update each role's active status
        availableRoles.forEach(role => {
            // Find if user already has this role
            const existingRoleIndex = user.roles.findIndex(r => r.type === role);
            
            if (selectedRoles.includes(role)) {
                // Role should be active
                if (existingRoleIndex >= 0) {
                    // Update existing role to active
                    user.roles[existingRoleIndex].active = true;
                } else {
                    // Add new role
                    user.roles.push({
                        type: role,
                        active: true,
                        activatedAt: new Date()
                    });
                }
            } else if (existingRoleIndex >= 0) {
                // Role exists but should be inactive
                user.roles[existingRoleIndex].active = false;
            }
        });
        
        await user.save();
        
        req.flash('success', 'Profile updated successfully');
        res.redirect('/users/profile');
    } catch (error) {
        console.error("Error updating profile:", error);
        req.flash('error', 'Failed to update profile');
        res.redirect('/users/profile');
    }
};

exports.updateProfileImage = async (req, res) => {
    try {
        if (!req.files || !req.files.profileImage) {
            req.flash('error', 'No image uploaded');
            return res.redirect('/users/profile');
        }
        
        const image = req.files.profileImage;
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(image.tempFilePath, {
            folder: "user_profiles",
            transformation: [{ width: 500, height: 500, crop: "fill" }]
        });
        
        // Update user record
        await User.findByIdAndUpdate(req.user._id, {
            profileImage: result.secure_url
        });
        
        // Clean up temp file if exists
        if (image.tempFilePath && fs.existsSync(image.tempFilePath)) {
            fs.unlinkSync(image.tempFilePath);
        }
        
        req.flash('success', 'Profile image updated');
        res.redirect('/users/profile');
    } catch (error) {
        console.error("Error updating profile image:", error);
        req.flash('error', 'Failed to update profile image');
        res.redirect('/users/profile');
    }
};

exports.updateNotificationPreferences = async (req, res) => {
    try {
        const { email, sms, pushNotifications, marketingEmails } = req.body;
        
        const preferences = {
            email: email === "on",
            sms: sms === "on",
            pushNotifications: pushNotifications === "on",
            marketingEmails: marketingEmails === "on"
        };
        
        await User.findByIdAndUpdate(req.user._id, {
            notificationPreferences: preferences
        });
        
        req.flash('success', 'Notification preferences updated');
        res.redirect('/users/profile');
    } catch (error) {
        console.error("Error updating notification preferences:", error);
        req.flash('error', 'Failed to update notification preferences');
        res.redirect('/users/profile');
    }
};

// Role Management

exports.activateBuyerRole = async (req, res) => {
    try {
        const { priceMin, priceMax, bedrooms, bathrooms, propertyTypes, locations } = req.body;
        
        const user = await User.findById(req.user._id);
        
        // Add preferences if provided
        const preferences = {};
        if (priceMin || priceMax) {
            preferences.priceRange = {
                min: priceMin || 0,
                max: priceMax || undefined
            };
        }
        if (bedrooms) preferences.bedrooms = bedrooms;
        if (bathrooms) preferences.bathrooms = bathrooms;
        if (propertyTypes) preferences.propertyTypes = propertyTypes.split(',').map(p => p.trim());
        if (locations) preferences.locations = locations.split(',').map(l => l.trim());
        
        await user.activateBuyerWithPreferences(preferences);
        
        req.flash('success', 'Buyer role activated');
        res.redirect('/users/dashboard');
    } catch (error) {
        console.error("Error activating buyer role:", error);
        req.flash('error', 'Failed to activate buyer role');
        res.redirect('/users/profile');
    }
};

exports.activateSellerRole = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        await user.addRole('seller');
        
        req.flash('success', 'Seller role activated');
        res.redirect('/users/dashboard');
    } catch (error) {
        console.error("Error activating seller role:", error);
        req.flash('error', 'Failed to activate seller role');
        res.redirect('/users/profile');
    }
};

exports.activateProfessionalRole = async (req, res) => {
    try {
        const { professionalType, company, license, yearsExperience, specialties, serviceAreas } = req.body;
        
        const user = await User.findById(req.user._id);
        
        // Add the professional role
        await user.addRole(professionalType);
        
        // Update professional information
        user.professional = {
            type: professionalType,
            company: company,
            license: license,
            yearsExperience: yearsExperience,
            specialties: specialties ? specialties.split(',').map(s => s.trim()) : [],
            serviceAreas: serviceAreas ? serviceAreas.split(',').map(a => a.trim()) : []
        };
        
        // If it's a lender, also initialize lender information
        if (professionalType === 'lender') {
            user.lender = {
                company: company,
                license: license,
                specialties: specialties ? specialties.split(',').map(s => s.trim()) : []
            };
        }
        
        await user.save();
        
        req.flash('success', `${professionalType} role activated`);
        res.redirect('/users/dashboard');
    } catch (error) {
        console.error("Error activating professional role:", error);
        req.flash('error', 'Failed to activate professional role');
        res.redirect('/users/profile');
    }
};

exports.deactivateRole = async (req, res) => {
    try {
        const roleType = req.params.role;
        
        if (!roleType || !['buyer', 'seller', 'lender', 'inspector', 'title', 'agent'].includes(roleType)) {
            req.flash('error', 'Invalid role type');
            return res.redirect('/users/profile');
        }
        
        const user = await User.findById(req.user._id);
        await user.deactivateRole(roleType);
        
        req.flash('success', `${roleType} role deactivated`);
        res.redirect('/users/profile');
    } catch (error) {
        console.error("Error deactivating role:", error);
        req.flash('error', 'Failed to deactivate role');
        res.redirect('/users/profile');
    }
};

// Buyer-specific actions

exports.saveListing = async (req, res) => {
    try {
        const listingId = req.params.id;
        
        const user = await User.findById(req.user._id);
        await user.saveListing(listingId);
        
        if (req.xhr) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'Listing saved');
        res.redirect(`/listings/${listingId}`);
    } catch (error) {
        console.error("Error saving listing:", error);
        if (req.xhr) {
            return res.status(500).json({ error: 'Failed to save listing' });
        }
        req.flash('error', 'Failed to save listing');
        res.redirect('/listings');
    }
};

exports.unsaveListing = async (req, res) => {
    try {
        const listingId = req.params.id;
        
        const user = await User.findById(req.user._id);
        await user.unsaveListing(listingId);
        
        if (req.xhr) {
            return res.json({ success: true });
        }
        
        req.flash('success', 'Listing removed from saved listings');
        res.redirect(`/listings/${listingId}`);
    } catch (error) {
        console.error("Error removing saved listing:", error);
        if (req.xhr) {
            return res.status(500).json({ error: 'Failed to remove listing' });
        }
        req.flash('error', 'Failed to remove listing from saved listings');
        res.redirect('/listings');
    }
};

exports.getSavedListings = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('buyer.savedListings');
        
        res.render('listings/saved', {
            listings: user.buyer.savedListings,
            user: req.user
        });
    } catch (error) {
        console.error("Error fetching saved listings:", error);
        req.flash('error', 'Failed to load saved listings');
        res.redirect('/listings');
    }
};

exports.updateSearchPreferences = async (req, res) => {
    try {
        const { priceMin, priceMax, bedrooms, bathrooms, propertyTypes, locations, amenities } = req.body;
        
        const preferences = {
            priceRange: {
                min: priceMin || 0,
                max: priceMax || undefined
            },
            bedrooms: bedrooms || undefined,
            bathrooms: bathrooms || undefined,
            propertyTypes: propertyTypes ? propertyTypes.split(',').map(p => p.trim()) : undefined,
            locations: locations ? locations.split(',').map(l => l.trim()) : undefined,
            amenities: amenities ? amenities.split(',').map(a => a.trim()) : undefined
        };
        
        await User.findByIdAndUpdate(req.user._id, {
            'buyer.searchPreferences': preferences
        });
        
        req.flash('success', 'Search preferences updated');
        res.redirect('/listings');
    } catch (error) {
        console.error("Error updating search preferences:", error);
        req.flash('error', 'Failed to update search preferences');
        res.redirect('/listings');
    }
};

// Seller-specific actions

exports.getVerificationStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        res.render('seller/verification', {
            status: user.seller.verificationStatus,
            user: req.user
        });
    } catch (error) {
        console.error("Error fetching verification status:", error);
        req.flash('error', 'Failed to load verification status');
        res.redirect('/users/dashboard');
    }
};

exports.requestVerification = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        // Only allow requesting verification if currently unverified
        if (user.seller.verificationStatus === 'unverified') {
            user.seller.verificationStatus = 'pending';
            await user.save();
            
            // Create notification for admin (if implemented)
            // await Notification.create({
            //     type: 'VERIFICATION_REQUEST',
            //     user: /* admin ID */,
            //     title: 'New Seller Verification Request',
            //     content: `${user.name} (${user.email}) has requested seller verification.`,
            //     link: `/admin/verifications`
            // });
            
            req.flash('success', 'Verification request submitted');
        } else {
            req.flash('info', 'Verification already in progress or completed');
        }
        
        res.redirect('/users/seller/verification');
    } catch (error) {
        console.error("Error requesting verification:", error);
        req.flash('error', 'Failed to request verification');
        res.redirect('/users/seller/verification');
    }
};

exports.updatePaymentInfo = async (req, res) => {
    try {
        const { accountType, accountDetails } = req.body;
        
        await User.findByIdAndUpdate(req.user._id, {
            'seller.paymentInfo': {
                accountType,
                accountDetails
            }
        });
        
        req.flash('success', 'Payment information updated');
        res.redirect('/users/profile');
    } catch (error) {
        console.error("Error updating payment info:", error);
        req.flash('error', 'Failed to update payment information');
        res.redirect('/users/profile');
    }
};

// Password management

exports.showForgotPasswordForm = (req, res) => {
    res.render('forgotPassword');
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists for security reasons
            req.flash('info', 'If that email exists in our system, you will receive reset instructions');
            return res.redirect('/users/login');
        }
        
        // Generate reset token
        const resetToken = await user.generatePasswordResetToken();
        
        // Send email with reset link
        const resetUrl = `${req.protocol}://${req.get('host')}/users/reset-password/${resetToken}`;
        
        await sendEmail({
            to: user.email,
            subject: 'Password Reset',
            text: `To reset your password, please visit: ${resetUrl}.\nThis link is valid for 30 minutes.`,
            html: `<p>To reset your password, please <a href="${resetUrl}">click here</a>.</p><p>This link is valid for 30 minutes.</p>`
        });
        
        req.flash('info', 'Password reset email sent');
        res.redirect('/users/login');
    } catch (error) {
        console.error("Error in forgot password process:", error);
        req.flash('error', 'Error processing your request');
        res.redirect('/users/forgot-password');
    }
};

exports.showResetPasswordForm = async (req, res) => {
    const { token } = req.params;
    res.render('resetPassword', { token });
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect(`/users/reset-password/${token}`);
        }
        
        // Hash token to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
            
        // Find user with this token and check if token is expired
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            req.flash('error', 'Invalid or expired reset token');
            return res.redirect('/users/forgot-password');
        }
        
        // Update password and clear reset token
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        
        req.flash('success', 'Password reset successful. Please log in with your new password.');
        res.redirect('/users/login');
    } catch (error) {
        console.error("Error resetting password:", error);
        req.flash('error', 'Error resetting password');
        res.redirect('/users/forgot-password');
    }
};

// ✅ Notifications

exports.getNotifications = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const notifications = await Notification.find({ user: req.user._id, isRead: false })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ notifications });
    } catch (error) {
        console.error("❌ Error fetching notifications:", error);
        res.status(500).json({ error: "Error fetching notifications." });
    }
};

exports.markNotificationsAsRead = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } });

        res.json({ success: true, message: "Notifications marked as read." });
    } catch (error) {
        console.error("❌ Error marking notifications as read:", error);
        res.status(500).json({ error: "Error marking notifications as read." });
    }
};
