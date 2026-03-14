const mongoose = require("mongoose");


const playerSocialSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Types.ObjectId,
            ref: "userdata"
        },
        // running log of every score event
        scoresData: [{
            score: {
                type: Number,
                default: 0
            },
            userId: {
                type: mongoose.Types.ObjectId,
                ref: "userdata"
            },
            // join_member , post_comment , post_like , comment_replies , comment_like  , user_created_post , posts_like_by_user , posts_comment_on_by_user
            scoreFor: {
                type: String
            },
            timestamp: {
                type: Date,
                default: Date.now
            },
            additionalData: {
                type: Object,
                default: {}
            }
        }],
        // cumulative total (all-time)
        totalScore: {
            type: Number,
            default: 0
        },
        // weekly aggregation for leaderboard/rewards
        weeklyScores: [{
            weekNumber: Number,
            year: Number,
            score: {
                type: Number,
                default: 0
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],
        currentWeekScore: {
            type: Number,
            default: 0
        },
        currentWeekNumber: {
            type: Number
        },
        currentWeekYear: {
            type: Number
        }
    },
    { timestamps: true }
);

const playerSocialSData = new mongoose.model("playerSocialSData", playerSocialSchema);
module.exports = playerSocialSData;