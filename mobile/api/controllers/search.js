const userdata = require('../../../models/user');
const searcData = require('../../../models/search');
const postData = require('../../../models/createPost');
const friendsRequestData = require('../../../models/send_Community_Notification');

const communityData = require('../../../models/adminSchema')

// const { findById } = require('../../../models/userSchema');

// Done
exports.search_Tag = async (req, res, next) => {

    try {
        const user_Id = req.user._id

        var arr = []
        for (let i = 0; i < req.body.tag.length; i++) {
            arr.push({ search: req.body.tag[i] })
        };


        const already_Search = await searcData.findOne({ user_Id: user_Id })

        if (already_Search) {
            const _id = already_Search._id
            const update_search_Tag = await searcData.findByIdAndUpdate(_id, { $push: { tag: arr } }, { new: true });
            console.log('update_search_Tag=>>', update_search_Tag)
            return res.send({ Data: update_search_Tag, Status: 1, message: "Your Search Tag Added Successfully" })

        }
        else {
            const search_Tag = new searcData({
                tag: arr,
                user_Id: user_Id,
                fullname: req.user.fullname

            })
            console.log('search_Tag=>>', search_Tag)
            search_Tag.save()
            return res.send({ Data: search_Tag, Status: 1, message: "Your Search Tag Added Successfully" })
        }
    }
    catch (error) {
        console.log(error)
        res.send({ Data: [], Status: 1, message: "Your Search Tag Can Not Added Successfully" })
    }

}
// get_Tag
exports.getTag = async (req, res, next) => {
    try {

        const user_Id = req.user._id
        const getTag = await searcData.findOne({ user_Id: user_Id })

        res.send({ Data: getTag, Status: 1, message: "Get Tag Fatch Successfully" })
    }
    catch (error) {
        res.send({ status: 0, message: error.message })
        console.log(error)
    }
}

// delete Tag
exports.delete_Tag = async (req, res, next) => {
    try {

        const _id = req.body._id
        const tag_Id = req.body.tag_Id
        const remove_Tag = await searcData.findByIdAndUpdate({ _id: _id }, { $pull: { tag: { _id: [tag_Id] } } })

        console.log("remove_Tag=>>", remove_Tag)

        res.send({ Data: remove_Tag, Status: 1, message: "tag remove successfully" })

    }

    catch (error) {
        res.send({ status: 0, message: error.message })
        console.log(error)
    }
}

// Done
// regex_Search
exports.searchScreen = async (req, res, next) => {
    // console.log('aydahbd',req.params.key);

    try {
        const user_Id = req.user._id
        // const { Current_latitude, Current_longitude } = req.body

        const blockedUserIds = req.user.blockUsers.map(blockedUser => blockedUser.userIds);

        const users = await userdata.find({
            $and: [
                {
                    $or: [
                        { fullname: { $regex: key, $options: 'i' } },
                        { username: { $regex: key, $options: 'i' } }
                    ]
                },
                {
                    _id: { $nin: blockedUserIds }
                }
            ]
        }).skip(0).limit(10);
        // const user = await userdata.find({

        //     $or: [

        //         { fullname: { $regex: req.body.key, $options: 'i' } },
        //         { username: { $regex: req.body.key, $options: 'i' } },


        //     ]
        // }).skip(0).limit(10)

        const community = await communityData.find({

            $or: [
                { "cliqk_type": { $ne: "private" } },

                { communityName: { $regex: req.body.key, $options: 'i' } },

            ]
        }).skip(0).limit(10)


        res.send({ status: 1, message: "Search list fatch successfully.", data: users, community })

    } catch (error) {
        res.send({ status: 0, message: error.message })
        console.log(error);

    }
};



// clearSearchHistory 
exports.clearSearchHistory = async (req, res, next) => {
    try {
        const searchId = req.body.searchId
        const userId = req.user._id

        const findUserSearchHistory = await searcData.findOne({ user_Id: userId })

        if (findUserSearchHistory === null) {
            return res.send({ status: 0, message: "No search history found" })
        }

        const removeSearchHistory = await searcData.findByIdAndRemove({ user_Id: userId, _id: searchId })

        return res.send({ status: 1, message: "Removed search history" })

    }
    catch (error) {
        res.send({ status: 0, message: "Something went wrong" })
    }
}
