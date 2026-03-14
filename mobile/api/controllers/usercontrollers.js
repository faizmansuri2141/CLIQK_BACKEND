const express = require("express");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const router = express.Router();
const token = require('../../../models/token')
const path = require('path')
const userData = require('../../../models/user');
const postModel = require('../../../models/createPost')
const commentModel = require('../../../models/comments')
const likeModel = require('../../../models/like_dislike_Schema')
const notificationModel = require('../../../models/notifiication_list')
const requestModel = require('../../../models/send_Community_Notification')
const forTickModel = require('../../../models/fortick')
const searchModel = require('../../../models/search')
const sectionModel = require('../../../models/createcommunity')
const reportPostBySectionOwnerModel = require('../../../models/reportpostbysectionowner')
const reportuserforPostModel = require('../../../models/reportsuserforpost')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const mongoose = require("mongoose")
const emojiModels = require ("../../../models/imojiss")
// const 
require("dotenv").config();

const userAuth = require('../../../middleware/authUser');
require('../../../DB/conn');
// const sendEmail2 = require('../../../utils/sendmail2')
const sendEmail = require("../../../utils/sendmail");
const { truncate } = require("fs");
// const welcome = require('../../../middleware/welcome');
const config = process.env;

// exports.singUp = async (req, res, next) => {

//     try {

//         // Get user input
//         const { fullname, username, mobile, email, password, countrycode, device_Token, device_Type } = req.body;

//         // Validate user input
//         if (!(email && password && fullname && username && mobile && countrycode)) {
//             //   res.status(400).send("All input is required");
//             res.send({ data: [], status: 0, message: 'all input is required' })
//         }
//         else {

//             const mobileNumberAlreadyUsed = await userData.findOne({ mobile })
//             if (mobileNumberAlreadyUsed) {
//                 return res.send({ data: [], status: 0, message: 'Mobile number already in use' })
//             }

//             const usernameTaken = await userData.findOne({ username })
//             if (usernameTaken) {
//                 return res.send({
//                     data: [], status: 0, message: 'username already exists'
//                 })

//             }
//             // check if user already exist
//             // Validate if user exist in our database
//             const oldUser = await userData.findOne({ email });

//             if (oldUser) {
//                 return res.send({ data: [], status: 0, message: 'User Already Exist. Please Login' })
//             }


//             //Encrypt user password
//             encryptedPassword = await bcrypt.hash(password, 10);

//             // create Stripe 
//             const account = await stripe.accounts.create({
//                 type: 'express',
//                 country: 'US',
//                 email: email,
//                 capabilities: {
//                     card_payments: { requested: true },
//                     transfers: { requested: true },

//                 },
//             });

//             // cust account
//             const customer = await stripe.customers.create({
//                 name: fullname,
//                 email: email,
//                 phone: mobile,
//             });
//             // Create user in our database
//             const user = await userData.create({
//                 fullname,
//                 username,
//                 countrycode,
//                 mobile,
//                 email: email.toLowerCase(), // sanitize: convert email to lowercase
//                 password: encryptedPassword,
//                 device_Token,
//                 device_Type,
//                 strip_custemor_Id: customer.id,
//                 stripe_Account_Id: account.id,
//                 is_verified :true
//             });

//             // Create token
//             const USerrrrtoken = jwt.sign(
//                 { user_id: user._id, email },
//                 process.env.TOKEN_KEY,
//                 // {
//                 //     expiresIn: "24h",
//                 // }
//             );
//             // save user token
//             user.token = USerrrrtoken;

//             var data = user

//             data.Password = undefined;
//             console.log(data);


//             if (data) {
//                 // official cliqk section need to change id 67626d9e41608a771608660d
//                 await sectionModel.findByIdAndUpdate(
//                     { _id: new mongoose.Types.ObjectId("67a4c66e3a8fc09fba7ac839") },
//                     { $push: { community_Members: user._id } },
//                     { new: true } // Optional: Returns the updated document
//                 );

//             }



//             // return new user
//             res.send({ status: 1, message: 'User Register Successfully', Data: data })
//         }

//     } catch (error) {
//         res.send({ status: 0, message: 'User Can Not Register', Data: [] } + error)
//         console.log(error);
//     }
// }

const sendWelcomeEmail = require("../../../utils/welcomemail");

exports.singUp = async (req, res, next) => {
    try {
        const { fullname, username, mobile, email, password, countrycode, device_Token, device_Type , bio ,backgroundImageColour, dateOfBirth } = req.body;

        // Validate required fields (check for existence and non-empty values)
        if (!email || !password || !fullname || !username || !mobile || !countrycode ||
            email.trim() === '' || password.trim() === '' || fullname.trim() === '' ||
            username.trim() === '' || mobile.trim() === '' || countrycode.trim() === '') {
            return res.send({ data: [], status: 0, message: 'all input is required' })
        }

        // Validate DOB if provided
        if (dateOfBirth) {
            // Validate format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dateOfBirth)) {
                return res.status(400).json({
                    status: 0,
                    message: 'Date must be in YYYY-MM-DD format'
                });
            }

            // Parse and validate date
            let parsedDate;
            try {
                parsedDate = new Date(dateOfBirth);
                if (isNaN(parsedDate.getTime())) {
                    return res.status(400).json({
                        status: 0,
                        message: 'Invalid date'
                    });
                }
            } catch (error) {
                return res.status(400).json({
                    status: 0,
                    message: 'Invalid date format'
                });
            }

            // Check if date is not in future
            const today = new Date();
            if (parsedDate > today) {
                return res.status(400).json({
                    status: 0,
                    message: 'Date of birth cannot be in the future'
                });
            }

            // Calculate age
            const age = calculateAge(dateOfBirth);
            if (age < 13) {
                return res.status(403).json({
                    status: 0,
                    action: 'UNDERAGE_BLOCKED',
                    message: 'You must be at least 13 years old to use this app'
                });
            }

            if (age > 120) {
                return res.status(400).json({
                    status: 0,
                    message: 'Please enter a valid date of birth'
                });
            }
        }

        const mobileNumberAlreadyUsed = await userData.findOne({ mobile })
        if (mobileNumberAlreadyUsed) {
            return res.send({ data: [], status: 0, message: 'Mobile number already in use' })
        }

        const usernameTaken = await userData.findOne({ username })
        if (usernameTaken) {
            return res.send({ data: [], status: 0, message: 'username already exists' })
        }

        const oldUser = await userData.findOne({ email });
        if (oldUser) {
            return res.send({ data: [], status: 0, message: 'User Already Exist. Please Login' })
        }

        // password encrypt
        const encryptedPassword = await bcrypt.hash(password, 10);

        // stripe account
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
        });

        const customer = await stripe.customers.create({
            name: fullname,
            email: email,
            phone: mobile,
        });

        const user = await userData.create({
            fullname,
            username,
            countrycode,
            mobile,
            email: email.toLowerCase(),
            password: encryptedPassword,
            device_Token,
            device_Type,
            image: req.file ? req.file.location : (req.body.image || ""),  // 
            strip_custemor_Id: customer.id,
            stripe_Account_Id: account.id,
            is_verified: true,
            bio : bio,
            backgroundImageColour :backgroundImageColour,
            dateOfBirth: dateOfBirth
        });

        const token = jwt.sign(
            { user_id: user._id, email },
            process.env.TOKEN_KEY
        );

        // send welcome email (non-blocking)
        sendWelcomeEmail(user);


        user.token = token;
        await user.save();

        await sectionModel.findByIdAndUpdate(
            { _id: new mongoose.Types.ObjectId("67a4c66e3a8fc09fba7ac839") },
            { $push: { community_Members: user._id } },
            { new: true }
        );

        user.password = undefined;

        res.send({ status: 1, message: 'User Register Successfully', Data: user })
    } catch (error) {
        console.log(error);
        res.send({ status: 0, message: 'User Can Not Register', Data: [], error })
    }
};

exports.socialLogin = async (req, res, next) => {
    try {
        const { fullname, username, email, device_Token, device_Type, bio, backgroundImageColour, socialId, socialType, dateOfBirth } = req.body;

        if (!(email && fullname && username && socialId && socialType)) {
            return res.send({ status: 0, message: "fullname, username, email, socialId and socialType are required", Data: [] });
        }

        // Validate DOB if provided
        if (dateOfBirth) {
            // Validate format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dateOfBirth)) {
                return res.status(400).json({
                    status: 0,
                    message: 'Date must be in YYYY-MM-DD format'
                });
            }

            // Parse and validate date
            let parsedDate;
            try {
                parsedDate = new Date(dateOfBirth);
                if (isNaN(parsedDate.getTime())) {
                    return res.status(400).json({
                        status: 0,
                        message: 'Invalid date'
                    });
                }
            } catch (error) {
                return res.status(400).json({
                    status: 0,
                    message: 'Invalid date format'
                });
            }

            // Check if date is not in future
            const today = new Date();
            if (parsedDate > today) {
                return res.status(400).json({
                    status: 0,
                    message: 'Date of birth cannot be in the future'
                });
            }

            // Calculate age
            const age = calculateAge(dateOfBirth);
            if (age < 13) {
                return res.status(403).json({
                    status: 0,
                    action: 'UNDERAGE_BLOCKED',
                    message: 'You must be at least 13 years old to use this app'
                });
            }

            if (age > 120) {
                return res.status(400).json({
                    status: 0,
                    message: 'Please enter a valid date of birth'
                });
            }
        }

        let user = await userData.findOne({ socialId, socialType });

        if (!user) {
            // new user
            user = await userData.create({
                fullname,
                username,
                email: email.toLowerCase(),
                socialId,
                socialType,
                image: req.file ? req.file.location : (req.body.image || ""),
                device_Token,
                device_Type,
                is_verified: true,
                bio,
                backgroundImageColour,
                dateOfBirth: dateOfBirth
            });
            // Send welcome email only for new users
            sendWelcomeEmail(user);
        } else {
            // update existing user
            user.fullname = fullname;
            user.username = username;
            user.email = email.toLowerCase();
            user.image = req.file ? req.file.location : (req.body.image || user.image);
            user.device_Token = device_Token;
            user.device_Type = device_Type;
            user.bio = bio;
            user.backgroundImageColour = backgroundImageColour;
            // Only update dateOfBirth if provided
            if (dateOfBirth) {
                user.dateOfBirth = dateOfBirth;
            }
            await user.save();
        }

        const token = jwt.sign(
            { user_id: user._id, email },
            process.env.TOKEN_KEY
        );
        user.token = token;
        await user.save();

        user.password = undefined;

        res.send({ status: 1, message: "Social login successful", Data: user });

    } catch (error) {
        console.log(error);
        res.send({ status: 0, message: "Social login failed", Data: [], error });
    }
};


// login 
exports.login = async (req, res, next) => {

    try {
        // Get user input
        const { email, password, device_Token, device_Type } = req.body;

        // Validate user input
        if (!(email && password)) {
            //   res.status(400).send("All input is required");
            return res.send({ status: 0, message: 'All input is required', Data: [] })
        }
        // Validate if user exist in our database
        const user = await userData.findOne({ email });

        if (!user) {
            return res.send({ status: 0, message: 'Incorrect Email.' })
        }
        const is_verified = user.is_verified

        if (is_verified === false) {

            const USerrrrtoken = jwt.sign(
                { user_id: user._id, email },
                process.env.TOKEN_KEY,
                // {
                //     expiresIn: "24h",
                // }
            );

            return res.send({ status: 0, message: "your profile is not verified", mobile: user.mobile, countrycode: user.countrycode, token: USerrrrtoken })
        }


        if (device_Token || device_Type) {
            
            user.device_Token = device_Token ? device_Token : user.device_Token;
            user.device_Type = device_Type ? device_Type : user.device_Type;
            // user.save()
        }
        if (user && (await bcrypt.compare(password, user.password))) {

            // Create token
            const token = jwt.sign(
                { user_id: user._id, email },
                process.env.TOKEN_KEY,
                // {
                //     expiresIn: "24h",
                // }
            );
            // save user token
            user.token = token;
            user.lastAppOpen = new Date();
          await  user.save()

            // const device_data = await userData.findByIdAndUpdate({ _id: _id }, { device_Token: device_Token, device_Type: device_Type }, { new: true })
            res.send({ status: 1, message: 'User login Sucessfully', Data: { _id: user._id, fullname: user.fullname, username: user.username, countrycode: user.countrycode, mobile: user.mobile, email: user.email, user_Id: user.user_Id, image: user.image, device_Type: user.device_Type, device_Token: user.device_Token, token, instagramUserName: user.instagramUserName, tikTokUserName: user.tikTokUserName, about: user.about, forTickStatus: user.forTickStatus } })
        }
        else {
            // res.send.setHeader(token) 
            return res.send({ status: 0, message: 'Incorrect Password.', Data: [] })
        }

    } catch (error) {
        res.send({ status: 0, message: error.message })

    }
}

// forget password
exports.forgetpass = async (req, res, next) => {

    try {
        const { email } = req.body

        const User = await userData.findOne({ email: req.body.email });
        if (!User)
            return res.send({ Status: 0, Message: 'user with given email doesnt exist' });
        // return res.status(400).send("user with given email doesn't exist");

        let Token = await token.findOne({ userId: User._id });
        if (!Token) {
            Token = await new token({
                userId: User._id,
                token: crypto.randomBytes(32).toString("hex"),
            }).save();
        }

        const link = `${process.env.BASE_URL}/forgetpassword/${User._id}/${Token.token}`
        console.log(link)
        await sendEmail(User.email, "Password reset link", link);

        // res.send("password reset link sent to your email account");
        res.send({ status: 1, message: 'password reset link sent to your email account' })
    } catch (error) {
        res.send("An error occured");
        console.log(error);
    }

}

exports.resetpass = async (req, res, next) => {

    // console.log('test');
    try {
        const { Password } = req.body
        // console.log(req.params.userId)
        // console.log("kakakaka")
        // console.log(req.params.token)
        const User = await userData.findById(req.params.userId);
        // if (!User) return res.status(400).send("invalid link or expired");
        if (!User)
            return res.send({ Staus: 0, Message: ' invalid link or expired' })

        const Token = await token.findOne({
            userId: User._id,
            Token: req.params.Token,
        });


        // console.log(user._id)
        // console.log(token)
        //front
        // res.render("resetpass", { userId: req.params.userId, token: req.params.Token })
        // if (!Token) return res.status(400).send("Invalid link or expired");
        if (!Token)
            return ({ Status: 0, Message: 'Invalid link or expired' })

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(Password, salt);

        User.password = passwordHash;
        await User.save();
        await Token.delete();

        console.log(Password);

        // res.send("password reset sucessfully.");
        // res.send({ Status: 1, Message: "password reset sucessfully." })
        req.flash('success', 'password reset sucessfully ')
        res.render('resetpass', { success: req.flash('success') })
        // res.redirect('/')
    } catch (error) {
        res.send({ status: 0, Message: "An error occured" })
        // res.send("An error occured");
        console.log(error);
    }
}
// change password
exports.changePass = async (req, res, next) => {

    try {

        console.log(req.body);
        const body = req.body

        const updatepass = await userData.findById(req.user._id)
        console.log(updatepass);

        if (!updatepass.validPassword(body.oldpassword)) return res.send({ data: [], status: 0, message: 'Old password invalid' })

        if (body.oldpassword === body.newpassword) return res.send({ data: [], status: 0, message: 'This password already in use' })

        updatepass.password = await bcrypt.hash(body.newpassword, 12)

        const update = await userData.findByIdAndUpdate({ _id: req.user._id }, updatepass)
        update.password = undefined;
        res.send({ Data: update, status: 1, message: 'Password changed successfully' })


    } catch (error) {
        res.send({ status: 0, message: 'Password Can Not Changed' })
        console.log(error);
    }

}
exports.editProfile = async (req, res, next) => {
    try {
        // Validate DOB if provided
        if (req.body.dateOfBirth) {
            // Validate format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(req.body.dateOfBirth)) {
                return res.status(400).json({
                    status: 0,
                    message: 'Date must be in YYYY-MM-DD format'
                });
            }

            // Parse and validate date
            let parsedDate;
            try {
                parsedDate = new Date(req.body.dateOfBirth);
                if (isNaN(parsedDate.getTime())) {
                    return res.status(400).json({
                        status: 0,
                        message: 'Invalid date'
                    });
                }
            } catch (error) {
                return res.status(400).json({
                    status: 0,
                    message: 'Invalid date format'
                });
            }

            // Check if date is not in future
            const today = new Date();
            if (parsedDate > today) {
                return res.status(400).json({
                    status: 0,
                    message: 'Date of birth cannot be in the future'
                });
            }

            // Calculate age
            const age = calculateAge(req.body.dateOfBirth);
            if (age < 13) {
                return res.status(403).json({
                    status: 0,
                    action: 'UNDERAGE_BLOCKED',
                    message: 'You must be at least 13 years old to use this app'
                });
            }

            if (age > 120) {
                return res.status(400).json({
                    status: 0,
                    message: 'Please enter a valid date of birth'
                });
            }
        }

        // Check if the username already exists and is used by another user
        const already_using_username = await userData.findOne({
            username: req.body.username,
            _id: { $ne: req.user._id } // Exclude current user's ID
        });

        if (already_using_username) {
            return res.send({ status: 0, message: "Username already exists." });
        }

        // If a file is uploaded, update the user data including the image
        if (req.file) {
            const result = await userData.findByIdAndUpdate(
                req.user._id,
                {
                    $set: {
                        image: req.file.location,
                        fullname: req.body.fullname,
                        username: req.body.username,
                        countrycode: req.body.countrycode,
                        mobile: req.body.mobile,
                        email: req.body.email,
                        about: req.body.about,
                        instagramUserName: req.body.instagramUserName,
                        tikTokUserName: req.body.tikTokUserName,
                        backgroundImageColour : req.body.backgroundImageColour,
                        bio : req.body.bio
                    }
                },
                { new: true }
            );
            return res.send({ Data: result, status: 1, message: 'User updated successfully' });
        } else {
            // Update user data without the image
            const result = await userData.findByIdAndUpdate(
                req.user._id,
                {
                    $set: {
                        image: req.body.image,
                        fullname: req.body.fullname,
                        username: req.body.username,
                        countrycode: req.body.countrycode,
                        mobile: req.body.mobile,
                        email: req.body.email,
                        about: req.body.about,
                        instagramUserName: req.body.instagramUserName,
                        tikTokUserName: req.body.tikTokUserName,
                        backgroundImageColour : req.body.backgroundImageColour,
                        bio : req.body.bio,
                        dateOfBirth: req.body.dateOfBirth
                    }
                },
                { new: true }
            );
            return res.send({ Data: result, status: 1, message: 'User updated successfully' });
        }
    } catch (error) {
        console.log(error);
        return res.send({ status: 0, message: "Something went wrong" });
    }
};

// Helper function to calculate age
function calculateAge(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// is verified 
exports.is_verified = async (req, res, next) => {
    try {
        const verified = req.user.is_verified
        const user_id = req.user._id
        console.log('is_verified=>>', verified)

        const is_verified = await userData.findByIdAndUpdate(user_id, { is_verified: true }, { new: true })
        res.send({ Data: is_verified, status: 1, message: "profile verified successfully" })
    }
    catch (error) {
        res.send({ status: 1, message: error.message })
        console.log(error)
    }
}

// updateNotification
exports.updateAllNotification = async (req, res, next) => {
    try {

        const userFind = await userData.findOne({ _id: req.user._id })
        if (userFind !== null) {
            return res.send({ status: 0, message: "User Not Found" })
        }

        const updateNotifications = await userData.findByIdAndUpdate({ _id: req.user._id }, {
            notificationPostOnTimeline: req.body.notificationPostOnTimeline,
            notificationforJoinSection: req.body.notificationforJoinSection,
            notificationForSlidingTimeline: req.body.notificationForSlidingTimeline
        }, { new: true })

        res.send({})
    }
    catch (error) {
        console.log("error=>>", error)
    }
}


// deleteAccount 
exports.deleteAccount = async (req, res, next) => {
    try {
        const userId = req.user._id

        const deleteUserAccount = await userData.deleteOne({ _id: userId })

        if (deleteUserAccount) {

            await postModel.deleteMany({ user_Id: userId });
            await commentModel.deleteMany({ user_Id: userId });
            await likeModel.deleteMany({ user_Id: userId });
            await notificationModel.deleteMany({ user_id: userId });
            await notificationModel.deleteMany({ sender_id: userId })
            await requestModel.deleteMany({ senderId: userId });
            await requestModel.deleteMany({ ReciverId: userId });
            await sectionModel.deleteMany({ userObjId: userId });
            await sectionModel.updateMany(
                { community_Members: userId }, // Match documents where the memberId exists in the array
                { $pull: { community_Members: userId } } // Pull the memberId from the array
            );
            await forTickModel.deleteMany({ userId: userId });
            await searchModel.deleteMany({ user_Id: userId });
            await reportPostBySectionOwnerModel.deleteMany({ userId: userId })
            await reportuserforPostModel.deleteMany({ currentUserId: userId })

        }

        return res.send({ status: 1, message: "Account deleted successfully" })

    }
    catch (error) {
        console.log("error", error)
        res.send({ status: 1, message: error.message })

    }
}



// blockUsers
exports.addBlockUsers = async (req, res, next) => {
    try {

        const userId = req.user._id
        const blockUserId = req.body.blockUserId

        if (!blockUserId) {
            return res.send({ status: 0, message: "blockUserId is required." })
        }

        const addInBlockUser = await userData.findByIdAndUpdate(
            { _id: userId },
            { $push: { blockUsers: { userIds: blockUserId } } },
        )

        return res.send({ status: 1, message: "User blocked successfully." })

    }
    catch (error) {
        console.log("error", error)
        return res.send({ status: 0, message: "Something wnet wrong." })
    }
}


// blockUsers
exports.blockUserList = async (req, res, next) => {
    try {

        const userId = req.user._id

        const blockUsers = await userData.findOne({ _id: userId },
            { 'blockUsers': 1 })
            .populate('blockUsers.userIds', 'fullname username image backgroundImageColour');

        if (blockUsers && blockUsers.blockUsers.length > 0) {
            const blockUsersArray = blockUsers.blockUsers.map(blockUser => ({
                blockId: blockUser.userIds._id,
                fullname: blockUser.userIds.fullname || "",
                username: blockUser.userIds.username || "",
                image: blockUser.userIds.image || "",
                backgroundImageColour :blockUser.userIds.backgroundImageColour || ""

            }));
            // Send custom response
            return res.json({ status: 1, message: "Block list fatch successfully. ", data: blockUsersArray });
        }
        else {
            return res.json({ status: 1, message: "Block list fatch successfully. ", data: [] });

        }

    }
    catch (error) {
        console.log("error", error)
        res.send({ status: 0, message: error.message })

    }
}

// remove from block list
exports.removeFromBlockList = async (req, res, next) => {
    try {
        const userId = req.user._id
        const friendsId = req.body.friendsId


        const findFriends = await userData.findOne({ _id: friendsId })

        if (!findFriends) {
            return res.send({ status: 0, message: "friend not found." })
        }


        const unBlock = await userData.findByIdAndUpdate(
            { _id: userId },
            { $pull: { blockUsers: { userIds: friendsId } } },
        )

        return res.send({ status: 1, message: "User unblock successfully." })

    }
    catch (error) {
        console.log("error", error)
        res.send({ status: 0, message: error.message })

    }
}

// whos block current user 
exports.whosBlockCurrentUser = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const whosBlockCurrentUserList = await userData.find({ "blockUsers.userIds": userId });

        const response = whosBlockCurrentUserList.map(user => {
            return {
                id: user._id,
                fullname: user.fullname,
                username: user.username,
                countrycode: user.countrycode,
                mobile: user.mobile,
                email: user.email,
                image: user.image,

            };
        });

        return res.status(200).json({
            status: 1,
            message: 'Users who have blocked the current user fetched successfully',
            data: response
        });
    } catch (error) {
        console.error("error", error);
        return res.status(500).json({
            status: 0,
            message: 'An error occurred while fetching the data',
            error: error.message
        });
    }
};

exports.usersSocialScores = async (req, res, next) => {
    try {
      const userId = req.user._id;
  
      // Get the current user's socialScore and xp
      const currentUser = await userData.findById(userId, {
        socialScore: 1,
        xp: 1,
        image :1,
        username : 1,
        fullname : 1,
        usersSocialScores : 1
      });
  
      if (!currentUser) {
        return res.status(404).json({status : 0 ,  message: "User not found" });
      }
  
      // Get all users' socialScore sorted descending to determine rankings
      const users = await userData
        .find({}, { socialScore: 1, xp: 1 ,   username : 1,
            fullname : 1, image : 1 , usersSocialScores : 1 })
        .sort({ socialScore: -1 });
  
      // Calculate positions (rankings)
      const topUsers = [];
      let currentUserPosition = null;
  
      users.forEach((user, index) => {
        const position = index + 1;
  
        // Save top 10 users
        if (position <= 10) {
          topUsers.push({
            _id: user._id,
            socialScore: user.socialScore,
            xp: user.xp,
            position: position,
            username : user.username,
            fullname : user.fullname,
            image : user.image,
            backgroundImageColour : user.backgroundImageColour
          });
        }
  
        // Find current user's position
        if (user._id.toString() === userId.toString()) {
          currentUserPosition = position;
        }
      });
  
      return res.status(200).json({
        status : 1,
        message: "Users social scores fetched successfully",
        topUsers,
        currentUser: {
          socialScore: currentUser.socialScore,
          xp: currentUser.xp,
          position: currentUserPosition,
    
        },
      });
    } catch (error) {
      console.log("error", error);
      return res.status(500).json({status : 0 ,  message: "Server error" });
    }
  };
  
  exports.Emojis = async (req , res , next)=>{
    try {
        const emojisList = await emojiModels.find({})
        return res.send ({status : 1 , message : "Emojis list fatch successfully" , data : emojisList})

    }catch(error) {
        console.log("error" , error)
        return res.send({status : 0 , message :"Something went wrong."})
    }
  }


exports.score0 = async (req, res, next) => {
  try {
    // Update ALL users
    const userUpdateResult = await userData.updateMany(
      {}, // Match all users
      {
        $set: {
          xp: 1,
          socialScore: 0,
          highestScore: 0,
          previousScore: 0,
          previousRank: -1,
          lastScoreChange: new Date(),
          lastDecay: new Date(),
          previousXP: 0,
          currentWeekScore: 0,
          weeklyScores: []
        },
        $unset: {
          currentWeekNumber: 1,
          currentWeekYear: 1
        }
      }
    );

    // Update ALL sections
    const sectionUpdateResult = await sectionModel.updateMany(
      {}, // Match all sections
      {
        $set: {
          xp: 1,
          socialScore: 0,
          previousScore: 0,
          previousRank: -1,
          lastScoreChange: new Date(),
          lastDecay: new Date(),
          previousXP: 0,
          currentWeekScore: 0,
          viewsCount: 0,
          viewsTimeAndDateAndUserId: [],
          weeklyScores: []
        },
        $unset: {
          currentWeekNumber: 1,
          currentWeekYear: 1
        }
      }
    );

    return res.status(200).json({
      status: 1,
      message: 'All users and sections reset successfully',
      usersModified: userUpdateResult.modifiedCount,
      sectionsModified: sectionUpdateResult.modifiedCount
    });
  } catch (error) {
    console.error('Update Error:', error);
    return res.status(500).json({
      status: 0,
      message: 'Failed to reset scores',
      error: error.message
    });
  }
};