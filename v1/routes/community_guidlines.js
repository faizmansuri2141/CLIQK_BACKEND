var express = require('express');
var router = express.Router();
const community_guidData = require ('../../models/comminity_guidlines')

/* GET home page. */
router.get('/',  async function (req, res, next) {
    const findData = await community_guidData.findOne().lean()
    console.log(findData);
    res.render('commuity_guidlines', { title: 'commuity_guidlines', record: findData })
});

module.exports = router;
