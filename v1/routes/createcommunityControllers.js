const createCliqkData = require("../../../models/createcommunity");
const postData = require("../../../models/createPost");
const userData = require("../../../models/user");
const mongoose = require("mongoose");
// const aws = require('../../../middleware/s3Image');
const path = require("path");
const send_Community_NotificationData = require("../../../models/send_Community_Notification");
const like_dislikedatas = require("../../../models/like_dislike_Schema");
const subscription_Data = require("../../../models/subscription");
var FCM = require("fcm-node");
// quest key
var serverKey = process.env.FCM_SERVER_KEY || "";
var fcm = new FCM(serverKey);
const notification = require("../../../models/notifiication_list");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "");
const otpGenerator = require("otp-generator");
const { upload, s3 } = require("../../../middleware/s3Image");

const { google } = require("googleapis");
// const admin = require("firebase-admin");
const axios = require("axios");
const dotenv = require("dotenv");
// const serviceAccount = require("../../../cliqk-e25f0-firebase-adminsdk-vedtf-7eb62187c9.json");
const moment = require("moment"); // Make sure moment is installed
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

const csectionSocialSData = require("../../../models/sectionSocialScores"); // Adjust the path as necessary
const sectionSocialScores = async (sectionId, scoresData, scoreFor) => {
  try {
    if (scoreFor === "accept_Request") {
      const existingSection = await csectionSocialSData.findOne({ sectionId });
      const sectionFind = await createCliqkData.findById(sectionId);

      if (sectionFind) {
        sectionFind.socialScore += 10; // Increment socialScore
        const xper = await calculateXP(sectionFind.socialScore);
        sectionFind.xp = xper.xp;
        await sectionFind.save();
      }

      if (existingSection) {
        existingSection.scoresData.push(scoresData);
        await existingSection.save();
        console.log("Scores added to existing section.");
      } else {
        const newSection = new csectionSocialSData({ sectionId, scoresData });
        await newSection.save();
        console.log("New section created with scores data.");
      }
    }
  } catch (error) {
    console.error("Error in sectionSocialScores:", error);
  }
};

// Function to update user profile scores
const userProfileScore = async (userId, scoresData, scoreFor) => {
  try {
    if (scoreFor === "accept_Request") {
      const existingUser = await playerSocialScore.findOne({ userId });
      const userFind = await userData.findById(userId);

      if (userFind) {
        userFind.socialScore += 10; // Increment socialScore
        userFind.xp = calculateXP(userFind.socialScore);

        await userFind.save();
      }

      if (existingUser) {
        existingUser.scoresData.push(scoresData);
        await existingUser.save();
        console.log("Scores added to existing user.");
      } else {
        const newUser = new playerSocialScore({ userId, scoresData });
        await newUser.save();
        console.log("New user created with scores data.");
      }
    }
  } catch (error) {
    console.error("Error in userProfileScore:", error);
  }
};

// Function to calculate XP

const calculateXP = (socialScore) => {
  if (socialScore < 1000) {
    return {
      xp: Math.floor(socialScore / 100) || 1, // Default XP starts from 1
      nextThreshold: 1000,
    };
  }

  let xp = 10; // XP 1000 se start hone ke baad yaha aayega
  let stepSize = 150;
  let threshold = 1000;

  while (socialScore >= threshold + stepSize) {
    threshold += stepSize;
    xp++;
    stepSize += 50; // Har step ke baad 50 ka increment
  }

  return {
    xp: xp,
    nextThreshold: threshold + stepSize, // Next XP level ka threshold
  };
};

exports.getuserData = async (req, res, next) => {
  try {
    const current_user = req.user._id;

    const result = await userData.find({ _id: { $ne: current_user } }).lean();
    // result.password = undefined
    result.password = undefined;

    res.send({
      Data: result,
      Status: 1,
      message: "User Data Fatch Successfully",
    });
  } catch (error) {
    res.send({ Data: [], Status: 0, message: "Can Not Fatch User Data" });
  }
};

exports.createCommunity = async (req, res, next) => {
  try {
    const cliqk_type = req.body.cliqk_type;
    const userId = req.user._id;
    let community_Members = JSON.parse(req.body.community_Members);
    var createCommunity;

    const cliqk = await createCliqkData.find({ userObjId: userId }).lean();

    if (cliqk.length === 2) {
      return res.send({
        status: 0,
        message: "you have already created 2 sections",
      });
    }

    if (cliqk.length > 0) {
      const data = await createCliqkData.find({
        userObjId: userId,
        cliqk_type: cliqk_type,
      });
      if (data.length == 1) {
        return res.send({
          status: 0,
          message: "you have already created bussines sction",
        });
      }

      const datas = await createCliqkData.find({
        userObjId: userId,
        cliqk_type: cliqk_type,
      });
      if (datas.length == 1) {
        return res.send({
          status: 0,
          message: "you have already created private section",
        });
      }
    }

    if (cliqk_type === "private") {
      var unique_id = otpGenerator.generate(10, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      const chake_unique = await createCliqkData.findOne({
        unique_id: unique_id,
      });

      if (chake_unique) {
        var unique_id = otpGenerator.generate(10, {
          digits: true,
          lowerCaseAlphabets: false,
          upperCaseAlphabets: false,
          specialChars: false,
        });
      }

      var communityImage = [];
      for (let i = 0; i < req.files.length; i++) {
        communityImage.push({ image: req.files[i].location });
      }

      var all_Users = [];
      for (let index = 0; index < community_Members.length; index++) {
        var element = community_Members[index];
        var id = mongoose.Types.ObjectId(element);
        const data = await userData.findById({ _id: id });
        all_Users.push(data);
      }

      createCommunity = await new createCliqkData({
        communityImage: communityImage,
        subscrition_type: req.body.subscrition_type,
        Amount: 0,
        communityName: req.body.communityName,
        aboutCommunity: req.body.aboutCommunity,
        product_id: "",
        price_id: "",
        userObjId: mongoose.Types.ObjectId(userId),
        unique_id: unique_id,
        cliqk_type: "private",
        subscrition_type: "",
        timescale: "",
      });
    } else {
      var unique_id = otpGenerator.generate(10, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      const chake_unique = await createCliqkData.findOne({
        unique_id: unique_id,
      });

      if (chake_unique) {
        var unique_id = otpGenerator.generate(10, {
          digits: true,
          lowerCaseAlphabets: false,
          upperCaseAlphabets: false,
          specialChars: false,
        });
      }

      var all_Users = [];
      for (let index = 0; index < community_Members.length; index++) {
        var element = community_Members[index];
        var id = mongoose.Types.ObjectId(element);
        const data = await userData.findById({ _id: id });
        all_Users.push(data);
      }
      var communityImage = [];
      for (let i = 0; i < req.files.length; i++) {
        communityImage.push({ image: req.files[i].location });
      }
      if (req.body.subscrition_type === "free") {
        createCommunity = await new createCliqkData({
          communityImage: communityImage,
          subscrition_type: "free",
          Amount: 0,
          communityName: req.body.communityName,
          aboutCommunity: req.body.aboutCommunity,
          product_id: "",
          price_id: "",
          userObjId: mongoose.Types.ObjectId(userId),
          unique_id: unique_id,
          cliqk_type: "bussiness",
        });
      } else {
        var unique_id = otpGenerator.generate(10, {
          digits: true,
          lowerCaseAlphabets: false,
          upperCaseAlphabets: false,
          specialChars: false,
        });

        const chake_unique = await createCliqkData.findOne({
          unique_id: unique_id,
        });

        if (chake_unique) {
          var unique_id = otpGenerator.generate(10, {
            digits: true,
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false,
          });
        }

        var communityImage = [];
        for (let i = 0; i < req.files.length; i++) {
          communityImage.push({ image: req.files[i].location });
        }

        if (req.body.timescale === "one_of_payment") {
          createCommunity = await new createCliqkData({
            communityImage: communityImage,
            subscrition_type: "paid",
            timescale: "one_of_payment",
            Amount: req.body.Amount,
            communityName: req.body.communityName,
            aboutCommunity: req.body.aboutCommunity,
            product_id: "",
            price_id: "",
            userObjId: mongoose.Types.ObjectId(userId),
            // is_public: is_public,
            unique_id: unique_id,
            cliqk_type: "bussiness",
          });
        } else if (req.body.timescale === "week") {
          var unique_id = otpGenerator.generate(10, {
            digits: true,
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false,
          });

          const chake_unique = await createCliqkData.findOne({
            unique_id: unique_id,
          });

          if (chake_unique) {
            var unique_id = otpGenerator.generate(10, {
              digits: true,
              lowerCaseAlphabets: false,
              upperCaseAlphabets: false,
              specialChars: false,
            });
          }

          var communityImage = [];
          for (let i = 0; i < req.files.length; i++) {
            communityImage.push({ image: req.files[i].location });
          }

          const product = await stripe.products.create({
            name: req.body.communityName,
          });

          const price = await stripe.prices.create({
            unit_amount: req.body.Amount,
            currency: "gbp",
            recurring: { interval: req.body.timescale },
            product: product.id,
          });

          createCommunity = await new createCliqkData({
            communityImage: communityImage,
            subscrition_type: "paid",
            timescale: "week",
            Amount: req.body.Amount,
            communityName: req.body.communityName,
            aboutCommunity: req.body.aboutCommunity,
            product_id: product.id,
            price_id: price.id,
            userObjId: mongoose.Types.ObjectId(userId),
            // is_public: is_public,
            unique_id: unique_id,
            cliqk_type: "bussiness",
          });
        } else if (req.body.timescale === "month") {
          var unique_id = otpGenerator.generate(10, {
            digits: true,
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false,
          });

          const chake_unique = await createCliqkData.findOne({
            unique_id: unique_id,
          });

          var communityImage = [];
          for (let i = 0; i < req.files.length; i++) {
            communityImage.push({ image: req.files[i].location });
          }

          if (chake_unique) {
            var unique_id = otpGenerator.generate(10, {
              digits: true,
              lowerCaseAlphabets: false,
              upperCaseAlphabets: false,
              specialChars: false,
            });
          }
          const product = await stripe.products.create({
            name: req.body.communityName,
          });

          const price = await stripe.prices.create({
            unit_amount: req.body.Amount,
            currency: "gbp",
            recurring: { interval: req.body.timescale },
            product: product.id,
          });

          createCommunity = await new createCliqkData({
            communityImage: communityImage,
            subscrition_type: "paid",
            timescale: "month",
            Amount: req.body.Amount,
            communityName: req.body.communityName,
            aboutCommunity: req.body.aboutCommunity,
            product_id: product.id,
            price_id: price.id,
            userObjId: mongoose.Types.ObjectId(userId),
            // is_public: is_public,
            unique_id: unique_id,
            cliqk_type: "bussiness",
          });
        }
      }
    }

    const result = await createCommunity.save();
    const username = req.user.username;
    const communityName = req.body.communityName;
    const createCommunityId = createCommunity._id;
    if (result) {
      sendNotification_for_section({
        all_Users,
        userId,
        username,
        communityName,
        createCommunityId,
      });
    }
    return res.send({
      Data: createCommunity,
      status: 1,
      message: "Create Section Successfully",
    });

    // // Process all users for sending notifications
    // for (let index = 0; index < all_Users.length; index++) {
    //     const user = all_Users[index];
    //     const element11 = user.device_Token;
    //     const to_user_Id = user._id;
    //     const appNotification = user.appNotification;
    //     const badgeCount = user.badgeCount;

    //     if (userId === to_user_Id) {
    //         console.log("Cannot send request to self, skipping.");
    //         continue; // Skip sending notification to self
    //     }

    //     if (element11 && appNotification) {
    //         // Fetch access token
    //         let accessToken = await getAccessToken();
    //         const title = 'CLIQK';
    //         const body = `${req.user.username} would like to invite you to his section ${req.body.communityName}`;
    //         const message = {
    //             message: {
    //                 token: element11,
    //                 notification: { title, body },
    //                 android: { notification: { sound: "default" } },
    //                 apns: { payload: { aps: { sound: "default", badge: badgeCount } } }
    //             }
    //         };

    //         const url = `https://fcm.googleapis.com/v1/projects/${process.env.PROJECTID}/messages:send`;

    //         try {
    //             const response = await axios.post(url, message, {
    //                 headers: {
    //                     Authorization: `Bearer ${accessToken}`,
    //                     "Content-Type": "application/json",
    //                 },
    //             });
    //             console.log('Successfully sent message:', response.data);
    //         } catch (error) {
    //             console.error('Error sending message:', error.response?.data || error.message);
    //         }
    //     }

    //     // Save request and notification data
    //     const send_request = new send_Community_NotificationData({
    //         Comminity_Id: createCommunity._id,
    //         ReciverId: to_user_Id,
    //         senderId: userId,
    //         is_Accept: false,
    //         request_status: 3,
    //         send_by: "by_admin"
    //     });
    //     await send_request.save();

    //     const send_notification = new notification({
    //         community_id: createCommunity._id,
    //         sender_id: userId,
    //         user_id: to_user_Id,
    //         notification_message: message.message.notification.body,
    //         notification_type: 1,
    //         module_id: send_request._id,
    //         module_type: "community_request",
    //         requestSendBy: "sectionOwner"
    //     });
    //     await send_notification.save();
    // }
  } catch (error) {
    console.log("error", error);
    return res.send({ status: 0, message: "something wents wrong" });
  }
};

const sendNotification_for_section = async ({
  all_Users,
  userId,
  username,
  communityName,
  createCommunityId,
}) => {
  // Process all users for sending notifications
  for (let index = 0; index < all_Users.length; index++) {
    const user = all_Users[index];
    const element11 = user.device_Token;
    const to_user_Id = user._id;
    const appNotification = user.appNotification;
    const badgeCount = user.badgeCount;

    if (userId === to_user_Id) {
      console.log("Cannot send request to self, skipping.");
      continue; // Skip sending notification to s elf
    }

    if (element11 && appNotification) {
      let count = 1;
      var notification_count = await notification.countDocuments({
        user_id: to_user_Id,
        is_Shown: true,
      });
      if (notification_count > 0) {
        count = notification_count + 1;
      }
      // Fetch access token
      let accessToken = await getAccessToken();
      const title = "CLIQK";
      const body = `${username} would like to invite you to his section ${communityName}`;
      var message = {
        message: {
          token: element11,
          notification: { title, body },
          android: { notification: { sound: "default" } },
          apns: { payload: { aps: { sound: "default", badge: count } } },
        },
      };

      const url = `https://fcm.googleapis.com/v1/projects/${process.env.PROJECTID}/messages:send`;

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
    }

    // Save request and notification data
    const send_request = new send_Community_NotificationData({
      Comminity_Id: createCommunityId,
      ReciverId: to_user_Id,
      senderId: userId,
      is_Accept: false,
      request_status: 3,
      send_by: "by_admin",
    });
    await send_request.save();

    const send_notification = new notification({
      community_id: createCommunityId,
      sender_id: userId,
      user_id: to_user_Id,
      notification_message: message.message.notification.body,
      notification_type: 1,
      module_id: send_request._id,
      module_type: "community_request",
      requestSendBy: "sectionOwner",
    });
    await send_notification.save();
  }
};

// get community with user Data
// Screen 8
// done new
// exports.fatchcommunitydata = async (req, res, next) => {
//     try {
//         console.log(req.body);
//         const community_Id = mongoose.Types.ObjectId(req.body.community_Id)
//         const user_Id = req.user._id

//         const section = await createCliqkData.aggregate([
//             {
//                 $match: { _id: community_Id }
//             },

//             {
//                 $lookup: {
//                     from: "userdatas",
//                     localField: "community_Members",
//                     foreignField: "_id",
//                     as: "Members"
//                 }

//             },
//             // { $unwind: "$Members" }, {
//             {
//                 $project: {
//                     "communityId": 1,
//                     "communityName": 1,
//                     "communityImage": 1,
//                     "aboutCommunity": 1,
//                     "Members._id": 1,
//                     "Members.username": 1,
//                     "Members.image": 1,
//                     "Members.user_Id": 1,
//                     "count": 1,
//                     Members_count: {

//                         $size: "$Members"

//                     },
//                 }
//             }])

//         const post = await userData.aggregate([

//             {
//                 $match: { _id: user_Id }
//             },

//             {
//                 $lookup: {
//                     from: "createpostdatas",
//                     localField: "_id",
//                     foreignField: "user_Id",
//                     as: "post"
//                 }

//             }, {
//                 $project: {
//                     "_id": 1,
//                     "fullname": 1,
//                     "username": 1,
//                     "image": 1,
//                     "post._id": 1,
//                     "post.desc": 1,
//                     "post.post": 1,
//                     "post.post_type": 1,
//                     "post.createPost": 1,
//                     "post.createdAt": 1,
//                     "count": 1
//                 }

//             }

//         ])

//         const Data = { section, post }

//         res.send({ Data: Data, status: 1, message: 'Community Data Fatch Successfully' })

//         // console.log('communityId',result);
//         // } else {
//         //     return res.json({ Data: [], Status: 0, message: 'can not found communityId' })
//         // }

//     } catch (error) {
//         console.log(error);

//     }

// }
// pagination done
exports.fatchcommunitydata = async (req, res, next) => {
  try {
    const community_Id = mongoose.Types.ObjectId(req.body.community_Id);
    const page = req.body.page || 1;
    const limit = req.body.limit || 10;

    var is_subscription;
    const suscribe_user = await subscription_Data.findOne({
      Comminity_Id: community_Id,
      user_id: req.user._id,
    });
    if (suscribe_user) {
      is_subscription = true;
    } else {
      is_subscription = false;
    }

    const sectionFind = await createCliqkData.findOne({ _id: community_Id });
    if (sectionFind === null) {
      return res.send({ status: 0, message: "Section not found" });
    }

    var isMySection;
    if (req.user._id.toString() === sectionFind.userObjId.toString()) {
      isMySection = true;
    } else {
      isMySection = false;
    }

    var join_section;
    var folllowSection;

    if (sectionFind.cliqk_type === "private") {
      const joinInSection = await createCliqkData.findOne({
        _id: community_Id,
        community_Members: { $in: [req.user._id] },
      });
      const follow_section = await createCliqkData.findOne({
        _id: community_Id,
        followersList: { $in: [req.user._id] },
      });

      if (follow_section) {
        folllowSection = true;
      } else {
        folllowSection = false;
      }
      // const joinInSection = await createCliqkData.findOne({ _id: community_Id, "community_Members._id": req.user._id })
      if (joinInSection !== null) {
        join_section = 2;
      } else {
        join_section = 4;
      }
    } else if (
      sectionFind.cliqk_type === "bussiness" &&
      sectionFind.subscrition_type === "free"
    ) {
      // const joinInSection = await createCliqkData.findOne({ _id: community_Id, "community_Members._id": req.user._id })

      const joinInSection = await createCliqkData.findOne({
        _id: community_Id,
        community_Members: { $in: [req.user._id] },
      });

      const follow_section = await createCliqkData.findOne({
        _id: community_Id,
        followersList: { $in: [req.user._id] },
      });

      if (follow_section) {
        folllowSection = true;
      } else {
        folllowSection = false;
      }

      if (joinInSection !== null) {
        join_section = 2;
      } else {
        join_section = 4;
      }
    } else {
      const is_join_community = await send_Community_NotificationData.findOne({
        Comminity_Id: community_Id,
        ReciverId: req.user._id,
      });

      if (is_join_community) {
        var join_section = is_join_community.request_status;
      } else {
        var join_section = 4;
      }

      const follow_section = await createCliqkData.findOne({
        _id: community_Id,
        followersList: { $in: [req.user._id] },
      });

      if (follow_section) {
        folllowSection = true;
      } else {
        folllowSection = false;
      }
    }

    const results = await createCliqkData.aggregate([
      {
        $match: { _id: community_Id },
      },
      {
        $lookup: {
          from: "userdatas",
          localField: "community_Members",
          foreignField: "_id",
          as: "Members",
        },
      },
      // { $unwind: "$Members" }, {
      {
        $project: {
          communityId: 1,
          communityName: 1,
          // "communityImage": { $arrayElemAt: ["$communityImage", 0] },
          communityImage: 1,
          is_public: 1,
          userObjId: 1,
          unique_id: 1,
          aboutCommunity: 1,
          socialScore :1,
          xp :1,
          dualTimeLine :1,
          "Members._id": 1,
          "Members.username": 1,
          "Members.image": 1,
          "Members.user_Id": 1,
          count: 1,
          subscrition_type: 1,
          Amount: 1,
          timescale: 1,
          cliqk_type: 1,
          xp: 1,
          socialScore :1,
          Members_count: {
            $size: "$Members",
          },
          followersList :1,
          followersCount :{
            $size : "$followersList"
          }
          
        },
      },
    ]);


    // const community_posts = await postData.aggregate([

    //     { $match: { communityId: community_Id } },

    //     {
    //         $lookup: {
    //             from: "userdatas",
    //             localField: "user_Id",
    //             foreignField: "_id",
    //             as: "user_Id",
    //         }
    //     },
    //     { $unwind: "$user_Id" },

    //     {
    //         $project: {
    //             "_id": 1,
    //             "post_type": 1,
    //             "createPost": 1,
    //             "createdAt": 1,
    //             // 'community_Members': 1,
    //             "desc": 1,
    //             "is_public": 1,
    //             "option": 1,
    //             "user_Id._id": 1,
    //             "user_Id.username": 1,
    //             "user_Id.image": 1,
    //             "user_Id.about": 1,
    //             likes: { $size: "$post_likes" }
    //             // likesCount: { $size: "$post_likes" },
    //         }
    //     },

    // ])

    // const community_post = [];
    // // async function processCommunityPosts() {

    // if (community_posts.length != 0) {
    //     for (const item of community_posts) {
    //         var obj = {};
    //         const data = await like_dislikedatas.find({ user_Id: req.user._id, post_Id: item._id });
    //         obj._id = item._id;
    //         obj.post_type = item.post_type;
    //         obj.createPost = item.createPost;
    //         obj.desc = item.desc;
    //         obj.user_Id = item.user_Id;
    //         obj.createdAt = item.createdAt;
    //         obj.is_public = item.is_public;
    //         obj.is_like = data.length > 0 ? true : false;
    //         obj.likes = item.likes;
    //         community_post.push(obj);
    //     }
    // }

    // const paginate = (items, page, perPage) => {
    //     const offset = perPage * (page - 1)
    //     const totalPages = Math.ceil(items.length / perPage)
    //     const paginatedItems = items.slice(offset, perPage * page)
    //     const current_page = offset / perPage + 1

    //     return {
    //         previousPage: page - 1 ? true : false,
    //         nextPage: totalPages > page ? true : false,
    //         totalDocs: items.length,
    //         totalPages: totalPages,
    //         currentPage: current_page,
    //         myPost: paginatedItems
    //     }
    // }
    // var post = paginate(community_post, page, limit)
    const userId = req.user._id

    const updatedCommunity = await createCliqkData.findByIdAndUpdate(
      community_Id,
      {
        $inc: { viewsCount: 1 },
        $push: {
          viewsTimeAndDateAndUserId: {
            userId: userId,
            viewedAt: new Date()
          }
        }
      },
      { new: true }
    );

    const calculateXP = (socialScore) => {
      let xp = Math.floor(socialScore / 100) + 1; // Always starts from level 1
      let nextThreshold = xp * 100; // Next level threshold dynamically set
      return { xp, nextThreshold };
    };

    const  data =  results[0]
    console.log("data" ,data)

    const sectionData  = data.socialScore

    const sectionScores = calculateXP(sectionData)

    results.reduce(function (section, item, section) {
      var section = item; //a, b, c
      section.xp = sectionScores.xp
      section.nextThreshold = sectionScores.nextThreshold
      res.send({
        status: 1,
        message: "Community Data Fatch Successfully",
        Data: section,
        isMySection,
        join_section,
        is_subscription,
        folllowSection,
        // sectionScores
      });
    }, {});
    // }
    // processCommunityPosts();
  } catch (error) {
    console.log({ status: 0, message: "something wents wrong" });
  }
};

// update community
exports.updatecommunity = async (req, res, next) => {
  try {
    const community_Id = req.body.community_Id;

    const userObj = await userData.findOne({ user_Id: req.user.User_Id });

    if (req.files) {
      const commuImage = await createCliqkData.findById({ _id: community_Id });

      let imageArray1 = [];

      for (let index = 0; index < commuImage.communityImage.length; index++) {
        var image = commuImage.communityImage[index].image;
        var image_id = commuImage.communityImage[index]._id;

        obj = { image, image_id };

        imageArray1.push(obj);
      }
      var imageArray2 = [];

      for (let i = 0; i < req.files.length; i++) {
        imageArray2.push({ image: req.files[i].location });
      }

      let imageArray3 = imageArray1.concat(imageArray2);

      let communityImage = imageArray3;
      // console.log('communityImage', communityImage);

      // const data = await createCliqkData.findById(req.params.id)

      // var memArr1 = []
      // for (let index = 0; index < data.addMembers.length; index++) {
      //     const _id = data.addMembers[index]._id;

      //     console.log('element', _id);
      //     // obj = {element}
      //     memArr1.push(_id)
      //     // console.log('element',memArr1);

      // }

      // var memArr2 = []
      // var memArr2 = req.body.addMembers
      //     .split(",")
      //     .map((ids) => mongoose.Types.ObjectId(ids));

      // let memArray3 = memArr1.concat(memArr2)
      // console.log('memArray3', memArray3);

      // let addMembers = req.body.addMembers
      //     .split(",")
      //     .map((ids) => mongoose.Types.ObjectId(ids));

      const updateCommunity = await createCliqkData.findByIdAndUpdate(
        { _id: community_Id },
        {
          $set: {
            communityImage,
            // addMembers: addMembers,
            communityName: req.body.communityName,
            aboutCommunity: req.body.aboutCommunity,
          },
        },
        { new: true }
      );
      res.send({
        Data: updateCommunity,
        Status: 1,
        message: "Community Data Update Successfully",
      });

      // res.send(updateCommunity)

      // console.log('updateCommunity', updateCommunity);
    } else {
      const updateCommunity = await createCliqkData.findByIdAndUpdate(
        { _id: community_Id },
        {
          $set: {
            communityName: req.body.communityName,
            aboutCommunity: req.body.aboutCommunity,
            // addMembers: addMembers,
          },
        },
        { new: true }
      );
      // console.log('updateCommunity', updateCommunity)
      res.send({
        Data: updateCommunity,
        Status: 1,
        message: "Community Data Update Successfully",
      });
    }
  } catch (error) {
    res.send({ Data: [], status: 0, message: "Something wents wrong" });
    console.log(error);
  }
};

// fatch community using user id
// Screen 9
// done new
// exports.fatchcommunitydatausinguserId = async (req, res, next) => {
//     try {
//         const user_Id = req.body.user_Id
//         var user = await userData.findOne({ _id: user_Id })
//         console.log('objobj', user);
//         // const user_Id = req.user._id

//         // console.log('user==>>', user_Id)
//         if (user) {

//             var data = await createCliqkData.find({ userObjId: user_Id })
//             console.log('datatatatata', data);

//             var UserData = user;
//             var userscommunity = data

//             const reult = { UserData, userscommunity }
//             console.log('reult', reult);
//             res.json({ Data: reult, status: 1, message: 'User And Users Community Data Fatch Successfully' })
//         }
//         else {
//             res.send({ Data: [], Status: 0, message: 'data Can Not Fatch' })
//         }

//     } catch (error) {
//         console.log(error);
//         res.send({ status: 0, message: 'Can Not Found User ID' })
//     }
// }

// search community
// Screen 13
exports.searcCommunity = async (req, res, next) => {
  try {
    const result = await createCliqkData
      .find({
        $or: [
          { communityName: { $regex: req.body.key, $options: "i" } },
          { aboutCommunity: { $regex: req.body.key, $options: "i" } },
        ],
      })
      .skip(0)
      .limit(20);
    res.json({
      Data: result,
      Status: 1,
      message: "community data Search Successfully",
    });
  } catch (error) {
    res.send({ Data: [], Status: 0, message: "Somthing wents wrong" });
    console.log(error);
  }
};

// My Profile
exports.my_profile = async (req, res, next) => {
  try {
    const current_user_Id = req.user._id;

    const my_profile = await userData.aggregate([
      { $match: { _id: current_user_Id } },
      {
        $lookup: {
          from: "createcliqkdatas",
          localField: "_id",
          foreignField: "community_Members",
          as: "sections_joined",
        },
      },
      {
        $lookup: {
          from: "createcliqkdatas",
          localField: "_id",
          foreignField: "userObjId",
          as: "my_sections",
        },
      },
      {
        $project: {
          _id: 1,
          fullname: 1,
          username: 1,
          image: 1,
          about: 1,
          forTickStatus: 1,
          instagramUserName: 1,
          tikTokUserName: 1,
          whenSomeoneJoinMySection: 1,
          OwnerPostNotification: 1,
          socialScore: 1,
          "my_sections._id": 1,
          "my_sections.dualTimeLine" :1,
          "my_sections.communityImage": 1,
          "my_sections.communityName": 1,
          "my_sections.is_public": 1,
          "my_sections.community_Members": 1,
          "my_sections.subscrition_type": 1,
          "my_sections.cliqk_type": 1,
          "my_sections.followersList": 1, // Ensure followersList is fetched
          "my_sections.viewsCount": 1, 
          "sections_joined._id": 1,
          "sections_joined.dualTimeLine" :1,
          "sections_joined.communityImage": 1,
          "sections_joined.communityName": 1,
          "sections_joined.is_public": 1,
          "sections_joined.subscrition_type": 1,
          "sections_joined.cliqk_type": 1,
          "sections_joined.viewsCount": 1, 
          "sections_joined.followersList": 1, // Ensure followersList is fetched
          my_section_count: { $size: "$my_sections" },
          sections_joined_count: { $size: "$sections_joined" },
        },
      },
    ]);

    const user = my_profile[0];

    if (!user) {
      return res.send({ status: 0, message: "User not found" });
    }

    // ✅ XP Calculation (Level 1 -> 100, Level 2 -> 200, Level 3 -> 300 ...)
    const calculateXP = (socialScore) => {
      let xp = Math.floor(socialScore / 100) + 1;
      let nextThreshold = xp * 100;
      return { xp, nextThreshold };
    };

    const xpData = calculateXP(user.socialScore);

    // Fetch Private Section Key
    const myPrivateSectionKeyCode = await createCliqkData.findOne({
      userObjId: current_user_Id,
      cliqk_type: "private",
    });

    const PrivateSectionKeyCode = myPrivateSectionKeyCode
      ? myPrivateSectionKeyCode.unique_id
      : "";

    // Calculate followersCount per section
    user.sections_joined = user.sections_joined.map((section) => ({
      ...section,
      followersCount: section.followersList ? section.followersList.length : 0,
    }));

       // Calculate followersCount per section
       user.my_sections = user.my_sections.map((section) => ({
        ...section,
        followersCount: section.followersList ? section.followersList.length : 0,
      }));

    // Final Response
    var newObj = {
      ...user,
      xp: xpData.xp,
      nextThreshold: xpData.nextThreshold,
      PrivateSectionKeyCode,
    };

    res.send({
      data: newObj,
      status: 1,
      message: "User profile fetched successfully",
    });
  } catch (error) {
    console.log(error);
    res.send({ status: 0, message: error.message });
  }
};

// Screen 19
// exports.myProfile = async (req, res, next) => {
//     try {
//         // const userObj = await userData.findOne({ user_Id: req.body.user_Id });
//         // const commuObj = await createCliqkData.find({ user_Id: req.body.user_Id });

//         // const result = await createCliqkData.find( {  $expr : { $in : ["$_id" , "$createCliqkData.addMembers" ] }  })
//         // console.log('result',result);

//         var user_id = req.user._id

//         console.log("this user_id........", user_id);

//         const result = await createCliqkData.aggregate([

//             {
//                 $match: {
//                     $or: [{
//                         userObjId: user_id
//                     },
//                     {
//                         $expr: { $in: [user_id, "$addMembers"] }
//                     }]
//                 }
//             },
//             //{ $match: { $expr: { $in: [user_id, "$invite_friend"] } } },
//             // { $match: { userObjId: user_id } },

//             // {
//             //     $lookup: {
//             //         from: 'userdatas',
//             //         localField: 'community_Members',
//             //         foreignField: '_id',
//             //         as: 'community_Members'
//             //     }
//             // },

//             // {let :{user_id : "$userObjId" },
//             //     $match: {
//             //         $expr: { "$eq" : [
//             //             "$user_id", "$$user_id"]
//             //         },

//             //         // {
//             //         //     // $expr: { $eq: ["$user_id", "$community_Members"] }
//             //         // }]}
//             //     }
//             // },

//             // {
//             //     $lookup: {
//             //         from: "userdatas",
//             //         let: {
//             //             community_Members: "$user_id"
//             //         },
//             //         pipeline: [{
//             //             $match: {
//             //                 $expr: { "$eq": ["$community_Members", "$community_Members"] }
//             //             }
//             //         }],
//             //         as: "community_Members"
//             //     }
//             // },
//             // {$match:{comunity_Members:user_id}}
//             // {
//             //     $lookup: {
//             //         from: 'userdatas',
//             //         localField: 'userObjId',
//             //         foreignField: '_id',
//             //         as: 'userObjId'
//             //     }
//             // },
//             // {
//             //     $project: {
//             //         'communityImage': 1,
//             //         'communityName': 1,
//             //         'aboutCommunity': 1,
//             //         'addMembers.username': 1,
//             //         'addMembers.image': 1,
//             //         'addMembers._id': 1,
//             //         'userObjId.username': 1,
//             //         'userObjId.image': 1,
//             //         'userObjId._id': 1
//             //     }
//             // }
//         ])

//         let resData = {}
//         resData.result = result
//         resData.current_user = req.user

//         console.log('ressssss', resData);
//         res.send({ Data: resData, status: 1, message: 'user profile fatch successfully' })

//         // db.survey.find(
//         //     { results: { $elemMatch: { product: "xyz", score: { $gte: 8 } } } }
//         //  )

//         // const joincommunituObj = await createCliqkData.find();
//         // console.log('joincommunituObj',joincommunituObj.addMembers);
//         // for (let index = 0; index < joincommunituObj.length; index++) {
//         //     const members = joincommunituObj[index].addMembers
//         //     console.log('members',members);

//         // }
//         // console.log('tetst',userObj,commuObj);

//         // console.log('userrr',userObj , commuObj);

//     } catch (error) {
//         console.log(error);
//         res.send({ Data: [], Status: 0, message: 'User Profile Can Not Fatch Successfully' })
//     }
// }

// delete community image from communityImage
exports.deleteCommunitySingleImage = async (req, res, next) => {
  try {
    const imageId = req.body.imageId;
    const commuId = req.body.commuId;

    const communityData = await createCliqkData.findById({ _id: commuId });

    for (let index = 0; index < communityData.communityImage.length; index++) {
      if (communityData.communityImage[index]._id == imageId) {
        const element = communityData.communityImage[index].image;
      }
    }
    // const result = await propertyData.findByIdAndUpdate({ _id: prodId }, { $pull: { propertyImage: { _id: imageId } } })
    const resut = await createCliqkData.findByIdAndUpdate(
      { _id: commuId },
      { $pull: { communityImage: { _id: imageId } } }
    );

    res.send({ Status: 1, message: "Sinagle Image Delete Successfuliy" });
  } catch (error) {
    res.send({ Status: 0, message: "Somthings wents wrong" });
    console.log(error);
  }
};

// delete community
exports.deletecommunity = async (req, res, next) => {
  try {
    const community_Id = req.body.community_Id;
    const deletecommunity = await createCliqkData.findById(community_Id);

    const communityImage = deletecommunity.communityImage;

    if (communityImage.length >= 0) {
      return res.send({ status: 0, message: "can not deleted community" });
    }

    res.send({ Status: 1, message: "delete Community Successfully" });
  } catch (error) {
    res.send({ status: 0, message: "Somthing wents wrong" });
    console.log(error);
  }
};

// request Sending By User For Join Section
exports.send_Notifcation_And_Request = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sectionId = req.body.sectionId;

    // find section
    const findCommunity = await createCliqkData.findOne({ _id: sectionId });

    if (findCommunity === null) {
      return res.send({ status: 0, message: "Section Not Found" });
    }
    // sending Request
    const alreadyRequested = await send_Community_NotificationData.findOne({
      Comminity_Id: sectionId,
      senderId: userId,
      ReciverId: findCommunity.userObjId,
    });

    // Already Sending request
    if (alreadyRequested !== null) {
      if (alreadyRequested.request_status === 3) {
        return res.send({
          status: 0,
          message: "Already Send Request For Join Section",
        });
      } else if (alreadyRequested.request_status === 2) {
        return res.send({ status: 0, message: "Already Section Member" });
      }
    }
    // find Section Owner Details
    const findSectionOwner = await userData.findOne({
      _id: findCommunity.userObjId,
    });
    const badgeCount = findSectionOwner.badgeCount;

    if (userId === findSectionOwner.userObjId) {
      return res.send({ status: 0, message: "Something Wents Wrong" });
    }

    // adding Request
    const send_Notification = new send_Community_NotificationData({
      Comminity_Id: sectionId,
      ReciverId: findCommunity.userObjId,
      senderId: userId,
      is_Accept: false,
      request_status: 3,
      send_by: "by_user",
    });
    await send_Notification.save();

    updateBadgeCount(findSectionOwner._id);

    const projectId = process.env.PROJECTID;
    if (!projectId) {
      throw new Error("Project ID is not defined.");
    }

    const accessToken = await getAccessToken();

    const title = "CLIQK";
    const body = `${req.user.username} wants to join your ${findCommunity.communityName}`;

    let count = 1;
    var notification_count = await notification.countDocuments({
      user_id: findCommunity.userObjId,
      is_Shown: true,
    });
    if (notification_count > 0) {
      count = notification_count + 1;
    }

    const message = {
      message: {
        token: findSectionOwner.device_Token,
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

    if (findSectionOwner.device_Token && findSectionOwner.appNotification) {
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

    const send_notification = new notification({
      community_id: sectionId,
      sender_id: req.user._id,
      user_id: findCommunity.userObjId,
      notification_message: message.notification.body,
      notification_type: 5,
      module_id: send_Notification._id,
      module_type: "community_request",
      requestSendBy: "user",
    });
    await send_notification.save();
    res.send({
      status: 1,
      message: "Request Sent Successfully For Join Section",
    });
  } catch (error) {
    res.send({ status: 0, message: "Something wents wrong" });
  }
};

// cloudpanner
// exports.accept_Community_Request = async (req, res, next) => {
//     try {

//         const community_Admin_Id = mongoose.Types.ObjectId(req.body.community_Admin_Id);
//         console.log('community_Admin_Id=>>', community_Admin_Id)
//         console.log(typeof community_Admin_Id)
//         const community_Id = mongoose.Types.ObjectId(req.body.community_Id)

//         const to_user_Id = req.user._id
//         console.log("to_user_Id=>>", to_user_Id)

//               const is_Accept = req.body.is_Accept

//         const username = req.user.username
//         const request_id = req.body.request_id

//         const community_admin_user = await userData.findOne({ _id: community_Admin_Id })
//         console.log("community_admin_user=>>", community_admin_user)

//           if (is_Accept === false) {
//             const remove_request = await send_Community_NotificationData.findByIdAndRemove({ _id: request_id })
//             res.send({ status: 0, message: "request is decline" })
//             console.log("remove request")
//             // const remove_notification = await notification.findByIdAndUpdate({})

//         }

//       else {

//         const community_notification = await send_Community_NotificationData.findOne({ community_Admin_Id: community_Admin_Id, to_user_Id: to_user_Id })
//         console.log("community_admin=>>", community_notification)

//         if (community_notification.is_Accept === false) {
//             console.log("test")

//             var message = {
//                 to: community_admin_user.device_Token,/*device_Id*/
//                 priority: "high",
//                 notification: {
//                     title: 'Accept Communnity Request',
//                     body: `${username}` + ' Accepted Your Community Request',
//                     sound: "default"
//                 },
//             }
//             console.log("message=>>", message)

//             // const add_member = await createCliqkData.findByIdAndUpdate({ _id: community_Id }, { $push: { community_Members: to_user_Id } }, { new: true })
//             // console.log("add_member=>>", add_member)

//             fcm.send(message, async (err, response) => {
//                 console.log('response=>>', response);
//                 console.log("error", err)

//                 if (err) {

//                     console.log("test=>>")
//                     const result = await send_Community_NotificationData.findByIdAndUpdate({ _id: request_id }, { request_status: 2, is_Accept: true }, { new: true })
//                     console.log("result", result)

//                     const add_member = await createCliqkData.findByIdAndUpdate({ _id: community_Id }, { $push: { community_Members: to_user_Id } }, { new: true })
//                     console.log("add_member=>>", add_member)

//                     res.send({ Data: result, status: 1, message: 'request accepted successfully' })
//                 }

//             });

//         }
//       }

//     }
//     catch (error) {
//         console.log(error)
//         res.send({ status: 1, message: 'Community Request Can Not Accpted Successfully' })
//     }
// }

// accept request for community
exports.accept_Community_Request = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const userId = req.body.userId;
    const sectionId = req.body.sectionId;
    const request_status = req.body.request_status;
    const requestId = req.body.requestId;
    const requestType = req.body.requestType;
    const _id = req.body._id;
    const requestSendBy = req.body.requestSendBy;

    const sectionFind = await createCliqkData.findOne({ _id: sectionId });

    if (sectionFind.cliqk_type === "private") {
      return acceptPrivateSection({
        requestId,
        _id,
        request_status,
        sectionId,
        currentUserId,
        userId,
        req,
        res,
        requestSendBy,
        requestType,
      });
    }

    if (requestSendBy === "user") {
      if (sectionFind === null) {
        return res.send({ status: 0, message: "Section Not Found" });
      }

      const findRequest = await send_Community_NotificationData.findOne({
        _id: requestId,
      });
      const userTokenHere = await userData.findOne({
        _id: findRequest.ReciverId,
      });

      if (findRequest === null) {
        return res.send({ status: 0, message: "Request Not Found" });
      }

      if (request_status === 1) {
        // reject
        const remove_request =
          await send_Community_NotificationData.findByIdAndRemove({
            _id: requestId,
          });
        const removeFromNotificationList = await notification.findByIdAndRemove(
          { _id: _id }
        );
        const updateStatus = await notification.findByIdAndUpdate(
          { _id: _id },
          { is_Shown: false, isAction: false }
        );
        return res.send({ status: 1, message: "Section Request Decline" });
      } else {
        // accept
        const accept_request =
          await send_Community_NotificationData.findByIdAndUpdate(
            { _id: requestId },
            { request_status: 2, is_Accept: true },
            { new: true }
          );
        const updateStatus = await notification.findByIdAndUpdate(
          { _id: _id },
          { is_Shown: false, isAction: false }
        );
        const add_member = await createCliqkData.findByIdAndUpdate(
          { _id: sectionId },
          { $push: { community_Members: currentUserId } },
          { new: true }
        );

        // Updating user and section scores
        const userId = req.user._id;
        const sectionId = req.body.sectionId; // Ensure sectionId is received in request
        const scoreFor = "accept_Request";

        const userSocialScore = {
          score: 10,
          userId,
          scoreFor,
        };

        await userProfileScore(userId, userSocialScore, scoreFor);

        const findUser = await userData.findById(userId);
        if (findUser) {
          const xpe = await calculateXP(findUser.socialScore);
          findUser.xp = xpe.xp;
          await findUser.save();
        }

        const sectionScoreData = {
          score: 10,
          userId,
          scoreFor,
        };

        await sectionSocialScores(sectionId, sectionScoreData, scoreFor);

        const sectionFind = await createCliqkData.findById(sectionId);
        if (sectionFind) {
          const xpee = calculateXP(sectionFind.socialScore);
          sectionFind.xp = xpee.xp;
          await sectionFind.save();
        }

        res.send({ status: 1, message: "Section Request Accept" });
      }

      const userToken = await userData.findOne({ _id: sectionFind.userObjId });
      const badgeCount = userToken.badgeCount;

      updateBadgeCount(userToken._id);

      const projectId = process.env.PROJECTID;
      if (!projectId) {
        throw new Error("Project ID is not defined.");
      }

      const accessToken = await getAccessToken();

      const title = "CLIQK";
      const body = `${req.user.username} has accepted your request`;

      let count = 1;
      var notification_count = await notification.countDocuments({
        user_id: userToken._id,
        is_Shown: true,
      });
      if (notification_count > 0) {
        count = notification_count + 1;
      }

      const message = {
        message: {
          token: userToken.device_Token,
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

      // Section Admin Accept Request
      if (userToken.device_Token && userToken.appNotification) {
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

        const send_notification = new notification({
          community_id: sectionId,
          sender_id: req.user._id,
          user_id: userId,
          notification_message: message.notification.body,
          notification_type: 9,
          // module_id: accept_request._id,
          module_type: "community_request",
          requestSendBy: "user",
        });
        await send_notification.save();
      }
    } else if (requestSendBy === "admin") {
      console.log("ADMIN");
      if (sectionFind === null) {
        return res.send({ status: 0, message: "Section Not Found" });
      }

      const findRequest = await send_Community_NotificationData.findOne({
        _id: requestId,
      });

      if (findRequest === null) {
        return res.send({ status: 0, message: "Request Not Found" });
      }

      const userTokenHere = await userData.findOne({
        _id: findRequest.senderId,
      });
      const badgeCount = userTokenHere.badgeCount;

      if (request_status === 1) {
        const remove_request =
          await send_Community_NotificationData.findByIdAndRemove({
            _id: requestId,
          });
        const removeFromNotificationList = await notification.findByIdAndRemove(
          { _id: _id }
        );
        const updateStatus = await notification.findOneAndUpdate(
          { _id: _id },
          { is_Shown: false, isAction: false }
        );
        return res.send({ status: 1, message: "Section Request Decline" });
      } else {
        const accept_request =
          await send_Community_NotificationData.findByIdAndUpdate(
            { _id: requestId },
            { request_status: 2, is_Accept: true },
            { new: true }
          );
        const updateStatus = await notification.findOneAndUpdate(
          { _id: _id },
          { is_Shown: false, isAction: false }
        );
        // Updating user and section scores
        const userId = req.user._id;
        const sectionId = req.body.sectionId; // Ensure sectionId is received in request
        const scoreFor = "accept_Request";

        const userSocialScore = {
          score: 10,
          userId,
          scoreFor,
        };

        await userProfileScore(userId, userSocialScore, scoreFor);

        const findUser = await userData.findById(userId);
        if (findUser) {
          const xpe = calculateXP(findUser.socialScore);
          findUser.xp = xpe.xp;
          await findUser.save();
        }

        const sectionScoreData = {
          score: 10,
          userId,
          scoreFor,
        };

        await sectionSocialScores(sectionId, sectionScoreData, scoreFor);

        const sectionFind = await createCliqkData.findById(sectionId);
        if (sectionFind) {
          const xpe = calculateXP(sectionFind.socialScore);
          sectionFind.xp = xpe.xp;
          await sectionFind.save();
        }

        // const add_member = await a.fi`ndByIdAndUpdate({ _id: sectionId }, { $push: { community_Members: currentUserId } }, { new: true })
        res.send({ status: 1, message: "Section Request Accept" });
      }

      // const userToken = await userData.findOne({ _id: sectionFind.userObjId })
      // console.log("userToken=>>>>", userToken)
      updateBadgeCount(userTokenHere._id);

      const projectId = process.env.PROJECTID;
      if (!projectId) {
        throw new Error("Project ID is not defined.");
      }

      const accessToken = await getAccessToken();

      const title = "CLIQK";
      const body = `Pay now to join the ${sectionFind.communityName}`;

      let count = 1;
      var notification_count = await notification.countDocuments({
        user_id: userTokenHere._id,
        is_Shown: true,
      });
      if (notification_count > 0) {
        count = notification_count + 1;
      }

      // Section Admin Accept Request
      if (userTokenHere.device_Token && userTokenHere.appNotification) {
        const message = {
          message: {
            token: userTokenHere.device_Token,
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

      const send_notification = new notification({
        community_id: sectionId,
        sender_id: req.user._id,
        user_id: userId,
        notification_message: message.notification.body,
        notification_type: 9,
        // module_id: accept_request._id,
        module_type: "community_request",
        requestSendBy: "sectionOwner",
      });
      send_notification.save();
    } else {
      return res.send({ status: 0, message: "Please enter valid value" });
    }
  } catch (error) {
    console.log(error);
    res.send({ status: 0, message: "Somthing wents wrong" });
  }
};

const acceptPrivateSection = async ({
  requestType,
  requestId,
  _id,
  request_status,
  sectionId,
  currentUserId,
  userId,
  req,
  res,
}) => {
  const sectionFind = await createCliqkData.findOne({ _id: sectionId });

  if (sectionFind === null) {
    return res.send({ status: 0, message: "Section Not Found" });
  }

  const findRequest = await send_Community_NotificationData.findOne({
    _id: requestId,
  });

  if (findRequest === null) {
    return res.send({ status: 0, message: "Request Not Found" });
  }

  if (requestType === "invitation") {
    const userTokenHere = await userData.findOne({ _id: findRequest.senderId });

    if (request_status === 1) {
      const remove_request =
        await send_Community_NotificationData.findByIdAndRemove({
          _id: requestId,
        });
      const removeFromNotificationList = await notification.findByIdAndRemove({
        _id: _id,
      });
      const updateStatus = await notification.findOneAndUpdate(
        { _id: _id },
        { is_Shown: false, isAction: false }
      );
      return res.send({ status: 1, message: "Section Request Decline" });
    } else {
      const accept_request =
        await send_Community_NotificationData.findByIdAndUpdate(
          { _id: requestId },
          { request_status: 2, is_Accept: true },
          { new: true }
        );
      const updateStatus = await notification.findOneAndUpdate(
        { _id: _id },
        { is_Shown: false, isAction: false }
      );
      const add_member = await createCliqkData.findByIdAndUpdate(
        { _id: sectionId },
        {
          $push: { community_Members: mongoose.Types.ObjectId(currentUserId) },
        },
        { new: true }
      );
      res.send({ status: 1, message: "Section Request Accept" });
    }

    // const userToken = await userData.findOne({ _id: sectionFind.userObjId })
    // console.log("userToken=>>>>", userToken)

    updateBadgeCount(userTokenHere._id);

    const badgeCount = userTokenHere.badgeCount;

    const projectId = process.env.PROJECTID;
    if (!projectId) {
      throw new Error("Project ID is not defined.");
    }

    const accessToken = await getAccessToken();

    let count = 1;
    var notification_count = await notification.countDocuments({
      user_id: userTokenHere._id,
      is_Shown: true,
    });
    if (notification_count > 0) {
      count = notification_count + 1;
    }

    const title = "CLIQK";
    const body = `Your request for joining ${sectionFind.communityName} has been accepted.`;

    const message = {
      message: {
        token: userTokenHere.device_Token,
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

    if (userTokenHere.device_Token && userTokenHere.appNotification) {
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

    const send_notification = new notification({
      community_id: sectionId,
      sender_id: req.user._id,
      user_id: userId,
      notification_message: message.notification.body,
      notification_type: 9,
      // module_id: accept_request._id,
      module_type: "community_request",
      requestSendBy: "sectionOwner",
    });
    await send_notification.save();
  } else {
    const userTokenHere = await userData.findOne({ _id: findRequest.senderId });
    const badgeCount = userTokenHere.badgeCount;

    if (request_status === 1) {
      const remove_request =
        await send_Community_NotificationData.findByIdAndRemove({
          _id: requestId,
        });
      const removeFromNotificationList = await notification.findByIdAndRemove({
        _id: _id,
      });
      const updateStatus = await notification.findOneAndUpdate(
        { _id: _id },
        { is_Shown: false, isAction: false }
      );
      return res.send({ status: 1, message: "Section Request Decline" });
    } else {
      const accept_request =
        await send_Community_NotificationData.findByIdAndUpdate(
          { _id: requestId },
          { request_status: 2, is_Accept: true },
          { new: true }
        );
      const updateStatus = await notification.findOneAndUpdate(
        { _id: _id },
        { is_Shown: false, isAction: false }
      );
      const add_member = await createCliqkData.findByIdAndUpdate(
        { _id: sectionId },
        { $push: { community_Members: mongoose.Types.ObjectId(userId) } },
        { new: true }
      );
      res.send({ status: 1, message: "Section Request Accept" });
    }

    // const userToken = await userData.findOne({ _id: sectionFind.userObjId })
    // console.log("userToken=>>>>", userToken)
    // Section Admin Accept Request
    updateBadgeCount(userTokenHere._id);

    const projectId = process.env.PROJECTID;
    if (!projectId) {
      throw new Error("Project ID is not defined.");
    }

    const accessToken = await getAccessToken();

    let count = 1;
    var notification_count = await notification.countDocuments({
      user_id: userTokenHere._id,
      is_Shown: true,
    });
    if (notification_count > 0) {
      count = notification_count + 1;
    }

    const title = "CLIQK";
    const body = `Your request for joining ${sectionFind.communityName} has been accepted.`;

    const message = {
      message: {
        token: userTokenHere.device_Token,
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

    if (userTokenHere.device_Token && userTokenHere.appNotification) {
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

    const send_notification = new notification({
      community_id: sectionId,
      sender_id: req.user._id,
      user_id: userId,
      notification_message: message.notification.body,
      notification_type: 9,
      // module_id: accept_request._id,
      module_type: "community_request",
      requestSendBy: "user",
    });
    await send_notification.save();
  }
};

// my friend profile78
exports.friends_profile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const friend_Id = mongoose.Types.ObjectId(req.body.friend_Id);
    const baseInstagramUrl = "https://www.instagram.com/";
    const baseTiktokUrl = "https://www.tiktok.com/";


    const friends_profile = await userData.aggregate([
      { $match: { _id: friend_Id } },

      {
        $lookup: {
          from: "createcliqkdatas",
          localField: "_id",
          foreignField: "community_Members",
          as: "sections_joined",
        },
      },
      {
        $lookup: {
          from: "createcliqkdatas",
          localField: "_id",
          foreignField: "userObjId",
          as: "my_sections",
        },
      },
      {
        $lookup: {
          from: "followers", // Replace with your followers collection name
          localField: "_id",
          foreignField: "followingId", // Adjust field as per your schema
          as: "followersList",
        },
      },
      {
        $project: {
          _id: 1,
          fullname: 1,
          username: 1,
          image: 1,
          about: 1,
          forTickStatus: 1,
          instagramUserName: 1,
          tikTokUserName: 1,
          socialScore :1,
          "my_sections._id": 1,
          "my_sections.communityImage": 1,
          "my_sections.communityName": 1,
          "my_sections.community_Members": 1,
          "my_sections.followersList": 1,
          "my_sections.xp": 1,
          "my_sections.socialScore": 1,
          "my_sections.viewsCount":1,
          my_scetion_count: { $size: "$my_sections" },
          followersCount: { $size: "$followersList" }, // Count followers
        },
      },
    ]);

    if (!friends_profile.length) {
      return res.send({ status: 0, message: "Friend profile not found" });
    }

    const inBlockList = await userData.findOne({
      "blockUsers.userIds": friend_Id,
    });
    let blockUser = !!inBlockList;

    const blockInFriendList = await userData.findOne({
      _id: friend_Id,
      "blockUsers.userIds": userId,
    });
    let currentUserBlock = !!blockInFriendList;

    const myPrivateSectionKeyCode = await createCliqkData.findOne({
      userObjId: friend_Id,
      cliqk_type: "private",
    });

    var PrivateSectionKeyCode = myPrivateSectionKeyCode
      ? myPrivateSectionKeyCode.unique_id
      : "";

    let data = friends_profile[0];

    // Add followersCount for each my_sections entry
    data.my_sections = data.my_sections.map((section) => ({
      ...section,
      followersCount: section.followersList ? section.followersList.length : 0,
    }));


    const calculateXP = (socialScore) => {
      let xp = Math.floor(socialScore / 100) + 1;
      let nextThreshold = xp * 100;
      return { xp, nextThreshold };
    };


    const xpData = calculateXP(data.socialScore);
   
    var newObj = Object.assign(
      { PrivateSectionKeyCode, blockUser, currentUserBlock, xp: xpData.xp, nextThreshold  :xpData.nextThreshold },
      data
    );


    res.send({
      data: newObj,
      status: 1,
      message: "Friends profile fetched successfully",
    });
  } catch (error) {
    console.log(error);
    res.send({ status: 0, message: error.message });
  }
};



// notification_list
// exports.notification_list = async (req, res, next) => {
//     try {

//         const userId = req.user._id
//         const notificationList = await notification.aggregate([
//             {
//                 $match: {
//                     user_id: userId, is_Shown: true
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "userdatas",
//                     localField: "sender_id",
//                     foreignField: "_id",
//                     as: "sender_id",
//                 },

//             },
//             { $unwind: '$sender_id' },

//             {
//                 $project: {
//                     'sender_id._id': 1,
//                     'sender_id.fullname': 1,
//                     'sender_id.username': 1,
//                     'sender_id.image': 1,
//                     'notification_type': 1,
//                     'notification_message': 1,
//                     "button_show": 1,
//                     "module_id": 1,
//                     "community_id": 1,
//                     "is_Shown": 1,
//                     "requestSendBy": 1

//                 }
//             },
//         ])

//         res.send({ status: 1, message: "Notification List Fatch Successfully", data: notificationList })

//     }
//     catch (error) {
//         console.log(error)
//         res.send({ status: 0, message: "Somthing wents wrong" })
//     }
// }

exports.notification_list = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Step 1: Mark all notifications as shown (read)
    const notificationRead = await notification.updateMany(
      { user_id: userId },
      { $set: { is_Shown: false } },
      { new: true }
    );

    // Step 2: Reset badge count and send silent notification
    async function resetBadgeCount(userId) {
      // Reset badge count in the database
      const result = await userData.findByIdAndUpdate(
        { _id: userId },
        { $set: { badgeCount: 0 } }
      );

      const deviceToken = req.user.device_Token; // Ensure deviceToken is available

      // If deviceToken exists, send a silent push notification to reset the badge count
      // if (deviceToken) {
      //     const accessToken = await getAccessToken();

      //     const message = {
      //         message: {
      //             token: deviceToken,
      //             apns: {
      //                 payload: {
      //                     aps: {
      //                         sound: "default",
      //                         badge: 0,
      //                     },
      //                 },
      //             },
      //         }
      //     };

      //     const url = `https://fcm.googleapis.com/v1/projects/${process.env.PROJECTID}/messages:send`;

      //     try {
      //         const response = await axios.post(url, message, {
      //             headers: {
      //                 Authorization: `Bearer ${accessToken}`,
      //                 "Content-Type": "application/json",
      //             },
      //         });
      //         console.log('Successfully reset badge count:', response.data);
      //     } catch (error) {
      //         console.error('Error resetting badge count:', error.response?.data || error.message);
      //     }
      // } else {
      //     console.log('No device token available, cannot reset badge count on device.');
      // }
    }

    // Step 3: Call the function to reset the badge count and send push notification
    // await resetBadgeCount(userId);

    // Step 4: Fetch the notification list
    const notificationList = await notification.aggregate([
      {
        $match: {
          user_id: userId,
          // is_Shown: true,
          // isAction: true
        },
      },
      {
        $lookup: {
          from: "userdatas",
          localField: "sender_id",
          foreignField: "_id",
          as: "sender_id",
        },
      },
      { $unwind: "$sender_id" },
      {
        $project: {
          "sender_id._id": 1,
          "sender_id.fullname": 1,
          "sender_id.username": 1,
          "sender_id.image": 1,
          notification_type: 1,
          notification_message: 1,
          button_show: 1,
          module_id: 1,
          community_id: 1,
          is_Shown: 1,
          requestSendBy: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 }, // Sort notifications by creation date (descending)
      },
    ]);

    // Step 5: Return the notification list response
    return res.send({
      status: 1,
      message: "Notification List Fetch Successfully",
      data: notificationList,
    });
  } catch (error) {
    console.log(error);
    return res.send({ status: 0, message: "Something went wrong" });
  }
};

// community public and private
exports.create_cliqk = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cliqk_type = req.body.cliqk_type;

    const cliqk = await createCliqkData.find({ userObjId: userId }).lean();

    if (cliqk.length === 2) {
      return res.send({
        status: 0,
        message: "you are already created 2 sections",
      });
    }

    if (cliqk.length > 0) {
      if (cliqk_type === "private") {
        const data = await createCliqkData.find({
          userObjId: userId,
          cliqk_type: cliqk_type,
        });
        if (data.length == 1) {
          return res.send({
            status: 0,
            message: "you are already created bussines sction",
          });
        }
      } else {
        const datas = await createCliqkData.find({
          userObjId: userId,
          cliqk_type: cliqk_type,
        });
        console.log("datas=>>>>>>>>>>>>>>", datas);
        if (datas.length == 1) {
          return res.send({
            status: 0,
            message: "you are already created private section",
          });
        }
      }
    }
  } catch (error) {
    res.send({ status: 0, message: "Somthing wents wrong" });
    console.log(error);
  }
};

// delete_member_single_member
exports.delete_member = async (req, res, next) => {
  try {
    const section_id = mongoose.Types.ObjectId(req.body.section_id);
    const user_id = req.user.id;

    const community_Members_id = req.body.community_Members_id;

    const find_remove_user = await userData.findById({
      _id: community_Members_id,
    });

    const remove_from_community = await createCliqkData
      .findByIdAndUpdate(
        { _id: section_id },
        {
          $pull: {
            community_Members: mongoose.Types.ObjectId(community_Members_id),
          },
        },
        { new: true }
      )
      .exec();
    res.send({ status: 1, message: "member remove from section successfully" });
  } catch (error) {
    res.send({ status: 0, message: "Somthing wents wrong" });
    console.log(error);
  }
};

// section search
exports.find_section = async (req, res, next) => {
  try {
    const search = req.body.search;
    // const find_section = await createCliqkData.findOne({ $or: [{ unique_id: search }, { communityName: search }] }).exec()

    const find_section = await createCliqkData
      .find({
        $or: [
          { cliqk_type: "bussiness" },
          { communityName: { $regex: req.body.search, $options: "i" } },
        ],
      })
      .skip(0)
      .limit(10);

    if (find_section.length)
      if (find_section.subscrition_type === "free") {
        return res.send({
          status: 1,
          message: "This Section Is Free Go And Joining Directly",
        });
      } else {
        res.send({
          status: 1,
          message: "section search successfully",
          data: find_section,
        });
      }
  } catch (error) {
    console.log(error);
    res.send({ status: 0, message: error.message });
  }
};

exports.searchScreen = async (req, res, next) => {
  // console.log('aydahbd',req.params.key);

  try {
    const user_Id = req.user._id;
    // const { Current_latitude, Current_longitude } = req.body

    const user = await userdata
      .find({
        $or: [
          { fullname: { $regex: req.body.key, $options: "i" } },
          { username: { $regex: req.body.key, $options: "i" } },
        ],
      })
      .skip(0)
      .limit(10);

    const community = await communityData
      .find({
        $or: [{ communityName: { $regex: req.body.key, $options: "i" } }],
      })
      .skip(0)
      .limit(10);

    res.send({ Data: user, community });
  } catch (error) {
    res.send({ status: 0, message: "Somthing wents wrong" });
    console.log(error);
  }
};

// joincommunity_list
exports.all_join_section_list = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const all_join_section_list = await createCliqkData.aggregate([
      { $match: { community_Members: user_id } },

      {
        $project: {
          _id: 1,
          communityImage: 1,
          communityName: 1,
          subscrition_type: 1,
          is_public: 1,
          // 'community_details.aboutCommunity': 1,
        },
      },
    ]);

    res.send({
      data: all_join_section_list,
      status: 1,
      message: "join section all list fatch sucessfully",
    });
  } catch (error) {
    console.log(error);
    res.send({ status: 0, message: "Somthing wents wrong" });
  }
};

//delete
exports.deleteBanner = async (req, res, next) => {
  try {
    const delBanner = await bannerData.findByIdAndRemove(req.params.id);

    let url_path = delBanner.image;

    let imagePath = path.basename(url_path);

    const params = {
      Bucket: "soundbiz",
      Key: `${imagePath}`,
    };
    //const deleteS3 = s3.deleteObject(params)

    s3.deleteObject(params, (error, data) => {
      if (error) {
        console.log(error);
        res.redirect(liveFolder.liveFolder + "/banner_image");
      }
      res.redirect(liveFolder.liveFolder + "/banner_image");
    });
    console.log(delBanner);
    //res.redirect(liveFolder.liveFolder + '/banner_image')
  } catch (error) {
    res.send({ status: 0, message: "Something went wrong" });
  }
};

exports.delete_single_imageeee = async (req, res, next) => {
  try {
    const imageId = req.body.imageId;
    const commuId = req.body.commuId;
    const url_path = req.body.url_path;

    let imagePath = path.basename(url_path);
    const communityData = await createCliqkData.findById({ _id: commuId });
    const array = communityData.communityImage;

    const resut = await createCliqkData.findByIdAndUpdate(
      { _id: commuId },
      { $pull: { communityImage: { _id: imageId } } }
    );
    if (resut) {
      const params = {
        Bucket: "clickq-app",
        Key: `${imagePath}`,
      };

      console.log("params=>>", params);
      s3.deleteObject(params, (error, data) => {
        if (error) {
          console.log("error=>>", error);
        } else {
          console.log("data=>>", data);
        }
      });
    }
    res.send({ status: 1, message: "single image deleted successfully" });
  } catch (error) {
    console.log(error);
    res.send({ status: 0, message: "Somthing wents wromg" });
  }
};

// suggestions community code (change section key code)
exports.change_section_key_code = async (req, res, next) => {
  try {
    var codes = [];
    for (var i = 0; i < 4; i++) {
      var unique_id = otpGenerator.generate(10, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });
      codes.push(unique_id);
    }
    res.send({
      data: codes,
      status: 1,
      message: "Autogenerate Sections Key Codes",
    });
  } catch (error) {
    console.log(error);
    res.send({ status: 0, message: "Somthing wents wrong" });
  }
};

// change section key code update
exports.update_Key_code = async (req, res, next) => {
  try {
    const section_id = req.body.section_id;
    const unique_code = req.body.unique_code;

    const chake_unique = await createCliqkData.findOne({
      unique_id: unique_code,
    });

    if (chake_unique) {
      return res.send({
        status: 0,
        message: "This Section Key Code Is Already Given",
      });
    } else {
      const update_Key_code = await createCliqkData.findByIdAndUpdate(
        { _id: section_id },
        { unique_id: unique_code },
        { new: true }
      );
      console.log("update_Key_code=>>", update_Key_code);
      if (update_Key_code) {
        res.send({
          data: update_Key_code,
          status: 1,
          message: "Your Section Key Code Updated Successfully",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.send({ status: 0, message: "Somthing wents wrong" });
  }
};

// cancel_request
// 0 = pending
// 1 = rejects
// 2 = accept
exports.cancel_join_section_request = async (req, res, next) => {
  try {
    // admin_id = sender_id
    // to_user_id  = reciver is
    const current_user = req.user._id;
    const section_id = req.body.section_id;

    const send_request = await send_Community_NotificationData.findOne({
      Comminity_Id: section_id,
      community_Admin_Id: current_user,
      send_by: "by_user",
      request_status: 0,
    });

    if (send_request.request_status === 2) {
      return res.send({ status: 0, message: "You Are Can Not Cancel Request" });
    } else {
      const find_in_notification = await notification.findOne({
        module_id: send_request._id,
      });

      const remove_request = await send_Community_NotificationData.findOne({
        _id: send_request._id,
      });

      if (find_in_notification && remove_request) {
        await notification.findByIdAndRemove(send_request._id);
        await send_Community_NotificationData.findOneAndRemove({
          module_id: send_request._id,
        });

        res.send({ status: 1, message: "Cancel Request Successfully" });
      }
    }
  } catch (error) {
    console.log("error=>>", error);
    res.send({ status: 0, message: "Somthing wents wrong" });
  }
};

// free_section_join
exports.Join_free_section = async (req, res, next) => {
  try {
    const _id = req.body._id;
    const user_id = req.user._id;
    const userObjId = req.body.userObjId;
    const already_join = await createCliqkData.findOne({
      _id: _id,
      community_Members: { $in: user_id },
    });

    if (already_join) {
      return res.send({ status: 0, message: "Already Join This Section" });
    } else {
      const section_admin = await userData.findOne({ _id: userObjId });

      var message = {
        to: section_admin.device_Token /*device_Id*/,
        priority: "high",
        notification: {
          title: "CLIQK",
          body: `${req.user.username}` + "Accepted Your Community Request",
          sound: "default",
        },
      };

      fcm.send(message, async (err, response) => {
        console.log("response=>>", response);
        console.log("error", err);
      });

      // already requested
      // send_Community_NotificationData
      const alreadyRequested = await notification.findOne({
        community_id: _id,
        user_id: user_id,
      });
      console.log("alreadyRequested", alreadyRequested);
      if (alreadyRequested) {
        await notification.findOneAndRemove({ _id: alreadyRequested._id });
      }
      const sectionNotification = await send_Community_NotificationData.findOne(
        { Comminity_Id: _id, ReciverId: user_id }
      );
      console.log("sectionNotification", sectionNotification);
      if (sectionNotification) {
        await notification.findOneAndRemove({ _id: sectionNotification._id });
      }
      const add_member = await createCliqkData.findByIdAndUpdate(
        { _id: _id },
        { $push: { community_Members: user_id } },
        { new: true }
      );
      const add_followers = await createCliqkData.findByIdAndUpdate(
        { _id: _id },
        { $push: { followersList: user_id } },
        { new: true }
      );

      if (add_member) {
        // const scoresData =
        //   {
        //     score: 10,
        //     userId: user_id,
        //     scoreFor: "join_member",
        //   }
        // const sectionId = add_member._id;
        // const scoreFor = "join_member";
        // await socialScores(sectionId, scoresData, scoreFor);
        // const sectionsFind = await createCliqkData.findOne({ _id: sectionId });
        // sectionsFind.xp = calculateXP(sectionsFind.socialScore);
        // await sectionsFind.save();
        // const userId = add_member.userObjId;
        // const userSocialScore = {
        //   score: 10,
        //   userId: user_id,
        //   scoreFor: "join_member",
        // };
        // await userProfileScore(userId, userSocialScore, scoreFor);
        // const findUsers = await userData.findOne({ _id: userId });
        // findUsers.xp = calculateXP(sectionsFind.socialScore);
        // await findUsers.save();
        return res.send({ status: 1, message: "Join Section Successfully" });
      }
      // return res.send({ status: 1, message: "Join Community Successfully" })
    }
  } catch (error) {
    console.log("error=>>", error);
    res.send({ status: 0, message: "Somthing wents wrong" });
  }
};

// section member
exports.sectionMember = async (req, res, next) => {
  try {
    const sectionId = mongoose.Types.ObjectId(req.body.sectionId);

    const sectionMembersList = await createCliqkData.aggregate([
      {
        $match: { _id: sectionId },
      },
      {
        $lookup: {
          from: "userdatas",
          localField: "community_Members",
          foreignField: "_id",
          as: "community_Members",
        },
      },
    ]);

    const MembersList = Object.assign({}, ...sectionMembersList);

    let Members = [];
    MembersList.community_Members.map((members) => {
      obj = {};

      obj._id = members._id;
      obj.fullname = members.fullname;
      obj.image = members.image;

      Members.push(obj);
    });
    res.send({
      status: 1,
      message: "Community MemberList Fatch Successfully",
      data: Members,
    });
  } catch (error) {
    res.send({ status: 0, message: "Somthing wents wrong" });
    console.log(error);
  }
};

// send request using section key code
// exports.send_request_using_section_key_code = async (req,res,next)=>{
//     try {
//         const unique_id = req.body.unique_id

//         const find_section = await createCliqkData.findOne({unique_id :unique_id })
//         console.log("find_section=>>" ,find_section)

//     }
//     catch(error)
//     {
//         console.log("error=>>"  ,error)
//     }
// }

// joinPrivateSection
exports.joinPrivateSection = async (req, res, next) => {
  try {
    const keyCode = req.body.keyCode;
    const userId = req.user._id;

    const findSection = await createCliqkData.findOne({ unique_id: keyCode });

    if (findSection === null) {
      return res.send({ status: 0, message: "Section not found" });
    }

    if (findSection.cliqk_type !== "private") {
      return res.send({ status: 0, message: "This section is not private" });
    }

    if (findSection) {
      const alreadyInSection = await createCliqkData.findOne({
        unique_id: keyCode,
        community_Members: { $in: req.user._id },
      });
      if (alreadyInSection) {
        return res.send({ status: 0, message: "Already Join This Section" });
      } else {
        if (userId === findSection.userObjId) {
          return res.send({ status: 0, message: "Something Wents Wrong" });
        }

        const findSectionOwner = await userData.findOne({
          _id: findSection.userObjId,
        });
        const badgeCount = findSectionOwner.badgeCount;

        const send_Notification = new send_Community_NotificationData({
          Comminity_Id: findSection._id,
          ReciverId: findSection.userObjId,
          senderId: userId,
          is_Accept: false,
          request_status: 3,
          send_by: "by_user",
        });
        await send_Notification.save();

        updateBadgeCount(findSectionOwner._id);

        const projectId = process.env.PROJECTID;
        if (!projectId) {
          throw new Error("Project ID is not defined.");
        }

        const accessToken = await getAccessToken();

        const title = "CLIQK";
        const body = `${req.user.username} sent you a request to join ${findSection.communityName} section.`;

        let count = 1;
        var notification_count = await notification.countDocuments({
          user_id: findSection.userObjId,
          is_Shown: true,
        });
        if (notification_count > 0) {
          count = notification_count + 1;
        }

        const message = {
          message: {
            token: findSectionOwner.device_Token,
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

        if (findSectionOwner.device_Token && findSectionOwner.appNotification) {
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

        const send_notification = new notification({
          community_id: findSection._id,
          sender_id: userId,
          user_id: findSection.userObjId,
          notification_message: message.notification.body,
          notification_type: 5,
          module_id: send_Notification._id,
          module_type: "community_request",
          requestSendBy: "user",
        });
        send_notification.save();
        res.send({
          status: 1,
          message: "Request Sent Successfully For Join Section",
        });
      }
    }
  } catch (error) {
    console.log("error=>>>>>", error);
    res.send({ status: 0, message: "Somthing wents wrong" });
  }
};
// members search by name
exports.membersSearchByName = async (req, res, next) => {
  try {
    const userName = req.body.userName;
    const membersSearchByName = await userData
      .find({
        $or: [
          // { "_id": { $ne: req.user._id } },
          { username: { $regex: userName, $options: "i" } },
        ],
      })
      .skip(0)
      .limit(10);

      // const msectionSearchByName = await createCliqkData
      // .find({
      //   $or: [
      //     // { "_id": { $ne: req.user._id } },
      //     { communityName: { $regex: userName, $options: "i" }}
      //   ],
      // })
      // .skip(0)
      // .limit(10);

      const msectionSearchByName = await createCliqkData.aggregate([
        {
          $match: {
            communityName: { $regex: userName, $options: "i" }
          }
        },
        {
          $lookup: {
            from: "userdatas",
            localField: "community_Members",
            foreignField: "_id",
            as: "Members"
          }
        },
        {
          $project: {
            communityId: 1,
            communityName: 1,
            communityImage: 1,
            is_public: 1,
            userObjId: 1,
            unique_id: 1,
            aboutCommunity: 1,
            socialScore: 1,
            xp: 1,
            dualTimeLine: 1,
            "Members._id": 1,
            "Members.username": 1,
            "Members.image": 1,
            "Members.user_Id": 1,
            count: 1,
            subscrition_type: 1,
            Amount: 1,
            timescale: 1,
            cliqk_type: 1,
            xp: 1,
            socialScore: 1,
            Members_count: {
              $size: "$Members"
            },
            followersList: 1,
            followersCount: {
              $size: "$followersList"
            }
          }
        },
        { $skip: 0 },
        { $limit: 10 }
      ]);
      
      

    const user = [];
    membersSearchByName.map((item) => {
      const obj = {};
      obj._id = item._id;
      obj.fullname = item.fullname
      obj.username = item.username;
      obj.image = item.image;
      user.push(obj);
    });
    res.send({ status: 1, message: "Member List ", data: user , msectionSearchByName });
  } catch (error) {
    res.send({ status: 0, message: "Something went wrong" });
  }
};
// update bussiness section
exports.updateBussinessSection = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sectionId = mongoose.Types.ObjectId(req.body.sectionId);

    const sectionFind = await createCliqkData.findOne({ _id: sectionId });

    if (sectionFind === null) {
      return res.send({ status: 0, message: "Section not found" });
    } else {
      if (sectionFind.userObjId.toString() !== userId.toString()) {
        return res.send({
          status: 0,
          message: "You are not allowed to update this section",
        });
      } else {
        if (req.files) {
          let imageArray1 = [];

          for (
            let index = 0;
            index < sectionFind.communityImage.length;
            index++
          ) {
            var image = sectionFind.communityImage[index].image;
            var image_id = sectionFind.communityImage[index]._id;

            obj = { image, image_id };
            // console.log('object is here', obj);

            imageArray1.push(obj);
          }

          var imageArray2 = [];

          for (let i = 0; i < req.files.length; i++) {
            imageArray2.push({ image: req.files[i].location });
          }
          let communityImage = imageArray1.concat(imageArray2);

          const updateBussinessSection =
            await createCliqkData.findByIdAndUpdate(
              { _id: sectionId },
              {
                communityImage: communityImage,
                aboutCommunity: req.body.aboutCommunity,
                communityName: req.body.communityName,
                dualTimeLine: req.body.dualTimeLine,
              }
            );

          return res.send({
            status: 1,
            message: "Bussiness section updated successfully",
          });
        } else {
          const updateBussinessSection =
            await createCliqkData.findByIdAndUpdate(
              { _id: sectionId },
              {
                aboutCommunity: req.body.aboutCommunity,
                communityName: req.body.communityName,
                dualTimeLine: req.body.dualTimeLine,
              }
            );

          return res.send({
            status: 1,
            message: "Bussiness section updated successfully",
          });
        }
      }
    }
  } catch (error) {
    console.log("error=>>>> ", error);
    return res.send({ status: 0, message: "Something went wrong" });
  }
};

// remove Single imges on s3
exports.removeSectionSingleImage = async (req, res, next) => {
  try {
    const SectionId = mongoose.Types.ObjectId(req.body.SectionId);

    const imageId = req.body.imageId;
    const urlPath = req.body.urlPath;

    let imagePath = path.basename(urlPath);

    const sectionFine = await createCliqkData.findOne({ _id: SectionId });

    if (sectionFine === null) {
      return res.send({ status: 0, message: "Section not found" });
    } else {
      const result = await createCliqkData.findByIdAndUpdate(
        { _id: SectionId },
        { $pull: { communityImage: { _id: imageId } } },
        { new: true }
      );
      if (result) {
        const params = {
          Bucket: "clickq-app",
          Key: `${imagePath}`,
        };

        console.log("params=>>", params);
        s3.deleteObject(params, (error, data) => {
          if (error) {
            console.log("error=>>", error);
            return res.send({ status: 0, message: "Something went wrong" });
          } else {
            console.log("data=>>", data);
            return res.send({
              status: 1,
              message: "Single image removed successfully",
            });
          }
        });
      }
    }
  } catch (error) {
    res.send({ Status: 0, message: "Something went wrong" });
    console.log(error);
  }
};

// updatePrivateSection
exports.updatePrivateSection = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sectionId = req.body.sectionId;

    const findSection = await createCliqkData.findOne({
      userObjId: userId,
      _id: sectionId,
    });

    if (findSection === null) {
      return res.send({ status: 0, messsage: "No section found" });
    } else {
      if (findSection.cliqk_type !== "private") {
        return res.send({ status: 0, messsage: "Section is not private" });
      }

      if (req.files) {
        let imageArray1 = [];

        for (
          let index = 0;
          index < findSection.communityImage.length;
          index++
        ) {
          var image = findSection.communityImage[index].image;
          var image_id = findSection.communityImage[index]._id;

          obj = { image, image_id };
          imageArray1.push(obj);
        }

        var imageArray2 = [];

        for (let i = 0; i < req.files.length; i++) {
          imageArray2.push({ image: req.files[i].location });
        }
        const communityImage = imageArray1.concat(imageArray2);

        const updatePrivateSection = await createCliqkData.findOneAndUpdate(
          { _id: sectionId },
          {
            communityImage: communityImage,
            aboutCommunity: req.body.aboutCommunity,
            communityName: req.body.communityName,
          }
        );
        return res.send({
          status: 1,
          message: "Private section updated successfully",
        });
      } else {
        const updateBussinessSection = await createCliqkData.findByIdAndUpdate(
          { _id: sectionId },
          {
            aboutCommunity: req.body.aboutCommunity,
            communityName: req.body.communityName,
          }
        );
        return res.send({
          status: 1,
          message: "Private section updated successfully",
        });
      }
    }
  } catch (error) {
    console.log("error=>>>>", error);
    res.send({ status: 0, message: "Something went wrong" });
  }
};

// deleteSection
exports.deleteSection = async (req, res, next) => {
  try {
    const sectionId = req.body.sectionId;
    const userId = req.user._id;
    const findSection = await createCliqkData.findOne({ _id: sectionId });

    if (findSection === null) {
      return res.send({ status: 0, message: "Section not found" });
    } else {
      if (findSection.userObjId.toString() !== userId.toString()) {
        return res.send({ status: 0, message: "Can not delete this section" });
      }

      if (
        findSection.cliqk_type === "bussiness" &&
        findSection.subscrition_type === "paid"
      ) {
        return res.send({ status: 0, message: "This section paid" });
      } else {
        const deleteSection = await createCliqkData.findOneAndRemove({
          _id: sectionId,
        });
        const requestDelet = await send_Community_NotificationData.deleteMany({
          Comminity_Id: mongoose.Types.ObjectId(sectionId),
        });
        const deleteNotifications = await notification.deleteMany({
          community_id: mongoose.Types.ObjectId(sectionId),
        });
        return res.send({ status: 1, message: "Section deleted successfully" });
      }
    }
  } catch (error) {
    console.log("error=>>>>", error);
    res.send({ status: 0, message: "Something went wrong" });
  }
};

async function updateBadgeCount(userId) {
  // Increment badge count by 1 for the user
  await userData.updateOne({ _id: userId }, { $inc: { badgeCount: 1 } });
}

exports.followUnfollowSection = async (req, res, next) => {
  try {
    const sectionId = req.body.sectionId;
    const userId = req.user._id;

    if (!sectionId) {
      return res.status(400).json({ status: 0, message: "Section ID is required." });
    }

    // Convert userId to ObjectId to match the database format
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const findSection = await createCliqkData.findById(sectionId);
    
    if (!findSection) {
      return res.status(404).json({ status: 0, message: "Section not found." });
    }

    const sectionOwner = findSection.userObjId
    const sectionName = findSection.communityName

    console.log("Current Followers List:", findSection.followersList);

    // Check if the user is already in followersList
    const isFollowing = findSection.followersList.some(follower => follower.equals(userObjectId));

    if (isFollowing) {
      // Unfollow: Remove user from followersList
      await createCliqkData.findByIdAndUpdate(
        sectionId,
        { $pull: { followersList: userObjectId } },
        { new: true }
      );

       // Remove the follow notification
  await notification.findOneAndDelete({
    sender_id: userId,
    user_id: sectionOwner,
    module_id: sectionId,
    module_type: "Follow",
    notification_type: 13
  });

      return res.status(200).json({ status: 1, message: "Unfollowed successfully." });
    } else {
      // Follow: Add user to followersList
      await createCliqkData.findByIdAndUpdate(
        sectionId,
        { $addToSet: { followersList: userObjectId } },
        { new: true }
      );


      await followSection(userId ,sectionOwner , sectionId ,sectionName )

      return res.status(200).json({ status: 1, message: "Followed successfully." });
    }
  } catch (error) {
    console.error("Error in follow/unfollow:", error);
    return res.status(500).json({ status: 0, message: "Internal server error." });
  }
};

const followSection = async (userId ,sectionOwner , sectionId ,sectionName  )=>{
  try {
    const currentUser = await userData.findById(userId)
    const username = currentUser.username
    const user_deviceid = await userData.findById(sectionOwner);
    const badgeCount = user_deviceid.badgeCount;

    const projectId = process.env.PROJECTID;
    if (!projectId) {
      throw new Error("Project ID is not defined.");
    }
  
    const accessToken = await getAccessToken();


    const title = "CLIQK";
    const body = `${username} has followed your '${sectionName}' section.`;

    let count = 1;
    var notification_count = await notification.countDocuments({
      user_id: sectionOwner,
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
      sectionOwner.toString() !== userId.toString() &&
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
      community_id: sectionId,
      sender_id: userId,
      user_id: sectionOwner,
      notification_message: `${username} has followed your '${sectionName}' section.`,
      notification_type: 13,
      module_id: sectionId,
      module_type: "Follow",
    });
    await send_notification.save();
  }
  catch(error) {
    console.log("error" , error)
  }

}


exports.followersForSection = async (req, res, next) => {
  try {
    const sectionId = req.body.sectionId;

    if (!sectionId) {
      return res.send({ status: 0, message: "Section ID is required." });
    }

    const findSection = await createCliqkData
    .findOne({ _id: sectionId })
    .populate({
      path: "followersList",
      select: "_id image username fullname",
      match: { isFollowing: true } // Agar aapke model me 'isFollowing' jaisa field hai
    });



    // Fix: Correct the condition to check if section is NOT found
    if (!findSection) {
      return res.send({ status: 0, message: "Section not found." });
    }

    return res.send({
      status: 1,
      message: "Follow list fetched successfully.",
      data: findSection.followersList,
    });
  } catch (error) {
    console.log("Error:", error);
    return res.send({ status: 0, message: "Internal server error." });
  }
};

exports.removeFollowerFromSection = async (req, res, next) => {
  try {
    const { sectionId, followerId } = req.body;
    const ownerId = req.user._id; // Assuming you have authentication middleware

    if (!sectionId || !followerId) {
      return res.send({
        status: 0,
        message: "Section ID and Follower ID are required.",
      });
    }

    // Find the section and check ownership
    const section = await createCliqkData.findOne({ _id: sectionId });

    if (!section) {
      return res.send({ status: 0, message: "Section not found." });
    }

    if (String(section.userObjId) !== String(ownerId)) {
      return res.send({
        status: 0,
        message: "You are not the owner of this section.",
      });
    }

    // Remove follower from the list
    await createCliqkData.updateOne(
      { _id: sectionId },
      { $pull: { followersList: followerId } }
    );

    return res.send({
      status: 1,
      message: "Follower removed successfully.",
    });
  } catch (error) {
    console.log("Error:", error);
    return res.send({ status: 0, message: "Internal server error." });
  }
};


exports.sectionForScenario = async (req, res, next) => {
  try {
    const type = req.body.type;
    const currentUserId = req.user._id;

    const SectionTypes = {
      TRENDING: "trending",
      WEEKLY_GROWTH: "weekly_growth",
      TOP_SECTIONS: "top_sections",
      MOST_FOLLOWED: "most_followed"
    };

    if (!Object.values(SectionTypes).includes(type)) {
      return res.send({ status: 0, message: "Invalid type provided." });
    }

    let data = [];

    if (type === SectionTypes.TRENDING) {
      // Trending: Views from today's midnight to next midnight
      const start = moment().startOf('day').toDate();
      console.log("start" ,start)

      const end = moment().endOf('day').toDate();
      console.log("end" ,end)

      data = await createCliqkData.find({
        updatedAt: { $gte: start, $lte: end }
      })
      .sort({ viewsCount: -1 })
      .limit(10);

    } else if (type === SectionTypes.WEEKLY_GROWTH) {
      // Weekly Growth: Last Monday to last Sunday
      const today = moment();
      const lastMonday = today.clone().startOf('isoWeek').subtract(1, 'weeks').toDate();
      const lastSunday = today.clone().endOf('isoWeek').subtract(1, 'weeks').toDate();

      data = await createCliqkData.find({
        updatedAt: { $gte: lastMonday, $lte: lastSunday }
      })
      .sort({ socialScore: -1 })
      .limit(10);

    } else if (type === SectionTypes.TOP_SECTIONS) {
      // Top Sections: followers count + socialScore
      data = await createCliqkData.aggregate([
        {
          $addFields: {
            scoreCombo: {
              $add: [
                { $size: "$followersList" },
                "$socialScore"
              ]
            }
          }
        },
        { $sort: { scoreCombo: -1 } },
        { $limit: 10 }
      ]);

    } else if (type === SectionTypes.MOST_FOLLOWED) {
      // Most Followed: Just follower count
      data = await createCliqkData.aggregate([
        {
          $addFields: {
            followersCount: { $size: "$followersList" }
          }
        },
        { $sort: { followersCount: -1 } },
        { $limit: 10 }
      ]);
    }

    return res.send({
      status: 1,
      message: `${type.replace("_", " ")} sections fetched successfully.`,
      data: data
    });

  } catch (error) {
    console.error("Discovery Error:", error);
    return res.status(500).send({ status: 0, message: "Something went wrong." });
  }
};


exports.getTopSectionsBySocialScore = async (req, res, next) => {
  try {
    const topLimit = parseInt(req.body.limit) || 10;

    // Fetch all sections with populated user data, sorted by socialScore
    const allSections = await createCliqkData.find(
      {},
      {
        communityName: 1,
        communityImage: 1,
        socialScore: 1,
        xp: 1,
        viewsCount: 1,
        followersList: 1,
        unique_id: 1,
        userObjId: 1
      }
    )
      .populate("userObjId", "fullname username image email") // Include only necessary user fields
      .sort({ socialScore: -1 });

    const topSections = [];

    allSections.forEach((section, index) => {
      const position = index + 1;

      if (position <= topLimit) {
        topSections.push({
          _id: section._id,
          unique_id: section.unique_id,
          communityName: section.communityName,
          communityImage: section.communityImage,
          socialScore: section.socialScore,
          xp: section.xp,
          viewsCount: section.viewsCount,
          followersCount: section.followersList?.length || 0,
          position,
          user: section.userObjId
          ? {
            _id: section.userObjId._id || "",
            fullname: section.userObjId.fullname || "",
            username: section.userObjId.username ||"" ,
            profileImage: section.userObjId.image || "",
            email: section.userObjId.email || ""
          }
            : null
        });
      }
    });

    return res.status(200).json({
      status: 1,
      message: "Sections fetched successfully",
      data: topSections
    });
  } catch (error) {
    console.error("Error fetching section rankings:", error);
    return res.status(500).json({ status: 0, message: "Server error" });
  }
};