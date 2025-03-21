module.exports = function contingencies(doc, offer, styles, applyStyle) {
    applyStyle(styles.heading1).text('5. CONTINGENCIES', { underline: true }).moveDown(0.5);

    if (Array.isArray(offer.contingencies) && offer.contingencies.length > 0) {
        applyStyle(styles.normal).text(`Buyer contingencies:`).moveDown(0.5);

        offer.contingencies.forEach(contingency => {
            doc.text(`• ${contingency}`).moveDown(0.3);
        });
        doc.moveDown(1);
    } else {
        doc.fontSize(styles.bodyFontSize).text(`No contingencies specified.`).moveDown(1);
    }
};