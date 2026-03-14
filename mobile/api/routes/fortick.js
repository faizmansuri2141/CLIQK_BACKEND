var express = require('express');
var router = express.Router();
const vary = require('../../../middleware/authUser');
const forTickControllers = require('../controllers/fortick');

const s3image = require('../../../middleware/s3Image');

router.post('/requestForTick', vary, s3image.upload.fields([{

    name: 'uploadCertificate',
    maxCount: 5,
}, {
    name: 'videoRecord',

}]), forTickControllers.requestForTick)


module.exports = router



