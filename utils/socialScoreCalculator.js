const mongoose = require('mongoose');

/**
 * Social Score Calculator Utility
 * Unified scoring system for both Individual and Section
 */

// Individual Social Score Actions and Points
const INDIVIDUAL_SCORES = {
    // Content Creation
    POST_CREATED_BY_YOU: 6,
    CHAT_CREATED_BY_YOU: 2,
    
    
    // Engagement
    USER_REPLIED_MESSAGE_NON_MEMBER: 2,
    USER_REPLIED_MESSAGE_MEMBER: 6,
    USER_REACTED_MESSAGE: 2,
    
    // Tagging
    USER_TAGGED_PEOPLE_NON_MEMBER: 3,
    USER_TAGGED_PEOPLE_MEMBER: 6,
    
    // Reposting
    REPOSTS_YOU_GIVE: 8,
    REPOST_OF_YOUR_POST: 7,
    
    // Views
    VIEWS_ON_CONTENT: 1, // per 10 views
    
    // Following
    FOLLOW_A_SECTION: 5,
    
    // Reactions to your content
    REACTIONS_ON_YOUR_MESSAGES: 5,
    LIKES_ON_YOUR_POST: 4,
    REPLIES_TO_YOUR_POST: 8,
    
    // Signup referrals
    SUCCESSFUL_SHARE_NEW_SIGNUP: 15,

    // Member activity (used by some controllers)
    NEW_MEMBER_ACCEPTED_INTO_SECTION: 7,

    // Aliases used by controllers (mapped to the closest existing weights)
    LIKES_YOU_GIVE: 2, // mapped to USER_REACTED_MESSAGE weight
    REPLIES_YOU_MAKE_ON_OTHERS: 6, // mapped to USER_REPLIED_MESSAGE_MEMBER weight
    OUTSIDER_COMMENTS_ON_POST: 8, // mapped to REPLIES_TO_YOUR_POST weight
    REACTIONS_ON_CHAT_MESSAGES: 5, // mapped to REACTIONS_ON_YOUR_MESSAGES weight
    REACTS_ON_OTHERS_CONTENT: 2, // mapped to USER_REACTED_MESSAGE weight
    OTHERS_REACT_ON_YOUR_CONTENT: 5 // mapped to REACTIONS_ON_YOUR_MESSAGES weight
};

// Section Social Score Actions and Points
const SECTION_SCORES = {
    // Content Creation in Section
    POSTS_CREATED_IN_SECTION: 6,
    OUTSIDER_COMMENTS_ON_SECTION_POSTS: 8,
    CHATS_CREATED_IN_SECTION: 1,
    
    // Engagement in Section
    REPLY_IN_SECTION_NON_MEMBER: 2,
    REPLY_IN_SECTION_MEMBER: 6,
    MESSAGE_IN_SECTION: 1,
    
    // Tagging in Section
    TAG_IN_SECTION: 3, // per tag
    
    // Reposting from Section
    REPOSTS_OF_POSTS_FROM_SECTION: 6,
    
    // Views on Section Content
    VIEWS_ON_SECTION: 1, // per 10 views
    
    // Member Activity
    NEW_MEMBER_ACCEPTED_INTO_SECTION: 7,
    NEW_FOLLOWER_OF_SECTION: 5,
    
    // Engagement with Section Content
    REACTIONS_ON_CHAT_MESSAGES_IN_SECTION: 5,
    LIKES_ON_POSTS: 4,
    REPLIES_WITHIN_SECTION: 8,
    
    // Signup via Section
    SUCCESSFUL_SHARE_NEW_SIGNUP_VIA_SECTION: 15,

    // Aliases used by controllers
    COMMENTS_MADE_INSIDE_SECTION: 8 // mapped to REPLIES_WITHIN_SECTION weight
};

// Level thresholds reference (matches Figma table)
const LEVEL_THRESHOLDS = [
    { level: 1, totalPoints: 0 },
    { level: 2, totalPoints: 10 },
    { level: 3, totalPoints: 30 },
    { level: 4, totalPoints: 60 },
    { level: 5, totalPoints: 100 },
    { level: 6, totalPoints: 150 },
    { level: 7, totalPoints: 210 },
    { level: 8, totalPoints: 280 },
    { level: 9, totalPoints: 360 },
    { level: 10, totalPoints: 450 }
];

// Helper: derive week metadata once
const getCurrentWeekInfo = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return { weekNumber, year: now.getFullYear() };
};

// Normalize a score log document (user/section) for weekly + total tracking
const applyWeeklyAggregation = (doc, pointsToAdd) => {
    const { weekNumber, year } = getCurrentWeekInfo();

    // initialize arrays if missing on legacy docs
    if (!Array.isArray(doc.weeklyScores)) {
        doc.weeklyScores = [];
    }

    // roll last week into history when week changes
    if (!doc.currentWeekNumber ||
        doc.currentWeekNumber !== weekNumber ||
        doc.currentWeekYear !== year) {

        if (doc.currentWeekScore && doc.currentWeekNumber) {
            doc.weeklyScores.push({
                weekNumber: doc.currentWeekNumber,
                year: doc.currentWeekYear,
                score: doc.currentWeekScore,
                createdAt: new Date()
            });
        }

        doc.currentWeekScore = 0;
        doc.currentWeekNumber = weekNumber;
        doc.currentWeekYear = year;
    }

    doc.currentWeekScore = (doc.currentWeekScore || 0) + pointsToAdd;
    doc.totalScore = (doc.totalScore || 0) + pointsToAdd;
};

/**
 * Calculate level + progress based on total points
 * - Uses LEVEL_THRESHOLDS for 1→10
 * - After level 10: fixed +100 per level
 */
const calculateLevelFromPoints = (totalPoints = 0) => {
    const sorted = [...LEVEL_THRESHOLDS].sort((a, b) => a.totalPoints - b.totalPoints);
    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];

        if (next && totalPoints < next.totalPoints) {
            const lowerBound = current.totalPoints;
            const upperBound = next.totalPoints;
            const span = upperBound - lowerBound;
            const progress = totalPoints - lowerBound;

            return {
                level: current.level,
                progress,
                totalNeeded: span,
                progressPercentage: Math.max(0, Math.min(100, Math.round((progress / span) * 100))),
                pointsToNextLevel: upperBound - totalPoints,
                nextLevel: current.level + 1,
                nextThreshold: upperBound
            };
        }
    }

    // After level 10 → fixed +100 per level (Level 10 at 450, Level 11 at 550, ...)
    const last = sorted[sorted.length - 1];
    const basePoints = last.totalPoints;
    const extraPoints = Math.max(0, totalPoints - basePoints);
    const additionalLevels = Math.floor(extraPoints / 100);
    const level = last.level + additionalLevels;
    const progress = extraPoints % 100;

    return {
        level,
        progress,
        totalNeeded: 100,
        progressPercentage: Math.round((progress / 100) * 100),
        pointsToNextLevel: 100 - progress,
        nextLevel: level + 1,
        nextThreshold: basePoints + (additionalLevels + 1) * 100
    };
};

// Calculate XP based on social score (aligns with calculateLevelFromPoints)
const calculateXP = (socialScore = 0) => {
    const levelInfo = calculateLevelFromPoints(socialScore);
    return {
        xp: levelInfo.level,
        nextThreshold: levelInfo.nextThreshold,
        progress: levelInfo.progress,
        totalNeeded: levelInfo.totalNeeded,
        progressPercentage: levelInfo.progressPercentage
    };
};

/**
 * Calculate individual social score for specific action
 */
const calculateIndividualScore = (action, additionalData = {}) => {
    switch (action) {
        case 'POST_CREATED_BY_YOU':
            return INDIVIDUAL_SCORES.POST_CREATED_BY_YOU;
            
        case 'CHAT_CREATED_BY_YOU':
            return INDIVIDUAL_SCORES.CHAT_CREATED_BY_YOU;
            
        case 'USER_REPLIED_MESSAGE':
            if (additionalData.isMember || additionalData.isFollower) {
                return INDIVIDUAL_SCORES.USER_REPLIED_MESSAGE_MEMBER;
            }
            return INDIVIDUAL_SCORES.USER_REPLIED_MESSAGE_NON_MEMBER;

        // Aliases
        case 'REPLIES_YOU_MAKE_ON_OTHERS':
            if (additionalData.isMember || additionalData.isFollower) {
                return INDIVIDUAL_SCORES.REPLIES_YOU_MAKE_ON_OTHERS;
            }
            return INDIVIDUAL_SCORES.USER_REPLIED_MESSAGE_NON_MEMBER;
            
        case 'USER_REACTED_MESSAGE':
            return INDIVIDUAL_SCORES.USER_REACTED_MESSAGE;

        case 'REACTS_ON_OTHERS_CONTENT':
            return INDIVIDUAL_SCORES.REACTS_ON_OTHERS_CONTENT;
            
        case 'USER_TAGGED_PEOPLE':
            const tagCount = additionalData.tagCount || 1;
            if (additionalData.isMember || additionalData.isFollower) {
                return tagCount * INDIVIDUAL_SCORES.USER_TAGGED_PEOPLE_MEMBER;
            }
            return tagCount * INDIVIDUAL_SCORES.USER_TAGGED_PEOPLE_NON_MEMBER;
            
        case 'USER_SENT_MESSAGE':
            return INDIVIDUAL_SCORES.CHAT_CREATED_BY_YOU;
            
        case 'REPOSTS_YOU_GIVE':
            return INDIVIDUAL_SCORES.REPOSTS_YOU_GIVE;
            
        case 'REPOST_OF_YOUR_POST':
            return INDIVIDUAL_SCORES.REPOST_OF_YOUR_POST;
            
        case 'VIEWS_ON_CONTENT':
            const viewCount = additionalData.viewCount || 0;
            return Math.floor(viewCount / 10) * INDIVIDUAL_SCORES.VIEWS_ON_CONTENT;

        // Alias for older controller usage
        case 'VIEW_A_SECTION':
            const sectionViewCount = additionalData.viewCount || 10;
            return Math.floor(sectionViewCount / 10) * INDIVIDUAL_SCORES.VIEWS_ON_CONTENT;
            
        case 'FOLLOW_A_SECTION':
            return INDIVIDUAL_SCORES.FOLLOW_A_SECTION;

        case 'NEW_MEMBER_ACCEPTED_INTO_SECTION':
            return INDIVIDUAL_SCORES.NEW_MEMBER_ACCEPTED_INTO_SECTION;
            
        case 'REACTIONS_ON_YOUR_MESSAGES':
            return INDIVIDUAL_SCORES.REACTIONS_ON_YOUR_MESSAGES;

        case 'REACTIONS_ON_CHAT_MESSAGES':
            return INDIVIDUAL_SCORES.REACTIONS_ON_CHAT_MESSAGES;

        case 'OTHERS_REACT_ON_YOUR_CONTENT':
            return INDIVIDUAL_SCORES.OTHERS_REACT_ON_YOUR_CONTENT;
            
        case 'LIKES_ON_YOUR_POST':
            return INDIVIDUAL_SCORES.LIKES_ON_YOUR_POST;

        case 'LIKES_YOU_GIVE':
            return INDIVIDUAL_SCORES.LIKES_YOU_GIVE;
            
        case 'REPLIES_TO_YOUR_POST':
            return INDIVIDUAL_SCORES.REPLIES_TO_YOUR_POST;

        case 'OUTSIDER_COMMENTS_ON_POST':
            return INDIVIDUAL_SCORES.OUTSIDER_COMMENTS_ON_POST;
            
        case 'SUCCESSFUL_SHARE_NEW_SIGNUP':
            return INDIVIDUAL_SCORES.SUCCESSFUL_SHARE_NEW_SIGNUP;
            
        default:
            console.warn(`Unknown individual action: ${action}`);
            return 0;
    }
};

/**
 * Calculate section social score for specific action
 */
const calculateSectionScore = (action, additionalData = {}) => {
    switch (action) {
        case 'POSTS_CREATED_IN_SECTION':
            return SECTION_SCORES.POSTS_CREATED_IN_SECTION;
            
        case 'CHATS_CREATED_IN_SECTION':
            return SECTION_SCORES.CHATS_CREATED_IN_SECTION;
            
        case 'REPLY_IN_SECTION':
            if (additionalData.isMember || additionalData.isFollower) {
                return SECTION_SCORES.REPLY_IN_SECTION_MEMBER;
            }
            return SECTION_SCORES.REPLY_IN_SECTION_NON_MEMBER;
            
        case 'MESSAGE_IN_SECTION':
            return SECTION_SCORES.MESSAGE_IN_SECTION;
            
        case 'TAG_IN_SECTION':
            const tagCount = additionalData.tagCount || 1;
            return tagCount * SECTION_SCORES.TAG_IN_SECTION;
            
        case 'REPOSTS_OF_POSTS_FROM_SECTION':
            return SECTION_SCORES.REPOSTS_OF_POSTS_FROM_SECTION;
            
        case 'VIEWS_ON_SECTION':
            const viewCount = additionalData.viewCount || 0;
            return Math.floor(viewCount / 10) * SECTION_SCORES.VIEWS_ON_SECTION;
            
        case 'NEW_MEMBER_ACCEPTED_INTO_SECTION':
            return SECTION_SCORES.NEW_MEMBER_ACCEPTED_INTO_SECTION;
            
        case 'NEW_FOLLOWER_OF_SECTION':
            return SECTION_SCORES.NEW_FOLLOWER_OF_SECTION;
            
        case 'REACTIONS_ON_CHAT_MESSAGES_IN_SECTION':
            return SECTION_SCORES.REACTIONS_ON_CHAT_MESSAGES_IN_SECTION;
            
        case 'LIKES_ON_POSTS':
            return SECTION_SCORES.LIKES_ON_POSTS;
            
        case 'REPLIES_WITHIN_SECTION':
            return SECTION_SCORES.REPLIES_WITHIN_SECTION;

        case 'COMMENTS_MADE_INSIDE_SECTION':
            return SECTION_SCORES.COMMENTS_MADE_INSIDE_SECTION;
            
        case 'SUCCESSFUL_SHARE_NEW_SIGNUP_VIA_SECTION':
            return SECTION_SCORES.SUCCESSFUL_SHARE_NEW_SIGNUP_VIA_SECTION;
            
        default:
            console.warn(`Unknown section action: ${action}`);
            return 0;
    }
};

/**
 * Update user's social score and level
 */
const updateUserSocialScore = async (userId, action, additionalData = {}) => {
    try {
        const userData = require('../models/user'); // Adjust path
        
        const user = await userData.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        // Calculate points to add
        const pointsToAdd = calculateIndividualScore(action, additionalData);
        
        if (pointsToAdd <= 0) {
            return {
                success: true,
                message: 'No points to add',
                oldScore: user.socialScore,
                newScore: user.socialScore,
                pointsAdded: 0
            };
        }
        
        // Update social score
        const oldScore = user.socialScore || 0;
        const newSocialScore = oldScore + pointsToAdd;
        
        // Calculate new XP
        const xpInfo = calculateXP(newSocialScore);
        const levelInfo = calculateLevelFromPoints(newSocialScore);
        
        // Update user document
        user.socialScore = newSocialScore;
        user.xp = xpInfo.xp;
        user.lastScoreUpdate = new Date();
        await user.addToWeeklyScore(pointsToAdd);
        
        // Update playerSocialScore collection
        const playerSocialScore = require('../models/playerSocialScore');
        const scoreEntry = {
            score: pointsToAdd,
            userId: userId,
            scoreFor: action,
            timestamp: new Date(),
            additionalData
        };

        const scoreLog = await playerSocialScore.findOne({ userId }) || new playerSocialScore({ userId, scoresData: [] });
        applyWeeklyAggregation(scoreLog, pointsToAdd);
        scoreLog.scoresData.push(scoreEntry);
        await scoreLog.save();
        
        return {
            success: true,
            oldScore,
            newScore: newSocialScore,
            pointsAdded: pointsToAdd,
            action,
            xpInfo,
            levelInfo,
            weekly: {
                currentWeekScore: user.currentWeekScore || 0,
                currentWeekNumber: user.currentWeekNumber || null,
                currentWeekYear: user.currentWeekYear || null,
                lastWeek: user.getLastWeekData ? user.getLastWeekData() : null
            },
            user: {
                _id: user._id,
                username: user.username,
                socialScore: newSocialScore,
                xp: xpInfo.xp
            }
        };
        
    } catch (error) {
        console.error('Error updating user social score:', error);
        return {
            success: false,
            error: error.message,
            action,
            userId
        };
    }
};

/**
 * Update section's social score
 */
const updateSectionSocialScore = async (sectionId, action, additionalData = {}) => {
    try {
        const createCliqkData = require('../models/createcommunity'); // Adjust path
        
        const section = await createCliqkData.findById(sectionId);
        if (!section) {
            throw new Error('Section not found');
        }
        
        // Calculate points to add
        const pointsToAdd = calculateSectionScore(action, additionalData);
        
        if (pointsToAdd <= 0) {
            return {
                success: true,
                message: 'No points to add',
                oldScore: section.socialScore,
                newScore: section.socialScore,
                pointsAdded: 0
            };
        }
        
        // Update social score
        const oldScore = section.socialScore || 0;
        const newSocialScore = oldScore + pointsToAdd;
        
        // Calculate new XP
        const xpInfo = calculateXP(newSocialScore);
        const levelInfo = calculateLevelFromPoints(newSocialScore);
        
        // Update section document
        section.socialScore = newSocialScore;
        section.xp = xpInfo.xp;
        section.updatedAt = new Date();
        await section.addToWeeklyScore(pointsToAdd);
        
        // Update sectionSocialScores collection
        const sectionSocialScores = require('../models/sectionSocialScores');
        const scoreEntry = {
            score: pointsToAdd,
            sectionId: sectionId,
            scoreFor: action,
            timestamp: new Date(),
            additionalData
        };

        const scoreLog = await sectionSocialScores.findOne({ sectionId }) || new sectionSocialScores({ sectionId, scoresData: [] });
        applyWeeklyAggregation(scoreLog, pointsToAdd);
        scoreLog.scoresData.push(scoreEntry);
        await scoreLog.save();
        
        return {
            success: true,
            oldScore,
            newScore: newSocialScore,
            pointsAdded: pointsToAdd,
            action,
            xpInfo,
            levelInfo,
            weekly: {
                currentWeekScore: section.currentWeekScore || 0,
                currentWeekNumber: section.currentWeekNumber || null,
                currentWeekYear: section.currentWeekYear || null,
                lastWeek: section.getLastWeekData ? section.getLastWeekData() : null
            },
            section: {
                _id: section._id,
                communityName: section.communityName,
                socialScore: newSocialScore,
                xp: xpInfo.xp
            }
        };
        
    } catch (error) {
        console.error('Error updating section social score:', error);
        return {
            success: false,
            error: error.message,
            action,
            sectionId
        };
    }
};

/**
 * Get social score statistics for user
 */
const getUserSocialScoreStats = async (userId) => {
    try {
        const userData = require('../models/user');
        
        const user = await userData.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        const xpInfo = calculateXP(user.socialScore || 0);
        const levelInfo = calculateLevelFromPoints(user.socialScore || 0);
        
        return {
            success: true,
            userId: user._id,
            username: user.username,
            currentScore: user.socialScore || 0,
            currentLevel: user.xp || 1,
            xpInfo,
            levelInfo,
            lastScoreUpdate: user.lastScoreUpdate
        };
        
    } catch (error) {
        console.error('Error getting user social score stats:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    INDIVIDUAL_SCORES,
    SECTION_SCORES,
    LEVEL_THRESHOLDS,
    calculateXP,
    calculateLevelFromPoints,
    calculateIndividualScore,
    calculateSectionScore,
    updateUserSocialScore,
    updateSectionSocialScore,
    getUserSocialScoreStats
};