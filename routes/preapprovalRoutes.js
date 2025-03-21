const express = require("express");
const multer = require("multer");
const preApprovalController = require("../controllers/preApprovalController"); // ✅ Ensure correct path
const { ensureAuthenticated, ensureRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Configure Multer for file uploads (store in memory, delete after processing)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ✅ Ensure `processPreApproval` function exists
router.post("/upload", ensureAuthenticated, ensureRole("buyer"), upload.single("file"), preApprovalController.processPreApproval);

router.get("/status", ensureAuthenticated, ensureRole("buyer"), preApprovalController.getBuyerPreApprovalStatus);

module.exports = router;
