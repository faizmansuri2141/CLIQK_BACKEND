var express = require('express');
var router = express.Router();
const privacypolicyData = require ('../../models/privacypolicy');


/* GET home page. */
router.get('/',  async function (req, res, next) {
    const findData = await privacypolicyData.findOne().lean()
    console.log(findData);
    res.render('privacypolicy', { title: 'Privacy-Policy', record: findData })
//   res.render('privacypolicy', { title: 'dashboard' });
});

module.exports = router;
