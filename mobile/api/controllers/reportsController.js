const Report = require('../../../models/Report');
const fetch = require('node-fetch').default;
const mongoose = require('mongoose');

// Create a new report
exports.createReport = async (req, res) => {
  try {
    const {
      reportedMessageId,
      reportedUserId,
      sectionId,
      reason,
      messageContent
    } = req.body;

    // -------------------------------
    // 1️⃣ Required field validation
    // -------------------------------
    if (!reportedMessageId || !reason) {
      return res.status(400).json({
        status: 0,
        message: 'reportedMessageId and reason are required'
      });
    }

    // -------------------------------
    // 2️⃣ ObjectId validation
    // -------------------------------
    if (!mongoose.Types.ObjectId.isValid(reportedMessageId)) {
      return res.status(400).json({
        status: 0,
        message: 'Invalid reportedMessageId'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.user?._id)) {
      return res.status(400).json({
        status: 0,
        message: 'Invalid user'
      });
    }

    if (reportedUserId && !mongoose.Types.ObjectId.isValid(reportedUserId)) {
      return res.status(400).json({
        status: 0,
        message: 'Invalid reportedUserId'
      });
    }

    if (sectionId && !mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        status: 0,
        message: 'Invalid sectionId'
      });
    }

    // -------------------------------
    // 3️⃣ Create Report
    // -------------------------------
    const newReport = new Report({
      reportedMessageId: new mongoose.Types.ObjectId(reportedMessageId),
      reportedUserId: reportedUserId
        ? new mongoose.Types.ObjectId(reportedUserId)
        : null,
      reportedByUserId: new mongoose.Types.ObjectId(req.user._id),
      sectionId: sectionId
        ? new mongoose.Types.ObjectId(sectionId)
        : null,
      reason,
      messageContent: messageContent || null,
      status: 'pending'
    });

    const savedReport = await newReport.save();

    // -------------------------------
    // 4️⃣ Slack notification
    // -------------------------------
    await sendSlackNotification(savedReport, req.user, reason);

    return res.status(201).json({
      status: 1,
      message: 'Report submitted successfully',
      data: {
        reportId: savedReport._id,
        status: savedReport.status,
        createdAt: savedReport.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating report:', error);
    return res.status(500).json({
      status: 0,
      message: 'Internal server error'
    });
  }
};

// Get all reports (admin only)
exports.getReports = async (req, res) => {
  try {
    // Check if user is admin (you may need to implement admin check)
    if (!req.user.isAdmin) {
      return res.status(403).json({
        status: 0,
        message: 'Admin access required'
      });
    }

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
      .skip((page - 1) * limit);

    const total = await Report.countDocuments(filter);

    res.json({
      status: 1,
      message: 'Reports fetched successfully',
      data: reports,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      status: 0,
      message: 'Internal server error'
    });
  }
};

// Update report status (admin only)
exports.updateReport = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        status: 0,
        message: 'Admin access required'
      });
    }

    const { status } = req.body;
    const reportId = req.params.id;

    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        status: 0,
        message: 'Invalid status'
      });
    }

    const updateData = {
      status,
      resolvedAt: status !== 'pending' ? new Date() : null,
      resolvedBy: status !== 'pending' ? req.user._id.toString() : null
    };

    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      updateData,
      { new: true }
    );

    if (!updatedReport) {
      return res.status(404).json({
        status: 0,
        message: 'Report not found'
      });
    }

    // Send notification to Slack
    await sendSlackNotification(updatedReport, req.user, status);

    res.json({
      status: 1,
      message: 'Report updated successfully',
      data: updatedReport
    });

  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      status: 0,
      message: 'Internal server error'
    });
  }
};

// Helper function to send Slack notification
async function sendSlackNotification(report, reportingUser, reason) {
  try {
    const slackWebhookUrl = process.env.SLACK_REPORTS_WEBHOOK_URL;
    
    if (!slackWebhookUrl) {
      console.log('Slack webhook URL not configured');
      return;
    }

    const reasonLabels = {
      'spam_or_bot': 'Spam or Bot',
      'harassment_or_bullying': 'Harassment or Bullying',
      'hate_speech': 'Hate Speech',
      'misinformation': 'Misinformation',
      'inappropriate_content': 'Inappropriate Content',
      'other': 'Other'
    };

    const reasonLabel = reasonLabels[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const payload = {
      text: `🚨 New Report Submitted`,
      attachments: [
        {
          color: 'danger',
          fields: [
            {
              title: 'Report ID',
              value: report._id.toString(),
              short: true
            },
            {
              title: 'Reason',
              value: reasonLabels[report.reason] || report.reason,
              short: true
            },
            {
              title: 'Reported By',
              value: `${reportingUser.fullname || reportingUser.username} (${reportingUser.email})`,
              short: true
            },
            {
              title: 'Message ID',
              value: report.reportedMessageId,
              short: true
            },
            {
              title: 'Section ID',
              value: report.sectionId || 'N/A',
              short: true
            },
            {
              title: 'Reported User ID',
              value: report.reportedUserId || 'N/A',
              short: true
            },
            {
              title: 'Message Content',
              value: report.messageContent || 'N/A',
              short: false
            },
            {
              title: 'Time',
              value: new Date().toLocaleString(),
              short: true
            }
          ],
          footer: 'Report System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Failed to send Slack notification:', response.statusText);
    } else {
      console.log('Slack notification sent successfully');
    }

  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
}
