const express = require("express");
const router = express.Router();
const offerTaskController = require("../controllers/offerTaskController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");

// Get tasks for an offer
router.get("/:offerId/tasks", ensureAuthenticated, offerTaskController.checkOfferAccess, offerTaskController.getOfferTasks);

// Update task status
router.put("/:offerId/tasks/:taskId", ensureAuthenticated, offerTaskController.checkOfferAccess, offerTaskController.updateTaskStatus);

// Add a custom task
router.post("/:offerId/tasks", ensureAuthenticated, offerTaskController.checkOfferAccess, offerTaskController.addCustomTask);

// Delete a custom task
router.delete("/:offerId/tasks/:taskId", ensureAuthenticated, offerTaskController.checkOfferAccess, offerTaskController.deleteTask);

module.exports = router;
