const mongoose = require('mongoose');

const for_Officials_Schema = new mongoose.Schema({

    user_Id: {
        type: mongoose.Types.ObjectId
    },
    for_reason: {
        type: String
    },
    doc_1: {
        type: String
    },
    doc_2: {
        type: String
    },
    is_Approve: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },

})


const officialsData = new mongoose.model('officialsData', for_Officials_Schema);
module.exports = officialsData;


