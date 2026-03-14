const express = require('express');
const router = express.Router();
const socialScoreCalculator = require('../../../utils/socialScoreCalculator');
const vary = require('../../../middleware/authUser');

// Get user social score statistics
router.post('/getUserStats', vary, async (req, res) => {
    try {
        const userId = req.user._id;
        const stats = await socialScoreCalculator.getUserSocialScoreStats(userId);
        
        if (stats.success === false) {
            return res.send({ status: 0, message: stats.error });
        }
        
        res.send({
            status: 1,
            message: "User stats retrieved successfully",
            data: stats
        });
    } catch (error) {
        console.error('Error getting user stats:', error);
        res.send({ status: 0, message: error.message });
    }
});

// Manually update user social score (for testing)
router.post('/updateUserScore', vary, async (req, res) => {
    try {
        const { action, additionalData } = req.body;
        const userId = req.user._id;
        
        if (!action) {
            return res.send({ status: 0, message: "Action is required" });
        }
        
        const result = await socialScoreCalculator.updateUserSocialScore(userId, action, additionalData);
        
        if (result.success === false) {
            return res.send({ status: 0, message: result.error });
        }
        
        res.send({
            status: 1,
            message: "User social score updated successfully",
            data: result
        });
    } catch (error) {
        console.error('Error updating user score:', error);
        res.send({ status: 0, message: error.message });
    }
});

// Manually update section social score (for testing)
router.post('/updateSectionScore', vary, async (req, res) => {
    try {
        const { sectionId, action, additionalData } = req.body;
        
        if (!sectionId || !action) {
            return res.send({ status: 0, message: "SectionId and action are required" });
        }
        
        const result = await socialScoreCalculator.updateSectionSocialScore(sectionId, action, additionalData);
        
        if (result.success === false) {
            return res.send({ status: 0, message: result.error });
        }
        
        res.send({
            status: 1,
            message: "Section social score updated successfully",
            data: result
        });
    } catch (error) {
        console.error('Error updating section score:', error);
        res.send({ status: 0, message: error.message });
    }
});

// Get available actions and their point values
router.get('/getScoreActions', (req, res) => {
    try {
        const { INDIVIDUAL_SCORES, SECTION_SCORES, LEVEL_THRESHOLDS } = socialScoreCalculator;
        
        res.send({
            status: 1,
            message: "Score actions retrieved successfully",
            data: {
                individualScores: INDIVIDUAL_SCORES,
                sectionScores: SECTION_SCORES,
                levelThresholds: LEVEL_THRESHOLDS
            }
        });
    } catch (error) {
        console.error('Error getting score actions:', error);
        res.send({ status: 0, message: error.message });
    }
});

// Calculate level from points (for testing)
router.post('/calculateLevel', (req, res) => {
    try {
        const { totalPoints } = req.body;
        
        if (totalPoints === undefined) {
            return res.send({ status: 0, message: "Total points are required" });
        }
        
        const levelInfo = socialScoreCalculator.calculateLevelFromPoints(totalPoints);
        
        res.send({
            status: 1,
            message: "Level calculated successfully",
            data: levelInfo
        });
    } catch (error) {
        console.error('Error calculating level:', error);
        res.send({ status: 0, message: error.message });
    }
});

module.exports = router; 