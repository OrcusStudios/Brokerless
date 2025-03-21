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
        // ✅ Extract Cloudinary image URLs
        const image = req.file.path;
        const { address, city, state, zip, county, description, price, bedrooms, bathrooms, squareFootage, propertyType, acres } = req.body;
        const fullAddress = `${address}, ${city}, ${state} ${zip}`;

        const geoResponse = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
            params: {
                address: fullAddress,
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });


        const { lat, lng } = geoResponse.data.results[0].geometry.location;
        // ✅ Save Listing to Database
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
            lat,  // ✅ Now includes lat, lng
            lng,
            image, // ✅ Stores Cloudinary URLs
            seller: req.user._id
        });

        await listing.save();
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

        listing.title = req.body.title;
        listing.description = req.body.description;
        listing.price = req.body.price;
        listing.location = req.body.location;
        listing.squareFootage = req.body.squareFootage;
        listing.acres = req.body.acres;

        if (req.files.length > 0) {
            listing.images = req.files.map(file => file.path); // Update with new images
        }

        await listing.save();
        req.flash("success", "Listing updated successfully!");
        res.redirect("/listings");
    } catch (error) {
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

