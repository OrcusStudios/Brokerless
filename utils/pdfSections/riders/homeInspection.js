module.exports = function homeInspection(doc, offer, styles, applyStyle) {
    applyStyle(styles.heading1).text('HOME INSPECTION ADVISORY', { underline: true }).moveDown(0.5);

    applyStyle(styles.normal)
        .text('Buyer is advised to obtain a professional home inspection to evaluate the overall condition of the property.')
        .moveDown(0.5)
        .text(`Acknowledged: ${offer.riders.homeInspectionAdvisory?.acknowledged ? 'Yes' : 'No'}`)
        .moveDown(1);
};