const mongoose = require('mongoose');

const media_like_Schema = new mongoose.Schema({

    section_id: {
        type: mongoose.Types.ObjectId
    },
    user_id: {
        type: mongoose.Types.ObjectId
    },
    media_id: {
        type: mongoose.Types.ObjectId
    },
    created_at: { type: Date, required: true, default: Date.now }

})


const media_like_Data = new mongoose.model('media_like_Schema_Data', media_like_Schema);
module.exports = media_like_Data

