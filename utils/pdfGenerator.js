const fs = require('fs');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const path = require('path');
const signatureUtils = require('./signatureUtils');

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
            maxConcession: offer.maxConcession || '',
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
};

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
};

async function generatePdfFromTemplate(templateFile, formData) {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: 'new' });
    const page = await browser.newPage();
  
    const html = await ejs.renderFile(
      path.join(__dirname, '../views/contracts', templateFile),
      { data: formData }
    );
  
    await page.setContent(html, { waitUntil: 'networkidle0' });
  
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
      preferCSSPageSize: true
    });
  
    await browser.close();
    return pdf;
};

async function generateDisclosurePdf(listing) {
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
        const viewsDir = path.resolve(__dirname, '../views/listings/addons/');

        // Path to the disclosure template
        const templatePath = path.join(viewsDir, 'sellersDisclosures.ejs');

        const bootstrapPath = path.resolve(__dirname, '../public/bootstrap/css/bootstrap.min.css');
        const logoPath = path.resolve(__dirname, '../public/images/logo.png');

        // Prepare listing data for the template
        const preparedListing = {
            ...listing, // Should already be lean (plain object)
            
            // Format dates
            formattedDate: new Date().toLocaleDateString(),
            
            // Seller information
            sellerName: listing.seller?.name || '',
            sellerEmail: listing.seller?.email || '',
            
            // Property information
            address: listing.address || '',
            city: listing.city || '',
            state: listing.state || '',
            zip: listing.zip || '',
            county: listing.county || '',
            
            // Disclosure information
            disclosures: listing.disclosures || {},
            
            // Static assets
            cssPath: `file://${bootstrapPath}`,
            logoPath: `file://${logoPath}`
        };

        // Render the disclosure template
        const html = await ejs.renderFile(
            templatePath,
            { 
                listing: preparedListing,
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
                bottom: '1in',
                left: '0.5in'
            },
            displayHeaderFooter: true,
            headerTemplate: `<div></div>`,
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
                    Seller's Property Disclosure | Generated on ${new Date().toLocaleDateString()} | Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                </div>
            `,
            preferCSSPageSize: true
        });

        // Close browser to free resources
        await browser.close();

        return pdfBuffer;
    } catch (error) {
        console.error("Error generating disclosure PDF:", error);
        throw error;
    }
};  

/**
 * Generates a PDF with signatures
 * @param {Object} document - The document object (offer, disclosure, etc.)
 * @param {Object} signers - Object containing user objects who will sign the document
 * @param {String} templateFile - Path to the EJS template file
 * @param {Object} options - Additional options for PDF generation
 * @returns {Buffer} PDF buffer with signatures
 */
async function generateSignedPdf(document, signers, templateFile, options = {}) {
    try {
        // Launch puppeteer with appropriate settings
        const browser = await puppeteer.launch({ 
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: 'new'
        });
        
        const page = await browser.newPage();

        // Configure viewport for letter size paper
        await page.setViewport({
            width: 816,
            height: 1056,
            deviceScaleFactor: 1
        });

        // Define absolute path to views directory
        const viewsDir = path.resolve(__dirname, '../views/contracts/');

        // Path to the template
        const templatePath = path.join(viewsDir, templateFile);

        const bootstrapPath = path.resolve(__dirname, '../public/bootstrap/css/bootstrap.min.css');
        
        // Generate signature HTML for each signer
        const signatures = {};
        for (const [role, user] of Object.entries(signers)) {
            if (user) {
                signatures[role] = signatureUtils.generateSignatureHTML(user);
            }
        }
        
        // Add signature certificate data
        const signatureCertificate = signatureUtils.createSignatureCertificate(
            signers.primary || Object.values(signers)[0], // Use primary signer or first signer
            { name: options.documentName || 'Document' }
        );

        // Prepare data for the template
        const templateData = {
            document,
            signatures,
            signatureCertificate,
            formattedDate: new Date().toLocaleDateString(),
            cssPath: `file://${bootstrapPath}`,
            ...options
        };

        // Render the template
        const html = await ejs.renderFile(
            templatePath,
            templateData,
            { root: viewsDir }
        );

        // Set the content and wait for network activity to finish
        await page.setContent(html, { 
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Generate PDF with improved settings
        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '1in',
                left: '0.5in'
            },
            displayHeaderFooter: true,
            headerTemplate: `<div></div>`,
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
                    ${options.documentTitle || 'Signed Document'} | Generated on ${new Date().toLocaleDateString()} | Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                </div>
            `,
            preferCSSPageSize: true
        });

        // Close browser to free resources
        await browser.close();

        return pdfBuffer;
    } catch (error) {
        console.error('Error generating signed PDF:', error);
        throw error;
    }
}

module.exports = {
    generateOfferPdf,
    generatePdfFromTemplate,
    generateAndSavePdf,
    generateDisclosurePdf,
    generateSignedPdf
};
