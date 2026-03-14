const createPostData = require('../../../models/createPost');
const createCliqkData = require('../../../models/createcommunity');
const userData = require('../../../models/user');
const mongoose = require('mongoose');
const voteData = require('../../../models/vote');
const { s3, upload } = require('../../../middleware/s3Image');
const path = require("path");
const activityInSectionData = require('../../../models/activityinsection');
const reportPostBySectionOwnerModel = require('../../../models/reportpostbysectionowner');
const reportUserForPostViolance = require('../../../models/reportsuserforpost');
const notification = require('../../../models/notifiication_list');
const likeDislikePost = require('../../../models/like_dislike_Schema');
const socialScoreCalculator = require('../../../utils/socialScoreCalculator'); // Fixed import

const { google } = require("googleapis");
const axios = require("axios");
const serviceAccount = require("../../../cliqk-e25f0-firebase-adminsdk-vedtf-7eb62187c9.json");

const playerSocialScore = require("../../../models/playerSocialScore");
const csectionSocialSData = require("../../../models/sectionSocialScores");

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

// Firebase Notification Setup
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      undefined,
      serviceAccount.private_key,
      SCOPES
    );

    jwtClient.authorize((err, tokens) => {
      if (err) return reject(err);
      if (!tokens?.access_token)
        return reject(new Error("Access token missing"));
      resolve(tokens.access_token);
    });
  });
}



// Helper Functions
const processTagPeoples = (tagPeoplesInput) => {
    try {
        let tagPeoples = tagPeoplesInput;
        
        // Parse if string
        if (typeof tagPeoples === "string") {
            tagPeoples = JSON.parse(tagPeoples);
        }
        
        // Ensure array
        if (!Array.isArray(tagPeoples)) {
            return [];
        }
        
        // Remove duplicates and validate
        return tagPeoples.reduce((unique, tag) => {
            if (tag && tag.user_id) {
                const userId = tag.user_id.toString ? tag.user_id.toString() : String(tag.user_id);
                if (!unique.some(item => item.user_id === userId)) {
                    unique.push({ ...tag, user_id: userId });
                }
            }
            return unique;
        }, []);
    } catch (error) {
        console.error("Error processing tagPeoples:", error);
        return [];
    }
};

// ✅ CREATE POST - Fixed and optimized
exports.ceatePost = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userName = req.user.username;
        const { 
            post_type, 
            createPostFor, 
            communityId: reqCommunityId, 
            pinPost = false,
            desc,
            createText,
            createGif,
            dualTimeLine,
            utcDate = new Date().toISOString()
        } = req.body;

        // Validate required fields
        if (!reqCommunityId) {
            return res.status(400).json({ status: 0, message: "Community ID is required" });
        }

        const communityId = mongoose.Types.ObjectId(reqCommunityId);
        
        // Find section
        const sectionFind = await createCliqkData.findById(communityId);
        if (!sectionFind) {
            return res.status(404).json({ status: 0, message: "Section not found" });
        }

        const sectionName = sectionFind.communityName;
        
        // Process tag peoples
        const validTagPeoples = processTagPeoples(req.body.tagPeoples);
        
        // Validate post type
        const validPostTypes = ['image', 'text', 'video', 'gif', 'audio'];
        if (!validPostTypes.includes(post_type)) {
            return res.status(400).json({ status: 0, message: "Invalid post type" });
        }

        // Check media room requirements
        if (createPostFor === "mediaroom" && sectionFind.cliqk_type !== "bussiness") {
            return res.status(400).json({ status: 0, message: "Media room posts only allowed in business sections" });
        }

        let addPost;
        const postData = {
            post_type,
            desc,
            communityId,
            user_Id: userId,
            username: userName,
            time_line: req.body.time_line,
            createPostFor,
            communityOwnerId: sectionFind.userObjId,
            utcDate,
            tagPeoples: validTagPeoples,
            pinPost: pinPost === true || pinPost === 'true'
        };

        // Handle different post types
        switch (post_type) {
            case 'image':
                if (!req.files?.createPost || req.files.createPost.length === 0) {
                    return res.status(400).json({ status: 0, message: "Image file is required" });
                }
                
                const createPostFiles = req.files.createPost.map(file => ({
                    image: file.location
                }));
                
                addPost = new createPostData({
                    ...postData,
                    createPost: createPostFiles
                });
                break;

            case 'text':
                if (!createText?.trim()) {
                    return res.status(400).json({ status: 0, message: "Text content is required" });
                }
                
                addPost = new createPostData({
                    ...postData,
                    createText: createText.trim()
                });
                break;

            case 'video':
                if (createPostFor === "normal") {
                    if (!req.files?.createvideo?.[0]?.location) {
                        return res.status(400).json({ status: 0, message: "Video file is required" });
                    }
                    
                    addPost = new createPostData({
                        ...postData,
                        createvideo: req.files.createvideo[0].location
                    });
                } else {
                    // Media room video
                    if (!req.files?.createvideo?.[0]?.location || !req.files?.cover_image?.[0]?.location) {
                        return res.status(400).json({ status: 0, message: "Video and cover image are required for media room" });
                    }
                    
                    addPost = new createPostData({
                        ...postData,
                        createvideo: req.files.createvideo[0].location,
                        cover_image: req.files.cover_image[0].location,
                        file_name: req.body.file_name || "Untitled"
                    });
                }
                break;

            case 'gif':
                if (!createGif?.trim()) {
                    return res.status(400).json({ status: 0, message: "GIF URL is required" });
                }
                
                addPost = new createPostData({
                    ...postData,
                    createGif: createGif.trim()
                });
                break;

            case 'audio':
                if (!req.files?.createAudio?.[0]?.location || !req.files?.cover_image?.[0]?.location) {
                    return res.status(400).json({ status: 0, message: "Audio file and cover image are required" });
                }
                
                addPost = new createPostData({
                    ...postData,
                    createAudio: req.files.createAudio[0].location,
                    cover_image: req.files.cover_image[0].location,
                    file_name: req.body.file_name || "Untitled"
                });
                break;

            default:
                return res.status(400).json({ status: 0, message: "Unsupported post type" });
        }

        // Save post
        await addPost.save();
        const postId = addPost._id;

        // ✅ SOCIAL SCORE SYSTEM - Using centralized calculator
        try {
            // User score for creating post
            await socialScoreCalculator.updateUserSocialScore(
                userId,
                createPostFor === "mediaroom" ? 'CHAT_CREATED_BY_YOU' : 'POST_CREATED_BY_YOU',
                { tagCount: validTagPeoples.length }
            );
            
            // Section score for post creation
            await socialScoreCalculator.updateSectionSocialScore(
                communityId.toString(),
                createPostFor === "mediaroom" ? 'CHATS_CREATED_IN_SECTION' : 'POSTS_CREATED_IN_SECTION',
                { tagCount: validTagPeoples.length }
            );
        } catch (scoreError) {
            console.error("Social score update error:", scoreError);
            // Continue with post creation even if score fails
        }

        // ✅ NOTIFICATIONS
        try {
            // Notify section owner if post is not by owner
            if (userId.toString() !== sectionFind.userObjId.toString()) {
                await sectionOwnerPostNotification({
                    userId,
                    userName,
                    sectionFind,
                    postId,
                    sectionName
                });
            } else {
                // Notify followers if post is by section owner
                await postNotificationFollowers({
                    userId,
                    userName,
                    sectionFind,
                    postId
                });
            }

            // Notify tagged people
            if (validTagPeoples.length > 0) {
                await tagPostPeoplesNotification(userId, validTagPeoples, postId, communityId);
            }
        } catch (notifError) {
            console.error("Notification error:", notifError);
            // Continue even if notifications fail
        }

        // ✅ ACTIVITY TRACKING
        try {
            const membersToNotify = [...new Set([
                ...sectionFind.community_Members.map(m => m.toString()),
                sectionFind.userObjId.toString()
            ])];

            for (const memberId of membersToNotify) {
                const alreadyExists = await activityInSectionData.findOne({
                    userId: memberId,
                    sectionId: communityId,
                    isSeen: false
                });

                if (!alreadyExists) {
                    const activity = new activityInSectionData({
                        userId: memberId,
                        sectionId: communityId,
                        postId: postId
                    });
                    await activity.save();
                }
            }
        } catch (activityError) {
            console.error("Activity tracking error:", activityError);
        }

        return res.status(201).json({
            status: 1,
            message: 'Post created successfully',
            data: addPost
        });

    } catch (error) {
        console.error("Create post error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ CREATE OR UPDATE CHAT - Fixed
exports.createOrUpdateChat = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            createChat,
            desc,
            communityId: reqCommunityId,
            post_type = "chat",
            postId,
            taggedUsers
        } = req.body;

        if (!reqCommunityId) {
            return res.status(400).json({
                status: 0,
                message: "Community ID is required"
            });
        }

        const communityId = mongoose.Types.ObjectId(reqCommunityId);

        // ---------------- MEDIA COUNTS ----------------
        const numImages = req.files?.createPost?.length || 0;
        const numVideos = req.files?.createvideo?.length || 0;
        const numGif = req.files?.createGif?.length || 0;

        // ---------------- VALIDATION ----------------
        const hasText = createChat?.trim() || desc?.trim();
        const hasMedia = numImages > 0 || numVideos > 0 || numGif > 0;

        // ❌ Block only if both text & media missing
        if (!hasText && !hasMedia) {
            return res.status(400).json({
                status: 0,
                message: "Please add text or image/video/gif"
            });
        }

        // ❌ Only 1 media allowed
        if (numImages > 1 || numVideos > 1 || numGif > 1) {
            return res.status(400).json({
                status: 0,
                message: "Only one image, video, or gif allowed"
            });
        }

        // ❌ Mixed media not allowed
        if (
            (numImages && numVideos) ||
            (numImages && numGif) ||
            (numVideos && numGif)
        ) {
            return res.status(400).json({
                status: 0,
                message: "You cannot upload image, video and gif together"
            });
        }

        // ---------------- TAGGED USERS ----------------
        const validTagPeoples = processTagPeoples(taggedUsers);

        // ---------------- MEDIA OBJECT ----------------
        const media = {
            image: numImages === 1 ? req.files.createPost[0].location : null,
            video: numVideos === 1 ? req.files.createvideo[0].location : null,
            gif: numGif === 1 ? req.files.createGif[0].location : null,
            cover_image: req.files?.cover_image?.[0]?.location || null
        };

        let chatPost;

        // =================================================
        // ================= UPDATE CHAT ===================
        // =================================================
        if (postId) {
            chatPost = await createPostData.findOne({
                _id: postId,
                user_Id: userId,
                isActive: true
            });

            if (!chatPost) {
                return res.status(404).json({
                    status: 0,
                    message: "Chat not found or unauthorized"
                });
            }

            if (createChat) chatPost.createChat = createChat.trim();
            if (desc) chatPost.desc = desc.trim();

            if (media.image) chatPost.createPost = [{ image: media.image }];
            if (media.video) chatPost.createvideo = media.video;
            if (media.gif) chatPost.createGif = media.gif;
            if (media.cover_image) chatPost.cover_image = media.cover_image;

            chatPost.utcDate = new Date().toISOString();
            await chatPost.save();

        } 
        // =================================================
        // ================= CREATE CHAT ===================
        // =================================================
        else {
            const chatData = {
                post_type,
                createChat: createChat?.trim() || "",
                desc: desc?.trim() || "",
                communityId,
                user_Id: userId,
                username: req.user.username,
                isChat: true,
                createPostFor: "normal",
                taggedUsers: validTagPeoples,
                utcDate: new Date().toISOString()
            };

            if (media.image) chatData.createPost = [{ image: media.image }];
            if (media.video) chatData.createvideo = media.video;
            if (media.gif) chatData.createGif = media.gif;
            if (media.cover_image) chatData.cover_image = media.cover_image;

            chatPost = new createPostData(chatData);
            await chatPost.save();

            // ---------------- SOCIAL SCORE ----------------
            try {
                const section = await createCliqkData.findById(communityId);

                const isMember =
                    section?.community_Members?.includes(userId) ||
                    section?.followersList?.includes(userId);

                await socialScoreCalculator.updateUserSocialScore(
                    userId,
                    "USER_SENT_MESSAGE",
                    {
                        isMember,
                        tagCount: validTagPeoples.length
                    }
                );

                await socialScoreCalculator.updateSectionSocialScore(
                    communityId.toString(),
                    "MESSAGE_IN_SECTION",
                    { tagCount: validTagPeoples.length }
                );
            } catch (err) {
                console.error("Social score error:", err);
            }

            // ---------------- ACTIVITY TRACKING ----------------
            try {
                const section = await createCliqkData.findById(communityId);
                if (section) {
                    const membersToNotify = [...new Set([
                        ...section.community_Members.map(m => m.toString()),
                        section.userObjId.toString()
                    ])];

                    for (const memberId of membersToNotify) {
                        // Skip if it's the user who created the chat
                        if (memberId === userId.toString()) continue;
                        
                        const alreadyExists = await activityInSectionData.findOne({
                            userId: memberId,
                            sectionId: communityId,
                            isSeen: false
                        });
                        console.log("alreadyExists" ,alreadyExists)

                        if (!alreadyExists) {
                            const activity = new activityInSectionData({
                                userId: memberId,
                                sectionId: communityId,
                                postId: chatPost._id,
                                // activityType: 'chat'
                            });

                            console.log("doggyyy" , activity)
                            await activity.save();
                        }
                    }
                }
            } catch (activityError) {
                console.error("Activity tracking error:", activityError);
            }

            // ---------------- NOTIFICATIONS ----------------
            try {
                await sendNotificationToSectionMembers(
                    communityId,
                    userId,
                    chatPost._id,
                    createChat || desc || "New media message"
                );

                // if (validTagPeoples.length) {
                //     await tagPostPeoplesNotification(
                //         userId,
                //         validTagPeoples,
                //         chatPost._id,
                //         communityId
                //     );
                // }
                if (validTagPeoples.length) {
    const messageText = createChat || desc || "New media message";
    await tagPostPeoplesNotification(
        userId,
        validTagPeoples,
        chatPost._id,
        communityId,
        messageText // ✅ Pass message for preview
    );
}
            } catch (err) {
                console.error("Notification error:", err);
            }
        }

        return res.status(200).json({
            status: 1,
            data: chatPost,
            message: postId
                ? "Chat updated successfully"
                : "Chat created successfully"
        });

    } catch (err) {
        console.error("Chat create/update error:", err);
        return res.status(500).json({
            status: 0,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// ✅ DELETE CHAT - Fixed
exports.deleteChat = async (req, res) => {
    try {
        const { postId } = req.body;
        const userId = req.user._id;

        if (!postId) {
            return res.status(400).json({
                status: 0,
                message: "Post ID is required"
            });
        }

        const chatPost = await createPostData.findOne({
            _id: postId,
            user_Id: userId,
            isActive: true
        });

        if (!chatPost) {
            return res.status(404).json({
                status: 0,
                message: "Chat not found or unauthorized"
            });
        }

        // Soft delete
        chatPost.isActive = false;
        chatPost.deletedAt = new Date();
        await chatPost.save();

        return res.status(200).json({
            status: 1,
            message: "Chat deleted successfully"
        });

    } catch (err) {
        console.error("Delete chat error:", err);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
};

// ✅ REACT ON CHAT - Fixed
exports.reactOnChat = async (req, res) => {
    try {
        const { postId, emoji, type } = req.body;
        const userId = req.user._id;

        // Validation
        if (!postId || !emoji || type === undefined) {
            return res.status(400).json({
                status: 0,
                message: "postId, emoji, and type are required"
            });
        }

        // Validate emoji type
        const validEmojis = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
        if (!validEmojis.includes(emoji)) {
            return res.status(400).json({
                status: 0,
                message: "Invalid emoji"
            });
        }

        // Find post with user details
        const post = await createPostData.findById(postId).populate('user_Id', '_id');
        if (!post) {
            return res.status(404).json({
                status: 0,
                message: "Post not found"
            });
        }

        // Initialize chatReactions if not exists
        if (!post.chatReactions) {
            post.chatReactions = [];
        }

        const existingReactionIndex = post.chatReactions.findIndex(r => r.emoji === emoji);
        let isAddingReaction = false;

        if (existingReactionIndex !== -1) {
            const existingReaction = post.chatReactions[existingReactionIndex];
            const userIndex = existingReaction.reactedUsers.findIndex(u => 
                u.toString() === userId.toString()
            );

            if (userIndex !== -1) {
                // Remove user reaction
                existingReaction.reactedUsers.splice(userIndex, 1);
                existingReaction.count = existingReaction.reactedUsers.length;

                // Remove reaction if no users left
                if (existingReaction.count === 0) {
                    post.chatReactions.splice(existingReactionIndex, 1);
                }
            } else {
                // Remove from other reactions first
                post.chatReactions.forEach(reaction => {
                    if (reaction.emoji !== emoji) {
                        const otherUserIndex = reaction.reactedUsers.findIndex(u => 
                            u.toString() === userId.toString()
                        );
                        if (otherUserIndex !== -1) {
                            reaction.reactedUsers.splice(otherUserIndex, 1);
                            reaction.count = reaction.reactedUsers.length;
                        }
                    }
                });

                // Clean up empty reactions
                post.chatReactions = post.chatReactions.filter(r => r.count > 0);

                // Add to new reaction
                existingReaction.reactedUsers.push(userId);
                existingReaction.count = existingReaction.reactedUsers.length;
                isAddingReaction = true;
            }
        } else {
            // Remove from all other reactions first
            post.chatReactions.forEach(reaction => {
                const userIndex = reaction.reactedUsers.findIndex(u => 
                    u.toString() === userId.toString()
                );
                if (userIndex !== -1) {
                    reaction.reactedUsers.splice(userIndex, 1);
                    reaction.count = reaction.reactedUsers.length;
                }
            });

            // Clean up empty reactions
            post.chatReactions = post.chatReactions.filter(r => r.count > 0);

            // Add new reaction
            post.chatReactions.push({
                emoji,
                type,
                count: 1,
                reactedUsers: [userId]
            });
            isAddingReaction = true;
        }

        await post.save();

        // ✅ SOCIAL SCORE for adding reaction
        if (isAddingReaction) {
            try {
                await socialScoreCalculator.updateUserSocialScore(
                    userId,
                    'USER_REACTED_MESSAGE'
                );

                // Notify post author if not self
                if (post.user_Id && post.user_Id._id.toString() !== userId.toString()) {
                    // If it's a "like" type (type 2), send notification with type 2
                    const notificationType = (type === 2) ? 2 : 8; // 2 for like, 8 for other reactions
                    
                    await sendReactionNotification(
                        post.communityId,
                        userId,
                        post.user_Id._id,
                        postId,
                        emoji,
                        notificationType // Pass the notification type
                    );
                }
            } catch (scoreError) {
                console.error("Social score update error:", scoreError);
            }
        }

        return res.status(200).json({
            status: 1,
            message: "Reaction updated successfully",
            data: post.chatReactions
        });

    } catch (error) {
        console.error("React on chat error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
};

// ✅ UPDATE POST - Fixed
exports.updatePost = async (req, res) => {
    try {
        const userId = req.user._id;
        const { 
            post_Id, 
            post_type, 
            pinPost, 
            desc, 
            createText, 
            createGif,
            tagPeoples: tagPeoplesInput 
        } = req.body;

        if (!post_Id) {
            return res.status(400).json({
                status: 0,
                message: "Post ID is required"
            });
        }

        // Find existing post
        const existingPost = await createPostData.findOne({
            _id: post_Id,
            user_Id: userId,
            isActive: true
        });

        if (!existingPost) {
            return res.status(404).json({
                status: 0,
                message: "Post not found or unauthorized"
            });
        }

        // Process tag peoples
        const validTagPeoples = processTagPeoples(tagPeoplesInput);
        
        // Prepare update data
        const updateData = {
            desc: desc || existingPost.desc,
            pinPost: pinPost !== undefined ? (pinPost === true || pinPost === 'true') : existingPost.pinPost,
            tagPeoples: validTagPeoples,
            utcDate: new Date().toISOString()
        };

        // Handle media updates based on post type
        switch (post_type) {
            case 'image':
                if (req.files?.createPost) {
                    const newImages = req.files.createPost.map(file => ({
                        image: file.location
                    }));
                    updateData.createPost = [...(existingPost.createPost || []), ...newImages];
                }
                break;

            case 'text':
                if (createText) {
                    updateData.createText = createText.trim();
                }
                break;

            case 'video':
                if (req.files?.createvideo?.[0]?.location) {
                    updateData.createvideo = req.files.createvideo[0].location;
                }
                if (req.files?.cover_image?.[0]?.location) {
                    updateData.cover_image = req.files.cover_image[0].location;
                }
                if (req.body.file_name) {
                    updateData.file_name = req.body.file_name;
                }
                break;

            case 'gif':
                if (createGif) {
                    updateData.createGif = createGif.trim();
                }
                break;

            case 'audio':
                if (req.files?.createAudio?.[0]?.location) {
                    updateData.createAudio = req.files.createAudio[0].location;
                }
                if (req.files?.cover_image?.[0]?.location) {
                    updateData.cover_image = req.files.cover_image[0].location;
                }
                if (req.body.file_name) {
                    updateData.file_name = req.body.file_name;
                }
                break;
        }

        // Update post
        const updatedPost = await createPostData.findByIdAndUpdate(
            post_Id,
            { $set: updateData },
            { new: true }
        );

        // Handle notifications for newly tagged people
        if (validTagPeoples.length > 0) {
            const oldTagIds = (existingPost.tagPeoples || []).map(t => t.user_id);
            const newTags = validTagPeoples.filter(tag => 
                !oldTagIds.includes(tag.user_id)
            );
            
            if (newTags.length > 0) {
                await tagPostPeoplesNotification(
                    userId,
                    newTags,
                    post_Id,
                    existingPost.communityId
                );
            }
        }

        return res.status(200).json({
            status: 1,
            message: "Post updated successfully",
            data: updatedPost
        });

    } catch (error) {
        console.error("Update post error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
};

// ✅ DELETE POST - Fixed
exports.delete_Post = async (req, res) => {
    try {
        const { post_Id } = req.body;
        const userId = req.user._id;

        if (!post_Id) {
            return res.status(400).json({
                status: 0,
                message: "Post ID is required"
            });
        }

        const postFind = await createPostData.findOne({
            _id: post_Id,
            isActive: true
        });

        if (!postFind) {
            return res.status(404).json({
                status: 0,
                message: "Post not found"
            });
        }

        // Check authorization (post owner or section owner)
        const isPostOwner = postFind.user_Id.toString() === userId.toString();
        const communityFind = await createCliqkData.findById(postFind.communityId);
        const isSectionOwner = communityFind?.userObjId?.toString() === userId.toString();

        if (!isPostOwner && !isSectionOwner) {
            return res.status(403).json({
                status: 0,
                message: "Unauthorized to delete this post"
            });
        }

        // Delete media files from S3
        try {
            if (postFind.post_type === "image" && postFind.createPost?.length > 0) {
                const deletePromises = postFind.createPost.map(item => {
                    if (item.image) {
                        const imageKey = path.basename(item.image);
                        return s3.deleteObject({
                            Bucket: "clickq-app",
                            Key: decodeURIComponent(imageKey)
                        }).promise();
                    }
                });
                await Promise.all(deletePromises.filter(p => p));
            } else if (postFind.post_type === "video" && postFind.createvideo) {
                const videoKey = path.basename(postFind.createvideo);
                await s3.deleteObject({
                    Bucket: "clickq-app",
                    Key: decodeURIComponent(videoKey)
                }).promise();
            } else if (postFind.post_type === "audio" && postFind.createAudio) {
                const audioKey = path.basename(postFind.createAudio);
                await s3.deleteObject({
                    Bucket: "clickq-app",
                    Key: decodeURIComponent(audioKey)
                }).promise();
            }
        } catch (s3Error) {
            console.error("S3 delete error:", s3Error);
            // Continue with DB deletion even if S3 fails
        }

        // Soft delete the post
        postFind.isActive = false;
        postFind.deletedAt = new Date();
        await postFind.save();

        // Delete related likes
        await likeDislikePost.deleteMany({ post_Id: post_Id });

        return res.status(200).json({
            status: 1,
            message: "Post deleted successfully"
        });

    } catch (error) {
        console.error("Delete post error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
};

// ✅ REPOST - Fixed
exports.repostLegacy = async (req, res) => {
    try {
        const userId = req.user._id;
        const userName = req.user.username;
        const {
            type,
            communityId: reqCommunityId,
            pinPost = false,
            originalPostId,
            post_type,
            desc,
            createText,
            createGif
        } = req.body;

        if (!reqCommunityId || !originalPostId) {
            return res.status(400).json({
                status: 0,
                message: "Community ID and Original Post ID are required"
            });
        }

        const communityId = mongoose.Types.ObjectId(reqCommunityId);

        // Find section
        const sectionFind = await createCliqkData.findById(communityId);
        if (!sectionFind) {
            return res.status(404).json({
                status: 0,
                message: "Section not found"
            });
        }

        // Find original post
        const originalPost = await createPostData.findOne({
            _id: originalPostId,
            isActive: true
        });

        if (!originalPost) {
            return res.status(404).json({
                status: 0,
                message: "Original post not found"
            });
        }

        const sectionName = sectionFind.communityName;
        
        // Process tag peoples
        const validTagPeoples = processTagPeoples(req.body.tagPeoples);

        // Prepare repost data
        const repostData = {
            post_type: post_type || originalPost.post_type,
            desc: desc || originalPost.desc,
            communityId,
            repostUserId: userId,
            user_Id: originalPost.user_Id,
            repost: true,
            username: userName,
            time_line: req.body.time_line || originalPost.time_line,
            createPostFor: "normal",
            communityOwnerId: sectionFind.userObjId,
            utcDate: new Date().toISOString(),
            tagPeoples: validTagPeoples,
            pinPost: pinPost === true || pinPost === 'true',
            originalPostId,
            // Copy media from original post
            createPost: originalPost.createPost || [],
            createText: createText || originalPost.createText,
            createvideo: originalPost.createvideo,
            createGif: createGif || originalPost.createGif,
            createAudio: originalPost.createAudio
        };

        const addPost = new createPostData(repostData);
        await addPost.save();

        // ✅ SOCIAL SCORE SYSTEM
        try {
            // User score for reposting
            await socialScoreCalculator.updateUserSocialScore(
                userId,
                'REPOSTS_YOU_GIVE'
            );

            // Original post owner score
            await socialScoreCalculator.updateUserSocialScore(
                originalPost.user_Id.toString(),
                'REPOST_OF_YOUR_POST'
            );

            // Section score for repost
            await socialScoreCalculator.updateSectionSocialScore(
                communityId.toString(),
                'REPOSTS_OF_POSTS_FROM_SECTION'
            );
        } catch (scoreError) {
            console.error("Social score update error:", scoreError);
        }

        // ✅ NOTIFICATION to original author
        if (originalPost.user_Id.toString() !== userId.toString()) {
            await rePostNotification(
                userId,
                originalPost.user_Id,
                addPost._id,
                communityId,
                sectionName
            );
        }

        return res.status(201).json({
            status: 1,
            message: "Post reposted successfully",
            data: addPost
        });

    } catch (error) {
        console.error("Repost error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
};

// ✅ REPLY TO POST - Fixed
exports.replyToPost = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            post_type = "chat",
            createPostFor = "normal",
            createChat,
            desc,
            communityId: reqCommunityId,
            postId: parentPostId,
            tagPeoples: tagPeoplesInput
        } = req.body;

        // Validation
        if (!parentPostId) {
            return res.status(400).json({
                status: 0,
                message: "Parent post ID is required"
            });
        }

        if (!createChat?.trim() && !desc?.trim()) {
            return res.status(400).json({
                status: 0,
                message: "Reply text is required"
            });
        }

        if (!reqCommunityId) {
            return res.status(400).json({
                status: 0,
                message: "Community ID is required"
            });
        }

        const communityId = mongoose.Types.ObjectId(reqCommunityId);

        // Find parent post
        const parentPost = await createPostData.findOne({
            _id: parentPostId,
            isActive: true
        });

        if (!parentPost) {
            return res.status(404).json({
                status: 0,
                message: "Parent post not found"
            });
        }

        const parentAuthorId = parentPost.user_Id;

        // Process tag peoples
        const validTagPeoples = processTagPeoples(tagPeoplesInput);

        // Create reply
        const reply = new createPostData({
            post_type,
            createPostFor,
            createChat: createChat?.trim(),
            desc: desc?.trim(),
            communityId,
            user_Id: userId,
            username: req.user.username,
            isChat: true,
            isReplied: true,
            replied_postId: parentPost._id,
            tagPeoples: validTagPeoples,
            utcDate: new Date().toISOString()
        });

        await reply.save();

        // Add reply to parent post
        parentPost.replies = parentPost.replies || [];
        parentPost.replies.push(reply._id);
        await parentPost.save();

        // Check if user is section member/follower
        const section = await createCliqkData.findById(communityId);
        let isSectionMember = false;
        let isSectionFollower = false;

        if (section) {
            isSectionMember = section.community_Members?.some(member => 
                member.toString() === userId.toString()
            ) || false;
            
            isSectionFollower = section.followersList?.some(follower => 
                follower.toString() === userId.toString()
            ) || false;
        }

        // ✅ SOCIAL SCORE SYSTEM
        try {
            const additionalData = {
                isMember: isSectionMember || isSectionFollower,
                tagCount: validTagPeoples.length
            };

            // User score for reply
            await socialScoreCalculator.updateUserSocialScore(
                userId,
                'USER_REPLIED_MESSAGE',
                additionalData
            );

            // Section score for reply
            await socialScoreCalculator.updateSectionSocialScore(
                communityId.toString(),
                'REPLY_IN_SECTION',
                additionalData
            );
        } catch (scoreError) {
            console.error("Social score update error:", scoreError);
        }

        // ✅ NOTIFICATIONS
        try {
            // Personal notification to original author
            if (parentAuthorId.toString() !== userId.toString()) {
                await sendPersonalReplyNotification(
                    communityId,
                    userId,
                    parentAuthorId,
                    reply._id,
                    createChat || desc
                );
            }

            // Notification to section members
            await sendNotificationToSectionMembers(
                communityId,
                userId,
                reply._id,
                createChat || desc,
                true
            );

            // Notify tagged users
            // if (validTagPeoples.length > 0) {
            //     await tagPostPeoplesNotification(
            //         userId,
            //         validTagPeoples,
            //         reply._id,
            //         communityId
            //     );
            // }

            if (validTagPeoples.length > 0) {
    const messageText = createChat || desc;
    await tagPostPeoplesNotification(
        userId,
        validTagPeoples,
        reply._id,
        communityId,
        messageText // ✅ Pass message for preview
    );
}
        } catch (notifError) {
            console.error("Notification error:", notifError);
        }

        return res.status(201).json({
            status: 1,
            message: "Reply posted successfully",
            data: reply,
            scoreDetails: {
                isSectionMember,
                isSectionFollower,
                taggedUsersCount: validTagPeoples.length
            }
        });

    } catch (error) {
        console.error("Reply to post error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
};

// ✅ TRACK POST VIEW - Fixed
exports.trackPostView = async (req, res) => {
    try {
        const { postId } = req.body;
        const userId = req.user._id;

        if (!postId) {
            return res.status(400).json({
                status: 0,
                message: "Post ID is required"
            });
        }

        const post = await createPostData.findById(postId);
        if (!post) {
            return res.status(404).json({
                status: 0,
                message: "Post not found"
            });
        }

        // Increment view count
        const updatedPost = await createPostData.findByIdAndUpdate(
            postId,
            { $inc: { views: 1 } },
            { new: true }
        );

        // Check for social score updates (every 10 views)
        const newViewCount = updatedPost.views;
        const previousViewCount = post.views;
        
        const previousThreshold = Math.floor(previousViewCount / 10);
        const newThreshold = Math.floor(newViewCount / 10);
        
        if (newThreshold > previousThreshold) {
            try {
                // Update post owner's score
                await socialScoreCalculator.updateUserSocialScore(
                    post.user_Id.toString(),
                    'VIEWS_ON_CONTENT',
                    { viewCount: newViewCount }
                );
                
                // Update section score if applicable
                if (post.communityId) {
                    await socialScoreCalculator.updateSectionSocialScore(
                        post.communityId.toString(),
                        'VIEWS_ON_SECTION',
                        { viewCount: newViewCount }
                    );
                }
            } catch (scoreError) {
                console.error("Social score update error:", scoreError);
            }
        }

        return res.status(200).json({
            status: 1,
            message: "Post view tracked successfully",
            data: {
                postId: post._id,
                views: updatedPost.views
            }
        });

    } catch (error) {
        console.error("Track post view error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
};

// ✅ REMOVE CHAT REACTION - Fixed
exports.removeChatReaction = async (req, res) => {
    try {
        const { postId, emoji } = req.body;
        const userId = req.user._id;

        if (!postId || !emoji) {
            return res.status(400).json({
                status: 0,
                message: "postId and emoji are required"
            });
        }

        const post = await createPostData.findById(postId);
        if (!post) {
            return res.status(404).json({
                status: 0,
                message: "Post not found"
            });
        }

        // Find reaction
        const reactionIndex = post.chatReactions?.findIndex(r => r.emoji === emoji) || -1;
        
        if (reactionIndex === -1) {
            return res.status(404).json({
                status: 0,
                message: "Reaction not found"
            });
        }

        const reaction = post.chatReactions[reactionIndex];
        
        // Check if user has reacted
        const userIndex = reaction.reactedUsers.findIndex(u => 
            u.toString() === userId.toString()
        );
        
        if (userIndex === -1) {
            return res.status(400).json({
                status: 0,
                message: "You have not reacted with this emoji"
            });
        }

        // Remove user reaction
        reaction.reactedUsers.splice(userIndex, 1);
        reaction.count = reaction.reactedUsers.length;

        // Remove reaction if empty
        if (reaction.count === 0) {
            post.chatReactions.splice(reactionIndex, 1);
        }

        await post.save();

        return res.status(200).json({
            status: 1,
            message: "Reaction removed successfully",
            data: post.chatReactions || []
        });

    } catch (error) {
        console.error("Remove chat reaction error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
};

// ✅ GET CHAT REACTIONS - Fixed
exports.getChatReactions = async (req, res) => {
    try {
        const { post_Id } = req.body;

        if (!post_Id) {
            return res.status(400).json({
                status: 0,
                message: "Post ID is required"
            });
        }

        const post = await createPostData.findById(post_Id)
            .populate({
                path: "chatReactions.reactedUsers",
                select: "username fullname image backgroundImageColour"
            });

        if (!post) {
            return res.status(404).json({
                status: 0,
                message: "Post not found"
            });
        }

        // Define all possible reactions
        const allPossibleReactions = [
            { emoji: "👍", type: "Like" },
            { emoji: "❤️", type: "Love" },
            { emoji: "😂", type: "Funny" },
            { emoji: "😮", type: "Wow" },
            { emoji: "😢", type: "Sad" },
            { emoji: "🔥", type: "Hype" }
        ];

        // Map existing reactions
        const existingReactionsMap = {};
        (post.chatReactions || []).forEach(reaction => {
            existingReactionsMap[reaction.emoji] = reaction;
        });

        // Build complete list
        const completeReactionsList = allPossibleReactions.map(reaction => {
            const existingReaction = existingReactionsMap[reaction.emoji];
            
            if (existingReaction) {
                return {
                    emoji: existingReaction.emoji,
                    type: existingReaction.type,
                    count: existingReaction.count,
                    users: existingReaction.reactedUsers?.map(user => ({
                        _id: user._id,
                        username: user.username,
                        fullname: user.fullname,
                        image: user.image,
                        backgroundImageColour: user.backgroundImageColour
                    })) || []
                };
            } else {
                return {
                    emoji: reaction.emoji,
                    type: reaction.type,
                    count: 0,
                    users: []
                };
            }
        });

        return res.status(200).json({
            status: 1,
            message: "Chat reactions fetched successfully",
            data: {
                post_Id: post._id,
                chatContent: post.createChat || post.desc || "",
                reactions: completeReactionsList
            }
        });

    } catch (error) {
        console.error("Get chat reactions error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
};

// ✅ PIN/UNPIN POST - Fixed
exports.pinUnpinPost = async (req, res) => {
    try {
        const { postId } = req.body;
        const userId = req.user._id;

        if (!postId) {
            return res.status(400).json({
                status: 0,
                message: "Post ID is required"
            });
        }

        const findPost = await createPostData.findOne({
            _id: postId,
            isActive: true
        });

        if (!findPost) {
            return res.status(404).json({
                status: 0,
                message: "Post not found"
            });
        }

        // Check authorization (post owner or section owner)
        const isPostOwner = findPost.user_Id.toString() === userId.toString();
        const communityFind = await createCliqkData.findById(findPost.communityId);
        const isSectionOwner = communityFind?.userObjId?.toString() === userId.toString();

        if (!isPostOwner && !isSectionOwner) {
            return res.status(403).json({
                status: 0,
                message: "Unauthorized to pin/unpin this post"
            });
        }

        // Toggle pin status
        findPost.pinPost = !findPost.pinPost;
        await findPost.save();

        return res.status(200).json({
            status: 1,
            message: `Post ${findPost.pinPost ? 'pinned' : 'unpinned'} successfully`,
            data: { pinPost: findPost.pinPost }
        });

    } catch (error) {
        console.error("Pin/unpin post error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
};

// ✅ DELETE SINGLE OPTION (Vote)
exports.delete_Vote = async (req, res) => {
    try {
        const { Post_Id, option_Id } = req.body;
        
        if (!Post_Id || !option_Id) {
            return res.status(400).json({ 
                status: 0, 
                message: "Post ID and Option ID are required" 
            });
        }

        const post_Data = await createPostData.findById(Post_Id);
        if (!post_Data) {
            return res.status(404).json({ 
                status: 0, 
                message: "Post not found" 
            });
        }

        const option_obj_Id = mongoose.Types.ObjectId(option_Id);
        const delete_Single_Option = await createPostData.findByIdAndUpdate(
            { _id: Post_Id }, 
            { $pull: { option: { _id: option_obj_Id } } },
            { new: true }
        );

        return res.status(200).json({
            status: 1,
            message: 'Single Option Deleted Successfully',
            data: delete_Single_Option
        });

    } catch (error) {
        console.error("Delete vote option error:", error);
        return res.status(500).json({ 
            status: 0, 
            message: "Internal server error" 
        });
    }
}

// ✅ DELETE SINGLE IMAGE/VIDEO/AUDIO
exports.deleteSingleImage_video_audio = async (req, res) => {
    try {
        const { postId, imageId, url_path } = req.body;

        if (!postId || !url_path) {
            return res.status(400).json({
                status: 0,
                message: "Post ID and URL path are required"
            });
        }

        const findPost = await createPostData.findById(postId);
        if (!findPost) {
            return res.status(404).json({
                status: 0,
                message: "Post not found"
            });
        }

        // Extract filename from URL
        let imagePath = path.basename(url_path);
        console.log("Deleting file:", imagePath);

        // Delete from S3
        const params = {
            Bucket: "clickq-app",
            Key: decodeURIComponent(imagePath)
        };

        s3.deleteObject(params, (error, data) => {
            if (error) {
                console.error("S3 delete error:", error);
            } else {
                console.log("S3 delete success:", data);
            }
        });

        // Delete from database based on post type
        if (findPost.post_type === "image" && imageId) {
            // For images, remove from createPost array
            await createPostData.findByIdAndUpdate(
                { _id: postId },
                { $pull: { createPost: { _id: imageId } } },
                { new: true }
            );
            return res.status(200).json({
                status: 1,
                message: "Single image removed successfully"
            });
        } else if (findPost.post_type === "video") {
            // For videos, clear the video field
            await createPostData.findByIdAndUpdate(
                { _id: postId },
                { $unset: { createvideo: "" } },
                { new: true }
            );
            return res.status(200).json({
                status: 1,
                message: "Video removed successfully"
            });
        } else if (findPost.post_type === "audio") {
            // For audio, clear the audio field
            await createPostData.findByIdAndUpdate(
                { _id: postId },
                { $unset: { createAudio: "" } },
                { new: true }
            );
            return res.status(200).json({
                status: 1,
                message: "Audio removed successfully"
            });
        } else {
            return res.status(400).json({
                status: 0,
                message: "Unsupported post type"
            });
        }

    } catch (error) {
        console.error("Delete single media error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
}

// ✅ DELETE SINGLE SECTION FROM POST
exports.delete_Single_Section = async (req, res) => {
    try {
        const { postId, communityObjId } = req.body;

        if (!postId || !communityObjId) {
            return res.status(400).json({
                status: 0,
                message: "Post ID and Community ID are required"
            });
        }

        const Post = await createPostData.findById(postId);
        if (!Post) {
            return res.status(404).json({
                status: 0,
                message: "Post not found"
            });
        }

        // Remove the specific community from post
        const remove_Section = await createPostData.findByIdAndUpdate(
            { _id: postId },
            { $pull: { communityId: communityObjId } },
            { new: true }
        );

        return res.status(200).json({
            status: 1,
            message: "Section removed from post successfully",
            data: remove_Section
        });

    } catch (error) {
        console.error("Delete single section error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
}

// ✅ SELECT VOTE
exports.select_vote = async (req, res) => {
    try {
        const user_Id = req.user._id;
        const { post_Id, question, selct_voteId } = req.body;

        if (!post_Id || !selct_voteId) {
            return res.status(400).json({
                status: 0,
                message: "Post ID and selected vote ID are required"
            });
        }

        // Check if user already voted
        const existingVote = await voteData.findOne({
            post_Id: post_Id,
            vote_userId: user_Id
        });

        if (existingVote) {
            // Update existing vote
            existingVote.selct_voteId = selct_voteId;
            existingVote.updatedAt = new Date();
            await existingVote.save();
        } else {
            // Create new vote
            const vote = new voteData({
                post_Id,
                question,
                selct_voteId,
                vote_userId: user_Id,
            });
            await vote.save();
        }

        // Update vote counts in post
        const votesForOption = await voteData.countDocuments({
            post_Id: post_Id,
            selct_voteId: selct_voteId
        });

        await createPostData.findOneAndUpdate(
            { _id: post_Id, "option._id": selct_voteId },
            { $set: { "option.$.vote_counts": votesForOption } }
        );

        return res.status(200).json({
            status: 1,
            message: 'Your Vote Successfully Done',
            data: { post_Id, selected_vote: selct_voteId, vote_count: votesForOption }
        });

    } catch (error) {
        console.error("Select vote error:", error);
        return res.status(500).json({
            status: 0,
            message: 'Internal server error'
        });
    }
}

// ✅ SELECT SECTION (User's sections)
exports.select_section = async (req, res) => {
    try {
        const user_id = req.user._id;
        
        const select_section = await createCliqkData.aggregate([
            {
                $match: {
                    $or: [
                        { userObjId: user_id },
                        { community_Members: user_id }
                    ]
                }
            },
            {
                $project: {
                    '_id': 1,
                    'communityImage': 1,
                    'communityName': 1,
                    'userObjId': 1,
                    'cliqk_type': 1,
                    'subscrition_type': 1,
                    'followersCount': { 
                        $cond: {
                            if: { $isArray: "$followersList" },
                            then: { $size: "$followersList" },
                            else: 0
                        }
                    },
                    'isOwner': {
                        $cond: [{ $eq: ["$userObjId", user_id] }, true, false]
                    },
                    'isMember': {
                        $cond: {
                            if: { $isArray: "$community_Members" },
                            then: { $in: [user_id, "$community_Members"] },
                            else: false
                        }
                    }
                }
            },
            { $sort: { communityName: 1 } }
        ]);

        return res.status(200).json({
            status: 1,
            message: "Sections fetched successfully",
            data: select_section
        });

    } catch (error) {
        console.error("Select section error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
}

// ✅ REMOVE COMMUNITY FROM POST
exports.remove_community_id = async (req, res) => {
    try {
        const { post_id, community_id } = req.body;

        if (!post_id || !community_id) {
            return res.status(400).json({
                status: 0,
                message: "Post ID and Community ID are required"
            });
        }

        const remove_community_id = await createPostData.findByIdAndUpdate(
            { _id: post_id },
            { $pull: { communityId: community_id } },
            { new: true }
        ).exec();

        if (!remove_community_id) {
            return res.status(404).json({
                status: 0,
                message: "Post not found"
            });
        }

        return res.status(200).json({
            status: 1,
            message: "Community removed from post successfully",
            data: remove_community_id
        });

    } catch (error) {
        console.error("Remove community from post error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
}

// ✅ MEDIA ROOM MP3/MP4 LISTING
exports.mediaRoomMp3_Mp4Listing = async (req, res) => {
    try {
        const userId = req.user._id;
        const { post_type } = req.body;

        if (!post_type) {
            return res.status(400).json({
                status: 0,
                message: "Post type is required (video or audio)"
            });
        }

        const mediaRoomMp3_Mp4Listing = await createCliqkData.aggregate([
            {
                $match: {
                    $or: [
                        {
                            userObjId: userId,
                            cliqk_type: "bussiness"
                        },
                        {
                            $expr: { $in: [userId, "$community_Members"] },
                            cliqk_type: "bussiness"
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "createpostdatas",
                    localField: "_id",
                    foreignField: "communityId",
                    as: "media_room_datas",
                }
            },
            { $unwind: "$media_room_datas" },
            {
                $lookup: {
                    from: "userdatas",
                    localField: "media_room_datas.user_Id",
                    foreignField: "_id",
                    as: "user_Id",
                }
            },
            { $unwind: "$user_Id" },
            {
                $match: {
                    "media_room_datas.post_type": post_type,
                    "media_room_datas.createPostFor": "mediaroom",
                    "media_room_datas.isActive": true
                }
            },
            {
                $project: {
                    _id: "$media_room_datas._id",
                    post_type: "$media_room_datas.post_type",
                    time_line: "$media_room_datas.time_line",
                    cover_image: "$media_room_datas.cover_image",
                    createAudio: "$media_room_datas.createAudio",
                    createvideo: "$media_room_datas.createvideo",
                    views: "$media_room_datas.views",
                    file_name: "$media_room_datas.file_name",
                    username: "$user_Id.username",
                    desc: "$media_room_datas.desc",
                    created_at: "$media_room_datas.createdAt",
                    section_name: "$communityName",
                    section_id: "$_id"
                }
            }
        ]);

        return res.status(200).json({
            status: 1,
            message: "Media fetched successfully",
            data: mediaRoomMp3_Mp4Listing
        });

    } catch (error) {
        console.error("Media room listing error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
}

// ✅ REPORT POST BY SECTION OWNER
exports.reportPostBySectionOwner = async (req, res) => {
    try {
        const userId = req.user._id;
        const { postId, reason } = req.body;

        if (!postId || !reason) {
            return res.status(400).json({
                status: 0,
                message: "Post ID and reason are required"
            });
        }

        const postFind = await createPostData.findById(postId);
        if (!postFind) {
            return res.status(404).json({
                status: 0,
                message: "Post not found"
            });
        }

        // Check if already reported
        const existingReport = await reportPostBySectionOwnerModel.findOne({
            userId: userId,
            postId: postId
        });

        if (existingReport) {
            return res.status(400).json({
                status: 0,
                message: "You have already reported this post"
            });
        }

        const reportPostBySectionOwner = new reportPostBySectionOwnerModel({
            userId: userId,
            postId: postId,
            reason: reason,
            reportedAt: new Date()
        });

        await reportPostBySectionOwner.save();

        return res.status(201).json({
            status: 1,
            message: "Post reported successfully."
        });

    } catch (error) {
        console.error("Report post error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
}

exports.testNotificationn = async (req, res) => {
    testNotification()
}


// ✅ REPORT USER FOR POST VIOLENCE
exports.reportsUserForPostViolance = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { reportUserId, reason, postId } = req.body;

        if (!reportUserId || !reason || !postId) {
            return res.status(400).json({
                status: 0,
                message: "Report user ID, reason, and post ID are required"
            });
        }

        const userFind = await userData.findById(currentUserId);
        if (!userFind) {
            return res.status(404).json({
                status: 0,
                message: "User not found"
            });
        }

        const postFind = await createPostData.findById(postId);
        if (!postFind) {
            return res.status(404).json({
                status: 0,
                message: "Post not found"
            });
        }

        // Check if already reported
        const existingReport = await reportUserForPostViolance.findOne({
            currentUserId: currentUserId,
            reportUserId: reportUserId,
            postId: postId
        });

        if (existingReport) {
            return res.status(400).json({
                status: 0,
                message: "You have already reported this user for this post"
            });
        }

        const reportsUserForPostViolance = new reportUserForPostViolance({
            currentUserId: currentUserId,
            reportUserId: reportUserId,
            reason: reason,
            postId: postId,
            reportedAt: new Date()
        });

        await reportsUserForPostViolance.save();

        return res.status(201).json({
            status: 1,
            message: "User reported successfully"
        });

    } catch (error) {
        console.error("Report user error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
}

// ✅ PIN/UNPIN POST (Updated with proper authorization)
exports.pinUnpinPost = async (req, res) => {
    try {
        const { postId } = req.body;
        const userId = req.user._id;

        if (!postId) {
            return res.status(400).json({
                status: 0,
                message: "Post ID is required."
            });
        }

        const findPost = await createPostData.findById(postId);

        if (!findPost) {
            return res.status(404).json({
                status: 0,
                message: "Post not found."
            });
        }

        // Check if user is post owner or section owner
        const isPostOwner = findPost.user_Id.toString() === userId.toString();
        let isSectionOwner = false;
        
        if (findPost.communityId) {
            const section = await createCliqkData.findById(findPost.communityId);
            if (section) {
                isSectionOwner = section.userObjId.toString() === userId.toString();
            }
        }

        if (!isPostOwner && !isSectionOwner) {
            return res.status(403).json({
                status: 0,
                message: "You are not authorized to pin/unpin this post"
            });
        }

        // Toggle pin status
        findPost.pinPost = !findPost.pinPost;
        await findPost.save();

        return res.status(200).json({
            status: 1,
            message: `Post ${findPost.pinPost ? 'pinned' : 'unpinned'} successfully.`,
            data: { pinPost: findPost.pinPost }
        });

    } catch (error) {
        console.error("Pin/unpin post error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error."
        });
    }
};

// ✅ REPOST FUNCTION (with social scores)
exports.repost = async (req, res) => {
    try {
        const userId = req.user._id;
        const userName = req.user.username;
        const {
            type,
            communityId: reqCommunityId,
            pinPost = false,
            originalPostId,
            post_type,
            desc,
            createText,
            createGif
        } = req.body;

        if (!reqCommunityId || !originalPostId) {
            return res.status(400).json({
                status: 0,
                message: "Community ID and Original Post ID are required"
            });
        }

        const communityId = mongoose.Types.ObjectId(reqCommunityId);

        // Find section
        const sectionFind = await createCliqkData.findById(communityId);
        if (!sectionFind) {
            return res.status(404).json({
                status: 0,
                message: "Section not found"
            });
        }

        // Find original post
        const originalPost = await createPostData.findOne({
            _id: originalPostId,
            // isActive: true
        });

        if (!originalPost) {
            return res.status(404).json({
                status: 0,
                message: "Original post not found"
            });
        }

        const sectionName = sectionFind.communityName;
        
        // Process tag peoples
        const validTagPeoples = processTagPeoples(req.body.tagPeoples);

        // Prepare repost data
        const repostData = {
            post_type: post_type || originalPost.post_type,
            desc: desc || originalPost.desc,
            communityId,
            repostUserId: userId,
            user_Id: originalPost.user_Id,
            repost: true,
            username: userName,
            time_line: req.body.time_line || originalPost.time_line,
            createPostFor: "normal",
            communityOwnerId: sectionFind.userObjId,
            utcDate: new Date().toISOString(),
            tagPeoples: validTagPeoples,
            pinPost: pinPost === true || pinPost === 'true',
            originalPostId,
            // Copy media from original post
            createPost: originalPost.createPost || [],
            createText: createText || originalPost.createText,
            createvideo: originalPost.createvideo,
            createGif: createGif || originalPost.createGif,
            createAudio: originalPost.createAudio,
            // Handle chat posts
            isChat: originalPost.isChat || false,
            createChat: originalPost.createChat || '',
            isActive: true
        };

        const addPost = new createPostData(repostData);
        await addPost.save();

        // ✅ SOCIAL SCORE SYSTEM
        try {
            // User score for reposting (+8 points for reposting)
            await socialScoreCalculator.updateUserSocialScore(
                userId,
                'REPOSTS_YOU_GIVE',
                { points: 8 }
            );

            // Original post owner score (+7 points for getting reposted)
            await socialScoreCalculator.updateUserSocialScore(
                originalPost.user_Id.toString(),
                'REPOST_OF_YOUR_POST',
                { points: 7 }
            );

            // Section score for repost (+6 points to section)
            await socialScoreCalculator.updateSectionSocialScore(
                communityId.toString(),
                'REPOSTS_OF_POSTS_FROM_SECTION',
                { points: 6 }
            );
        } catch (scoreError) {
            console.error("Social score update error:", scoreError);
        }

        // ✅ NOTIFICATION to original author
        if (originalPost.user_Id.toString() !== userId.toString()) {
            await rePostNotification(
                userId,
                originalPost.user_Id,
                addPost._id,
                communityId,
                sectionName
            );
        }

        // ✅ ACTIVITY TRACKING
        try {
            const membersToNotify = [...new Set([
                ...sectionFind.community_Members.map(m => m.toString()),
                sectionFind.userObjId.toString()
            ])];

            for (const memberId of membersToNotify) {
                const alreadyExists = await activityInSectionData.findOne({
                    userId: memberId,
                    sectionId: communityId,
                    isSeen: false
                });

                if (!alreadyExists) {
                    const activity = new activityInSectionData({
                        userId: memberId,
                        sectionId: communityId,
                        postId: addPost._id
                    });
                    await activity.save();
                }
            }
        } catch (activityError) {
            console.error("Activity tracking error:", activityError);
        }

        return res.status(201).json({
            status: 1,
            message: "Post reposted successfully",
            data: addPost,
            socialScoreInfo: {
                reposterGained: 8,
                originalAuthorGained: 7,
                sectionGained: 6
            }
        });

    } catch (error) {
        console.error("Repost error:", error);
        return res.status(500).json({
            status: 0,
            message: "Internal server error"
        });
    }
};

// ==================== HELPER FUNCTIONS ====================

// ✅ Section Owner Post Notification
const sectionOwnerPostNotification = async ({ userId, userName, sectionFind, postId, sectionName }) => {
    try {
        const membersToNotify = [...new Set([
            ...sectionFind.community_Members.map(m => m.toString()),
            sectionFind.userObjId.toString()
        ])].filter(memberId => memberId !== userId.toString());

        for (const memberId of membersToNotify) {
            const userFind = await userData.findById(memberId).select("device_Token appNotification");
            
            if (userFind?.device_Token && userFind.appNotification) {
                await sendPushNotification({
                    token: userFind.device_Token,
                    title: "CLIQK",
                    body: `${userName} has posted in ${sectionName}`,
                    data: {
                        communityId: sectionFind._id.toString(),
                        postId: postId.toString(),
                        notificationType: "section_post"
                    }
                });

                // Save to database
                await notification.create({
                    community_id: sectionFind._id,
                    sender_id: userId,
                    user_id: memberId,
                    notification_message: `${userName} has posted in ${sectionName}`,
                    notification_type: 8,
                    module_id: postId,
                    module_type: "Post"
                });
            }
        }
    } catch (error) {
        console.error("Section owner post notification error:", error);
    }
};

// ✅ Tag People Notification
const tagPostPeoplesNotification = async (userId, validTagPeoples, postId, communityId, messageText = "") => {
    try {
        const findSender = await userData.findById(userId).select("username fullname");
        if (!findSender) return;

        const senderName = findSender.username || findSender.fullname || "User";
        
        // ✅ Get message preview (if available)
        let messagePreview = messageText || "";
        if (messagePreview.length > 30) {
            messagePreview = messagePreview.substring(0, 30) + "...";
        }

        const userIds = validTagPeoples.map(tag => tag.user_id);

        const taggedUsers = await userData.find(
            { _id: { $in: userIds } },
            { _id: 1, device_Token: 1, appNotification: 1 }
        );

        for (const taggedUser of taggedUsers) {
            if (taggedUser.device_Token && taggedUser.appNotification) {
                // ✅ FIXED: As per screenshot requirements
                const title = "CLIQK";
                const body = messagePreview 
                    ? `You were mentioned in a message: "${messagePreview}"`
                    : `You were mentioned in a message`;

                await sendPushNotification({
                    token: taggedUser.device_Token,
                    title,
                    body,
                    data: {
                        communityId: communityId.toString(),
                        postId: postId.toString(),
                        notificationType: "mention",
                        senderName: senderName,
                        messagePreview: messagePreview
                    }
                });

                // Save to database
                await notification.create({
                    community_id: communityId,
                    sender_id: userId,
                    user_id: taggedUser._id,
                    notification_message: body, // ✅ Store with preview
                    notification_type: 4,
                    module_id: postId,
                    module_type: "mentions"
                });
            }
        }
    } catch (error) {
        console.error("Tag people notification error:", error);
    }
};

// ✅ Send Notification to Section Members
const sendNotificationToSectionMembers = async (
  communityId,
  senderId,
  postId,
  messageText,
  isReply = false
) => {
  try {
    const sender = await userData
      .findById(senderId)
      .select("username fullname");

    if (!sender) return;

    const section = await createCliqkData
      .findById(communityId)
      .populate("community_Members", "_id device_Token appNotification")
      .populate("followersList", "_id device_Token appNotification");

    if (!section) return;

    const senderName = sender.username || sender.fullname || "User";
    const sectionName = section.communityName || "Section";

    let preview = messageText || "";
    if (preview.length > 30) preview = preview.slice(0, 30) + "...";

    const title = "CLIQK";
    // const body = `(${sectionName}) · ${senderName}: "${preview}"`;

    const body = `New message in ${sectionName}`; 


    const receivers = new Map();

    section.community_Members?.forEach(m => {
      if (m._id.toString() !== senderId.toString()) {
        receivers.set(m._id.toString(), m);
      }
    });

    section.followersList?.forEach(f => {
      if (f._id.toString() !== senderId.toString()) {
        receivers.set(f._id.toString(), f);
      }
    });

    for (const user of receivers.values()) {
      if (!user.appNotification || !user.device_Token) continue;

      const badgeCount =
        (await notification.countDocuments({
          user_id: user._id,
          is_Shown: true,
        })) + 1;

      await sendPushNotification({
        token: user.device_Token,
        title,
        body,
        badgeCount,
        data: {
          communityId: communityId.toString(),
          postId: postId.toString(),
          isReply: isReply.toString(),
        },
      });

      await notification.create({
        community_id: communityId,
        sender_id: senderId,
        user_id: user._id,
        notification_message: body,
        notification_type: isReply ? 7 : 5,
        module_id: postId,
        module_type: isReply ? "section_reply" : "section_message",
      });
    }
  } catch (err) {
    console.error("❌ sendNotificationToSectionMembers error:", err);
  }
};



// ✅ Generic Push Notification Function
const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
  badgeCount = 1,
}) => {
  try {
    const projectId = process.env.PROJECTID;
    console.log("projectId" ,projectId)
    if (!projectId || !token) {
      console.log("❌ Missing projectId or device token");
      return;
    }

    const accessToken = await getAccessToken();

    const payload = {
      message: {
        token: token,
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
              badge: badgeCount,
            },
          },
        },
        data: {
          badgeCount: badgeCount.toString(),
        //   ...data,
        },
      },
    };

    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    console.log("accessToken" ,accessToken)


    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

  } catch (error) {
    console.error("❌ Push notification error:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
};


// ✅ Reaction Notification
const sendReactionNotification = async (communityId, senderId, authorId, postId, emoji, notificationType = 8) => {
    try {
        const findSender = await userData.findById(senderId).select("username fullname image");
        const findAuthor = await userData.findById(authorId).select("device_Token appNotification");
        
        if (!findSender || !findAuthor || !findAuthor.appNotification) return;
        const section = await createCliqkData.findById(communityId);
        const sectionName = section ? section.communityName : "Section";
        const senderName = findSender.username || findSender.fullname || "User";
        
        // Determine the notification message based on type
        let body;
        if (notificationType === 2) { // Like
            body = `${senderName} liked your message`;
        } else { // Default to reaction
            body = `${senderName} reacted to your message`;
        }
        if (findAuthor.device_Token) {
            await sendPushNotification({
                token: findAuthor.device_Token,
                title: "CLIQK",
                body,
                data: {
                    sectionName,
                    senderName,
                    senderImage: findSender.image || '',
                    emoji,
                    communityId: communityId ? communityId.toString() : "",
                    postId: postId.toString(),
                    notificationType: notificationType === 2 ? "like" : "reaction",
                    click_action: "FLUTTER_NOTIFICATION_CLICK"
                }
            });
        }
        // Save to database with the correct notification type
        await notification.create({
            community_id: communityId,
            sender_id: senderId,
            user_id: authorId,
            notification_message: body,
            notification_type: notificationType, // Use the passed type (2 for like, 8 for other reactions)
            module_id: postId,
            module_type: notificationType === 2 ? "like" : "reaction",
            createdAt: new Date(),
            updatedAt: new Date()
        });
    } catch (error) {
        console.error("Reaction notification error:", error);
    }
};

// ✅ Repost Notification
const rePostNotification = async (userId, postOwner, postId, sectionId, sectionName) => {
    try {
        const currentUser = await userData.findById(userId).select("username");
        const user_deviceid = await userData.findById(postOwner).select("device_Token appNotification");
        
        if (!currentUser || !user_deviceid || !user_deviceid.appNotification) return;

        const username = currentUser.username;
        const title = "CLIQK";
        // const body = `${username} reposted your message`;
        const body = `${username} reposted your message`;

        if (user_deviceid.device_Token && postOwner.toString() !== userId.toString()) {
            await sendPushNotification({
                token: user_deviceid.device_Token,
                title,
                body,
                data: {
                    sectionName,
                    senderName: username,
                    communityId: sectionId.toString(),
                    postId: postId.toString(),
                    notificationType: "repost"
                }
            });
        }

        // Save to database
        await notification.create({
            community_id: sectionId,
            sender_id: userId,
            user_id: postOwner,
            notification_message: body,
            notification_type: 13,
            module_id: postId,
            module_type: "rePost"
        });

    } catch (error) {
        console.error("Repost notification error:", error);
    }
};

// ✅ Personal Reply Notification
const sendPersonalReplyNotification = async (communityId, senderId, authorId, postId, messageText) => {
    try {
        const findSender = await userData.findById(senderId).select("username fullname");
        const findAuthor = await userData.findById(authorId).select("device_Token appNotification");
        
        if (!findSender || !findAuthor || !findAuthor.appNotification) return;

        const section = await createCliqkData.findById(communityId);
        const sectionName = section ? section.communityName : "Section";
        const senderName = findSender.username || findSender.fullname || "User";
        
        let messagePreview = messageText || "";
        if (messagePreview.length > 30) {
            messagePreview = messagePreview.substring(0, 30) + "...";
        }
        
        const title = "CLIQK";
        // const body = `(${sectionName}) - ${senderName} replied to your message: "${messagePreview}"`;

        const body = `${senderName} replied to your message`; // ← यहाँ फिक्स


        if (findAuthor.device_Token) {
            await sendPushNotification({
                token: findAuthor.device_Token,
                title,
                body,
                data: {
                    sectionName,
                    senderName,
                    messagePreview,
                    communityId: communityId ? communityId.toString() : "",
                    postId: postId.toString(),
                    notificationType: "personal_reply"
                }
            });
        }

        // Save to database
        await notification.create({
            community_id: communityId,
            sender_id: senderId,
            user_id: authorId,
            notification_message: body,
            notification_type: 6,
            module_id: postId,
            module_type: "personal_reply"
        });

    } catch (error) {
        console.error("Personal reply notification error:", error);
    }
};

// ✅ Post Notification to Followers
const postNotificationFollowers = async ({ userId, userName, sectionFind, postId }) => {
    try {
        const followersList = await userData.find(
            { _id: { $in: sectionFind.followersList } },
            { _id: 1, device_Token: 1, appNotification: 1 }
        );

        for (const followUser of followersList) {
            if (!followUser.device_Token || !followUser.appNotification) continue;

            const title = "CLIQK";
            const body = `${userName} has posted a new update in the '${sectionFind.communityName}' section.`;

            await sendPushNotification({
                token: followUser.device_Token,
                title,
                body,
                data: {
                    communityId: sectionFind._id.toString(),
                    postId: postId.toString(),
                    notificationType: "sectionOwnerPost"
                }
            });

            // Save to database
            await notification.create({
                community_id: sectionFind._id,
                sender_id: userId,
                user_id: followUser._id,
                notification_message: body,
                notification_type: 15,
                module_id: postId,
                module_type: "sectionOwnerPost"
            });
        }
    } catch (error) {
        console.error("Post notification to followers error:", error);
    }
};


const testNotification = async () => {
    try {
      const projectId = "cliqk-e25f0"; // ✅ Firebase Project ID
      const deviceToken = "dVnBdsWOjEORmp-7l2DyP3:APA91bFlKDzijAyxkadnj0tHQyuij-0Lcnav7b0fCSYX1m8tQFnRBgg1FP4BWCj59HnvTvdbTQ3-pesnXAc1NpwcoiI4MFRKEOuYOewygXa3grm3vn_RZug"; // ✅ real token
  
      const accessToken = await getAccessToken();
  
      const payload = {
        message: {
          token: deviceToken,
          notification: {
            title: "Test Notification",
            body: "Hello! Notification is working 🚀",
          },
        },
      };
  
      const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
  
      console.log("✅ Notification sent:", response.data);
    } catch (error) {
      console.error("❌ Notification failed:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  };