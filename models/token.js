const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tokenSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "userdata",
    },
    token: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 36000,
    },
});

const tokenData = new mongoose.model('tokenData', tokenSchema);
module.exports = tokenData;


