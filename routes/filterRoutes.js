
const express = require("express");
const router = express.Router();
const filterController = require("../controllers/filterController");

// Route to get filtered listings
router.post("/", filterController.getFilteredListings);

module.exports = router;
