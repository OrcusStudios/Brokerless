// Updated formatQueryToOffer function for offerController.js
function formatQueryToOffer(query) {
    // Transform query parameters to match the structure of an Offer object
    return {
        buyerFullName: query.buyerFullName || '',
        buyerEmail: query.buyerEmail || '',
        sellerName: query.sellerName || '',
        propertyAddress: query.propertyAddress || '',
        propertyCounty: query.propertyCounty || '',
        propertyType: query.propertyType || '',
        offerPrice: parseInt(query.offerPrice) || 0,
        financingType: query.financingType || 'cash',
        loanType: query.loanType || '',
        loanAmount: parseInt(query.loanAmount) || 0,
        interestRate: parseFloat(query.interestRate) || 0,
        earnestMoney: parseInt(query.earnestMoney) || 0,
        earnestDueDate: query.earnestDueDate || '',
        escrowAgent: query.escrowAgent || '',
        contingencies: Array.isArray(query.contingencies) ? query.contingencies : 
                      (query.contingencies ? [query.contingencies] : []),
        appraisalDeadlineDays: parseInt(query.appraisalDeadlineDays) || 21,
        loanApprovalDeadlineDays: parseInt(query.loanApprovalDeadlineDays) || 30,
        inspectionDeadlineDays: parseInt(query.inspectionDeadlineDays) || 10,
        saleOfAnotherAddress: query.saleOfAnotherAddress || '',
        closingDate: query.closingDate || '',
        titleCompany: query.titleCompany || '',
        closingCosts: query.closingCosts || 'each_pays_own',
        includedPersonalProperty: query.includedPersonalProperty || '',
        excludedPersonalProperty: query.excludedPersonalProperty || '',
        acknowledgment: query.acknowledgment === 'true',
        agreeDocuments: query.agreeDocuments === 'true',
        
        // Handle riders more effectively
        riders: {
            // Wire Fraud Advisory - Required
            wireFraudAdvisory: {
                included: true, // This is required
                acknowledged: query['riders.wireFraudAdvisory.acknowledged'] === 'on' || 
                              query['riders.wireFraudAdvisory.acknowledged'] === 'true',
                acknowledgedDate: new Date()
            },
            
            // Home Inspection Advisory - Required
            homeInspectionAdvisory: {
                included: true, // This is required
                acknowledged: query['riders.homeInspectionAdvisory.acknowledged'] === 'on' || 
                              query['riders.homeInspectionAdvisory.acknowledged'] === 'true',
                acknowledgedDate: new Date()
            },
            
            // Platform Fee - Required
            fee: {
                included: true, // This is required
                platformFee: parseFloat(query['riders.fee.platformFee']) || 250,
                feeAcknowledged: query['riders.fee.feeAcknowledged'] === 'on' || 
                                 query['riders.fee.feeAcknowledged'] === 'true'
            },
            
            // Government Loan Rider - Optional
            governmentLoan: {
                included: query['riders.governmentLoan.included'] === 'on' || 
                          query['riders.governmentLoan.included'] === 'true',
                loanType: query['riders.governmentLoan.loanType'] || '',
                loanPercentage: parseFloat(query['riders.governmentLoan.loanPercentage']) || 0,
                loanContingencyDeadline: parseInt(query['riders.governmentLoan.loanContingencyDeadline']) || 25,
                appraisalValue: parseFloat(query['riders.governmentLoan.appraisalValue']) || 0
            },
            
            // Sight Unseen Rider - Optional
            sightUnseen: {
                included: query['riders.sightUnseen.included'] === 'on' || 
                          query['riders.sightUnseen.included'] === 'true',
                reserveRightToView: query['riders.sightUnseen.reserveRightToView'] === 'true',
                propertyViewingPeriod: parseInt(query['riders.sightUnseen.propertyViewingPeriod']) || 5
            },
            
            // Contingency for Sale of Buyer's Existing Property - Optional
            contingencyForSale: {
                included: query['riders.contingencyForSale.included'] === 'on' || 
                          query['riders.contingencyForSale.included'] === 'true',
                existingPropertyAddress: query['riders.contingencyForSale.existingPropertyAddress'] || '',
                existingPropertyClosingDeadline: query['riders.contingencyForSale.existingPropertyClosingDeadline'] || '',
                kickOutHours: parseInt(query['riders.contingencyForSale.kickOutHours']) || 72
            },
            
            // Contingency for Closing of Buyer's Existing Property - Optional
            contingencyForClosing: {
                included: query['riders.contingencyForClosing.included'] === 'on' || 
                          query['riders.contingencyForClosing.included'] === 'true',
                existingPropertyContractDate: query['riders.contingencyForClosing.existingPropertyContractDate'] || '',
                existingPropertyAddress: query['riders.contingencyForClosing.existingPropertyAddress'] || '',
                existingPropertyContainsContingency: query['riders.contingencyForClosing.existingPropertyContainsContingency'] === 'on' || 
                                                   query['riders.contingencyForClosing.existingPropertyContainsContingency'] === 'true'
            },
            
            // Walk Through Notice - Optional
            walkThrough: {
                included: query['riders.walkThrough.included'] === 'on' || 
                          query['riders.walkThrough.included'] === 'true',
                scheduledDate: query['riders.walkThrough.scheduledDate'] || '',
                completed: false,
                issues: []
            }
        }
    };
}