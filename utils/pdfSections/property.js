module.exports = function property(doc, offer, styles, applyStyle) {
    applyStyle(styles.heading1).text('2. PROPERTY DESCRIPTION', { underline: true }).moveDown(0.5);

    applyStyle(styles.normal)
        .text(`PROPERTY ADDRESS: ${offer.propertyAddress || 'Not specified'}`)
        .moveDown(0.3)
        .text(`COUNTY: ${offer.propertyCounty || 'Not specified'}`)
        .moveDown(0.3)
        .text(`PROPERTY TYPE: ${offer.propertyType || 'Not specified'}`)
        .moveDown(0.3)
        .text(`LEGAL DESCRIPTION: To be provided in the final contract`)
        .moveDown(0.5);

    doc.text(`INCLUDED PERSONAL PROPERTY: ${offer.includedPersonalProperty || 'None specified'}`).moveDown(0.3);
    doc.text(`EXCLUDED PERSONAL PROPERTY: ${offer.excludedPersonalProperty || 'None specified'}`).moveDown(1);
};