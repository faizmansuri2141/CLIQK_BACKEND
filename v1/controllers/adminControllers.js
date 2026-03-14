const bcrypt = require('bcryptjs');
require('../../DB/conn');
const adminData = require('../../models/adminSchema');
const uploads = require('../../middleware/multer')
const Report = require('../../models/Report');
const User = require('../../models/user');

const Reward = require("../../models/rewards");

const moment = require("moment");


exports.singUp = async (req, res, next) => {
    console.log(req.body);
    try {
        // const { Name, Email, Pass , image } = req.body;
        // const  reqBody = req.body
        // console.log(reqBody);
        console.log('rajaaaaaaa', req.body);
        // console.log('rrrrrrrrrrrrraaaaaaaaaaaaaaaa', req.file);
        const adminregister = new adminData({

            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            // image: req.file.path

        });

        const token = await adminregister.authToken();

        console.log(token);

        const result = await adminregister.save()

        if (adminData) {
            // res.redirect('/')

            res.send({

                Data: result, status: 1, message: ' Admin Data register Success'
            })
        }
        else {
            res.send({ data: {}, status: 0, message: 'Admin can not insert Data' })
        }


    } catch (error) {
        console.log("data is not store singup", error);
        console.log(error);
    }
}

exports.login = async (req, res, next) => {
    try {

        const Email = req.body.email;
        const password = req.body.password;

        const userEmail = await adminData.findOne({ email: Email })
        console.log(userEmail);
        if (!userEmail) {

            req.flash('error', ' email is not match')
            res.render('admin', { message: req.flash('error') })
        }

        if (userEmail) {

            const validPassWord = await bcrypt.compare(password, userEmail.password);

            if (!validPassWord) {

                req.flash('error', ' Password is not match')
                res.render('admin', { message: req.flash('error') })
                // res.render('index')
            }

            console.log('dbaGDAbd', validPassWord);

            const token = await userEmail.authToken()

            console.log("login token", token);

            if (validPassWord) {
                var obj = {}

                obj.email = userEmail.email
                obj.id = userEmail._id,
                    obj.name = userEmail.name
                req.session.isLoggedin = true,
                    req.session.adminLogin = userEmail,
                    res.locals.admin = userEmail
                console.log('find', res.locals.admin);
                // req.session.adminLogin = Name ,
                // req.session.adminLogin = Image ,


                console.log('rajaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', req.session.adminLogin);


                //console.log("this is login session", req.session);
                //console.log(req.body);
                console.log("33333333", req.session.isLoggedin);
                // req.flash('success_msg', 'Login Successfull')
                res.redirect('/dashboard');

            } else {
                // req.flash('error_msg', 'Email and Password Wrong');
                // req.flash('error',    'Can Not Match Cradantials')
                res.render('admin')

                console.log("this is homepage error 1010101010");
                console.log('user login error');

            }
        }
    } catch (error) {
        console.log(error);
    }


}

// logout
exports.logout = (req, res, next) => {
    //console.log(" this is logout session", req.session);
    console.log('this is logout 11111111');
    console.log("logout Api 11111111", req.session.isLoggedin);
    req.session.isLoggedin = true
    try {

        req.session.isLoggedin = null
        // res.header('Cache-Control', 'no-cache');
        console.log(" this is logout session", req.session);


        req.flash('error', ' logged out')
        res.redirect('/')

    } catch (error) {
        res.send("user Logout not Work", error)
    }
}

exports.findAdminData = async (req, res, next) => {

    try {

        const findAdminData = await adminData.findById(req.params.id)
        console.log('rejaaaaaaaaaaaaaaaaaa', findAdminData)
        res.render('adminprofile', { record: findAdminData })

    } catch (error) {
        console.log(error);
    }

}

exports.updateAdminData = async (req, res, next) => {

    try {
        console.log('rajaaaaaaaaaa', req.body);
        console.log('jVDJHvduhVJDVd', req.file);

        if (req.file) {
            const result = await adminData.findByIdAndUpdate(req.body.id, {

                name: req.body.name,
                email: req.body.email,
                image: req.file.location,

            })

            console.log('reeeeeeeeeeeee'.result);
            req.flash('success', '  update data successfully')

            res.redirect('/adminprofile')
            // res.send(result);

        }
        else {

            const result = await adminData.findByIdAndUpdate(req.body.id, {


                name: req.body.name,
                email: req.body.email,

            })
            console.log('hshshshshshs', result);


            req.flash('success', ' update data successfully')
            // res.redirect('adminprofile', { message: req.flash('error') })

            res.redirect('/adminprofile')

            // res.send(result);
        }

    } catch (error) {
        console.log(error);

    }

};

exports.updateAdminPassword = async (req, res, next) => {
    try {

        console.log(req.body);
        const reqbody = req.body

        let adminPass = await adminData.findById(reqbody.id);
        console.log(adminPass);
        const old_pass = await bcrypt.compare(reqbody.old_pass, adminPass.password)


        console.log('RAJA>>>>>>>>>>>>>>>', old_pass);


        if (!adminPass.password === old_pass) {

            console.log('Old pass not match');
            req.flash('error', ' old pass not match')
            res.redirect('/adminprofile')
            // res.send({message: 'old pass not match'})
        }
        else {
            adminPass.password = await bcrypt.hash(reqbody.new_pass, 10);

            console.log('RAjaaaaaa', adminPass.password);

            const changePass = await adminData.findByIdAndUpdate(reqbody.id, { password: adminPass.password }, { new: true });
            console.log(changePass);

            req.flash('error', ' your password change successfully')
            res.redirect('/');
            // res.send({message :'success'})

        }
        // if (!adminPass.validPassword(reqbody.old_pass)) return console.log("Admin Old Password Not Match");

    } catch (error) {
        console.log(error);
    }

}

// 👑 STEP 2: Admin Get Pending Rewards API
exports.getPendingRewards = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        console.log("🔸 Admin fetching pending rewards...", {
            page,
            limit
        });

        // ✅ Get pending rewards with pagination
        const rewards = await Reward.find({ status: "pending" })
            .populate('user_id', 'username fullname image email')
            .populate('section_id', 'communityName')
            .sort({ submitted_at: 1 }) // Oldest first
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Reward.countDocuments({ status: "pending" });

        console.log("✅ Pending rewards found:", rewards.length);

        res.status(200).json({
            success: true,
            message: `Found ${rewards.length} pending rewards`,
            data: rewards,
            pagination: {
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                totalRewards: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.log("❌ Get pending rewards error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching pending rewards"
        });
    }
}

// 👑 STEP 3: Admin Get All Rewards with Filters
exports.getAllRewards = async (req, res, next) => {
    try {
        const { status, reward_type, page = 1, limit = 10 } = req.query;
        
        console.log("🔸 Admin fetching all rewards with filters...", {
            status,
            reward_type,
            page,
            limit
        });

        // ✅ Build filters
        let filters = {};
        if (status) filters.status = status;
        if (reward_type) filters.reward_type = reward_type;

        const rewards = await Reward.find(filters)
            .populate('user_id', 'username fullname image email')
            .populate('section_id', 'communityName')
            .sort({ submitted_at: -1 }) // Newest first
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Reward.countDocuments(filters);

        console.log("✅ Filtered rewards found:", rewards.length);

        res.status(200).json({
            success: true,
            message: `Found ${rewards.length} rewards`,
            data: rewards,
            pagination: {
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                totalRewards: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.log("❌ Get all rewards error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching rewards"
        });
    }
}

// Get all reports (admin only)
exports.getReports = async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        
        // Build filter - per doc: Default view shows Pending
        const filter = {};
        const statusFilter = (status && ['all', 'pending', 'resolved', 'dismissed'].includes(status)) ? status : 'pending';
        if (statusFilter !== 'all') {
            filter.status = statusFilter;
        }

        // Get all reports without pagination limit
        const reports = await Report.find(filter)
            .populate('reportedMessageId', 'content')
            .populate('reportedUserId', 'fullname username email')
            .populate('reportedByUserId', 'fullname username email')
            .populate('sectionId', 'communityName')  // ✅ FIXED: Use correct field name
            .sort({ createdAt: -1 });

        const total = await Report.countDocuments(filter);

        // Render admin reports page
        res.render('reports', {
            title: 'Reports Management',
            reports: reports,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            },
            currentStatus: (status && ['all', 'pending', 'resolved', 'dismissed'].includes(status)) ? status : 'pending',
            moment: moment
        });

    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Internal server error while fetching reports'
        });
    }
};

// Update report status (admin only)
exports.updateReport = async (req, res) => {
    try {
        const { status } = req.body;
        const reportId = req.params.id;

        if (!['pending', 'resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({
                status: 0,
                message: 'Invalid status'
            });
        }

        const updateData = {
            status,
            resolvedAt: status !== 'pending' ? new Date() : null,
            resolvedBy: status !== 'pending' ? req.session.adminId : null
        };

        const updatedReport = await Report.findByIdAndUpdate(
            reportId,
            updateData,
            { new: true }
        ).populate('reportedMessageId', 'content')
         .populate('reportedUserId', 'fullname username email')
         .populate('reportedByUserId', 'fullname username email')
         .populate('sectionId', 'name');

        if (!updatedReport) {
            return res.status(404).json({
                status: 0,
                message: 'Report not found'
            });
        }

        res.json({
            status: 1,
            message: 'Report updated successfully',
            data: updatedReport
        });

    } catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({
            status: 0,
            message: 'Internal server error'
        });
    }
};

// PATCH /reports/:id/resolve - per doc: Body { action: 'remove_message' | 'ban_user' }
exports.resolveReport = async (req, res) => {
    try {
        const reportId = req.params.id;
        const { action } = req.body || {};

        const updateData = {
            status: 'resolved',
            resolvedAt: new Date(),
            resolvedBy: req.session?.adminId || req.session?.adminLogin?._id || null
        };

        const updatedReport = await Report.findByIdAndUpdate(
            reportId,
            updateData,
            { new: true }
        ).populate('reportedUserId', 'fullname username email')
         .populate('reportedByUserId', 'fullname username email')
         .populate('sectionId', 'communityName');

        if (!updatedReport) {
            return res.status(404).json({
                status: 0,
                message: 'Report not found'
            });
        }

        res.json({
            status: 1,
            message: 'Report resolved successfully',
            data: updatedReport
        });
    } catch (error) {
        console.error('Error resolving report:', error);
        res.status(500).json({
            status: 0,
            message: 'Internal server error'
        });
    }
};

// PATCH /reports/:id/dismiss - per doc
exports.dismissReport = async (req, res) => {
    try {
        const reportId = req.params.id;

        const updateData = {
            status: 'dismissed',
            resolvedAt: new Date(),
            resolvedBy: req.session?.adminId || req.session?.adminLogin?._id || null
        };

        const updatedReport = await Report.findByIdAndUpdate(
            reportId,
            updateData,
            { new: true }
        ).populate('reportedUserId', 'fullname username email');

        if (!updatedReport) {
            return res.status(404).json({
                status: 0,
                message: 'Report not found'
            });
        }

        res.json({
            status: 1,
            message: 'Report dismissed successfully',
            data: updatedReport
        });
    } catch (error) {
        console.error('Error dismissing report:', error);
        res.status(500).json({
            status: 0,
            message: 'Internal server error'
        });
    }
};

// Block/Suspend User
exports.blockUser = async (req, res) => {
    try {
        const { userId, reason } = req.body;

        if (!userId || !reason) {
            return res.status(400).json({
                status: 0,
                message: 'User ID and suspension reason are required'
            });
        }

        // Update user suspension status
        const updatedUser = await User.findByIdAndUpdate(userId, {
            isSuspended: true,
            suspensionReason: reason,
            suspendedAt: new Date(),
            suspendedBy: req.session.adminId || req.session.admin?._id || null
        }, { new: true });

        console.log("updatedUser" , updatedUser)

        if (!updatedUser) {
            return res.status(404).json({
                status: 0,
                message: 'User not found'
            });
        }

        // Send notification to user (you can implement email/push notification here)
        console.log(`User ${userId} suspended by admin session for reason: ${reason}`);
        console.log('Session data:', req.session);

        res.json({
            status: 1,
            message: 'User suspended successfully',
            data: {
                userId: userId,
                suspendedAt: updatedUser.suspendedAt,
                reason: reason
            }
        });

    } catch (error) {
        console.error('Error suspending user:', error);
        res.status(500).json({
            status: 0,
            message: 'Internal server error'
        });
    }
};

// Unblock/Unsuspend User
exports.unblockUser = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                status: 0,
                message: 'User ID is required'
            });
        }

        // Update user suspension status
        const updatedUser = await User.findByIdAndUpdate(userId, {
            isSuspended: false,
            suspensionReason: null,
            suspendedAt: null,
            suspendedBy: null
        }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({
                status: 0,
                message: 'User not found'
            });
        }

        console.log(`User ${userId} unsuspended by admin session`);

        res.json({
            status: 1,
            message: 'User unsuspended successfully',
            data: {
                userId: userId,
                unsuspendedAt: new Date()
            }
        });

    } catch (error) {
        console.error('Error unsuspending user:', error);
        res.status(500).json({
            status: 0,
            message: 'Internal server error'
        });
    }
};


// Remove Message (admin only)
exports.removeMessage = async (req, res) => {
    try {
        const messageId = req.params.messageId;
        
        if (!messageId) {
            return res.status(400).json({
                status: 0,
                message: 'Message ID is required'
            });
        }

        // Find and delete the message
        const message = await postModel.findByIdAndDelete(messageId);
        
        if (!message) {
            return res.status(404).json({
                status: 0,
                message: 'Message not found'
            });
        }

        console.log(`Message ${messageId} removed by admin`);

        res.json({
            status: 1,
            message: 'Message removed successfully'
        });

    } catch (error) {
        console.error('Error removing message:', error);
        res.status(500).json({
            status: 0,
            message: 'Internal server error'
        });
    }
};

// Ban User from Report (admin only)
exports.banUserFromReport = async (req, res) => {
    try {
        const { userId, reason, reportId } = req.body;
        
        if (!userId || !reason) {
            return res.status(400).json({
                status: 0,
                message: 'User ID and reason are required'
            });
        }

        // Find user
        const user = await userData.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                status: 0,
                message: 'User not found'
            });
        }

        // Suspend user
        user.isSuspended = true;
        user.suspensionReason = reason;
        user.suspendedAt = new Date();
        await user.save();

        // Update report status if reportId provided
        if (reportId) {
            await Report.findByIdAndUpdate(reportId, {
                status: 'resolved',
                resolvedAt: new Date(),
                resolvedBy: req.session.adminId
            });
        }

        console.log(`User ${userId} banned by admin. Reason: ${reason}`);

        res.json({
            status: 1,
            message: 'User banned successfully'
        });

    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({
            status: 0,
            message: 'Internal server error'
        });
    }
};
