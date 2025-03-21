module.exports = function closing(doc, offer, styles, applyStyle) {
    applyStyle(styles.heading1).text('6. CLOSING', { underline: true }).moveDown(0.5);

    applyStyle(styles.normal)
        .text(`Closing Date: ${offer.closingDate || 'Not specified'}`)
        .moveDown(0.3)
        .text(`Title Company: ${offer.titleCompany || 'Not specified'}`)
        .moveDown(0.3)
        .text(`Closing Costs: ${offer.closingCosts === 'buyer' ? 'Buyer pays all closing costs' :
            offer.closingCosts === 'seller' ? 'Seller pays all closing costs' :
            offer.closingCosts === 'split' ? 'Split equally between buyer and seller' :
            offer.closingCosts === 'each_pays_own' ? 'Each party pays their own closing costs' :
            'Not specified'}
        `)
        .moveDown(1);
};