const mongoose = require("mongoose");

const send_Community_Notification = new mongoose.Schema({

    // community_Admin: {
    //     type: String
    // },
    senderId: {
        type: mongoose.Types.ObjectId,
    },
    ReciverId: {
        type: mongoose.Types.ObjectId,
    },
    Comminity_Id: {
        type: mongoose.Types.ObjectId,

    },


    // 1 for reject
    // 2 for Accept
    // 3 for pending 
    // 0 for not send yet
    request_status: {
        type: Number,
        default: 4
    },
    is_Accept: {
        type: Boolean,
        default: false
    },
    send_by: {
        type: String,
        enum: ["by_admin", "by_user"]
    },




})

const send_Community_NotificationData = new mongoose.model('send_Community_Notification', send_Community_Notification);
module.exports = send_Community_NotificationData