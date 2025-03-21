module.exports = function wireFraudAdvisory(doc, offer, styles, applyStyle) {
    doc.addPage();
    applyStyle(styles.heading1).text('WIRE FRAUD ADVISORY', { underline: true }).moveDown(0.5);

    applyStyle(styles.normal)
        .text('Criminals target real estate transactions to steal sensitive data.')
        .moveDown(0.3)
        .text(`Acknowledged: ${offer.riders.wireFraudAdvisory?.acknowledged ? 'Yes' : 'No'}`)
        .moveDown(0.3)
        .text(`Date: ${offer.riders.wireFraudAdvisory?.acknowledgedDate || 'Not specified'}`)
        .moveDown(1);
};