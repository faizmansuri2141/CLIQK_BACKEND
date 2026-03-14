const mongoose = require('mongoose');

const subscription_Schema = new mongoose.Schema({

    section_id: {
        type: mongoose.Types.ObjectId
    },
    user_id: {
        type: mongoose.Types.ObjectId
    },
    subscription_model_id: {
        type: mongoose.Types.ObjectId
    },
    subscription_id: {
        type: String
    },
    is_subscribe: {
        type: Boolean
    },
    customerId: {
        type: String
    },
    status: {
        type: String
    },
    currentPeriodStart: {
        type: String

    },
    currentPeriodEnd: {
        type: String
    },
    totalAmount: {
        type: String
    },
    adminTransferAmount: {
        type: String
    },
    communityTransferAmount: {
        type: String
    },

    created_at: { type: Date, required: true, default: Date.now }

})


const subscription_Schema_Data = new mongoose.model('subscription_Data', subscription_Schema);
module.exports = subscription_Schema_Data;


