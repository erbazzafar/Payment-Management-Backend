const express = require('express')
const upload = require('../Multer/Multer')

const { createPayment, getAllPayments, getUserPayments, updatePayment, getPaymentSummary, getUserSummary, ifscValidation } = require('../Controllers/PaymentController')

const paymentRouter = express.Router()

paymentRouter.get('/validate', ifscValidation)
paymentRouter.post('/create', upload.single('image'), createPayment)
paymentRouter.get('/getAll', getAllPayments)
paymentRouter.get('/get/:id', getUserPayments)
paymentRouter.put('/update/:id', updatePayment)
paymentRouter.get('/summary', getPaymentSummary)
paymentRouter.get('/userSummary/:id', getUserSummary)


module.exports = paymentRouter