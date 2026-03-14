var express = require('express');
var router = express.Router();
const vary = require('../../../middleware/authUser');
const s3image = require('../../../middleware/s3Image');

const communityControllers = require('../controllers/createcommunityControllers');
const requireAgeVerified = require('../../../middleware/agevalidation');


router.post('/fatchUser', vary, communityControllers.getuserData);
router.post('/createsection', vary, requireAgeVerified ,  s3image.upload.array('communityImage', 5), communityControllers.createCommunity);
// fatch by community Id
router.post('/fatchById', vary, communityControllers.fatchcommunitydata);
// Get section public info - NO TOKEN required (also at GET /s/:id via app.js)
router.get('/getSectionPublicInfo/s', communityControllers.getSectionPublicInfo);
// router.post('/fatchcommunityusinguserid', vary, communityControllers.fatchcommunitydatausinguserId);
// search community
router.post('/searchcommunity', communityControllers.searcCommunity);
router.post('/myprofile', vary, communityControllers.my_profile);
router.post('/friendsprofile', vary, communityControllers.friends_profile);
router.put('/updateCommunity', vary, s3image.upload.array('communityImage', 5), communityControllers.updatecommunity);

// New social score related routes
router.post('/getCommunityScore', vary, communityControllers.getCommunitySocialScore);
router.post('/getUserScore', vary, communityControllers.getUserSocialScore);
router.post('/getTopCommunities', vary, communityControllers.getTopCommunitiesByScore);
router.post('/getTopUsers', vary, communityControllers.getTopUsersByScore);

router.post('/deletesingleimage', communityControllers.deleteCommunitySingleImage);
// delete community
router.post('/deletecommunity', vary, communityControllers.deletecommunity);
router.post('/sendnotificationforcommunity', vary, communityControllers.send_Notifcation_And_Request);
router.post('/is_Accept', vary, communityControllers.accept_Community_Request);
router.post('/notificationlist', vary, communityControllers.notification_list);
router.post('/checkSection', vary, communityControllers.create_cliqk);
router.post('/removemember', vary, communityControllers.delete_member);
// section search
router.post('/joinsection', vary, communityControllers.find_section);
router.post('/all_join_section', vary, communityControllers.all_join_section_list);
router.post('/delete_s_img', vary, communityControllers.delete_single_imageeee);
router.post('/generate_new_key', vary, communityControllers.change_section_key_code);
router.post('/update_key_code', vary, communityControllers.update_Key_code);
// cancel_section_reques
router.post('/cancel_section_request', vary, communityControllers.cancel_join_section_request);
router.post('/join_free_section', vary, communityControllers.Join_free_section);
// member section List
router.post('/sectionMembers', vary, communityControllers.sectionMember);
// joinPrivateSection
router.post('/joinprivatesection', vary, communityControllers.joinPrivateSection);
// members search by name 
router.post('/membersSearchByName', vary, communityControllers.membersSearchByName)
// update bussiness section
router.post('/updateBusinessSection', s3image.upload.array('communityImage', 5), vary, communityControllers.updateBussinessSection)
// remove Single Image
router.post('/removeSectionSingleimage', communityControllers.removeSectionSingleImage)
// updatePrivateSection
router.post('/updatePrivateSection', s3image.upload.array('communityImage', 5), vary, communityControllers.updatePrivateSection)
// deleteSection
router.post('/deleteSection', vary, communityControllers.deleteSection)
// followUnfollowSection
router.post('/followUnfollowSection', vary, communityControllers.followUnfollowSection)
// followersForSection
router.post('/followersForSection', vary, communityControllers.followersForSection)
// removeFollowerFromSection
router.post('/removeFollowerFromSection', vary, communityControllers.removeFollowerFromSection)
// sectionForScenario
router.post('/sectionForScenario', vary, communityControllers.sectionForScenario)
// getTopSectionsBySocialScore
router.post('/getTopSectionsBySocialScore', vary, communityControllers.getTopSectionsBySocialScore)
// getNonMemberUsers
router.post('/getNonMemberUsers' , vary ,  communityControllers.getNonMemberUsers)
// sendSectionInviteToSelectedUsers
router.post('/sendSectionInviteToSelectedUsers' , vary , communityControllers.sendSectionInviteToSelectedUsers)







module.exports = router;
