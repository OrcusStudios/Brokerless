const Tesseract = require("tesseract.js");
const pdf2img = require("pdf-poppler");
const fs = require("fs-extra");
const path = require("path");
const pdfParse = require("pdf-parse");
const sharp = require("sharp");
const PreApproval = require("../models/PreApproval");
const User = require("../models/User");
const notificationController = require("./notificationController");

// 📌 Directory for temporary images
const tempDir = path.join(__dirname, "../temp");

// ✅ Ensure temp directory exists
async function ensureTempDir() {
    try {
        await fs.mkdir(tempDir, { recursive: true });
    } catch (err) {
        console.error("❌ Error creating temp directory:", err);
    }
}

// ✅ Helper Function: Wait for file to be ready
async function waitForFile(filePath, retries = 10, delay = 500) {
    for (let i = 0; i < retries; i++) {
        try {
            await fs.access(filePath);
            console.log(`✅ Image file is ready: ${filePath}`);
            return;
        } catch (error) {
            console.log(`⏳ Waiting for image file to be ready... (${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error(`❌ Image file not found after multiple attempts: ${filePath}`);
}

// ✅ Process Uploaded Pre-Approval Letter
exports.processPreApproval = async (req, res) => {
    try {
        if (!req.file) {
            req.flash("error", "No file uploaded.");
            return res.redirect("/dashboard");
        }

        // Attempt to extract text using pdf-parse
        let extractedText = "";
        try {
            const pdfData = await pdfParse(req.file.buffer);
            extractedText = pdfData.text.replace(/\s+/g, " ").trim();
        } catch (err) {
            console.log("⚠️ pdf-parse failed, possibly a scanned document.");
        }

        // If no text extracted, fallback to OCR
        if (!extractedText) {
            console.log("🔄 No text found. Converting PDF to image for OCR...");

            // Create temp directory if it doesn't exist
            const tempDir = path.join(__dirname, "../temp");
            await fs.mkdir(tempDir, { recursive: true });

            // Save PDF temporarily
            const pdfFilePath = path.join(tempDir, `temp_${Date.now()}.pdf`);
            await fs.writeFile(pdfFilePath, req.file.buffer);

            // Convert PDF to image
            const pdfOptions = {
                format: "png",
                out_dir: tempDir,
                out_prefix: path.basename(pdfFilePath, ".pdf"),
                dpi: 300
            };

            await pdf2img.convert(pdfFilePath, pdfOptions);
            const imageFilePath = path.join(tempDir, `${pdfOptions.out_prefix}-1.png`);
            console.log(`✅ PDF converted to image: ${imageFilePath}`);

            // Preprocess the image to improve OCR accuracy
            await sharp(imageFilePath)
                .grayscale()
                .normalize()
                .toFile(imageFilePath.replace(".png", "_processed.png"));

            const processedImageFilePath = imageFilePath.replace(".png", "_processed.png");

            // OCR Extraction
            console.log("🔍 Extracting text using OCR...");
            const { data: { text } } = await Tesseract.recognize(processedImageFilePath, "eng", {
                tessedit_pageseg_mode: 6,
                tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$.,:/-@"
            });

            extractedText = text.replace(/\s+/g, " ").trim();

            // Cleanup temp files
            await fs.unlink(pdfFilePath);
            await fs.unlink(imageFilePath);
            await fs.unlink(processedImageFilePath);
        }

        if (!extractedText) {
            console.log("❌ No text could be extracted from the document.");
            req.flash("error", "Could not extract text from the document. Ensure it is readable.");
            return res.redirect("/dashboard");
        }

        console.log("📝 Extracted Text:\n", extractedText);

        // 🔹 Extract Lender Name
        const knownLenders = [
            "Flatbranch Home Loans", "Rocket Mortgage", "Wells Fargo", "Bank of America", "Chase",
            "U.S. Bank", "Guild Mortgage", "PrimeLending", "New American Funding", "Quicken Loans",
            "Mortgage Solutions Financial", "Cardinal Financial", "USAA", "Veterans United Home Loans"
        ];

        // Check first and last few lines for lender name
        const lines = extractedText.split("\n").map(line => line.trim()).filter(line => line);
        const firstLines = lines.slice(0, 5).join(" ");
        const lastLines = lines.slice(-10).join(" ");

        let lenderName = null;

        // Match against known lenders
        for (const lender of knownLenders) {
            if (firstLines.includes(lender) || lastLines.includes(lender) || extractedText.includes(lender)) {
                lenderName = lender;
                break;
            }
        }

        // If still missing, fallback to extracting from email domain
        const emailMatch = extractedText.match(/[\w.-]+@([\w-]+\.[\w.]+)/);
        if (!lenderName && emailMatch) {
            lenderName = emailMatch[1].split(".")[0].toUpperCase();
        }

        // If still missing, pick the first relevant word
        if (!lenderName) {
            lenderName = lines[0].split(" ").slice(0, 3).join(" ");
        }

        // Remove unwanted words like "Mortgage", "Prequal", and numeric errors
        lenderName = lenderName.replace(/\b(Mortgage|Prequal|Loan|Approval|[0-9]+)\b/gi, "").trim();

        console.log(`🏦 Lender Name Found: ${lenderName}`);

        // 🔹 Extract Loan Amount and Fix Misread "$"
        const amountMatch = extractedText.match(/Loan Amount:\s*[\$5]?([\d,]+(?:\.\d{2})?)/i);
        let loanAmount = amountMatch ? amountMatch[1].replace(/,/g, "") : null;

        if (loanAmount) {
            // Fix misread "$" as "5"
            if (extractedText.includes("5") && extractedText.includes("Loan Amount: 5")) {
                console.log("⚠️ Fixing misread dollar sign ($)");
                loanAmount = loanAmount.replace(/^5/, ""); // Remove leading "5"
            }

            // Ensure decimal handling
            if (!loanAmount.includes(".")) {
                loanAmount = parseFloat(loanAmount) / 100; // Fix misplaced decimals
            } else {
                loanAmount = parseFloat(loanAmount);
            }

            // If the amount is unrealistically large, correct it
            if (loanAmount > 10000000) { 
                console.log("⚠️ Adjusting misread loan amount...");
                loanAmount = loanAmount / 100; // Correct misplaced decimal
            }
        }

        console.log(`💰 Corrected Loan Amount: ${loanAmount}`);

        // 🔹 Ensure Required Fields Exist
        let rejectionReason = "";

        if (!loanAmount || isNaN(loanAmount)) {
            rejectionReason += "Loan Amount is missing or unreadable. ";
        }

        if (!lenderName || lenderName.trim().length < 3) {
            rejectionReason += "Lender Name is missing or unclear. ";
        }

        // Suggest actions based on missing information
        let correctionSuggestion = "Please ask your lender to provide a clear pre-approval letter that includes:";
        if (rejectionReason.includes("Loan Amount")) {
            correctionSuggestion += " the correct loan amount,";
        }
        if (rejectionReason.includes("Lender Name")) {
            correctionSuggestion += " the lender's name,";
        }

        correctionSuggestion = correctionSuggestion.replace(/,$/, ".");

        if (rejectionReason) {
            console.log(`❌ Validation failed: ${rejectionReason}`);

            await PreApproval.create({
                buyer: req.user._id,
                extractedText,
                status: "rejected",
                rejectionReason: rejectionReason.trim()
            });

            // Update the user's pre-approval status in the User model
            const user = await User.findById(req.user._id);
            await user.updatePreApprovalStatus("denied", null, null, null);
            console.log("✅ User pre-approval status updated to denied");

            await notificationController.createNotification(
                req.user._id,
                `Your pre-approval letter was rejected: ${rejectionReason.trim()} ${correctionSuggestion}`,
                "Denied"
            );

            req.flash("error", `Pre-approval letter rejected: ${rejectionReason.trim()} ${correctionSuggestion}`);
            return res.redirect("/users/dashboard");
        }

        const newPreApproval = new PreApproval({
            buyer: req.user._id,
            lenderName,
            approvalAmount: loanAmount,
            extractedText,
            status: "approved"
        });
        
        await newPreApproval.save();
        
        // Update the user's pre-approval status in the User model
        const user = await User.findById(req.user._id);
        
        // Directly update the buyer nested properties
        user.buyer.preApprovalStatus = "approved";
        user.buyer.preApprovalLender = null; // Set this if you have a lender ID
        user.buyer.preApprovalAmount = loanAmount;
        user.buyer.preApprovalDate = new Date(); // Set the current date as approval date
        
        
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 180); // Set default expiration to 90 days
        user.buyer.preApprovalExpiration = expirationDate;

        await user.save();

        console.log("✅ Pre-Approval Verified and Stored. User status updated.");
        req.flash("success", "Pre-approval verified successfully.");
        res.redirect("/users/dashboard");

    } catch (error) {
        console.error("❌ Error processing pre-approval:", error);
        req.flash("error", "Error processing pre-approval.");
        res.redirect("/users/dashboard");
    }
};

// ✅ Get Buyer's Pre-Approval Status
exports.getBuyerPreApprovalStatus = async (req, res) => {
    try {
        const preApproval = await PreApproval.findOne({ buyer: req.user._id });

        if (!preApproval) {
            return res.json({ status: "none", message: "No pre-approval on file." });
        }

        return res.json({
            status: preApproval.status,
            lender: preApproval.lenderName,
            amount: preApproval.approvalAmount,
            expiration: preApproval.expirationDate,
            rejectionReason: preApproval.rejectionReason || null
        });
    } catch (error) {
        console.error("❌ Error fetching pre-approval status:", error);
        res.status(500).json({ error: "Failed to retrieve pre-approval status." });
    }
};