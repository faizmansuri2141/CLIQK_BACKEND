const tipdate = require('../../../models/tip');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const userdata = require('../../../models/user');
const section_Data = require('../../../models/createcommunity');
const subscription_data = require('../../../models/subscription');
const privacy_policy_Data = require('../../../models/privacypolicy')
const terms_of_use_data = require('../../../models/term_of_use');
const community_guid_data = require('../../../models/comminity_guidlines.js');
const notification = require('../../../models/notifiication_list.js')
var mongoose = require('mongoose');
// kyc
exports.verification = async (req, res, next) => {
    try {

        const UserId = req.user._id;
        console.log(UserId);
        var AccountId = req.user.stripe_Account_Id;
        console.log(AccountId);

        const account = await stripe.accounts.retrieve(
            AccountId
        );
        console.log(account);
        const isProfile_verified = req.user.isProfile_verified

        // const disabled_reason1 = account.requirements.disabled_reason.toString()
        // console.log('disabled_reason1=>>', disabled_reason1);

        if (account.charges_enabled == false && account.details_submitted == false && account.payouts_enabled == false && account.requirements.disabled_reason !== null) {
            const accountLink = await stripe.accountLinks.create({
                account: AccountId,
                refresh_url: 'https://example.com/reauth',
                return_url: 'https://example.com/return',
                type: 'account_onboarding',
            });
            console.log("account_url=>>", accountLink.url, isProfile_verified);
            const accounturl = accountLink.url
            return res.status(200).send({ status: 0, message: "Account link created successfully to fill up KYC details", accounturl, isProfile_verified })

        } else {
            const user = await userdata.findByIdAndUpdate(UserId, {
                isProfile_verified: true
            })
            user.password = undefined
            res.status(200).send({ status: 1, message: " account verified successfully", isProfile_verified, user })
        }
    }
    catch (error) {
        console.log(error)
        res.send({ status: 0, message: error.message })
    }
}

exports.payment = async (req, res, next) => {
    try {
        const friend_id = req.body.friend_id
        const CustomerId = req.user.strip_custemor_Id
        const friends_CustomerId = await userdata.findById({ _id: friend_id })


        // card token
        const payment_method = "card_1MH64KEiYUQpZGpBgFgJ0rIb"
        const paymentIntent = await stripe.paymentIntents.create({
            amount: req.body.amount,
            currency: "usd",
            payment_method_types: ["card"],
            customer: CustomerId,
            payment_method: payment_method,
            // setup_future_usage: "on_session",
            capture_method: "automatic",
            // confirmation_method: "automatic",
            // confirm: "true",
        });
        console.log("paymentIntent=>>", paymentIntent)
        const paymentIntentId = paymentIntent.id
        console.log("paymentIntentId=>>", paymentIntentId)

        const paymentIntentConfirm = await stripe.paymentIntents.confirm(
            paymentIntentId);
        console.log("confirm......", paymentIntentConfirm);

        const transfer = await stripe.transfers.create({
            amount: req.body.amount,
            currency: "usd",
            destination: friends_CustomerId.stripe_Account_Id,
        });

        console.log("transfer=>>", transfer)
        res.send({ status: 1, message: "payment successfully" })
    }
    catch (error) {
        res.send({ status: 0, message: error.message })
        console.log(error)
    }
}

//card saveing stripe
exports.stripeCardSave = async (req, res, next) => {
    try {
        let { cardToken } = req.body
        const user = await userdata.findById(req.user._id)

        //card token attached with stripe
        const card = await stripe.customers.createSource(user.strip_custemor_Id, {
            source: "tok_visa"
        })

        res.json({ status: 1, message: 'Card details save successfully' })
    } catch (error) {
        res.json({ status: 0, message: error.message })
    }
}

//list card
exports.cardList = async (req, res, next) => {
    try {
        const user = await userdata.findById(req.user._id)

        //retive all card of customer
        const cards = await stripe.customers.listSources(user.strip_custemor_Id, {
            object: 'card'
        })
        console.log("cards=>>>", cards)

        let newArry = []
        cards.data.forEach(item => {
            let resData = {
                id: item.id,
                last4: item.last4,
                brand: item.brand,
                country: item.country
            }

            newArry.push(resData)
        })
        res.json({ status: 1, message: 'All Card list', data: newArry })
    } catch (error) {
        res.json({ status: 0, message: error.message })
    }
}


//charge new
exports.charge = async (req, res, next) => {

    const friend_id = req.body.friend_id
    const friends_CustomerId = await userdata.findById({ _id: friend_id })

    const CustomerId = req.user.strip_custemor_Id
    const cardID = req.body.cardID

    const charge = await stripe.charges.create({
        amount: req.body.amount,
        currency: "usd",
        source: cardID,
        capture: true,
        customer: CustomerId
    })

    if (charge.status === 'succeeded') {
        // appointments.sickNote.patientPaymentDone = true
        // appointments.sickNote.sickNoteShow = true
        // appointments.sickNote.stripeChargeID = charge.id
        // const save = await appointments.save()

        // 88 for admin
        const profit = (charge.amount * 88) / 100 - charge.amount * 0.029 + 0.3
        const finalProfit = Math.round(profit)
        console.log("finalProfit=>>", finalProfit)


        const balance = await stripe.balance.retrieve()
        const transfer = await stripe.transfers.create({
            amount: finalProfit,
            currency: "usd",
            destination: friends_CustomerId.stripe_Account_Id,
        });
        console.log("transfer=>>", transfer)
        res.send({ status: 1, message: "Tip Given Successfully" })
    }
    //transfer API for user
    // const transfer = await stripe.transfers.create({
    //     amount: finalProfit,
    //     currency: charge.currency,
    //     destination: doctor.stripeAccountId,
    //     metadata: {
    //         patient_id: appointments.patient_id,
    //         appointment_id: appointments._id,
    //         doctor_id: appointments.doctor_id,
    //         appointment_time: appointments.time,
    //         appointment_date: appointments.date
    //     }

    // })

}




// exports.createCommunity = async (req, res, next) => {
//     console.log('communitybody=>>', req.body);
//     console.log('community.......files', req.files);
//     try {
//         const user_Id = req.user._id
//         console.log('user_Id=>>', user_Id)
//         const username = req.user.username
//         const userImage = req.user.image
//         const is_public = parseInt(req.body.is_public)
//         console.log('gnmvcvbn', typeof is_public)


//         const cliqk = await createCliqkData.find({ userObjId: user_Id }).lean()


//         if (cliqk.length == 2) {
//             return res.send({ status: 0, message: "you are already created  2 sections" })
//         }

//         if (cliqk.length > 0) {

//             const data = await createCliqkData.find({ userObjId: user_Id, is_public: is_public })
//             console.log('data=>>', data)
//             if (data.length == 1) {
//                 return res.send({ status: 0, message: "you are already created public section" })
//             }

//             const datas = await createCliqkData.find({ userObjId: user_Id, is_public: is_public })
//             console.log('datas=>>', datas)
//             if (datas.length == 1) {
//                 return res.send({ status: 0, message: "you are already created private section" })
//             }

//         }

//         var communityImage = []
//         for (let i = 0; i < req.files.length; i++) {
//             communityImage.push({ image: req.files[i].location })
//         }
//         console.log('commuImage', communityImage);

//         let community_Members = req.body.community_Members
//         var all_Users = []
//         // .split(",")
//         // .map((ids) => mongoose.Types.ObjectId(ids));
//         console.log('community_Members=>>', community_Members)
//         // console.log(community_Members[0])
//         for (let index = 0; index < community_Members.length; index++) {
//             var element = community_Members[index];
//             console.log('element==>>', element)
//             var id = mongoose.Types.ObjectId(element);
//             console.log(typeof id)
//             const data = await userData.findById({ _id: id })
//             // console.log('data', data)
//             all_Users.push(data)
//         }
//         console.log('all_Users==>>', all_Users)
//         var createCommunity = await new createCliqkData({
//             communityImage: communityImage,
//             communityName: req.body.communityName,
//             aboutCommunity: req.body.aboutCommunity,
//             // addMembers: addMembers,
//             // user_Id: userObj._id,
//             username: username,
//             userImage: userImage,
//             userObjId: mongoose.Types.ObjectId(user_Id),
//             is_public: is_public
//         });
//         console.log('createCommunity', createCommunity._id);

//         for (let index = 0; index < all_Users.length; index++) {
//             const element11 = all_Users[index].device_Token;
//             const to_user_Id = all_Users[index]._id
//             // const device_type = all_Users[index]._device_Type
//             console.log('element11=>>', element11)

//             if (user_Id === to_user_Id) { return res.send({ status: 0, message: "can not request sent becouse you are current user" }) }

//             var message = {
//                 to: element11,/*device_Id*/
//                 priority: "high",
//                 notification: {
//                     title: 'Join Community',
//                     body: username + ' ' + "would like to invite you his section" + " " + `${req.body.communityName}`
//                 },
//             };

//             fcm.send(message, async function (err, response) {
//                 if (err) {
//                     console.log("Something has gone wrong!" + err);
//                     // console.log("Response:! " + response);
//                 } else {
//                     // showToast("Successfully sent with response");
//                     console.log("Successfully sent with response: ", response);
//                     if (response) {
//                         const send_Notification = await new send_Community_NotificationData({
//                             community_Admin: username,
//                             Comminity_Id: createCommunity._id,
//                             to_user_Id: to_user_Id,
//                             community_Admin_Id: user_Id,
//                             is_Accept: false,
//                             notification_type: 1,
//                             notification_message: message.notification.body

//                         })
//                         console.log('send_Notification=>>', send_Notification)
//                         send_Notification.save()

//                       const send_notification = new notification({
//                 community_id: createCommunity._id,
//                 sender_id: user_Id,
//                 user_id: to_user_Id,
//                 notification_message: message.notification.body,
//                 notification_type: 1,
//                 module_id: send_request._id,
//                 module_type: "community_request"


//             })
//             console.log("send_notification=>>", send_notification)
//             send_notification.save()


//                     }

//                 }
//             });

//             const send_request = new send_Community_NotificationData({
//                 community_Admin: username,
//                 Comminity_Id: createCommunity._id,
//                 to_user_Id: to_user_Id,
//                 community_Admin_Id: user_Id,
//                 is_Accept: false,
//                 // notification_type: 1,
//                 // notification_message: message.notification.body

//             })
//             console.log('send_request=>>', send_request)
//             send_request.save()

//             const send_notification = new notification({
//                 community_id: createCommunity._id,
//                 sender_id: user_Id,
//                 user_id: to_user_Id,
//                 notification_message: message.notification.body,
//                 notification_type: 1,
//                 module_id: send_request._id,
//                 module_type: "community_request"


//             })
//             console.log("send_notification=>>", send_notification)
//             send_notification.save()
//         }

//         createCommunity.save()
//         res.send({ data: createCommunity, status: 1, message: 'Create Section Successfully' })

//     } catch (error) {
//         console.log(error);
//         res.send({ status: 0, message: 'Create Section Can Not Successfully' })
//     }
// }


// subscribtion
// if paymets so call this api ptherwise can not call this apis
exports.create_subscribtion = async (req, res, next) => {
    try {
        const cust_id = req.user.strip_custemor_Id
        const section_id = req.body.section_id
        const notificationId = mongoose.Types.ObjectId(req.body._id)

        const find_Section = await section_Data.findById(section_id)
        const productOwnerId_find = await userdata.findById({ _id: find_Section.userObjId })
        const productOwnerId = productOwnerId_find.stripe_Account_Id

        const updateStatus = await notification.findByIdAndUpdate({ _id: notificationId }, { is_Shown: false, isAction: false })


        const paymentMethodId = req.body.paymentMethodId
        // const paymentMethod = await stripe.paymentMethods.create({
        //     type: 'card',
        //     card: {
        //         number: '4242424242424242',
        //         exp_month: 8,
        //         exp_year: 2024,
        //         cvc: '314',
        //     },
        // });

        // console.log("paymentMethod=>>", paymentMethod)

        const paymentMethodd = await stripe.paymentMethods.attach(
            paymentMethodId,
            { customer: cust_id }
        );
        console.log("paymentMethodd=>>", paymentMethodd)

        // single payments
        if (find_Section.timescale === "one_of_payment") {
            const friend_id = find_Section.userObjId
            const friends_CustomerId = await userdata.findById({ _id: friend_id })
            console.log("friends_CustomerId=>>", friends_CustomerId.strip_custemor_Id)
            console.log("stripe_Account_Id=>>", friends_CustomerId.stripe_Account_Id)

            // card token
            const payment_method = paymentMethodId
            const paymentIntent = await stripe.paymentIntents.create({
                amount: find_Section.Amount,
                currency: "usd",
                payment_method_types: ["card"],
                customer: cust_id,
                payment_method: payment_method,
                // setup_future_usage: "on_session",
                capture_method: "automatic",
                // confirmation_method: "automatic",
                // confirm: "true",
            });

            console.log("paymentIntent=>>", paymentIntent)
            const paymentIntentId = paymentIntent.id
            console.log("paymentIntentId=>>", paymentIntentId)

            const paymentIntentConfirm = await stripe.paymentIntents.confirm(
                paymentIntentId);

            const transfer = await stripe.transfers.create({
                amount: find_Section.Amount,
                currency: "usd",
                destination: friends_CustomerId.stripe_Account_Id,
            });

            console.log("transfer=>>", transfer)
            const add_member = await section_Data.findOneAndUpdate({ _id: section_id }, { $push: { community_Members: req.user._id } }, { new: true })
            res.send({ status: 1, message: "subscription successfully done" })
        }

        else {
            const subscription = await stripe.subscriptions.create({
                customer: cust_id,
                default_payment_method: paymentMethodId,
                items: [
                    { price: find_Section.price_id },

                ],
            });
            console.log("subscription=>>", subscription)

            const totalAmount = subscription.items.data[0].price.unit_amount;
            const adminTransferAmount = Math.ceil(totalAmount * 0.12);
            const productOwnerTransferAmount = totalAmount - adminTransferAmount;
            console.log("productOwnerTransferAmount=>>", productOwnerTransferAmount);

            // const adminTransfer = await stripe.transfers.create({
            //     amount: adminTransferAmount,
            //     currency: 'usd',
            //     destination: 'acct_1M9q7IEiYUQpZGpB', // replace with the actual admin's Stripe account ID

            // });

            // console.log("adminTransfer=>>", adminTransfer)

            // Create transfer to product owner
            const productOwnerTransfer = await stripe.transfers.create({
                amount: productOwnerTransferAmount,
                currency: 'usd',
                destination: productOwnerId, // replace with the actual product owner's Stripe account ID

            });

            if (subscription.status === "active") {
                const add_subscription = new subscription_data({
                    cust_id: cust_id,
                    section_id: section_id,
                    user_id: req.user._id,
                    subscription_id: subscription.id,
                    is_subscribe: true,
                    status: subscription.status,
                    currentPeriodStart: subscription.current_period_start,
                    currentPeriodEnd: subscription.current_period_end,
                    totalAmount: totalAmount,
                    // adminTransferAmount: adminTransferAmount
                    productOwnerTransferAmount: productOwnerTransferAmount
                    // communityTransferAmount : communityTransferAmount

                })
                const add_member = await section_Data.findOneAndUpdate({ _id: section_id }, { $push: { community_Members: req.user._id } }, { new: true })
                console.log("add_member", add_member)
                await add_subscription.save()

            }
            res.send({ status: 1, message: "subscription successfully done" })
        }
    }
    catch (error) {
        console.log("error=>>", error)
        res.send({ status: 0, message: "Something went wrong" })
    }
}

// cancel_subscription
exports.cancel_subscription = async (req, res, next) => {
    const section_id = req.body.section_id
    const user_id = req.user._id

    // const subscriptionId = req.body.subscriptionId;
    const remove_sunscription = await subscription_data.findOne({ section_id: section_id, user_id: user_id })
    console.log("remove_sunscription=>>", remove_sunscription)
    // console.log("subscription_id=>>" ,remove_sunscription.subscription_id  )

    if (remove_sunscription) {
        const subscription_id = remove_sunscription.subscription_id

        const section_remove = await subscription_data.findByIdAndUpdate({ _id: remove_sunscription._id }, { is_subscribe: false })
        console.log("section_remove=>>", section_remove)

        const subscription = await stripe.subscriptions.retrieve(subscription_id);

        await stripe.subscriptions.update(subscription_id, {
            cancel_at_period_end: true
        });

        // const deleted = await stripe.subscriptions.del(
        //     remove_sunscription.subscription_id
        // );
    }
}
// subscription end date and give notification
exports.complete_subscription = async (req, res, next) => {
    try {
        const user_id = req.user._id
        const section_id = req.body.section_id
        const remove_sunscription = await subscription_data.findOne({ section_id: section_id, user_id: user_id })
        console.log("remove_sunscription=>>", remove_sunscription)

        const subscription_id = remove_sunscription.subscription_id
        console.log("subscription_id=>>", subscription_id)

        stripe.subscriptions.retrieve(
            subscription_id,
            function (err, subscription) {
                if (err) {
                    console.log(err);
                } else {
                    // res.send()
                    // Subscription information retrieved successfully
                    console.log("subscription=>>", subscription)
                    const currentTime = Math.floor(Date.now() / 1000);
                    const subscriptionTime = subscription.current_period_end - currentTime;
                    console.log("subscriptionTime=>>", subscriptionTime)

                }
            }
        );

    }
    catch (error) {
        console.log(error)
    }
}
exports.privacy_policy = async (req, res, next) => {
    try {
        const privacy_policy = await privacy_policy_Data.find().lean()
        const data = Object.assign({}, ...privacy_policy);
        res.send({ data: data.text, status: 1, message: "Privacy Policy Data Fatch Successfully" })
    }
    catch (error) {
        console.log("error=>>", error)
        res.send({ status: 0, message: error.message })
    }
}
exports.terms_of_use = async (req, res, next) => {
    try {
        const terms_of_use = await terms_of_use_data.find().lean()
        const data = Object.assign({}, ...terms_of_use);
        res.send({ data: data.text, status: 1, message: "Terms Of Use Data Fatch Successfully" })
    }
    catch (error) {
        res.send({ status: 0, message: error.message })
    }
}
exports.community_guid_lines = async (req, res, next) => {
    try {
        const community_guid_lines = await community_guid_data.find().lean()
        const data = Object.assign({}, ...community_guid_lines);

        res.send({ data: data.text, status: 1, message: "Community Guid Lines Data Fatch Successfully" })
    }
    catch (error) {
        res.send({ status: 0, message: error.message })

    }
}









