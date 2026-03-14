var express = require('express');
var router = express.Router();
const like_or_dislikeControllers = require('../controllers/like_dislike_Controllers');
const vary = require('../../../middleware/authUser');
const requireAgeVerified = require('../../../middleware/agevalidation');

router.post('/islike_dislike', vary, requireAgeVerified, like_or_dislikeControllers.Like_Dislike);
router.post('/get_Like', vary, requireAgeVerified, like_or_dislikeControllers.get_Like);
router.post('/comment', vary, requireAgeVerified, like_or_dislikeControllers.is_comment);
router.post('/commentlist', vary, requireAgeVerified, like_or_dislikeControllers.comment_list);
//is_Showen
router.post('/is_showen', vary, requireAgeVerified, like_or_dislikeControllers.is_showen);

router.post('/deleteComment', vary, requireAgeVerified, like_or_dislikeControllers.deleteComments)


// *********************************************************NEW APIS ***************************************************************
router.post('/new_add_comment', vary, requireAgeVerified, like_or_dislikeControllers.new_add_comment);

router.post('/update_comment', vary, requireAgeVerified, like_or_dislikeControllers.update_comment);

router.post('/new_comment_like', vary, requireAgeVerified, like_or_dislikeControllers.new_comment_like);

router.post('/new_add_sub_comment', vary, requireAgeVerified, like_or_dislikeControllers.new_add_sub_comment);

router.post('/update_sub_comment', vary, requireAgeVerified, like_or_dislikeControllers.update_sub_comment)

router.post('/add_reaction', vary, requireAgeVerified, like_or_dislikeControllers.add_reaction);

router.post('/remove_reaction', vary, requireAgeVerified, like_or_dislikeControllers.remove_reaction);

router.post('/get_Comment', vary, requireAgeVerified, like_or_dislikeControllers.getComment);

router.post('/userslist_for_tags_peoples', vary, requireAgeVerified, like_or_dislikeControllers.usersListForTagsPeoples);

router.post('/userfind_with_user_name', vary, like_or_dislikeControllers.userFindWithUserName);

router.post('/delete_sub_comment', vary, like_or_dislikeControllers.delete_sub_comment);
// notificationForPushForMessage
router.post('/notificationForPushForMessage', vary, like_or_dislikeControllers.notificationForPushForMessage);

module.exports = router;
