const { default: mongoose } = require("mongoose");
const transactionModel = require("../Models/TransactionModel");
const userModel = require("../Models/UserModel");
const axios = require('axios')
const base64 = require('base-64')

//ifsc validation
const ifscValidation = async (req, res) => {
    try {
        const ifsc = req.query.ifsc

        if (!ifsc) {
            return res.status(400).json({ message: 'IFSC code is required' });
        }

        const validation = await axios.get(`https://ifsc.razorpay.com/${ifsc}`);

        if (validation.data) {
            console.log('IFSC Validation Successful');
            return res.status(200).json({
                status: 'ok',
                message: 'IFSC code is valid',
                data: validation.data.BRANCH,
            });
        }

        return res.status(400).json({ message: 'Invalid IFSC code' });
    } catch (error) {
        if (error.response && error.response.status === 404) {
            // Razorpay returns 404 if IFSC is not found
            return res.status(404).json({ status: 'fail', message: 'Invalid IFSC code' });
        }

        console.error('IFSC validation error:', error);
        return res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

//account number validation
const accountNumberValidation = async (req, res) => {
    try {
        const { accountNumber, ifsc } = req.body
        if (!accountNumber) {
            return res.status(400).json({
                status: 'fail',
                message: 'Account number and IFSC is required'
            })
        }

        const key_id = process.env.RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;

        const auth = 'Basic ' + base64.encode(`${key_id}:${key_secret}`);

        const response = await axios.post(
            'https://api.razorpay.com/v1/fund_accounts/validations',
            {
                account_number: accountNumber,
                ifsc,
                fund_account: {
                    account_type: "bank_account",
                    bank_account: {
                        name: "Test User",
                        ifsc,
                        account_number: accountNumber
                    },
                    contact: {
                        name: "Test",
                        type: "vendor",
                        email: "test@example.com",
                        contact: "9123456789"
                    }
                }
            },
            {
                headers: {
                    Authorization: auth,
                    "Content-Type": 'application/json'
                }
            }
        )

        console.log("-------------------------------------")

        console.log("account validation response ==> ", response)

        if (response.data && response.data.status === "success ") {
            return res.status(200).json({
                status: 'ok',
                message: 'account validation successfull',
                data: response.data
            })
        }

        return res.status(400).json({
            status: 'fail',
            message: 'Account validation failed',
            data: response
        })

    } catch (error) {
        console.error("Account Validation Error:", error.response?.data || error.message);
        return res.status(500).json({
            status: 'fail',
            message: 'Server Error',
            error: error.response?.data || error.message
        });
    }
}


//1. Create Payment
const createPayment = async (req, res) => {
    try {
        const { userId, amount, accountHolder, transactionType, status, ifsc } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Image is required' });
        }

        if (!userId || !amount || !accountHolder || !transactionType || !status) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // if (transactionType === "bank") {
        //     //Nested try-catch to handle IFSC validation error specifically
        //     try {
        //         const validation = await axios.get(`https://ifsc.razorpay.com/${ifsc}`);
        //         console.log('IFSC Validation Successful:', validation.data);
        //     } catch (ifscError) {
        //         console.error('IFSC Validation Failed:', ifscError.response?.data || ifscError.message);
        //         return res.status(400).json({ message: 'Invalid IFSC code' });
        //     }
        // }

        const image = req.file ? req.file.path : null;

        const newPayment = await transactionModel.create({
            ...req.body,
            image
        });

        console.log('New payment created:', newPayment);

        return res.status(200).json({
            status: 'ok',
            message: 'Payment Created Successfully',
            data: newPayment
        });

    } catch (error) {
        console.error('Payment creation error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

//2. Get all payments
const getAllPayments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Build query object
        const query = {};

        if (req.query.status) {
            query.status = req.query.status;
        }

        // Apply date range filter if provided
        if (req.query.startDate || req.query.endDate) {
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(req.query.endDate);

            // Make endDate inclusive of the full day
            endDate.setUTCHours(23, 59, 59, 999);

            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        const totalPayments = await transactionModel.countDocuments(query);

        const allPayments = await transactionModel
            .find(query)
            .populate('userId')
            .sort({ createdAt: -1 }) // Sort by newest
            .skip(skip)
            .limit(limit);

        if (!allPayments || allPayments.length === 0) {
            return res.status(400).json({ status: 'fail', message: 'No payment(s) found !!' });
        }

        return res.status(200).json({
            status: 'ok',
            message: 'All payments are fetched successfully!',
            data: allPayments,
            pagination: {
                total: totalPayments,
                page,
                limit,
                pages: Math.ceil(totalPayments / limit),
            },
        });

    } catch (error) {
        console.error('getAllPayments error:', error);
        return res.status(500).json({ status: 'fail', message: 'Server Error!' });
    }
};

//3. get user payments
const getUserPayments = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        if (!id) {
            return res.status(400).json({ status: 'fail', message: 'Id is not present' });
        }

        const findUser = await userModel.findById(id);
        if (!findUser) {
            return res.status(401).json({ status: 'fail', message: 'User not found!' });
        }

        // Construct the query object
        const query = { userId: id };

        if (req.query.status) {
            query.status = req.query.status;
        }

        // Optional: Filter by createdAt (date range)
        if (req.query.startDate || req.query.endDate) {
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(req.query.endDate);

            // Ensure endDate includes the full day
            endDate.setUTCHours(23, 59, 59, 999);

            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        const totalPayments = await transactionModel.countDocuments(query);

        const userPayments = await transactionModel
            .find(query)
            .sort({ createdAt: -1 }) // Sort by latest
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            status: 'ok',
            message: 'Payments fetched successfully',
            data: userPayments,
            pagination: {
                total: totalPayments,
                page,
                limit,
                pages: Math.ceil(totalPayments / limit),
            },
        });

    } catch (error) {
        console.error('getUserPayments error:', error);
        res.status(500).json({ status: 'fail', message: 'Server Error!!' });
    }
};

//4. Summary
const summarizePayments = async (req, res) => {
    try {
        const { id } = req.params;
        const userObjectId = new mongoose.Types.ObjectId(id);

        const findUser = await userModel.findById(userObjectId);
        if (!findUser) {
            return res.status(400).json({ status: 'fail', message: 'User not found' });
        }

        // Aggregate to calculate summary values
        const summary = await transactionModel.aggregate([
            { $match: { userId: userObjectId } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: { $toDouble: "$amount" } },
                    pendingAmount: {
                        $sum: {
                            $cond: [{ $eq: [{ $toLower: "$status" }, "pending"] }, { $toDouble: "$amount" }, 0]
                        }
                    },
                    declinedAmount: {
                        $sum: {
                            $cond: [{ $eq: [{ $toLower: "$status" }, "declined"] }, { $toDouble: "$amount" }, 0]
                        }
                    },
                    approvedAmount: {
                        $sum: {
                            $cond: [{ $eq: [{ $toLower: "$status" }, "approved"] }, { $toDouble: "$amount" }, 0]
                        }
                    }
                }
            }
        ]);

        const {
            totalAmount = 0,
            pendingAmount = 0,
            declinedAmount = 0,
            approvedAmount = 0
        } = summary[0] || {};

        // Update user's wallet
        findUser.wallet = approvedAmount;
        await findUser.save();

        // Get all transactions
        const userTransactions = await transactionModel.find({ userId: userObjectId });

        // Update each transaction with calculated fields
        const updatedTransactions = await Promise.all(
            userTransactions.map(async (txn) => {
                txn.approvedAmount = approvedAmount;
                txn.pendingAmount = pendingAmount;
                txn.declinedAmount = declinedAmount;
                txn.totalAmount = totalAmount;

                // Optional: Update transaction in DB (if you want it saved permanently)
                await txn.save();

                return txn;
            })
        );

        return res.status(200).json({
            status: 'ok',
            message: 'User payments fetched successfully!',
            data: updatedTransactions
        });

    } catch (error) {
        console.error("get user payments error", error);
        return res.status(500).json({ status: 'fail', message: 'Server Error!' });
    }
};

//5. Update transaction
const updatePayment = async (req, res) => {
    try {
        const id = req.params.id;
        const newStatus = req.body.status;
        const remarks = req.body.remarks;

        if (!id) {
            return res.status(402).json({ status: 'fail', message: 'Id is Missing' });
        }

        const transactionData = await transactionModel.findById(id);
        if (!transactionData) {
            return res.status(403).json({ status: 'fail', message: 'Transaction not found' });
        }

        const userData = await userModel.findById(transactionData.userId);
        if (!userData) {
            return res.status(401).json({ status: 'fail', message: 'User not found' });
        }

        //status approved
        if (newStatus === "Approved" && transactionData.status !== "Approved") {
            transactionData.status = newStatus;
            userData.wallet += Number(transactionData.amount);
        }

        //status declines after approved
        if (transactionData.status !== "Decline" && newStatus === "Decline") {

            console.log("-------------------------");

            transactionData.status = newStatus;
            userData.wallet -= Number(transactionData.amount);
        }

        await transactionData.save();
        await userData.save();

        // Push to paymentLogs
        await transactionModel.findByIdAndUpdate(id, {
            $push: {
                paymentLogs: {
                    status: newStatus,
                    date: new Date(),
                    remarks,
                },
            },
        });

        console.log(" Payment log updated.");

        return res.status(200).json({
            status: 'ok',
            message: 'Transaction status updated successfully',
            data: transactionData,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

//6. Payment Summary 
const getPaymentSummary = async (req, res) => {
    try {
        const summary = await transactionModel.aggregate([
            {
                $facet: {
                    pending: [
                        { $match: { status: 'Pending' } },
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    approved: [
                        { $match: { status: 'Approved' } },
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    declined: [
                        { $match: { status: 'Decline' } },
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    total: [
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" },
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    pendingAmount: { $ifNull: [{ $arrayElemAt: ["$pending.amount", 0] }, 0] },
                    pendingCount: { $ifNull: [{ $arrayElemAt: ["$pending.count", 0] }, 0] },
                    approvedAmount: { $ifNull: [{ $arrayElemAt: ["$approved.amount", 0] }, 0] },
                    approvedCount: { $ifNull: [{ $arrayElemAt: ["$approved.count", 0] }, 0] },
                    declinedAmount: { $ifNull: [{ $arrayElemAt: ["$declined.amount", 0] }, 0] },
                    declinedCount: { $ifNull: [{ $arrayElemAt: ["$declined.count", 0] }, 0] },
                    totalAmount: { $ifNull: [{ $arrayElemAt: ["$total.amount", 0] }, 0] },
                    totalCount: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
                }
            }
        ]);

        res.status(200).json(summary[0]); // Only one object is returned
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch payment summary' });
    }
};

//7. User summary
const getUserSummary = async (req, res) => {
    const userId = req.params.id;

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    try {
        const summary = await transactionModel.aggregate([
            {
                // Filter by userId
                $match: {
                    userId: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $facet: {
                    pending: [
                        { $match: { status: 'Pending' } },
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    approved: [
                        { $match: { status: 'Approved' } },
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    declined: [
                        { $match: { status: 'Decline' } },
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    total: [
                        {
                            $group: {
                                _id: null,
                                amount: { $sum: "$amount" },
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    pendingAmount: { $ifNull: [{ $arrayElemAt: ["$pending.amount", 0] }, 0] },
                    pendingCount: { $ifNull: [{ $arrayElemAt: ["$pending.count", 0] }, 0] },
                    approvedAmount: { $ifNull: [{ $arrayElemAt: ["$approved.amount", 0] }, 0] },
                    approvedCount: { $ifNull: [{ $arrayElemAt: ["$approved.count", 0] }, 0] },
                    declinedAmount: { $ifNull: [{ $arrayElemAt: ["$declined.amount", 0] }, 0] },
                    declinedCount: { $ifNull: [{ $arrayElemAt: ["$declined.count", 0] }, 0] },
                    totalAmount: { $ifNull: [{ $arrayElemAt: ["$total.amount", 0] }, 0] },
                    totalCount: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] }
                }
            }
        ]);

        res.status(200).json(summary[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch payment summary' });
    }
};

module.exports = {
    ifscValidation,
    createPayment,
    getAllPayments,
    getUserPayments,
    updatePayment,
    getPaymentSummary,
    getUserSummary,
    accountNumberValidation
}