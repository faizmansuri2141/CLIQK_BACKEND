const forTickData = require('../../../models/fortick')
const userData = require('../../../models/user')

exports.requestForTick = async (req, res, next) => {
    try {

        console.log("fields", req.files)

        const userId = req.user._id
        const descriptionForTick = req.body.descriptionForTick
        const instagramUserName = req.body.instagramUserName
        const xtwitterUserName = req.body.xtwitterUserName
        const tikTokUserName = req.body.tikTokUserName

        const alreadyRequested = await forTickData.findOne({ userId: userId })

        if (alreadyRequested !== null) {
            return res.send({
                status: 0, message: "You have already requested for tick"
            })
        }
        else {

            if (!descriptionForTick || !userId) {
                return res.send({ status: 0, message: "descriptionForTick and userId are required" })
            }

            if (!instagramUserName && !xtwitterUserName && !tikTokUserName) {
                return res.send({ status: 0, message: 'At least one username should be provided.' })

            }
            else {
                // var uploadCertificate = []
                // for (let i = 0; i < req.files.length; i++) {
                //     uploadCertificate.push({ image: req.files[i].location })
                // }

                const createPostFiles = req.files['uploadCertificate']; // Access the array of files for 'uploadCertificate'

                var uploadCertificate = createPostFiles.map((file) => {
                    return { image: file.location };
                });

                console.log("uploadCertificate", uploadCertificate)

                const requestForTick = new forTickData({
                    uploadCertificate: uploadCertificate,
                    videoRecord: req.files.videoRecord[0].location,
                    descriptionForTick: descriptionForTick,
                    userId: userId,
                    instagramUserName: instagramUserName,
                    xtwitterUserName: xtwitterUserName,
                    tikTokUserName: tikTokUserName

                })
                requestForTick.save()

                console.log("requestForTick=>>>>", requestForTick)

                const request = await userData.findByIdAndUpdate({ _id: req.user._id },
                    {
                        forTickStatus: 3
                    }, { new: true })
                res.send({ status: 1, message: "Your account is under review" })
            }

        }

    }
    catch (error) {
        console.log("error=>>>>", error)
        res.send({ status: 0, message: "Something went wrong" })
    }
}