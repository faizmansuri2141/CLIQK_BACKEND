const aws = require('aws-sdk');
const router = require("express").Router();
const multer = require('multer')
const multerS3 = require('multer-s3');
const uuid = require('uuid').v4

aws.config.update({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    region: process.env.AWS_REGION || 'us-east-1'
});

s3 = new aws.S3();

var upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'clickq-app',
        acl: 'public-read',
        contentEncoding: 'base64',
        ContentType: "image/jpeg/mp4/audio/mp3",
        //  contentDisposition: "inline",
        key: function (req, file, cb) {
            console.log(file);
            cb(null, `${uuid()}` + file.originalname); //use Date.now() for unique file keys
        }
    })
});

module.exports = { upload, s3 }