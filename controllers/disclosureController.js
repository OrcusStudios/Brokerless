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
            'section1': 'statutoryDisclosures',
            'section2': 'propertySystems',
            'section3': 'structureExterior',
            'section4': 'environmentalOther'
        };
        
        res.render(`listings/addons/disclosures/${sectionTemplates[section]}`, {
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
                status: {
                    lastUpdated: new Date()
                }
            };
        }
        
        // Ensure status object exists
        if (!listing.disclosures.status) {
            listing.disclosures.status = {
                lastUpdated: new Date()
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
        listing.disclosures.status.lastUpdated = new Date();
        
        // Check if all sections are complete
        const allSectionsCompleted = 
            listing.disclosures.status.section1Completed &&
            listing.disclosures.status.section2Completed &&
            listing.disclosures.status.section3Completed &&
            listing.disclosures.status.section4Completed;
        
        // Set fully completed flag
        listing.disclosures.status.fullyCompleted = allSectionsCompleted;

        // Save the listing
        await listing.save();
        
        // Determine next steps
        if (allSectionsCompleted) {
            req.flash("success", "All sections completed! Your disclosure is now ready for review.");
            return res.redirect("/listings/manage");
        } else {
            req.flash("success", "Section saved successfully!");
            
            // Determine the next section to redirect to
            const nextSection = getNextSection(section, listing.disclosures.status);
            if (nextSection) {
                return res.redirect(`/disclosures/listing/${listingId}/edit/${nextSection}`);
            } else {
                return res.redirect("/listings/manage");
            }
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

// Helper function to determine the next section to redirect to
function getNextSection(currentSection, status) {
    const sections = ['section1', 'section2', 'section3', 'section4'];
    const currentIndex = sections.indexOf(currentSection);
    
    // If current section is the last one, return null
    if (currentIndex === sections.length - 1) {
        return null;
    }
    
    // Find the next incomplete section
    for (let i = currentIndex + 1; i < sections.length; i++) {
        const sectionKey = `${sections[i]}Completed`;
        if (!status[sectionKey]) {
            return sections[i];
        }
    }
    
    // If all remaining sections are complete, return null
    return null;
}

module.exports = exports;
