const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


const { JWT_SECRET } = require("../Key/sec");

const adminSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match:
            /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
    },
    password: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        // required: true
    },
    token: {
        type: String,

    },

})
adminSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        console.log("normal password", this.password);
        this.password = await bcrypt.hash(this.password, 10);
        console.log("hash Pass Pass", this.password);
        next();
    }
});

adminSchema.methods.authToken = async function () {
    try {
        var adminSchema = this;

        console.log(adminSchema._id);
        var token = await jwt.sign({ _id: adminSchema._id }, JWT_SECRET, {
            expiresIn: "24h",
        });

        adminSchema.tokens = token;

        console.log(token);

        await adminSchema.save();

        return token;
    } catch (error) {
        console.log("auth token error", error);
    }
};

const adminData = mongoose.model("adminData", adminSchema);
module.exports = adminData; 