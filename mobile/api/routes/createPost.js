var express = require('express');
var router = express.Router();
const postRouter = require('../controllers/createPostControllers');
const vary = require('../../../middleware/authUser');
const s3image = require('../../../middleware/s3Image');
const requireAgeVerified = require('../../../middleware/agevalidation');
const checkSuspension = require('../../../middleware/checkSuspension');



router.post('/createPost', vary, requireAgeVerified, checkSuspension, s3image.upload.fields([{

    name: 'createPost',
    maxCount: 5,
}, {
    name: 'createvideo',

},
{
    name: 'createAudio',

},
{
    name: 'cover_image'
}
]), postRouter.ceatePost);
// get community Data
router.put(
    '/updatePost',requireAgeVerified ,
    vary,
    s3image.upload.fields([
      { name: 'createPost', maxCount: 10 },  // Increased image limit
      { name: 'createvideo', maxCount: 1 },
      { name: 'cover_image', maxCount: 1 },
    //   { name: 'createAudio', maxCount: 1 }, 
      { name: 'createGif', maxCount: 1 }     // Added GIF support
    ]),
    postRouter.updatePost
  );// router.post('/deletesinglepostimage/:postId/:imageId', s3image.upload.array('createPost', 5), postRouter.deletesinglePost);
router.post('/deleteSingleImage', postRouter.deleteSingleImage_video_audio);
router.post('/deleteSingleOption', postRouter.delete_Vote);
router.post('/deletepost', vary, postRouter.delete_Post);
router.post('/deleteSingleSection', postRouter.delete_Single_Section);
// router.post('/deletePost/:id', postRouter.deletePost);
router.post('/vote', vary, postRouter.select_vote);
router.post('/select_section', vary, postRouter.select_section);
router.post('/removesection', vary, postRouter.remove_community_id);
// singlemediaremoveons3
router.post('/removeOns3media', vary, postRouter.deleteSingleImage_video_audio)
// filter mp3 or mp4 media room listings 
router.post('/mediaRoomMp3_Mp4Listing', vary, postRouter.mediaRoomMp3_Mp4Listing)
// reportPostBySectionOwner
router.post('/reportPostBySectionOwner', vary, postRouter.reportPostBySectionOwner)
router.post('/reportUserForViolance', vary, postRouter.reportsUserForPostViolance)
router.post('/pin_unpin_post', vary, postRouter.pinUnpinPost)
router.post('/repost', vary, postRouter.repost)
// router.post('/createOrUpdateChat', vary, postRouter.createOrUpdateChat)
// 🔹 Create or Update Chat (text + optional media)
// 🟢 Create or Update Chat
router.post(
  '/createOrUpdateChat',
  vary,
  requireAgeVerified,
  s3image.upload.fields([
    { name: 'createPost', maxCount: 10 },   // multiple images
    { name: 'createvideo', maxCount: 1 },   // single video
    { name: 'cover_image', maxCount: 1 },   // cover image support
    { name: 'createGif', maxCount: 1 }      // gif support
  ]),
  postRouter.createOrUpdateChat
);

router.post(
  '/deleteChat',
  vary,
  requireAgeVerified,
  postRouter.deleteChat
);

router.post(
  '/replyToPost',
  vary,
  requireAgeVerified,
  postRouter.replyToPost
);


router.post('/reactOnChat', vary, requireAgeVerified, postRouter.reactOnChat)


// New route for tracking post views and updating social scores
router.post('/trackPostView', vary, postRouter.trackPostView)

router.post('/removeChatReaction', vary, requireAgeVerified, postRouter.removeChatReaction)

router.post('/getChatReactions', vary, requireAgeVerified, postRouter.getChatReactions)

router.post('/testNotificationn' , postRouter.testNotificationn)




module.exports = router;
