var express = require('express');
var router = express.Router();
// const privacypolicyData = require ('../../models/privacypolicy');
const term_of_use_data = require ('../../models/term_of_use');

/* GET home page. */
router.get('/',  async function (req, res, next) {
    const findData = await term_of_use_data.findOne().lean()
    console.log(findData);
    res.render('term_of_use', { title: 'term_of_use', record: findData })
});

module.exports = router;
