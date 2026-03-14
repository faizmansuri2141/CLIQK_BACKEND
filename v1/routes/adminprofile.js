var express = require('express');
var router = express.Router();

const adminData = require('../../models/adminSchema');

/* GET home page. */
router.get('/',  async function(req, res, next) {

const result = await adminData.find().lean()

console.log(result); 
  res.render('adminprofile', { record: result ,  success: req.flash('success'), message: req.flash('error')} ,  );
});

module.exports = router;
