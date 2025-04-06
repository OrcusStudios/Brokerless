const Listing = require("../models/Listing");
const axios = require("axios");
const { v2: cloudinary } = require("cloudinary");


exports.getListings = async (req, res) => {
    try {
        const listings = await Listing.find();        
        const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
        res.render("listings", { listings, googleMapsApiKey });
    } catch (err) {
        res.status(500).send("Error fetching listings");
    }
};

// Show listing creation form
exports.showCreateForm = (req, res) => {    
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    res.render("listings/new", {googleMapsApiKey});
};

// Create Listing
exports.createListing = async (req, res) => {
    try {
        // Extract Cloudinary image URLs
        let image = null;
        let additionalImages = [];
        
        // Handle primary image
        if (req.files && req.files.image && req.files.image.length > 0) {
            image = req.files.image[0].path;
        }
        
        // Handle additional images
        if (req.files && req.files.images) {
            additionalImages = req.files.images.map(file => file.path);
        }
        const { 
            address, city, state, zip, county, description, price, 
            bedrooms, bathrooms, squareFootage, propertyType, acres,
            // New fields
            measurementSource, otherSourceText, measurementAcknowledgment
        } = req.body;
        
        // Process measurement source (convert to array if needed)
        const measurementSources = measurementSource ? 
            (Array.isArray(measurementSource) ? measurementSource : [measurementSource]) 
            : [];
       
        // Initialize empty seller disclosure structure with default values
        const defaultDisclosures = {
            status: {
                section1Completed: false,
                section2Completed: false,
                section3Completed: false,
                section4Completed: false,
                fullyCompleted: false,
                lastUpdated: new Date()
            },
            statutory: {
                methDisclosure: false,
                leadPaintDisclosure: false,
                wasteDisposalDisclosure: false,
                radioactiveDisclosure: false,
                noAdditionalDisclosures: false
            },
            systems: {},
            structure: {},
            environmental: {}
        };

        // Create full address
        const fullAddress = `${address}, ${city}, ${state} ${zip}`;

        // Geocode the address
        const geoResponse = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
            params: {
                address: fullAddress,
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });

        const { lat, lng } = geoResponse.data.results[0].geometry.location;
        
        // Save Listing to Database
        const listing = new Listing({
            address,
            city,
            state,
            zip,
            county,
            description,
            price,
            bedrooms,
            bathrooms,
            squareFootage,
            propertyType,
            acres,
            lat,
            lng,
            image,
            images: additionalImages,
            seller: req.user._id,
            // Save measurement disclaimer information
            measurementSources: measurementSources,
            otherMeasurementSource: otherSourceText,
            measurementDisclaimerAcknowledged: measurementAcknowledgment === 'on',            
            disclosures: defaultDisclosures
        });

        const savedListing = await listing.save();
        // Now update the User model to reference this listing
        const User = require('../models/User'); // Import User model if not already imported
        const user = await User.findById(req.user._id);
        
        user.seller.listings.push(savedListing._id);
            
        await user.save();
        req.flash("success", "Listing created successfully!");
        res.redirect("/listings");
    } catch (error) {
        console.error("❌ Error creating listing:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        res.status(500).send(`Error creating listing: <pre>${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}</pre>`);
    }
};


// Show edit form
exports.showEditForm = async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing || listing.seller.toString() !== req.user._id.toString()) {
            req.flash("error", "Unauthorized to edit this listing.");
            return res.redirect("/listings");
        }
        res.render("listings/edit", { listing });
    } catch (error) {
        req.flash("error", "Listing not found.");
        res.redirect("/listings");
    }
};

// Handle listing update with multiple images
exports.updateListing = async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing || listing.seller.toString() !== req.user._id.toString()) {
            req.flash("error", "Unauthorized to update this listing.");
            return res.redirect("/listings");
        }

        // Update listing fields
        listing.description = req.body.description;
        listing.price = req.body.price;
        listing.squareFootage = req.body.squareFootage;
        listing.acres = req.body.acres;

        // Handle primary image update
        if (req.files && req.files.image && req.files.image.length > 0) {
            listing.image = req.files.image[0].path;
        }
        
        // Handle additional images update
        if (req.files && req.files.images && req.files.images.length > 0) {
            listing.images = req.files.images.map(file => file.path);
        }

        await listing.save();
        req.flash("success", "Listing updated successfully!");
        res.redirect("/listings");
    } catch (error) {
        console.error("❌ Error updating listing:", error);
        req.flash("error", "Error updating listing.");
        res.redirect("/listings");
    }
};

// Handle listing deletion
exports.deleteListing = async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing || listing.seller.toString() !== req.user._id.toString()) {
            req.flash("error", "Unauthorized to delete this listing.");
            return res.redirect("/listings");
        }

        await listing.deleteOne();
        req.flash("success", "Listing deleted successfully!");
        res.redirect("/listings");
    } catch (error) {
        req.flash("error", "Error deleting listing.");
        res.redirect("/listings");
    }
};

exports.getListingById = async (req, res) => {
    try {
        const user = req.user;
        const listing = await Listing.findById(req.params.id).populate("seller", "name");
        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }
        res.render("listings/show", { listing, user });
    } catch (err) {
        console.error("Error fetching listing:", err);
        res.status(500).send("Error fetching listing");
    }
};

exports.getSellerListings = async (req, res) => {
    try {
        const listings = await Listing.find({ seller: req.user._id });
        res.render("listings/manage", { listings });
    } catch (error) {
        console.error("❌ Error fetching seller's listings:", error);
        req.flash("error", "Error loading your listings.");
        res.redirect("/dashboard");
    }
};
