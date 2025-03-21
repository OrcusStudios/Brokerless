const mongoose = require("mongoose");

const ListingSchema = new mongoose.Schema({
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: Number, required: true },
    county: { type: String, required: true },
    propertyType: [{
        type: { 
          type: String, 
          enum: ["single_family", "condominium", "townhouse", "duplex"], 
          required: true 
        }
      }],
    price: { type: Number, required: true },
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    squareFootage: { type: Number, required: true },
    description: { type: String, required: true },
    acres: { type: Number, required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lat: {type: Number, required: true},
    lng: {type: Number, required: true},
    image: { type: String, default: "" }, // Single main image
    images: { type: [String], default: [] }, // Additional images
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Listing", ListingSchema);
