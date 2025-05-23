const mongoose = require('mongoose');

// Create a separate collection to track the last used transaction number
const CounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 1000 }
});


const Counter = mongoose.model('Counter', CounterSchema);

const transactionSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false},
    amount: {type: Number, required: true},
    accountHolder: {type: String, required: true},
    accountNumber: {type: String, required: false},    
    transactionType: {type: String, required: true},
    bankName: {type: String, required: false},
    upi: {type: String, required: false},
    ifsc: {type: String, required: false},
    status: {type: String, required: false, default: 'Pending'},
    remarks: {type: String, required: false},
    trnId: {type: String, required: false},
    paymentLogs: {
      type: [
        {
          status: {type: String},
          date: {type: Date, default: Date.now()},
          remarks: {type: String}
        }
      ],
      default: []
    },
    createdAt: {
        type: Date,
        default: () => new Date(Date.now() + 5.5 * 60 * 60 * 1000), // Adjust to IST
      },
    updatedAt: {
        type: Date,
        default: () => new Date(Date.now() + 5.5 * 60 * 60 * 1000), // Adjust to IST
      },
}, {
    timestamps: true,
})

transactionSchema.pre('save', async function (next) {
  const doc = this; 

  if  (doc.isNew) {
    const counter = await Counter.findOneAndUpdate(
      {_id: 'payment'},
      {$inc: {seq: 1}},
      {new: true, upsert: true}
    )

    const prefix = 'TRN';
    const paddedSeq = String(counter.seq).padStart(4, '0');
    doc.trnId = `${prefix}${paddedSeq}`
  }

  next();
})

const transactionModel = mongoose.model('Transaction', transactionSchema);
module.exports = transactionModel;