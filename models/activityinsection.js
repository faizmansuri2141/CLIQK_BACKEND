const mongoose = require('mongoose');

const activityInSectionSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Types.ObjectId
    },
    sectionId : {
        type : mongoose.Types.ObjectId
    },
    postId : {
        type : mongoose.Types.ObjectId
    },
    isSeen : {
        type : Boolean,
        default : false
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },

})


const activityInSectionData = new mongoose.model('activityInSectionData', activityInSectionSchema);
module.exports = activityInSectionData;


