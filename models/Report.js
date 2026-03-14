const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportedMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref :"createPostData",
    required: true
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref :"userdata",
    default: null
  },
  reportedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
        ref :"userdata",
    required: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
        ref :"createCliqkData",
    default: null
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'spam_or_bot',
      'harassment_or_bullying',
      'hate_speech',
      'misinformation',
      'inappropriate_content',
      'other'
    ]
  },
  messageContent: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'dismissed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  }
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
