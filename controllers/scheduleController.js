const nodemailer = require("nodemailer");
const Schedule = require("../models/Schedule");
const Listing = require("../models/Listing");
const Notification = require("../models/Notification")
const notificationController = require("../controllers/notificationController")
const User = require("../models/User");

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password
    },
});

// Consolidated function to get showings for either buyer or seller
exports.getShowings = async (req, res) => {
    try {
        const userId = req.user._id;
        // Get active roles from the user
        const userRoles = req.user.getActiveRoles ? req.user.getActiveRoles() : 
                         (req.user.roles ? req.user.roles.filter(r => r.active).map(r => r.type) : []);
        
        // Determine if user is a buyer, seller, or both
        const isBuyer = userRoles.includes('buyer');
        const isSeller = userRoles.includes('seller');
        
        let showings = [];
        let query = {};
        
        // If the user has both roles, we'll fetch showings for both
        if (isBuyer && isSeller) {
            // Option 1: Get both sets of showings
            showings = await Schedule.find({
                $or: [{ buyer: userId }, { seller: userId }]
            })
            .populate("listing", "address city state zip photos")
            .populate("buyer", "name email")
            .populate("seller", "name email");
            
            // Flag each showing as either a buyer or seller showing for the template
            showings = showings.map(showing => ({
                ...showing._doc,
                isBuyerShowing: showing.buyer._id.toString() === userId.toString(),
                isSellerShowing: showing.seller._id.toString() === userId.toString()
            }));
        }
        // If only buyer role is active
        else if (isBuyer) {
            query = { buyer: userId };
            showings = await Schedule.find(query)
                .populate("listing seller")
                .populate("listing", "address city state zip photos");
        }
        // If only seller role is active
        else if (isSeller) {
            query = { seller: userId };
            showings = await Schedule.find(query)
                .populate("listing buyer")
                .populate("listing", "address city state zip photos");
        }
        // If neither role is active (unlikely but handled for completeness)
        else {
            return res.render("schedule", { 
                user: req.user, 
                showings: [], 
                error: "You need buyer or seller role to view showings" 
            });
        }

        // Render the same template but with role-specific data
        res.render("schedule", { 
            user: req.user, 
            showings,
            isBuyer,
            isSeller
        });
    } catch (err) {
        console.error("Error fetching showings:", err);
        res.status(500).send("Error fetching showings.");
    }
};

exports.requestShowing = async (req, res) => {
    try {
        const { listingId } = req.params;
        const { date, time } = req.body;
        const buyerId = req.user._id;
        
        // Try to find the listing with more verbose logging
        const listing = await Listing.findById(listingId);
                
        if (!listing) {
            console.error('Listing not found with ID:', listingId);
            return res.status(404).send("Listing not found");
        }

        // If seller is not populating, explicitly find the seller
        const seller = await User.findById(listing.seller);
        
        if (!seller) {
            console.error('No seller found for this listing');
            return res.status(404).send("Seller not found for this listing");
        }

        // Combine date and time
        const showingDateTime = new Date(`${date}T${time}`);

        const newSchedule = new Schedule({
            listing: listingId,
            type: "Showing",
            buyer: buyerId,
            seller: seller._id,
            date: showingDateTime,
            status: "pending",
        });

        await newSchedule.save();

        // Notify Seller
        await notificationController.createNotification(
            seller._id,
            `New showing request for ${listing.address} on ${showingDateTime.toLocaleDateString()}.`,
            `Showing`
        );
        
        req.flash("success", "Showing request submitted!");
        res.redirect(`/listings/${listingId}`);
    } catch (err) {
        console.error('Full error in requestShowing:', err);
        res.status(500).send("Error scheduling showing.");
    }
};

exports.confirmShowing = async (req, res) => {
    try {
        const { id } = req.params;
        const showing = await Schedule.findById(id);
        
        if (!showing) {
            console.error("❌ Showing not found in database");
            return res.status(404).send("Showing not found");
        }

        showing.status = "confirmed";
        await showing.save();
        // 🔔 Notify Buyer of the confirmed showing
        await notificationController.createNotification(
            showing.buyer._id,
            `Your showing request for ${showing.listing.title} has been confirmed.`,
            "Approved",
            "/schedule"
        );
        req.flash("success", "Showing confirmed successfully!");
        res.redirect("/schedule");
    } catch (error) {
        req.flash("error", "Showing could not be approved!");
        res.redirect("/schedule");
        console.error("❌ Error confirming showing:", error);
        res.status(500).send("Error confirming showing");
    }
};

exports.cancelShowing = async (req, res) => {
    try {
        const { id } = req.params;
        const showing = await Schedule.findById(id).populate('buyer').populate('listing');
        if (!showing) {
            return res.status(404).send("Showing not found");
        }
        
        // Store the property title and seller ID before updating
        const propertyTitle = showing.listing.title || 'a property';
        const sellerId = showing.listing.seller;
        const buyerName = showing.buyer.name || 'A buyer';
        const scheduledDate = new Date(showing.scheduledDate).toLocaleDateString();
        const scheduledTime = showing.scheduledTime;

        // Update status
        showing.status = "canceled";
        await showing.save();
        
        // Notify the buyer of their cancellation
        await notificationController.createNotification(
            showing.buyer._id,
            `Your showing request for ${propertyTitle} has been canceled.`,
            "Canceled Showing",
            "/schedule",
            "SHOWING"
        );
        
        // Notify the seller about the cancellation
        await notificationController.createNotification(
            sellerId,
            `${buyerName} has canceled their showing for ${propertyTitle} on ${scheduledDate} at ${scheduledTime}.`,
            "Showing Canceled",
            "/schedule",
            "SHOWING"
        );
        
        req.flash("info", "Showing has been canceled.");
        
        // Determine where to redirect based on user role
        const redirectPath = req.user._id.equals(showing.buyer._id) ? 
            "/schedule/buyer" : "/schedule/seller";
        res.redirect(redirectPath);
    } catch (error) {
        console.error("❌ Error canceling showing:", error);
        res.status(500).send("Error canceling showing");
    }
};