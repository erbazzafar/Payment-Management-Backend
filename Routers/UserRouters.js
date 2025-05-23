const express = require("express");
const { createUser, loginUser } = require("../Controllers/UserController");

const userRouter = express.Router();

userRouter.post('/create', createUser)
userRouter.post('/login', loginUser)

module.exports = userRouter;