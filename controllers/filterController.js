const Listing = require("../models/Listing");

exports.getFilteredListings = async (req, res) => {
    try {
        const { location, minPrice, maxPrice, bedrooms, bathrooms, sort, polygon } = req.body;
        let filter = {};

        // 📌 Filter by city or state instead of "location"
        if (location) {
            filter.$or = [
                { city: { $regex: new RegExp(location, "i") } },
                { state: { $regex: new RegExp(location, "i") } }
            ];
        }

        // 📌 Apply price filters
        if (minPrice) filter.price = { ...filter.price, $gte: parseFloat(minPrice) };
        if (maxPrice) filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };

        // 📌 Apply bedrooms and bathrooms filters
        if (bedrooms) filter.bedrooms = { $gte: parseInt(bedrooms) };
        if (bathrooms) filter.bathrooms = { $gte: parseInt(bathrooms) };

        // 📌 Fix Polygon Filtering: Use lat/lng ranges instead
        if (polygon && polygon.length > 0) {
            const lats = polygon.map(p => p.lat);
            const lngs = polygon.map(p => p.lng);

            filter.$and = [
                { lat: { $gte: Math.min(...lats), $lte: Math.max(...lats) } },
                { lng: { $gte: Math.min(...lngs), $lte: Math.max(...lngs) } }
            ];
        }

        // 📌 Apply sorting (Default: Highest Price First)
        let sortOption = {};
        if (sort === "priceAsc") {
            sortOption.price = 1;
        } else if (sort === "priceDesc") {
            sortOption.price = -1;
        }

        // 📌 Retrieve listings from DB
        const listings = await Listing.find(filter).sort(sortOption);

        res.json(listings);
    } catch (error) {
        console.error("❌ Error filtering listings:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
