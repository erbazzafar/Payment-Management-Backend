const express = require('express')
const { createPayment, getAllPayments, getUserPayments, updatePayment, getPaymentSummary, getUserSummary, getUserFilteredPayments, getUserFilterPayments } = require('../Controllers/PaymentController')

const paymentRouter = express.Router()

paymentRouter.post('/create', createPayment)
paymentRouter.get('/getAll', getAllPayments)
paymentRouter.get('/get/:id', getUserPayments)
paymentRouter.put('/update/:id', updatePayment)
paymentRouter.get('/summary', getPaymentSummary)
paymentRouter.get('/userSummary/:id', getUserSummary)


module.exports = paymentRouter