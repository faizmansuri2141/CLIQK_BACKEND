const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const AutoIncrement = require('mongoose-sequence')(mongoose);

const userSchema = new mongoose.Schema({

    fullname: {
        type: String,
        required: false,
    },

    username: {
        type: String,
        required: false,
    },

    countrycode: {
        type: String,
    },

    mobile: {
        type: Number,
        required: false,
    },

    email: {
        type: String,
        required: false,
    },

    password: {
        type: String,
        required: false,
    },

    user_Id: {
        type: Number
    },

    token: {
        type: String
    },

    image: {
        type: String,
        default: ""
    },

    backgroundImageColour: {
        type: String,
        default: ""
    },

  dateOfBirth: {
    type: String,   // "YYYY-MM-DD" — string avoids timezone issues
    default: null
  },

    about: {
        type: String
    },

    device_Type: {
        type: String
    },

    device_Token: {
        type: String
    },

    strip_custemor_Id: {
        type: String
    },

    stripe_Account_Id: {
        type: String
    },

    isStripeVerified: {
        type: Boolean,
        default: false
    },

    is_verified: {
        type: Boolean,
        default: false
    },

    isSuspended: {
        type: Boolean,
        default: false
    },

    suspensionReason: {
        type: String,
        default: null
    },

    suspendedAt: {
        type: Date,
        default: null
    },

    suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'adminSchema',
        default: null
    },

    notificationPostOnTimeline: {
        type: Boolean,
        default: true
    },

    notificationforJoinSection: {
        type: Boolean,
        default: false
    },

    notificationForSlidingTimeline: {
        type: Boolean,
        default: true
    },

    forTickStatus: {
        type: Number,
        enum: [0, 1, 2, 3],
        default: 0,
    },

    instagramUserName: {
        type: String,
        default: ""
    },

    tikTokUserName: {
        type: String,
        default: ""
    },

    whenSomeoneJoinMySection: {
        type: Boolean,
        default: true
    },

    OwnerPostNotification: {
        type: Boolean,
        default: true
    },

    isApproved: {
        type: Boolean,
        default: false
    },

    appNotification: {
        type: Boolean,
        default: true
    },

    blockUsers: [{
        userIds: {
            type: mongoose.Types.ObjectId,
            ref: "userdata"
        }
    }],

    badgeCount: {
        type: Number,
        default: 0
    },

    xp: {
        type: Number,
        default: 1,
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

    manualSocialScoreByAdmin: [{
        score: {
            type: Number,
            default: 0
        },
        description: {
            type: String,
            default: ""
        }
    }],

    lastAppOpen: {
        type: Date,
        default: null
    },

    lastInteraction: {
        type: Date,
        default: null
    },

    lastDecay: {
        type: Date,
        default: null
    },

    highestScore: {
        type: Number,
        default: 0
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

    previousXP: {
        type: Number,
        default: 0
    },

    lastScoreUpdate: {
        type: Date,
        default: null
    },

    bio: {
        type: String,
        default: ""
    },

    socialId: {
        type: String,
        default: ""
    },

    socialType: {
        type: String
    },

    weeklyScores: [{
        weekNumber: {
            type: Number,
            required: false
        },
        year: {
            type: Number,
            required: false
        },
        score: {
            type: Number,
            default: 0
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

    currentWeekScore: {
        type: Number,
        default: 0
    },

    currentWeekNumber: {
        type: Number
    },

    currentWeekYear: {
        type: Number
    }

});

userSchema.plugin(AutoIncrement, { inc_field: 'user_Id' });

userSchema.methods.validPassword = function (password) {
    if (!this.password) return false;
    return bcrypt.compareSync(password, this.password);
};

userSchema.methods.getCurrentWeekNumber = function () {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
};

userSchema.methods.addToWeeklyScore = function (scoreToAdd) {
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

userSchema.methods.getLastWeekData = function () {
    if (this.weeklyScores.length === 0) return null;

    const sortedScores = [...this.weeklyScores].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.weekNumber - a.weekNumber;
    });

    return sortedScores[0];
};

const userData = mongoose.model("userdata", userSchema);
module.exports = userData;
