var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const hbs = require('hbs');
var session = require('express-session');
var { JWT_SECRET } = require('./Key/sec');
require('dotenv').config();
var flash = require('connect-flash')
const backupMongoDB = require("./dbBackup/backup.js");

// Call the backup function
// backupMongoDB();





require("./middleware/postDelete.js")
// require("./middleware/scoredecaycron.js");
require("./middleware/ SectionNotifications.js");
require('./DB/conn');


var adminRouter = require('./v1/routes/admin');
var dashboardRouter = require('./v1/routes/dashboard');
var adminprofileRouter = require('./v1/routes/adminprofile');
var userRouter = require('./v1/routes/userlist');
var userProfile = require('./v1/routes/userprofile');
var privacypolicy = require('./v1/routes/privacypolicy');
var terms_of_use = require('./v1/routes/term_of_use');
var community_guidlines = require('./v1/routes/community_guidlines')
var communitylist = require('./v1/routes/communitylist')
var communityprofileRouter = require('./v1/routes/communityprofile');
var user_postRouter = require('./v1/routes/user_post');
const usersdata = require('./models/user');
// var usersRouter = require('./routes/users');



// for mobiles
var userRouter = require('./mobile/api/routes/userrouts');
var communityRouter = require('./mobile/api/routes/createcommunity');
var postRouter = require('./mobile/api/routes/createPost');
var searchRouter = require('./mobile/api/routes/search');
var homeScreenRouter = require('./mobile/api/routes/homescreen.js');
const like_DislikeData = require('./mobile/api/routes/like_dislike_Router');
const otherRouter = require('./mobile/api/routes/other');
const mediaroomRouter = require('./mobile/api/routes/media_room');
const settingRoutes = require('./mobile/api/routes/settingscreen')
const forTick = require('./mobile/api/routes/fortick')
const socialScoreRouter = require('./mobile/api/routes/socialScore')
const Reward = require('./mobile/api/routes/rewards')
const reportsUserRouter = require('./mobile/api/routes/reports')




var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
hbs.registerPartials(path.join(__dirname + '/views/partials'));
app.use('/upload', express.static('upload'));
app.use(flash());


// hbs.registerHelper('getuser_id',async function (users, user_Id) {
//   const user =  await usersdata.find(user => user._id === user_Id);
//   console.log("id=>>", user)
//   // return user ? user.name : ''; 
// });


app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    path: '/',
    httpOnly: false,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 //24 hour after end session
  }
}));

app.use(function (req, res, next) {
  res.locals.adminLogin = req.session.adminLogin;
  // console.log('adminaaaaaa', res.locals.adminLogin);
  next();
});


app.use('/userlist', userRouter);  // Must be before admin router so /userlist hits getuserData (with filter)
app.use('/', adminRouter);
app.use('/dashboard', dashboardRouter)
app.use('/adminprofile', adminprofileRouter);
app.use('/userprofile', userProfile);
app.use('/privacypolicy', privacypolicy);
app.use('/term_of_use', terms_of_use)
app.use('/community_guidlines', community_guidlines)
app.use('/communitylist', communitylist);
app.use('/communityprofile', communityprofileRouter);
app.use('/userpost', user_postRouter);

// app.use('/users', usersRouter);

// mobile
app.use(userRouter);
app.use('/section', communityRouter);
app.use('/post', postRouter);
app.use(searchRouter);
app.use('/homescreen', homeScreenRouter);
app.use(like_DislikeData);
app.use('/other', otherRouter);
app.use('/mediaroom', mediaroomRouter);
app.use('/settingscreen', settingRoutes)
app.use('/forTick', forTick)
app.use('/socialScore', socialScoreRouter)
app.use('/reward', Reward)
app.use('/reportsUser', reportsUserRouter)



// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

hbs.registerHelper('if_eq', function (status, value) {
  return status === value
})


// Register formatDate helper
hbs.registerHelper('formatDate', function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
});

// Agar aapko aur helpers chahiye toh yeh bhi add kar sakte hain
hbs.registerHelper('eq', function (a, b) {
    return a === b;
});

// Age category helper: returns 18+, 13-17, or Unverified based on dateOfBirth
hbs.registerHelper('getAgeCategory', function(dateOfBirth) {
    if (!dateOfBirth) return 'Unverified';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    if (age >= 18) return '18+';
    if (age >= 13 && age < 18) return '13-17';
    return 'Unverified';
});

hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
            return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
