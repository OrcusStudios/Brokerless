
const passport = require("passport");
const User = require("../models/User");
const Professional = require("../models/Professional");
const jwt = require("jsonwebtoken");

// Show Login Page
exports.showLoginForm = (req, res) => {
    res.render("login");
};

// Process Login for Both Users & Professionals
exports.loginUser = (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        
        if (!user) {
            req.flash("error", info.message || "Authentication failed");
            return res.redirect("/users/login");
        }

        req.logIn(user, (err) => {
            if (err) return next(err);
            
            // Check for remember me option
            if (req.body.rememberMe) {
                // Set up remember me token logic here
            }
            
            req.flash("success", "Login successful!");
            
            // Redirect based on user type
            if (user.professionalType) {
                return res.redirect("/professionals/dashboard");
            } else {
                return res.redirect("/users/dashboard");
            }
        });
    })(req, res, next);
};

// Logout Function
exports.logoutUser = (req, res, next) => {
    const logoutMessage = "You have logged out successfully.";

    // If req.session exists, store the message
    if (req.session) {
        req.session.flash = { success: [logoutMessage] };
    }

    req.logout((err) => {
        if (err) return next(err);
        res.redirect("/users/login");
    });
};

// Middleware to Check Remember Me Token
exports.checkRememberMe = async (req, res, next) => {
    if (req.isAuthenticated()) return next();

    const token = req.cookies.remember_token;
    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = decoded.type === "Professional"
            ? await Professional.findById(decoded.id)
            : await User.findById(decoded.id);

        if (user) req.logIn(user, () => next());
        else next();
    } catch (error) {
        next();
    }
};