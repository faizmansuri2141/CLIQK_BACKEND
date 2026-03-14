const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const like_dislikeSchema = new mongoose.Schema({

    like_dislike_ID: {
        type: Number,
    },
    user_Id: {
        type: mongoose.Types.ObjectId
    },
    post_Id: {
        type: mongoose.Types.ObjectId
    },
    post_User_Id: {
        type: mongoose.Types.ObjectId
    },
    is_Like: {
        type: Boolean,
        default: false
    },
    post_type: {
        type: String
    }

})

like_dislikeSchema.plugin(AutoIncrement, { inc_field: 'like_dislike_ID' });

const like_dislikeData = new mongoose.model('like_dislikeData', like_dislikeSchema);
module.exports = like_dislikeData;


