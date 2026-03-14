const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Types.ObjectId,
    ref: "userdata",
    required: true
  },
  section_id: {
    type: mongoose.Types.ObjectId,
    ref: "createCliqkData",
    default: null
  },
  reward_type: {
    type: String,
    enum: ["user_weekly_winner", "section_weekly_winner"],
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "approved", "completed", "rejected"],
    default: "pending"
  },
  reward_details: {
    song_title: { type: String, default: "" },
    genre: { type: String, default: "" },
    theme: { type: String, default: "" },
    inspiration: { type: String, default: "" },
    special_notes: { type: String, default: "" }
  },
  admin_video: {
    video_url: { type: String, default: "" },
    video_title: { type: String, default: "Congratulations Video" },
    video_description: { type: String, default: "" },
    uploaded_at: { type: Date, default: null }
  },
  admin_notes: {
    type: String,
    default: ""
  },
  estimated_completion_days: {
    type: Number,
    default: 3
  },
  submitted_at: {
    type: Date,
    default: Date.now
  },
  approved_at: {
    type: Date,
    default: null
  },
  completed_at: {
    type: Date,
    default: null
  },
  week_start_date: {
    type: Date,
    required: true
  },
  week_end_date: {
    type: Date,
    required: true
  }
});

const Reward = mongoose.model('Reward', rewardSchema);
module.exports = Reward;