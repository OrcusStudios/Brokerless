module.exports = function signatures(doc, offer, styles, applyStyle) {
    applyStyle(styles.heading1).text('10. SIGNATURES', { underline: true }).moveDown(0.5);

    applyStyle(styles.normal)
        .text(`BUYER:`).moveDown(0.3)
        .text(`Signature: ____________________________`)
        .text(`Printed Name: ${offer.buyerName || '_______________________'}`)
        .text(`Date: ________________________________`).moveDown(1);

    doc.text(`SELLER:`).moveDown(0.3)
        .text(`Signature: ____________________________`)
        .text(`Printed Name: ${offer.sellerName || '_______________________'}`)
        .text(`Date: ________________________________`).moveDown(1);
};