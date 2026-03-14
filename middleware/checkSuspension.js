const User = require('../models/user');

// Check if user is suspended
const checkSuspension = async (req, res, next) => {
    try {
        // Skip suspension check for login and register routes
        const skipRoutes = ['/login', '/register', '/forgot-password'];
        if (skipRoutes.includes(req.path)) {
            return next();
        }

        // Check if user exists and is suspended
        if (req.user) {
            const user = await User.findById(req.user._id);
            
            if (user && user.isSuspended) {
                return res.status(403).json({
                    status: 0,
                    message: "Your CLIQK account has been suspended due to a violation of our Community Guidelines. If you believe this is an error, please contact us at info@cliqkworld.com"
                });
            }
        }

        next();
    } catch (error) {
        console.error('Error checking suspension:', error);
        res.status(500).json({
            status: 0,
            message: 'Internal server error'
        });
    }
};

module.exports = checkSuspension;
