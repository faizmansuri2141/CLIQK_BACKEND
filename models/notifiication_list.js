const mongoose = require('mongoose');


const notificationSchema = new mongoose.Schema({

    community_id: {
        type: mongoose.Types.ObjectId
    },
    post_id: {
        type: mongoose.Types.ObjectId

    },
    sender_id: {
        type: mongoose.Types.ObjectId
    },
    user_id: {
        type: mongoose.Types.ObjectId
    },
    notification_message: {
        type: String
    },
    notification_body: {
        type: String
    },
    // request_send :1 , like_dislike : 2  , comments : 3
    notification_type: {
        type: Number,
    },
    button_show: {
        type: Boolean,
        default: false
    },
    module_id: {
        type: mongoose.Types.ObjectId
    },
    module_type: {
        type: String
    },
    is_Shown: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    utcDate: {
        type: Date
    },
    requestSendBy: {
        enum: ["sectionOwner", "user"],
        type: String,
    },
    isAction: {
        type: Boolean,
        default: true
    }


})

const notificationdata = new mongoose.model('notificationSchema', notificationSchema);
module.exports = notificationdata;




// 1 when i am send request for other user for join my section(admin send to user)endPoint : creatcommunity
// 2 for like
// 3 for comments
// 4 when user accept admin request for join section (user accept admin request) endPoint : is_Accept
// 4 adding using section key code means private section joinendPoint : /joinprivatesection
// 4 join_free_section
// 5 when user send request for join admin section (user send to admin). endPoint : /sendnotificationforcommunity paid section
// 6 