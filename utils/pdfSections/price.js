module.exports = function price(doc, offer, styles, applyStyle) {
    applyStyle(styles.heading1).text('3. PURCHASE PRICE AND FINANCING', { underline: true }).moveDown(0.5);

    applyStyle(styles.normal)
        .text(`Purchase Price: $${offer.offerPrice ? offer.offerPrice.toLocaleString() : 'Not specified'}`)
        .moveDown(0.5)
        .text(`Financing Method: ${offer.financingType === 'cash' ? 'All Cash Offer' : offer.financingType === 'bank' ? 'Bank Financing' : offer.financingType === 'seller' ? 'Seller Financing' : 'Not specified'}`)
        .moveDown(0.5);

    if (offer.financingType === 'bank') {
        doc.text(`Loan Type: ${offer.loanType || 'Not specified'}`)
           .text(`Loan Amount: ${offer.loanAmount || 'Not specified'}`)
           .text(`Interest Rate: ${offer.interestRate || 'Not specified'}`)
           .moveDown(1);
    } else {
        doc.moveDown(1);
    }
};