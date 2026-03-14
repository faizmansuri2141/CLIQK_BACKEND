const post_Data = require("../../../models/createPost");
const like_dislikeData = require("../../../models/like_dislike_Schema");
const mongoose = require("mongoose");
const notification = require("../../../models/notifiication_list");
var FCM = require("fcm-node");
var serverKey =
  "AAAANt4MxIg:APA91bEhyj7NfqTyorjAytAunU90vTSBzYgpwnarab4YVOAhiiQbwaqpU34B3sJXDQwEuvVwr_AkahS12nPK4L4YFcZzpVS4DDZTudNAJXVFdF1Jo5ObtZwNNZNreBXkL3kEUESRsx1H";
var fcm = new FCM(serverKey);
const userData = require("../../../models/user");
const postdata = require("../../../models/createPost");
const commentsData = require("../../../models/comments");
const sectionModel = require("../../../models/createcommunity");
const createCliqkData = require("../../../models/createcommunity");
const playerSocialScore = require("../../../models/playerSocialScore");

// Import new social score calculator
const socialScoreCalculator = require("../../../utils/socialScoreCalculator");

const { google } = require("googleapis");
// const admin = require("firebase-admin");
const axios = require("axios");
const dotenv = require("dotenv");
const serviceAccount = require("../../../cliqk-e25f0-firebase-adminsdk-vedtf-7eb62187c9.json");

const csectionSocialSData = require("../../../models/sectionSocialScores"); // Adjust the path as necessary

const sendSectionNotification = require('../../../middleware/ SectionNotifications')

// Function to calculate XP

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      undefined,
      serviceAccount.private_key,
      SCOPES
    );
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err);
        return;
      }
      if (!tokens || !tokens.access_token) {
        reject(new Error("Failed to obtain access token"));
        return;
      }
      resolve(tokens.access_token);
    });
  });
}

// user social score (legacy helper - intentionally disabled)
const userProfileScore = async () => null;

// const userProfileScore = async (userId, scoresData, scoreFor) => {
//   try {
//     if (scoreFor === "post_like") {
//       console.log("scoresData", scoresData);
//       const existingUser = await playerSocialScore.findOne({ userId });
//       const userFind = await userData.findById(userId);

//       if (userFind) {
//         userFind.socialScore += scoresData.score; // Dynamic score update
//         const scperiance = calculateXP(userFind.socialScore);
//         userFind.xp = scperiance.xp;
  

//         await userFind.save();
//       }

//       if (existingUser) {
//         existingUser.scoresData.push(scoresData);
//         await existingUser.save();
//       } else {
//         const newUser = new playerSocialScore({
//           userId,
//           scoresData: [scoresData],
//         });
//         await newUser.save();
//       }
//     } else if (scoreFor === "comment") {
//       const existingUser = await playerSocialScore.findOne({ userId });
//       const userFind = await userData.findById(userId);

//       if (userFind) {
//         userFind.socialScore += scoresData.score; // Dynamic score update
//         const scperiance = calculateXP(userFind.socialScore);
//         userFind.xp = scperiance.xp;
//         await userFind.save();
//       }

//       if (existingUser) {
//         existingUser.scoresData.push(scoresData);
//         await existingUser.save();
//       } else {
//         const newUser = new playerSocialScore({
//           userId,
//           scoresData: [scoresData],
//         });
//         await newUser.save();
//       }
//     } else if (scoreFor === "comment_like") {
//       const existingUser = await playerSocialScore.findOne({ userId });
//       const userFind = await userData.findById(userId);

//       if (userFind) {
//         userFind.socialScore += scoresData.score; // Dynamic score update
//         userFind.xp = calculateXP(userFind.socialScore);
//         await userFind.save();
//       }

//       if (existingUser) {
//         existingUser.scoresData.push(scoresData);
//         await existingUser.save();
//       } else {
//         const newUser = new playerSocialScore({
//           userId,
//           scoresData: [scoresData],
//         });
//         await newUser.save();
//       }
//     } else if (scoreFor === "sub_comment") {
//       const existingUser = await playerSocialScore.findOne({ userId });
//       const userFind = await userData.findById(userId);

//       if (userFind) {
//         userFind.socialScore += scoresData.score; // Dynamic score update
//         // userFind.xp = calculateXP(userFind.socialScore);
//         const scperiance = calculateXP(userFind.socialScore);
//         userFind.xp = scperiance.xp;
//         await userFind.save();
//       }

//       if (existingUser) {
//         existingUser.scoresData.push(scoresData);
//         await existingUser.save();
//       } else {
//         const newUser = new playerSocialScore({
//           userId,
//           scoresData: [scoresData],
//         });
//         await newUser.save();
//       }
//     }
//   } catch (error) {
//     console.error("Error in userProfileScore:", error);
//   }
// };

const sectionSocialScores = async () => null;


  // const sectionSocialScores = async (sectionId, scoresData, scoreFor) => {
  //   try {
  //     if (scoreFor === "post_like") {
  //       const existingSection = await csectionSocialSData.findOne({ sectionId });
  //       const sectionFind = await createCliqkData.findById(sectionId);

  //       if (sectionFind) {
  //         sectionFind.socialScore += scoresData.score; // Dynamic score update
  //         const scperiance = calculateXP(sectionFind.socialScore);
  //         sectionFind.xp = scperiance.xp;
  //         await sectionFind.save();
  //       }

  //       if (existingSection) {
  //         existingSection.scoresData.push(scoresData);
  //         await existingSection.save();
  //       } else {
  //         const newSection = new csectionSocialSData({
  //           sectionId,
  //           scoresData: [scoresData],
  //         });
  //         await newSection.save();
  //       }
  //     } else if (scoreFor === "comment") {
  //       const existingSection = await csectionSocialSData.findOne({ sectionId });
  //       const sectionFind = await createCliqkData.findById(sectionId);

  //       if (sectionFind) {
  //         sectionFind.socialScore += scoresData.score; // Dynamic score update
  //         console.log("ectionFind.socialScore", sectionFind.socialScore);
  //         const scperiance = calculateXP(sectionFind.socialScore);
  //         sectionFind.xp = scperiance.xp;
  //         await sectionFind.save();
  //       }

  //       if (existingSection) {
  //         existingSection.scoresData.push(scoresData);
  //         await existingSection.save();
  //       } else {
  //         const newSection = new csectionSocialSData({
  //           sectionId,
  //           scoresData: [scoresData],
  //         });
  //         await newSection.save();
  //       }
  //     } else if (scoreFor === "comment_like") {
  //       const existingSection = await csectionSocialSData.findOne({ sectionId });
  //       const sectionFind = await createCliqkData.findById(sectionId);

  //       if (sectionFind) {
  //         sectionFind.socialScore += scoresData.score; // Dynamic score update
  //         console.log("ectionFind.socialScore", sectionFind.socialScore);
  //         const scperiance = calculateXP(sectionFind.socialScore);
  //         sectionFind.xp = scperiance.xp;
  //         await sectionFind.save();
  //       }

  //       if (existingSection) {
  //         existingSection.scoresData.push(scoresData);
  //         await existingSection.save();
  //       } else {
  //         const newSection = new csectionSocialSData({
  //           sectionId,
  //           scoresData: [scoresData],
  //         });
  //         await newSection.save();
  //       }
  //     } else if (scoreFor === "sub_comment") {
  //       const existingSection = await csectionSocialSData.findOne({ sectionId });
  //       const sectionFind = await createCliqkData.findById(sectionId);

  //       if (sectionFind) {
  //         sectionFind.socialScore += scoresData.score; // Dynamic score update
  //         console.log("ectionFind.socialScore", sectionFind.socialScore);
  //         const scperiance = calculateXP(sectionFind.socialScore);
  //         sectionFind.xp = scperiance.xp;
  //         await sectionFind.save();
  //       }

  //       if (existingSection) {
  //         existingSection.scoresData.push(scoresData);
  //         await existingSection.save();
  //       } else {
  //         const newSection = new csectionSocialSData({
  //           sectionId,
  //           scoresData: [scoresData],
  //         });
  //         await newSection.save();
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Error in sectionSocialScores:", error);
  //   }
  // };

const calculateXP = () => ({ xp: 1, nextThreshold: 0 });

exports.Like_Dislike = async (req, res, next) => {
  try {
    let userId = req.user._id;
    let postId = req.body.post_Id;
    const username = req.user.username;

    const findPost = await post_Data.findById(postId);
    if (!findPost) {
      return res.send({ status: 0, message: "Post Not Found" });
    }

    const post_user_token = await userData.findById(findPost.user_Id);
    const already_Like = await like_dislikeData.findOne({
      user_Id: userId,
      post_Id: postId,
    });

    let findSectionOwner = findPost.communityId
      ? await sectionModel.findById(findPost.communityId)
      : null;

    if (!already_Like) {
      const likePost = await post_Data.findByIdAndUpdate(
        postId,
        { $push: { post_likes: userId } }, // Removes userId from post_likes array
        { new: true } // Returns the updated document
      );

      const user = await userData.findById(userId);
      user.lastInteraction = new Date();
      await user.save();

      await new like_dislikeData({
        user_Id: userId,
        post_Id: postId,
        is_Like: true,
        post_User_Id: findPost.user_Id,
      }).save();

      updateBadgeCount(post_user_token._id);
      const badgeCount = post_user_token.badgeCount;

      const title = "CLIQK";
      const body = `${username} liked your post`;

      let notification_count = await notification.countDocuments({
        user_id: findPost.user_Id,
        is_Shown: true,
      });
      let count = notification_count > 0 ? notification_count + 1 : 1;

      if (
        post_user_token.device_Token &&
        post_user_token.appNotification &&
        findPost.user_Id.toString() !== req.user._id.toString()
      ) {
        const message = {
          message: {
            token: post_user_token.device_Token,
            notification: { title, body },
            android: { notification: { sound: "default" } },
            apns: { payload: { aps: { sound: "default", badge: count } } },
            data: { badgeCount: badgeCount.toString() },
          },
        };

        const projectId = process.env.PROJECTID;
        if (!projectId) throw new Error("Project ID is not defined.");
        const accessToken = await getAccessToken();
        const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

        try {
          const response = await axios.post(url, message, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });
          console.log("Successfully sent message:", response.data);
        } catch (error) {
          console.error(
            "Error sending message:",
            error.response?.data || error.message
          );
        }

        await new notification({
          community_id: findPost.communityId,
          sender_id: userId,
          user_id: findPost.user_Id,
          notification_message: body,
          notification_type: 2,
          module_id: postId,
          button_show: false,
          module_type: "like_dislike",
        }).save();
      }

      // Update User Social Score & XP using new system
      const isOwnPost = findPost.user_Id.toString() === userId.toString();

      // Only award score when liking someone else's post
      if (!isOwnPost) {
        // Update post owner's social score (when someone likes their post)
        const postOwnerScoreResult = await socialScoreCalculator.updateUserSocialScore(
          findPost.user_Id,
          'LIKES_ON_YOUR_POST'
        );
        console.log("Post owner social score updated:", postOwnerScoreResult);

        // Update liker's social score
        const likerScoreResult = await socialScoreCalculator.updateUserSocialScore(
          userId,
          'LIKES_YOU_GIVE'
        );
        console.log("Liker social score updated:", likerScoreResult);

        // Update section social score
        if (findSectionOwner) {
          const sectionScoreResult = await socialScoreCalculator.updateSectionSocialScore(
            findPost.communityId.toString(),
            'LIKES_ON_POSTS'
          );
          console.log("Section social score updated:", sectionScoreResult);
        }
      }

      return res.send({ status: 1, message: "Post Liked Successfully" });
    }

    // If already liked, remove the like (Dislike case)
    await like_dislikeData.findByIdAndDelete(already_Like._id);
    const disLikePost = await post_Data.findByIdAndUpdate(
      postId,
      { $pull: { post_likes: userId } }, // Removes userId from post_likes array
      { new: true } // Returns the updated document
    );

    await notification.findOneAndDelete({
      sender_id: userId,
      module_id: postId,
    });

    return res.send({ status: 1, message: "Post Disliked Successfully" });
  } catch (error) {
    console.log(error);
    return res.send({ status: 0, message: error.message });
  }
};

// get like
exports.get_Like = async (req, res, next) => {
  try {
    const post_Id = mongoose.Types.ObjectId(req.body.post_Id);

    console.log(typeof post_Id);

    const get_like = await like_dislikeData.aggregate([
      {
        $match: { post_Id: post_Id, is_Like: true },
      },

      {
        $lookup: {
          from: "userdatas",
          localField: "user_Id",
          foreignField: "_id",
          as: "Likes",
        },
      },

      { $unwind: "$Likes" },
      {
        $project: {
          post_Id: 1,
          post_Id: 1,
          is_Like: 1,
          "Likes.fullname": 1,
          "Likes.username": 1,
          "Likes.image": 1,
          "Likes.backgroundImage": 1,
        },
      },
    ]);

    // const get_Like = await like_dislikeData.findOne({ post_Id: post_Id, is_Like: true })
    res.send({
      data: get_like,
      status: 1,
      message: "Get Like List Successfully ",
    });
  } catch (error) {
    res.send({
      Data: [],
      status: 0,
      message: "Can Not Get Like Data Successfuly",
    });
    console.log(error);
  }
};

// comments
exports.is_comment = async (req, res, next) => {
  const current_user = req.user._id;
  const username = req.user.username;
  const post_Id = req.body.post_Id;

  try {
    if (!post_Id) {
      return res.send({ status: 0, message: "PostId is required" });
    }

    const postFind = await post_Data.findOne({ _id: post_Id });
    if (!postFind) {
      return res.send({ status: 0, message: "No post found" });
    }

    const user_deviceid = await userData.findById(req.body.post_User_Id);

    const comment = new commentsData({
      user_Id: current_user,
      post_Id: post_Id,
      post_User_Id: req.body.post_User_Id,
      is_comment: req.body.is_comment,
      post_type: req.body.post_type,
    });

    await comment.save();
    updateBadgeCount(user_deviceid._id);
    
    // Update social scores for commenting
    try {
      let isMember = false;
      let isFollower = false;

      if (postFind.communityId) {
        const section = await sectionModel.findById(postFind.communityId);
        if (section) {
          isMember = Array.isArray(section.community_Members)
            ? section.community_Members.some((id) => id.toString() === current_user.toString())
            : false;
          isFollower = Array.isArray(section.followersList)
            ? section.followersList.some((id) => id.toString() === current_user.toString())
            : false;
        }
      }

      // Update commenter's social score
      const commenterScoreResult = await socialScoreCalculator.updateUserSocialScore(
        current_user, 
        'REPLIES_YOU_MAKE_ON_OTHERS',
        { isMember, isFollower }
      );
      console.log("Commenter social score updated:", commenterScoreResult);
      
      // Update post owner's social score for getting comment
      if (postFind.user_Id && postFind.user_Id.toString() !== current_user.toString()) {
        const postOwnerScoreResult = await socialScoreCalculator.updateUserSocialScore(
          postFind.user_Id,
          'OUTSIDER_COMMENTS_ON_POST'
        );
        console.log("Post owner social score updated:", postOwnerScoreResult);
      }
      
      // Update section social score if post has community
      if (postFind.communityId) {
        const sectionScoreResult = await socialScoreCalculator.updateSectionSocialScore(
          postFind.communityId.toString(),
          'COMMENTS_MADE_INSIDE_SECTION'
        );
        console.log("Section social score updated for comment:", sectionScoreResult);
      }
    } catch (error) {
      console.error("Error updating social scores for comment:", error);
    }

    const badgeCount = user_deviceid.badgeCount;

    const projectId = process.env.PROJECTID;
    if (!projectId) {
      throw new Error("Project ID is not defined.");
    }

    const accessToken = await getAccessToken();

    const title = "CLIQK";
    const body = `${username} commented on your post`;

    let count = 1;
    var notification_count = await notification.countDocuments({
      user_id: req.body.post_User_Id,
      is_Shown: true,
    });
    if (notification_count > 0) {
      console.log("andarvaka", notification_count);
      count = notification_count + 1;
    }

    const message = {
      message: {
        token: user_deviceid.device_Token,
        notification: {
          title: title,
          body: body,
        },
        android: {
          // priority: "high",
          notification: {
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: count,
            },
          },
        },
        data: {
          badgeCount: badgeCount.toString(),
        },
      },
    };

    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    if (
      postFind.user_Id.toString() !== current_user.toString() &&
      user_deviceid &&
      user_deviceid.appNotification
    ) {
      // Send FCM notification
      try {
        const response = await axios.post(url, message, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        console.log("Successfully sent message:", response.data);
      } catch (error) {
        console.error("Error sending message:", {
          // status: error.response?.status,
          // statusText: error.response?.statusText,
          // data: error.response?.data,
          // message: error.message,
        });
      }
    }
    // Save notification in database even if FCM notification is not sent
    const send_notification = new notification({
      community_id: postFind.communityId,
      sender_id: current_user,
      user_id: req.body.post_User_Id,
      notification_message: `${username} commented on your post`,
      notification_type: 3,
      module_id: post_Id,
      module_type: "comments",
    });
    await send_notification.save();

    return res.send({ status: 1, message: "Comment successfully posted" });
  } catch (error) {
    res.send({ status: 0, message: error.message });
  }
};

// comment_list
exports.comment_list = async (req, res, next) => {
  const post_Id = mongoose.Types.ObjectId(req.body.post_Id);
  const user_Id = req.user._id;
  console.log("post_Id=>>", post_Id, "user_Id=>", user_Id);
  try {
    const comment_list = await commentsData.aggregate([
      {
        $match: { post_Id: post_Id },
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

      {
        $project: {
          "user_Id._id": 1,
          "user_Id.image": 1,
          "user_Id.username": 1,
          is_comment: 1,
          post_type: 1,
          createdAt: 1,
        },
      },
    ]);
    res.send({
      Data: comment_list,
      status: 1,
      message: "comment list fatch sueessfully",
    });
  } catch (error) {
    res.send({ status: 0, message: "comment list can not fatch sueessfully" });

    console.log(error);
  }
};

// is_shown
exports.is_showen = async (req, res, next) => {
  try {
    const _id = req.body._id;
    const is_showen = await notification.findByIdAndUpdate(
      { _id: _id },
      { button_show: false }
    );
    res.send({ status: 1, message: "Is Showen Button Updated Successfully " });
  } catch (error) {
    console.log("error=>>", error);
    res.send({ status: 0, message: error.message });
  }
};

// delete comments
exports.deleteComments = async (req, res, next) => {
  try {
    const postId = req.body.postId;
    const commentId = req.body.commentId;
    const postFind = await postdata.findOne({ _id: postId });

    if (postFind === null) {
      return res.send({ status: 0, message: "Post not found" });
    }

    const deleteComment = await commentsData.findByIdAndRemove({
      _id: commentId,
    });
    return res.send({ status: 1, message: "Comment deleted successfully" });
  } catch (error) {
    console.log("error=>>", error);
    res.send({ status: 0, message: "Something went wrong" });
  }
};

async function updateBadgeCount(userId) {
  // Increment badge count by 1 for the user
  await userData.updateOne({ _id: userId }, { $inc: { badgeCount: 1 } });
}

// *********************************************************NEW APIS ***************************************************************
// exports.new_add_comment = async (req, res) => {
//     try {
//         const { post_Id, text, post_User_Id, tagPeoples } = req.body;
//         const { user } = req;
//         const user_id = user._id;
//         const username = user.username;

//         if (!post_Id || !text) {
//             return res.send({ status: 0, message: "All inputs are required." });
//         }

//         const postFind = await post_Data.findOne({ _id: post_Id });
//         if (!postFind) {
//             return res.send({ status: 0, message: "No post found" });
//         }

//         // Validate and filter tagPeoples
//         const validTagPeoples = tagPeoples && Array.isArray(tagPeoples)
//             ? Array.from(new Set(tagPeoples.map(tag => tag.user_id)))
//                 .map(id => tagPeoples.find(tag => tag.user_id === id))
//             : [];

//         // Create and save comment
//         const commenter = await userData.findOne({ _id: user_id }, { _id: 1, username: 1, image: 1 });
//         const add_comment = new commentsData({
//             commentdetails: commenter,
//             is_comment: text,
//             user_Id: user_id,
//             post_Id: post_Id,
//             post_User_Id: post_User_Id,
//             post_type: req.body.post_type,
//             text: text,
//             tagPeoples: validTagPeoples,
//         });
//         const result = await add_comment.save();

//         if(result){
//             const senderId = req.user._id
//             const reciverId = postFind.user_Id
//             newCommentNotification(username,senderId,reciverId ,post_Id)
//         }

//         // Extract tagged usernames
//         const taggedUsernames = text.match(/@(\w+)/g)?.map(tag => tag.slice(1)) || [];

//         // Notify tagged users
//         const taggedUsers = await userData.find({
//             $or: [
//                 { username: { $in: taggedUsernames } },
//                 { _id: { $in: validTagPeoples.map(tag => tag.user_id) } }
//             ]
//         }, { _id: 1, device_Token: 1 });

//         for (const taggedUser of taggedUsers) {

//                 // Firebase Project ID
//         const projectId = process.env.PROJECTID;
//         if (!projectId) {
//             throw new Error("Project ID is not defined.");
//         }

//            // Fetch Firebase Access Token
//            const accessToken = await getAccessToken();
//            const title = "CLIQK";
//            const body = `${username} mentioned you in a comment: "${text}"`;
//             // const message = {
//             //     to: taggedUser.device_Token,
//             //     priority: "high",
//             //     notification: {
//             //         title: 'Mentions',
//             //         body: `${username} mentioned you in a comment: "${text}"`,
//             //     },
//             // };

//             let notificationCount = await notification.countDocuments({ user_id: userId, is_Shown: true });
//             notificationCount = notificationCount > 0 ? notificationCount + 1 : 1;

//             const message = {
//                 message: {
//                     token: taggedUser.device_Token,
//                     notification: {
//                         title: title,
//                         body: body,
//                     },
//                     android: {
//                         notification: {
//                             sound: "default",
//                         },
//                     },
//                     apns: {
//                         payload: {
//                             aps: {
//                                 sound: "default",
//                                 badge: notificationCount,
//                             },
//                         },
//                     },
//                     data: {
//                         badgeCount: notificationCount.toString(),
//                     },
//                 },
//             };

//             // fcm.send(message, async (err, response) => {
//             //     if (err) {
//             //         console.error("Error sending notification to tagged user:", taggedUser.username, err);
//             //     } else {
//             //         console.log("Tagged user notification sent:", response);
//             //     }
//             // });

//             const taggedNotification = new notification({
//                 sender_id: user_id,
//                 user_id: taggedUser._id,
//                 notification_message: message.notification.body,
//                 notification_type: 4,
//                 module_id: post_Id,
//                 module_type: "mentions",
//             });
//             await taggedNotification.save();
//         }

//         return res.send({ status: 1, message: "Comment added successfully.", data: result });
//     } catch (error) {
//         console.error("Error adding comment:", error);
//         return res.send({ status: 0, message: "Something went wrong." });
//     }
// };

// exports.new_add_comment = async (req, res) => {
//   try {
//     const { post_Id, text, post_User_Id, tagPeoples } = req.body;

//     // const { user } = req;
//     // const user_id = user._id;
//     const user_id = req.user._id;
//     const username = req.user.username;
//     // const username = user.username;

//     if (!post_Id || !text) {
//       return res.send({ status: 0, message: "All inputs are required." });
//     }

//     const postFind = await post_Data.findById(post_Id);
//     if (!postFind) {
//       return res.send({ status: 0, message: "No post found" });
//     }

//     let sectionOwner = await sectionModel.findOne({
//       _id: postFind.communityId,
//     });

//     if (sectionOwner) {
//       sectionOwner.lastInteraction = new Date();
//       await sectionOwner.save();
//     }

//     const validTagPeoples =
//       tagPeoples && Array.isArray(tagPeoples)
//         ? [...new Map(tagPeoples.map((tag) => [tag.user_id, tag])).values()]
//         : [];

//     const commenter = await userData.findOne(
//       { _id: user_id },
//       { id: 1, username: 1, image: 1 }
//     );

//     const add_comment = new commentsData({
//       commentdetails: commenter,
//       is_comment: text,
//       user_Id: user_id,
//       post_Id,
//       post_User_Id,
//       post_type: req.body.post_type,
//       text,
//       tagPeoples: validTagPeoples,
//     });

//     const result = await add_comment.save();

//     if (result) {
//       // Update social scores for new comment
//       try {
//         let isMember = false;
//         let isFollower = false;

//         if (postFind.communityId) {
//           const section = await sectionModel.findById(postFind.communityId);
//           if (section) {
//             isMember = Array.isArray(section.community_Members)
//               ? section.community_Members.some((id) => id.toString() === user_id.toString())
//               : false;
//             isFollower = Array.isArray(section.followersList)
//               ? section.followersList.some((id) => id.toString() === user_id.toString())
//               : false;
//           }
//         }

//         // Update commenter's social score
//         const commenterScoreResult = await socialScoreCalculator.updateUserSocialScore(
//           user_id, 
//           'REPLIES_YOU_MAKE_ON_OTHERS',
//           { isMember, isFollower }
//         );
//         console.log("Commenter social score updated:", commenterScoreResult);
        
//         // Update post owner's social score for getting comment
//         if (postFind.user_Id && postFind.user_Id.toString() !== user_id.toString()) {
//           const postOwnerScoreResult = await socialScoreCalculator.updateUserSocialScore(
//             postFind.user_Id,
//             'OUTSIDER_COMMENTS_ON_POST'
//           );
//           console.log("Post owner social score updated:", postOwnerScoreResult);
//         }
        
//         // Update section social score if post has community
//         if (postFind.communityId) {
//           const sectionScoreResult = await socialScoreCalculator.updateSectionSocialScore(
//             postFind.communityId.toString(),
//             'COMMENTS_MADE_INSIDE_SECTION'
//           );
//           console.log("Section social score updated for comment:", sectionScoreResult);
//         }
//       } catch (error) {
//         console.error("Error updating social scores for comment:", error);
//       }
      
//       newCommentNotification(username, user_id, postFind.user_Id, post_Id);
//     }

//     const taggedUsernames =
//       text.match(/@(\w+)/g)?.map((tag) => tag.slice(1)) || [];

//     const taggedUsers = await userData.find(
//       {
//         $or: [
//           { username: { $in: taggedUsernames } },
//           { _id: { $in: validTagPeoples.map((tag) => tag.user_id) } },
//         ],
//       },
//       { _id: 1, device_Token: 1 }
//     );

//     const projectId = process.env.PROJECTID;
//     if (!projectId) {
//       throw new Error("Project ID is not defined.");
//     }

//     const accessToken = await getAccessToken();

//     for (const taggedUser of taggedUsers) {
//       if (!taggedUser.device_Token) continue;

//       const body = `${username} mentioned you in a comment: "${text}"`;

//       let notificationCount = await notification.countDocuments({
//         user_id: taggedUser._id,
//         is_Shown: true,
//       });
//       notificationCount = notificationCount > 0 ? notificationCount + 1 : 1;

//       const message = {
//         message: {
//           token: taggedUser.device_Token,
//           notification: {
//             title: "CLIQK",
//             body: body,
//           },
//           android: {
//             notification: {
//               sound: "default",
//             },
//           },
//           apns: {
//             payload: {
//               aps: {
//                 sound: "default",
//                 badge: notificationCount,
//               },
//             },
//           },
//           data: {
//             badgeCount: notificationCount.toString(),
//           },
//         },
//       };

//       const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

//       try {
//         const response = await axios.post(url, message, {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//           },
//         });
//         console.log("Successfully sent notification:", response.data);
//       } catch (error) {
//         console.error("Error sending notification:", error);
//       }

//       const taggedNotification = new notification({
//         community_id: postFind.communityId,
//         sender_id: user_id,
//         user_id: taggedUser._id,
//         notification_message: body,
//         notification_type: 4,
//         module_id: post_Id,
//         module_type: "mentions",
//       });

//       await taggedNotification.save();
//     }

//     const user = await userData.findById(user_id);
//     user.lastInteraction = new Date();
//     await user.save();

//     return res.send({
//       status: 1,
//       message: "Comment added successfully.",
//       data: result,
//     });
//   } catch (error) {
//     console.error("Error adding comment:", error);
//     return res.send({ status: 0, message: "Something went wrong." });
//   }
// };

exports.new_add_comment = async (req, res) => {
  try {
    const { post_Id, text, post_User_Id, tagPeoples } = req.body;

    const user_id = req.user._id;
    const username = req.user.username;

    if (!post_Id || !text) {
      return res.send({ status: 0, message: "All inputs are required." });
    }

    const postFind = await post_Data.findById(post_Id);
    if (!postFind) {
      return res.send({ status: 0, message: "No post found" });
    }

    let sectionOwner = await sectionModel.findOne({
      _id: postFind.communityId,
    });

    if (sectionOwner) {
      sectionOwner.lastInteraction = new Date();
      await sectionOwner.save();
    }

    const validTagPeoples =
      tagPeoples && Array.isArray(tagPeoples)
        ? [...new Map(tagPeoples.map((tag) => [tag.user_id, tag])).values()]
        : [];

    const commenter = await userData.findOne(
      { _id: user_id },
      { id: 1, username: 1, image: 1 }
    );

    const add_comment = new commentsData({
      commentdetails: commenter,
      is_comment: text,
      user_Id: user_id,
      post_Id,
      post_User_Id,
      post_type: req.body.post_type,
      text,
      tagPeoples: validTagPeoples,
    });

    const result = await add_comment.save();

    if (result) {
      // Update social scores for new comment
      try {
        let isMember = false;
        let isFollower = false;

        if (postFind.communityId) {
          const section = await sectionModel.findById(postFind.communityId);
          if (section) {
            isMember = Array.isArray(section.community_Members)
              ? section.community_Members.some((id) => id.toString() === user_id.toString())
              : false;
            isFollower = Array.isArray(section.followersList)
              ? section.followersList.some((id) => id.toString() === user_id.toString())
              : false;
          }
        }

        // Update commenter's social score
        const commenterScoreResult = await socialScoreCalculator.updateUserSocialScore(
          user_id, 
          'REPLIES_YOU_MAKE_ON_OTHERS',
          { isMember, isFollower }
        );
        console.log("Commenter social score updated:", commenterScoreResult);
        
        // Update post owner's social score for getting comment
        if (postFind.user_Id && postFind.user_Id.toString() !== user_id.toString()) {
          const postOwnerScoreResult = await socialScoreCalculator.updateUserSocialScore(
            postFind.user_Id,
            'OUTSIDER_COMMENTS_ON_POST'
          );
          console.log("Post owner social score updated:", postOwnerScoreResult);
        }
        
        // Update section social score if post has community
        if (postFind.communityId) {
          const sectionScoreResult = await socialScoreCalculator.updateSectionSocialScore(
            postFind.communityId.toString(),
            'COMMENTS_MADE_INSIDE_SECTION'
          );
          console.log("Section social score updated for comment:", sectionScoreResult);
        }
      } catch (error) {
        console.error("Error updating social scores for comment:", error);
      }
      
      // ✅ Call notification for original author
      newCommentNotification(username, user_id, postFind.user_Id, post_Id);
    }

    // Handle tagged users notifications
    const taggedUsernames =
      text.match(/@(\w+)/g)?.map((tag) => tag.slice(1)) || [];

    const taggedUsers = await userData.find(
      {
        $or: [
          { username: { $in: taggedUsernames } },
          { _id: { $in: validTagPeoples.map((tag) => tag.user_id) } },
        ],
      },
      { _id: 1, device_Token: 1 }
    );

    const projectId = process.env.PROJECTID;
    if (!projectId) {
      throw new Error("Project ID is not defined.");
    }

    const accessToken = await getAccessToken();

    for (const taggedUser of taggedUsers) {
      if (!taggedUser.device_Token) continue;

      const body = `${username} mentioned you in a comment: "${text}"`;

      let notificationCount = await notification.countDocuments({
        user_id: taggedUser._id,
        is_Shown: true,
      });
      notificationCount = notificationCount > 0 ? notificationCount + 1 : 1;

      const message = {
        message: {
          token: taggedUser.device_Token,
          notification: {
            title: "CLIQK",
            body: body,
          },
          android: {
            notification: {
              sound: "default",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: notificationCount,
              },
            },
          },
          data: {
            badgeCount: notificationCount.toString(),
          },
        },
      };

      const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

      try {
        const response = await axios.post(url, message, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        console.log("Successfully sent notification:", response.data);
      } catch (error) {
        console.error("Error sending notification:", error);
      }

      const taggedNotification = new notification({
        community_id: postFind.communityId,
        sender_id: user_id,
        user_id: taggedUser._id,
        notification_message: body,
        notification_type: 4,
        module_id: post_Id,
        module_type: "mentions",
      });

      await taggedNotification.save();
    }

    const user = await userData.findById(user_id);
    if (user) {
      user.lastInteraction = new Date();
      await user.save();
    }

    return res.send({
      status: 1,
      message: "Comment added successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.send({ status: 0, message: "Something went wrong." });
  }
};

exports.update_comment = async (req, res) => {
  try {
    const { commentId, text, tagPeoples } = req.body;
    const user_id = req.user._id;
    const username = req.user.username;

    if (!commentId || !text) {
      return res.send({ status: 0, message: "All inputs are required." });
    }

    const comment = await commentsData.findOne({
      _id: commentId,
      user_Id: user_id,
    });
    if (!comment) {
      return res.send({
        status: 0,
        message: "Comment not found or not authorized.",
      });
    }

    const post = await post_Data.findById(comment.post_Id);
    if (!post) {
      return res.send({ status: 0, message: "Post not found." });
    }

    const ssectionFind = await sectionModel.findOne({
      _id: post.communityId,
    });

    ssectionFind.lastInteraction = new Date();
    await ssectionFind.save();   

    // Prepare updated tagPeoples (remove duplicates)
    const validTagPeoples =
      tagPeoples && Array.isArray(tagPeoples)
        ? [...new Map(tagPeoples.map((tag) => [tag.user_id, tag])).values()]
        : [];

    // Update fields
    comment.text = text;
    comment.is_comment = text;
    comment.tagPeoples = validTagPeoples;

    // Optionally refresh commenter's basic info (username/image)
    const commenter = await userData.findOne(
      { _id: user_id },
      { username: 1, image: 1 }
    );
    if (commenter) {
      comment.commentdetails = {
        id: commenter._id,
        username: commenter.username,
        image: commenter.image,
      };
    }

    await comment.save();

    // Send notifications for new mentions
    const taggedUsernames =
      text.match(/@(\w+)/g)?.map((tag) => tag.slice(1)) || [];

    const taggedUsers = await userData.find(
      {
        $or: [
          { username: { $in: taggedUsernames } },
          { _id: { $in: validTagPeoples.map((tag) => tag.user_id) } },
        ],
      },
      { _id: 1, device_Token: 1 }
    );

    const projectId = process.env.PROJECTID;
    const accessToken = await getAccessToken();

    for (const taggedUser of taggedUsers) {
      if (!taggedUser.device_Token) continue;

      const body = `${username} mentioned you in an updated comment: "${text}"`;

      let notificationCount = await notification.countDocuments({
        user_id: taggedUser._id,
        is_Shown: true,
      });
      notificationCount = notificationCount > 0 ? notificationCount + 1 : 1;

      const message = {
        message: {
          token: taggedUser.device_Token,
          notification: {
            title: "CLIQK",
            body: body,
          },
          android: { notification: { sound: "default" } },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: notificationCount,
              },
            },
          },
          data: { badgeCount: notificationCount.toString() },
        },
      };

      const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

      try {
        await axios.post(url, message, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error(
          "Notification error:",
          error?.response?.data || error.message
        );
      }

      const mentionNotification = new notification({
        community_id: post.communityId,
        sender_id: user_id,
        user_id: taggedUser._id,
        notification_message: body,
        notification_type: 4,
        module_id: comment.post_Id,
        module_type: "mentions",
      });

      await mentionNotification.save();
    }

    const user = await userData.findById(user_id);
user.lastInteraction = new Date();
await user.save();


    return res.send({
      status: 1,
      message: "Comment updated successfully.",
      data: comment,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return res.send({ status: 0, message: "Something went wrong." });
  }
};

exports.new_comment_like = async (req, res) => {
  try {
    const { user } = req;
    const user_id = user._id;
    const { post_Id, comment_id } = req.body;

    // Validate input
    if (!post_Id || !comment_id) {
      return res
        .status(400)
        .json({ status: 0, message: "Please provide all the details" });
    }

    const post = await post_Data.findOne({ _id: post_Id });
    if (!post) {
      return res.send({ status: 0, message: "Post not found." });
    }

    const sectionId = post.communityId;

    const ssectionFind = await sectionModel.findOne({
      _id: sectionId,
    });

    if (ssectionFind) {
      ssectionFind.lastInteraction = new Date();
      await ssectionFind.save();
    }

    // Find if the comment is already liked by the user
    const findComment = await commentsData.findOne({
      _id: comment_id,
      "commentlikerDetails.userId": user_id,
    });

    if (!findComment) {
      // 🔹 NOT LIKED YET - ADD LIKE
      await commentsData.findOneAndUpdate(
        { post_Id: post_Id, _id: comment_id },
        { $push: { commentlikerDetails: { userId: user_id } } }
      );

      const updatedComment = await commentsData.findOneAndUpdate(
        { post_Id: post_Id, _id: comment_id },
        { $inc: { totallikesofcomments: 1 } },
        { new: true }
      );

      if (updatedComment) {
        // ✅ SEND REACTION NOTIFICATION TO COMMENT AUTHOR
        // Skip if user is liking their own comment
        if (updatedComment.user_Id && updatedComment.user_Id.toString() !== user_id.toString()) {
          await reactionToMessageNotification(
            user_id,                    // who reacted (liker)
            updatedComment.user_Id,     // comment author
            comment_id,                 // comment/message id
            post.communityId || sectionId, // section/community id
            post_Id                     // post id
          );
        }

        // Update social scores using new system
        try {
          const commentOwner = await commentsData.findById(comment_id);

          // Update liker's social score only when reacting to someone else's comment
          if (commentOwner && commentOwner.user_Id && commentOwner.user_Id.toString() !== user_id.toString()) {
            const likerScoreResult = await socialScoreCalculator.updateUserSocialScore(
              user_id,
              'LIKES_YOU_GIVE'
            );
            console.log("Comment liker social score updated:", likerScoreResult);

            // Update comment owner's social score for getting reaction
            const commentOwnerScoreResult = await socialScoreCalculator.updateUserSocialScore(
              commentOwner.user_Id,
              'REACTIONS_ON_CHAT_MESSAGES'
            );
            console.log("Comment owner social score updated:", commentOwnerScoreResult);
          }
          
          // Update section social score if post has community
          if (post.communityId) {
            const sectionScoreResult = await socialScoreCalculator.updateSectionSocialScore(
              post.communityId.toString(),
              'REACTIONS_ON_CHAT_MESSAGES_IN_SECTION'
            );
            console.log("Section social score updated for comment like:", sectionScoreResult);
          }
        } catch (error) {
          console.error("Error updating social scores for comment like:", error);
        }
      }

      const users = await userData.findById(user_id);
      users.lastInteraction = new Date();
      await users.save();

      return res.status(200).json({
        status: 1,
        message: "Liked comment.",
        data: {
          totalLikes: updatedComment ? updatedComment.totallikesofcomments : 0,
        },
      });
    } else {
      // 🔹 ALREADY LIKED - REMOVE LIKE
      await commentsData.findOneAndUpdate(
        { post_Id: post_Id, _id: comment_id },
        { $pull: { commentlikerDetails: { userId: user_id } } }
      );

      const updatedComment = await commentsData.findOneAndUpdate(
        { post_Id: post_Id, _id: comment_id },
        { $inc: { totallikesofcomments: -1 } },
        { new: true }
      );

      // NOTE: No social score update on unlike (calculator only supports additive updates)

      const users = await userData.findById(user_id);
      users.lastInteraction = new Date();
      await users.save();

      return res.status(200).json({
        status: 1,
        message: "Disliked comment.",
        data: {
          totalLikes: updatedComment ? updatedComment.totallikesofcomments : 0,
        },
      });
    }
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      status: 0,
      message: "An error occurred while liking/disliking the comment.",
    });
  }
};


// 🔹 REACTION TO MESSAGE NOTIFICATION
const reactionToMessageNotification = async (
  reactorId,      // who reacted (liked)
  authorId,       // message/comment author
  messageId,      // comment/message id
  sectionId,      // section/community id
  postId          // post id
) => {
  try {
    // Fetch reactor (liker) details
    const reactor = await userData
      .findById(reactorId)
      .select("username device_Token appNotification");
    if (!reactor) {
      console.error("Reactor (liker) not found");
      return;
    }

    const reactorName = reactor.username || "User";

    // Fetch author details
    const author = await userData
      .findById(authorId)
      .select("device_Token appNotification");
    if (!author) {
      console.error("Message author not found");
      return;
    }

    // Fetch section/community details to get section name
    let sectionName = "Section";
    if (sectionId) {
      try {
        const section = await createCliqkData.findById(sectionId);
        if (section && section.communityName) {
          sectionName = section.communityName;
        }
      } catch (err) {
        console.error("Error fetching section details:", err);
      }
    }

    console.log(`Sending reaction notification: ${reactorName} liked ${authorId}'s message`);

    // Firebase Project ID
    const projectId = process.env.PROJECTID;
    if (!projectId) {
      throw new Error("Project ID is not defined.");
    }

    // Fetch Firebase Access Token
    const accessToken = await getAccessToken();
    const title = "CLIQK";
    
    // Format: (Section Name) · User Name reacted to your message
    const body = `(${sectionName}) · ${reactorName} reacted to your message`;

    // Count unread notifications for author
    let notificationCount = await notification.countDocuments({
      user_id: authorId,
      is_Shown: true,
    });
    notificationCount = notificationCount > 0 ? notificationCount + 1 : 1;

    // Save notification to database
    const reactionNotification = new notification({
      community_id: sectionId,
      sender_id: reactorId,
      user_id: authorId,
      notification_message: body,
      notification_type: 21, // REACTION_TO_MESSAGE type
      module_id: messageId,
      module_type: "reaction_to_message",
      related_post_id: postId,
      is_personal: true,
    });

    await reactionNotification.save();

    // Skip FCM if author doesn't have device token
    if (!author.device_Token) {
      console.log("Author has no device token");
      return;
    }

    // Skip if author has disabled app notifications
    if (author.appNotification === false) {
      console.log("App notifications disabled for author");
      return;
    }

    // Construct FCM message payload
    const message = {
      message: {
        token: author.device_Token,
        notification: {
          title: title,
          body: body,
        },
        android: {
          notification: {
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: notificationCount,
            },
          },
        },
        data: {
          badgeCount: notificationCount.toString(),
          notification_type: "21", // REACTION_TO_MESSAGE
          section_id: sectionId ? sectionId.toString() : "",
          message_id: messageId.toString(),
          post_id: postId ? postId.toString() : "",
          sender_name: reactorName,
          section_name: sectionName,
          is_reaction: "true",
          reaction_type: "like"
        },
      },
    };

    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // Send FCM notification
    const response = await axios.post(url, message, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 5000
    });
    
    console.log("Successfully sent reaction notification to author");

  } catch (error) {
    console.error("Error in reactionToMessageNotification:", error);
  }
};

exports.new_add_sub_comment = async (req, res) => {
  try {
    const { user } = req;
    const userId = user._id;
    const username = user.username;
    const { commentId, content, tagPeoples } = req.body;

    if (!commentId || !content) {
      return res
        .status(400)
        .send({ status: 0, message: "All fields are required" });
    }

    const userFind = await userData.findOne({ _id: userId });
    if (!userFind) {
      return res.status(400).send({ status: 0, message: "User not found" });
    }

    const findComment = await commentsData.findOne({ _id: commentId });
    if (!findComment) {
      return res.status(400).send({ status: 0, message: "Comment not found" });
    }

    const postFind = await post_Data.findOne({ _id: findComment.post_Id });
    if (!postFind) {
      return res.status(400).send({ status: 0, message: "Post not found" });
    }

    // Validate and filter tagPeoples
    const validTagPeoples =
      tagPeoples && Array.isArray(tagPeoples)
        ? [...new Map(tagPeoples.map((tag) => [tag.user_id, tag])).values()]
        : [];

    // Add sub-comment
    const addingSubComment = await commentsData.findByIdAndUpdate(
      commentId,
      {
        $push: {
          subComments: {
            userId,
            content,
            createdAt: new Date(),
            tagPeoples: validTagPeoples,
          },
        },
      },
      { new: true }
    );

    // Increase reply count
    if (addingSubComment) {
      const finalCount = (findComment.totalCommentsReply || 0) + 1;
      await commentsData.findByIdAndUpdate(commentId, {
        totalCommentsReply: finalCount,
      });
    }

    // Update social scores using new system
    try {
      let isMember = false;
      let isFollower = false;

      if (postFind.communityId) {
        const section = await sectionModel.findById(postFind.communityId);
        if (section) {
          isMember = Array.isArray(section.community_Members)
            ? section.community_Members.some((id) => id.toString() === userId.toString())
            : false;
          isFollower = Array.isArray(section.followersList)
            ? section.followersList.some((id) => id.toString() === userId.toString())
            : false;
        }
      }

      // Update sub-commenter's social score
      const subCommenterScoreResult = await socialScoreCalculator.updateUserSocialScore(
        userId, 
        'REPLIES_YOU_MAKE_ON_OTHERS',
        { isMember, isFollower }
      );
      console.log("Sub-commenter social score updated:", subCommenterScoreResult);
      
      // Update original comment owner's social score for getting reply
      if (findComment.user_Id && findComment.user_Id.toString() !== userId.toString()) {
        const commentOwnerScoreResult = await socialScoreCalculator.updateUserSocialScore(
          findComment.user_Id,
          'REPLIES_TO_YOUR_POST'
        );
        console.log("Comment owner social score updated:", commentOwnerScoreResult);
      }
      
      // Update section social score if post has community
      if (postFind.communityId) {
        const sectionScoreResult = await socialScoreCalculator.updateSectionSocialScore(
          postFind.communityId.toString(),
          'COMMENTS_MADE_INSIDE_SECTION'
        );
        console.log("Section social score updated for sub-comment:", sectionScoreResult);
      }
    } catch (error) {
      console.error("Error updating social scores for sub-comment:", error);
    }

    // Send Notifications
    await sendSubCommentNotification(
      userId,
      findComment.user_Id,
      username,
      postFind._id,
      content
    );

    if (validTagPeoples.length > 0) {
      const sectionId = postFind.communityId;
      await tagPostPeoplesNotification(
        userId,
        validTagPeoples,
        postFind._id,
        sectionId
      );
    }

    const users = await userData.findById(userId);
    users.lastInteraction = new Date();
    await users.save();

    return res.send({ status: 1, message: "Sub-comment added successfully." });
  } catch (error) {
    console.error("Error adding sub-comment:", error);
    return res
      .status(500)
      .send({ status: 0, message: "Internal Server Error" });
  }
};

exports.update_sub_comment = async (req, res) => {
  try {
    const { user } = req;
    const userId = user._id;
    const { commentId, subCommentId, newContent, tagPeoples } = req.body;

    // Validation
    if (!commentId || !subCommentId || !newContent) {
      return res
        .status(400)
        .send({ status: 0, message: "All fields are required." });
    }

    // Fetch comment document
    const comment = await commentsData.findById(commentId);
    if (!comment) {
      return res.status(404).send({ status: 0, message: "Comment not found." });
    }

    // Find the sub-comment index
    const subCommentIndex = comment.subComments.findIndex(
      (sub) =>
        sub._id.toString() === subCommentId &&
        sub.userId.toString() === userId.toString()
    );

    if (subCommentIndex === -1) {
      return res.status(403).send({
        status: 0,
        message: "Sub-comment not found or access denied.",
      });
    }

    // Filter and deduplicate tagPeoples
    const validTagPeoples =
      tagPeoples && Array.isArray(tagPeoples)
        ? [...new Map(tagPeoples.map((tag) => [tag.user_id, tag])).values()]
        : [];

    // Update the sub-comment
    comment.subComments[subCommentIndex].content = newContent;
    comment.subComments[subCommentIndex].tagPeoples = validTagPeoples;
    comment.subComments[subCommentIndex].updatedAt = new Date();

    // Save changes
    await comment.save();


    const users = await userData.findById(userId);
    users.lastInteraction = new Date();
    await users.save();


    return res.send({
      status: 1,
      message: "Sub-comment updated successfully.",
    });
  } catch (error) {
    console.error("Error updating sub-comment:", error);
    return res
      .status(500)
      .send({ status: 0, message: "Something went wrong." });
  }
};

/**
 * ✅ Sends notification when a user replies to a comment
 */
const sendSubCommentNotification = async (
  senderId,
  receiverId,
  senderName,
  postId,
  content
) => {
  try {
    // If the sender and receiver are the same, return immediately
    if (senderId.toString() === receiverId.toString()) return;
    const postFind = await post_Data.findOne({ _id: postId });
    const receiver = await userData.findById(receiverId, {
      device_Token: 1,
      appNotification: 1,
    });
    if (!receiver || !receiver.device_Token) return;

    console.log("receiver", receiver);

    const projectId = process.env.PROJECTID;
    if (!projectId) throw new Error("Project ID is not defined.");
    const accessToken = await getAccessToken();

    const notificationCount =
      (await notification.countDocuments({
        user_id: receiverId,
        is_Shown: true,
      })) + 1;
    const message = {
      message: {
        token: receiver.device_Token,
        notification: {
          title: "New Reply",
          body: `${senderName} replied to your comment: "${content}"`,
        },
        android: { notification: { sound: "default" } },
        apns: {
          payload: { aps: { sound: "default", badge: notificationCount } },
        },
        data: { badgeCount: notificationCount.toString() },
      },
    };

    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    if (receiver.appNotification) {
      await axios.post(url, message, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
    }

    const newNotification = new notification({
      community_id: postFind?.communityId,
      sender_id: senderId,
      user_id: receiverId,
      notification_message: message.message.notification.body,
      notification_type: 4,
      module_id: postId,
      module_type: "comment_reply",
    });

    await newNotification.save();
  } catch (error) {
    console.error("Error sending sub-comment notification:", error);
  }
};

exports.getComment = async (req, res) => {
  try {
    const post_Id = req.body.post_Id;
    const { user } = req;
    const userId = user._id;

    if (!post_Id || !userId) {
      return res
        .status(400)
        .json({ status: 0, message: "Please provide all the details" });
    }

    const page = req.body.page || 1;
    const limit = req.body.limit || 10;

    const findUser = await userData.findOne({ _id: userId });
    if (!findUser) {
      return res.status(400).json({ status: 0, message: "User not found" });
    }

    const findPost = await post_Data.findById(post_Id);

    if (!findPost) {
      return res.send({ status: 0, message: "Post not found." });
    }

    const findSection = await sectionModel.findOne({
      _id: findPost.communityId,
    });

    // Check if user is in the section's community_Members
    const isSectionMember = findSection.community_Members?.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    // Get the list of blocked users
    const blockedUsers = findUser.blockUsers.map((blockedUser) =>
      blockedUser.userIds.toString()
    );

    const comments = await commentsData
      .find({ post_Id: post_Id })
      .populate({
        path: "commentdetails",
        select: "username fullname _id image backgroundImageColour",
      })
      .populate({
        path: "subComments.userId",
        select: "username fullname _id image backgroundImageColour",
      })
      .populate({
        path: "commentlikerDetails.userId",
        select: "username fullname _id image backgroundImageColour",
      })
      .populate({
        path: "reactions.userId",
        select: "username fullname _id image backgroundImageColour",
      })
      .populate({
        path: "subComments.reactions.userId",
        select: "username fullname _id image backgroundImageColour",
      });

    if (comments.length > 0) {
      const allComments = comments
        .filter((comment) => {
          // Exclude comments made by blocked users
          const isCommentBlocked = blockedUsers.includes(
            comment.commentdetails._id.toString()
          );
          return !isCommentBlocked;
        })
        .map((comment) => {
          const subComments = comment.subComments
            .filter((subComment) => {
              // Exclude subcomments made by blocked users
              const isSubCommentBlocked = blockedUsers.includes(
                subComment.userId._id.toString()
              );
              return !isSubCommentBlocked;
            })
            .map((subComment) => ({
              likedByCurrentUser: subComment.likeUsers.some(
                (liker) => liker.LikerId.toString() === userId.toString()
              ),
              _id: subComment._id,
              content: subComment.content,
              totalLikes: subComment.likeUsers.length,
              // New reaction fields - accepts any reaction type
              reactions: subComment.reactions.filter(reaction => 
                !blockedUsers.includes(reaction.userId._id.toString())
              ),
              reactionCounts: subComment.reactionCounts || {},
              currentUserReaction: subComment.reactions.find(
                reaction => reaction.userId._id.toString() === userId.toString()
              )?.reactionType || null,
              createdAt: subComment.createdAt,
              userId: subComment.userId,
            }));

          return {
            _id: comment._id,
            post_Id: comment.post_Id,
            text: comment.text,
            commentdetails: comment.commentdetails,
            commentlikerDetails: comment.commentlikerDetails.filter(
              (liker) => !blockedUsers.includes(liker.userId._id.toString())
            ),
            // New reaction fields - accepts any reaction type
            reactions: comment.reactions.filter(reaction => 
              !blockedUsers.includes(reaction.userId._id.toString())
            ),
            reactionCounts: comment.reactionCounts || {},
            currentUserReaction: comment.reactions.find(
              reaction => reaction.userId._id.toString() === userId.toString()
            )?.reactionType || null,
            subComments: subComments,
            totalLikes: comment.commentlikerDetails.length,
            createdAt: comment.createdAt,
            likedByCurrentUser: comment.commentlikerDetails.some(
              (liker) => liker.userId._id.toString() === userId.toString()
            ),
            tagPeoples: comment.tagPeoples,
          };
        });

      const paginate = (items, page, perPage) => {
        const offset = perPage * (page - 1);
        const totalPages = Math.ceil(items.length / perPage);
        const paginatedItems = items.slice(offset, perPage * page);
        const current_page = offset / perPage + 1;

        return {
          previousPage: page > 1,
          nextPage: totalPages > page,
          totalDocs: items.length,
          totalPages: totalPages,
          currentPage: current_page,
          comments: paginatedItems,
        };
      };

      const commentsList = paginate(allComments, page, limit);
      return res.status(200).json({
        status: 1,
        message: "Comments list fetched successfully",
        totalComments: allComments.length,
        isSectionMember: isSectionMember || false,
        commentsList,
      });
    } else {
      return res.status(200).json({
        status: 1,
        message: "No comments found",
        data: [],
        isSectionMember: isSectionMember || false,
      });
    }
  } catch (err) {
    console.log("err=>>>>>", err);
    return res
      .status(500)
      .json({ status: 0, message: "Something went wrong." });
  }
};


// Add or update reaction to comment/sub-comment - NO VALIDATION
exports.add_reaction = async (req, res) => {
  try {
    const { commentId, subCommentId, reactionType } = req.body;
    const user_id = req.user._id;
    let existingReaction; // Declare at the top level

    if (!commentId || !reactionType) {
      return res.send({ status: 0, message: "Comment ID and reaction type are required." });
    }

    let comment;
    let reactionAction = 'added'; // Track the action taken
    
    if (subCommentId) {
      // Handle sub-comment reaction
      comment = await commentsData.findOne({ 
        "subComments._id": subCommentId 
      });
      
      if (!comment) {
        return res.send({ status: 0, message: "Sub-comment not found." });
      }

      const subComment = comment.subComments.id(subCommentId);
      if (!subComment) {
        return res.send({ status: 0, message: "Sub-comment not found." });
      }

      // Initialize reactions array if not exists
      if (!subComment.reactions) {
        subComment.reactions = [];
      }

      // Check if user already reacted with SAME reactionType
      existingReaction = subComment.reactions.find(
        reaction => reaction.userId.toString() === user_id.toString() && 
                   reaction.reactionType === reactionType
      );

      if (existingReaction) {
        // Remove reaction (toggle off)
        reactionAction = 'removed';
        subComment.reactions = subComment.reactions.filter(
          reaction => !(reaction.userId.toString() === user_id.toString() && reaction.reactionType === reactionType)
        );
      } else {
        // Add new reaction
        subComment.reactions = subComment.reactions.filter(
          reaction => reaction.userId.toString() !== user_id.toString()
        );
        
        subComment.reactions.push({
          userId: user_id,
          reactionType: reactionType
        });
      }

      // Update total likes for backward compatibility (if reaction is "like")
      if (reactionType === 'like' || reactionType === '👍') {
        if (existingReaction) {
          // Remove like if reaction removed
          subComment.likeUsers = subComment.likeUsers.filter(
            like => like.LikerId.toString() !== user_id.toString()
          );
        } else {
          // Add like if new reaction
          subComment.likeUsers = subComment.likeUsers || [];
          subComment.likeUsers.push({ LikerId: user_id });
        }
        subComment.totalLikes = subComment.likeUsers.length;
      }

    } else {
      // Handle main comment reaction
      comment = await commentsData.findById(commentId);
      
      if (!comment) {
        return res.send({ status: 0, message: "Comment not found." });
      }

      // Initialize reactions array if not exists
      if (!comment.reactions) {
        comment.reactions = [];
      }

      // Check if user already reacted with SAME reactionType
      existingReaction = comment.reactions.find(
        reaction => reaction.userId.toString() === user_id.toString() && 
                   reaction.reactionType === reactionType
      );

      if (existingReaction) {
        // Remove reaction (toggle off)
        reactionAction = 'removed';
        comment.reactions = comment.reactions.filter(
          reaction => !(reaction.userId.toString() === user_id.toString() && reaction.reactionType === reactionType)
        );
      } else {
        // Add new reaction
        comment.reactions = comment.reactions.filter(
          reaction => reaction.userId.toString() !== user_id.toString()
        );
        
        comment.reactions.push({
          userId: user_id,
          reactionType: reactionType
        });
      }

      // Update existing like system for backward compatibility (if reaction is "like")
      if (reactionType === 'like' || reactionType === '👍') {
        if (existingReaction) {
          // Remove like if reaction removed
          comment.commentlikerDetails = comment.commentlikerDetails.filter(
            like => like.userId.toString() !== user_id.toString()
          );
        } else {
          // Add like if new reaction
          comment.commentlikerDetails = comment.commentlikerDetails || [];
          comment.commentlikerDetails.push({ userId: user_id });
        }
        comment.totallikesofcomments = comment.commentlikerDetails.length;
      }
    }

    await comment.save();

    // Update social scores only when adding NEW reaction (not removing)
    if (!existingReaction) {
      try {
        const commenterScoreResult = await socialScoreCalculator.updateUserSocialScore(
          user_id, 
          'REACTS_ON_OTHERS_CONTENT'
        );
        console.log("User social score updated for reaction:", commenterScoreResult);
        
        // Get the target user ID (comment/sub-comment author)
        let targetUserId;
        if (subCommentId) {
          const subComment = comment.subComments.id(subCommentId);
          targetUserId = subComment.userId;
        } else {
          targetUserId = comment.user_Id;
        }
        
        if (targetUserId && targetUserId.toString() !== user_id.toString()) {
          const targetUserScoreResult = await socialScoreCalculator.updateUserSocialScore(
            targetUserId, 
            'OTHERS_REACT_ON_YOUR_CONTENT'
          );
          console.log("Target user social score updated:", targetUserScoreResult);
        }
      } catch (error) {
        console.error("Error updating social scores for reaction:", error);
      }
    }

    return res.send({
      status: 1,
      message: `Reaction ${reactionAction} successfully.`,
      data: {
        reactionType,
        userId: user_id,
        action: reactionAction
      }
    });

  } catch (error) {
    console.error("Error adding reaction:", error);
    return res.send({ status: 0, message: "Something went wrong." });
  }
};

// Remove reaction from comment/sub-comment
exports.remove_reaction = async (req, res) => {
  try {
      const { commentId, subCommentId } = req.body;
      const user_id = req.user._id;

      if (!commentId) {
          return res.send({ status: 0, message: "Comment ID is required." });
      }

      let comment;
      
      if (subCommentId) {
          // Handle sub-comment reaction removal
          comment = await commentsData.findOne({ 
              "subComments._id": subCommentId 
          });
          
          if (!comment) {
              return res.send({ status: 0, message: "Sub-comment not found." });
          }

          const subComment = comment.subComments.id(subCommentId);
          if (!subComment) {
              return res.send({ status: 0, message: "Sub-comment not found." });
          }

          // Remove reaction
          subComment.reactions = subComment.reactions.filter(
              reaction => reaction.userId.toString() !== user_id.toString()
          );

          // Also remove from likeUsers for backward compatibility
          subComment.likeUsers = subComment.likeUsers.filter(
              like => like.LikerId.toString() !== user_id.toString()
          );
          subComment.totalLikes = subComment.likeUsers.length;

      } else {
          // Handle main comment reaction removal
          comment = await commentsData.findById(commentId);
          
          if (!comment) {
              return res.send({ status: 0, message: "Comment not found." });
          }

          // Remove reaction
          comment.reactions = comment.reactions.filter(
              reaction => reaction.userId.toString() !== user_id.toString()
          );

          // Also remove from commentlikerDetails for backward compatibility
          comment.commentlikerDetails = comment.commentlikerDetails.filter(
              like => like.userId.toString() !== user_id.toString()
          );
          comment.totallikesofcomments = comment.commentlikerDetails.length;
      }

      await comment.save();

      return res.send({
          status: 1,
          message: "Reaction removed successfully."
      });

  } catch (error) {
      console.error("Error removing reaction:", error);
      return res.send({ status: 0, message: "Something went wrong." });
  }
};

// users for tag
exports.usersListForTagsPeoples = async (req, res, next) => {
  try {
    const sectionId = req.body.sectionId;
    const searchQuery = req.body.search || ""; // Get search query from request body (optional)
    const limit = parseInt(req.body.limit) || 5; // Default limit to 5
    const page = parseInt(req.body.page) || 1; // Default page to 1

    if (!sectionId) {
      return res.send({ status: 0, message: "section_id is required." });
    }

    // Find the section and populate community members
    const sectionFind = await sectionModel.findById(sectionId).populate({
      path: "community_Members",
      select: "fullname username image _id",
      match: searchQuery
        ? { username: { $regex: searchQuery, $options: "i" } } // Search by username (case-insensitive)
        : {}, // No search filter if searchQuery is empty
      options: {
        limit: limit,
        skip: (page - 1) * limit, // Pagination logic
      },
    });

    if (!sectionFind) {
      return res.send({ status: 0, message: "Section not found." });
    }

    console.log("sectionFind", sectionFind);

    const sectionMembers = sectionFind.community_Members;

    console.log("sectionMembers", sectionMembers);

    return res.send({
      status: 1,
      message: "Members retrieved successfully.",
      data: sectionMembers,
    });
  } catch (error) {
    console.log("error", error);
    return res
      .status(500)
      .send({ status: 0, message: "Internal server error." });
  }
};

//user find wth user name
exports.userFindWithUserName = async (req, res, next) => {
  try {
    const username = req.body.username;

    if (!username) {
      return res.send({ status: 0, message: "Username is required." });
    }

    const findUserQithUserName = await userData
      .findOne({ username: username })
      .select("_id username fullname image");

    if (!findUserQithUserName) {
      return res.send({ status: 0, message: "User does not exist." });
    }

    return res.send({
      status: 1,
      message: "User has been found.",
      data: findUserQithUserName,
    });
  } catch (error) {
    console.log("error", error);
    return res
      .status(500)
      .json({ status: 0, message: "Something went wrong." });
  }
};

// notification push for message
exports.notificationForPushForMessage = async (req, res, next) => {
  try {
    const userName = req.user.userName;
    const userId = req.body.userId;
    const messagefromuser = req.body.message;

    if (!userId) {
      return res.send({ status: 0, message: "userId is required." });
    }

    const userFind = await userData.findOne({ _id: userId });

    const projectId = process.env.PROJECTID;
    if (!projectId) {
      throw new Error("Project ID is not defined.");
    }

    const accessToken = await getAccessToken();

    const title = "CLIQK";
    const body = messagefromuser;
    let count = 1;
    var notification_count = await notification.countDocuments({
      user_id: userId,
      is_Shown: true,
    });
    if (notification_count > 0) {
      count = notification_count + 1;
    }

    const message = {
      message: {
        token: userFind.device_Token,
        notification: {
          title: title,
          body: body,
        },
        android: {
          // priority: "high",
          notification: {
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: count,
            },
          },
        },
        data: {
          badgeCount: count.toString(),
        },
      },
    };

    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // Send FCM notification if appNotification is true
    if (userFind.appNotification) {
      try {
        const response = await axios.post(url, message, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        console.log("Successfully sent message:", response.data);
      } catch (error) {
        console.error("Error sending message:", {
          // status: error.response?.status,
          // statusText: error.response?.statusText,
          // data: error.response?.data,
          // message: error.message,
        });
      }
    }

    return res.send({ status: 1, message: "message sent successfully." });
  } catch (error) {
    console.log("error", error);
    return res.send({ status: 0, message: "Internal server error." });
  }
};

exports.delete_sub_comment = async (req, res) => {
  try {
    const { user } = req;
    const userId = user._id;
    const { commentId } = req.body;

    if (!commentId || !subCommentId) {
      return res.status(400).send({
        status: 0,
        message: "Comment ID and Sub-Comment ID are required",
      });
    }

    // Find the parent comment
    const findComment = await commentsData.findOne({ _id: commentId });
    if (!findComment) {
      return res.status(404).send({ status: 0, message: "Comment not found" });
    }

    // Find the sub-comment in the array
    const subComment = findComment.subComments.find(
      (sub) => sub._id.toString() === subCommentId
    );

    if (!subComment) {
      return res
        .status(404)
        .send({ status: 0, message: "Sub-comment not found" });
    }

    // Check if the user deleting it is the author of the sub-comment
    if (subComment.userId.toString() !== userId.toString()) {
      return res.status(403).send({
        status: 0,
        message: "You are not authorized to delete this sub-comment",
      });
    }

    // Remove the sub-comment
    await commentsData.findByIdAndUpdate(
      commentId,
      {
        $pull: { subComments: { _id: subCommentId } },
        $inc: { totalCommentsReply: -1 },
      },
      { new: true }
    );

    // ✅ Remove related notification from the notifications collection
    await notification.deleteMany({
      post_Id: findComment.post_Id,
      comment_Id: commentId,
      sub_comment_Id: subCommentId, // Assuming sub-comment notifications have this field
    });

    return res.send({
      status: 1,
      message: "Sub-comment and related notifications deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting sub-comment:", error);
    return res
      .status(500)
      .send({ status: 0, message: "Internal Server Error" });
  }
};

// const newCommentNotification = async (
//   username,
//   senderId,
//   reciverId,
//   post_Id
// ) => {
//   try {
//     const postFind = await post_Data.findOne({ _id: post_Id });

//     const userFind = await userData.findOne({ _id: reciverId });
//     const badgeCount = userFind.badgeCount;

//     const user_deviceid = await userData.findById(postFind.user_Id);

//     const projectId = process.env.PROJECTID;
//     if (!projectId) {
//       throw new Error("Project ID is not defined.");
//     }

//     const accessToken = await getAccessToken();

//     const title = "CLIQK";
//     const body = `${username} commented on your post`;

//     let count = 1;
//     var notification_count = await notification.countDocuments({
//       user_id: reciverId,
//       is_Shown: true,
//     });
//     if (notification_count > 0) {
//       console.log("andarvaka", notification_count);
//       count = notification_count + 1;
//     }

//     const message = {
//       message: {
//         token: user_deviceid.device_Token,
//         notification: {
//           title: title,
//           body: body,
//         },
//         android: {
//           // priority: "high",
//           notification: {
//             sound: "default",
//           },
//         },
//         apns: {
//           payload: {
//             aps: {
//               sound: "default",
//               badge: count,
//             },
//           },
//         },
//         data: {
//           badgeCount: badgeCount.toString(),
//         },
//       },
//     };

//     const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

//     if (
//       postFind.user_Id.toString() !== senderId.toString() &&
//       user_deviceid &&
//       user_deviceid.appNotification
//     ) {
//       // Send FCM notification
//       try {
//         const response = await axios.post(url, message, {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//           },
//         });
//         console.log("Successfully sent message:", response.data);
//       } catch (error) {
//         console.error("Error sending message:", {
//           // status: error.response?.status,
//           // statusText: error.response?.statusText,
//           // data: error.response?.data,
//           // message: error.message,
//         });
//       }
//     }
//     // Save notification in database even if FCM notification is not sent
//     const send_notification = new notification({
//       community_id: postFind?.communityId,
//       sender_id: senderId,
//       user_id: reciverId,
//       notification_message: `${username} commented on your post`,
//       notification_type: 3,
//       module_id: post_Id,
//       module_type: "comments",
//     });
//     await send_notification.save();
//   } catch (error) {
//     console.log("error", error);
//   }
// };


// ✅ NEW FUNCTION: Send notification to section members for comment
const sendNotificationToSectionMembersForComment = async (
  communityId,
  senderId,
  postId,
  originalAuthorId,
  senderName,
  commentText
) => {
  try {
    const section = await sectionModel
      .findById(communityId)
      .populate("community_Members", "_id device_Token appNotification")
      .populate("followersList", "_id device_Token appNotification");

    if (!section) return;

    const sectionName = section.communityName || "Section";
    const title = "CLIQK";
    const body = `New message in ${sectionName}`; // ✅ Screenshot requirement

    const receivers = new Map();

    // Add members (exclude sender and original author)
    if (section.community_Members && Array.isArray(section.community_Members)) {
      section.community_Members.forEach(m => {
        if (m && m._id && 
            m._id.toString() !== senderId.toString() && 
            m._id.toString() !== originalAuthorId.toString()) {
          receivers.set(m._id.toString(), m);
        }
      });
    }

    // Add followers (exclude sender and original author)
    if (section.followersList && Array.isArray(section.followersList)) {
      section.followersList.forEach(f => {
        if (f && f._id && 
            f._id.toString() !== senderId.toString() && 
            f._id.toString() !== originalAuthorId.toString()) {
          receivers.set(f._id.toString(), f);
        }
      });
    }

    for (const user of receivers.values()) {
      if (!user.appNotification || !user.device_Token) continue;

      const badgeCount = (await notification.countDocuments({
        user_id: user._id,
        is_Shown: true,
      })) + 1;

      // Send push notification
      await sendPushNotification({
        token: user.device_Token,
        title,
        body,
        badgeCount,
        data: {
          communityId: communityId.toString(),
          postId: postId.toString(),
          notificationType: "section_comment"
        }
      });

      // Save to database
      await notification.create({
        community_id: communityId,
        sender_id: senderId,
        user_id: user._id,
        notification_message: body,
        notification_type: 5, // Same as new message
        module_id: postId,
        module_type: "section_comment"
      });
    }
  } catch (err) {
    console.error("Section comment notification error:", err);
  }
};

const newCommentNotification = async (
  username,
  senderId,
  reciverId,
  post_Id
) => {
  try {
    const postFind = await post_Data.findOne({ _id: post_Id });

    // ✅ FIX: Get section info
    let sectionId = null;
    let sectionName = "Section";
    
    if (postFind && postFind.communityId) {
      const section = await sectionModel.findById(postFind.communityId);
      if (section) {
        sectionId = section._id;
        sectionName = section.communityName || "Section";
      }
    }

    const userFind = await userData.findOne({ _id: reciverId });
    const badgeCount = userFind?.badgeCount || 0;

    const user_deviceid = await userData.findById(postFind?.user_Id);

    const projectId = process.env.PROJECTID;
    if (!projectId) {
      throw new Error("Project ID is not defined.");
    }

    const accessToken = await getAccessToken();

    const title = "CLIQK";
    
    // ✅ FIXED: Change "post" to "message" as per screenshot
    const body = `${username} commented on your message`;

    let count = 1;
    var notification_count = await notification.countDocuments({
      user_id: reciverId,
      is_Shown: true,
    });
    if (notification_count > 0) {
      console.log("andarvaka", notification_count);
      count = notification_count + 1;
    }

    const message = {
      message: {
        token: user_deviceid?.device_Token,
        notification: {
          title: title,
          body: body,
        },
        android: {
          notification: {
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: count,
            },
          },
        },
        data: {
          badgeCount: badgeCount.toString(),
        },
      },
    };

    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    if (
      postFind?.user_Id?.toString() !== senderId.toString() &&
      user_deviceid &&
      user_deviceid.appNotification &&
      user_deviceid.device_Token
    ) {
      // Send FCM notification
      try {
        const response = await axios.post(url, message, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        console.log("Successfully sent message:", response.data);
      } catch (error) {
        console.error("Error sending message:", error.message);
      }
    }
    
    // Save notification in database even if FCM notification is not sent
    const send_notification = new notification({
      community_id: sectionId,
      sender_id: senderId,
      user_id: reciverId,
      notification_message: body, // ✅ Store correct message
      notification_type: 3,
      module_id: post_Id,
      module_type: "comments",
    });
    await send_notification.save();
    
    // ✅ NEW: Send notification to other section members/followers
    if (sectionId && postFind?.user_Id) {
      await sendNotificationToSectionMembersForComment(
        sectionId,
        senderId,
        post_Id,
        postFind.user_Id, // Original author to exclude
        username,
        body
      );
    }
    
  } catch (error) {
    console.log("error", error);
  }
};

const newCommentNotificationLike = async (
  username,
  senderId,
  reciverId,
  post_Id
) => {
  try {
    const postFind = await post_Data.findOne({ _id: post_Id });

    const userFind = await userData.findOne({ _id: reciverId });
    const badgeCount = userFind.badgeCount;

    const user_deviceid = await userData.findById(postFind.user_Id);

    const projectId = process.env.PROJECTID;
    if (!projectId) {
      throw new Error("Project ID is not defined.");
    }

    const accessToken = await getAccessToken();

    const title = "CLIQK";
    const body = `${username} commented on your post`;

    let count = 1;
    var notification_count = await notification.countDocuments({
      user_id: reciverId,
      is_Shown: true,
    });
    if (notification_count > 0) {
      console.log("andarvaka", notification_count);
      count = notification_count + 1;
    }

    const message = {
      message: {
        token: user_deviceid.device_Token,
        notification: {
          title: title,
          body: body,
        },
        android: {
          // priority: "high",
          notification: {
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: count,
            },
          },
        },
        data: {
          badgeCount: badgeCount.toString(),
        },
      },
    };

    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    if (
      postFind.user_Id.toString() !== senderId.toString() &&
      user_deviceid &&
      user_deviceid.appNotification
    ) {
      // Send FCM notification
      try {
        const response = await axios.post(url, message, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        console.log("Successfully sent message:", response.data);
      } catch (error) {
        console.error("Error sending message:", {
          // status: error.response?.status,
          // statusText: error.response?.statusText,
          // data: error.response?.data,
          // message: error.message,
        });
      }
    }
    // Save notification in database even if FCM notification is not sent
    const send_notification = new notification({
      sender_id: senderId,
      user_id: reciverId,
      notification_message: `${username} commented on your post`,
      notification_type: 3,
      module_id: post_Id,
      module_type: "comments",
    });
    await send_notification.save();
  } catch (error) {
    console.log("error", error);
  }
};

const tagPostPeoplesNotification = async (
  userId,
  validTagPeoples,
  postId,
  communityId
) => {
  try {
    console.log(
      "tagPostPeoplesNotification",
      userId,
      validTagPeoples,
      postId,
      communityId
    );

    // Fetch sender details
    const findSender = await userData
      .findById(userId)
      .select("username device_Token appNotification");
    if (!findSender) {
      console.error("Sender not found");
      return;
    }

    const name = findSender.username;
    console.log("Sender:", name);

    // Fetch tagged users
    const taggedUsers = await userData.find(
      { _id: { $in: validTagPeoples.map((tag) => tag.user_id.toString()) } },
      { _id: 1, device_Token: 1 }
    );

    console.log("Tagged Users:", taggedUsers);

    // Firebase Project ID
    const projectId = process.env.PROJECTID;
    if (!projectId) {
      throw new Error("Project ID is not defined.");
    }

    // Fetch Firebase Access Token
    const accessToken = await getAccessToken();
    const title = "CLIQK";
    const body = `${name} tagged you in a comment.`;

    // Process notifications for each tagged user
    for (const taggedUser of taggedUsers) {
      console.log("Processing tagged user:", taggedUser);

      // Ensure device_Token is stored as "empty" if missing
      const deviceToken =
        taggedUser.device_Token && taggedUser.device_Token.trim() !== ""
          ? taggedUser.device_Token
          : "empty";

      // Skip sending FCM notification if `device_Token` is "empty"
      if (deviceToken === "empty") {
        console.warn(
          `Skipping FCM notification for user ${taggedUser._id} (No device token).`
        );
      } else {
        // Count unread notifications
        let notificationCount = await notification.countDocuments({
          user_id: userId,
          is_Shown: true,
        });
        notificationCount = notificationCount > 0 ? notificationCount + 1 : 1;

        // Construct FCM message payload
        const message = {
          message: {
            token: deviceToken,
            notification: {
              title: title,
              body: body,
            },
            android: {
              notification: {
                sound: "default",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: notificationCount,
                },
              },
            },
            data: {
              badgeCount: notificationCount.toString(),
            },
          },
        };

        const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

        // Send FCM notification if app notifications are enabled
        if (findSender.appNotification) {
          try {
            const response = await axios.post(url, message, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            });
            console.log("Successfully sent message:", response.data);
          } catch (error) {
            console.error("Error sending message:", error);
          }
        }
      }

      // Save notification to database, ensuring "empty" device_Token if missing
      const taggedNotification = new notification({
        community_id: communityId,
        sender_id: userId,
        user_id: taggedUser._id,
        notification_message: body,
        notification_type: 4,
        module_id: postId,
        module_type: "mentions",
        device_Token: deviceToken, // Store "empty" if missing
      });

      await taggedNotification.save();
    }
  } catch (error) {
    console.error("Error in tagPostPeoplesNotification:", error);
  }
};
