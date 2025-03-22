const fs = require('fs');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const path = require('path');

/**
 * Generates a PDF for an offer
 * @param {Object} offer - The offer object containing all contract details
 * @returns {Buffer} PDF buffer
 */
async function generateOfferPdf(offer) {
    try {
        // Launch puppeteer with appropriate settings
        const browser = await puppeteer.launch({ 
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: 'new' // Use new headless mode for better performance
        });
        
        const page = await browser.newPage();

        // Configure viewport for letter size paper
        await page.setViewport({
            width: 816,    // 8.5 inches at 96 DPI
            height: 1056,  // 11 inches at 96 DPI
            deviceScaleFactor: 1
        });

        // Define absolute path to views directory
        const viewsDir = path.resolve(__dirname, '../views/contracts/');

        // Path to the master PDF EJS template
        const pdfTemplatePath = path.join(viewsDir, 'pdf.ejs');

        const bootstrapPath = path.resolve(__dirname, '../public/bootstrap/css/bootstrap.min.css');
        const logoPath = path.resolve(__dirname, '../public/images/logo.png'); // Optional if you want logo later

         // 🔥 Flatten ALL required fields
        const preparedOffer = {
            ...offer, // Should already be lean (plain object)

            formattedDate: new Date().toLocaleDateString(),

            // Buyer/Seller
            buyerName: offer.buyer?.name || '',
            buyerEmail: offer.buyer?.email || '',
            sellerName: offer.seller?.name || '',
            sellerEmail: offer.seller?.email || '',

            // Listing flattened
            listingAddress: offer.listing?.address || '',
            listingCity: offer.listing?.city || '',
            listingState: offer.listing?.state || '',
            listingZip: offer.listing?.zip || '',
            listingCounty: offer.listing?.county || '',
            listingPrice: offer.listing?.price || '',
            
            // Offer Details flattened
            offerPrice: offer.offerPrice || '',
            financingType: offer.financingType || '',
            earnestMoney: offer.earnestMoney || '',
            loanAmount: offer.loanAmount || '',
            appraisalDeadlineDays: offer.appraisalDeadlineDays || '',
            loanApprovalDeadline: offer.loanApprovalDeadline || '',
            earnestDueDate: offer.earnestDueDate ? new Date(offer.earnestDueDate).toLocaleDateString() : '',
            titleCompany: offer.titleCompany || '',
            titleCompanyAddress: offer.titleCompanyAddress || '',
            closingDate: offer.closingDate ? new Date(offer.closingDate).toLocaleDateString() : '',
            closingCosts: offer.closingCosts || '',
            contingencies: offer.contingencies || [],
            riders: offer.riders || {},

            // Static assets
            cssPath: `file://${bootstrapPath}`,
            logoPath: `file://${logoPath}`
        };
        // Render the full PDF EJS template
        const html = await ejs.renderFile(
            pdfTemplatePath,
            { 
                offer: preparedOffer, 
                showExplanations: false
            },
            {
                root: viewsDir 
            }
        );

        // Set the content and wait for network activity to finish
        await page.setContent(html, { 
            waitUntil: 'networkidle0',
            timeout: 30000 // Increase timeout for complex documents
        });

        // Generate PDF with improved settings
        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '1in', // Leave enough space for the footer
                left: '0.5in'
            },
            displayHeaderFooter: true, // Key setting to enable header/footer
            headerTemplate: `<div></div>`, // Empty header for clean top
            footerTemplate: `
                <div style="
                    font-size:10px;
                    color:#3c3e40;
                    width:100%;
                    padding:5px 20px;
                    border-top:1px solid #dee2e6;
                    display:flex;
                    justify-content: center;
                    align-items: center;
                ">
                    Missouri Residential Real Estate Purchase Agreement | Generated on ${new Date().toLocaleDateString()} | Page <span class=" pageNumber "></span> of <span class=" totalPages"></span>
                </div>
            `,
            preferCSSPageSize: true
        });
        // Close browser to free resources
        await browser.close();

        return pdfBuffer;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error; // Re-throw to allow caller to handle
    }
}

/**
 * Saves the PDF to a file
 * @param {Object} offer - The offer object
 * @param {String} outputPath - Path where to save the PDF
 * @returns {Promise<String>} Path to the saved PDF
 */
async function generateAndSavePdf(offer, outputPath) {
    try {
        const pdfBuffer = await generateOfferPdf(offer);
        
        // Create directory if it doesn't exist
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Write buffer to file
        fs.writeFileSync(outputPath, pdfBuffer);
        
        return outputPath;
    } catch (error) {
        console.error('Error saving PDF:', error);
        throw error;
    }
}

module.exports = {
    generateOfferPdf,
    generateAndSavePdf
};