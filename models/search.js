const mongoose = require("mongoose");



const searchSchema = new mongoose.Schema({

    tag: [{
        search: {
            type: String,
            required: false

        },
    }],
    user_Id: {
        type: mongoose.Types.ObjectId,
    },
    fullname: {
        type: String,
        required: true,
    }
})

const searchData = new mongoose.model('searchSchema', searchSchema);
module.exports = searchData