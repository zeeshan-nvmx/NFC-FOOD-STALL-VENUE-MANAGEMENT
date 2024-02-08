const mongoose = require('mongoose')

const rechargeHistorySchema = new mongoose.Schema(
  {
    rechargerName: String,
    rechargerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    date: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
)

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    phone: { type: String, required: true, unique: true },
    cardUid: { type: String, required: true, unique: true },
    moneyLeft: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rechargeHistory: [rechargeHistorySchema],
  },
  { timestamps: true }
)

module.exports = mongoose.model('Customer', customerSchema)
