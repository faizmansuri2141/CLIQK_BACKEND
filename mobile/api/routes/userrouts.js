var express = require('express');
var router = express.Router();
const userControllers = require('../controllers/usercontrollers');

const vary = require('../../../middleware/authUser');
const upload = require('../../../middleware/multer');
const s3image = require('../../../middleware/s3Image');



router.get('/forgetpassword/:userId/:token', function (req, res) {
  res.render('resetpass', { userId: req.params.userId, token: req.params.token, success: req.flash('success') });
});

router.post('/registerUser', userControllers.singUp);
router.post('/loginUser', userControllers.login);
router.post('/socialLogin', userControllers.socialLogin);

router.post('/forgetpassword', userControllers.forgetpass);
router.post('/forgetpassword/:userId/:token', userControllers.resetpass);
router.post('/changePassword', vary, userControllers.changePass);
router.post('/updateprofile', vary, s3image.upload.single('image'), userControllers.editProfile);
router.post('/isverified', vary, userControllers.is_verified);
router.post('/deleteAccount', vary, userControllers.deleteAccount);
// block user
router.post('/userblocked', vary, userControllers.addBlockUsers)
// block user list
router.post('/blockuserlist', vary, userControllers.blockUserList)
// un block user
router.post('/unblockuser', vary, userControllers.removeFromBlockList)
// un block user
router.post('/unblockuser', vary, userControllers.removeFromBlockList)
// whos block current user
router.post('/whosBlockCurrentUser', vary, userControllers.whosBlockCurrentUser)
// usersSocialScores
router.post('/usersSocialScores', vary, userControllers.usersSocialScores)
// Emojis
router.post('/Emojis'  ,userControllers.Emojis )

router.post('/score0'  ,userControllers.score0 )







module.exports = router;
