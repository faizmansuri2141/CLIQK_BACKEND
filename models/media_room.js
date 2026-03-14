const mongoose = require('mongoose');

const media_Room_Schema = new mongoose.Schema({

    owners_id: {
        type: mongoose.Types.ObjectId
    },
    owners_name: {
        type: String
    },
    Selection_id: {
        type: mongoose.Types.ObjectId
    },
    cover_image: {
        type: String,
    },
    file_name: {
        type: String
    },
    file_type: {
        type: String,
        enum: ["mp3", "mp4"]
    },
    file_upload_mp3: {
        type: String
    },
    file_upload_mp4: {
        type: String
    },
    time_line: {
        type: Boolean,
    },
    // like_list: [{
    //     type: mongoose.Types.ObjectId
    // }],
    is_views_counts: {
        type: Number,
        default: 0,
    },

    created_at: { type: Date, required: true, default: Date.now }

})


const media_Room_Data = new mongoose.model('media_Room_Data', media_Room_Schema);
module.exports = media_Room_Data;


