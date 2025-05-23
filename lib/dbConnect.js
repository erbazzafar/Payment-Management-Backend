const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();
const dbURL = process.env.MONGO_DB_URL;

var dbConnect = mongoose.connect(dbURL, {
    autoIndex: true,
}).then(() => {
    console.log("Mongodb Connected!")
});

module.exports = dbConnect;

