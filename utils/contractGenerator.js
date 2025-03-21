// Add this at the bottom of your controller file
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
        contingencies: query.contingencies || [],
        closingDate: query.closingDate || '',
        titleCompany: query.titleCompany || '',
        closingCosts: query.closingCosts || '',
        
        // Handle riders
        riders: {
            wireFraudAdvisory: {
                included: query['riders.wireFraudAdvisory.included'] === 'on',
                acknowledged: query['riders.wireFraudAdvisory.acknowledged'] === 'on'
            },
            homeInspectionAdvisory: {
                included: query['riders.homeInspectionAdvisory.included'] === 'on',
                acknowledged: query['riders.homeInspectionAdvisory.acknowledged'] === 'on'
            },
            governmentLoan: {
                included: query['riders.governmentLoan.included'] === 'on',
                loanType: query['riders.governmentLoan.loanType'] || '',
                loanPercentage: parseFloat(query['riders.governmentLoan.loanPercentage']) || 0,
                loanContingencyDeadline: parseInt(query['riders.governmentLoan.loanContingencyDeadline']) || 25
            }
            // Add other riders as needed
        }
    };
}