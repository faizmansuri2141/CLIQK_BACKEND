const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema({

    post_Id: {
        type: mongoose.Types.ObjectId,
    },
    question_Id: {
        type: mongoose.Types.ObjectId,
    },
    question: {
        type: String,
    },
    selct_voteId: {
        type: mongoose.Types.ObjectId,
    },
    vote_userId: {
        type: mongoose.Types.ObjectId
    }

})

const votedata = new mongoose.model('votedata', voteSchema);
module.exports = votedata