
// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// // Define the Comment schema
// const commentSchema = new Schema(
//     {
//         post_Id: {
//             type: Schema.Types.ObjectId,
//         },
//         text: {
//             type: String,
//             default: "",
//         },
//         is_comment: {
//             type: String,
//             default: "",
//         },
//         // commentdetails: {
//         //     type: Schema.Types.ObjectId,
//         //     ref: 'userData', // or whatever your user model name is
//         //     required: true
//         //   },
          
//         commentdetails: {
//             type: Object,
//             ref: "userdata",
//             default: {},
//         },
//         commentlikerDetails: [
//             {
//                 userId: {
//                     type: Schema.Types.ObjectId,
//                     ref: "userdata",
//                 },
//             },
//         ],
//         totallikesofcomments: {
//             type: Number,
//             default: 0, // Corrected from "defualt" to "default"
//         },
//         totalCommentsReply: {
//             type: Number,
//             default: 0,
//         },
//         user_Id: {
//             type: mongoose.Types.ObjectId
//         },
//         post_type: {
//             type: String
//         },
//         post_User_Id: {
//             type: mongoose.Types.ObjectId
//         },
//         tagPeoples:[{
//             user_id :{
//                 type : mongoose.Types.ObjectId
//             },
//             username :{
//                 type : String
//             }

//         }],
//         subComments: [
//             {
//                 userId: {
//                     type: Schema.Types.ObjectId,
//                     ref: "userdata",
//                     required: true,
//                 },
//                 content: {
//                     type: String,
//                     required: true,
//                 },
//                 totalLikes: {
//                     type: Number,
//                     default: 0,
//                 },
//                 tagPeoples:[{
//                     user_id :{
//                         type : mongoose.Types.ObjectId
//                     },
//                     username :{
//                         type : String
//                     }

//                 }],
//                 createdAt: {
//                     type: Date,
//                     default: Date.now,
//                 },
//                 likeUsers: [
//                     {
//                         LikerId: {
//                             type: Schema.Types.ObjectId,
//                             ref: "usermaster",
//                             required: true,
//                         },
//                     },
//                 ],
//             },
//         ],
//     },
//     { timestamps: true } // Automatically create createdAt and updatedAt fields
// );

// const commentData = new mongoose.model('commentdata', commentSchema);
// module.exports = commentData;


const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define reaction schema for both comments and sub-comments
const reactionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "userdata",
        required: true
    },
    reactionType: {
        type: String,
        required: true
        // No enum validation - any string/emoji is accepted
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Define the Comment schema
const commentSchema = new Schema(
    {
        post_Id: {
            type: Schema.Types.ObjectId,
        },
        text: {
            type: String,
            default: "",
        },
        is_comment: {
            type: String,
            default: "",
        },
        commentdetails: {
            type: Object,
            ref: "userdata",
            default: {},
        },
        // Keep existing like system for backward compatibility
        commentlikerDetails: [
            {
                userId: {
                    type: Schema.Types.ObjectId,
                    ref: "userdata",
                },
            },
        ],
        // New reactions system
        reactions: [reactionSchema],
        reactionCounts: {
            type: Map,
            of: Number,
            default: {}
        },
        totallikesofcomments: {
            type: Number,
            default: 0,
        },
        totalCommentsReply: {
            type: Number,
            default: 0,
        },
        user_Id: {
            type: mongoose.Types.ObjectId
        },
        post_type: {
            type: String
        },
        post_User_Id: {
            type: mongoose.Types.ObjectId
        },
        tagPeoples:[{
            user_id :{
                type : mongoose.Types.ObjectId
            },
            username :{
                type : String
            }
        }],
        subComments: [
            {
                userId: {
                    type: Schema.Types.ObjectId,
                    ref: "userdata",
                    required: true,
                },
                content: {
                    type: String,
                    required: true,
                },
                totalLikes: {
                    type: Number,
                    default: 0,
                },
                // New reactions for sub-comments
                reactions: [reactionSchema],
                reactionCounts: {
                    type: Map,
                    of: Number,
                    default: {}
                },
                tagPeoples:[{
                    user_id :{
                        type : mongoose.Types.ObjectId
                    },
                    username :{
                        type : String
                    }
                }],
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
                likeUsers: [
                    {
                        LikerId: {
                            type: Schema.Types.ObjectId,
                            ref: "usermaster",
                            required: true,
                        },
                    },
                ],
            },
        ],
    },
    { timestamps: true }
);

// Middleware to update reaction counts
commentSchema.pre('save', function(next) {
    // Update comment reaction counts
    const reactionCounts = {};
    this.reactions.forEach(reaction => {
        reactionCounts[reaction.reactionType] = (reactionCounts[reaction.reactionType] || 0) + 1;
    });
    this.reactionCounts = reactionCounts;
    
    // Update sub-comment reaction counts
    this.subComments.forEach(subComment => {
        const subReactionCounts = {};
        subComment.reactions.forEach(reaction => {
            subReactionCounts[reaction.reactionType] = (subReactionCounts[reaction.reactionType] || 0) + 1;
        });
        subComment.reactionCounts = subReactionCounts;
    });
    
    next();
});

const commentData = new mongoose.model('commentdata', commentSchema);
module.exports = commentData;