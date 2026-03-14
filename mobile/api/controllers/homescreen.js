const postData = require('../../../models/createPost');
const communityData = require('../../../models/createcommunity');
const userData = require('../../../models/user');
const commentModel = require('../../../models/comments')
const vote = require('../../../models/vote')
const { default: mongoose, model } = require('mongoose');
const like_dislikedatas = require('../../../models/like_dislike_Schema');
const notificationData = require('../../../models/notifiication_list');
const activityInSectionData = require('../../../models/activityinsection');
const { patch } = require('../routes/homescreen');
const postDatas = require ("../../../models/createPost")
const postDataModel = require('../../../models/createPost');



exports.homeScreenPost = async (req, res) => {
  try {
    const userObjId = req.user._id;
    const user_id = mongoose.Types.ObjectId(req.body.user_id);

    // 🔹 Notifications
    const notification_counts = await notificationData.find({ is_Shown: true });
    const notification_count = notification_counts.length;

    await userData.updateOne(
      { _id: userObjId },
      { $set: { badgeCount: notification_count } }
    );

    // 🔹 Home screen community list
    const homescreen = await communityData.aggregate([
      {
        $match: {
          $or: [
            { userObjId: userObjId },
            { $expr: { $in: [userObjId, "$community_Members"] } },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          communityImage: 1,
          communityName: 1,
          subscrition_type: 1,
          is_public: 1,
        },
      },
    ]);

    // 🔹 Posts with SECTION POPULATE (NEW)
    const postList = await postDataModel
      .find({
        isActive: true,
        $or: [{ isChat: true }, { post_type: "text" }],
      })
      .populate(
        "user_Id",
        "_id username fullname image backgroundImageColour forTickStatus socialScore xp"
      )
      .populate({
        path: "communityId",
        select: "_id communityName",
        model: "createCliqkData",
      })
      .populate({
        path: "replies",
        populate: {
          path: "user_Id",
          select:
            "_id username fullname image backgroundImageColour forTickStatus socialScore xp",
        },
      })
      .populate({
        path: "replied_postId",
        select:
          "_id desc post_type createChat createText createPost createvideo createAudio createGif",
        populate: {
          path: "user_Id",
          select:
            "_id username fullname image backgroundImageColour forTickStatus socialScore xp",
        },
      })
      .sort({ createdAt: -1 });

    // 🔹 Build response
    const postDataArray = await Promise.all(
      postList.map(async (item) => {
        const isLiked = await like_dislikedatas.exists({
          user_Id: user_id,
          post_Id: item._id,
        });

        const repostCount = await postDataModel.countDocuments({
          originalPostId: item._id,
          repost: true,
        });

        const commentCounts = await commentModel.countDocuments({
          post_Id: item._id,
        });

        // 🔹 Section membership check (unchanged)
        let isSectionMember = false;
        if (item.communityId && item.communityId._id) {
          const section = await communityData.findOne({
            _id: item.communityId._id,
          });
          if (section?.community_Members) {
            isSectionMember = section.community_Members.some(
              (id) => id.toString() === userObjId.toString()
            );
          }
        }

        // 🔹 Relative time
        const formatRelativeTime = (date) => {
          const diff = Date.now() - new Date(date);
          const m = Math.floor(diff / 60000);
          const h = Math.floor(diff / 3600000);
          const d = Math.floor(diff / 86400000);
          if (m < 60) return `${m}m`;
          if (h < 24) return `${h}h`;
          if (d < 7) return `${d}d`;
          if (d < 30) return `${Math.floor(d / 7)}w`;
          if (d < 365) return `${Math.floor(d / 30)}mo`;
          return `${Math.floor(d / 365)}y`;
        };

        // 🔹 Chat reactions
        const processedChatReactions = (item.chatReactions || []).map(
          (reaction) => ({
            emoji: reaction.emoji || "",
            type: reaction.type || "",
            count: reaction.count || 0,
            hasReacted: reaction.reactedUsers?.some(
              (uid) => uid.toString() === user_id.toString()
            ),
          })
        );

        // 🔹 Replied parent post
        let repliedTo = null;
        if (item.isReplied && item.replied_postId) {
          repliedTo = {
            post_id: item.replied_postId._id,
            desc: item.replied_postId.desc || "",
            post_type: item.replied_postId.post_type || "",
            createChat: item.replied_postId.createChat || "",
            createText: item.replied_postId.createText || "",
            createvideo: item.replied_postId.createvideo || "",
            createAudio: item.replied_postId.createAudio || "",
            createGif: item.replied_postId.createGif || "",
            user_data: {
              _id: item.replied_postId.user_Id?._id || null,
              username: item.replied_postId.user_Id?.username || "",
              fullname: item.replied_postId.user_Id?.fullname || "",
              image: item.replied_postId.user_Id?.image || "",
              backgroundImageColour:
                item.replied_postId.user_Id?.backgroundImageColour || "",
              forTickStatus:
                item.replied_postId.user_Id?.forTickStatus || false,
              socialScore:
                item.replied_postId.user_Id?.socialScore || 0,
              xp: item.replied_postId.user_Id?.xp || 0,
            },
          };
        }

        // 🔹 Replies list
        const replies = (item.replies || []).map((reply) => ({
          post_id: reply._id,
          post_type: reply.post_type,
          desc: reply.desc || "",
          createChat: reply.createChat || "",
          user_data: {
            _id: reply.user_Id._id,
            username: reply.user_Id.username,
            fullname: reply.user_Id.fullname,
            image: reply.user_Id.image,
            backgroundImageColour: reply.user_Id.backgroundImageColour,
            forTickStatus: reply.user_Id.forTickStatus,
            socialScore: reply.user_Id.socialScore || 0,
            xp: reply.user_Id.xp || 0,
          },
          createdAt: reply.createdAt,
        }));

        // 🔹 FINAL POST OBJECT (OLD + NEW SECTION)
        return {
          post_id: item._id,
          post_type: item.post_type,
          createPost: item.createPost || [],
          createvideo: item.createvideo || "",
          createAudio: item.createAudio || "",
          createText: item.createText || "",
          createGif: item.createGif || "",
          createChat: item.createChat || "",
          desc: item.desc || "",

          user_data: {
            _id: item.user_Id._id,
            username: item.user_Id.username,
            fullname: item.user_Id.fullname,
            image: item.user_Id.image,
            backgroundImageColour: item.user_Id.backgroundImageColour,
            forTickStatus: item.user_Id.forTickStatus,
            socialScore: item.user_Id.socialScore || 0,
            xp: item.user_Id.xp || 0,
          },

          // ✅ NEW (NON-BREAKING)
          section: item.communityId
            ? {
                section_id: item.communityId._id,
                section_name: item.communityId.communityName,
              }
            : null,

          tagPeoples: item.tagPeoples || [],
          createdAt: item.createdAt,
          relativeTime: formatRelativeTime(item.createdAt),
          total_likes: item.post_likes?.length || 0,
          total_comments: commentCounts,
          total_reports: item.reports?.length || 0,
          is_public: item.is_public,
          is_Likes: !!isLiked,
          repost: item.repost || false,
          repostCount,
          chatReactions: processedChatReactions,
          views: item.views || 0,
          cover_image: item.cover_image || "",
          file_name: item.file_name || "",
          utcDate: item.utcDate || "",
          communityId: item.communityId?._id || "",
          isChat: item.isChat || false,
          isReplied: item.isReplied,
          replied_postId: item.replied_postId?._id || null,
          repliedTo,
          replies,
          isActive: item.isActive,
          isSectionMember,
        };
      })
    );

    // 🔹 Pagination
    const pageNo = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const totalDocs = postDataArray.length;
    const totalPages = Math.ceil(totalDocs / limit);
    const start = (pageNo - 1) * limit;

    res.status(200).json({
      data: homescreen,
      notification_count,
      result: {
        totalDocs,
        totalPages,
        currentPage: pageNo,
        nextPage: totalPages > pageNo ? pageNo + 1 : false,
        previousPage: pageNo > 1 ? pageNo - 1 : false,
        post: postDataArray.slice(start, start + limit),
      },
      status: 1,
      message: "Homescreen data fetched successfully",
    });
  } catch (error) {
    console.error("HomeScreen Error:", error);
    res.status(500).json({ status: 0, message: error.message });
  }
};


// exports.homeScreenPost = async (req, res) => {
//     try {
//       const userObjId = req.user._id;
//       const user_id = mongoose.Types.ObjectId(req.body.user_id);
  
//       // 🔹 Notifications
//       const notification_counts = await notificationData.find({ is_Shown: true });
//       const notification_count = notification_counts.length;
//       await userData.updateOne(
//         { _id: userObjId },
//         { $set: { badgeCount: notification_count } }
//       );
  
//       // 🔹 Home screen community list
//       const homescreen = await communityData.aggregate([
//         {
//           $match: {
//             $or: [
//               { userObjId: userObjId },
//               { $expr: { $in: [userObjId, "$community_Members"] } },
//             ],
//           },
//         },
//         {
//           $project: {
//             _id: 1,
//             communityImage: 1,
//             communityName: 1,
//             subscrition_type: 1,
//             is_public: 1,
//           },
//         },
//       ]);
  
//       // 🔹 Posts aggregation
//       const postList = await postDataModel
//         .find({ isActive: true })
//         .populate("user_Id", "_id username fullname image backgroundImageColour forTickStatus")
//         .populate({
//           path: "replies",
//           populate: {
//             path: "user_Id",
//             select: "_id username fullname image backgroundImageColour forTickStatus",
//           },
//         })
//         .populate({
//           path: "replied_postId", // for replies
//           select: "_id desc post_type createChat createText",
//         })
//         .sort({ createdAt: -1 });
  
//       // 🔹 Build response array (fixed variable reference)
//       const postDataArray = await Promise.all(
//         postList.map(async (item) => {
//           // Like status
//           const isLiked = await like_dislikedatas.exists({
//             user_Id: user_id,
//             post_Id: item._id,
//           });
  
//           // Repost count
//           const repostCount = await postDataModel.countDocuments({
//             originalPostId: item._id,
//             repost: true,
//           });
  
//           // Comment count
//           const commentCounts = await commentModel.countDocuments({
//             post_Id: item._id,
//           });
  
//           // Top 2 comments
//           const topComments = await commentModel.aggregate([
//             { $match: { post_Id: item._id } },
//             { $sort: { createdAt: -1 } },
//             { $limit: 2 },
//             {
//               $lookup: {
//                 from: "userdatas",
//                 localField: "user_Id",
//                 foreignField: "_id",
//                 as: "user",
//               },
//             },
//             { $unwind: "$user" },
//             {
//               $project: {
//                 _id: 1,
//                 text: 1,
//                 createdAt: 1,
//                 user: {
//                   _id: "$user._id",
//                   username: "$user.username",
//                   fullname: "$user.fullname",
//                   image: "$user.image",
//                   backgroundImageColour: "$user.backgroundImageColour",
//                 },
//               },
//             },
//           ]);
  
//           // Relative time formatter
//           const formatRelativeTime = (date) => {
//             const now = new Date();
//             const diffMs = now - date;
//             const diffMins = Math.floor(diffMs / 60000);
//             const diffHours = Math.floor(diffMs / 3600000);
//             const diffDays = Math.floor(diffMs / 86400000);
//             if (diffMins < 60) return `${diffMins}m`;
//             if (diffHours < 24) return `${diffHours}h`;
//             if (diffDays < 7) return `${diffDays}d`;
//             if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
//             if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
//             return `${Math.floor(diffDays / 365)}y`;
//           };
  
//           // Chat Reactions
//           const processedChatReactions = (item.chatReactions || []).map((reaction) => ({
//             emoji: reaction.emoji || "",
//             type: reaction.type || "",
//             count: reaction.count || 0,
//             hasReacted: reaction.reactedUsers?.some(
//               (uid) => uid.toString() === user_id.toString()
//             ),
//           }));
  
//           // 🔹 Parent Post Info (if this post is a reply)
//           let repliedTo = null;
//           if (item.isReplied && item.replied_postId) {
//             repliedTo = {
//               post_id: item.replied_postId._id,
//               createvideo : item.replied_postId.createvideo || "",
//               createPost : item.replied_postId.createPost || [],
//               desc: item.replied_postId.desc || "",
//               createChat: item.replied_postId.createChat || "",
//               post_type: item.replied_postId.post_type || "",
//             };
//           }
  
//           // 🔹 Replies Data
//           const replies = (item.replies || []).map((reply) => ({
//             post_id: reply._id,
//             post_type: reply.post_type,
//             desc: reply.desc || "",
//             createChat: reply.createChat || "",
//             user_data: {
//               _id: reply.user_Id._id,
//               username: reply.user_Id.username,
//               fullname: reply.user_Id.fullname,
//               image: reply.user_Id.image,
//               backgroundImageColour: reply.user_Id.backgroundImageColour,
//               forTickStatus: reply.user_Id.forTickStatus,
//             },
//             createdAt: reply.createdAt,
//           }));
  
//           // 🔹 Final Post Object
//           return {
//             post_id: item._id,
//             post_type: item.post_type,
//             createPost: item.createPost || [],
//             createvideo: item.createvideo || "",
//             createAudio: item.createAudio || "",
//             createText: item.createText || "",
//             createGif: item.createGif || "",
//             createChat: item.createChat || "",
//             desc: item.desc || "",
//             user_data: {
//               _id: item.user_Id._id,
//               username: item.user_Id.username,
//               fullname: item.user_Id.fullname,
//               image: item.user_Id.image,
//               backgroundImageColour: item.user_Id.backgroundImageColour,
//               forTickStatus: item.user_Id.forTickStatus,
//             },
//             tagPeoples: item.tagPeoples || [],
//             createdAt: item.createdAt,
//             relativeTime: formatRelativeTime(item.createdAt),
//             total_likes: item.post_likes?.length || 0,
//             total_comments: commentCounts,
//             total_reports: item.reports?.length || 0,
//             is_public: item.is_public,
//             is_Likes: !!isLiked,
//             repost: item.repost || false,
//             repostCount,
//             topComments,
//             chatReactions: processedChatReactions,
//             views: item.views || 0,
//             cover_image: item.cover_image || "",
//             file_name: item.file_name || "",
//             utcDate: item.utcDate || "",
//             communityId: item.communityId || "",
//             isChat: item.isChat || false,
//             isReplied: item.isReplied,
//             replied_postId: item.replied_postId?._id || null,
//             repliedTo, // 👈 Parent post info
//             replies,   // 👈 Replies list
//             isActive: item.isActive,
//           };
//         })
//       );
  
//       // 🔹 Pagination
//       const pageNo = parseInt(req.body.page) || 1;
//       const limit = parseInt(req.body.limit) || 10;
//       const totalDocs = postDataArray.length;
//       const totalPages = Math.ceil(totalDocs / limit);
//       const start = (pageNo - 1) * limit;
//       const paginatedPosts = postDataArray.slice(start, start + limit);
  
//       // ✅ Final Response
//       res.status(200).json({
//         data: homescreen,
//         notification_count,
//         result: {
//           totalDocs,
//           totalPages,
//           currentPage: pageNo,
//           nextPage: totalPages > pageNo ? pageNo + 1 : false,
//           previousPage: pageNo > 1 ? pageNo - 1 : false,
//           post: paginatedPosts,
//         },
//         status: 1,
//         message: "Homescreen data fetched successfully",
//       });
  
//     } catch (error) {
//       console.error("HomeScreen Error:", error);
//       res.status(500).json({ status: 0, message: error.message });
//     }
//   };

// screen 7 comment and repostcount 
// exports.homeScreenPost = async (req, res, next) => {
//     try {
//         const userObjId = req.user._id;
//         const user_id = mongoose.Types.ObjectId(req.body.user_id);

//         // Notifications
//         const notification_counts = await notificationData.find({ is_Shown: true });
//         const notification_count = notification_counts.length;

//         await userData.updateOne({ _id: userObjId }, { $set: { badgeCount: notification_count } });

//         // Home screen communities
//         const homescreen = await communityData.aggregate([
//             {
//                 $match: {
//                     $or: [
//                         { userObjId: userObjId },
//                         { $expr: { $in: [userObjId, "$community_Members"] } },
//                     ],
//                 },
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     communityImage: 1,
//                     communityName: 1,
//                     subscrition_type: 1,
//                     is_public: 1
//                 }
//             },
//         ]);

//         // Posts
//         const post = await communityData.aggregate([
//             {
//                 $match: {
//                     $or: [
//                         { userObjId: user_id },
//                         { $expr: { $in: [user_id, "$community_Members"] } },
//                     ],
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "createpostdatas",
//                     localField: "community_Members",
//                     foreignField: "user_Id",
//                     as: "community_Members",
//                 }
//             },
//             { $unwind: "$community_Members" },
//             { $match: { "community_Members.isActive": true } },

//             {
//                 $lookup: {
//                     from: "userdatas",
//                     localField: "community_Members.user_Id",
//                     foreignField: "_id",
//                     as: "community_Members.user_Id",
//                 }
//             },
//             { $unwind: "$community_Members.user_Id" },
//             {
//                 $project: {
//                     "community_Members.user_Id._id": 1,
//                     "community_Members.user_Id.username": 1,
//                     "community_Members.user_Id.image": 1,
//                     "community_Members._id": 1,
//                     "community_Members.post_type": 1,
//                     "community_Members.createPost": 1,
//                     "community_Members.desc": 1,
//                     "community_Members.option": 1,
//                     "community_Members.is_public": 1,
//                     "community_Members.createdAt": 1,
//                     "community_Members.tagPeoples": 1,
//                     "community_Members.repost": 1,
//                     "community_Members.repostUserId": 1,
//                     "community_Members.isActive": 1,
//                     likes: { $size: "$community_Members.post_likes" },
//                 }
//             },
//             {
//                 $sort: { "community_Members.createdAt": -1 }
//             }
//         ]);

//         const postData = [];

//         await Promise.all(post.map(async item => {
//             const postItem = item.community_Members;

//             // Check like status
//             const isLiked = await like_dislikedatas.exists({
//                 user_Id: user_id,
//                 post_Id: postItem._id
//             });

//             // Count reposts
//             const repostCount = await postDatas.countDocuments({
//                 _id: postItem._id,
//                 repost: true
//             });

//             // Top 2 comments with user info
//             const topComments = await commentModel.aggregate([
//                 { $match: { post_Id: postItem._id } },
//                 { $sort: { createdAt: -1 } }, // sort by latest
//                 { $limit: 2 },
//                 {
//                     $lookup: {
//                         from: "userdatas",
//                         localField: "user_Id",
//                         foreignField: "_id",
//                         as: "user",
//                     },
//                 },
//                 { $unwind: "$user" },
//                 {
//                     $project: {
//                         _id: 1,
//                         text: 1,
//                         createdAt: 1,
//                         user: {
//                             _id: "$user._id",
//                             username: "$user.username",
//                             image: "$user.image"
//                         }
//                     }
//                 }
//             ]);

//             // Main post object
//             const postObj = {
//                 post_id: postItem._id,
//                 post_type: postItem.post_type,
//                 createPost: postItem.createPost,
//                 desc: postItem.desc,
//                 user_data: postItem.user_Id,
//                 tagPeoples: postItem.tagPeoples,
//                 createdAt: postItem.createdAt,
//                 total_likes: postItem.likes,
//                 is_public: postItem.is_public,
//                 repost: postItem.repost || false,
//                 is_Likes: isLiked || false,
//                 repostCount: repostCount,
//                 topComments: topComments || [],
//                 isActive: postItem.isActive 

//             };

//             // Add repost user info if exists
//             if (postItem.repostUserId) {
//                 const repostUser = await userData.findOne(
//                     { _id: postItem.repostUserId },
//                     { fullname: 1, username: 1, image: 1 }
//                 );
//                 if (repostUser) {
//                     postObj.repostUserData = {
//                         _id: repostUser._id || "",
//                         fullname: repostUser.fullname || "",
//                         username: repostUser.username || "",
//                         image: repostUser.image || ""
//                     };
//                 }
//             }

//             postData.push(postObj);
//         }));

//         // Pagination
//         const pageNo = parseInt(req.body.page);
//         const limit = parseInt(req.body.limit || 4);

//         const paginate = (items, page, perPage) => {
//             const offset = perPage * (page - 1);
//             const totalPages = Math.ceil(items.length / perPage);
//             const paginatedItems = items.slice(offset, perPage * page);
//             const current_page = (offset / perPage) + 1;

//             return {
//                 previousPage: page - 1 > 0 ? page - 1 : false,
//                 nextPage: (totalPages > page) ? page + 1 : false,
//                 totalDocs: items.length,
//                 totalPages: totalPages,
//                 currentPage: current_page,
//                 post: paginatedItems
//             };
//         };

//         const result = paginate(postData, pageNo, limit);

//         return res.send({
//             data: homescreen,
//             notification_count,
//             result,
//             status: 1,
//             message: "Homescreen data fetched successfully"
//         });

//     } catch (error) {
//         console.log("error ", error);
//         res.send({ status: 0, message: error.message });
//     }
// };

// community and its all post
exports.    community_post = async (req, res, next) => {

    try {
        const community_id = mongoose.Types.ObjectId(req.body.community_id)
        const user_id = req.user._id

        const subscrition_type = req.body.subscrition_type

        if (subscrition_type === "free") {
            const community_post = await postData.aggregate([


                { $match: { communityId: community_id } },

                {
                    $lookup: {
                        from: "userdatas",
                        localField: "user_Id",
                        foreignField: "_id",
                        as: "user_Id",
                    }
                },
                { $unwind: "$user_Id" },

                {
                    $project: {
                        "_id": 1,
                        "post_type": 1,
                        "createPost": 1,
                        "desc": 1,
                        "is_public": 1,
                        "option": 1,
                        "user_Id._id": 1,
                        "user_Id.username": 1,
                        "user_Id.image": 1,
                        "createdAt": 1,
                        "tagPeoples":1,
                        likes: { $size: "$post_likes" }
                        // likesCount: { $size: "$post_likes" },
                    }
                },

            ])
            let postDatas = []

            const datass = await Promise.all(community_post.map(async item => {
                var obj = {};
                const data = await like_dislikedatas.find({ user_Id: user_id, post_Id: item._id });

            const repostCount = await postDatas.find({ _id: item._id  , repost : true }).countDocuments();


                var d = data.length > 0 ? true : false;

                obj.post_id = item._id;
                obj.post_type = item.post_type;
                obj.createPost = item.createPost;
                obj.desc = item.desc;
                obj.user_data = item.user_Id;
                obj.createdAt = item.createdAt;
                obj.total_likes = item.likes;
                obj.is_public = item.is_public;
                obj.tagPeoples = item.tagPeoples;
                obj.is_Likes = d;
                obj. repostCount = repostCount

                postDatas.push(obj)
                return postDatas
            }));

            const pageNo = parseInt(req.body.page)
            const limit = parseInt(req.body.limit || 4)

            const paginate = (items, page, perPage) => {
                console.log("perPage=>>", perPage, "items+>>", items, "page=>>", page)
                const offset = perPage * (page - 1);
                const totalPages = Math.ceil(items.length / perPage);
                const paginatedItems = items.slice(offset, perPage * page);
                const current_page = (offset / perPage) + 1

                return {
                    previousPage: page - 1 ? page - 1 : false,
                    nextPage: (totalPages > page) ? page + 1 : false,
                    totalDocs: items.length,
                    totalPages: totalPages,
                    currentPage: current_page,
                    post: paginatedItems
                };
            };
            const result = paginate(postDatas, pageNo, limit)

            return res.send({ Data: result, status: 1, message: "community post fatch successfully" })
        }
        else {
            const community_post = await communityData.aggregate([

                { $match: { _id: community_id } },

                {
                    $lookup: {
                        from: "userdatas",
                        localField: "community_Members",
                        foreignField: "_id",
                        as: "community_Members",
                    }
                },

                { $unwind: "$community_Members" },
    
                {
                    $lookup: {
                        from: "createpostdatas",

                        // always let variable use aggrigate variable
                        let: { user_id: '$community_Members._id', communityid: community_id },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {

                                        $and: [
                                            { $eq: ["$user_Id", "$$user_id"] },
                                            { $in: ["$$communityid", "$communityId"] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "posts",

                    }
                },

                {
                    $match: {
                        posts: { $ne: [] }
                    }
                }

            ])


            const postDatas = []
            const datass = await Promise.all(community_post.map(async item => {
                var obj = {};

                const post = []
                await Promise.all(item.posts.map(async element => {
                    var post_obj = {};

                    const data = await like_dislikedatas.find({ user_Id: user_id, post_Id: element._id });

                    var d = data.length > 0 ? true : false;

            const repostCount = await postDatas.find({ _id: element._id  , repost : true }).countDocuments();


                    post_obj.post_id = element._id;
                    post_obj.post_type = element.post_type;
                    post_obj.createPost = element.createPost;
                    post_obj.desc = element.desc;
                    post_obj.createdAt = element.createdAt;
                    post_obj.is_public = element.is_public;
                    post_obj.likes = element.post_likes.length;
                    post_obj.is_Likes = d;
                    post_obj.tagPeoples = element.tagPeoples
                    post_obj.repostCount = repostCount

                    post.push(post_obj)

                }));

                obj.user_id = item.community_Members._id;
                obj.fullname = item.community_Members.fullname;
                obj.image = item.community_Members.image;
                obj.post = post

                postDatas.push(obj)
                return postDatas
            }));

            const pageNo = parseInt(req.body.pageNo)
            const limit = parseInt(req.body.limit || 4)
            console.log("limit", limit);

            const paginate = (items, page, perPage) => {
                const offset = perPage * (page - 1);
                const totalPages = Math.ceil(items.length / perPage);
                const paginatedItems = items.slice(offset, perPage * page);
                const current_page = (offset / perPage) + 1

                return {
                    previousPage: page - 1 ? page - 1 : false,
                    nextPage: (totalPages > page) ? page + 1 : false,
                    totalDocs: items.length,
                    totalPages: totalPages,
                    currentPage: current_page,
                    post: paginatedItems
                };
            };
            const result = paginate(postDatas, pageNo, limit)

            res.send({ data: postDatas, status: 1, message: "community post fatch successfully" })
        }

    }
    catch (error) {
        console.log(error)
        res.send({ status: 0, message: error.message })

    }
}

// https://www.calculatorsoup.com/calculators/statistics/vote-percentage-calculator.php
// calculator average

exports.calculate_percentage = async (req, res, next) => {
    try {

        const post_Id = req.body.post_Id

        const totalvotes = await vote.find({ post_Id: post_Id })
        console.log("totalvotes=>>", totalvotes.length)

        console.log(typeof V)

        const post_option_counts = await postData.findById({ _id: post_Id })
        console.log("post_option_counts=>>", post_option_counts.option)

        for (let index = 0; index < post_option_counts.option.length; index++) {
            const element = post_option_counts.option[index].vote_counts;

            const T = totalvotes.length
            const V = parseInt(element)
            console.log(typeof V)

            const C = V / T * 100
            console.log("C=>>", C)

        }
    }
    catch (error) {
        console.log(error)
    }
}




// const RoleShowString = () => {
//     let ModuleId = [];

//     axios
//       .get(`${process.env.REACT_APP_API_MAMBERS}/role/${id}`)
//       .then((resposne) => {
//         for (let i = 0; i < resposne.data.data.roleView.length; i++) {
//           const element = resposne.data.data.roleView[i].module_id;
//           let obj = { _id: element };
//           ModuleId.push(obj);
//         }

//         axios
//           .get(`${process.env.REACT_APP_API_MAMBERS}/rolestring`)
//           .then((resposne) => {
//             console.log("ModuleId....", ModuleId);
//             const output = resposne.data.data.filter(function (o1) {
//               return !ModuleId.some(function (o2) {
//                 //  for diffrent we use NOT (!) befor obj2 here
//                 return o1._id === o2._id;
//               });
//             });

//             output.forEach(function (currentValue, index, array) {
//               array[index] = JSON.parse(
//                 JSON.stringify(array[index]).replace("Can", "Cannot")
//               );
//             });
//             console.log("new array......", output);
//             setRoleStringCant(output);
//           });
//       })
//       .catch((error) => {
//         console.log("role string.......", error.message);
//       });
//   };
// string one word replace & two different array not equal value return



// old home screen
// exports.homeScreenPost = async (req, res, next) => {

//     try {
//         const userObjId = req.user._id
//         const user_id = mongoose.Types.ObjectId(req.body.user_id)


//         const homescreen = await communityData.aggregate([
//             {
//                 $match: {
//                     $or: [{
//                         userObjId: userObjId,
//                     },
//                     {
//                         $expr: { $in: [userObjId, "$community_Members"] },
//                         //start_time: { $gte: setCurrentHour }
//                     },
//                     ],
//                 },
//             },

//             {
//                 $project: {
//                     '_id': 1,
//                     'communityImage': 1,
//                     'communityName': 1,

//                 }
//             },

//         ])

//         const post = await communityData.aggregate([
//             {
//                 $match: {
//                     $or: [{
//                         userObjId: user_id,
//                     },
//                     {
//                         $expr: { $in: [user_id, "$community_Members"] },
//                         //start_time: { $gte: setCurrentHour }
//                     },
//                     ],
//                 },
//             },

//             {
//                 $lookup: {
//                     from: "createpostdatas",
//                     localField: "community_Members",
//                     foreignField: "user_Id",
//                     as: "community_Members",
//                 }
//             },

//             { $unwind: "$community_Members" },

//             {
//                 $lookup: {
//                     from: "userdatas",
//                     localField: "community_Members.user_Id",
//                     foreignField: "_id",
//                     as: "community_Members.user_Id",
//                 }
//             },
//             { $unwind: "$community_Members.user_Id" },

//             // counts for inner votes
//             {
//                 $lookup: {
//                     from: "votedatas",
//                     localField: "community_Members._id",
//                     foreignField: "post_Id",
//                     as: "votecounts",
//                 }
//             },
//             // { $unwind: "$votecounts" },
//             // for community votes
//             {
//                 $lookup: {
//                     from: "votedatas",
//                     // always let variable use aggrigate variable
//                     let: { post_Id: '$community_Members._id', vote_userId: '$userObjId' },
//                     pipeline: [
//                         {
//                             $match: {
//                                 $expr: {
//                                     $and: [
//                                         // $$post and $$vote_userId is from table database filds
//                                         { $eq: ["$post_Id", "$$post_Id"] },
//                                         { $eq: ["$vote_userId", "$$vote_userId"] },
//                                     ]
//                                 }
//                             }
//                         }
//                     ],
//                     as: "selected_vote"
//                 }
//             },


//             // { $unwind: "$selected_vote" },
//             {
//                 $project: {
//                     "selected_vote.post_Id": 1,
//                     "selected_vote.selct_voteId": 1,
//                     "selected_vote.vote_userId": 1,
//                     total_votes: {
//                         $cond: {
//                             if: {
//                                 "$isArray": "$votecounts"
//                             },
//                             then: {
//                                 "$size": "$votecounts"
//                             },
//                             else: 0
//                         }
//                     },
//                     // total_votes: { $size: "$votecounts" },
//                     "community_Members.user_Id._id": 1,
//                     "community_Members.user_Id.username": 1,
//                     "community_Members.user_Id.image": 1,
//                     "community_Members.user_Id.about": 1,
//                     "community_Members._id": 1,
//                     "community_Members.post_type": 1,
//                     "community_Members.createPost": 1,
//                     "community_Members.desc": 1,
//                     "community_Members.option": 1,
//                     "community_Members.is_public": 1,
//                     "community_Members.createdAt": 1,
//                     // "community_Members.post_likes": 1,
//                     likes: { $size: "$community_Members.post_likes" },
//                 }
//             },
//         ])

//         // Promise.all([homescreen, post]).then((value) => {
//         // }).catch((error) => {
//         //     res.send({ message: 0, message: error.message })
//         // })

//         res.send({ data: homescreen, post, status: 1, message: "homescreen data fatch successfully" })
//     }
//     catch (error) {

//         console.log(error)
//       res.send({status : 0 , message : error.message})

//     }

// }

// exports.joinCommunityByCurrentUser = async (req, res, next) => {
//     try {
//         const userId = req.user._id
//         console.log("typeof ", typeof userId)

//         const notification_counts = await notificationData.find({ user_id: userId, is_Shown: true }).count()
//         const myJoinSections = await communityData.aggregate([
//             {
//                 $match: {
//                     $or: [
//                         { userObjId: userId },
//                         { community_Members: userId }
//                     ]
//                 }
//             },
//             {
//                 $sort: {
//                     utcDate: -1 // 1 for ascending order, -1 for descending order
//                 }
//             }
//         ]);

//         const Data = []
//         for (const item of myJoinSections) {
//             const findActivityInSectionData = await activityInSectionData.findOne({ sectionId: item._id, userId: req.user._id, isSeen: false })

//             //  is seen false = red ? is seen true = blue
//             var isSeen
//             if (findActivityInSectionData === null) {
//                 isSeen = false
//             }
//             else {
//                 isSeen = true
//             }

//             let obj = {}
//             obj._id = item._id
//             obj.cliqk_type = item.cliqk_type
//             obj.subscrition_type = item.subscrition_type ? item.subscrition_type : ""
//             obj.timescale = item.timescale ? item.timescale : ""
//             obj.communityImage = item.communityImage[0]
//             obj.communityName = item.communityName
//             obj.userObjId = item.userObjId,
//                 obj.isSeen = isSeen
//             obj.utcDate = item.utcDate


//             Data.push(obj)
//         }

//         res.send({ status: 1, message: "My Section And My Join Section Fatch Successfully", data: Data, notificationCount: notification_counts })

//     }
//     catch (error) {
//         res.send({ status: 0, message: error.message })
//         console.log("error=>>", error)
//     }
// }

exports.joinCommunityByCurrentUser = async (req, res, next) => {
    try {
        const userId = req.user._id;
        console.log(`Fetching sections for user: ${userId}`);
        
        // Get notification count
        const notification_counts = await notificationData.countDocuments({ 
            user_id: userId, 
            is_Shown: true 
        });

        // Get all sections the user is part of
        const myJoinSections = await communityData.aggregate([
            {
                $match: {
                    $or: [
                        { userObjId: userId },
                        { community_Members: userId },
                        { followersList: userId }
                    ]
                }
            },
            { 
                $sort: { 
                    createdAt: -1 
                } 
            }
        ]);

        console.log(`Found ${myJoinSections.length} sections for user`);

        // Get all section IDs for batch query
        const sectionIds = myJoinSections.map(section => section._id);
        
        // Find all unread activities for these sections for this specific user
        const unreadActivities = await activityInSectionData.find({
            sectionId: { $in: sectionIds },
            userId: userId,
            isSeen: false
        }).lean();

        console.log(`Found ${unreadActivities.length} unread activities`);

        // Create a Set of section IDs that have unread activities
        const sectionsWithUnread = new Set(
            unreadActivities.map(activity => activity.sectionId.toString())
        );

        // Enrich sections with additional data
        const enrichedSections = await Promise.all(myJoinSections.map(async (item) => {
            const sectionIdStr = item._id.toString();
            const hasUnread = sectionsWithUnread.has(sectionIdStr);
            
            // Get the most recent unread activity for this section
            const lastUnreadActivity = unreadActivities
                .filter(a => a.sectionId.toString() === sectionIdStr)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

            // Calculate 24-hour views
            let viewsCount24hr = 0;
            const totalViewsCount = item.viewsTimeAndDateAndUserId?.length || 0;
            
            if (item.viewsTimeAndDateAndUserId?.length > 0) {
                const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
                viewsCount24hr = item.viewsTimeAndDateAndUserId.filter(view => 
                    view?.viewedAt && new Date(view.viewedAt) >= last24Hours
                ).length;
            }

            // Get member count
            const memberCount = await communityData.aggregate([
                { $match: { _id: item._id } },
                {
                    $project: {
                        totalMembers: {
                            $add: [
                                { $size: { $ifNull: ["$community_Members", []] } },
                                { $cond: [{ $ne: ["$userObjId", null] }, 1, 0] }
                            ]
                        }
                    }
                }
            ]);

            return {
                _id: item._id,
                cliqk_type: item.cliqk_type,
                subscription_type: item.subscription_type || "",
                timescale: item.timescale || "",
                communityImage: item.communityImage?.[0] || null,
                communityName: item.communityName,
                userObjId: item.userObjId,
                isSeen: !hasUnread, // false if there are unread activities
                lastActivityAt: lastUnreadActivity?.createdAt || null,
                isMember: item.community_Members?.some(
                    memberId => memberId?.toString() === userId?.toString()
                ) || false,
                dualTimeLine: item.dualTimeLine || false,
                followersCount: item.followersList?.length || 0,
                membersCount: memberCount[0]?.totalMembers || 0,
                viewsCount: viewsCount24hr,
                totalViewsCount: totalViewsCount,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            };
        }));

        // Sort by unread first, then by last activity time
        enrichedSections.sort((a, b) => {
            // Unread sections first
            if (a.isSeen !== b.isSeen) {
                return a.isSeen ? 1 : -1;
            }
            // Then by last activity time (most recent first)
            const timeA = a.lastActivityAt || a.createdAt;
            const timeB = b.lastActivityAt || b.createdAt;
            return new Date(timeB) - new Date(timeA);
        });

        console.log('Sections with unread activities:', 
            enrichedSections.filter(s => !s.isSeen).length
        );

        return res.status(200).json({
            status: 1,
            message: "My Sections And My Join Sections Fetched Successfully",
            data: enrichedSections,
            notificationCount: notification_counts
        });

    } catch (error) {
        console.error("Error in joinCommunityByCurrentUser:", error);
        return res.status(500).json({ 
            status: 0, 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
  
// perticulor Section posts 
// old code 

// exports.perticulorSectionForPost = async (req, res, next) => {
//     try {
//         const userId = req.user._id;
//         const sectionId = mongoose.Types.ObjectId(req.body.sectionId);
//         const createPostFor = req.body.createPostFor;
//         const postBy = req.body.postBy;
//         const page = parseInt(req.body.page) || 1;
//         const limit = parseInt(req.body.limit) || 10;

//         // Mark section activity as seen
//         const activity = await activityInSectionData.findOne({ sectionId, userId, isSeen: false });
//         if (activity) {
//             await activityInSectionData.findByIdAndUpdate(activity._id, { isSeen: true });
//         }

//         let sectionPosts = [];

//         if (createPostFor === "normal") {
//             const section = await communityData.findOne({ _id: sectionId });
//             if (!section) return res.send({ status: 0, message: "Section not found" });

//             const query = {
//                 isActive: true,
//                 communityId: sectionId,
//                 createPostFor: "normal",
//                 user_Id: postBy === "owner" ? section.userObjId : { $ne: section.userObjId }
//             };

//             sectionPosts = await postData.find(query)
//                 .populate({ path: 'user_Id', model: 'userdata' })
//                 .populate({ path: 'repostUserId', model: 'userdata' })
//                 .sort({ createdAt: -1 });

//         } else if (createPostFor === "mediaroom") {
//             sectionPosts = await postData.find({
//                 communityId: sectionId,
//                 createPostFor: "mediaroom"
//             })
//                 .populate({ path: 'user_Id', model: 'userdata' })
//                 .sort({ createdAt: -1 });
//         } else {
//             return res.send({ status: 0, message: "Enter valid value" });
//         }

//         if (sectionPosts.length === 0) {
//             return res.send({ status: 1, message: "No Posts Found in This Section", data: [] });
//         }

//         // Preload sectionOwner
//         const sectionOwner = await communityData.findOne({ _id: sectionId });

//         const posts = await Promise.all(sectionPosts.map(async (item) => {
//             const [total_likes, userLike, commentCounts, repostCount, recentComments] = await Promise.all([
//                 like_dislikedatas.countDocuments({ post_Id: item._id }),
//                 like_dislikedatas.findOne({ user_Id: userId, post_Id: item._id }),
//                 commentModel.countDocuments({ post_Id: item._id }),
//                 postDatas.countDocuments({ _id: item._id, repost: true }),
//                 // Get 2 recent comments in the same format as getComment
//                 commentModel.find({ post_Id: item._id })
//                     .populate({
//                         path: "commentdetails",
//                         select: "username fullname image backgroundImageColour"
//                     })
//                     .populate({
//                         path: "subComments.userId",
//                         select: "username fullname image backgroundImageColour"
//                     })
//                     .sort({ createdAt: -1 })
//                     .limit(2)
//             ]);

//             // Format comments to match getComment structure
//             const formattedComments = recentComments.map(comment => {
//                 const subComments = comment.subComments
//                     .map(subComment => ({
//                         _id: subComment._id,
//                         content: subComment.content,
//                         totalLikes: subComment.likeUsers?.length || 0,
//                         createdAt: subComment.createdAt,
//                         userId: subComment.userId,
//                         likedByCurrentUser: subComment.likeUsers?.some(
//                             liker => liker.LikerId.toString() === userId.toString()
//                         ) || false
//                     }));

//                 return {
//                     _id: comment._id,
//                     post_Id: comment.post_Id,
//                     text: comment.text,
//                     commentdetails: comment.commentdetails,
//                     totalLikes: comment.commentlikerDetails?.length || 0,
//                     createdAt: comment.createdAt,
//                     likedByCurrentUser: comment.commentlikerDetails?.some(
//                         liker => liker.userId._id.toString() === userId.toString()
//                     ) || false,
//                     subComments: subComments,
//                     tagPeoples: comment.tagPeoples
//                 };
//             });

//             return {
//                 _id: item._id,
//                 post_type: item.post_type,
//                 createPost: item.createPost,
//                 time_line: item.time_line,
//                 createvideo: item.createvideo,
//                 createAudio: item.createAudio,
//                 createText: item.createText,
//                 desc: item.desc,
//                 userId: item.user_Id?._id || "",
//                 username: item.user_Id?.username || "",
//                 fullname: item.user_Id?.fullname || "",
//                 forTickStatus: item.user_Id?.forTickStatus || false,
//                 userImage: item.user_Id?.image || "",
//                 backgroundImageColour: item.user_Id?.backgroundImageColour,
//                 createdAt: item.createdAt,
//                 views: item.views,
//                 createPostFor: item.createPostFor,
//                 cover_image: item.cover_image,
//                 file_name: item.file_name,
//                 communityId: item.communityId,
//                 communityOwnerId: item.communityOwnerId,
//                 sectionOwnerId: sectionOwner?.userObjId || "",
//                 likeByMe: !!userLike,
//                 total_likes: total_likes,
//                 postBy: postBy,
//                 utcDate: item.utcDate,
//                 tagPeoples: item.tagPeoples,
//                 commentCounts: commentCounts,
//                 repost: item?.repost || false,
//                 repostUser_id: item?.repostUserId?._id || "",
//                 repostUserfullname: item?.repostUserId?.fullname || "",
//                 repostUserusername: item?.repostUserId?.username || "",
//                 repostUserimage: item?.repostUserId?.image || "",
//                 repostUserbackgroundImageColour: item?.repostUserId?.backgroundImageColour,
//                 repostCount: repostCount,
//                 recentComments: formattedComments,
//                 isActive: item.isActive ,

//             };
//         }));

//         // Pagination
//         const paginate = (items, page, perPage) => {
//             const offset = perPage * (page - 1);
//             const totalPages = Math.ceil(items.length / perPage);
//             return {
//                 previousPage: page > 1,
//                 nextPage: totalPages > page,
//                 totalDocs: items.length,
//                 totalPages,
//                 currentPage: page,
//                 myPost: items.slice(offset, offset + perPage)
//             };
//         };

//         const data = paginate(posts, page, limit);

//         return res.send({ status: 1, message: "Posts Fetched Successfully", data });

//     } catch (error) {
//         console.error("Error in perticulorSectionForPost:", error);
//         return res.send({ status: 0, message: "Something went wrong" });
//     }
// };
exports.perticulorSectionForPost = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sectionId = mongoose.Types.ObjectId(req.body.sectionId);
    const createPostFor = req.body.createPostFor;
    const postBy = req.body.postBy;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;

    // 🔹 Mark section activity as seen
    const activity = await activityInSectionData.findOne({ sectionId, userId, isSeen: false });
    if (activity) {
      await activityInSectionData.findByIdAndUpdate(activity._id, { isSeen: true });
    }

    // 🔹 Fetch posts based on type
    let sectionPosts = [];

    if (createPostFor === "normal") {
      const section = await communityData.findOne({ _id: sectionId });
      console.log("section=>>", section);
      if (!section) return res.send({ status: 0, message: "Section not found" });


      const query = {
        communityId: sectionId,
        isActive: true,
        $or: [{ isChat: true }, { post_type: "text" }],
        user_Id: postBy === "owner" ? section.userObjId : { $ne: section.userObjId },
      };

      sectionPosts = await postData
        .find(query)
        .populate("user_Id", "_id username fullname image backgroundImageColour forTickStatus socialScore xp")
        .populate({
          path: "replies",
          populate: {
            path: "user_Id",
            select: "_id username fullname image backgroundImageColour forTickStatus socialScore xp",
          },
        })
        .populate({
          path: "replied_postId",
          select: "_id desc post_type createChat createText createPost createvideo createAudio createGif",
          populate: {
            path: "user_Id",
            select: "_id username fullname image backgroundImageColour forTickStatus socialScore xp"
          }
        })
        .sort({ createdAt: -1 });

    } else if (createPostFor === "mediaroom") {
      sectionPosts = await postData
        .find({
          communityId: sectionId,
          createPostFor: "mediaroom",
          isActive: true,
          $or: [{ isChat: true }, { post_type: "chat" }],
        })
        .populate("user_Id", "_id username fullname image backgroundImageColour forTickStatus socialScore xp")
        .populate({
          path: "replies",
          populate: {
            path: "user_Id",
            select: "_id username fullname image backgroundImageColour forTickStatus socialScore xp",
          },
        })
        .populate({
          path: "replied_postId",
          select: "_id desc post_type createChat createText createPost createvideo createAudio createGif",
          populate: {
            path: "user_Id",
            select: "_id username fullname image backgroundImageColour forTickStatus socialScore xp"
          }
        })
        .sort({ createdAt: -1 });
    } else {
      return res.send({ status: 0, message: "Enter valid value" });
    }

    if (sectionPosts.length === 0) {
      return res.send({ status: 1, message: "No Posts Found in This Section", data: [] });
    }

    // 🔹 Check if current user is member of this section
    const section = await communityData.findOne({ _id: sectionId });
    const isSectionMember = section && section.community_Members 
      ? section.community_Members.some(memberId => memberId.toString() === userId.toString())
      : false;

    // 🔹 Helper for relative time
    const formatRelativeTime = (date) => {
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
      return `${Math.floor(diffDays / 365)}y`;
    };

    // 🔹 Map Posts
    const posts = await Promise.all(
      sectionPosts.map(async (item) => {
        const [isLiked, commentCounts, repostCount, topComments] = await Promise.all([
          like_dislikedatas.exists({ user_Id: userId, post_Id: item._id }),
          commentModel.countDocuments({ post_Id: item._id }),
          postData.countDocuments({ originalPostId: item._id, repost: true }),
          commentModel.aggregate([
            { $match: { post_Id: item._id } },
            { $sort: { createdAt: -1 } },
            { $limit: 2 },
            {
              $lookup: {
                from: "userdatas",
                localField: "user_Id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 1,
                text: 1,
                createdAt: 1,
                user: {
                  _id: "$user._id",
                  username: "$user.username",
                  fullname: "$user.fullname",
                  image: "$user.image",
                  backgroundImageColour: "$user.backgroundImageColour",
                },
              },
            },
          ]),
        ]);

        // 🔹 Process chat reactions
        const processedChatReactions = (item.chatReactions || []).map((reaction) => ({
          emoji: reaction.emoji || "",
          type: reaction.type || "",
          count: reaction.count || 0,
          hasReacted: reaction.reactedUsers?.some(
            (uid) => uid.toString() === userId.toString()
          ),
        }));

        // 🔹 Parent Post (if reply) - FIXED: Keep original createPost and createvideo as they are
        let repliedTo = null;
        if (item.isReplied && item.replied_postId) {
          repliedTo = {
            post_id: item.replied_postId._id,
            createvideo: item.replied_postId.createvideo || "", // ✅ Video URL as it is
            createPost: item.replied_postId.createPost || [], // ✅ Images array as it is
            createAudio: item.replied_postId.createAudio || "",
            createGif: item.replied_postId.createGif || "",
            createText: item.replied_postId.createText || "",
            desc: item.replied_postId.desc || "",
            createChat: item.replied_postId.createChat || "",
            post_type: item.replied_postId.post_type || "",
            user_data: {
              _id: item.replied_postId.user_Id?._id || null,
              username: item.replied_postId.user_Id?.username || "",
              fullname: item.replied_postId.user_Id?.fullname || "",
              image: item.replied_postId.user_Id?.image || "",
              backgroundImageColour: item.replied_postId.user_Id?.backgroundImageColour || "",
              forTickStatus: item.replied_postId.user_Id?.forTickStatus || false,
              socialScore: item.replied_postId.user_Id?.socialScore || 0,
              xp: item.replied_postId.user_Id?.xp || 0,
            }
          };
        }

        // 🔹 Replies
        const replies = (item.replies || []).map((reply) => ({
          post_id: reply._id,
          post_type: reply.post_type,
          desc: reply.desc || "",
          createChat: reply.createChat || "",
          user_data: {
            _id: reply.user_Id._id,
            username: reply.user_Id.username,
            fullname: reply.user_Id.fullname,
            image: reply.user_Id.image,
            backgroundImageColour: reply.user_Id.backgroundImageColour,
            forTickStatus: reply.user_Id.forTickStatus,
          },
          createdAt: reply.createdAt,
        }));

        // 🔹 Final post object
        return {
          post_id: item._id,
          post_type: item.post_type,
          createPost: item.createPost || [], // ✅ Images array as it is
          createvideo: item.createvideo || "", // ✅ Video URL as it is
          createAudio: item.createAudio || "",
          createText: item.createText || "",
          createGif: item.createGif || "",
          createChat: item.createChat || "",
          desc: item.desc || "",
          user_data: {
            _id: item.user_Id._id,
            username: item.user_Id.username,
            fullname: item.user_Id.fullname,
            image: item.user_Id.image,
            backgroundImageColour: item.user_Id.backgroundImageColour,
            forTickStatus: item.user_Id.forTickStatus,
          },
          tagPeoples: item.tagPeoples || [],
          createdAt: item.createdAt,
          relativeTime: formatRelativeTime(item.createdAt),
          total_likes: item.post_likes?.length || 0,
          total_comments: commentCounts,
          total_reports: item.reports?.length || 0,
          is_public: item.is_public,
          is_Likes: !!isLiked,
          repost: item.repost || false,
          repostCount,
          topComments,
          chatReactions: processedChatReactions,
          views: item.views || 0,
          cover_image: item.cover_image || "",
          file_name: item.file_name || "",
          utcDate: item.utcDate || "",
          communityId: item.communityId || "",
          isChat: item.isChat || false,
          isReplied: item.isReplied,
          replied_postId: item.replied_postId?._id || null,
          repliedTo, // ✅ Now will have video and images as they are
          replies,
          isActive: item.isActive,
          isSectionMember, // ✅ NEW: Boolean indicating if user is member of this section
        };
      })
    );

    // 🔹 Pagination
    const totalDocs = posts.length;
    const totalPages = Math.ceil(totalDocs / limit);
    const start = (page - 1) * limit;
    const paginatedPosts = posts.slice(start, start + limit);

    return res.status(200).json({
      status: 1,
      message: "Posts Fetched Successfully",
      result: {
        totalDocs,
        totalPages,
        currentPage: page,
        nextPage: totalPages > page ? page + 1 : false,
        previousPage: page > 1 ? page - 1 : false,
        post: paginatedPosts,
      },
    });
  } catch (error) {
    console.error("Error in perticulorSectionForPost:", error);
    return res.status(500).json({ status: 0, message: error.message });
  }
};
  

// exports.perticulorSectionForPost = async (req, res, next) => {
//     try {
//         const userId = req.user._id;
//         const sectionId = mongoose.Types.ObjectId(req.body.sectionId);
//         const createPostFor = req.body.createPostFor;
//         const postBy = req.body.postBy;
//         const page = parseInt(req.body.page) || 1;
//         const limit = parseInt(req.body.limit) || 10;

//         // Mark section activity as seen
//         const activity = await activityInSectionData.findOne({ sectionId, userId, isSeen: false });
//         if (activity) {
//             await activityInSectionData.findByIdAndUpdate(activity._id, { isSeen: true });
//         }

//         let sectionPosts = [];

//         if (createPostFor === "normal") {
//             const section = await communityData.findOne({ _id: sectionId });
//             if (!section) return res.send({ status: 0, message: "Section not found" });

//             const query = {
//                 communityId: sectionId,
//                 createPostFor: "normal",
//                 user_Id: postBy === "owner" ? section.userObjId : { $ne: section.userObjId }
//             };

//             sectionPosts = await postData.find(query)
//                 .populate({ path: 'user_Id', model: 'userdata' })
//                 .populate({ path: 'repostUserId', model: 'userdata' })
//                 .sort({ createdAt: -1 });

//         } else if (createPostFor === "mediaroom") {
//             sectionPosts = await postData.find({
//                 communityId: sectionId,
//                 createPostFor: "mediaroom"
//             })
//                 .populate({ path: 'user_Id', model: 'userdata' })
//                 .sort({ utcDate: -1 });
//         } else {
//             return res.send({ status: 0, message: "Enter valid value" });
//         }

//         if (sectionPosts.length === 0) {
//             return res.send({ status: 1, message: "No Posts Found in This Section", data: [] });
//         }

//         // Preload sectionOwner
//         const sectionOwner = await communityData.findOne({ _id: sectionId });

//         const posts = await Promise.all(sectionPosts.map(async (item) => {
//             const [total_likes, userLike, commentCounts, repostCount, topComments] = await Promise.all([
//                 like_dislikedatas.countDocuments({ post_Id: item._id }),
//                 like_dislikedatas.findOne({ user_Id: userId, post_Id: item._id }),
//                 commentModel.countDocuments({ post_Id: item._id }),
//                 postDatas.countDocuments({ _id: item._id, repost: true }),
//                 commentModel.aggregate([
//                     { $match: { post_Id: item._id } },
//                     { $sort: { createdAt: -1 } },
//                     { $limit: 2 },
//                     {
//                         $lookup: {
//                             from: "userdatas",
//                             localField: "user_Id",
//                             foreignField: "_id",
//                             as: "user"
//                         }
//                     },
//                     { $unwind: "$user" },
//                     {
//                         $project: {
//                             _id: 1,
//                             text: 1,
//                             createdAt: 1,
//                             user: {
//                                 _id: "$user._id",
//                                 username: "$user.username",
//                                 image: "$user.image"
//                             }
//                         }
//                     }
//                 ])
//             ]);

//             return {
//                 _id: item._id,
//                 post_type: item.post_type,
//                 createPost: item.createPost,
//                 time_line: item.time_line,
//                 createvideo: item.createvideo,
//                 createAudio: item.createAudio,
//                 createText: item.createText,
//                 desc: item.desc,
//                 userId: item.user_Id?._id || "",
//                 username: item.user_Id?.username || "",
//                 fullname: item.user_Id?.fullname || "",
//                 forTickStatus: item.user_Id?.forTickStatus || false,
//                 userImage: item.user_Id?.image || "",
//                 backgroundImageColour : item.user_Id?.backgroundImageColour,
//                 createdAt: item.createdAt,
//                 views: item.views,
//                 createPostFor: item.createPostFor,
//                 cover_image: item.cover_image,
//                 file_name: item.file_name,
//                 communityId: item.communityId,
//                 communityOwnerId: item.communityOwnerId,
//                 sectionOwnerId: sectionOwner?.userObjId || "",
//                 likeByMe: !!userLike,
//                 total_likes,
//                 postBy,
//                 utcDate: item.utcDate,
//                 tagPeoples: item.tagPeoples,
//                 commentCounts,
//                 repost: item?.repost || false,
//                 repostUser_id: item?.repostUserId?._id || "",
//                 repostUserfullname: item?.repostUserId?.fullname || "",
//                 repostUserusername: item?.repostUserId?.username || "",
//                 repostUserimage: item?.repostUserId?.image || "",
//                 repostUserbackgroundImageColour : item?.repostUserId?.backgroundImageColour,
//                 repostCount,
//                 topComments
//             };
//         }));

//         // Pagination
//         const paginate = (items, page, perPage) => {
//             const offset = perPage * (page - 1);
//             const totalPages = Math.ceil(items.length / perPage);
//             return {
//                 previousPage: page > 1,
//                 nextPage: totalPages > page,
//                 totalDocs: items.length,
//                 totalPages,
//                 currentPage: page,
//                 myPost: items.slice(offset, offset + perPage)
//             };
//         };

//         const data = paginate(posts, page, limit);

//         return res.send({ status: 1, message: "Posts Fetched Successfully", data });

//     } catch (error) {
//         console.error("Error in perticulorSectionForPost:", error);
//         return res.send({ status: 0, message: "Something went wrong" });
//     }
// };


exports.myPost = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;

    const myPosts = await postData.find({
      $or: [
        { user_Id: userId, time_line: true, createPostFor: "mediaroom" },
        { user_Id: userId, createPostFor: "normal" },
        { repostUserId: userId, createPostFor: "normal" },
      ],
      $and: [
        { isActive: true },
        { $or: [{ isChat: true }, { post_type: "text" }] },
      ],
    })
      .populate({
        path: "user_Id",
        select: "_id username fullname image backgroundImageColour forTickStatus socialScore xp isSuspended",
      })
      .populate({
        path: "repostUserId",
        select: "_id username fullname image backgroundImageColour forTickStatus socialScore xp isSuspended",
      })
      // ✅ SECTION POPULATE (NEW – SAFE)
      .populate({
        path: "communityId",
        select: "_id communityName",
        model: "createCliqkData",
      })
      .populate({
        path: "replies",
        populate: {
          path: "user_Id",
          select: "_id username fullname image backgroundImageColour forTickStatus socialScore xp isSuspended",
        },
      })
      .populate({
        path: "replied_postId",
        select: "_id desc post_type createChat createText createPost createvideo createAudio createGif",
        populate: {
          path: "user_Id",
          select: "_id username fullname image backgroundImageColour forTickStatus socialScore xp isSuspended",
        },
      })
      .select("+chatReactions")
      .sort({ createdAt: -1 });

    if (!myPosts.length) {
      return res.send({
        status: 1,
        message: "No Data Found",
        result: {
          previousPage: false,
          nextPage: false,
          totalDocs: 0,
          totalPages: 0,
          currentPage: 1,
          post: [],
        },
      });
    }

    const posts = await Promise.all(
      myPosts.map(async (item) => {
        const [
          total_likes,
          userLike,
          commentCounts,
          repostCount,
          topComments,
        ] = await Promise.all([
          like_dislikedatas.countDocuments({ post_Id: item._id }),
          like_dislikedatas.findOne({ user_Id: userId, post_Id: item._id }),
          commentModel.countDocuments({ post_Id: item._id }),
          postData.countDocuments({ originalPostId: item._id, repost: true }),
          commentModel.aggregate([
            { $match: { post_Id: item._id } },
            { $sort: { createdAt: -1 } },
            { $limit: 2 },
            {
              $lookup: {
                from: "userdatas",
                localField: "user_Id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 1,
                text: 1,
                createdAt: 1,
                user: {
                  _id: "$user._id",
                  username: "$user.username",
                  fullname: "$user.fullname",
                  image: "$user.image",
                  backgroundImageColour: "$user.backgroundImageColour",
                  socialScore: "$user.socialScore",
                  xp: "$user.xp",
                  isSuspended: "$user.isSuspended",
                },
              },
            },
          ]),
        ]);

        // 🔹 Section membership (OLD LOGIC – unchanged)
        let isSectionMember = false;
        if (item.communityId?._id) {
          const section = await communityData.findOne({
            _id: item.communityId._id,
          });
          if (section?.community_Members) {
            isSectionMember = section.community_Members.some(
              (id) => id.toString() === userId.toString()
            );
          }
        }

        // 🔹 Chat reactions
        const processedChatReactions = (item.chatReactions || []).map(
          (reaction) => ({
            emoji: reaction.emoji || "",
            type: reaction.type || "",
            count: reaction.count || 0,
            hasReacted: reaction.reactedUsers?.some(
              (id) => id.toString() === userId.toString()
            ),
          })
        );

        // 🔹 Relative time
        const formatRelativeTime = (date) => {
          const diff = Date.now() - new Date(date);
          const m = Math.floor(diff / 60000);
          const h = Math.floor(diff / 3600000);
          const d = Math.floor(diff / 86400000);
          if (m < 60) return `${m}m`;
          if (h < 24) return `${h}h`;
          if (d < 7) return `${d}d`;
          if (d < 30) return `${Math.floor(d / 7)}w`;
          if (d < 365) return `${Math.floor(d / 30)}mo`;
          return `${Math.floor(d / 365)}y`;
        };

        // 🔹 Parent post (reply)
        let repliedTo = null;
        if (item.isReplied && item.replied_postId) {
          repliedTo = {
            post_id: item.replied_postId._id,
            desc: item.replied_postId.desc || "",
            post_type: item.replied_postId.post_type || "",
            createChat: item.replied_postId.createChat || "",
            createText: item.replied_postId.createText || "",
            createvideo: item.replied_postId.createvideo || "",
            createAudio: item.replied_postId.createAudio || "",
            createGif: item.replied_postId.createGif || "",
            user_data: {
              _id: item.replied_postId.user_Id?._id || null,
              username: item.replied_postId.user_Id?.username || "",
              fullname: item.replied_postId.user_Id?.fullname || "",
              image: item.replied_postId.user_Id?.image || "",
              backgroundImageColour:
                item.replied_postId.user_Id?.backgroundImageColour || "",
              forTickStatus:
                item.replied_postId.user_Id?.forTickStatus || false,
              socialScore:
                item.replied_postId.user_Id?.socialScore || 0,
              xp: item.replied_postId.user_Id?.xp || 0,
            },
          };
        }

        const replies = (item.replies || []).map((reply) => ({
          post_id: reply._id,
          post_type: reply.post_type,
          desc: reply.desc || "",
          createChat: reply.createChat || "",
          user_data: {
            _id: reply.user_Id._id,
            username: reply.user_Id.username,
            fullname: reply.user_Id.fullname,
            image: reply.user_Id.image,
            backgroundImageColour: reply.user_Id.backgroundImageColour,
            forTickStatus: reply.user_Id.forTickStatus,
            socialScore: reply.user_Id.socialScore || 0,
            xp: reply.user_Id.xp || 0,
            isSuspended: reply.user_Id.isSuspended || false,
          },
          createdAt: reply.createdAt,
        }));

        const postObj = {
          post_id: item._id,
          post_type: item.post_type,
          createPost: item.createPost || [],
          sectionId: item.communityId?._id || "",
          createvideo: item.createvideo || "",
          createAudio: item.createAudio || "",
          createText: item.createText || "",
          createGif: item.createGif || "",
          desc: item.desc || "",
          createChat: item.createChat || "",

          user_data: {
            _id: item.user_Id?._id || "",
            username: item.user_Id?.username || "",
            fullname: item.user_Id?.fullname || "",
            image: item.user_Id?.image || "",
            backgroundImageColour:
              item.user_Id?.backgroundImageColour || "",
            forTickStatus: item.user_Id?.forTickStatus || false,
            socialScore: item.user_Id?.socialScore || 0,
            xp: item.user_Id?.xp || 0,
            isSuspended: item.user_Id?.isSuspended || false,
          },

          // ✅ NEW (NON BREAKING)
          section: item.communityId
            ? {
                section_id: item.communityId._id,
                section_name: item.communityId.communityName,
              }
            : null,

          tagPeoples: item.tagPeoples || [],
          createdAt: item.createdAt,
          relativeTime: formatRelativeTime(item.createdAt),
          total_likes,
          total_comments: commentCounts,
          total_reports: 0,
          is_public: item.is_public,
          repost: item.repost || false,
          is_Likes: !!userLike,
          repostCount,
          topComments,
          isActive: item.isActive,
          chatReactions: processedChatReactions,
          views: item.views || 0,
          createPostFor: item.createPostFor,
          cover_image: item.cover_image || "",
          file_name: item.file_name || "",
          utcDate: item.utcDate || "",
          pinPost: item.pinPost || false,
          isChat: item.isChat || false,
          isReplied: item.isReplied || false,
          replied_postId: item.replied_postId?._id || null,
          repliedTo,
          replies,
          communityId: item.communityId?._id || "",
          isSectionMember,
        };

        if (item.repostUserId) {
          postObj.repostUserData = {
            _id: item.repostUserId._id,
            username: item.repostUserId.username,
            fullname: item.repostUserId.fullname,
            image: item.repostUserId.image,
            backgroundImageColour:
              item.repostUserId.backgroundImageColour,
            socialScore: item.repostUserId.socialScore || 0,
            xp: item.repostUserId.xp || 0,
            isSuspended: item.repostUserId.isSuspended || false,
          };
        }

        return postObj;
      })
    );

    const offset = limit * (page - 1);

    return res.send({
      status: 1,
      message: "My All Posts Fetched Successfully",
      result: {
        previousPage: page > 1 ? page - 1 : false,
        nextPage: posts.length > offset + limit ? page + 1 : false,
        totalDocs: posts.length,
        totalPages: Math.ceil(posts.length / limit),
        currentPage: page,
        post: posts.slice(offset, offset + limit),
        isSuspended: req.user?.isSuspended || false,
      },
    });
  } catch (error) {
    console.error("Error in myPost:", error);
    res.send({ status: 0, message: error.message });
  }
};


// exports.myPost = async (req, res, next) => {
//     try {
//       const userId = req.user._id;
//       const page = parseInt(req.body.page) || 1;
//       const limit = parseInt(req.body.limit) || 10;
  
//       // Fetch posts
//       const myPosts = await postData.find({
//         $or: [
//           { user_Id: userId, time_line: true, createPostFor: "mediaroom" },
//           { user_Id: userId, createPostFor: "normal" },
//           { repostUserId: userId, createPostFor: "normal" },
//         ],
//         isActive: true,
//       })
//         .populate({ path: 'user_Id', model: 'userdata' })
//         .populate({ path: 'repostUserId', model: 'userdata' })
//         .sort({ createdAt: -1 });
  
//       if (myPosts.length === 0) {
//         return res.send({ status: 1, message: "No Data Found" });
//       }
  
//       // Pre-fetch liked posts by the current user
//       const likedPostIds = (await like_dislikedatas.find({ user_Id: userId }, { post_Id: 1 }))
//         .map(x => x.post_Id.toString());
  
//       // Fetch blocked users
//       const findUser = await userData.findOne({ _id: userId });
//       const blockedUsers = findUser.blockUsers.map(block => block.userIds.toString());
  
//       // Enrich posts with comments, subcomments, and like information
//       const enrichedPosts = await Promise.all(myPosts.map(async (item) => {
//         const [commentCount, repostCount, recentComments] = await Promise.all([
//           commentModel.countDocuments({ post_Id: item._id }),
//           postDatas.countDocuments({ _id: item._id, repost: true }),
//           // Get 2 recent comments in the same format as getComment
//           commentModel.find({ post_Id: item._id })
//             .populate({
//               path: "commentdetails",
//               select: "username fullname image backgroundImageColour"
//             })
//             .populate({
//               path: "subComments.userId",
//               select: "username fullname image backgroundImageColour"
//             })
//             .populate({
//               path: "commentlikerDetails.userId",
//               select: "username fullname image backgroundImageColour"
//             })
//             .sort({ createdAt: -1 })
//             .limit(2)
//         ]);

//         // Format comments to match getComment structure
//         const formattedComments = recentComments
//           .filter(comment => !blockedUsers.includes(comment.commentdetails?._id?.toString()))
//           .map(comment => {
//             const subComments = comment.subComments
//               .filter(sub => !blockedUsers.includes(sub.userId?._id?.toString()))
//               .map(sub => ({
//                 _id: sub._id,
//                 content: sub.content,
//                 totalLikes: sub.likeUsers?.length || 0,
//                 createdAt: sub.createdAt,
//                 userId: sub.userId,
//                 likedByCurrentUser: sub.likeUsers?.some(
//                   liker => liker.LikerId.toString() === userId.toString()
//                 ) || false
//               }));

//             return {
//               _id: comment._id,
//               post_Id: comment.post_Id,
//               text: comment.text,
//               commentdetails: comment.commentdetails,
//               commentlikerDetails: comment.commentlikerDetails.filter(
//                 liker => !blockedUsers.includes(liker.userId._id.toString())
//               ),
//               subComments: subComments,
//               totalLikes: comment.commentlikerDetails?.length || 0,
//               createdAt: comment.createdAt,
//               likedByCurrentUser: comment.commentlikerDetails?.some(
//                 liker => liker.userId._id.toString() === userId.toString()
//               ) || false,
//               tagPeoples: comment.tagPeoples
//             };
//           });
  
//         // Fetch section owner details
//         const sectionOwner = await communityData.findOne({ _id: item.communityId });
  
//         return {
//           _id: item._id,
//           post_type: item.post_type,
//           createPost: item.createPost,
//           time_line: item.time_line,
//           createvideo: item.createvideo,
//           createAudio: item.createAudio,
//           createText: item.createText,
//           createGif: item.createGif,
//           desc: item.desc,
//           communityId: item.communityId,
//           userId: item.user_Id?._id || "",
//           username: item.user_Id?.username || "",
//           fullname: item.user_Id?.fullname || "",
//           backgroundImageColour: item.user_Id?.backgroundImageColour,
//           forTickStatus: item.user_Id?.forTickStatus || false,
//           userImage: item.user_Id?.image || "",
//           createdAt: item.createdAt,
//           views: item.views,
//           createPostFor: item.createPostFor,
//           cover_image: item.cover_image,
//           file_name: item.file_name,
//           likeByMe: likedPostIds.includes(item._id.toString()),
//           total_likes: likedPostIds.filter(id => id === item._id.toString()).length,
//           commentCounts: commentCount,
//           tagPeoples: item.tagPeoples,
//           sectionOwnerId: sectionOwner?.userObjId || "",
//           pinPost: item?.pinPost || false,
//           repost: item?.repost || false,
//           repostUserId: item?.repostUserId?._id || "",
//           repostUserFullname: item?.repostUserId?.fullname || "",
//           repostUsername: item?.repostUserId?.username || "",
//           repostUserImage: item?.repostUserId?.image || "",
//           repostUserBackgroundImageColour: item?.repostUserId?.backgroundImageColour,
//           repostCount: repostCount,
//           recentComments: formattedComments,
//           isActive: item.isActive ,

//         };
//       }));
  
//       // Paginate posts
//       const paginate = (items, page, perPage) => {
//         const offset = perPage * (page - 1);
//         const totalPages = Math.ceil(items.length / perPage);
//         return {
//           previousPage: page > 1,
//           nextPage: totalPages > page,
//           totalDocs: items.length,
//           totalPages,
//           currentPage: page,
//           myPost: items.slice(offset, offset + perPage)
//         };
//       };

//       const paginatedPosts = paginate(enrichedPosts, page, limit);
  
//       return res.json({
//         status: 1,
//         message: "My All Posts Fetched Successfully",
//         data: paginatedPosts
//       });
//     } catch (error) {
//       console.error("Error in myPost:", error);
//       res.status(500).send({ status: 0, message: "Something went wrong" });
//     }
// };
  

// exports.myPost = async (req, res, next) => {
//     try {
//         const userId = req.user._id;
//         const page = parseInt(req.body.page) || 1;
//         const limit = parseInt(req.body.limit) || 10;

//         const myPosts = await postData.find({
//             $or: [
//                 { user_Id: userId, time_line: true, createPostFor: "mediaroom" },
//                 { user_Id: userId, createPostFor: "normal" },
//                 { repostUserId: userId, createPostFor: "normal" },
//             ]
//         })
//             .populate({ path: 'user_Id', model: 'userdata' })
//             .populate({ path: 'repostUserId', model: 'userdata' })
//             .sort({ utcDate: -1 });

//         if (myPosts.length === 0) {
//             return res.send({ status: 1, message: "No Data Found" });
//         }

//         // Pre-fetch liked posts by the current user
//         const likedPostIds = (await like_dislikedatas.find({ user_Id: userId }, { post_Id: 1 })).map(x => x.post_Id.toString());

//         const enrichedPosts = await Promise.all(myPosts.map(async (item) => {
//             const [commentCount, repostCount, topComments, sectionOwner] = await Promise.all([
//                 commentModel.countDocuments({ post_Id: item._id }),
//                 postDatas.countDocuments({ _id: item._id, repost: true }),
//                 commentModel.aggregate([
//                     { $match: { post_Id: item._id } },
//                     { $sort: { createdAt: -1 } },
//                     { $limit: 2 },
//                     {
//                         $lookup: {
//                             from: "userdatas",
//                             localField: "user_Id",
//                             foreignField: "_id",
//                             as: "user"
//                         }
//                     },
//                     { $unwind: "$user" },
//                     {
//                         $project: {
//                             _id: 1,
//                             text: 1,
//                             createdAt: 1,
//                             user: {
//                                 _id: "$user._id",
//                                 username: "$user.username",
//                                 image: "$user.image"
//                             }
//                         }
//                     }
//                 ]),
//                 communityData.findOne({ _id: item.communityId })
//             ]);

//             return {
//                 _id: item._id,
//                 post_type: item.post_type,
//                 createPost: item.createPost,
//                 time_line: item.time_line,
//                 createvideo: item.createvideo,
//                 createAudio: item.createAudio,
//                 createText: item.createText,
//                 createGif: item.createGif,
//                 desc: item.desc,
//                 communityId: item.communityId,
//                 userId: item.user_Id?._id || "",
//                 username: item.user_Id?.username || "",
//                 fullname: item.user_Id?.fullname || "",
//                 backgroundImageColour : item.user_Id?.backgroundImageColour,
//                 forTickStatus: item.user_Id?.forTickStatus || false,
//                 userImage: item.user_Id?.image || "",
//                 createdAt: item.createdAt,
//                 views: item.views,
//                 createPostFor: item.createPostFor,
//                 cover_image: item.cover_image,
//                 file_name: item.file_name,
//                 likeByMe: likedPostIds.includes(item._id.toString()),
//                 total_likes: likedPostIds.filter(id => id === item._id.toString()).length,
//                 commentCounts: commentCount,
//                 tagPeoples: item.tagPeoples,
//                 sectionOwnerId: sectionOwner?.userObjId || "",
//                 pinPost: item?.pinPost || false,
//                 repost: item?.repost || false,
//                 repostUserId: item?.repostUserId?._id || "",
//                 repostUserFullname: item?.repostUserId?.fullname || "",
//                 repostUsername: item?.repostUserId?.username || "",
//                 repostUserImage: item?.repostUserId?.image || "",
//                 repostUserBackgroundImageColour : item?.repostUserId?.backgroundImageColour,
//                 repostCount,
//                 topComments
//             };
//         }));

//         const paginatedPosts = paginate(enrichedPosts, page, limit);

//         return res.json({ status: 1, message: "My All Posts Fetched Successfully", data: paginatedPosts });
//     } catch (error) {
//         console.error("Error in myPost:", error);
//         res.status(500).send({ status: 0, message: "Something went wrong" });
//     }
// };

const paginate = (items, page, perPage) => {
    const offset = perPage * (page - 1);
    const totalPages = Math.ceil(items.length / perPage);
    const paginatedItems = items.slice(offset, perPage * page);
    const current_page = offset / perPage + 1;

    return {
        previousPage: page - 1 > 0,
        nextPage: totalPages > page,
        totalDocs: items.length,
        totalPages: totalPages,
        currentPage: current_page,
        myPost: paginatedItems
    };
};




// communitySeenPosts 
exports.seenPostFromSection = async (req, res, next) => {
    try {
        const userId = req.user._id
        const sectionId = req.body.sectionId

        const findActivityInSectionData = await activityInSectionData.findOne({ sectionId: sectionId, userId: userId, isSeen: false })
        console.log("findActivityInSectionData=>>>>", findActivityInSectionData)
        if (findActivityInSectionData !== null) {
            const updateStatus = await activityInSectionData.findByIdAndUpdate({ _id: findActivityInSectionData._id }, {
                isSeen: true
            }, { new: true })
            return res.send({ status: 1, message: "Seen successfully" })
        }
        else {
            return res.send({ status: 0, message: "Do not have data" })
        }
    }
    catch (error) {
        console.log("error=>>>>", error)
        return res.send({ status: 0, message: "Something went wrong" })

    }
}


// post for private section
// new code
// exports.postForPerticulorPrivateSections = async (req, res, next) => {
//     try {
//         const sectionId = mongoose.Types.ObjectId(req.body.sectionId);
//         const userId = req.user._id;
//         const page = req.body.page || 1;
//         const limit = req.body.limit || 10;

//         const sectionFind = await communityData.findOne({ _id: sectionId });
//         if (sectionFind.cliqk_type !== "private") {
//             return res.send({ status: 1, message: "Section is not private" });
//         }

//         const findActivityInSectionData = await activityInSectionData.findOneAndUpdate(
//             { sectionId: sectionId, userId: userId, isSeen: false },
//             { $set: { isSeen: true } },
//             { new: true }
//         );

//         const sectionPosts = await postData.aggregate([
//             { $match: { communityId: sectionId, createPostFor: "normal" } },
//             { $lookup: { from: "userdatas", localField: "user_Id", foreignField: "_id", as: "user" } },
//             { $unwind: "$user" },
//             { $sort: { utcDate: -1 } },
//             { $skip: (page - 1) * limit },
//             { $limit: limit }
//         ]);

//         if (sectionPosts.length <= 0) {
//             return res.send({ status: 1, message: "No posts in this section" });
//         }

//         // const likeData = await like_dislikedatas.aggregate([
//         //     { $match: { user_Id: userId, post_Id: { $in: sectionPosts.map(item => item._id) } } },
//         //     { $group: { _id: "$post_Id", userLikes: { $push: "$post_Id" } } }
//         // ]);

//         // const likedPosts = new Set(likeData.map(like => like._id));
//         // console.log("likedPosts", likedPosts)


//         const postPromises = sectionPosts.map(async item => {
//             const total_likes = await like_dislikedatas.find({ post_Id: item._id }).countDocuments();
//             const data = await like_dislikedatas.findOne({ user_Id: userId, post_Id: item._id });
//             const likeByMe = (data !== null); // Check if data exists to determine likeByMe

//             return {
//                 _id: item._id,
//                 post_type: item.post_type,
//                 createPost: item.createPost,
//                 time_line: item.time_line,
//                 createvideo: item.createvideo,
//                 createAudio: item.createAudio,
//                 createText: item.createText,
//                 desc: item.desc,
//                 userId: item.user_Id._id,
//                 username: item.user_Id.username,
//                 fullname: item.user_Id.fullname,
//                 userImage: item.user_Id.image,
//                 createdAt: item.createdAt,
//                 views: item.views,
//                 createPostFor: item.createPostFor,
//                 cover_image: item.cover_image,
//                 file_name: item.file_name,
//                 sectionId: item.communityId,
//                 communityOwnerId: item.communityOwnerId,
//                 utcDate: item.utcDate,
//                 total_likes: total_likes,
//                 likeByMe: likeByMe
//                 // Include other necessary fields
//             };
//         });

//         const post = await Promise.all(postPromises);


//         // const post = sectionPosts.map(async item => ({



//         //     _id: item._id,
//         //     post_type: item.post_type,
//         //     createPost: item.createPost,
//         //     time_line: item.time_line,
//         //     createvideo: item.createvideo,
//         //     createAudio: item.createAudio,
//         //     createText: item.createText,
//         //     desc: item.desc,
//         //     userId: item.user_Id._id,
//         //     username: item.user_Id.username,
//         //     fullname: item.user_Id.fullname,
//         //     userImage: item.user_Id.image,
//         //     createdAt: item.createdAt,
//         //     views: item.views,
//         //     createPostFor: item.createPostFor,
//         //     cover_image: item.cover_image,
//         //     file_name: item.file_name,
//         //     sectionId: item.communityId,
//         //     communityOwnerId: item.communityOwnerId,
//         //     utcDate: item.utcDate,
//         //     //obj.total_likes = total_likes
//         //     likeByMe: likedPosts



//         //     // Include other necessary fields
//         // }));

//         const totalPages = Math.ceil(sectionPosts.length / limit);
//         const currentPage = Math.min(page, totalPages);

//         res.send({
//             status: 1,
//             message: "Section posts fetched successfully",
//             data: {
//                 previousPage: currentPage > 1,
//                 nextPage: currentPage < totalPages,
//                 totalDocs: sectionPosts.length,
//                 totalPages: totalPages,
//                 currentPage: currentPage,
//                 myPost: post
//             }
//         });
//     } catch (error) {
//         console.log("error=>>>", error);
//         res.send({ status: 0, message: "Something went wrong" });
//     }
// }

// old code

exports.postForPerticulorPrivateSections = async (req, res, next) => {
  try {
      const userId = req.user._id;
      const sectionId = mongoose.Types.ObjectId(req.body.sectionId);
      const createPostFor = req.body.createPostFor || "normal";
      const postBy = req.body.postBy;
      const page = parseInt(req.body.page) || 1;
      const limit = parseInt(req.body.limit) || 10;

      // Check if section exists
      const section = await communityData.findOne({ _id: sectionId });
      if (!section) {
          return res.send({ 
              status: 1, 
              message: "No Data Found",
              result: {
                  previousPage: false,
                  nextPage: false,
                  totalDocs: 0,
                  totalPages: 0,
                  currentPage: 1,
                  post: []
              }
          });
      }

      // ✅ Check if current user is member of this section
      const isSectionMember = section && section.community_Members 
          ? section.community_Members.some(memberId => memberId.toString() === userId.toString())
          : false;

      // Mark section activity as seen if exists
      const activity = await activityInSectionData.findOne({ 
          sectionId, 
          userId, 
          isSeen: false 
      });
      if (activity) {
          await activityInSectionData.findByIdAndUpdate(
              activity._id, 
              { isSeen: true }
          );
      }

      // Build query based on parameters
      let query = {
          communityId: sectionId,
          isActive: true,
          createPostFor: createPostFor,
          $or: [{ isChat: true }, { post_type: "text" }]
      };

      // Filter by post creator if specified for normal posts
      if (createPostFor === "normal" && postBy) {
          if (postBy === "owner") {
              query.user_Id = section.userObjId;
          } else if (postBy === "members") {
              query.user_Id = { $ne: section.userObjId };
          }
      }

      // Fetch posts with necessary population - FIXED populate for replied_postId
      const sectionPosts = await postData.find(query)
          .populate({ 
              path: 'user_Id', 
              model: 'userdata',
              select: '_id username fullname image backgroundImageColour forTickStatus socialScore xp'
          })
          .populate({ 
              path: 'repostUserId', 
              model: 'userdata',
              select: '_id username fullname image backgroundImageColour forTickStatus socialScore xp'
          })
          .populate({
              path: "replies",
              populate: {
                  path: "user_Id",
                  select: "_id username fullname image backgroundImageColour forTickStatus socialScore xp",
              },
          })
          .populate({
              path: "replied_postId",
              select: "_id desc post_type createChat createText createPost createvideo createAudio createGif", // ✅ Added all media fields
              populate: { // ✅ Added populate for user data
                  path: "user_Id",
                  select: "_id username fullname image backgroundImageColour forTickStatus socialScore xp"
              }
          })
          .select('+chatReactions')
          .sort({ createdAt: -1 });

      if (sectionPosts.length === 0) {
          return res.send({ 
              status: 1, 
              message: "No Data Found",
              result: {
                  previousPage: false,
                  nextPage: false,
                  totalDocs: 0,
                  totalPages: 0,
                  currentPage: 1,
                  post: []
              }
          });
      }

      // Process each post - LIKE myPost structure
      const posts = await Promise.all(sectionPosts.map(async (item) => {
          // Get counts and user interactions in parallel - LIKE myPost
          const [total_likes, userLike, commentCounts, repostCount, topComments] = await Promise.all([
              like_dislikedatas.countDocuments({ post_Id: item._id }),
              like_dislikedatas.findOne({ user_Id: userId, post_Id: item._id }),
              commentModel.countDocuments({ post_Id: item._id }),
              postData.countDocuments({ originalPostId: item._id, repost: true }),
              // Get top 2 comments in homeScreenPost format - LIKE myPost
              commentModel.aggregate([
                  { $match: { post_Id: item._id } },
                  { $sort: { createdAt: -1 } },
                  { $limit: 2 },
                  {
                      $lookup: {
                          from: "userdatas",
                          localField: "user_Id",
                          foreignField: "_id",
                          as: "user",
                      },
                  },
                  { $unwind: "$user" },
                  {
                      $project: {
                          _id: 1,
                          text: 1,
                          createdAt: 1,
                          user: {
                              _id: "$user._id",
                              username: "$user.username",
                              fullname: "$user.fullname",
                              image: "$user.image",
                              backgroundImageColour: "$user.backgroundImageColour",
                              socialScore: "$user.socialScore",
                              xp: "$user.xp",
                          },
                      },
                  }
              ])
          ]);

          // Process chat reactions - LIKE myPost
          const processedChatReactions = await Promise.all(
              (item.chatReactions || []).map(async (reaction) => {
                  const hasReacted = reaction.reactedUsers 
                      ? reaction.reactedUsers.some(reactedUserId => 
                          reactedUserId.toString() === userId.toString())
                      : false;
                  
                  return {
                      emoji: reaction.emoji || "",
                      type: reaction.type || "",
                      count: reaction.count || 0,
                      hasReacted: hasReacted
                  };
              })
          );

          // Format relative time - LIKE myPost
          const formatRelativeTime = (date) => {
              const now = new Date();
              const diffMs = now - date;
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMs / 3600000);
              const diffDays = Math.floor(diffMs / 86400000);
              
              if (diffMins < 60) return `${diffMins}m`;
              if (diffHours < 24) return `${diffHours}h`;
              return `${diffDays}d`;
          };

          // 🔹 Parent Post (if reply) - FIXED with user data and all media fields
          let repliedTo = null;
          if (item.isReplied && item.replied_postId) {
              repliedTo = {
                  post_id: item.replied_postId._id,
                  createvideo: item.replied_postId.createvideo || "",
                  createPost: item.replied_postId.createPost || [],
                  createAudio: item.replied_postId.createAudio || "",
                  createGif: item.replied_postId.createGif || "",
                  createText: item.replied_postId.createText || "",
                  desc: item.replied_postId.desc || "",
                  createChat: item.replied_postId.createChat || "",
                  post_type: item.replied_postId.post_type || "",
                  user_data: { // ✅ Added user data for replied post
                      _id: item.replied_postId.user_Id?._id || null,
                      username: item.replied_postId.user_Id?.username || "",
                      fullname: item.replied_postId.user_Id?.fullname || "",
                      image: item.replied_postId.user_Id?.image || "",
                      backgroundImageColour: item.replied_postId.user_Id?.backgroundImageColour || "",
                      forTickStatus: item.replied_postId.user_Id?.forTickStatus || false,
                      socialScore: item.replied_postId.user_Id?.socialScore || 0,
                      xp: item.replied_postId.user_Id?.xp || 0,
                  }
              };
          }

          // 🔹 Replies - LIKE perticulorSectionForPost
          const replies = (item.replies || []).map((reply) => ({
              post_id: reply._id,
              post_type: reply.post_type,
              desc: reply.desc || "",
              createChat: reply.createChat || "",
              user_data: {
                  _id: reply.user_Id._id,
                  username: reply.user_Id.username,
                  fullname: reply.user_Id.fullname,
                  image: reply.user_Id.image,
                  backgroundImageColour: reply.user_Id.backgroundImageColour,
                  forTickStatus: reply.user_Id.forTickStatus,
                  socialScore: reply.user_Id.socialScore || 0,
                  xp: reply.user_Id.xp || 0,
              },
              createdAt: reply.createdAt,
          }));

          // Build post object - LIKE myPost structure
          const postObj = {
              post_id: item._id,
              post_type: item.post_type,
              createPost: item.createPost || [],
              sectionId: item.communityId || "",
              createvideo: item.createvideo || "",
              createAudio: item.createAudio || "",
              createText: item.createText || "",
              createGif: item.createGif || "",
              desc: item.desc || "",
              createChat: item.createChat || "",
              user_data: {
                  _id: item.user_Id?._id || "",
                  username: item.user_Id?.username || "",
                  image: item.user_Id?.image || "",
                  fullname: item.user_Id?.fullname || "",
                  forTickStatus: item.user_Id?.forTickStatus || false,
                  backgroundImageColour: item.user_Id?.backgroundImageColour || "",
                  socialScore: item.user_Id?.socialScore || 0,
                  xp: item.user_Id?.xp || 0,
              },
              tagPeoples: item.tagPeoples || [],
              createdAt: item.createdAt,
              relativeTime: formatRelativeTime(item.createdAt),
              total_likes: total_likes,
              total_comments: commentCounts,
              total_reports: 0,
              is_public: item.is_public,
              repost: item?.repost || false,
              is_Likes: !!userLike,
              repostCount: repostCount,
              topComments: topComments || [],
              isActive: item.isActive,
              chatReactions: processedChatReactions,
              views: item.views || 0,
              createPostFor: item.createPostFor,
              cover_image: item.cover_image || "",
              file_name: item.file_name || "",
              utcDate: item.utcDate || "",
              pinPost: item.pinPost || false,
              isChat: item.isChat || false,
              // 🔹 NEW FIELDS from perticulorSectionForPost
              isReplied: item.isReplied || false,
              replied_postId: item.replied_postId?._id || null,
              repliedTo: repliedTo, // ✅ Now with user data and all media fields
              replies: replies,
              communityId: item.communityId || "",
              isSectionMember: isSectionMember, // ✅ NEW: Boolean indicating if user is member of this section
          };

          // Add repost user info - LIKE myPost
          if (item.repostUserId) {
              postObj.repostUserData = {
                  _id: item.repostUserId?._id || "",
                  fullname: item.repostUserId?.fullname || "",
                  username: item.repostUserId?.username || "",
                  image: item.repostUserId?.image || "",
                  backgroundImageColour: item.repostUserId?.backgroundImageColour || "",
                  socialScore: item.repostUserId?.socialScore || 0,
                  xp: item.repostUserId?.xp || 0,
              };
          }

          return postObj;
      }));

      // Pagination - EXACTLY LIKE myPost
      const paginate = (items, page, perPage) => {
          const offset = perPage * (page - 1);
          const totalPages = Math.ceil(items.length / perPage);
          const paginatedItems = items.slice(offset, perPage * page);
          const current_page = (offset / perPage) + 1;

          return {
              previousPage: page - 1 > 0 ? page - 1 : false,
              nextPage: (totalPages > page) ? page + 1 : false,
              totalDocs: items.length,
              totalPages: totalPages,
              currentPage: current_page,
              post: paginatedItems
          };
      };

      const result = paginate(posts, page, limit);

      return res.send({
          status: 1,
          message: "Section Posts Fetched Successfully",
          result // homeScreenPost format LIKE myPost
      });

  } catch (error) {
      console.error("Error in postForPerticulorPrivateSections:", error);
      return res.send({ status: 0, message: error.message });
  }
};

// exports.perticulorSectionForPost = async (req, res, next) => {
//     try {
//         const userId = req.user._id;
//         const sectionId = mongoose.Types.ObjectId(req.body.sectionId);
//         const createPostFor = req.body.createPostFor || "normal";
//         const postBy = req.body.postBy;
//         const page = parseInt(req.body.page) || 1;
//         const limit = parseInt(req.body.limit) || 10;

//         // Check if section exists
//         const section = await communityData.findOne({ _id: sectionId });
//         if (!section) {
//             return res.send({ status: 0, message: "Section not found" });
//         }

//         // Mark section activity as seen if exists
//         const activity = await activityInSectionData.findOne({ 
//             sectionId, 
//             userId, 
//             isSeen: false 
//         });
//         if (activity) {
//             await activityInSectionData.findByIdAndUpdate(
//                 activity._id, 
//                 { isSeen: true }
//             );
//         }

//         // Build query based on parameters
//         let query = {
//             communityId: sectionId,
//             isActive: true,
//             createPostFor: createPostFor
//         };

//         // Filter by post creator if specified for normal posts
//         if (createPostFor === "normal" && postBy) {
//             if (postBy === "owner") {
//                 query.user_Id = section.userObjId;
//             } else if (postBy === "members") {
//                 query.user_Id = { $ne: section.userObjId };
//             }
//         }

//         // Fetch posts with necessary population
//         const sectionPosts = await postData.find(query)
//             .populate({ 
//                 path: 'user_Id', 
//                 model: 'userdata',
//                 select: 'username fullname image backgroundImageColour forTickStatus'
//             })
//             .populate({ 
//                 path: 'repostUserId', 
//                 model: 'userdata',
//                 select: 'username fullname image backgroundImageColour'
//             })
//             .select('+chatReactions')
//             .sort({ createdAt: -1 });

//         if (sectionPosts.length === 0) {
//             return res.send({ 
//                 status: 1, 
//                 message: "No Posts Found in This Section", 
//                 data: [] 
//             });
//         }

//         // Process each post
//         const posts = await Promise.all(sectionPosts.map(async (item) => {
//             // Get counts and user interactions in parallel
//             const [total_likes, commentCounts, userLike, repostCount] = await Promise.all([
//                 like_dislikedatas.countDocuments({ post_Id: item._id }),
//                 commentModel.countDocuments({ post_Id: item._id }),
//                 like_dislikedatas.findOne({ user_Id: userId, post_Id: item._id }),
//                 postData.countDocuments({ _id: item._id, repost: true })
//             ]);

//             // Get recent comments (2 most recent)
//             const recentComments = await commentModel.find({ post_Id: item._id })
//                 .populate({
//                     path: "commentdetails",
//                     select: "username fullname image backgroundImageColour"
//                 })
//                 .populate({
//                     path: "subComments.userId",
//                     select: "username fullname image backgroundImageColour"
//                 })
//                 .sort({ createdAt: -1 })
//                 .limit(2);

//             // Format comments
//             const formattedComments = recentComments.map(comment => {
//                 const subComments = comment.subComments.map(subComment => ({
//                     _id: subComment._id,
//                     content: subComment.content,
//                     totalLikes: subComment.likeUsers?.length || 0,
//                     createdAt: subComment.createdAt,
//                     userId: subComment.userId,
//                     likedByCurrentUser: subComment.likeUsers?.some(
//                         liker => liker.LikerId.toString() === userId.toString()
//                     ) || false
//                 }));

//                 return {
//                     _id: comment._id,
//                     post_Id: comment.post_Id,
//                     text: comment.text,
//                     commentdetails: comment.commentdetails,
//                     totalLikes: comment.commentlikerDetails?.length || 0,
//                     createdAt: comment.createdAt,
//                     likedByCurrentUser: comment.commentlikerDetails?.some(
//                         liker => liker.userId._id.toString() === userId.toString()
//                     ) || false,
//                     subComments: subComments,
//                     tagPeoples: comment.tagPeoples
//                 };
//             });

//             // Process chat reactions
//             const processedChatReactions = await Promise.all(
//                 (item.chatReactions || []).map(async (reaction) => {
//                     const hasReacted = reaction.reactedUsers 
//                         ? reaction.reactedUsers.some(reactedUserId => 
//                             reactedUserId.toString() === userId.toString())
//                         : false;
                    
//                     return {
//                         emoji: reaction.emoji || "",
//                         type: reaction.type || "",
//                         count: reaction.count || 0,
//                         hasReacted: hasReacted
//                     };
//                 })
//             );

//             // Format relative time
//             const formatRelativeTime = (date) => {
//                 const now = new Date();
//                 const diffMs = now - date;
//                 const diffMins = Math.floor(diffMs / 60000);
//                 const diffHours = Math.floor(diffMs / 3600000);
//                 const diffDays = Math.floor(diffMs / 86400000);
                
//                 if (diffMins < 60) return `${diffMins}m`;
//                 if (diffHours < 24) return `${diffHours}h`;
//                 return `${diffDays}d`;
//             };

//             // Build post object
//             const postObj = {
//                 _id: item._id,
//                 post_type: item.post_type,
//                 createPost: item.createPost,
//                 time_line: item.time_line,
//                 createvideo: item.createvideo,
//                 createAudio: item.createAudio,
//                 createText: item.createText,
//                 createGif: item.createGif,
//                 createChat: item.createChat || "",
//                 desc: item.desc,
//                 userId: item.user_Id._id,
//                 username: item.user_Id.username,
//                 fullname: item.user_Id.fullname,
//                 userImage: item.user_Id.image,
//                 backgroundImageColour: item.user_Id.backgroundImageColour,
//                 forTickStatus: item.user_Id.forTickStatus,
//                 createdAt: item.createdAt,
//                 relativeTime: formatRelativeTime(item.createdAt),
//                 views: item.views,
//                 createPostFor: item.createPostFor,
//                 cover_image: item.cover_image,
//                 file_name: item.file_name,
//                 sectionId: item.communityId,
//                 likeByMe: !!userLike,
//                 total_likes: total_likes,
//                 communityOwnerId: item.communityOwnerId,
//                 utcDate: item.utcDate,
//                 commentCounts: commentCounts,
//                 communityId: item.communityId,
//                 tagPeoples: item.tagPeoples || [],
//                 sectionOwnerId: section.userObjId,
//                 pinPost: item.pinPost || false,
//                 repost: item.repost || false,
//                 repostCount: repostCount,
//                 recentComments: formattedComments,
//                 isActive: item.isActive,
//                 chatReactions: processedChatReactions
//             };

//             // Add repost user info if exists
//             if (item.repostUserId) {
//                 postObj.repostUserId = item.repostUserId._id;
//                 postObj.repostUserFullname = item.repostUserId.fullname;
//                 postObj.repostUsername = item.repostUserId.username;
//                 postObj.repostUserbackgroundImageColour = item.repostUserId.backgroundImageColour;
//                 postObj.repostUserImage = item.repostUserId.image;
//             }

//             return postObj;
//         }));

//         // Pagination
//         const paginate = (items, page, perPage) => {
//             const offset = perPage * (page - 1);
//             const totalPages = Math.ceil(items.length / perPage);
//             const paginatedItems = items.slice(offset, perPage * page);
//             const current_page = offset / perPage + 1;

//             return {
//                 previousPage: page - 1 ? page - 1 : false,
//                 nextPage: totalPages > page ? page + 1 : false,
//                 totalDocs: items.length,
//                 totalPages: totalPages,
//                 currentPage: current_page,
//                 posts: paginatedItems
//             };
//         };

//         const paginatedData = paginate(posts, page, limit);

//         return res.send({ 
//             status: 1, 
//             message: "Section Posts Fetched Successfully", 
//             data: paginatedData 
//         });

//     } catch (error) {
//         console.error("Error in perticulorSectionForPost:", error);
//         return res.send({ status: 0, message: "Something went wrong" });
//     }
// };

// exports.postForPerticulorPrivateSections = async (req, res, next) => {
//     try {
//         const sectionId = mongoose.Types.ObjectId(req.body.sectionId)
//         const userId = req.user._id

//         const page = req.body.page || 1
//         const limit = req.body.limit || 10

//         const sectionFind = await communityData.findOne({ _id: sectionId })

//         if (!sectionFind) {
//             return res.send({ status: 0, message: "Section not found" })
//         }

//         const findActivityInSectionData = await activityInSectionData.findOne({ sectionId: sectionId, userId: userId, isSeen: false })

//         if (findActivityInSectionData !== null) {
//             await activityInSectionData.findByIdAndUpdate({ _id: findActivityInSectionData._id }, {
//                 isSeen: true
//             }, { new: true })
//         }

//         const sectionPosts = await postData.find({
//             communityId: sectionId,
//             createPostFor: "normal",
//             isActive: true ,
//         })
//             .populate({
//                 path: 'user_Id',
//                 model: 'userdata'
//             }).populate({
//                 path: 'repostUserId',
//                 model: 'userdata'
//             })
//             .sort({ createdAt: -1 });

//         if (sectionPosts.length <= 0) {
//             return res.send({ status: 1, message: "Do Not Have Post In This Section" })
//         }

//         const post = []
//         for (const item of sectionPosts) {
//             const total_likes = await like_dislikedatas.find({ post_Id: item._id }).countDocuments()
//             const commentCounts = await commentModel.find({ post_Id: item._id }).countDocuments()

//             // Get 2 recent comments in the same format as getComment
//             const recentComments = await commentModel.find({ post_Id: item._id })
//                 .populate({
//                     path: "commentdetails",
//                     select: "username fullname image backgroundImageColour"
//                 })
//                 .populate({
//                     path: "subComments.userId",
//                     select: "username fullname image backgroundImageColour"
//                 })
//                 .sort({ createdAt: -1 })
//                 .limit(2)

//             const formattedComments = recentComments.map(comment => {
//                 const subComments = comment.subComments
//                     .map(subComment => ({
//                         _id: subComment._id,
//                         content: subComment.content,
//                         totalLikes: subComment.likeUsers?.length || 0,
//                         createdAt: subComment.createdAt,
//                         userId: subComment.userId,
//                         likedByCurrentUser: subComment.likeUsers?.some(
//                             liker => liker.LikerId.toString() === userId.toString()
//                         ) || false
//                     }));

//                 return {
//                     _id: comment._id,
//                     post_Id: comment.post_Id,
//                     text: comment.text,
//                     commentdetails: comment.commentdetails,
//                     totalLikes: comment.commentlikerDetails?.length || 0,
//                     createdAt: comment.createdAt,
//                     likedByCurrentUser: comment.commentlikerDetails?.some(
//                         liker => liker.userId._id.toString() === userId.toString()
//                     ) || false,
//                     subComments: subComments,
//                     tagPeoples: comment.tagPeoples
//                 };
//             });

//             const sectionOwner = await communityData.findOne({ _id: item.communityId })

//             const likeData = await like_dislikedatas.findOne({ user_Id: userId, post_Id: item._id });
//             const likeByMe = !!likeData

//             const obj = {
//                 _id: item._id,
//                 post_type: item.post_type,
//                 createPost: item.createPost,
//                 time_line: item.time_line,
//                 createvideo: item.createvideo,
//                 createAudio: item.createAudio,
//                 createText: item.createText,
//                 createGif: item.createGif,
//                 desc: item.desc,
//                 userId: item.user_Id._id,
//                 username: item.user_Id.username,
//                 fullname: item.user_Id.fullname,
//                 userImage: item.user_Id.image,
//                 backgroundImageColour: item.user_Id.backgroundImageColour,
//                 forTickStatus: item.user_Id.forTickStatus,
//                 createdAt: item.createdAt,
//                 views: item.views,
//                 createPostFor: item.createPostFor,
//                 cover_image: item.cover_image,
//                 file_name: item.file_name,
//                 sectionId: item.communityId,
//                 likeByMe: likeByMe,
//                 total_likes: total_likes,
//                 communityOwnerId: item.communityOwnerId,
//                 utcDate: item.utcDate,
//                 commentCounts: commentCounts,
//                 communityId: item.communityId,
//                 tagPeoples: item.tagPeoples,
//                 sectionOwnerId: sectionOwner?.userObjId || "",
//                 pinPost: item?.pinPost || false,
//                 repostUserId: item?.repostUserId?._id || "",
//                 repostUserFullname: item?.repostUserId?.fullname || "",
//                 repostUsername: item?.repostUserId?.username || "",
//                 repostUserbackgroundImageColour: item?.repostUserId?.backgroundImageColour || "",
//                 repostUserImage: item?.repostUserId?.image || "",
//                 repost: item?.repost || false,
//                 recentComments: formattedComments,
//                 isActive: item.isActive ,

//             }

//             post.push(obj)
//         }

//         const paginate = (items, page, perPage) => {
//             const offset = perPage * (page - 1)
//             const totalPages = Math.ceil(items.length / perPage)
//             const paginatedItems = items.slice(offset, perPage * page)
//             const current_page = offset / perPage + 1

//             return {
//                 previousPage: page - 1 ? true : false,
//                 nextPage: totalPages > page ? true : false,
//                 totalDocs: items.length,
//                 totalPages: totalPages,
//                 currentPage: current_page,
//                 myPost: paginatedItems
//             }
//         }

//         const dataNew = paginate(post, page, limit)

//         res.send({ status: 1, message: "Section Posts Fetch Successfully", data: dataNew })

//     } catch (error) {
//         console.log("error=>>>", error)
//         return res.send({ status: 0, message: "Something went wrong" })
//     }
// }

// exports.postForPerticulorPrivateSections = async (req, res, next) => {
//     try {
//         const sectionId = mongoose.Types.ObjectId(req.body.sectionId)
//         const userId = req.user._id

//         const page = req.body.page || 1
//         const limit = req.body.limit || 10

//         const sectionFind = await communityData.findOne({ _id: sectionId })

//         if (!sectionFind) {
//             return res.send({ status: 0, message: "Section not found" })
//         }

//         const findActivityInSectionData = await activityInSectionData.findOne({ sectionId: sectionId, userId: userId, isSeen: false })

//         if (findActivityInSectionData !== null) {
//             await activityInSectionData.findByIdAndUpdate({ _id: findActivityInSectionData._id }, {
//                 isSeen: true
//             }, { new: true })
//         }

//         const sectionPosts = await postData.find({
//             communityId: sectionId,
//             createPostFor: "normal"
//         })
//             .populate({
//                 path: 'user_Id',
//                 model: 'userdata'
//             }).populate({
//                 path: 'repostUserId',
//                 model: 'userdata'
//             })
//             .sort({ utcDate: -1 });

//         if (sectionPosts.length <= 0) {
//             return res.send({ status: 1, message: "Do Not Have Post In This Section" })
//         }

//         const post = []
//         for (const item of sectionPosts) {
//             const total_likes = await like_dislikedatas.find({ post_Id: item._id }).countDocuments()
//             const commentCounts = await commentModel.find({ post_Id: item._id }).countDocuments()

//             // 🔽 Get 2 recent comments
//             const recentComments = await commentModel.find({ post_Id: item._id })
//                 .populate({ path: "user_Id", model: "userdata", select: "username fullname image backgroundImageColour" })
//                 .sort({ createdAt: -1 })
//                 .limit(2)

//             const sectionOwner = await communityData.findOne({ _id: item.communityId })

//             const likeData = await like_dislikedatas.findOne({ user_Id: userId, post_Id: item._id });
//             const likeByMe = !!likeData

//             const obj = {
//                 _id: item._id,
//                 post_type: item.post_type,
//                 createPost: item.createPost,
//                 time_line: item.time_line,
//                 createvideo: item.createvideo,
//                 createAudio: item.createAudio,
//                 createText: item.createText,
//                 createGif: item.createGif,
//                 desc: item.desc,
//                 userId: item.user_Id._id,
//                 username: item.user_Id.username,
//                 fullname: item.user_Id.fullname,
//                 userImage: item.user_Id.image,
//                 backgroundImageColour : item.user_Id.backgroundImageColour,
//                 forTickStatus: item.user_Id.forTickStatus,
//                 createdAt: item.createdAt,
//                 views: item.views,
//                 createPostFor: item.createPostFor,
//                 cover_image: item.cover_image,
//                 file_name: item.file_name,
//                 sectionId: item.communityId,
//                 likeByMe: likeByMe,
//                 total_likes: total_likes,
//                 communityOwnerId: item.communityOwnerId,
//                 utcDate: item.utcDate,
//                 commentCounts: commentCounts,
//                 communityId: item.communityId,
//                 tagPeoples: item.tagPeoples,
//                 sectionOwnerId: sectionOwner?.userObjId || "",
//                 pinPost: item?.pinPost || false,
//                 repostUserId: item?.repostUserId?._id || "",
//                 repostUserFullname: item?.repostUserId?.fullname || "",
//                 repostUsername: item?.repostUserId?.username || "",
//                 repostUserbackgroundImageColour: item?.repostUserId?.backgroundImageColour || "",
//                 repostUserImage: item?.repostUserId?.image || "",
//                 repost: item?.repost || false,

//                 // ✅ Add this
//                 recentComments: recentComments.map(comment => ({
//                     _id: comment._id,
//                     text: comment.comment,
//                     createdAt: comment.createdAt,
//                     user: {
//                         _id: comment.user_Id._id,
//                         username: comment.user_Id.username,
//                         fullname: comment.user_Id.fullname,
//                         image: comment.user_Id.image,
//                         backgroundImageColour : comment.user_Id.backgroundImageColour
//                     }
//                 }))
//             }

//             post.push(obj)
//         }

//         const paginate = (items, page, perPage) => {
//             const offset = perPage * (page - 1)
//             const totalPages = Math.ceil(items.length / perPage)
//             const paginatedItems = items.slice(offset, perPage * page)
//             const current_page = offset / perPage + 1

//             return {
//                 previousPage: page - 1 ? true : false,
//                 nextPage: totalPages > page ? true : false,
//                 totalDocs: items.length,
//                 totalPages: totalPages,
//                 currentPage: current_page,
//                 myPost: paginatedItems
//             }
//         }

//         const dataNew = paginate(post, page, limit)

//         res.send({ status: 1, message: "Section Posts Fetch Successfully", data: dataNew })

//     } catch (error) {
//         console.log("error=>>>", error)
//         return res.send({ status: 0, message: "Something went wrong" })
//     }
// }



// postDetails 
exports.postDetails = async (req, res, next) => {
    try {

        const postId = mongoose.Types.ObjectId(req.body.postId)
        const userId = req.user._id

        if (!postId) {
            return res.send({ status: 0, message: "PostId is require" })
        }
        else {

            // const postDetails = await postData.findOne({ _id: postId })
            const postDetails = await postData.aggregate([

                {
                    $match: {
                        _id: postId
                    }
                },

                {
                    $lookup: {
                        from: "userdatas",
                        localField: "user_Id",
                        foreignField: "_id",
                        as: "user_Id",
                    },
                },
                { $unwind: "$user_Id" },
            ])
            if (!postDetails) {
                return res.send({ status: 0, message: "No post found" })
            }
            else {

                const post = Object.assign({}, ...postDetails)

                const userLikedPostIds = (await like_dislikedatas.find({ user_Id: userId }, { post_Id: 1 })).map(like => like.post_Id);
                console.log("userLikedPostIds", userLikedPostIds)

                const totalLikes = userLikedPostIds.filter(postId => postId.equals(post._id)).length;
                // const likeByMe = userLikedPostIds.includes(post._id);

                const likeByMe = !!await like_dislikedatas.findOne({ post_Id: postId, user_Id: userId });

                const commentCounts = await commentModel.find({ post_Id: postId }).countDocuments()

                const obj = {}
                obj._id = post._id
                obj.post_type = post.post_type
                obj.createPost = post.createPost
                obj.time_line = post.time_line
                obj.createvideo = post.createvideo
                obj.createAudio = post.createAudio
                obj.createText = post.createText
                obj.createGif = post.createGif
                obj.desc = post.desc
                obj.communityId = post.communityId
                obj.userId = post.user_Id._id
                obj.username = post.user_Id.username
                obj.fullname = post.user_Id.fullname
                obj.userImage = post.user_Id.image
                obj.createdAt = post.createdAt
                obj.views = post.views
                obj.createPostFor = post.createPostFor
                obj.cover_image = post.cover_image
                obj.file_name = post.file_name
                obj.total_likes = totalLikes
                obj.likeByMe = likeByMe
                obj.commentCounts = commentCounts
                obj.tagPeoples = post.tagPeoples

                return res.send({ status: 1, message: "Post details fatch successfully", data: obj })
            }

        }
    }
    catch (error) {
        console.log("error", error)
        return res.send({ status: 0, message: "Something went wrong" })

    }
}
