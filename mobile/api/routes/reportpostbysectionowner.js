const mongoose = require("mongoose");

const reportPostBySectionOwnerSchema = new mongoose.Schema({

    userId: {
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

const reportPostBySectionOwnerData = new mongoose.model('reportPostBySectionOwnerData', reportPostBySectionOwnerSchema);
module.exports = reportPostBySectionOwnerData