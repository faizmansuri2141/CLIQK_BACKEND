var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('communityprofile', { title: 'communityprofile' });
});

module.exports = router;
