const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const AutoIncrement = require('mongoose-sequence')(mongoose);

const createCliqkSchema = new mongoose.Schema({

    cliqk_type: {
        type: String,
        enum: ["private", "bussiness"]
    },
    subscrition_type: {
        type: String,
        enum: ['free', 'paid', ""]
    },
    timescale: {
        type: String,
        enum: ['week', 'month', 'one_of_payment', "year", ""]
    },
    Amount: {
        type: String
    },
    email: {
        type: String
    },
    communityImage: [{
        image: {
            type: String,
            // required: true,
        },
    }],
    communityName: {
        type: String,
        required: true
    },
    aboutCommunity: {
        type: String,
        required: true,
    },
    communityId: {
        type: Number
    },
    user_Id: {
        type: String
    },
    userObjId: {
        type: mongoose.Types.ObjectId,
        ref: "userdata"
    },
    community_Members: {
        type: Array,
        ref: "userdata"
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    updatedAt: {
        type: Date,
        default: Date.now()
    },
    // false for public && true for private
    // bussiness = public
    // personal = private
    is_public: {
        type: Number,
        default: 0
    },
    product_id: {
        type: String
    },
    price_id: {
        type: String
    },
    unique_id: {
        type: String,
        unique: true
    },
    sortCode: {
        type: String
    },
    accountNumber: {
        type: String
    },
    xp: {
        type: Number,
        default: 1,
        min: 0,
        validate: {
            validator: Number.isInteger,
            message: 'XP must be an integer'
        }
    },
    socialScore: {
        type: Number,
        default: 0,
        min: 0,
        validate: {
            validator: Number.isInteger,
            message: 'Social Score must be an integer'
        }
    },
    followersList : {
        type : Array,
        ref :"userdata",
    },
    dualTimeLine : {
        type : Boolean,
        default : false
    },
    viewsCount :{
        type : Number,
        default : 0
    },
    viewsTimeAndDateAndUserId: [
        {
          userId: { type: mongoose.Types.ObjectId, ref: 'User' },
          viewedAt: { type: Date, default: Date.now }
        }
    ],
    lastDecay: {
        type: Date,
        default: null
    },
    previousScore: {
        type: Number,
        default: 0
    },
    previousRank: {
        type: Number,
        default: -1
    },
    lastScoreChange: {
        type: Date,
        default: null
    },
    lastTop10NotifiedUserIds: {
        type: [String],
        default: []
    },
    previousXP: {
        type: Number,
        default: 0
    },
    
    // Weekly Score History
    weeklyScores: [{
        weekNumber: {
            type: Number,
            required: true
        },
        year: {
            type: Number,
            required: true
        },
        score: {
            type: Number,
            default: 0,
            min: 0
        },
        rank: {
            type: Number,
            default: -1
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Current Week Score
    currentWeekScore: {
        type: Number,
        default: 0,
        min: 0
    },
    currentWeekNumber: {
        type: Number
    },
    currentWeekYear: {
        type: Number
    }

});

createCliqkSchema.plugin(AutoIncrement, { inc_field: 'communityId' });

// Get current week number
createCliqkSchema.methods.getCurrentWeekNumber = function() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
};

// Add to weekly score
createCliqkSchema.methods.addToWeeklyScore = function(scoreToAdd) {
    const now = new Date();
    const currentWeekNumber = this.getCurrentWeekNumber();
    const currentYear = now.getFullYear();
    
    if (!this.currentWeekNumber || 
        currentWeekNumber !== this.currentWeekNumber ||
        currentYear !== this.currentWeekYear) {
        
        if (this.currentWeekScore > 0 && this.currentWeekNumber) {
            this.weeklyScores.push({
                weekNumber: this.currentWeekNumber,
                year: this.currentWeekYear,
                score: this.currentWeekScore,
                rank: -1
            });
        }
        
        this.currentWeekScore = 0;
        this.currentWeekNumber = currentWeekNumber;
        this.currentWeekYear = currentYear;
    }
    
    this.currentWeekScore += scoreToAdd;
    return this.save();
};

// Get last week data
createCliqkSchema.methods.getLastWeekData = function() {
    if (this.weeklyScores.length === 0) return null;
    
    const sortedScores = [...this.weeklyScores].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.weekNumber - a.weekNumber;
    });
    
    return sortedScores[0];
};

const createCliqkData = new mongoose.model('createCliqkData', createCliqkSchema);
module.exports = createCliqkData;