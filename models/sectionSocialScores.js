const mongoose = require("mongoose");


const sectionSocialSchema = new mongoose.Schema(
    {
        sectionId: {
            type: mongoose.Types.ObjectId,
            ref: "createCliqkData"
        },
        scoresData: [{
            score: {
                type: Number,
                default: 0
            },
            userId: {
                type: mongoose.Types.ObjectId,
                ref: "userdata"
            },
            // join_member , post_in_sectoion , comments_on_post_section , likes_on_section_post
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
        totalScore: {
            type: Number,
            default: 0
        },
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

const csectionSocialSData = new mongoose.model("csectionSocialSData", sectionSocialSchema);
module.exports = csectionSocialSData;