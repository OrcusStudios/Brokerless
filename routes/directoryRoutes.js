const express = require("express");
const router = express.Router();
const Professional = require("../models/Professional");

router.get("/", async (req, res) => {
    try {
        const lenders = await Professional.find({ professionalType: "lender" });
        const states = await Professional.distinct("state");
        res.render("lenderDirectory", { lenders, states, totalLenders: lenders.length });
    } catch (err) {
        res.status(500).send("Error loading lenders.");
    }
});

router.get("/filter", async (req, res) => {
    try {
        const { state, rating, loanType, page = 1, limit = 5 } = req.query;
        let filter = { professionalType: "lender" };

        if (state) filter.state = state;
        if (rating) filter.rating = { $gte: Number(rating) };
        if (loanType) filter.loanTypes = loanType;

        const totalLenders = await Professional.countDocuments(filter);
        
        // Use lean() to get plain JavaScript objects instead of Mongoose documents
        const lenders = await Professional.find(filter)
            .sort({ paymentTier: -1, closedDeals: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();  // Add this line
        
        res.json({ lenders, totalLenders });
    } catch (err) {
        res.status(500).json({ error: "Error filtering lenders." });
    }
});

module.exports = router;
