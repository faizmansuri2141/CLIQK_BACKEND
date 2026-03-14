const express = require('express');
const router = express.Router();
const Report = require('./models/Report');
const moment = require("moment");

// GET reports dashboard
router.get('/admin/reports', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Build filter
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Get reports with pagination
    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('reportedByUserId', 'fullname username email')
      .populate('reportedUserId', 'fullname username email');

    const total = await Report.countDocuments(filter);

    // Get statistics
    const stats = {
      total: await Report.countDocuments(),
      pending: await Report.countDocuments({ status: 'pending' }),
      resolved: await Report.countDocuments({ status: 'resolved' }),
      dismissed: await Report.countDocuments({ status: 'dismissed' })
    };

    res.render('reports', {
      reports,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      stats,
      currentFilter: status || 'all',
      moment,
      admin: req.admin
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).render('error', { 
      message: 'Error fetching reports',
      admin: req.admin 
    });
  }
});

module.exports = router;
