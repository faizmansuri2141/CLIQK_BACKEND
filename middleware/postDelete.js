const cron = require("node-cron");
const createPostData = require("../models/createPost");
// Indexing for faster queries (run once during schema setup)
createPostData.createIndexes({ createdAt: 1, pinPost: 1 });

// Runs every hour and disables posts older than 7 days (if pinPost is false)
cron.schedule("0 0 * * *", async () => {
    try {
        console.log("⏳ Checking for expired posts...");
        const result = await createPostData.updateMany(
            { 
                pinPost: false, 
                createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            },
            { $set: { isActive: false } }
        );

        console.log(`✅ Disabled ${result.modifiedCount} expired posts.`);
    } catch (error) {
        console.error("❌ Error in disabling expired posts:", error);
    }
});
