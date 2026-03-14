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
