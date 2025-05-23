const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const dbConnect = require('./lib/dbConnect');
const userRouter = require('./Routers/UserRouters');
const adminRouter = require('./Routers/AdminRouters');
const paymentRouter = require('./Routers/PaymentRouter');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // 👈 this handles JSON request bodies
app.use(express.urlencoded({ extended: true })); // 👈 this handles URL-encoded request bodies

// Connect DB
dbConnect; // 👈 you need to call this function, not just reference it

// Routes
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use('/user', userRouter);
app.use('/admin', adminRouter)
app.use('/payment', paymentRouter)

// Start Server
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
