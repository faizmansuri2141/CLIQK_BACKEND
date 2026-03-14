const communityData = require('../../models/createcommunity');
const postData = require('../../models/createPost')
const mongoose = require('mongoose')



exports.communityList = async (req, res, next) => {

    try {
        const data = await communityData.find().lean()
        console.log(data);
        res.render('communitylist', { communityData: data })
        // res.send({data})
    } catch (error) {
        console.log(error);

    }
}
// community 
// exports.findbyidcommunity = async (req, res, next) => {

//     try {
//         console.log(req.params.id);
//         const communityProfile = await communityData.findById(req.params.id);
//         console.log("community  data find.............", communityProfile);

//         res.render('communityprofile', { communityProfile });
//     }
//     catch (error) {
//         res.redirect('/dashboard')
//         console.log(error);
//     }
// }

// community 2
exports.newfindBycommunity = async (req, res, next) => {

    try {
        console.log('req.parsms.id', req.params.id);
        let community_id = mongoose.Types.ObjectId(req.params.id)

        const result = await communityData.aggregate([
            {
                $match: { _id: community_id }
            },

            {
                $lookup: {
                    from: "userdatas",
                    localField: "userObjId",
                    foreignField: "_id",
                    as: "userObjId"
                }

            },

            { $unwind: "$userObjId" },
            {
                $lookup: {
                    from: "userdatas",
                    localField: "community_Members",
                    foreignField: "_id",
                    as: "Members"
                }

            },
            // { $unwind: "$Members" }, {
            {
                $project: {
                    "_id": 1,
                    "communityId": 1,
                    "communityName": 1,
                    "communityImage": 1,
                    "aboutCommunity": 1,
                    "username": 1,
                    "is_public": 1,
                    "Amount": 1,
                    "timescale": 1,
                    "subscrition_type": 1,
                    "Members._id": 1,
                    "Members.username": 1,
                    "Members.image": 1,
                    "Members.user_Id": 1,
                    total_members: {

                        $size: "$Members"

                    },
                    "userObjId.username": 1,

                    "count": 1
                }
            }])

        result.reduce(function (result, item, result) {
            result = item; //a, b, c
            // console.log('resu=>>', result)

            console.log('result==>>', result);
            res.render('communityprofile', { result });


        }, {})

        // res.send(result)

    } catch (error) {
        console.log(error);
    }
}

// const community user _post 
exports.community_user_post = async (req, res, next) => {
    try {
        const userID = mongoose.Types.ObjectId(req.query.userID)
        const comID = mongoose.Types.ObjectId(req.query.comID)
        console.log("user_id=>>", userID, "comID=>>", comID)
        console.log(typeof "user_id", userID)

        const user_community_post = await postData.aggregate([
            {
                $match: {
                    $and: [{
                        user_Id: userID,
                    },
                    {
                        $expr: { $in: [comID, "$communityId"] },
                    },
                    ],
                },
            },

        ])
        console.log("user_community_post=>>", user_community_post)
        res.render("users_post", { results: user_community_post })
    }
    catch (error) {
        console.log(error)
    }
}