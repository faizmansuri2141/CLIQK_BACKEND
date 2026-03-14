const mongoose = require('mongoose');
// var colors = require('colors');

// user.token = token;
mongoose.connect("mongodb+srv://cliqkuser:cliqk156rvug@cliqk.52epdkk.mongodb.net/cliqk?retryWrites=true&w=majority&appName=CLIQK", {
    // useCreateIndex :true,
    useNewUrlParser: true,
    useUnifiedTopology: true

})
    .then(() => { console.log("connection success ") })
    .catch((err) => { console.log(`  NOT A CONNECT ${err}`) })