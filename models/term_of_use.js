const mongoose = require ('mongoose');

const term_of_servicesSchema  = new mongoose.Schema ({

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


const term_of_servicesData = new mongoose.model('term_of_use' , term_of_servicesSchema) 
module.exports = term_of_servicesData;