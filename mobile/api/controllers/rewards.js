const Reward = require("../../../models/rewards");
const userData = require("../../../models/user");
const createCliqkData = require("../../../models/createcommunity");
const moment = require("moment");

// 🎯 STEP 1: User Reward Claim API
exports.claimReward = async (req, res, next) => {
    try {
        const { reward_type, section_id, song_title, genre, theme, inspiration, special_notes } = req.body;
        const user_id = req.user._id;

        console.log("🔸 Reward claim request received:", {
            user_id,
            reward_type,
            section_id
        });

        // ✅ Validation - Required fields
        if (!reward_type) {
            return res.status(400).json({
                success: false,
                message: "Reward type is required"
            });
        }

        if (reward_type !== "user_weekly_winner" && reward_type !== "section_weekly_winner") {
            return res.status(400).json({
                success: false,
                message: "Invalid reward type. Must be 'user_weekly_winner' or 'section_weekly_winner'"
            });
        }

        if (reward_type === "section_weekly_winner" && !section_id) {
            return res.status(400).json({
                success: false,
                message: "Section ID is required for section weekly winner"
            });
        }

        // ✅ Check current week range
        const weekStart = moment().startOf('isoWeek'); // Monday
        const weekEnd = moment().endOf('isoWeek');     // Sunday

        console.log("📅 Checking week range:", {
            weekStart: weekStart.format('YYYY-MM-DD'),
            weekEnd: weekEnd.format('YYYY-MM-DD')
        });

        // ✅ Verify if user is actually this week's winner
        console.log("🔍 Verifying weekly winner...");
        // const isWinner = await verifyWeeklyWinner(user_id, reward_type, section_id);
        
        // if (!isWinner) {
        //     console.log("❌ User is not this week's winner");
        //     return res.status(400).json({
        //         success: false,
        //         message: "You are not this week's winner. Only weekly winners can claim rewards."
        //     });
        // }
        // console.log("✅ User verified as weekly winner");

        // ✅ Check if already claimed reward this week
        console.log("🔍 Checking existing rewards...");
        const existingReward = await Reward.findOne({
            user_id: user_id,
            week_start_date: weekStart.toDate(),
            week_end_date: weekEnd.toDate(),
            reward_type: reward_type
        });

        if (existingReward) {
            console.log("❌ Reward already claimed this week");
            return res.status(400).json({
                success: false,
                message: "You have already claimed reward for this week"
            });
        }
        console.log("✅ No existing reward found");

        // ✅ Create new reward claim
        console.log("📝 Creating new reward claim...");
        const reward = new Reward({
            user_id: user_id,
            section_id: section_id || null,
            reward_type: reward_type,
            reward_details: {
                song_title: song_title || "",
                genre: genre || "",
                theme: theme || "",
                inspiration: inspiration || "",
                special_notes: special_notes || ""
            },
            week_start_date: weekStart.toDate(),
            week_end_date: weekEnd.toDate(),
            status: "pending",
            submitted_at: new Date()
        });

        await reward.save();
        console.log("✅ Reward claim saved to database");

        // ✅ Populate data for response
        await reward.populate('user_id', 'username fullname image');
        if (section_id) {
            await reward.populate('section_id', 'communityName');
        }

        console.log("🎉 Reward claim successful for user:", user_id);

        res.status(200).json({
            success: true,
            message: "🎉 Reward claimed successfully! Admin will review your request and send you a congratulatory video.",
            data: {
                _id: reward._id,
                user_id: {
                    _id: reward.user_id._id,
                    username: reward.user_id.username,
                    fullname: reward.user_id.fullname,
                    image: reward.user_id.image
                },
                section_id: reward.section_id ? {
                    _id: reward.section_id._id,
                    communityName: reward.section_id.communityName
                } : null,
                reward_type: reward.reward_type,
                status: reward.status,
                week_start_date: reward.week_start_date,
                week_end_date: reward.week_end_date,
                submitted_at: reward.submitted_at
            }
        });

    } catch (error) {
        console.log("❌ Claim reward error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while claiming reward"
        });
    }
}

// Helper function to verify weekly winner
const verifyWeeklyWinner = async (userId, rewardType, sectionId = null) => {
    try {
        const weekStart = moment().startOf('isoWeek');
        const weekEnd = moment().endOf('isoWeek');

        console.log("🔎 Verifying winner for:", {
            userId,
            rewardType,
            sectionId,
            weekRange: `${weekStart.format('YYYY-MM-DD')} to ${weekEnd.format('YYYY-MM-DD')}`
        });

        if (rewardType === "user_weekly_winner") {
            // Find top user of the week (who had score increase this week)
            const topUser = await userData.findOne({
                lastScoreChange: {
                    $gte: weekStart.toDate(),
                    $lte: weekEnd.toDate()
                }
            }).sort({ socialScore: -1 });

            console.log("👤 Top user found:", {
                topUserId: topUser?._id,
                topUserScore: topUser?.socialScore,
                requestedUserId: userId
            });

            const isWinner = topUser && topUser._id.toString() === userId.toString();
            console.log("✅ User winner verification:", isWinner);
            return isWinner;
        }

        if (rewardType === "section_weekly_winner") {
            // Find top section of the week (who had score increase this week)
            const topSection = await createCliqkData.findOne({
                lastScoreChange: {
                    $gte: weekStart.toDate(),
                    $lte: weekEnd.toDate()
                }
            }).sort({ socialScore: -1 });

            console.log("🏢 Top section found:", {
                topSectionId: topSection?._id,
                topSectionOwner: topSection?.userObjId,
                topSectionScore: topSection?.socialScore,
                requestedUserId: userId
            });

            const isWinner = topSection && topSection.userObjId.toString() === userId.toString();
            console.log("✅ Section winner verification:", isWinner);
            return isWinner;
        }

        console.log("❌ Invalid reward type for verification");
        return false;
    } catch (error) {
        console.error("❌ Verify winner error:", error);
        return false;
    }
}

// 🎯 Get user's rewards list with pagination and filters
exports.getRewardById = async (req, res, next) => { 
    try {
        const { rewardId } = req.body;
        const user_id = req.user._id;

        if (!rewardId) {
            return res.status(400).json({
                status : 0,
                message: "Reward ID is required"
            });
        }

        const reward = await Reward.findOne({
            _id: rewardId,
            user_id: user_id
        })
        .populate('user_id', 'username fullname image email')
        .populate('section_id', 'communityName userObjId');

        if (!reward) {
            return res.status(404).json({
                status : 0,
                message: "Reward not found"
            });
        }

        const rewardObj = reward.toObject();

        // Add video URL
        if (rewardObj.admin_video && rewardObj.admin_video.video_url) {
            rewardObj.admin_video.full_video_url = `${req.protocol}://${req.get('host')}${rewardObj.admin_video.video_url}`;
        }

        res.status(200).json({
          status : 1,
            message: "Reward details fetched successfully",
            data: rewardObj
        });

    } catch (error) {
        console.log("error", error);
        res.status(500).json({
            status : 0,
            message: "Internal server error"
        });
    }
}


exports.getAllRewardsByUserId = async (req, res, next) => { 
    try {
        const user_id = req.user._id;

        const rewards = await Reward.find({
            user_id: user_id
        })
        .populate('user_id', 'username fullname image email')
        .populate('section_id', 'communityName userObjId')
        .sort({ createdAt: -1 }); // Sort by latest first

        if (!rewards || rewards.length === 0) {
            return res.status(404).json({
                status: 0,
                message: "No rewards found for this user",
                data: []
            });
        }

        // Process each reward to add full video URL
        const processedRewards = rewards.map(reward => {
            const rewardObj = reward.toObject();
            
            // Add video URL
            if (rewardObj.admin_video && rewardObj.admin_video.video_url) {
                rewardObj.admin_video.full_video_url = `${req.protocol}://${req.get('host')}${rewardObj.admin_video.video_url}`;
            }
            
            return rewardObj;
        });

        res.status(200).json({
            status: 1,
            message: "All rewards fetched successfully",
            data: processedRewards,
            count: processedRewards.length
        });

    } catch (error) {
        console.log("error", error);
        res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
}