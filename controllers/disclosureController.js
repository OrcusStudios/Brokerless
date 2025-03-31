const Listing = require("../models/Listing");

// Display the form to edit a specific section of disclosures
exports.editSection = async (req, res) => {
    try {
        const { listingId, section } = req.params;
        
        // Verify listing ownership
        const listing = await Listing.findById(listingId);
        if (!listing || listing.seller.toString() !== req.user._id.toString()) {
            req.flash("error", "Unauthorized to edit disclosures for this listing.");
            return res.redirect("/listings/manage");
        }
        
        // Initialize disclosure object if it doesn't exist
        if (!listing.disclosures) {
            listing.disclosures = {
                status: {
                    lastUpdated: new Date()
                }
            };
            await listing.save();
        }
        
        // Validate section
        const validSections = ['section1', 'section2', 'section3', 'section4'];
        if (!validSections.includes(section)) {
            req.flash("error", "Invalid section.");
            return res.redirect("/listings/manage");
        }
        
        // Map section to its template name
        const sectionTemplates = {
            'section1': 'statutory_disclosures',
            'section2': 'property_systems',
            'section3': 'structure_exterior',
            'section4': 'environmental_other'
        };
        
        res.render(`disclosures/sections/${sectionTemplates[section]}`, {
            listing,
            section,
            sectionTitle: getSectionTitle(section)
        });
    } catch (error) {
        console.error(`❌ Error editing ${req.params.section}:`, error);
        req.flash("error", "Error loading disclosure section.");
        res.redirect("/listings/manage");
    }
};

// Process the form submission for a specific section
exports.updateSection = async (req, res) => {
    try {
        const { listingId, section } = req.params;
        
        // Verify listing ownership
        const listing = await Listing.findById(listingId);
        if (!listing || listing.seller.toString() !== req.user._id.toString()) {
            req.flash("error", "Unauthorized to update disclosures for this listing.");
            return res.redirect("/listings/manage");
        }
        
        // Initialize disclosure object if it doesn't exist
        if (!listing.disclosures) {
            listing.disclosures = {
                status: {}
            };
        }
        
        // Update appropriate section based on form data
        switch(section) {
            case 'section1':
                listing.disclosures.statutory = {
                    yearBuilt: req.body.yearBuilt,
                    dateAcquired: req.body.dateAcquired,
                    isVacant: req.body.isVacant === 'true',
                    sellerOccupies: req.body.sellerOccupies === 'true',
                    sellerOccupiedPast: req.body.sellerOccupiedPast === 'true',
                    isForeignPerson: req.body.isForeignPerson === 'true',
                    vacancyExplanation: req.body.vacancyExplanation,
                    
                    methDisclosure: req.body.methDisclosure === 'true',
                    leadPaintDisclosure: req.body.leadPaintDisclosure === 'true',
                    wasteDisposalDisclosure: req.body.wasteDisposalDisclosure === 'true',
                    radioactiveDisclosure: req.body.radioactiveDisclosure === 'true',
                    
                    noAdditionalDisclosures: req.body.noAdditionalDisclosures === 'on',
                    noDisclosureReason: req.body.noDisclosureReason
                };
                listing.disclosures.status.section1Completed = true;
                break;
                
            case 'section2':
                listing.disclosures.systems = {
                    hvacIssues: req.body.hvacIssues === 'true',
                    hvacExplanation: req.body.hvacExplanation,
                    
                    electricalIssues: req.body.electricalIssues === 'true',
                    electricalExplanation: req.body.electricalExplanation,
                    
                    plumbingIssues: req.body.plumbingIssues === 'true',
                    plumbingExplanation: req.body.plumbingExplanation,
                    
                    waterSource: req.body.waterSource,
                    waterIssues: req.body.waterIssues === 'true',
                    waterExplanation: req.body.waterExplanation,
                    
                    sewageSystem: req.body.sewageSystem,
                    sewageIssues: req.body.sewageIssues === 'true',
                    sewageExplanation: req.body.sewageExplanation
                };
                listing.disclosures.status.section2Completed = true;
                break;
                
            case 'section3':
                listing.disclosures.structure = {
                    roofAge: req.body.roofAge,
                    roofLeaked: req.body.roofLeaked === 'true',
                    roofExplanation: req.body.roofExplanation,
                    
                    foundationIssues: req.body.foundationIssues === 'true',
                    foundationExplanation: req.body.foundationExplanation,
                    
                    basementWaterIssues: req.body.basementWaterIssues === 'true',
                    basementExplanation: req.body.basementExplanation,
                    
                    termiteIssues: req.body.termiteIssues === 'true',
                    termiteExplanation: req.body.termiteExplanation
                };
                listing.disclosures.status.section3Completed = true;
                break;
                
            case 'section4':
                listing.disclosures.environmental = {
                    asbestosPresent: req.body.asbestosPresent === 'true',
                    moldPresent: req.body.moldPresent === 'true',
                    radonPresent: req.body.radonPresent === 'true',
                    leadHazards: req.body.leadHazards === 'true',
                    otherEnvironmentalConcerns: req.body.otherEnvironmentalConcerns === 'true',
                    environmentalExplanation: req.body.environmentalExplanation,
                    
                    hasHOA: req.body.hasHOA === 'true',
                    hoaName: req.body.hoaName,
                    hoaFees: req.body.hoaFees,
                    hoaFeePeriod: req.body.hoaFeePeriod,
                    
                    insuranceClaims: req.body.insuranceClaims === 'true',
                    insuranceExplanation: req.body.insuranceExplanation,
                    inFloodZone: req.body.inFloodZone === 'true',
                    floodZoneExplanation: req.body.floodZoneExplanation,
                    
                    additionalDefects: req.body.additionalDefects === 'true',
                    additionalExplanation: req.body.additionalExplanation
                };
                listing.disclosures.status.section4Completed = true;
                break;
                
            default:
                req.flash("error", "Invalid section.");
                return res.redirect("/listings/manage");
        }
        
        // Update last updated timestamp
        if (!listing.disclosures.status) {
            listing.disclosures.status = {};
        }
        listing.disclosures.status.lastUpdated = new Date();
        
        // Check if all sections are complete
        if (listing.isDisclosureComplete && listing.isDisclosureComplete()) {
            listing.disclosures.status.fullyCompleted = true;
        }
        
        await listing.save();
        
        // Determine next section or redirect to dashboard if complete
        let nextSection;
        if (section === 'section1') nextSection = 'section2';
        else if (section === 'section2') nextSection = 'section3';
        else if (section === 'section3') nextSection = 'section4';
        
        if (nextSection && listing.disclosures.status && !listing.disclosures.status[`${nextSection}Completed`]) {
            req.flash("success", "Section saved! Please complete the next section.");
            return res.redirect(`/disclosures/listing/${listingId}/edit/${nextSection}`);
        } else {
            // If we're at the end or other sections are already complete
            if (listing.isDisclosureComplete && listing.isDisclosureComplete()) {
                req.flash("success", "All sections completed! Your disclosure is now ready for review.");
            } else {
                req.flash("success", "Section saved! Please complete any remaining sections.");
            }
            return res.redirect("/listings/manage");
        }
    } catch (error) {
        console.error(`❌ Error updating ${req.params.section}:`, error);
        req.flash("error", "Error saving disclosure section.");
        res.redirect(`/disclosures/listing/${req.params.listingId}/edit/${req.params.section}`);
    }
};

// Generate PDF from completed disclosures
exports.generateDisclosurePDF = async (req, res) => {
    try {
        const { listingId } = req.params;
        const listing = await Listing.findById(listingId)
                .populate('seller', 'name email')
                .lean();
                
        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings/manage");
        }
        
        if (!listing.isDisclosureComplete || !listing.isDisclosureComplete()) {
            req.flash("error", "You must complete all disclosure sections before generating a PDF.");
            return res.redirect("/listings/manage");
        }
        
        // Import the function directly and call it with the listing object
        const { generatePdfFromTemplate } = require('../utils/pdfGenerator');
        const pdfBuffer = await generatePdfFromTemplate('views/listings/addons/sellerDisclosures.ejs', listing);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="SellersDisclosures.pdf"');
        res.end(pdfBuffer);
    } catch (error) {
        console.error("Error generating disclosure PDF:", error);
        req.flash("error", "Error generating disclosure PDF.");
        res.redirect("/listings/manage");
    }
};

// Acknowledge completed disclosures
exports.acknowledgeDisclosure = async (req, res) => {
    try {
        const { listingId } = req.params;
        
        // Verify listing ownership
        const listing = await Listing.findById(listingId);
        if (!listing || listing.seller.toString() !== req.user._id.toString()) {
            req.flash("error", "Unauthorized to acknowledge disclosure for this listing.");
            return res.redirect("/listings/manage");
        }
        
        if (!listing.isDisclosureComplete || !listing.isDisclosureComplete()) {
            req.flash("error", "Disclosure must be fully completed before acknowledging.");
            return res.redirect("/listings/manage");
        }
        
        // Initialize acknowledgment if it doesn't exist
        if (!listing.disclosures.acknowledgment) {
            listing.disclosures.acknowledgment = {};
        }
        
        // Update acknowledgment
        listing.disclosures.acknowledgment = {
            acknowledged: true,
            acknowledgedAt: new Date(),
            sellerIp: req.ip
        };
        
        await listing.save();
        
        req.flash("success", "Disclosure successfully acknowledged.");
        res.redirect("/listings/manage");
    } catch (error) {
        console.error("❌ Error acknowledging disclosure:", error);
        req.flash("error", "Error acknowledging disclosure.");
        res.redirect("/listings/manage");
    }
};

// Helper function to get section titles
function getSectionTitle(section) {
    switch(section) {
        case 'section1': return 'Statutory Disclosures';
        case 'section2': return 'Property Systems';
        case 'section3': return 'Structure and Exterior';
        case 'section4': return 'Environmental Concerns & Other';
        default: return 'Disclosures';
    }
}

module.exports = exports;