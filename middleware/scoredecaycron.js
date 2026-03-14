const cron = require("node-cron");
const moment = require("moment");
const userData = require("../models/user");
const createCliqkData = require("../models/createcommunity");

// 🧠 Decay calculation (5% decay, with floor at 25% of peak)
const applyDecay = (current, peak) => {
  const decay = current * 0.05;
  const decayed = current - decay;
  const floor = peak * 0.25;
  return decayed < floor ? floor : Math.floor(decayed);
};

// 🕒 Run every day at 2:00 AM
cron.schedule("* * * * *", async () => {
  console.log("✅ Running Cliqk Score Decay Cron Job");

  const today = moment();

  // 🚹 USER SCORE DECAY
  const users = await userData.find({ socialScore: { $gte: 10 } });
  for (const user of users) {
    const lastOpen = user.lastAppOpen ? moment(user.lastAppOpen) : null;
    const lastInteract = user.lastInteraction ? moment(user.lastInteraction) : null;
    const lastDecay = user.lastDecay ? moment(user.lastDecay) : null;

    const isInactiveByOpen = lastOpen && today.diff(lastOpen, "days") >= 7;
    const isInactiveByActivity = lastInteract && today.diff(lastInteract, "days") >= 10;

    if (isInactiveByOpen && isInactiveByActivity) {
      const referenceDate = lastDecay || lastInteract || lastOpen;
      if (today.diff(referenceDate, "days") >= 7) {
        const peak = user.socialScore; // using socialScore as peak, per your logic
        const newScore = applyDecay(user.socialScore, peak);
        user.socialScore = newScore;
        user.lastDecay = today.toDate();
        await user.save();
      }
    }
  }

  // 📦 SECTION SCORE DECAY
  const sections = await createCliqkData.find({ socialScore: { $gte: 10 } });

  for (const section of sections) {
    const lastActivity = section.updatedAt ? moment(section.updatedAt) : null;
    const lastDecay = section.lastDecay ? moment(section.lastDecay) : null;


    const isInactive = lastActivity && today.diff(lastActivity, "days") >= 10;

    if (isInactive) {
      const referenceDate = lastDecay || lastActivity;
      if (today.diff(referenceDate, "days") >= 7) {
        const peak = section.socialScore; // using current socialScore as peak
        const newScore = applyDecay(section.socialScore, peak);
        section.socialScore = newScore;
        section.lastDecay = today.toDate();
        await section.save();
      }
    }
  }

  console.log("✅ Score Decay Job Finished");
});
