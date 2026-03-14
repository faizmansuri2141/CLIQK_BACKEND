const mongoose = require ('mongoose');

const privacyPolicySchema = new mongoose.Schema ({

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


const privacypolicyData = new mongoose.model('privacypolicyData' , privacyPolicySchema) 
module.exports = privacypolicyData;