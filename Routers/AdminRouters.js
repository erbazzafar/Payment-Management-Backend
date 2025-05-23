const express = require("express");
const { createAdmin, loginAdmin } = require("../Controllers/AdminController");

const adminRouter = express.Router();

adminRouter.post('/create', createAdmin)
adminRouter.post('/login', loginAdmin)

module.exports = adminRouter;