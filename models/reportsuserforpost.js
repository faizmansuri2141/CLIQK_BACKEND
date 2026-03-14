const mongoose = require("mongoose");

// user report for post violance

const reportUserForPostSchema = new mongoose.Schema({

    currentUserId: {
        type: mongoose.Types.ObjectId,
    },
    reportUserId: {
        type: mongoose.Types.ObjectId,
    },
    postId: {
        type: mongoose.Types.ObjectId,
    },
    reason: {
        type: String
    },
    isReport: {
        type: Boolean,
        default: false
    },
    createdAt: {

        type: Date,
        default: Date.now()
    },
    UpdateAt: {
        type: Date,
        default: Date.now()

    },
})

const reportUserForPostData = new mongoose.model('reportUserForPostData', reportUserForPostSchema);
module.exports = reportUserForPostData