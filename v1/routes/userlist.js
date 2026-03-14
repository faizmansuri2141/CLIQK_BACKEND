var express = require('express');
var router = express.Router();
const getuser = require('../controllers/getmobileuser');

/* GET user list - uses getuserData for filtering (All, 18+, 13-17, Unapproved) */
router.get('/', getuser.getuserData);

module.exports = router;
