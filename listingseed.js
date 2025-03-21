const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Listing = require("./models/Listing");

require("dotenv").config();

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

const sellerId = "67acf0ad0b6d1b4318e98f14";

const listings = [
    {
        address: "14274 State Highway O",
        city: "Dixon",
        state: "MO",
        zip: 65459,
        price: 250000,
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1800,
        description: "Spacious home with a large backyard and modern amenities.",
        seller: sellerId
    },
    ...Array.from({ length: 9 }, (_, i) => ({
        address: `Random Address ${i + 1}`,
        city: "Springfield",
        state: "MO",
        zip: 6580 + i,
        price: Math.floor(Math.random() * 300000) + 100000,
        bedrooms: Math.floor(Math.random() * 5) + 1,
        bathrooms: Math.floor(Math.random() * 3) + 1,
        squareFootage: Math.floor(Math.random() * 2500) + 1000,
        description: "Beautiful home in a great neighborhood.",
        seller: sellerId
    }))
];

const seedDatabase = async () => {
    try {
        await Listing.deleteMany({}); // Clear existing listings
        await Listing.insertMany(listings);
        console.log("✅ Seed Data Inserted Successfully");
        mongoose.connection.close();
    } catch (error) {
        console.error("❌ Error Seeding Database:", error);
        mongoose.connection.close();
    }
};

seedDatabase();
