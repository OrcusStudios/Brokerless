// routes/closingRoutes.js
const express = require('express');
const router = express.Router();
const closingController = require('../controllers/closingController');
const titleController = require('../controllers/titleController');
const documentController = require('../controllers/documentController');
const { ensureAuthenticated, ensureProfessional } = require('../middleware/authMiddleware');
const { fileUploadMiddleware } = require('../middleware/fileUploadMiddleware');

// Dashboard routes
router.get('/:offerId', ensureAuthenticated, closingController.getClosingDashboard);
router.get('/:offerId/complete', ensureAuthenticated, closingController.getCompletionSummary);

// Closing step routes
router.post('/:offerId/steps/:stepId', ensureAuthenticated, closingController.updateClosingStep);

// Document routes
router.get('/:offerId/documents', ensureAuthenticated, documentController.getDocuments);
router.post('/:offerId/documents', fileUploadMiddleware, ensureAuthenticated, documentController.uploadDocument);
router.post('/documents/:documentId/sign', ensureAuthenticated, documentController.signDocument);

// Title company specific routes
router.post('/earnest-money-confirm', ensureAuthenticated, ensureProfessional, titleController.confirmEarnestMoney);
router.post('/title-work-update', ensureAuthenticated, ensureProfessional, titleController.updateTitleWorkStatus);
router.post('/send-settlement-statements', fileUploadMiddleware, ensureAuthenticated, ensureProfessional, titleController.sendSettlementStatements);
router.post('/update-status', ensureAuthenticated, ensureProfessional, titleController.updateClosingStatus);
router.post('/complete-closing', ensureAuthenticated, ensureProfessional, titleController.completeClosing);
router.post('/payment-status-update', ensureAuthenticated, ensureProfessional, titleController.updatePaymentStatus);

// Inspection routes
router.get('/:offerId/inspection-options', ensureAuthenticated, closingController.getInspectionOptions);
router.get('/:offerId/schedule-inspection', ensureAuthenticated, closingController.getScheduleInspection);
router.post('/:offerId/schedule-inspection', ensureAuthenticated, closingController.scheduleInspection);
router.post('/:offerId/waive-inspection', ensureAuthenticated, closingController.waiveInspection);

// Closing initialization
router.post('/initialize/:offerId', ensureAuthenticated, closingController.initializeClosing);

// Analytics (if implemented)
router.get('/analytics', ensureAuthenticated, closingController.getClosingAnalytics);

module.exports = router;
