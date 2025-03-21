module.exports = function earnest(doc, offer, styles, applyStyle) {
    applyStyle(styles.heading1).text('4. EARNEST MONEY DEPOSIT', { underline: true }).moveDown(0.5);

    applyStyle(styles.normal)
        .text(`Earnest Money Amount: $${offer.earnestMoney || 'Not specified'}`)
        .moveDown(0.3)
        .text(`Due Date: ${offer.earnestDueDate || 'Not specified'}`)
        .moveDown(0.3)
        .text(`Escrow Agent/Title Company: ${offer.escrowAgent || offer.titleCompany || 'Not specified'}`)
        .moveDown(0.3)
        .text(`Escrow Agent Address: ${offer.title || 'Not specified'}`)
        .moveDown(1);
};