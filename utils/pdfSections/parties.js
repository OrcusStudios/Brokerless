module.exports = function parties(doc, offer, styles, applyStyle) {
    applyStyle(styles.heading1)
        .text('1. DATE AND PARTIES', { underline: true })
        .moveDown(0.5);

    applyStyle(styles.normal)
        .text(`This Missouri Residential Real Estate Purchase Agreement ("Agreement") is made and entered into on ${new Date().toLocaleDateString('en-US')}.`)
        .moveDown();

    const buyerName = offer.buyer?.name || offer.buyerName || 'Not provided';
    const sellerName = offer.seller?.name || offer.sellerName || 'Not provided';
    const offerExpiration = offer.offerExpiration ? new Date(offer.offerExpiration).toLocaleDateString('en-US') : 'Not specified';

    applyStyle(styles.bold).text(`BUYER: `, { continued: true }).font('Helvetica').text(buyerName).moveDown(0.3);
    applyStyle(styles.bold).text(`SELLER: `, { continued: true }).font('Helvetica').text(sellerName).moveDown(0.3);
    applyStyle(styles.bold).text(`Offer Expiration: `, { continued: true }).font('Helvetica').text(offerExpiration).moveDown(1);
};
