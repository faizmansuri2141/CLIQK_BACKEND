var express = require('express');
var router = express.Router();
const homescreen = require('../controllers/homescreen.js');
const vary = require('../../../middleware/authUser');

// done
router.post('/homescreenpost', vary, homescreen.homeScreenPost);
router.post('/communitypost', vary, homescreen.community_post);
router.post('/perventage', vary, homescreen.calculate_percentage);
//done
router.post('/myjoinsectionsListNew', vary, homescreen.joinCommunityByCurrentUser)
// perticulorSectionForPost done

router.post('/perticulorSectionForPost', vary, homescreen.  perticulorSectionForPost);
// myPost  done 

router.post('/myallpost', vary, homescreen.myPost);

// itsSeen
router.post('/isSeen', vary, homescreen.seenPostFromSection)

// done 
router.post('/perticulorPrivateSectionForPost', vary, homescreen.postForPerticulorPrivateSections)

// post Details 
router.post('/postDetails', vary, homescreen.postDetails)



module.exports = router;
