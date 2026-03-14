exports.authenticateAdmin = function(req, res, next) {
    //console.log('adminMiddleware', req.session);
    if (req.session.isLoggedin) {

        //console.log('admin session', req.session.isLoggedin);
        next();
    } else {
        
        req.flash('error', ' logged Out')
        res.redirect('/');
        //console.log("this is homepage erroe 1010101010");
        //console.log('admin session', !req.session.isLoggedin);
    }
};

exports.isLogin = function(req, res, next) {
    if (req.session.adminLogin) {
        res.redirect('dashboard');
    } else {
        next();
    }
};