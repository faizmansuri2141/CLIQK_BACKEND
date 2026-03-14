var express = require('express');
var router = express.Router();
const vary = require('../../../middleware/authUser');
const media_room_Controllers = require('../controllers/media_room');
const s3image = require('../../../middleware/s3Image');


router.post('/add_media', vary, s3image.upload.fields([{ name: 'cover_image' }, { name: 'file_upload_mp3' }, { name: 'file_upload_mp4', }]), media_room_Controllers.add_media);
// router.post('/get_mp3_list', vary, media_room_Controllers.get_mp3);
// router.post('/get_mp4_list', vary, media_room_Controllers.get_mp4);
// router.post('/section_mp3', vary, media_room_Controllers.media_room_screen_5);
// router.post('/section_mp4', vary, media_room_Controllers.media_room_screen_6);
router.post('/removefile', vary, media_room_Controllers.remove_file);
router.post('/count', vary, media_room_Controllers.post_counts);
router.post('/add_favorite', vary, media_room_Controllers.add_media_likes);
router.post('/media_room' , vary , media_room_Controllers.get_media_room);
router.post('/myFavoriteList' , vary , media_room_Controllers.myFavoriteList)
router.post('/update_media' , vary ,   s3image.upload.fields([{ name: 'cover_image' }, { name: 'file_upload_mp3' }, { name: 'file_upload_mp4', }]) ,media_room_Controllers.update_media);




module.exports = router