const Professional = require("../models/Professional");
const User = require("../models/User");
const { ensureAuthenticated, ensureRole } = require("../middleware/authMiddleware");

// Show photographer directory (only accessible to sellers)
exports.showDirectory = async (req, res) => {
    try {
        // Ensure user is a seller
        if (!req.user || !req.user.roles || !req.user.roles.some(role => role.type === 'seller' && role.active)) {
            req.flash("error", "Only sellers can access the photographer directory.");
            return res.redirect("/dashboard");
        }

        // Get query parameters for filtering
        const { county, specialty, priceRange, page = 1, limit = 9 } = req.query;
        const skip = (page - 1) * limit;

        // Build query
        const query = { professionalType: "photographer" };
        
        // Only filter by verification status if specified
        // const query = { professionalType: "photographer", isVerified: true };
        
        // Add filters if provided
        if (county) {
            query.counties = county;
        }
        
        if (specialty) {
            query.specialties = specialty;
        }
        
        if (priceRange) {
            const [min, max] = priceRange.split('-');
            if (min && max) {
                query['pricingTiers.basic'] = { $gte: Number(min), $lte: Number(max) };
            } else if (min && min.endsWith('+')) {
                const minValue = Number(min.replace('+', ''));
                query['pricingTiers.basic'] = { $gte: minValue };
            } else if (min) {
                query['pricingTiers.basic'] = { $lte: Number(min) };
            }
        }

        // Get photographers
        const photographers = await Professional.find(query)
            .sort({ rating: -1 })
            .skip(skip)
            .limit(Number(limit));

        // Get total count for pagination
        const total = await Professional.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        // Get all counties for filter dropdown
        const allCounties = await Professional.distinct('counties', { professionalType: "photographer" });

        res.render("photographerDirectory", {
            photographers,
            counties: allCounties,
            currentPage: Number(page),
            totalPages,
            user: req.user
        });
    } catch (error) {
        console.error("Error loading photographer directory:", error);
        req.flash("error", "Error loading photographer directory.");
        res.redirect("/dashboard");
    }
};

// Show photographer profile
exports.showProfile = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find photographer
        const photographer = await Professional.findOne({
            _id: id,
            professionalType: "photographer"
        });
        
        if (!photographer) {
            req.flash("error", "Photographer not found.");
            return res.redirect("/photographers");
        }
        
        res.render("photographerProfile", {
            photographer,
            user: req.user
        });
    } catch (error) {
        console.error("Error loading photographer profile:", error);
        req.flash("error", "Error loading photographer profile.");
        res.redirect("/photographers");
    }
};

// Book photographer form
exports.showBookingForm = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find photographer
        const photographer = await Professional.findOne({
            _id: id,
            professionalType: "photographer"
        });
        
        if (!photographer) {
            req.flash("error", "Photographer not found.");
            return res.redirect("/photographers");
        }
        
        // Get seller's listings for the booking form
        const listings = [];
        if (req.user && req.user.seller && req.user.seller.listings) {
            const Listing = require("../models/Listing");
            const sellerListings = await Listing.find({
                _id: { $in: req.user.seller.listings }
            });
            listings.push(...sellerListings);
        }
        
        res.render("photographerBooking", {
            photographer,
            listings,
            user: req.user
        });
    } catch (error) {
        console.error("Error loading booking form:", error);
        req.flash("error", "Error loading booking form.");
        res.redirect("/photographers");
    }
};

// Process booking request
exports.processBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { listingId, date, time, package, notes } = req.body;
        
        // Validate inputs
        if (!listingId || !date || !time || !package) {
            req.flash("error", "Please fill in all required fields.");
            return res.redirect(`/photographers/${id}/book`);
        }
        
        // Find photographer
        const photographer = await Professional.findOne({
            _id: id,
            professionalType: "photographer"
        });
        
        if (!photographer) {
            req.flash("error", "Photographer not found.");
            return res.redirect("/photographers");
        }
        
        // Find listing
        const Listing = require("../models/Listing");
        const listing = await Listing.findById(listingId);
        
        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect(`/photographers/${id}/book`);
        }
        
        // Create booking (this would be implemented with a Schedule model)
        // For now, just show a success message
        
        req.flash("success", `Booking request sent to ${photographer.name}. They will contact you to confirm.`);
        res.redirect("/dashboard");
    } catch (error) {
        console.error("Error processing booking:", error);
        req.flash("error", "Error processing booking request.");
        res.redirect("/photographers");
    }
};
