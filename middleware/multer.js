var multer = require('multer');
var path = require('path');


// image store
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'upload/')
    },
    filename: ((req, file, cb) => {
        const ext = path.extname(file.originalname)
        cb(null, Date.now() + ext)
    })

})

var upload = multer({ storage: storage });

module.exports = {upload}