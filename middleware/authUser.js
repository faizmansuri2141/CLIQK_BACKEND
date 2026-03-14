const jwt = require("jsonwebtoken");

var userData = require('../models/user');
require("dotenv").config();


const config = process.env;


const verifyToken = async (req, res, next) => {
  const token =
    req.body.token || req.query.token || req.header("Authorization");

  if (!token) {
    return res.status(401).send({ status: 0, message: "A token is required for authentication" })
  }
  try {
    const decoded = jwt.verify(token, config.TOKEN_KEY);
    console.log(decoded);
    const user = await userData.findOne({ _id: decoded.user_id })
    if (!user) {
      return res.send({ status: 0, message: "User not found" })
    }
    req.user = user

  } catch (err) {
    return res.status(401).send({ status: 0, message: "Invalid Token" })
  }
  return next();
};


module.exports = verifyToken;