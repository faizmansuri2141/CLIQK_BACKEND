var express = require('express');
var router = express.Router();
const vary = require('../../../middleware/authUser');
const searchController = require('../controllers/search');

router.post('/add_Search_Tag', vary, searchController.search_Tag);
router.post('/search', vary, searchController.getTag);
router.post('/removetag', vary, searchController.delete_Tag);
router.post('/searchdata', vary, searchController.searchScreen)
// removeSearchHistory
router.post('/clearSearchHistory', vary, searchController.clearSearchHistory)




module.exports = router