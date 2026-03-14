const mongoose = require("mongoose");

const imojiSchema = new mongoose.Schema({
    
    imojiName :{
        type : String,
    },
    imojiImage :{
        type : String,
    },
    createdAt : {
        type : Date,
        default : Date.now()
    },
    UpdateAt : {
        type :Date,
        default : Date.now()
    },

},{ timestamps: true });


const imojiData = new mongoose.model('imojiData' , imojiSchema) 
module.exports = imojiData;