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
const moment = require("moment"); // Make sure moment is installed
const { google } = require("googleapis");
// const admin = require("firebase-admin");
const axios = require("axios");
const dotenv = require("dotenv");
// const serviceAccount = require("../../../cliqk-e25f0-firebase-adminsdk-vedtf-7eb62187c9.json");

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

// Import new social score calculator
const socialScoreCalculator = require("../../../utils/socialScoreCalculator");

// const sectionSocialScores = async (sectionId, scoresData, scoreFor) => {
//   try {
//     const scoreMap = {
//       accept_Request: 10,
//       followRequest: 5,
//       viewSection: 1, // 👈 Add this
//     };

//     const scoreToAdd = scoreMap[scoreFor];
//     if (scoreToAdd === undefined) return;

//     const existingSection = await csectionSocialSData.findOne({ sectionId });
//     const sectionFind = await createCliqkData.findById(sectionId);

//     if (sectionFind) {
//       sectionFind.socialScore += scoreToAdd;
//       const xper = await calculateXP(sectionFind.socialScore);
//       sectionFind.xp = xper.xp;
//       await sectionFind.save();
//     }

//     if (existingSection) {
//       existingSection.scoresData.push(scoresData);
//       await existingSection.save();
//     } else {
//       const newSection = new csectionSocialSData({ sectionId, scoresData });
//       await newSection.save();
//     }
//   } catch (error) {
//     console.error("Error in sectionSocialScores:", error);
//   }
// };


// Section social score handler -> now delegates to centralized calculator
const sectionSocialScores = async (sectionId, scoresData, scoreFor) => {
  try {
    switch (scoreFor) {
      case "accept_Request":
        return await socialScoreCalculator.updateSectionSocialScore(
          sectionId,
          "NEW_MEMBER_ACCEPTED_INTO_SECTION"
        );
      case "followRequest":
        return await socialScoreCalculator.updateSectionSocialScore(
          sectionId,
          "NEW_FOLLOWER_OF_SECTION"
        );
      case "viewSection":
        // use a viewCount of 10 to award +1 (aligns with calculator rule)
        return await socialScoreCalculator.updateSectionSocialScore(
          sectionId,
          "VIEWS_ON_SECTION",
          { viewCount: 10 }
        );
      default:
        console.warn("Unknown section scoreFor:", scoreFor);
        return null;
    }
  } catch (error) {
    console.error("❌ Error in sectionSocialScores:", error);
    return null;
  }
};


// Function to update user profile scores
// const userProfileScore = async (userId, scoresData, scoreFor) => {
//   try {
//     const scoreMap = {
//       accept_Request: 10,
//       followRequest: 1,
//       viewSection: 1, // 👈 Add this
//     };

//     const scoreToAdd = scoreMap[scoreFor];
//     if (scoreToAdd === undefined) return;

//     const existingUser = await playerSocialScore.findOne({ userId });
//     const userFind = await userData.findById(userId);

//     if (userFind) {
//       userFind.socialScore += scoreToAdd;
//       const xper = await calculateXP(userFind.socialScore);
//       userFind.xp = xper.xp;
//       await userFind.save();
//     }

//     if (existingUser) {
//       existingUser.scoresData.push(scoresData);
//       await existingUser.save();
//     } else {
//       const newUser = new playerSocialScore({ userId, scoresData });
//       await newUser.save();
//     }
//   } catch (error) {
//     console.error("Error in userProfileScore:", error);
//   }
// };


// User social score handler -> now delegates to centralized calculator
const userProfileScore = async (userId, scoresData, scoreFor) => {
  try {
    switch (scoreFor) {
      case "accept_Request":
      case "followRequest":
        return await socialScoreCalculator.updateUserSocialScore(
          userId,
          "FOLLOW_A_SECTION"
        );
      case "viewSection":
        // optionally track user view contribution; map to views on content
        return await socialScoreCalculator.updateUserSocialScore(
          userId,
          "VIEWS_ON_CONTENT",
          { viewCount: 10 }
        );
      default:
        console.warn("Unknown user scoreFor:", scoreFor);
        return null;
    }
  } catch (error) {
    console.error("Error in userProfileScore:", error);
    return null;
  }
};


// Function to calculate XP
const calculateXP = (socialScore) => {
  let xp = 1;
  let accumulatedPoints = 0;

  // Early levels (1 → 10)
  for (let level = 1; level <= 10; level++) {
    const pointsNeeded = level * 10;

    if (socialScore < accumulatedPoints + pointsNeeded) {
      xp = level;
      return {
        xp,
        nextThreshold: accumulatedPoints + pointsNeeded,
      };
    }

    accumulatedPoints += pointsNeeded;
  }

  // After level 10 → fixed +100 per level
  const extraPoints = socialScore - accumulatedPoints;

  if (extraPoints >= 0) {
    xp = 10 + Math.floor(extraPoints / 100) + 1;
    const nextThreshold =
      accumulatedPoints + (xp - 10) * 100;

    return { xp, nextThreshold };
  }

  return { xp, nextThreshold: accumulatedPoints };
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
    // Invited users - will get notification, added as members only when they accept
    const invitedUserIds = JSON.parse(req.body.community_Members || "[]");
    // Only creator is member initially; others join when they accept invitation
    const membersForDb = [mongoose.Types.ObjectId(userId)];
    var createCommunity;

    // const cliqk = await createCliqkData.find({ userObjId: userId }).lean();

    // if (cliqk.length === 2) {
    //   return res.send({
    //     status: 0,
    //     message: "you have already created 2 sections",
    //   });
    // }

    // if (cliqk.length > 0) {
    //   const data = await createCliqkData.find({
    //     userObjId: userId,
    //     cliqk_type: cliqk_type,
    //   });
    //   if (data.length == 1) {
    //     return res.send({
    //       status: 0,
    //       message: "you have already created bussines sction",
    //     });
    //   }

    //   const datas = await createCliqkData.find({
    //     userObjId: userId,
    //     cliqk_type: cliqk_type,
    //   });
    //   if (datas.length == 1) {
    //     return res.send({
    //       status: 0,
    //       message: "you have already created private section",
    //     });
    //   }
    // }

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
      for (let index = 0; index < invitedUserIds.length; index++) {
        var element = invitedUserIds[index];
        var id = mongoose.Types.ObjectId(element);
        const data = await userData.findById({ _id: id });
        all_Users.push(data);
      }

      createCommunity = await new createCliqkData({
        communityImage: communityImage,
        community_Members: membersForDb,
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
      for (let index = 0; index < invitedUserIds.length; index++) {
        var element = invitedUserIds[index];
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
          community_Members: membersForDb,
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
            community_Members: membersForDb,
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
            community_Members: membersForDb,
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
            community_Members: membersForDb,
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
      // Update user social score for creating a section
      const userScoreResult = await socialScoreCalculator.updateUserSocialScore(
        userId, 
        'FOLLOW_A_SECTION'
      );
      console.log("User social score updated for creating section:", userScoreResult);
      
      // Update section social score for being created
      const sectionScoreResult = await socialScoreCalculator.updateSectionSocialScore(
        createCommunityId.toString(),
        'POSTS_CREATED_IN_SECTION'
      );
      console.log("Section social score updated for creation:", sectionScoreResult);
      
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
      notification_type: 23,
      module_id: send_request._id,
      module_type: "community_request",
      requestSendBy: "sectionOwner",
    });
    await send_notification.save();
  }
};


exports.sectionSharePreview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).send("Invalid section ID");
    }

    // 🔥 Yaha tumhari public API hit hogi
    const response = await axios.get(
      `https://admin.cliqkworld.com/section/public/${id}`
    );

    if (!response.data || response.data.status !== 1) {
      return res.status(404).send("Section not found");
    }

    const section = response.data.data;

    const title = section.title || "Cliqk Section";
    const description = section.description || "Join this section on Cliqk";
    const image =
      section.image || "https://cliqkworld.com/default-preview.png";

    // 🔥 OG Meta HTML Return
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>

        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://cliqkworld.com/s/${id}" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${image}" />

        <meta http-equiv="refresh" content="0; url=https://cliqkworld.com/open-app/s/${id}" />
      </head>
      <body>
        Redirecting...
      </body>
      </html>
    `);
  } catch (error) {
    console.error("sectionSharePreview error:", error);
    return res.status(500).send("Something went wrong");
  }
};


// Get section public info - NO TOKEN required | URL: cliqkworld.com/s/:id
// id can be MongoDB _id or unique_id (section key code)
exports.getSectionPublicInfo = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        status: 0,
        message: "Section ID is required",
      });
    }

    const isObjectId = mongoose.isValidObjectId(id);

    const query = isObjectId
      ? { _id: id }
      : { unique_id: id };

    const section = await createCliqkData.findOne(query)
      .select(
        "_id communityName communityImage aboutCommunity cliqk_type subscrition_type"
      )
      .lean();

    if (!section) {
      return res.status(404).json({
        status: 0,
        message: "Section not found",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Section info fetched successfully",
      data: {
        ...section,
        description: section.aboutCommunity,
      },
    });


  } catch (error) {
    console.error("getSectionPublicInfo error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};


// pagination done
exports.fatchcommunitydata = async (req, res, next) => {
  try {
    const community_Id = mongoose.Types.ObjectId(req.body.community_Id);
    const page = req.body.page || 1;
    const limit = req.body.limit || 10;
    const userId = req.user._id;

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
          unique_id: 1,
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
            $size: "$Members",
          },
          followersList: 1,
          followersCount: {
            $size: "$followersList",
          },
        },
      },
    ]);

    const updatedCommunity = await createCliqkData.findByIdAndUpdate(
      community_Id,
      {
        $inc: { viewsCount: 1 },
        $push: {
          viewsTimeAndDateAndUserId: {
            userId: userId,
            viewedAt: new Date(),
          },
        },
      },
      { new: true }
    );
    
    // Update social scores for section view using new system
    if ((updatedCommunity.viewsCount || 0) % 10 === 0) {
      try {
        // Update user social score for viewing section
        const userScoreResult = await socialScoreCalculator.updateUserSocialScore(
          userId, 
          'VIEW_A_SECTION'
        );
        console.log("User social score updated for viewing section:", userScoreResult);
        
        // Update section social score for being viewed
        const sectionScoreResult = await socialScoreCalculator.updateSectionSocialScore(
          community_Id.toString(),
          'VIEWS_ON_SECTION',
          { viewCount: updatedCommunity.viewsCount }
        );
        console.log("Section social score updated for view:", sectionScoreResult);
      } catch (error) {
        console.error("Error updating social scores for section view:", error);
      }
    }
    

    // ✅ New XP Calculation using social score calculator
    const socialScoreCalculator = require("../../../utils/socialScoreCalculator");
    const data = results[0];
    const sectionData = data.socialScore || 0;

    const xpInfo = socialScoreCalculator.calculateXP(sectionData);

    results.reduce(function (section, item, section) {
      var section = item; //a, b, c
      // keep existing fields, only add new progress fields
      section.xp = xpInfo.xp;
      section.nextThreshold = xpInfo.nextThreshold;
      section.socialScoreLevel = xpInfo.xp;
      section.socialScoreProgress = xpInfo.progress;
      section.socialScoreProgressTotal = xpInfo.totalNeeded;
      section.socialScoreProgressPercentage = xpInfo.progressPercentage;
      section.socialScoreNextThreshold = xpInfo.nextThreshold;
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
          backgroundImageColour: 1,
          dateOfBirth: 1,
          "my_sections._id": 1,
          "my_sections.dualTimeLine": 1,
          "my_sections.communityImage": 1,
          "my_sections.communityName": 1,
          "my_sections.is_public": 1,
          "my_sections.community_Members": 1,
          "my_sections.subscrition_type": 1,
          "my_sections.cliqk_type": 1,
          "my_sections.viewsCount": 1,
          "sections_joined._id": 1,
          "sections_joined.dualTimeLine": 1,
          "sections_joined.communityImage": 1,
          "sections_joined.communityName": 1,
          "sections_joined.is_public": 1,
          "sections_joined.subscrition_type": 1,
          "sections_joined.cliqk_type": 1,
          "sections_joined.viewsCount": 1,

          // "sections_joined.followersList": 1, // Ensure followersList is fetched
          my_section_count: { $size: "$my_sections" },
          sections_joined_count: { $size: "$sections_joined" },
        },
      },
    ]);

    const user = my_profile[0];

    if (!user) {
      return res.send({ status: 0, message: "User not found" });
    }

    // ✅ New XP Calculation using social score calculator
    const socialScoreCalculator = require("../../../utils/socialScoreCalculator");
    const xpInfo = socialScoreCalculator.calculateXP(user.socialScore || 0);

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
      xp: xpInfo.xp,
      nextThreshold: xpInfo.nextThreshold,
      socialScoreLevel: xpInfo.xp,
      socialScoreProgress: xpInfo.progress,
      socialScoreProgressTotal: xpInfo.totalNeeded,
      socialScoreProgressPercentage: xpInfo.progressPercentage,
      socialScoreNextThreshold: xpInfo.nextThreshold,
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
      console.log("User is the section owner, cannot send request.");
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
      notification_message: message.message.notification.body,
      notification_type: 23,
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
    console.log("Error in send_Community_NotificationData:", error);
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
        // reject - remove request and notification
        await send_Community_NotificationData.findByIdAndRemove({
          _id: requestId,
        });
        await notification.findByIdAndRemove({ _id: _id });
        return res.send({ status: 1, message: "Section Request Decline" });
      } else {
        // accept
        await send_Community_NotificationData.findByIdAndUpdate(
          { _id: requestId },
          { request_status: 2, is_Accept: true },
          { new: true }
        );
        // Update notification to show "Section request accepted" - no more Accept/Decline buttons
        await notification.findByIdAndUpdate(
          { _id: _id },
          {
            notification_type: 9,
            notification_message: `You joined ${sectionFind.communityName}`,
            isAction: false,
            is_Shown: false,
          }
        );
        const add_member = await createCliqkData.findByIdAndUpdate(
          { _id: sectionId },
          { $push: { community_Members: currentUserId } },
          { new: true }
        );

        // Updating user and section scores using new system
        // Update user social score for accepting member (currentUserId = user who joined)
        const userScoreResult = await socialScoreCalculator.updateUserSocialScore(
          currentUserId, 
          'NEW_MEMBER_ACCEPTED_INTO_SECTION'
        );
        console.log("User social score updated for accepting member:", userScoreResult);
        
        // Update section social score for new member
        const sectionScoreResult = await socialScoreCalculator.updateSectionSocialScore(
          sectionId.toString(),
          'NEW_MEMBER_ACCEPTED_INTO_SECTION'
        );
        console.log("Section social score updated for new member:", sectionScoreResult);

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
        // reject - remove request and notification
        await send_Community_NotificationData.findByIdAndRemove({
          _id: requestId,
        });
        await notification.findByIdAndRemove({ _id: _id });
        return res.send({ status: 1, message: "Section Request Decline" });
      } else {
        // accept
        await send_Community_NotificationData.findByIdAndUpdate(
          { _id: requestId },
          { request_status: 2, is_Accept: true },
          { new: true }
        );
        // Update notification - show resolved state, no more Accept/Decline buttons
        await notification.findByIdAndUpdate(
          { _id: _id },
          {
            notification_type: 9,
            notification_message: `You accepted request to join ${sectionFind.communityName}`,
            isAction: false,
            is_Shown: false,
          }
        );
        // Add the requesting user as member
        const userToAdd = findRequest.senderId;
        await createCliqkData.findByIdAndUpdate(
          { _id: sectionId },
          { $push: { community_Members: mongoose.Types.ObjectId(userToAdd) } },
          { new: true }
        );
        // Social score updates
        await socialScoreCalculator.updateUserSocialScore(
          userToAdd,
          'NEW_MEMBER_ACCEPTED_INTO_SECTION'
        );
        await socialScoreCalculator.updateSectionSocialScore(
          sectionId.toString(),
          'NEW_MEMBER_ACCEPTED_INTO_SECTION'
        );
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
        user_id: userTokenHere._id,
        notification_message: body,
        notification_type: 9,
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
      // reject - remove request and notification
      await send_Community_NotificationData.findByIdAndRemove({
        _id: requestId,
      });
      await notification.findByIdAndRemove({ _id: _id });
      return res.send({ status: 1, message: "Section Request Decline" });
    } else {
      // accept
      await send_Community_NotificationData.findByIdAndUpdate(
        { _id: requestId },
        { request_status: 2, is_Accept: true },
        { new: true }
      );
      // Update notification to show "Section request accepted" - no more buttons
      await notification.findByIdAndUpdate(
        { _id: _id },
        {
          notification_type: 9,
          notification_message: `You joined ${sectionFind.communityName}`,
          isAction: false,
          is_Shown: false,
        }
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

// my friend profile
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
          socialScore: 1,
          backgroundImageColour: 1,
          "my_sections._id": 1,
          "my_sections.communityImage": 1,
          "my_sections.communityName": 1,
          "my_sections.community_Members": 1,
          "my_sections.followersList": 1,
          "my_sections.xp": 1,
          "my_sections.socialScore": 1,
          "my_sections.viewsCount": 1,
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

    // ✅ New XP Calculation using social score calculator
    const socialScoreCalculator = require("../../../utils/socialScoreCalculator");
    const xpInfo = socialScoreCalculator.calculateXP(data.socialScore || 0);

    var newObj = Object.assign(
      {
        PrivateSectionKeyCode,
        blockUser,
        currentUserBlock,
        xp: xpInfo.xp,
        nextThreshold: xpInfo.nextThreshold,
        socialScoreLevel: xpInfo.xp,
        socialScoreProgress: xpInfo.progress,
        socialScoreProgressTotal: xpInfo.totalNeeded,
        socialScoreProgressPercentage: xpInfo.progressPercentage,
        socialScoreNextThreshold: xpInfo.nextThreshold,
      },
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
exports.notification_list = async (req, res) => {
  try {
    const userId = req.user._id;

    // Mark notifications as read
    await notification.updateMany(
      { user_id: userId, is_Shown: true },
      { $set: { is_Shown: false } }
    );

    // Map numeric notification_type to string types
    const typeMap = {
      1: "follow",
      2: "like",
      3: "comment",
      4: "mention",
      5: "section_invite",
      6: "section_invite",
      7: "comment_reply",
      8: "reaction",
      9: "section_join",
      10: "section_leave",
      11: "section_remove",
      12: "section_admin",
      13: "repost",
      14: "leaderboard",
      15: "level_up",
      16: "social_score",
      17: "weekly_winner",
      18: "weekly_top10",
      19: "weekly_number1",
      20: "section_leaderboard",
      21: "section_weekly_top10",
      22: "section_weekly_number1",
      23: "community_request"  // Added new type for community join requests
    };

    // Get notifications with sender details
    const notificationList = await notification.aggregate([
      {
        $match: {
          user_id: userId,
        },
      },
      {
        $lookup: {
          from: "userdatas",
          localField: "sender_id",
          foreignField: "_id",
          as: "sender",
        },
      },
      { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "createcliqkdatas",
          localField: "community_id",
          foreignField: "_id",
          as: "community",
        },
      },
      { $unwind: { path: "$community", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          user_id: 1,
          sender: {
            _id: "$sender._id",
            fullname: "$sender.fullname",
            username: "$sender.username",
            image: "$sender.image",
            backgroundImageColour: "$sender.backgroundImageColour"
          },
          notification_type: 1,
          notification_message: 1,
          button_show: 1,
          module_id: 1,
          community: {
            _id: "$community._id",
            communityName: "$community.communityName"
          },
          is_Shown: 1,
          requestSendBy: 1,
          requestType: 1,
          createdAt: 1,
          updatedAt: 1,
          type: {
            $switch: {
              branches: Object.entries(typeMap).map(([num, str]) => ({
                case: { $eq: ["$notification_type", parseInt(num)] },
                then: str
              })),
              default: "other"
            }
          },
          title: {
            $switch: {
              branches: [
                { 
                  case: { $eq: ["$notification_type", 23] },  // Community join request
                  then: "Join Request"
                },
                { 
                  case: { $in: ["$notification_type", [5, 6]] }, 
                  then: {
                    $cond: {
                      if: { $ne: ["$community", null] },
                      then: { $concat: ["You've been invited to the section\n", { $ifNull: ["$community.communityName", "New Section"] }] },
                      else: "You've been invited to a section"
                    }
                  }
                },
                { 
                  case: { $eq: ["$notification_type", 2] }, 
                  then: {
                    $ifNull: [
                      "$sender.fullname",
                      { $ifNull: ["$sender.username", "Someone"] }
                    ]
                  }
                },
                { 
                  case: { $eq: ["$notification_type", 3] }, 
                  then: {
                    $ifNull: [
                      "$sender.fullname",
                      { $ifNull: ["$sender.username", "Someone"] }
                    ]
                  }
                },
                { 
                  case: { $eq: ["$notification_type", 4] }, 
                  then: {
                    $ifNull: [
                      "$sender.fullname",
                      { $ifNull: ["$sender.username", "Someone"] }
                    ]
                  }
                },
                { 
                  case: { $eq: ["$notification_type", 13] }, 
                  then: {
                    $ifNull: [
                      "$sender.fullname",
                      { $ifNull: ["$sender.username", "Someone"] }
                    ]
                  }
                },
                { 
                  case: { $eq: ["$notification_type", 8] }, 
                  then: {
                    $ifNull: [
                      "$sender.fullname",
                      { $ifNull: ["$sender.username", "Someone"] }
                    ]
                  }
                },
                { 
                  case: { $eq: ["$notification_type", 7] }, 
                  then: {
                    $ifNull: [
                      "$sender.fullname",
                      { $ifNull: ["$sender.username", "Someone"] }
                    ]
                  }
                },
                { 
                  case: { $eq: ["$notification_type", 1] }, 
                  then: {
                    $ifNull: [
                      "$sender.fullname",
                      { $ifNull: ["$sender.username", "Someone"] }
                    ]
                  }
                },
                { 
                  case: { $eq: ["$notification_type", 14] }, 
                  then: "You hit #1 on the leaderboard!"
                },
                { 
                  case: { $eq: ["$notification_type", 15] }, 
                  then: "Congrats! You levelled up!"
                },
                { 
                  case: { $eq: ["$notification_type", 16] }, 
                  then: "Social Score"
                },
                { 
                  case: { $eq: ["$notification_type", 17] }, 
                  then: "Weekly Winner!"
                },
                { 
                  case: { $eq: ["$notification_type", 18] }, 
                  then: "Weekly Top 10!"
                },
                { 
                  case: { $eq: ["$notification_type", 19] }, 
                  then: "Weekly #1!"
                },
                { 
                  case: { $eq: ["$notification_type", 9] }, 
                  then: "Section Request Accepted"
                }
              ],
              default: "New Notification"
            }
          },
          subtitle: {
            $switch: {
              branches: [
                { 
                  case: { $eq: ["$notification_type", 23] },  // Community join request
                  then: "$notification_message"
                },
                { 
                  case: { $in: ["$notification_type", [5, 6]] }, 
                  then: {
                    $cond: {
                      if: { $ne: ["$community", null] },
                      then: { $concat: ["Section: ", "$community.communityName"] },
                      else: "Section Invitation"
                    }
                  }
                },
                { case: { $eq: ["$notification_type", 2] }, then: "liked your message" },
                { case: { $eq: ["$notification_type", 3] }, then: "commented on your message" },
                { case: { $eq: ["$notification_type", 4] }, then: "mentioned you" },
                { case: { $eq: ["$notification_type", 13] }, then: "reposted your message" },
                { case: { $eq: ["$notification_type", 8] }, then: "reacted to your message" },
                { case: { $eq: ["$notification_type", 7] }, then: "replied to your comment" },
                { case: { $eq: ["$notification_type", 9] }, then: "accepted your section request" },
                { case: { $eq: ["$notification_type", 1] }, then: "started following you" },
                { 
                  case: { $eq: ["$notification_type", 14] }, 
                  then: "Well done, you've reached the top.. real motion!"
                },
                { 
                  case: { $eq: ["$notification_type", 15] }, 
                  then: "Your social score has increased. Keep doing what you're doing.. as its obviously working!"
                },
                { 
                  case: { $eq: ["$notification_type", 16] }, 
                  then: "$notification_message"
                },
                { 
                  case: { $eq: ["$notification_type", 17] }, 
                  then: "Contact admin to claim your reward"
                },
                { 
                  case: { $eq: ["$notification_type", 18] }, 
                  then: "You made the Top 10 this week!"
                },
                { 
                  case: { $eq: ["$notification_type", 19] }, 
                  then: "You finished 1st this week. Big W!"
                }
              ],
              default: "$notification_message"
            }
          },
          icon: {
            $switch: {
              branches: [
                { case: { $eq: ["$notification_type", 2] }, then: "❤️" },
                { case: { $eq: ["$notification_type", 3] }, then: "💬" },
                { case: { $eq: ["$notification_type", 4] }, then: "@️⃣" },
                { case: { $in: ["$notification_type", [5, 6]] }, then: "👥" },
                { case: { $eq: ["$notification_type", 7] }, then: "↩️" },
                { case: { $eq: ["$notification_type", 8] }, then: "👍" },
                { case: { $eq: ["$notification_type", 9] }, then: "✅" },
                { case: { $eq: ["$notification_type", 13] }, then: "🔄" },
                { case: { $eq: ["$notification_type", 14] }, then: "🏆" },
                { case: { $eq: ["$notification_type", 15] }, then: "⭐" },
                { case: { $eq: ["$notification_type", 16] }, then: "📈" },
                { case: { $in: ["$notification_type", [17, 18, 19]] }, then: "🏅" },
                { case: { $in: ["$notification_type", [20, 21, 22]] }, then: "👥" },
                { case: { $eq: ["$notification_type", 1] }, then: "👤" },
                { case: { $eq: ["$notification_type", 23] }, then: "👥" }  // Community join request icon
              ],
              default: "🔔"
            }
          },
          timeDisplay: {
            $let: {
              vars: {
                diffHours: {
                  $divide: [
                    { $subtract: [new Date(), "$createdAt"] },
                    1000 * 60 * 60
                  ]
                }
              },
              in: {
                $switch: {
                  branches: [
                    {
                      case: { $lt: ["$$diffHours", 24] },
                      then: "Today"
                    },
                    {
                      case: { 
                        $and: [
                          { $gte: ["$$diffHours", 24] },
                          { $lt: ["$$diffHours", 48] }
                        ]
                      },
                      then: "Yesterday"
                    },
                    {
                      case: { $gte: ["$$diffHours", 48] },
                      then: {
                        $dateToString: {
                          format: "%d %b",
                          date: "$createdAt"
                        }
                      }
                    }
                  ],
                  default: {
                    $dateToString: {
                      format: "%d %b",
                      date: "$createdAt"
                    }
                  }
                }
              }
            }
          },
          showButtons: {
            $cond: {
              if: { $in: ["$notification_type", [5, 6, 23]] },  // Include type 23
              then: true,
              else: false
            }
          },
          buttonTexts: {
            $cond: {
              if: { $in: ["$notification_type", [5, 6, 23]] },  // Include type 23
              then: ["Accept", "Decline"],
              else: []
            }
          },
          timestamp: "$createdAt"
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    return res.status(200).json({
      status: 1,
      message: "Notifications fetched successfully",
      data: notificationList,
      unreadCount: await notification.countDocuments({ 
        user_id: userId, 
        is_Shown: true 
      })
    });
    
  } catch (error) {
    console.error("Error in notification_list:", error);
    return res.status(500).json({ 
      status: 0, 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
        
        // Update user social score for requesting to join section
        const userScoreResult = await socialScoreCalculator.updateUserSocialScore(
          userId, 
          'VIEW_A_SECTION'
        );
        console.log("User social score updated for requesting to join section:", userScoreResult);
        
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
          communityName: { $regex: userName, $options: "i" },
        },
      },
      {
        $lookup: {
          from: "userdatas",
          localField: "community_Members",
          foreignField: "_id",
          as: "Members",
        },
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
          backgroundImageColour: 1,
          "Members._id": 1,
          "Members.username": 1,
          "Members.image": 1,
          "Members.user_Id": 1,
          "Members.backgroundImageColour": 1,
          count: 1,
          subscrition_type: 1,
          Amount: 1,
          timescale: 1,
          cliqk_type: 1,
          xp: 1,
          socialScore: 1,
          Members_count: {
            $size: "$Members",
          },
          followersList: 1,
          followersCount: {
            $size: "$followersList",
          },
        },
      },
      { $skip: 0 },
      { $limit: 10 },
    ]);

    const user = [];
    membersSearchByName.map((item) => {
      const obj = {};
      obj._id = item._id;
      obj.fullname = item.fullname;
      obj.username = item.username;
      obj.image = item.image;
      obj.backgroundImageColour = item.backgroundImageColour;
      user.push(obj);
    });
    res.send({
      status: 1,
      message: "Member List ",
      data: user,
      msectionSearchByName,
    });
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
// const mongoose = require("mongoose");
// const createCliqkData = require("../models/createCliqkData"); // Ensure correct model import

exports.followUnfollowSection = async (req, res, next) => {
  try {
    const sectionId = req.body.sectionId;
    const userId = req.user._id;

    if (!sectionId) {
      return res
        .status(400)
        .json({ status: 0, message: "Section ID is required." });
    }

    // Convert userId to ObjectId to match the database format
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const findSection = await createCliqkData.findById(sectionId);

    if (!findSection) {
      return res.status(404).json({ status: 0, message: "Section not found." });
    }

    const sectionOwner = findSection.userObjId;
    const sectionName = findSection.communityName;

    console.log("Current Followers List:", findSection.followersList);

    // Check if the user is already in followersList
    const isFollowing = findSection.followersList.some((follower) =>
      follower.equals(userObjectId)
    );

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
        notification_type: 13,
      });

      return res
        .status(200)
        .json({ status: 1, message: "Unfollowed successfully." });
    } else {
      // Follow: Add user to followersList
      await createCliqkData.findByIdAndUpdate(
        sectionId,
        { $addToSet: { followersList: userObjectId } },
        { new: true }
      );

      await followSection(userId, sectionOwner, sectionId, sectionName);

      // Update user social score for following section
      const userScoreResult = await socialScoreCalculator.updateUserSocialScore(
        userId, 
        'FOLLOW_A_SECTION'
      );
      console.log("User social score updated for following section:", userScoreResult);
      
      // Update section social score for getting new follower
      const sectionScoreResult = await socialScoreCalculator.updateSectionSocialScore(
        sectionId.toString(),
        'NEW_FOLLOWER_OF_SECTION'
      );
      console.log("Section social score updated for new follower:", sectionScoreResult);

      return res
        .status(200)
        .json({ status: 1, message: "Followed successfully." });
    }
  } catch (error) {
    console.error("Error in follow/unfollow:", error);
    return res
      .status(500)
      .json({ status: 0, message: "Internal server error." });
  }
};

const followSection = async (userId, sectionOwner, sectionId, sectionName) => {
  try {
    const currentUser = await userData.findById(userId);
    const username = currentUser.username;
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
  } catch (error) {
    console.log("error", error);
  }
};

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
        select: "_id image username fullname backgroundImageColour",
        match: { isFollowing: true }, // Agar aapke model me 'isFollowing' jaisa field hai
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

// exports.sectionForScenario = async (req, res, next) => {
//   try {
//     const type = req.body.type;
//     const currentUserId = req.user._id;

//     if (!type) {
//       return res.send({ status: 0, message: "Type is required." });
//     }

//     if (type === "for_you") {
//       // Find all sections the user has joined
//       const joinedSections = await createCliqkData.find({
//         community_Members: { $in: [currentUserId] },
//       });

//       let joinedUserIds = joinedSections.map(item => item.userObjId.toString());

//       // Find sections of the same users which the current user has NOT joined
//       const suggestedSections = await createCliqkData.find({
//         userObjId: { $in: joinedUserIds },
//         community_Members: { $nin: [currentUserId] }
//       });

//       return res.send({
//         status: 1,
//         message: "Suggested sections fetched successfully.",
//         data: suggestedSections
//       });

//     } else if (type === "most_liked") {
//       const topSections = await postData.aggregate([
//         {
//           $project: {
//             communityId: 1,
//             likesCount: { $size: "$post_likes" }
//           }
//         },
//         {
//           $group: {
//             _id: "$communityId",
//             totalLikes: { $sum: "$likesCount" }
//           }
//         },
//         { $sort: { totalLikes: -1 } }, // Sort by most likes
//         { $limit: 10 }, // Get top 10 sections
//         {
//           $project: {
//             _id: 0,
//             sectionId: "$_id"
//           }
//         }
//       ]);

//       console.log("topSections" ,topSections)

//       const topLikesSection = await createCliqkData.find({
//         _id: { $in: topSections.map((s) => s.sectionId) }
//       });

//       return res.send({status : 1 , message :"Top sections" , data : topLikesSection})

//     }
//   } catch (error) {
//     console.log("error", error);
//     return res.status(500).send({ status: 0, message: "Something went wrong." });
//   }
// };
exports.sectionForScenario = async (req, res, next) => {
  try {
    const type = req.body.type;
    const currentUserId = req.user._id;

    const SectionTypes = {
      TRENDING: "trending",
      FOR_YOU: "for_you"
    };

    if (!Object.values(SectionTypes).includes(type)) {
      return res.send({ status: 0, message: "Invalid type provided." });
    }

    let data = [];

    if (type === SectionTypes.TRENDING) {
      // TRENDING: Always show data, even if no recent activity
      
      // Step 1: Try to get recent popular sections (last 7 days)
      const recentStart = moment().subtract(7, 'days').toDate();
      
      let recentSections = await createCliqkData
        .find({
          $or: [
            { updatedAt: { $gte: recentStart } },
            { createdAt: { $gte: recentStart } }
          ],
          isActive: true
        })
        .sort({ 
          viewsCount: -1,
          socialScore: -1,
          followersCount: -1 
        })
        .limit(15);

      console.log("Recent trending sections found:", recentSections.length);

      // Step 2: If not enough recent sections, add all-time popular sections
      if (recentSections.length < 10) {
        const allTimeSections = await createCliqkData
          .find({ 
            isActive: true,
            _id: { $nin: recentSections.map(s => s._id) } // Exclude already added ones
          })
          .sort({ 
            followersCount: -1,
            viewsCount: -1,
            socialScore: -1,
            createdAt: -1 
          })
          .limit(20 - recentSections.length);

        data = [...recentSections, ...allTimeSections];
      } else {
        data = recentSections;
      }

      // Step 3: If still no data (very rare case), get any active sections
      if (data.length === 0) {
        console.log("No trending data found, fetching any active sections...");
        data = await createCliqkData
          .find({ isActive: true })
          .limit(20);
      }

      console.log("Final trending sections:", data.length);

    } else if (type === SectionTypes.FOR_YOU) {
      // FOR YOU: AI-Personalized - Random sections with some logic
      
      // First, get user's followed sections to exclude them
      const userFollowedSections = await createCliqkData.find({
        "followersList": currentUserId
      }).select('_id');
      
      const excludedSectionIds = userFollowedSections.map(section => section._id);
      
      // Get random sections (excluding already followed ones)
      data = await createCliqkData.aggregate([
        {
          $match: {
            _id: { $nin: excludedSectionIds },
            isActive: true
          }
        },
        {
          $addFields: {
            // Combine multiple factors for better randomization
            randomScore: {
              $add: [
                { $multiply: [{ $rand: {} }, 100] }, // Random factor
                { $size: { $ifNull: ["$followersList", []] } }, // Popularity factor
                { $ifNull: ["$socialScore", 0] }, // Engagement factor
                { $ifNull: ["$viewsCount", 0] } // Views factor
              ]
            }
          }
        },
        { $sort: { randomScore: -1 } },
        { $limit: 20 }
      ]);
      
      // If not enough sections, fill with any active sections
      if (data.length < 10) {
        const additionalSections = await createCliqkData.find({
          isActive: true,
          _id: { $nin: data.map(d => d._id) }
        })
        .limit(20 - data.length);
        
        data = [...data, ...additionalSections];
      }
    }

    console.log(`${type} sections found:`, data.length);

    // 🔹 Process each section to add isFollow and isMember fields
    const processedData = data.map(section => {
      // Convert to plain object if it's a mongoose document
      const sectionObj = section.toObject ? section.toObject() : section;
      
      // Check if current user is following this section
      const isFollow = sectionObj.followersList 
        ? sectionObj.followersList.some(followerId => 
            followerId.toString() === currentUserId.toString())
        : false;
      
      // Check if current user is a member of this section
      const isMember = sectionObj.community_Members 
        ? sectionObj.community_Members.some(memberId => 
            memberId.toString() === currentUserId.toString())
        : false;

      return {
        ...sectionObj,
        isFollow, // ✅ Added isFollow parameter
        isMember  // ✅ Added isMember parameter
      };
    });

    return res.send({
      status: 1,
      message: `${type.replace("_", " ")} sections fetched successfully.`,
      data: processedData,
    });
  } catch (error) {
    console.error("Discovery Error:", error);
    return res
      .status(500)
      .send({ status: 0, message: "Something went wrong." });
  }
};

exports.getTopSectionsBySocialScore = async (req, res, next) => {
  try {
    const topLimit = parseInt(req.body.limit) || 10;

    // Fetch all sections with populated user data, sorted by socialScore
    const allSections = await createCliqkData
      .find(
        {},
        {
          communityName: 1,
          communityImage: 1,
          socialScore: 1,
          xp: 1,
          viewsCount: 1,
          followersList: 1,
          unique_id: 1,
          userObjId: 1,
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
                username: section.userObjId.username || "",
                profileImage: section.userObjId.image || "",
                email: section.userObjId.email || "",
              }
            : null,
        });
      }
    });

    return res.status(200).json({
      status: 1,
      message: "Sections fetched successfully",
      data: topSections,
    });
  } catch (error) {
    console.error("Error fetching section rankings:", error);
    return res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Get community social score by ID
exports.getCommunitySocialScore = async (req, res, next) => {
  try {
    const { communityId } = req.body;
    
    if (!communityId) {
      return res.send({ status: 0, message: "Community ID is required" });
    }

    const community = await createCliqkData.findById(communityId);
    if (!community) {
      return res.send({ status: 0, message: "Community not found" });
    }

    // Get member scores for accumulated calculation
    const memberScores = [];
    if (community.community_Members && community.community_Members.length > 0) {
      const members = await userData.find({ _id: { $in: community.community_Members } });
      memberScores.push(...members.map(member => member.socialScore || 0));
    }

    // Calculate accumulated member score (10% of sum)
    const accumulatedMemberScore = memberScores.reduce((sum, score) => sum + score, 0) * 0.1;

    const scoreData = {
      communityId: community._id,
      communityName: community.communityName,
      currentSocialScore: community.socialScore || 0,
      currentXP: community.xp || 1,
      memberCount: community.community_Members ? community.community_Members.length : 0,
      followerCount: community.followersList ? community.followersList.length : 0,
      accumulatedMemberScore: Math.round(accumulatedMemberScore * 100) / 100,
      createdAt: community.createdAt,
      lastUpdated: community.updatedAt
    };

    res.send({
      status: 1,
      message: "Community social score retrieved successfully",
      data: scoreData
    });

  } catch (error) {
    console.error('Error getting community social score:', error);
    res.send({ status: 0, message: error.message });
  }
};

// Get user social score by ID
exports.getUserSocialScore = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.send({ status: 0, message: "User ID is required" });
    }

    const user = await userData.findById(userId);
    if (!user) {
      return res.send({ status: 0, message: "User not found" });
    }

    // Get level information using social score calculator
    const socialScoreCalculator = require("../../../utils/socialScoreCalculator");
    const levelInfo = socialScoreCalculator.calculateLevelFromPoints(user.socialScore || 0);

    const scoreData = {
      userId: user._id,
      username: user.username,
      fullname: user.fullname,
      currentSocialScore: user.socialScore || 0,
      currentXP: user.xp || 1,
      currentLevel: levelInfo.level,
      pointsToNextLevel: levelInfo.pointsToNextLevel,
      progressPercentage: levelInfo.progressPercentage,
      highestScore: user.highestScore || 0,
      previousScore: user.previousScore || 0,
      lastScoreChange: user.lastScoreChange,
      lastInteraction: user.lastInteraction,
      createdAt: user.createdAt
    };

    res.send({
      status: 1,
      message: "User social score retrieved successfully",
      data: scoreData
    });

  } catch (error) {
    console.error('Error getting user social score:', error);
    res.send({ status: 0, message: error.message });
  }
};

// Get top communities by social score
exports.getTopCommunitiesByScore = async (req, res, next) => {
  try {
    const { limit = 10, skip = 0 } = req.body;

    const topCommunities = await createCliqkData.aggregate([
      {
        $match: {
          socialScore: { $exists: true, $gt: 0 }
        }
      },
      {
        $sort: { socialScore: -1 }
      },
      {
        $skip: parseInt(skip)
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: 1,
          communityName: 1,
          communityImage: 1,
          socialScore: 1,
          xp: 1,
          memberCount: { $size: { $ifNull: ["$community_Members", []] } },
          followerCount: { $size: { $ifNull: ["$followersList", []] } },
          cliqk_type: 1,
          createdAt: 1
        }
      }
    ]);

    res.send({
      status: 1,
      message: "Top communities retrieved successfully",
      data: topCommunities,
      total: topCommunities.length
    });

  } catch (error) {
    console.error('Error getting top communities:', error);
    res.send({ status: 0, message: error.message });
  }
};

// Get top users by social score
exports.getTopUsersByScore = async (req, res, next) => {
  try {
    const { limit = 10, skip = 0 } = req.body;

    const topUsers = await userData.aggregate([
      {
        $match: {
          socialScore: { $exists: true, $gt: 0 }
        }
      },
      {
        $sort: { socialScore: -1 }
      },
      {
        $skip: parseInt(skip)
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: 1,
          username: 1,
          fullname: 1,
          image: 1,
          socialScore: 1,
          xp: 1,
          lastInteraction: 1,
          createdAt: 1
        }
      }
    ]);

    res.send({
      status: 1,
      message: "Top users retrieved successfully",
      data: topUsers,
      total: topUsers.length
    });

  } catch (error) {
    console.error('Error getting top users:', error);
    res.send({ status: 0, message: error.message });
  }
};


// search users for adding into section (exclude existing + requested users)
exports.getNonMemberUsers = async (req, res) => {
  try {
    const { sectionId, userName } = req.body;
    const loginUserId = req.user._id;

    // 1️⃣ Find community
    const community = await createCliqkData
      .findById(sectionId)
      .select("community_Members");

    if (!community) {
      return res.send({
        status: 0,
        message: "Community not found",
      });
    }

    // 2️⃣ Already members ids
    const memberIds = community.community_Members || [];

    // 3️⃣ Already requested users (invite already sent)
    const requestedUsers = await send_Community_NotificationData
      .find({ Comminity_Id: sectionId })
      .select("ReciverId");

    const requestedUserIds = requestedUsers.map(
      (item) => item.ReciverId
    );

    // 4️⃣ Prepare exclude list
    const excludeUserIds = [
      ...memberIds,
      ...requestedUserIds,
      loginUserId,
    ];

    // 5️⃣ Final user search (NEW USERS FIRST)
    const users = await userData.find({
      _id: { $nin: excludeUserIds },
      username: { $regex: userName || "", $options: "i" },
    })
    .sort({ createdAt: -1 }) // 🔥 new users first
    .select("_id fullname username image backgroundImageColour createdAt")
    .limit(50);

    return res.send({
      status: 1,
      message: "Users list",
      data: users,
    });

  } catch (error) {
    console.error("getNonMemberUsers error:", error);
    return res.send({
      status: 0,
      message: "Something went wrong",
    });
  }
};


exports.sendSectionInviteToSelectedUsers = async (req, res) => {
  try {
    const { sectionId, selectedUsers } = req.body;
    const userId = req.user._id;

    if (!selectedUsers || !Array.isArray(selectedUsers) || selectedUsers.length === 0) {
      return res.send({
        status: 0,
        message: "Selected users required",
      });
    }

    // 1️⃣ Get community details
    const community = await createCliqkData
      .findById(sectionId)
      .select("communityName");

    if (!community) {
      return res.send({
        status: 0,
        message: "Community not found",
      });
    }

    // 2️⃣ Get sender details
    const sender = await userData
      .findById(userId)
      .select("username");

    // 3️⃣ Fetch selected users full data
    const all_Users = await userData.find({
      _id: { $in: selectedUsers },
    });

    if (!all_Users.length) {
      return res.send({
        status: 0,
        message: "No valid users found",
      });
    }

    // 4️⃣ Send notifications (reuse existing function)
    await sendNotification_for_section({
      all_Users,
      userId,
      username: sender.username,
      communityName: community.communityName,
      createCommunityId: sectionId,
    });

    return res.send({
      status: 1,
      message: "Invitation sent successfully",
    });

  } catch (error) {
    console.error("sendSectionInviteToSelectedUsers error:", error);
    return res.send({
      status: 0,
      message: "Something went wrong",
    });
  }
};


