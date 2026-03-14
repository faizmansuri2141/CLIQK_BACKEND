// const userData = require('../../models/user');
// const officialsData = require('../../models/applying_for_officials')
// const createCliqkData = require('../../models/createcommunity');
// const mongoose = require('mongoose')
// const post_data = require('../../models/createPost');

// exports.getuserData = async (req, res, next) => {

//     try {

//         const user_da = await userData.aggregate([

//             {
//                 $lookup: {
//                     from: "officialsdatas",
//                     localField: "_id",
//                     foreignField: "user_Id",
//                     as: "_id",
//                 },

//             },
//             { $unwind: "$user_Id" }

//         ])

//         console.log("user_da=>>", user_da)

//         const Data = await userData.find().lean()

//         console.log(Data);

//         res.render('userlist', { UserData: Data })


//     } catch (error) {
//         console.log(error);

//     }


// }

// exports.findbyiduser = async (req, res, next) => {

//     try {
//         console.log(req.params.id);
//         const userProfile = await userData.findById(req.params.id);
//         console.log("product  data find.............", userProfile);

//         res.render('userprofile', { userProfile });
//     }
//     catch (error) {
//         res.redirect('/dashboard')
//         console.log(error);
//     }
// }


// exports.newfindByidUser = async (req, res, next) => {

//     try {


//         let user_id = mongoose.Types.ObjectId(req.params.id)

//         console.log("this user_id........", user_id);

//         const result = await userData.aggregate([
//             //{ $match: { $expr: { $in: [user_id, "$invite_friend"] } } },
//             // {
//             //     $match: {
//             //         $or: [
//             //         {
//             //             $expr: { $in: [user_id, "$addMembers"] }
//             //         }]
//             //     }
//             // },
//             // {
//             //     $match: {
//             //         $or: [{
//             //             userObjId: user_id
//             //         },
//             //         {
//             //             $expr: { $in: [user_id, "$addMembers"] }
//             //         }]
//             //     }
//             // },

//             {
//                 $lookup: {
//                     from: "createcliqkdatas",
//                     localField: "_id",
//                     foreignField: "community_Members",
//                     as: "community_details",
//                 },

//             },
//             {
//                 $lookup: {
//                     from: "createcliqkdatas",
//                     localField: "_id",
//                     foreignField: "userObjId",
//                     as: "My_community",
//                 }
//             },
//             // { $unwind: "$user" },
//             // {
//             //     $project: {
//             //         '_id': 1,
//             //         'fullname':1,
//             //         'username': 1,
//             //         'image': 1,
//             //         "email" : 1,
//             //         'mobile': 1,
//             //         'community_details.communityImage': 1,
//             //         'community_details.communityName': 1,
//             //         'community_details.aboutCommunity': 1,


//             //     }
//             // },

//         ])

//         console.log('ressssss', result);
//         res.render('userprofile', { result });

//         // res.send({ Data: result, status: 1, message: 'user profile fatch successfully' })



//     } catch (error) {
//         res.send({ Data: [], Status: 0, message: 'User Profile Can Not Fatch Successfully' })
//         console.log(error);
//     }
// }

// exports.this_section_post = async (req, res, next) => {
//     try {

//         const user_Id = mongoose.Types.ObjectId(req.params.user_Id)
//         const community_id = mongoose.Types.ObjectId(req.params.community_id)
//         console.log("user_Id=>>", user_Id)

//         const this_section_post = await post_data.aggregate([

//             {
//                 $match: {
//                     $and: [
//                         { user_Id: user_Id },
//                         { communityId: { $in: [community_id] } }
//                     ]
//                 }
//             }

//         ])
//         console.log("this_section_post=>>", this_section_post)
//         res.render("section_post", { this_section_post: this_section_post })

//     }
//     catch (error) {
//         console.log(error)
//         res.send({ status: 0, message: error.message })
//     }
// }


// // user status is_Officials
// exports.is_Officials_And_is_Not_Officials = async (req, res, next) => {
//     try {
//         console.log("body+>>", req.body)
//         const _id = mongoose.Types.ObjectId(req.body.id)
//         const account_officials = await officials_data.findById({ _id: _id })
//         console.log('account_officials=>>', account_officials.is_Approve);

//         // const user_id = mongoose.Types.ObjectId(req.body.user_id)
//         // console.log("user_id=>>" ,user_id)

//         if (account_officials.is_Approve === false) {
//             const update_Pay_Status = await officials_data.findByIdAndUpdate(req.body.id, { is_Approve: true })
//             res.redirect('/official_list')
//         }
//         else {
//             const update_Pay_Status = await officials_data.findByIdAndUpdate(req.body.id, { is_Approve: false })
//             res.redirect('/official_list')
//         }
//     }
//     catch (error) {
//         console.log(error)
//         res.send({ status: 0, error: error.message })
//     }
// }

// // for_officials_list
// exports.officials_list = async (req, res, next) => {
//     try {

//         const officials_list = await officialsData.aggregate([

//             {
//                 $lookup: {
//                     from: "userdatas",
//                     localField: "user_Id",
//                     foreignField: "_id",
//                     as: "user_Id",
//                 }
//             },
//             { $unwind: "$user_Id" }


//         ])
//         // const officials_list  =  await officialsData.find({}).lean()
//         console.log("officials_list=>>", officials_list)
//         res.render("officials_list", { officials_list: officials_list })
//     }
//     catch (error) {
//         console.log(error)
//     }
// }





const userData = require('../../models/user');
const createCliqkData = require('../../models/createcommunity');
const mongoose = require('mongoose')
const post_data = require('../../models/createPost');
const blueTickData = require('../../models/fortick')
const moment = require('moment');

// Helper: calculate age from dateOfBirth (YYYY-MM-DD string, or Date, or null/undefined/empty)
function calculateAge(dob) {
    if (dob === null || dob === undefined || dob === '') return null;
    const str = String(dob).trim();
    if (!str || str === 'null' || str === 'undefined') return null;
    try {
        const birthDate = new Date(str);
        if (isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    } catch (e) {
        return null;
    }
}

// Helper: get age group for a user (handles missing dateOfBirth)
function getAgeGroup(user) {
    if (!user) return 'Unverified';
    const age = calculateAge(user.dateOfBirth);
    if (age === null || age < 13) return 'Unverified';
    if (age >= 18) return '18+';
    return '13-17';
}

exports.getuserData = async (req, res, next) => {

    try {

        let Data = await userData.find().lean()

        // Filter by ageGroup: all | 18+ | 13-17 | unapproved
        // Use 18plus in URL (18+ gets mangled by URL encoding)
        let ageGroup = String(req.query.ageGroup || 'all').toLowerCase().trim();
        if (ageGroup === '18plus' || ageGroup === '18+' || ageGroup === '18' || ageGroup === '18 ') ageGroup = '18+';
        
        if (ageGroup === '18+') {
            Data = Data.filter(u => getAgeGroup(u) === '18+');
        } else if (ageGroup === '13-17') {
            Data = Data.filter(u => getAgeGroup(u) === '13-17');
        } else if (ageGroup === 'unapproved') {
            Data = Data.filter(u => u.isApproved === false || u.isApproved === undefined);
        }
        // ageGroup === 'all' - no filter

        console.log(Data.length, 'users for filter:', ageGroup);

        res.render('userlist', { 
            UserData: Data,
            currentAgeFilter: ageGroup
        })


    } catch (error) {
        console.error('getuserData error:', error);
        res.render('userlist', {
            UserData: [],
            currentAgeFilter: 'all'
        });
    }
}

exports.findbyiduser = async (req, res, next) => {

    try {
        console.log(req.params.id);
        const userProfile = await userData.findById(req.params.id);
        console.log("product  data find.............", userProfile);

        res.render('userprofile', { userProfile });
    }
    catch (error) {
        res.redirect('/dashboard')
        console.log(error);
    }
}


exports.newfindByidUser = async (req, res, next) => {

    try {


        let user_id = mongoose.Types.ObjectId(req.params.id)

        console.log("this user_id........", user_id);

        const result = await userData.aggregate([


            {
                $match: { _id: user_id }
            },

            {
                $lookup: {
                    from: "createcliqkdatas",
                    localField: "_id",
                    foreignField: "community_Members",
                    as: "community_details",
                },

            },
            {
                $lookup: {
                    from: "createcliqkdatas",
                    localField: "_id",
                    foreignField: "userObjId",
                    as: "My_community",
                }
            },


        ])

        console.log('ressssss', result);
        res.render('userprofile', { result });

        // res.send({ Data: result, status: 1, message: 'user profile fatch successfully' })



    } catch (error) {
        res.send({ Data: [], Status: 0, message: 'User Profile Can Not Fatch Successfully' })
        console.log(error);
    }
}

exports.this_section_post = async (req, res, next) => {
    try {

        const user_Id = mongoose.Types.ObjectId(req.params.user_Id)
        const community_id = mongoose.Types.ObjectId(req.params.community_id)
        console.log("user_Id=>>", user_Id)

        const this_section_post = await post_data.aggregate([

            {
                $match: {
                    $and: [
                        { user_Id: user_Id },
                        { communityId: { $in: [community_id] } }
                    ]
                }
            }

        ])
        console.log("this_section_post=>>", this_section_post)
        res.render("section_post", { this_section_post: this_section_post })

    }
    catch (error) {
        console.log(error)
        res.send({ status: 0, message: error.message })
    }
}


exports.approvedOrNotAprroved = async (req, res, next) => {
    try {

        const userId = mongoose.Types.ObjectId(req.body.id)
        const user_list = req.body.user_list


        const findUser = await userData.findOne({ _id: userId })

        // 1 for approved
        if (findUser !== null) {
            if (findUser.isApproved === false) {
                const updateStatus = await userData.findByIdAndUpdate({ _id: userId }, {
                    isApproved: true,
                    forTickStatus: 1
                })
                if (user_list == "user_list") {
                    res.redirect('/userlist')
                }
                else {
                    res.redirect('/blueticklist')
                }
            }
            else {
                const updateStatus = await userData.findByIdAndUpdate({ _id: userId }, {
                    isApproved: false,
                    forTickStatus: 2
                })

                if (user_list == "user_list") {
                    res.redirect('/userlist')
                }
                else {
                    res.redirect('/blueticklist')

                }
            }
        }



    } catch (error) {
        console.log("error=>>>>>", error)
        res.redirect('/blueticklist')

    }
}
// user status is_Officials
// exports.is_Officials_And_is_Not_Officials = async (req, res, next) => {
//     try {
//         const _id = mongoose.Types.ObjectId(req.body.id)
//         const account_officials = await officials_data.findById({_id : _id})
//         console.log('account_officials=>>', account_officials.is_Approve);

//         // const user_id = mongoose.Types.ObjectId(req.body.user_id)
//         // console.log("user_id=>>" ,user_id)

//         if (account_officials.is_Approve === false) {
//             const update_Pay_Status = await officials_data.findByIdAndUpdate(req.body.id, { is_Approve: true })
//             res.redirect('/official_list')
//         }
//         else {
//             const update_Pay_Status = await officials_data.findByIdAndUpdate(req.body.id, { is_Approve: false })
//             res.redirect('/official_list')
//         }
//     }
//     catch (error) {
//         console.log(error)
//         res.send({status : 0 , error : error.message})
//     }
// }

// applying for official list
exports.applying_for_official_list = async (req, res, next) => {

    const applying_for_official_list = await blueTickData.aggregate([
        {
            $lookup: {
                from: "userdatas",
                localField: "userId",
                foreignField: "_id",
                as: "userId"
            }
        },
        { $unwind: "$userId" },
    ])

    const myList = []

    applying_for_official_list.map(item => {
        console.log("item=>>>", item)

        const obj = {}
        obj._id = item._id
        obj.userId = item.userId._id
        obj.username = item.userId.username
        obj.userImage = item.userId.image
        obj.forTickStatus = item.userId.forTickStatus
        obj.email = item.userId.email

        myList.push(obj)
    })
    console.log("myList=>>>>>>>>>", myList)
    res.render("applyingforbluetick", { myList: myList })
}

// view profile for official tick
exports.officialProfile = async (req, res, next) => {
    try {

        const _id = mongoose.Types.ObjectId(req.params.id)

        const officialProfile = await blueTickData.aggregate([{
            $match: { _id: _id }

        },

        {
            $lookup: {
                from: "userdatas",
                localField: "userId",
                foreignField: "_id",
                as: "userId"
            }
        },
        { $unwind: "$userId" },
        ])

        const myList = []

        officialProfile.map(item => {

            const obj = {}
            obj._id = item._id
            obj.userId = item.userId._id
            obj.username = item.userId.username
            obj.userImage = item.userId.image
            obj.forTickStatus = item.userId.forTickStatus
            obj.email = item.userId.email
            obj.mobile = item.userId.mobile
            obj.descriptionForTick = item.descriptionForTick
            obj.instagramUserName = `https://www.instagram.com/${item.instagramUserName}`
            obj.xtwitterUserName = `https://twitter.com/${item.xtwitterUserName}`
            obj.tikTokUserName = `https://www.tiktok.com/${item.tikTokUserName}`
            obj.date = moment(item.createdBy).format('DD-MM-YYYY');
            obj.forTickStatus = item.userId.forTickStatus
            obj.isApproved = item.userId.isApproved
            obj.videoRecord = item.videoRecord
            obj.uploadCertificate = item.uploadCertificate

            myList.push(obj)
        })

        const data = Object.assign({}, ...myList);
        console.log("data", data)
        res.render("officialProfile", { data: data })


    }
    catch (error) {
        console.log("error=>>>>", error)
    }
}


