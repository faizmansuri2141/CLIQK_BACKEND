var express = require('express');
var router = express.Router();
const vary = require('../../../middleware/authUser');
const settingScreen = require('../controllers/settingscreen')

router.post('/myJoinSection', vary, settingScreen.myJoinSection);
router.post('/leavefromsection', vary, settingScreen.leaveFromSection)
router.post('/myCreatedSection', vary, settingScreen.myCreatedSection);
router.post('/myJoinSubscribtionList', vary, settingScreen.myJoinSubscribtionList)
router.post('/memberInSection', vary, settingScreen.memberInSection);
router.post('/notificationUpdate', vary, settingScreen.notificationSetting)
router.post('/appnotificationsetting', vary, settingScreen.appNotificationsSetting)






module.exports = router



