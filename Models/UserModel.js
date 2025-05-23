const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true,}, 
    email: { type: String, required: true, unique: true},
    password: {type: String, required: true},
    wallet: {type: Number, default: 0},
   createdAt: {
        type: Date,
        default: () => new Date(Date.now() + 5.5 * 60 * 60 * 1000), // Adjust to IST
      },
    updatedAt: {
        type: Date,
        default: () => new Date(Date.now() + 5.5 * 60 * 60 * 1000), // Adjust to IST
      },
},{
    timestamps: true,
})

const userModel = mongoose.model('User', userSchema);
module.exports = userModel;

