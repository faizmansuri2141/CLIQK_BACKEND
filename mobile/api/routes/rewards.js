const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewards');
const auth = require('../../../middleware/authUser');

router.post('/claim', auth, rewardController.claimReward);

router.post("/getRewardById" , auth , rewardController.getRewardById);

router.post("/getAllRewardsByUserId" , auth , rewardController.getAllRewardsByUserId);








module.exports = router;
