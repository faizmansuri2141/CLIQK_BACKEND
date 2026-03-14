const mongoose = require("mongoose");

const tipSchema = new mongoose.Schema({

    current_user_id: {
        type: mongoose.Types.ObjectId
    },
    to_pay_user_id: {
        type: mongoose.Types.ObjectId
    },
    pay_type: {
        enum: ["individual", "bussiness"]
    },
    amount: {
        type: String
    },


})

const tipdata = new mongoose.model('tipdata', tipSchema);
module.exports = tipdata