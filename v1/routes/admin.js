var express = require('express');
var router = express.Router();

const admincontroller = require('../controllers/adminControllers');
const authAdmin = require('../../middleware/authAdmin');
const upload = require('../../middleware/multer')
const getuser = require('../controllers/getmobileuser');
const userData = require('../../models/user');
const communityData = require('../controllers/community');
const community = require('../../models/createcommunity');

const privacypolicy = require('../controllers/privacypolicy.js');

const childSaftyRouter = require('../controllers/childsaftyController.js')

const imojiRender = require('../controllers/imojiUpload.js')
const s3image = require('../../middleware/s3Image.js');

var mongoose = require('mongoose');
const UserModel = require ('../../models/user.js')

const rewardController = require('../controllers/adminControllers.js')






/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('admin', { title: 'admin', message: req.flash('error') });
});

router.get('/', function (req, res, next) {
  // res.render('index', { title: 'Express' });
  if (req.session.isLoggedin == undefined) {
    console.log('222222222', req.session);

    res.render('admin', { title: 'RE_WORLD' });
    console.log("this is homepage erroe 1010101010");
  } else {
    //console.log("4444444", req.session.isLoggedin);
    res.redirect('dashboard')
  }
});

// count for dashboard
router.get('/dashboard', async function (req, res) {
  const userCount = await userData.find().countDocuments()
  const communityCount = await community.find().countDocuments()
  res.render("dashboard", { user: userCount, community: communityCount })
  console.log(userCount);
})

// Admin
router.post('/register', admincontroller.singUp)
router.post('/', admincontroller.login);
router.get('/logout', admincontroller.logout);
router.get('/findAdmin/:id', authAdmin.authenticateAdmin, admincontroller.findAdminData);
router.post('/editAdmin', authAdmin.authenticateAdmin, upload.upload.single('image'), admincontroller.updateAdminData);
router.post('/adminChangePass', authAdmin.authenticateAdmin, admincontroller.updateAdminPassword);

// user list 
// router.get('/userlist', authAdmin.authenticateAdmin, getuser.getuserData)
// router.get('/userprofile/:id', authAdmin.authenticateAdmin, getuser.findbyiduser);
// router.get('/userprofilee/:id', getuser.newfindByidUser);
// router.get('/this_section_post/:user_Id/:community_id', getuser.this_section_post);
// router.post('/officials', getuser.is_Officials_And_is_Not_Officials);
// router.get('/official_list', authAdmin.authenticateAdmin, getuser.officials_list);


router.get('/userlist', getuser.getuserData)
router.get('/userprofile/:id', authAdmin.authenticateAdmin, getuser.findbyiduser);
router.get('/userprofilee/:id', getuser.newfindByidUser);
router.get('/this_section_post/:user_Id/:community_id', getuser.this_section_post);
router.get('/blueticklist', getuser.applying_for_official_list)
router.get('/blueTickProfile/:id', getuser.officialProfile)
router.post('/approved_notapproved', getuser.approvedOrNotAprroved)


// user posts in community 


// about
router.post('/privacypolicy', authAdmin.authenticateAdmin, privacypolicy.privacyPolicy);
router.post('/term_of_use', authAdmin.authenticateAdmin, privacypolicy.term_of_use)
router.post('/community_guidlines', authAdmin.authenticateAdmin, privacypolicy.community_guidlines);


// community 
router.get('/communitylist', communityData.communityList);
router.get('/communityprofilee/:id', communityData.newfindBycommunity);
router.get('/userpost', communityData.community_user_post)

// router.get('/section_post', function (req, res, next) {
//   res.render('section_post', { title: 'section_post' });
// });

// router.get('/for_officials', function (req, res, next) {
//   res.render('officials_list', { title: 'officials_list' });
// });
router.get('/')

// childSafty
router.get('/getChildSafty' ,childSaftyRouter.getChildSafty )
router.get('/getChildSafetyWeb' ,childSaftyRouter.getChildSaftyWeb )
router.post('/child_safty' , childSaftyRouter.updateChildSafty)


router.get('/imoji' , imojiRender.imojoPages)
router.post('/imojisUpload' ,s3image.upload.single('imojiImage') , imojiRender.imojisUpload)
router.get('/emojisList' , imojiRender.Emojis )



router.post('/api/update-social-score', async (req, res) => {
  try {
    const { userId, score, description } = req.body;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: "Invalid userId" });
    }

    const parsedScore = parseInt(score);
    if (isNaN(parsedScore) || parsedScore < 0) {
      return res.status(400).json({ success: false, error: "Invalid score value" });
    }

    // Get existing user data
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const currentScore = user.socialScore || 0;
    const newTotalScore = currentScore + parsedScore;

    // Update socialScore and push to manualSocialScoreByAdmin
    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        socialScore: newTotalScore
      },
      $push: {
        manualSocialScoreByAdmin: {
          score: parsedScore,
          description: description || ""
        }
      }
    });

    res.json({ success: true, message: "Score updated successfully", newScore: newTotalScore });
  } catch (err) {
    console.error("Update Social Score Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});



// 👑 STEP 2: Admin Get Rewards Routes
// router.get('/admin/pending', rewardController.getPendingRewards);
// router.get('/admin/all', rewardController.getAllRewards);

// router.get('admin/rewards' , )

// router.get('/admin/users-rewards', function (req, res, next) {
//   res.render('users-rewards', { title: 'users-rewards', message: req.flash('error') });
// });

// router.get('/admin/sections-rewards', function (req, res, next) {
//   res.render('sections-rewards', { title: 'sections-rewards', message: req.flash('error') });
// });


const Reward = require('../../models/rewards.js');

// GET Users Rewards Page
router.get('/admin/users-rewards', async (req, res) => {
  try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      
      const rewards = await Reward.find({ 
          status: "pending",
          reward_type: "user_weekly_winner"
      })
      .populate('user_id', 'username fullname image email')
      .sort({ submitted_at: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      console.log("rewards" ,rewards)

      const totalPending = await Reward.countDocuments({ 
          status: "pending",
          reward_type: "user_weekly_winner"
      });
      
      const totalCount = await Reward.countDocuments({ 
          reward_type: "user_weekly_winner"
      });
      
      const completedCount = await Reward.countDocuments({ 
          status: "completed",
          reward_type: "user_weekly_winner"
      });
      
      res.render('users-rewards', {
          rewards,
          pendingCount: totalPending,
          totalCount,
          completedCount,
          pagination: {
              totalPages: Math.ceil(totalPending / limit),
              currentPage: page,
              hasNextPage: page < Math.ceil(totalPending / limit),
              hasPrevPage: page > 1,
              nextPage: page + 1,
              prevPage: page - 1
          }
      });
      
  } catch (error) {
      console.error('Error loading users rewards page:', error);
      res.status(500).render('error', { message: 'Internal server error' });
  }
});

// GET Sections Rewards Page
router.get('/admin/sections-rewards', async (req, res) => {
  try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      
      const rewards = await Reward.find({ 
          status: "pending",
          reward_type: "section_weekly_winner"
      })
      .populate('user_id', 'username fullname image email')
      .populate('section_id', 'communityName')
      .sort({ submitted_at: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      const totalPending = await Reward.countDocuments({ 
          status: "pending",
          reward_type: "section_weekly_winner"
      });
      
      const totalCount = await Reward.countDocuments({ 
          reward_type: "section_weekly_winner"
      });
      
      const completedCount = await Reward.countDocuments({ 
          status: "completed",
          reward_type: "section_weekly_winner"
      });
      
      res.render('sections-rewards', {
          rewards,
          pendingCount: totalPending,
          totalCount,
          completedCount,
          pagination: {
              totalPages: Math.ceil(totalPending / limit),
              currentPage: page,
              hasNextPage: page < Math.ceil(totalPending / limit),
              hasPrevPage: page > 1,
              nextPage: page + 1,
              prevPage: page - 1
          }
      });
      
  } catch (error) {
      console.error('Error loading sections rewards page:', error);
      res.status(500).render('error', { message: 'Internal server error' });
  }
});

// Video Upload API
const { google } = require("googleapis");
const axios = require("axios");
// const serviceAccount = require("../cliqk-e25f0-firebase-adminsdk-vedtf-7eb62187c9.json");
const serviceAccount = require('../../cliqk-e25f0-firebase-adminsdk-vedtf-7eb62187c9.json')

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];
const STATIC_USER_ID = "67a4c5082f32b1680ef21c22";

// ⛽ FCM OAuth Function
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      undefined,
      serviceAccount.private_key,
      SCOPES
    );
    jwtClient.authorize((err, tokens) => {
      if (err || !tokens?.access_token) {
        console.error("❌ Access token error:", err);
        reject(err || new Error("Failed to obtain access token"));
      } else {
        resolve(tokens.access_token);
      }
    });
  });
}

// 📤 Send FCM Notification Function
const sendFCMPushNotification = async (deviceToken, title, body, data = {}) => {
  try {
    const projectId = process.env.PROJECTID;
    if (!projectId) {
      console.error("❌ PROJECTID env variable is missing.");
      return false;
    }

    const accessToken = await getAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const message = {
      message: {
        token: deviceToken,
        notification: { 
          title: title,
          body: body 
        },
        android: { 
          notification: { 
            sound: "default",
            priority: "high"
          } 
        },
        apns: { 
          payload: { 
            aps: { 
              sound: "default",
              badge: 1,
              alert: {
                title: title,
                body: body
              }
            } 
          } 
        },
        data: data
      }
    };

    const response = await axios.post(url, message, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    console.log("✅ FCM Notification sent successfully");
    return true;

  } catch (error) {
    console.error("❌ FCM Notification error:", error.response?.data || error.message);
    return false;
  }
};

// 🎯 Updated Video Upload API with FCM Push Notification
router.put('/admin/upload-video/:rewardId', s3image.upload.single('video'), async (req, res) => {
  try {
      console.log("📹 Video upload request received:", {
          rewardId: req.params.rewardId,
          file: req.file,
          body: req.body
      });

      const { rewardId } = req.params;
      const { video_title, video_description, admin_notes } = req.body;

      if (!req.file) {
          return res.status(400).json({
              success: false,
              message: "Video file is required"
          });
      }

      // ✅ S3 se video URL le rahe hain
      const videoUrl = req.file.location; // S3 provides the file URL in location

      const reward = await Reward.findByIdAndUpdate(
          rewardId,
          {
              status: "completed",
              admin_video: {
                  video_url: videoUrl, // ✅ S3 URL save kar rahe hain
                  video_title: video_title || "Congratulations Video",
                  video_description: video_description || "",
                  uploaded_at: new Date()
              },
              admin_notes: admin_notes || "",
              completed_at: new Date()
          },
          { new: true }
      ).populate('user_id', 'username fullname image email device_Token')
       .populate('section_id', 'communityName');

      if (!reward) {
          return res.status(404).json({
              success: false,
              message: "Reward not found"
          });
      }

      console.log("✅ Video uploaded successfully to S3 for reward:", rewardId);

      // 🎯 NOTIFICATION WITH FCM PUSH
      try {
          const Notification = require('../../models/notifiication_list.js');
          
          // Notification message based on reward type
          const rewardTypeText = reward.reward_type === 'user_weekly_winner' ? 'individual user' : 'section';
          const notificationMessage = "🎉 Your reward is ready!";
          const notificationBody = `Your ${rewardTypeText} reward video has been uploaded by admin. Watch it now!`;

          // 1. Database mein notification create karein
          const notification = new Notification({
              user_id: reward.user_id._id,
              sender_id: req.admin?._id || STATIC_USER_ID,
              notification_message: notificationMessage,
              notification_body: notificationBody,
              notification_type: 14, // Reward completion type
              module_id: rewardId, // REWARD ID
              module_type: "reward", // MODULE TYPE = "reward"
              is_Shown: true,
              button_show: true,
              createdAt: new Date()
          });

          await notification.save();
          console.log("📢 Database notification saved with reward ID:", rewardId);

          // 2. FCM Push Notification bhejein (agar user ke paas device token hai)
          if (reward.user_id.device_Token) {
              const pushTitle = "🏆 Reward Ready!";
              const pushBody = `Your ${rewardTypeText} reward video is ready to watch!`;
              
              const pushData = {
                  type: "reward_completed",
                  rewardId: rewardId.toString(),
                  rewardType: reward.reward_type,
                  moduleType: "reward",
                  click_action: "FLUTTER_NOTIFICATION_CLICK"
              };

              const fcmSuccess = await sendFCMPushNotification(
                  reward.user_id.device_Token,
                  pushTitle,
                  pushBody,
                  pushData
              );

              if (fcmSuccess) {
                  console.log("📱 FCM Push notification sent to user:", reward.user_id._id);
              } else {
                  console.log("⚠️ FCM Push notification failed, but database notification saved");
              }
          } else {
              console.log("ℹ️ User has no device token, only database notification saved");
          }

      } catch (notifError) {
          console.error("❌ Notification process failed:", notifError);
          // Notification fail hone par bhi video upload successful hi rahega
      }

      res.status(200).json({
          success: true,
          message: "Video uploaded successfully to S3! Reward completed and user notified via push notification.",
          data: reward
      });

  } catch (error) {
      console.error("❌ Video upload error:", error);
      
      res.status(500).json({
          success: false,
          message: "Internal server error while uploading video"
      });
  }
});

// Get all rewards with filters for admin
router.get('/admin/all-rewards', async (req, res) => {
  try {
      const { status, reward_type, page = 1, limit = 10 } = req.query;
      
      let filters = {};
      if (status) filters.status = status;
      if (reward_type) filters.reward_type = reward_type;

      const rewards = await Reward.find(filters)
          .populate('user_id', 'username fullname image email')
          .populate('section_id', 'communityName')
          .sort({ submitted_at: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);

      const total = await Reward.countDocuments(filters);

      res.status(200).json({
          success: true,
          data: rewards,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total
      });

  } catch (error) {
      console.error("Get all rewards error:", error);
      res.status(500).json({
          success: false,
          message: "Internal server error"
      });
  }
});

// Get reward by ID
router.get('/admin/reward/:rewardId', async (req, res) => {
  try {
      const { rewardId } = req.params;

      const reward = await Reward.findById(rewardId)
          .populate('user_id', 'username fullname image email')
          .populate('section_id', 'communityName');

      if (!reward) {
          return res.status(404).json({
              success: false,
              message: "Reward not found"
          });
      }

      res.status(200).json({
          success: true,
          data: reward
      });

  } catch (error) {
      console.error("Get reward by ID error:", error);
      res.status(500).json({
          success: false,
          message: "Internal server error"
      });
  }
});

// Admin approve reward (without video)
router.put('/admin/approve-reward/:rewardId', async (req, res) => {
  try {
      const { rewardId } = req.params;
      const { admin_notes, estimated_completion_days } = req.body;

      const reward = await Reward.findByIdAndUpdate(
          rewardId,
          {
              status: "approved",
              admin_notes: admin_notes || "",
              estimated_completion_days: estimated_completion_days || 3,
              approved_at: new Date()
          },
          { new: true }
      ).populate('user_id', 'username fullname image email device_Token')
       .populate('section_id', 'communityName');

      if (!reward) {
          return res.status(404).json({
              success: false,
              message: "Reward not found"
          });
      }

      res.status(200).json({
          success: true,
          message: "Reward approved successfully",
          data: reward
      });

  } catch (error) {
      console.error("Approve reward error:", error);
      res.status(500).json({
          success: false,
          message: "Internal server error"
      });
  }
});

// Admin reject reward
router.put('/admin/reject-reward/:rewardId', async (req, res) => {
  try {
      const { rewardId } = req.params;
      const { admin_notes } = req.body;

      const reward = await Reward.findByIdAndUpdate(
          rewardId,
          {
              status: "rejected",
              admin_notes: admin_notes || "",
              completed_at: new Date()
          },
          { new: true }
      ).populate('user_id', 'username fullname image email device_Token')
       .populate('section_id', 'communityName');

      if (!reward) {
          return res.status(404).json({
              success: false,
              message: "Reward not found"
          });
      }

      res.status(200).json({
          success: true,
          message: "Reward rejected successfully",
          data: reward
      });

  } catch (error) {
      console.error("Reject reward error:", error);
      res.status(500).json({
          success: false,
          message: "Internal server error"
      });
  }
});

// Reports Management Routes
router.get('/reports', authAdmin.authenticateAdmin, admincontroller.getReports);
router.put('/reports/:id', authAdmin.authenticateAdmin, admincontroller.updateReport);
// PATCH per doc: /api/admin/reports/:id/resolve, /api/admin/reports/:id/dismiss
router.patch('/reports/:id/resolve', authAdmin.authenticateAdmin, admincontroller.resolveReport);
router.patch('/reports/:id/dismiss', authAdmin.authenticateAdmin, admincontroller.dismissReport);

// User Management Routes
router.post('/block-user', authAdmin.authenticateAdmin, admincontroller.blockUser);
router.post('/unblock-user', authAdmin.authenticateAdmin, admincontroller.unblockUser);

// Message and Report Management Routes
router.delete('/remove-message/:messageId', authAdmin.authenticateAdmin, admincontroller.removeMessage);
router.post('/ban-user', authAdmin.authenticateAdmin, admincontroller.banUserFromReport);

module.exports = router;
