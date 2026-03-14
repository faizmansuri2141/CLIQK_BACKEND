const mongoose = require("mongoose");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment");
const cron = require("node-cron");

// MongoDB connection string
const MONGO_URI = "mongodb+srv://cliqkuser:cliqk156rvug@cliqk.52epdkk.mongodb.net/cliqk?retryWrites=true&w=majority&appName=CLIQK";

// Backup directory
const BACKUP_DIR = path.join(__dirname, "json_backups");

// Ensure the backup directory exists
fs.ensureDirSync(BACKUP_DIR);

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI);
      console.log("✅ Database Connected...");
    }
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

// Function to get all collections
const getCollections = async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    return collections.map((col) => col.name);
  } catch (error) {
    console.error("❌ Error fetching collections:", error);
    return [];
  }
};

// Function to delete old backups before creating a new one
const clearOldBackups = async () => {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    for (const file of files) {
      await fs.remove(path.join(BACKUP_DIR, file));
    }
    console.log("🗑️ Old backups deleted.");
  } catch (error) {
    console.error("❌ Error deleting old backups:", error);
  }
};

// Function to export data (each collection in a separate JSON file)
const backupMongoDB = async () => {
  try {
    await connectDB();
    await clearOldBackups();

    const db = mongoose.connection.db;
    const collections = await getCollections();
    const timestamp = moment().format("YYYY-MM-DD_HH-mm-ss");

    if (collections.length === 0) {
      console.warn("⚠️ No collections found to backup.");
      return;
    }

    for (const colName of collections) {
      const data = await db.collection(colName).find({}).toArray();
      const backupFilePath = path.join(BACKUP_DIR, `${colName}_${timestamp}.json`);
      await fs.writeJson(backupFilePath, data, { spaces: 2 });

      console.log(`✅ Backup saved: ${backupFilePath}`);
    }
  } catch (error) {
    console.error("❌ Backup failed:", error);
  }
};

// 🕒 Schedule the backup every 24 hours at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("🔄 Running scheduled backup...");
  await backupMongoDB();
});

// Export the function
module.exports = backupMongoDB;
