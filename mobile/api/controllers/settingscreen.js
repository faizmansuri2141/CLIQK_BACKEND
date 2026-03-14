const SectionData = require('../../../models/createcommunity')
const mongoose = require("mongoose")
const sectionRequestData = require('../../../models/send_Community_Notification')
const notificationData = require('../../../models/notifiication_list')
const userData = require('../../../models/user')



exports.myJoinSection = async (req, res, next) => {
    try {
        const userId = req.user._id

        const myJoinSections = await SectionData.aggregate([
            {
                $match: {
                    community_Members: userId

                }
            }
        ]);

        if (myJoinSections.length === 0) {
            return res.send({ status: 1, message: "Do not have data", data: [] })
        }

        const Data = []
        for (const item of myJoinSections) {

            let obj = {}
            obj._id = item._id
            obj.cliqk_type = item.cliqk_type
            obj.subscrition_type = item.subscrition_type ? item.subscrition_type : ""
            obj.timescale = item.timescale ? item.timescale : ""
            obj.communityImage = item.communityImage[0]
            obj.communityName = item.communityName
            obj.userObjId = item.userObjId,

                Data.push(obj)
        }

        res.send({ status: 1, message: "My Join Section Fatch Successfully", data: Data })

    }
    catch (error) {
        res.send({ status: 0, message: error.message })
    }
}

// leave section api
exports.leaveFromSection = async (req, res, next) => {
    try {
        const userId = req.user._id
        const sectionId = req.body.sectionId

        const findSection = await SectionData.findOne({ _id: sectionId })
        console.log("findSection=>>>>", findSection)

        if (findSection === null) {
            return res.send({ status: 0, message: "Section Not Found" })
        }
        const memberInSection = await SectionData.findOne({ community_Members: userId, _id: sectionId })
        console.log("memberInSection=>>>>", memberInSection)

        if (memberInSection === null) {
            return res.send({ status: 0, message: "You are not in this section" })
        }
        else {
            const remove_from_community = await SectionData.findByIdAndUpdate({ _id: sectionId }, { $pull: { community_Members: userId } }, { new: true }).exec()
            return res.send({ status: 1, message: "Remove from section successfully" })
        }

    }
    catch (error) {
        res.send({ status: 0, message: error.message })
    }
}


// my created section
exports.myCreatedSection = async (req, res, next) => {
    try {
        const userId = req.user._id

        const myJoinSections = await SectionData.aggregate([
            {
                $match: {
                    userObjId: userId

                }
            }
        ]);

        if (myJoinSections.length === 0) {
            return res.send({ status: 1, message: "Do not have data", data: [] })
        }

        const Data = []
        for (const item of myJoinSections) {


            let obj = {}
            obj._id = item._id
            obj.cliqk_type = item.cliqk_type
            obj.subscrition_type = item.subscrition_type ? item.subscrition_type : ""
            obj.timescale = item.timescale ? item.timescale : ""
            obj.communityImage = item.communityImage
            obj.communityName = item.communityName
            obj.userObjId = item.userObjId,
                obj.community_Members = item.community_Members
                obj.followersCount = item.followersList.length

            Data.push(obj)
        }
        console.log("Data", Data)

        res.send({ status: 1, message: "My created section list fatch successfully", data: Data })

    }
    catch (error) {
        res.send({ status: 0, message: error.message })
    }
}

// jo subscribtion vale list me hu vo
exports.myJoinSubscribtionList = async (req, res, next) => {
    try {

        const userId = req.user._id

        const myJoinSections = await SectionData.aggregate([
            {
                $match: {
                    community_Members: userId,
                    subscrition_type: "paid"

                }
            }
        ]);

        if (myJoinSections.length === 0) {
            return res.send({ status: 1, message: "Do not have data", data: [] })
        }

        const Data = []
        for (const item of myJoinSections) {

            let obj = {}
            obj._id = item._id
            obj.cliqk_type = item.cliqk_type
            obj.subscrition_type = item.subscrition_type ? item.subscrition_type : ""
            obj.timescale = item.timescale ? item.timescale : ""
            obj.communityImage = item.communityImage
            obj.communityName = item.communityName
            obj.userObjId = item.userObjId
            obj.Amount = item.Amount
            obj.aboutCommunity = item.aboutCommunity


            Data.push(obj)
        }

        res.send({ status: 1, message: "My subscribtion section list fatch successfully", data: Data })

    }
    catch (error) {
        res.send({ status: 0, message: error.message })
    }
}


// member in section List
exports.memberInSection = async (req, res, next) => {
    try {
        const userId = req.user._id
        const sectionId = mongoose.Types.ObjectId(req.body.sectionId)

        const findSection = await SectionData.findOne({ _id: sectionId })

        if (findSection === null) {
            return res.send({ status: 1, message: "Section Not Found", data: [] })
        }

        const memberInSection = await SectionData.aggregate([
            {
                $match: {
                    _id: sectionId
                }
            },
            {
                "$lookup": {
                    "from": "userdatas",
                    "localField": "community_Members",
                    "foreignField": "_id",
                    "as": "community_Members"
                }
            },
            { $unwind: "$community_Members" },


        ])
        const Data = []
        for (const item of memberInSection) {

            let obj = {}
            obj._id = item._id
            obj.userId = item.community_Members._id
            obj.username = item.community_Members.username
            obj.image = item.community_Members.image
            obj.backgroundImageColour = item.community_Members.memberInSection


            Data.push(obj)
        }

        res.send({ status: 1, message: "Section members list fatch successfully", data: Data })

    }
    catch (error) {
        res.send({ status: 0, message: error.message })
    }
}


exports.notificationSetting = async (req, res, next) => {
    try {

        console.log("body=>>>>", req.body)
        const userId = req.user._id

        const updateNotifications = await userData.findOneAndUpdate({ _id: userId }, {
            whenSomeoneJoinMySection: req.body.whenSomeoneJoinMySection,
            OwnerPostNotification: req.body.OwnerPostNotification
        })

        res.send({ status: 1, message: "Notifications updated successfully", data: { whenSomeoneJoinMySection: updateNotifications.whenSomeoneJoinMySection, OwnerPostNotification: updateNotifications.OwnerPostNotification } })

    }
    catch (error) {
        console.log("error", error)
        res.send({ status: 0, message: "Something wents wrong" })

    }
}

// app notifications setting
exports.appNotificationsSetting = async (req, res, next) => {
    try {

        const userId = req.user._id
        const appNotification = req.body.appNotification

        const userFind = await userData.findOne({ _id: userId })

        if (!appNotification) {
            return ({ status: 0, message: "appNotification is required." })
        }

        // appNotification 
        userFind.appNotification = appNotification
        await userFind.save()

        return res.send({ status: 1, message: "App notification updated successfully." })

    }
    catch (error) {
        console.log("error", error)
        res.send({ status: 0, message: "Something wents wrong" })

    }
}