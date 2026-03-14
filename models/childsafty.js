const mongoose = require ('mongoose');

const childSaftySchema = new mongoose.Schema ({

        text : {
            type : String,
            required : true,

        },
        createdAt : {

            type : Date,
            default : Date.now()

        },
        UpdateAt : {
            type :Date,
            default : Date.now()

        },


} ,{ timestamps: true })


const childSaftyData = new mongoose.model('childSaftyData' , childSaftySchema) 
module.exports = childSaftyData;