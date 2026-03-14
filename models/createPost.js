// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

// const AutoIncrement = require("mongoose-sequence")(mongoose);

// const createPostSchema = new mongoose.Schema({
//   post_type: {
//     type: String,
//     enum: ["image", "video", "audio", "text", "gif" , "chat"],
//   },
//   createPost: [
//     {
//       image: {
//         type: String,
//       },
//       default: "",
//     },
//   ],
//   // if true so its showing on homescreen Otherwise its not showing on home screen
//   time_line: {
//     type: Boolean,
//   },
//   createvideo: {
//     type: String,
//     default: "",
//   },
//   createAudio: {
//     type: String,
//     default: "",
//   },
//   createText: {
//     type: String,
//     default: "",
//   },
//   createChat :{
//     type : String,
//     default :""
//   },
//   createGif: {
//     type: String,
//     default: "",
//   },
//   desc: {
//     type: String,
//   },
//   communityId: {
//     type: mongoose.Types.ObjectId,
//   },
//   CreatePostId: {
//     type: Number,
//   },
//   user_Id: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "userdata",
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   is_public: {
//     type: Boolean,
//     default: false,
//   },
//   post_likes: [
//     {
//       type: mongoose.Schema.Types.ObjectId,
//     },
//   ],
//   views: {
//     type: Number,
//     default: 0,
//   },
//   createPostFor: {
//     type: String,
//     enum: ["normal", "mediaroom"],
//   },
//   cover_image: {
//     type: String,
//     default: "",
//   },
//   file_name: {
//     type: String,
//     default: "",
//   },
//   utcDate: {
//     type: Date,
//   },
//   isChat :{
//     type : Boolean,
//     default : false
//   },
//   tagPeoples: [
//     {
//       user_id: {
//         type: mongoose.Types.ObjectId,
//       },
//       username: {
//         type: String,
//       },
//     },
//   ],
//   pinPost: {
//     type: Boolean,
//     default: false,
//   },
//   repostUserId : {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "userdata",
//   },
//   repost:{
//     type : Boolean,
//     default : false

//   },
//   originalPostId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "createPostData"
//   },
//   //   isDeleteIn24Hours: {
//   //     type: Boolean,
//   //     default: false,
//   //   },
//   isActive: { type: Boolean, default: true },
//   chatReactions: [
//     {
//       emoji: { type: String },        // e.g. "😂"
//       type: { type: String },         // e.g. "smile", "love", "angry", "sad", "like"
//       count: { type: Number, default: 0 },
//       reactedUsers: [
//         {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "userdata"
//         }
//       ]
//     }
//   ],
//   isReplied : {
//     type : Boolean,
//     default : false
//   },
//   replied_postId : {
//     type : mongoose.Schema.Types.ObjectId,
//     ref : "createPostData"
//   },
  
//   createdAt: { type: Date, default: Date.now },
// });

// createPostSchema.plugin(AutoIncrement, { inc_field: "CreatePostId" });

// const createPostData = new mongoose.model("createPostData", createPostSchema);
// module.exports = createPostData;


const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const createPostSchema = new mongoose.Schema({
  post_type: {
    type: String,
    enum: ["image", "video", "audio", "text", "gif", "chat"],
  },

  // Images (multiple allowed for posts, but only 1 in chat)
  createPost: [
    {
      image: { type: String, default: "" },
    },
  ],

  time_line: { type: Boolean }, // Show on home screen or not

  // Media
  createvideo: { type: String, default: "" },
  createAudio: { type: String, default: "" },
  createText: { type: String, default: "" },
  createChat: { type: String, default: "" },
  createGif: { type: String, default: "" },

  desc: { type: String },

  // Community or Group Id
  communityId: { type: mongoose.Types.ObjectId },

  CreatePostId: { type: Number },

  user_Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userdata",
  },

  createdAt: { type: Date, default: Date.now },

  is_public: { type: Boolean, default: false },

  // Likes
  post_likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userdata",
    },
  ],

  // Views
  views: { type: Number, default: 0 },

  // Post for mediaroom or normal
  createPostFor: {
    type: String,
    enum: ["normal", "mediaroom"],
  },

  cover_image: { type: String, default: "" },
  file_name: { type: String, default: "" },

  utcDate: { type: Date },

  // Chat flag
  isChat: { type: Boolean, default: false },

  // Mentions / Tags
  tagPeoples: [
    {
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "userdata" },
      username: { type: String },
    },
  ],

  // Pinning post
  pinPost: { type: Boolean, default: false },

  // Repost
  repostUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userdata",
  },
  repost: { type: Boolean, default: false },

  originalPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "createPostData",
  },

  isActive: { type: Boolean, default: true },

  // Chat Reactions
  chatReactions: [
    {
      emoji: { type: String }, // e.g. "😂"
      type: { type: String }, // e.g. "smile", "love", "angry", "sad", "like"
      count: { type: Number, default: 0 },
      reactedUsers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "userdata",
        },
      ],
    },
  ],

  // 🔹 Reply system
  isReplied: { type: Boolean, default: false }, // true = this is a reply
  replied_postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "createPostData", // parent post/chat
  },
  

  // keep replies inside parent for fast fetching
  replies: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "createPostData",
    },
  ],
});

// Auto increment post id
createPostSchema.plugin(AutoIncrement, { inc_field: "CreatePostId" });

const createPostData = mongoose.model("createPostData", createPostSchema);
module.exports = createPostData;
