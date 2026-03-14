const media_room_Data = require('../../../models/media_room');
const sectionData = require('../../../models/createcommunity');
const mongoose = require('mongoose');
const media_like_Data = require('../../../models/media_like');
const media_like_schema_datas = require('../../../models/media_like');
const { upload, s3 } = require('../../../middleware/s3Image');
const AWS = require('aws-sdk');


exports.add_media = async (req, res, next) => {
    const Selection_id = mongoose.Types.ObjectId(req.body.Selection_id)

    const section_find = await sectionData.findById({ _id: Selection_id })
    console.log("section_find=.>", section_find)

    if (section_find.is_public == "0") {
        return res.send({ status: 0, message: "your section in private" })
    }

    try {
        if (section_find.is_public == "1") {
            if (req.body.file_type === "mp3") {
                const add_media = new media_room_Data({
                    owners_id: req.user._id,
                    owners_name: req.user.username,
                    Selection_id: Selection_id,
                    cover_image: req.files.cover_image[0].location,
                    file_name: req.body.file_name,
                    file_type: req.body.file_type,
                    file_upload_mp3: req.files.file_upload_mp3[0].location,
                    time_line: req.body.time_line,
                })
                console.log("add_media=>>", add_media)
                // add_media.save()
                res.send({ data: add_media, status: 1, message: "mp3 File Adding Succesfully" })
            }
            if (req.body.file_type === "mp4") {
                const add_media = new media_room_Data({
                    owners_id: req.user._id,
                    owners_name: req.user.username,
                    cover_image: req.files.cover_image[0].location,
                    file_type: req.body.file_type,
                    file_name: req.body.file_name,
                    file_upload_mp4: req.files.file_upload_mp4[0].location,
                    time_line: req.body.time_line,
                })
                console.log("add_media=>>", add_media)
                add_media.save()
                res.send({ data: add_media, status: 1, message: "mp4 File Adding Succesfully" })
            }
        }
    }
    catch (error) {
        console.log("error=>>", error)
        res.send({ status: 0, message: error.message })
    }
}

// listing
// exports.get_mp3 = async (req, res, next) => {
//     try {
//         const get_mp3 = await media_room_Data.find({ file_type: "mp3" })
//         console.log("get_mp3=>>", get_mp3)
//         res.send({ data: get_mp3, status: 1, message: "mp3 List Fatch Successfully" })
//     }
//     catch (error) {
//         console.log(error)
//         res.send({ status: 0, message: error.message })
//     }
// }

// exports.get_mp4 = async (req, res, next) => {
//     try {
//         const get_mp4 = await media_room_Data.find({ file_type: "mp4" })
//         res.send({ data: get_mp4, status: 1, message: "mp4 List Fatch Successfully" })

//     }
//     catch (error) {
//         console.log("error=>>", error)
//         res.send({ status: 0, message: error.message })
//     }
// }
// update media

// exports.update_media = async (req, res, next) => {
//     const media_id = req.body.media_id; // Assuming media_id is the unique identifier for the media file
//     const file_type = req.body.file_type; // New file type to update

//     try {
//         const media = await media_room_Data.findById(media_id);
//         if (!media) {
//             return res.send({ status: 0, message: "Media not found" });
//         }
//         // Update media based on file type
//         if (file_type === "mp3") {
//             media.file_type = req.body.file_type;
//             media.file_upload_mp3 = req.files.file_upload_mp3[0].location;
//             media.time_line = req.body.time_line;
//         } else if (file_type === "mp4") {
//             media.file_type = req.body.file_type;
//             media.file_upload_mp4 = req.files.file_upload_mp4[0].location;
//             media.time_line = req.body.time_line;
//         } else {
//             return res.send({ status: 0, message: "Invalid file type" });
//         }

//         await media.save();

//         res.send({ data: media, status: 1, message: "Media file updated successfully" });
//     } catch (error) {
//         console.log("error=>>", error);
//         res.send({ status: 0, message: error.message });
//     }
// }

exports.update_media = async (req, res, next) => {
    const user_id = req.user._id
    const media_id = req.body.media_id
    const file_type = req.body.file_type
    console.log("media_id=>>", media_id)

    try {
        const media_find = await media_room_Data.findOne({ owners_id: user_id, _id: media_id }).lean()
        console.log("media_find=>>", media_find)
        if (!media_find) {
            return res.send({ status: 0, message: "Can Not Found This Media" })
        }
        // update_media_here
        else {
            if (file_type === "mp3") {
                if (req.files && req.files.cover_image && req.files.file_upload_mp3) {
                    const update_media_here = await media_room_Data.findByIdAndUpdate({ _id: media_id }, {
                        cover_image: req.files.cover_image[0].location,
                        file_type: req.body.file_type,
                        file_upload_mp3: req.files.file_upload_mp3[0].location,
                        // file_upload_mp4: req.files.file_upload_mp4,
                        time_line: req.body.time_line,
                        file_name: req.body.file_name
                    })
                    return console.log("update_media_here=>>", update_media_here)
                }
                else {
                    const update_media_here = await media_room_Data.findByIdAndUpdate({ _id: media_id }, {
                        // cover_image: req.files.cover_image[0].location,
                        file_type: req.body.file_type,
                        // file_upload_mp3: req.files.file_upload_mp3[0].location,
                        // file_upload_mp4: req.files.file_upload_mp4,
                        time_line: req.body.time_line,
                        file_name: req.body.file_name
                    })
                    return console.log("update_media_here=>>", update_media_here)

                }
            }
            else {
                if (req.files && req.files.cover_image && req.files.file_upload_mp4) {
                    const update_media_here = await media_room_Data.findByIdAndUpdate({ _id: media_id }, {
                        cover_image: req.files.cover_image[0].location,
                        file_type: req.body.file_type,
                        // file_upload_mp3: req.files.file_upload_mp3[0].location,
                        file_upload_mp4: req.files.file_upload_mp4[0].location,
                        time_line: req.body.time_line,
                        file_name: req.body.file_name
                    })
                    return console.log("update_media_here=>>", update_media_here)
                }
                else {

                    const update_media_here = await media_room_Data.findByIdAndUpdate({ _id: media_id }, {
                        // cover_image: req.files.cover_image[0].location,
                        file_type: req.body.file_type,
                        // file_upload_mp3: req.files.file_upload_mp3[0].location,
                        // file_upload_mp4: req.files.file_upload_mp4,
                        time_line: req.body.time_line,
                        file_name: req.body.file_name
                    })
                    return console.log("update_media_here=>>", update_media_here)

                }
            }


        }

    }
    catch (error) { console.log(error) }

}
// find_By_section
// screen_5
// exports.media_room_screen_5 = async (req, res, next) => {
//     try {
//         const Selection_id = mongoose.Types.ObjectId(req.body.Selection_id)
//         const find_By_Section = await media_room_Data.find({ Selection_id: Selection_id, file_type: "mp3", time_line: true })
//         console.log("find_By_Section=>>", find_By_Section)

//         res.send({ data: find_By_Section, status: 1, message: "mp3 List Fatch Successfully" })

//         // const find_By_Section = await media_room_Data.aggregate([

//         //     { $match: { Selection_id: Selection_id } },

//         //     {
//         //         $lookup: {
//         //             from: "createcliqkdatas",
//         //             localField: "Selection_id",
//         //             foreignField: "_id",
//         //             as: "Selection_id",
//         //         },

//         //     },


//         // ])
//     }
//     catch (error) {
//         console.log(error)
//         res.send({ status: 0, message: error.message })
//     }
// }

// exports.media_room_screen_6 = async (req, res, next) => {
//     try {
//         const Selection_id = mongoose.Types.ObjectId(req.body.Selection_id)
//         const find_By_Section = await media_room_Data.find({ Selection_id: Selection_id, file_type: "mp4", time_line: true })
//         console.log("find_By_Section=>>", find_By_Section)
//         res.send({ data: find_By_Section, status: 1, message: "mp4 List Fatch Successfully" })
//     }
//     catch (error) {
//         console.log(error)
//         res.send({ status: 0, message: error.message })

//     }
// }
// remove_file_from_section
exports.remove_file = async (req, res, next) => {
    try {
        const file_id = req.body.file_id
        const owners_id = req.user._id

        console.log("file_id=>>", file_id, "owners_id=>>", owners_id,)


        media_room_Data.findByIdAndRemove({ _id: file_id }, (err, doc) => {
            if (!err) {
                console.log("doc=>>", doc)
                const s3 = new AWS.S3({
                    secretAccessKey: process.env.Secretaccesskey,
                    accessKeyId: process.env.AccesskeyID,
                    region: process.env.S3_REGION
                });
                console.log("process.env.SECRET_ACCESS_KEY", process.env.Secretaccesskey, process.env.AccesskeyID, process.env.S3_REGION)
                var objectsToDelete
                if (doc.file_type === "mp3") {
                    objectsToDelete = [
                        { Key: doc.cover_image },
                        { Key: doc.file_upload_mp3 },

                    ];
                }
                else {
                    objectsToDelete = [
                        { Key: doc.cover_image },
                        { Key: doc.file_upload_mp4 },

                    ];

                }

                console.log("objectsToDelete=>>", objectsToDelete)
                console.log("process.env.BUCKET_NAME=>>", process.env.BUCKET_NAME)
                const params = {
                    Bucket: process.env.BUCKET_NAME,
                    Delete: {
                        Objects: objectsToDelete
                    }
                };
                s3.deleteObjects(params, (err, data) => {
                    if (err) {
                        console.log(err, err.stack);
                    } else {
                        console.log(data);
                    }
                })

                res.send({ status: 1, message: "File Deleted Successfully" })

            }
        })

    }
    catch (error) {
        console.log(error)
        res.send({ status: 0, message: error.message })
    }
}

// media_room_screen_5 favorite
exports.post_counts = async (req, res, next) => {
    try {
        const file_id = mongoose.Types.ObjectId(req.body.file_id);
        const counts = await media_room_Data.findByIdAndUpdate({ _id: file_id }, { $inc: { is_views_counts: 1 } }, { new: true })
        res.send({ data: counts, status: 1, message: "post counter adding successfully" })
    }
    catch (error) {
        console.log(error)
        res.send({ status: 0, message: error.message })
    }
}

// likes
exports.add_media_likes = async (req, res, next) => {
    try {
        const userId = req.user._id
        const sectionId = req.body.sectionId
        const postId = req.body.postId

        const findSection = await sectionData.findOne({ _id: sectionId })
        console.log("findSection=>>", findSection)

        if (findSection.cliqk_type !== "bussiness") {
            return res.send({ status: 0, message: "This Section Is Not Bussiness Section", })
        }

        const already_favorite = await media_like_Data.findOne({ section_id: sectionId, user_id: userId, postId: postId })

        if (already_favorite === null) {

            const add_favorite = new media_like_Data({
                section_id: sectionId,
                user_id: userId,
                postId: postId

            })
            console.log("add_favorite=>>", add_favorite)
            add_favorite.save()
            res.send({ status: 1, message: "media favorite successfully" })
        }

        else {
            const remove_from_favorites = await media_like_Data.findByIdAndRemove({ _id: already_favorite._id })
            res.send({ status: 1, message: "media un favorite successfully" })
        }
    }
    catch (error) {
        console.log("error=>>>>", error)
        res.send({ status: 0, message: error.message })
    }
}

// get media 
exports.get_media_room = async (req, res, next) => {
    try {

        const user_id = req.user._id
        const file_type = req.body.file_type

        const get_meda_room = await sectionData.aggregate([
            {
                $match: {
                    $or: [
                        {
                        userObjId: user_id, 
                        is_public: "1"
                    },
                    {
                        $expr: { $in: [user_id, "$community_Members"] },
                        is_public: "1"
                    },
                    ],
                },
            },
            {
                $lookup: {
                    from: "media_room_datas",
                    localField: "_id",
                    foreignField: "Selection_id",
                    as: "media_room_datas",
                },

            },
            { $unwind: "$media_room_datas" },
            
            {
                $match: {
                    "media_room_datas.file_type": file_type// Add this $match stage to filter by file_type
                }
            }
        ])
        console.log("get_meda_room=>>", get_meda_room)
        const media_Room = []

        get_meda_room.forEach(element => {
            console.log("element=>>", element)
            var obj = {}
            obj._id = element.media_room_datas._id;
            obj.cover_image = element.media_room_datas.cover_image;
            obj.file_type = element.media_room_datas.file_type;
            obj.file_upload_mp3 = element.media_room_datas.file_upload_mp3;
            obj.file_upload_mp4 = element.media_room_datas.file_upload_mp4;
            obj.time_line = element.media_room_datas.time_line;
            obj.is_views_counts = element.media_room_datas.is_views_counts;
            obj.created_at = element.media_room_datas.created_at

            media_Room.push(obj)
            
        });
        if (file_type === "mp3") {

            if (media_Room.length === 0) {
                return res.send({ status: 0, message: "Mp3 Data Not Found In Play List" })
            }
            else {
                return res.send({ data: media_Room, status: 1, message: "Mp3 Data Play List" })
            }
        }
        else {
            if (media_Room.length === 0) {
                return res.send({ status: 0, message: "Mp4 Data Not Found In Play List" })
            }
            else {
                return res.send({ data: media_Room, status: 1, message: "Mp4 Data Play List" })
            }
        }

    }
    catch (error) {
        console.log(error)
        res.send({ status: 0, message: error.message })
    }

}
// My_Favorite_List
exports.get_media_likes_list = async (req, res, next) => {
    try {
        const user_id = req.user._id
        const file_type = req.body.file_type
        const community_Media = await media_like_schema_datas.aggregate([

            { $match: { user_id: user_id } },

            {
                $lookup: {
                    from: "createcliqkdatas",
                    localField: "section_id",
                    foreignField: "_id",
                    as: "section_id",
                },
            },
            { $unwind: "$section_id" },

            {
                $lookup: {
                    from: "userdatas",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user_id",
                },

            },
            { $unwind: "$user_id" },
            {
                $lookup: {
                    from: "media_room_datas",
                    localField: "media_id",
                    foreignField: "_id",
                    as: "media_id",
                },

            },
            { $unwind: "$media_id" },
            {
                $match: {
                    "media_id.file_type": file_type// Add this $match stage to filter by file_type
                }
            }

        ])

        var favorite_media = []
        community_Media.forEach(element => {
            var obj = {};
            obj.section_id = element.section_id._id;
            obj.user_id = element.user_id._id;
            obj.media_id = element.media_id._id;
            obj.cover_image = element.media_id.cover_image;
            obj.file_type = element.media_id.file_type;
            obj.file_upload_mp3 = element.media_id.file_upload_mp3;
            obj.file_upload_mp4 = element.media_id.file_upload_mp4;
            obj.time_line = element.media_id.time_line;
            obj.is_views_counts = element.media_id.is_views_counts;
            obj.created_at = element.media_id.created_at;
            favorite_media.push(obj)
        });

        console.log("favorite_media=>>", favorite_media)


        if (file_type === "mp3") {

            if (favorite_media.length === 0) {
                return res.send({ status: 0, message: "Mp3 Data Not Found In Play List" })
            }
            else {
                return res.send({ data: favorite_media, status: 1, message: "Mp3 Data Play List" })
            }
        }
        else {
            if (favorite_media.length === 0) {
                return res.send({ status: 0, message: "Mp4 Data Not Found In Play List" })
            }
            else {
                return res.send({ data: favorite_media, status: 1, message: "Mp4 Data Play List" })
            }
        }


    }
    catch (error) {
        console.log(error)
        res.send({ stastus: 0, message: error.message })
    }
}

// my_list
exports.my_list = async (req,res,next)=>{
    try {   
        const user_id = req.user._id
        const file_type = req.body.file_type

    }
    catch(error)
    {
        console.log("error=>>>" ,error)
    }
}



//myFavoriteList
exports.myFavoriteList = async (req, res, next) => {
    try {
        const userId = req.user._id
        const createPostFor = req.body.createPostFor
        const post_type = req.body.post_type

        const page = req.body.page || 1
        const limit = req.body.limit || 10

        const userFavoriteList = await media_like_Data.aggregate([
            {
                $match: {
                    user_id: userId
                }
            },
            {
                $lookup: {
                    from: "createpostdatas",
                    localField: "postId",
                    foreignField: "_id",
                    as: "postId",
                },
            },
            { $unwind: "$postId" },


            {
                $match: {
                    "postId.createPostFor": createPostFor, "postId.post_type": post_type // Add this $match stage to filter by file_type
                }
            }

            // speciallity_data

            // {
            //     $lookup: {
            //         from: "userdatas",
            //         localField: "user_id",
            //         foreignField: "_id",
            //         as: "user_id",
            //     },

            // },
            // { $unwind: "$user_id" },

            // {
            //     $lookup: {
            //         from: "media_room_datas",
            //         localField: "media_id",
            //         foreignField: "_id",
            //         as: "media_id",
            //     },

            // },
            // { $unwind: "$media_id" },

        ])
        console.log("userFavoriteList=>>>", userFavoriteList)

        if (userFavoriteList.length == 0) {
            return res.send({ status: 0, message: "Do not have favorite list posts" })
        }

        let myFavoriteListData = []
        userFavoriteList.map((item)=>{
            var obj = {}
            obj._id = item._id
            obj.user_id = item.user_id
            obj.postId = item.postId._id
            obj.post_type = item.postId.post_type
            obj.time_line = item.postId.time_line
            obj.createvideo = item.postId.createvideo
            obj.createAudio = item.postId.createAudio
            obj.desc  = item.postId.desc
            obj.createdAt = item.postId.createdAt
            obj.cover_image = item.postId.cover_image
            obj.file_name = item.postId.file_name
            myFavoriteListData.push(obj)
        })

        const paginate = (items, page, perPage) => {
            const offset = perPage * (page - 1)
            const totalPages = Math.ceil(items.length / perPage)
            const paginatedItems = items.slice(offset, perPage * page)
            const current_page = offset / perPage + 1

            return {
                previousPage: page - 1 ? true : false,
                nextPage: totalPages > page ? true : false,
                totalDocs: items.length,
                totalPages: totalPages,
                currentPage: current_page,
                myPost: paginatedItems
            }
        }
        var dataNew = paginate(myFavoriteListData, page, limit)

        return res.send({ status: 1, message: "My favorite list fatch sucessfully", data: dataNew })
    }
    catch (error) {
        console.log("error=>>>>>>", error)
        res.send({status : 0 , message : error.message})
    }
}





