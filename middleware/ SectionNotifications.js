const cron = require("node-cron");
const createNotification = require("../models/notifiication_list");
const userData = require("../models/user");
const createCliqkData = require("../models/createcommunity");
const axios = require("axios");
const { google } = require("googleapis");
const serviceAccount = require("../cliqk-e25f0-firebase-adminsdk-vedtf-7eb62187c9.json");

/* ================= CONFIG ================= */
const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];
const STATIC_USER_ID = "67a4c5082f32b1680ef21c22";

/* ================= IN-MEMORY TRACKERS ================= */
const notificationTracker = {
  // User tracking for daily leaderboard
  userHighestTier: new Map(),      // Highest tier achieved: 1, 5, 10
  userPreviousRank: new Map(),     // Last known rank
  userHasDroppedOut: new Map(),    // Track if user dropped from top 10
  userTiersEntered: new Map(),     // Set of tiers user has entered (to track which tiers they've been notified about)
  
  // Section tracking for daily leaderboard
  sectionHighestTier: new Map(),   // Highest tier achieved: 1, 5, 10
  sectionPreviousRank: new Map(),  // Last known rank
  sectionHasDroppedOut: new Map(), // Track if section dropped from top 10
  sectionTiersEntered: new Map(),  // Set of tiers section has entered
  
  // Weekly tracking
  weeklyUserScores: new Map(),     // Weekly score increases for users
  weeklySectionScores: new Map(),  // Weekly score increases for sections
  
  // Weekly tier tracking (same logic as daily)
  weeklyUserHighestTier: new Map(),
  weeklySectionHighestTier: new Map(),
  weeklyUserHasDroppedOut: new Map(),
  weeklySectionHasDroppedOut: new Map(),

  notificationsEnabled: false,     // Start with disabled

  lastInteraction: {
    comment: new Map(),
    like: new Map(),
    react: new Map(),
    user_daily_score: new Map(),
    section_daily_score: new Map()
  }
};

/* ================= FCM TOKEN ================= */
async function getAccessToken() {
  const jwtClient = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    SCOPES
  );

  const tokens = await jwtClient.authorize();
  if (!tokens?.access_token) throw new Error("FCM token error");
  return tokens.access_token;
}

/* ================= NOTIFICATION MESSAGES ================= */
const notificationMessages = {
  // DAILY USER NOTIFICATIONS
  user_hit_number_1: {
    push: () => `🏆 You're #1 on the leaderboard!`,
    inApp: () => `You're officially #1 on the leaderboard 🔥`
  },
  user_hit_top_5: {
    push: (d) => `🥈 You're #${d.rank} - Top 5!`,
    inApp: (d) => `You entered Top 5 at rank #${d.rank}`
  },
  user_entered_top_10: {
    push: (d) => `🎉 You're #${d.rank} - Top 10!`,
    inApp: (d) => `You entered Top 10 at rank #${d.rank}`
  },
  
  // DAILY SECTION NOTIFICATIONS
  section_hit_number_1: {
    push: (d) => `🏆 "${d.sectionName}" is #1`,
    inApp: (d) => `"${d.sectionName}" is now #1`
  },
  section_hit_top_5: {
    push: (d) => `🚀 "${d.sectionName}" is #${d.rank} - Top 5`,
    inApp: (d) => `"${d.sectionName}" entered Top 5 at rank #${d.rank}`
  },
  section_entered_top_10: {
    push: (d) => `🎯 "${d.sectionName}" is #${d.rank} - Top 10`,
    inApp: (d) => `"${d.sectionName}" entered Top 10 at rank #${d.rank}`
  },
  
  // WEEKLY NOTIFICATIONS
  user_weekly_number_1: {
    push: "🏆 You finished #1 this week!",
    inApp: "You finished #1 this week 🎉"
  },
  user_weekly_top_10: {
    push: (d) => `🏆 Weekly Rank #${d.rank}`,
    inApp: (d) => `You finished weekly rank #${d.rank}`
  },
  section_weekly_number_1: {
    push: (d) => `🏆 "${d.sectionName}" finished #1 this week!`,
    inApp: (d) => `"${d.sectionName}" finished #1 this week 🎉`
  },
  section_weekly_top_10: {
    push: (d) => `🏆 "${d.sectionName}" weekly rank #${d.rank}`,
    inApp: (d) => `"${d.sectionName}" finished weekly rank #${d.rank}`
  }
};

/* ================= SEND NOTIFICATION ================= */
async function sendNotification({ userId, sectionId = null, type, customData = {}, priority = "normal" }) {
  if (!notificationTracker.notificationsEnabled) {
    console.log(`Notifications disabled. Skipping ${type} for user ${userId}`);
    return;
  }

  const user = await userData.findById(userId).lean();
  if (!user?.device_Token) {
    console.log(`No device token for user ${userId}`);
    return;
  }

  try {
    const accessToken = await getAccessToken();
    const msgTemplate = notificationMessages[type];
    if (!msgTemplate) {
      console.log(`No message template for type: ${type}`);
      return;
    }

    const pushMsg = typeof msgTemplate.push === "function" ? msgTemplate.push(customData) : msgTemplate.push;
    const inAppMsg = typeof msgTemplate.inApp === "function" ? msgTemplate.inApp(customData) : msgTemplate.inApp;

    const message = {
      message: {
        token: user.device_Token,
        notification: { title: "CLIQK", body: pushMsg },
        android: { priority },
        data: {
          notificationType: type,
          ...(sectionId && { sectionId: sectionId.toString() }),
          ...(customData.rank && { rank: customData.rank.toString() })
        }
      }
    };

    await axios.post(
      `https://fcm.googleapis.com/v1/projects/${process.env.PROJECTID}/messages:send`,
      message,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    await new createNotification({
      sender_id: STATIC_USER_ID,
      user_id: userId,
      community_id: sectionId,
      notification_message: inAppMsg,
      notification_type: getNotificationType(type),
      is_Shown: true
    }).save();

    await userData.findByIdAndUpdate(userId, { $inc: { badgeCount: 1 } });
    
    console.log(`✅ Notification sent: ${type} to user ${userId}, rank: ${customData.rank || 'N/A'}`);
  } catch (error) {
    console.error(`❌ Error sending notification to user ${userId}:`, error.message);
  }
}

/* ================= HELPER FUNCTIONS ================= */
function getNotificationType(type) {
  const map = {
    user_hit_number_1: 14,      // Goes to type 14
    user_hit_top_5: 14,         // Goes to type 14  
    user_entered_top_10: 14,    // Goes to type 14
    section_hit_number_1: 20,   // Goes to type 20
    section_hit_top_5: 20,      // Goes to type 20
    section_entered_top_10: 20, // Goes to type 20
    user_weekly_number_1: 19,   // Goes to type 19
    user_weekly_top_10: 18,     // Goes to type 18
    section_weekly_number_1: 22, // Goes to type 22
    section_weekly_top_10: 21    // Goes to type 21
  };
  return map[type] || 0;
}
// function getNotificationType(type) {
//   const map = {
//     user_hit_number_1: 1,
//     user_hit_top_5: 2,
//     user_entered_top_10: 3,
//     section_hit_number_1: 4,
//     section_hit_top_5: 5,
//     section_entered_top_10: 6,
//     user_weekly_number_1: 15,
//     user_weekly_top_10: 16,
//     section_weekly_number_1: 17,
//     section_weekly_top_10: 18
//   };
//   return map[type] || 0;
// }

function getTierFromRank(rank) {
  if (rank === 1) return 1;
  if (rank >= 2 && rank <= 5) return 5;
  if (rank >= 6 && rank <= 10) return 10;
  return 0;
}

/* ================= DAILY USER LEADERBOARD NOTIFICATIONS ================= */
async function checkUserLeaderboardNotifications() {
  if (!notificationTracker.notificationsEnabled) {
    console.log("User leaderboard notifications disabled");
    return;
  }

  console.log("📊 Checking user leaderboard notifications...");
  const users = await userData.find({})
    .sort({ socialScore: -1, _id: 1 })
    .select("_id username")
    .lean();

  let notificationsSent = 0;

  for (let i = 0; i < users.length; i++) {
    const rank = i + 1;
    const user = users[i];
    const userIdStr = user._id.toString();

    const prevRank = notificationTracker.userPreviousRank.get(userIdStr) || 0;
    const prevHighestTier = notificationTracker.userHighestTier.get(userIdStr) || 0;
    const hasDroppedOut = notificationTracker.userHasDroppedOut.get(userIdStr) || false;
    const tiersEntered = notificationTracker.userTiersEntered.get(userIdStr) || new Set();
    
    const currentTier = getTierFromRank(rank);
    const prevTier = getTierFromRank(prevRank);
    
    // Check if user dropped out of top 10 (was in top 10, now not)
    const justDroppedOut = (prevTier > 0 && currentTier === 0);
    if (justDroppedOut) {
      notificationTracker.userHasDroppedOut.set(userIdStr, true);
      console.log(`📉 User ${userIdStr} dropped out of top 10 (${prevRank} → ${rank})`);
    }
    
    // Check if user re-entered top 10 after dropping out
    const justReEntered = (hasDroppedOut && currentTier > 0);
    
    let notificationType = null;
    let shouldNotify = false;
    
    if (currentTier > 0) {
      // RULE 1: First time entering this specific tier
      // Track which tiers user has entered to avoid duplicate notifications
      // User should get notification when first entering tier 1, 5, or 10
      // Example: #15 → #8 (tier 10) → #3 (tier 5) → #1 (tier 1)
      // Should get: "top 10" at #8, "top 5" at #3, "#1" at #1
      
      const hasEnteredThisTier = tiersEntered.has(currentTier);
      
      if (!hasEnteredThisTier) {
        // First time entering this tier
        shouldNotify = true;
        console.log(`⬆️ User ${userIdStr} first time entering tier ${currentTier} at rank ${rank}`);
        tiersEntered.add(currentTier);
        notificationTracker.userTiersEntered.set(userIdStr, tiersEntered);
      }
      // RULE 2: Dropped out and re-entered this specific tier
      else if (justReEntered) {
        shouldNotify = true;
        console.log(`↩️ User ${userIdStr} re-entered tier ${currentTier} after dropping out`);
        notificationTracker.userHasDroppedOut.set(userIdStr, false);
      }
      
      if (shouldNotify) {
        if (currentTier === 1) notificationType = "user_hit_number_1";
        else if (currentTier === 5) notificationType = "user_hit_top_5";
        else if (currentTier === 10) notificationType = "user_entered_top_10";
      }
    }
    
    if (notificationType) {
      await sendNotification({ 
        userId: user._id, 
        type: notificationType, 
        customData: { rank } 
      });
      
      // Update highest tier if current is higher
      if (currentTier > prevHighestTier) {
        notificationTracker.userHighestTier.set(userIdStr, currentTier);
      }
      notificationsSent++;
      
      // Reset dropout flag if user re-entered
      if (justReEntered) {
        notificationTracker.userHasDroppedOut.set(userIdStr, false);
      }
    }
    
    // Always update previous rank
    notificationTracker.userPreviousRank.set(userIdStr, rank);
    await userData.findByIdAndUpdate(user._id, { previousRank: rank });
  }

  console.log(`✅ User leaderboard check complete. Sent ${notificationsSent} notifications.`);
}

/* ================= DAILY SECTION LEADERBOARD NOTIFICATIONS ================= */
async function checkSectionLeaderboardNotifications() {
  if (!notificationTracker.notificationsEnabled) {
    console.log("Section leaderboard notifications disabled");
    return;
  }

  console.log("🏢 Checking section leaderboard notifications...");
  const sections = await createCliqkData.find({})
    .sort({ socialScore: -1, _id: 1 })
    .select("_id communityName userObjId")
    .lean();

  let notificationsSent = 0;

  for (let i = 0; i < sections.length; i++) {
    const rank = i + 1;
    const section = sections[i];
    const sectionIdStr = section._id.toString();

    const prevRank = notificationTracker.sectionPreviousRank.get(sectionIdStr) || 0;
    const prevHighestTier = notificationTracker.sectionHighestTier.get(sectionIdStr) || 0;
    const hasDroppedOut = notificationTracker.sectionHasDroppedOut.get(sectionIdStr) || false;
    const tiersEntered = notificationTracker.sectionTiersEntered.get(sectionIdStr) || new Set();
    
    const currentTier = getTierFromRank(rank);
    const prevTier = getTierFromRank(prevRank);
    
    // Check if section dropped out of top 10
    const justDroppedOut = (prevTier > 0 && currentTier === 0);
    if (justDroppedOut) {
      notificationTracker.sectionHasDroppedOut.set(sectionIdStr, true);
      console.log(`📉 Section ${sectionIdStr} dropped out of top 10 (${prevRank} → ${rank})`);
    }
    
    // Check if section re-entered top 10 after dropping out
    const justReEntered = (hasDroppedOut && currentTier > 0);
    
    let notificationType = null;
    let shouldNotify = false;
    
    if (currentTier > 0) {
      // RULE 1: First time entering this specific tier
      // Track which tiers section has entered to avoid duplicate notifications
      const hasEnteredThisTier = tiersEntered.has(currentTier);
      
      if (!hasEnteredThisTier) {
        // First time entering this tier
        shouldNotify = true;
        console.log(`⬆️ Section ${sectionIdStr} first time entering tier ${currentTier} at rank ${rank}`);
        tiersEntered.add(currentTier);
        notificationTracker.sectionTiersEntered.set(sectionIdStr, tiersEntered);
      }
      // RULE 2: Dropped out and re-entered this specific tier
      else if (justReEntered) {
        shouldNotify = true;
        console.log(`↩️ Section ${sectionIdStr} re-entered tier ${currentTier} after dropping out`);
        notificationTracker.sectionHasDroppedOut.set(sectionIdStr, false);
      }
      
      if (shouldNotify) {
        if (currentTier === 1) notificationType = "section_hit_number_1";
        else if (currentTier === 5) notificationType = "section_hit_top_5";
        else if (currentTier === 10) notificationType = "section_entered_top_10";
      }
    }
    
    if (notificationType && section.userObjId) {
      await sendNotification({ 
        userId: section.userObjId, 
        sectionId: section._id,
        type: notificationType, 
        customData: { 
          rank,
          sectionName: section.communityName || "Your Section"
        } 
      });
      
      // Update highest tier if current is higher
      if (currentTier > prevHighestTier) {
        notificationTracker.sectionHighestTier.set(sectionIdStr, currentTier);
      }
      notificationsSent++;
      
      // Reset dropout flag if section re-entered
      if (justReEntered) {
        notificationTracker.sectionHasDroppedOut.set(sectionIdStr, false);
      }
    }
    
    // Always update previous rank
    notificationTracker.sectionPreviousRank.set(sectionIdStr, rank);
    await createCliqkData.findByIdAndUpdate(section._id, { previousRank: rank });
  }

  console.log(`✅ Section leaderboard check complete. Sent ${notificationsSent} notifications.`);
}

/* ================= DAILY LEADERBOARD CHECK (COMBINED) ================= */
async function checkLeaderboardNotifications() {
  await checkUserLeaderboardNotifications();
  await checkSectionLeaderboardNotifications();
}

/* ================= WEEKLY FUNCTIONS ================= */
async function updateWeeklyScores() {
  if (!notificationTracker.notificationsEnabled) {
    console.log("Weekly scores update skipped - notifications disabled");
    return;
  }

  console.log("📅 Updating weekly scores...");
  
  // Update user weekly scores
  const users = await userData.find({});
  for (const user of users) {
    const id = user._id.toString();
    const currentData = notificationTracker.weeklyUserScores.get(id);
    const initialScore = currentData?.initialScore ?? user.socialScore;
    
    notificationTracker.weeklyUserScores.set(id, {
      initialScore: initialScore,
      scoreIncrease: user.socialScore - initialScore,
      username: user.username
    });
  }

  // Update section weekly scores
  const sections = await createCliqkData.find({});
  for (const section of sections) {
    const id = section._id.toString();
    const currentData = notificationTracker.weeklySectionScores.get(id);
    const initialScore = currentData?.initialScore ?? section.socialScore;
    
    notificationTracker.weeklySectionScores.set(id, {
      initialScore: initialScore,
      scoreIncrease: section.socialScore - initialScore,
      sectionName: section.communityName
    });
  }

  console.log("✅ Weekly scores updated");
}

async function checkWeeklyWinners() {
  if (!notificationTracker.notificationsEnabled) {
    console.log("Weekly winners check skipped - notifications disabled");
    return;
  }

  console.log("🏆 Checking weekly winners...");
  await updateWeeklyScores();

  // --- Weekly User Winners ---
  console.log("👤 Processing weekly user winners...");
  const userEntries = [...notificationTracker.weeklyUserScores.entries()]
    .map(([id, data]) => ({ id, inc: data.scoreIncrease, username: data.username }))
    .sort((a, b) => b.inc - a.inc);

  for (let i = 0; i < Math.min(userEntries.length, 10); i++) {
    const entry = userEntries[i];
    if (entry.inc <= 0) continue;
    
    const userIdStr = entry.id;
    const prevTier = notificationTracker.weeklyUserHighestTier.get(userIdStr) || 0;
    const hasDropped = notificationTracker.weeklyUserHasDroppedOut.get(userIdStr) || false;
    const currentTier = i === 0 ? 1 : (i < 5 ? 5 : 10);
    const rank = i + 1;
    
    if (currentTier > prevTier || hasDropped) {
      const type = i === 0 ? "user_weekly_number_1" : "user_weekly_top_10";
      await sendNotification({ 
        userId: userIdStr, 
        type, 
        customData: { rank } 
      });
      
      notificationTracker.weeklyUserHighestTier.set(userIdStr, currentTier);
      notificationTracker.weeklyUserHasDroppedOut.set(userIdStr, false);
      console.log(`👤 Weekly user ${rank}: ${userIdStr}, tier: ${currentTier}`);
    }
  }

  // --- Weekly Section Winners ---
  console.log("🏢 Processing weekly section winners...");
  const sectionEntries = [...notificationTracker.weeklySectionScores.entries()]
    .map(([id, data]) => ({ id, inc: data.scoreIncrease, sectionName: data.sectionName }))
    .sort((a, b) => b.inc - a.inc);

  for (let i = 0; i < Math.min(sectionEntries.length, 10); i++) {
    const entry = sectionEntries[i];
    if (entry.inc <= 0) continue;
    
    const sectionIdStr = entry.id;
    const prevTier = notificationTracker.weeklySectionHighestTier.get(sectionIdStr) || 0;
    const hasDropped = notificationTracker.weeklySectionHasDroppedOut.get(sectionIdStr) || false;
    const currentTier = i === 0 ? 1 : (i < 5 ? 5 : 10);
    const rank = i + 1;
    
    if (currentTier > prevTier || hasDropped) {
      const section = await createCliqkData.findById(sectionIdStr).populate("userObjId");
      if (section?.userObjId) {
        const type = i === 0 ? "section_weekly_number_1" : "section_weekly_top_10";
        await sendNotification({ 
          userId: section.userObjId._id, 
          sectionId: section._id,
          type, 
          customData: { 
            rank,
            sectionName: entry.sectionName || "Your Section"
          } 
        });
        
        notificationTracker.weeklySectionHighestTier.set(sectionIdStr, currentTier);
        notificationTracker.weeklySectionHasDroppedOut.set(sectionIdStr, false);
        console.log(`🏢 Weekly section ${rank}: ${sectionIdStr}, tier: ${currentTier}`);
      }
    }
  }

  console.log("✅ Weekly winners check complete");
}

function resetWeeklyTrackers() {
  notificationTracker.weeklyUserScores.clear();
  notificationTracker.weeklySectionScores.clear();
  notificationTracker.weeklyUserHighestTier.clear();
  notificationTracker.weeklySectionHighestTier.clear();
  notificationTracker.weeklyUserHasDroppedOut.clear();
  notificationTracker.weeklySectionHasDroppedOut.clear();
  console.log("✅ Weekly trackers reset");
}

/* ================= MANAGEMENT FUNCTIONS ================= */
function setNotificationsEnabled(val) {
  notificationTracker.notificationsEnabled = val;
  console.log(`🔔 Notifications ${val ? 'ENABLED' : 'DISABLED'}`);
}

function resetAllTrackers() {
  // Clear daily trackers
  notificationTracker.userHighestTier.clear();
  notificationTracker.userPreviousRank.clear();
  notificationTracker.userHasDroppedOut.clear();
  notificationTracker.userTiersEntered.clear();
  notificationTracker.sectionHighestTier.clear();
  notificationTracker.sectionPreviousRank.clear();
  notificationTracker.sectionHasDroppedOut.clear();
  notificationTracker.sectionTiersEntered.clear();
  
  // Clear weekly trackers
  resetWeeklyTrackers();
  
  console.log("✅ All trackers cleared");
}

async function initializeTrackersFromDatabase() {
  console.log("🔄 Initializing trackers from database...");
  try {
    // Initialize user trackers
    const users = await userData.find({ previousRank: { $gt: 0 } }).select("_id previousRank").lean();
    users.forEach(user => {
      const userIdStr = user._id.toString();
      notificationTracker.userPreviousRank.set(userIdStr, user.previousRank);
      
      // Set highest tier based on previous rank
      const tier = getTierFromRank(user.previousRank);
      if (tier > 0) {
        notificationTracker.userHighestTier.set(userIdStr, tier);
        // Mark this tier as entered (user has already been notified about being in this tier)
        const tiersEntered = notificationTracker.userTiersEntered.get(userIdStr) || new Set();
        tiersEntered.add(tier);
        notificationTracker.userTiersEntered.set(userIdStr, tiersEntered);
      }
    });
    console.log(`👤 Initialized ${users.length} users from database`);

    // Initialize section trackers
    const sections = await createCliqkData.find({ previousRank: { $gt: 0 } }).select("_id previousRank").lean();
    sections.forEach(section => {
      const sectionIdStr = section._id.toString();
      notificationTracker.sectionPreviousRank.set(sectionIdStr, section.previousRank);
      
      // Set highest tier based on previous rank
      const tier = getTierFromRank(section.previousRank);
      if (tier > 0) {
        notificationTracker.sectionHighestTier.set(sectionIdStr, tier);
        // Mark this tier as entered (section has already been notified about being in this tier)
        const tiersEntered = notificationTracker.sectionTiersEntered.get(sectionIdStr) || new Set();
        tiersEntered.add(tier);
        notificationTracker.sectionTiersEntered.set(sectionIdStr, tiersEntered);
      }
    });
    console.log(`🏢 Initialized ${sections.length} sections from database`);
  } catch (error) {
    console.error("❌ Error initializing from database:", error.message);
  }
}

async function getNotificationStatus() {
  return {
    notificationsEnabled: notificationTracker.notificationsEnabled,
    userTrackers: notificationTracker.userHighestTier.size,
    sectionTrackers: notificationTracker.sectionHighestTier.size,
    weeklyUserScores: notificationTracker.weeklyUserScores.size,
    weeklySectionScores: notificationTracker.weeklySectionScores.size
  };
}

/* ================= CRON JOBS ================= */
// Daily leaderboard check - every hour
cron.schedule("0 * * * *", checkLeaderboardNotifications);

// Weekly score update - daily at 1 AM
cron.schedule("0 1 * * *", updateWeeklyScores);

// Weekly winners check - Sunday at 11:30 PM
cron.schedule("30 23 * * 0", checkWeeklyWinners);

// Weekly tracker reset - Monday at 12 AM
cron.schedule("0 0 * * 1", resetWeeklyTrackers);

/* ================= INITIALIZATION ================= */
// Initialize on server start with delay
setTimeout(() => {
  initializeTrackersFromDatabase();
}, 5000);

/* ================= EXPORT ================= */
module.exports = {
  sendNotification,
  checkLeaderboardNotifications,
  checkUserLeaderboardNotifications,
  checkSectionLeaderboardNotifications,
  updateWeeklyScores,
  checkWeeklyWinners,
  resetWeeklyTrackers,
  setNotificationsEnabled,
  resetAllTrackers,
  initializeTrackersFromDatabase,
  getNotificationStatus,
  notificationTracker,
  getNotificationType
};