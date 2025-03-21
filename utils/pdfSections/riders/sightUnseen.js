module.exports = function contingencyForSale(doc, offer, styles, applyStyle) {
    doc.addPage();
    applyStyle(styles.heading1).text("CONTINGENCY FOR SALE OF BUYER'S EXISTING PROPERTY", { underline: true }).moveDown(0.5);

    applyStyle(styles.normal)
        .text(`Existing Property Address: ${offer.riders.contingencyForSale?.existingPropertyAddress || 'Not specified'}`)
        .moveDown(0.3)
        .text(`Closing Deadline: ${offer.riders.contingencyForSale?.existingPropertyClosingDeadline || 'Not specified'}`)
        .moveDown(0.3)
        .text(`Kick-Out Period: ${offer.riders.contingencyForSale?.kickOutHours || 'Not specified'} hours`)
        .moveDown(1);
};