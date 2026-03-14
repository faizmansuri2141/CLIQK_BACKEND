const mongoose = require("mongoose");

const forTickSchema = new mongoose.Schema({

    descriptionForTick: {
        type: String,
    },
    uploadCertificate: [{
        image: {
            type: String,
        },
        default: ""
    }],
    videoRecord: {
        type: String
    },
    instagramUserName: {
        type: String,
    },
    xtwitterUserName: {
        type: String,
    },
    tikTokUserName: {
        type: String,
    },
    isVerifiedForTick: {
        type: Boolean
    },
    createdBy: {
        type: Date,
        default: Date.now()
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userData'
    },

})

const forTickData = new mongoose.model('forTickData', forTickSchema);
module.exports = forTickData;