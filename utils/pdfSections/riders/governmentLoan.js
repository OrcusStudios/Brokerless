module.exports = function governmentLoan(doc, offer, styles, applyStyle) {
    doc.addPage();
    applyStyle(styles.heading1).text('GOVERNMENT LOAN RIDER', { underline: true }).moveDown(0.5);

    applyStyle(styles.normal)
        .text(`Loan Type: ${offer.riders.governmentLoan?.loanType || 'Not specified'}`)
        .moveDown(0.3)
        .text(`Loan Percentage: ${offer.riders.governmentLoan?.loanPercentage || 'Not specified'}%`)
        .moveDown(0.3)
        .text(`Loan Contingency Deadline: ${offer.riders.governmentLoan?.loanContingencyDeadline || 'Not specified'}`)
        .moveDown(1);
};