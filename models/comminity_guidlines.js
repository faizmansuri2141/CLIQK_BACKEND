const mongoose = require ('mongoose');

const community_guidSchema = new mongoose.Schema ({

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


const community_guidData = new mongoose.model('community_guidData' , community_guidSchema) 
module.exports = community_guidData;