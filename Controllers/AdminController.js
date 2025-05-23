const adminModel = require("../Models/AdminModel");
const bcrypt = require("bcryptjs");

//1. Creating Usser
const createAdmin = async (req, res) => {
    try {
        const {name, email, password} = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({status: 'fail', message: "All fields are required!"})
        }

        const existingUser = await adminModel.findOne({email})

        if (existingUser) {
            return res.status(400).json({status: 'fail', message: "User already exists!"})
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        if (!hashedPassword) {
            return res.status(400).json({status: 'fail', message: "Error hashing password!"})
        }

        const newUser = await adminModel.create({name, email, password: hashedPassword})

        return res.status(200).json({status: 'ok', message: 'User created Successfully', data: newUser})
    } catch (error) {
        return res.status(500).json({status: 'fail', message: "Server Error!"})
    }
}


//2. Login User
const loginAdmin = async (req, res) => {
    try {
        const {email, password} = req.body;

        const adminFound = await adminModel.findOne({email})

        if (!adminFound) {
            return res.status(400).json({status: 'fail', message: "User not found!"})
        }

        const isPasswordValid = await bcrypt.compare(password, adminFound.password)

        if (!isPasswordValid) {
            return res.status(400).json({status: 'fail', message: "Invalid password!"})
        }

        return res.status(200).json({status: 'ok', message: 'Login Successful', data: adminFound})

    } catch (error) {
        return res.status(500).json({status: 'fail', message: "Server Error!"})
    }
}

module.exports = {
    createAdmin,
    loginAdmin
}