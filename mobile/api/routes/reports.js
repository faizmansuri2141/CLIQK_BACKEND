const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const vary = require('../../../middleware/authUser');
const reportsController = require('../controllers/reportsController');

// Rate limiting: 5 reports per hour per user
const reportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 reports per hour
  message: {
    status: 0,
    message: 'Too many reports. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/reports - Create a new report
router.post('/createReport', vary, reportRateLimit, reportsController.createReport);

// GET /api/reports - Get all reports (admin only)
router.get('/', vary, reportsController.getReports);

// PUT /api/reports/:id - Update report status (admin only)
router.put('/:id', vary, reportsController.updateReport);

module.exports = router;
