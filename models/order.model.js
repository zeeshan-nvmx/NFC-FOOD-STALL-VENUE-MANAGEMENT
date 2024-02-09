// const mongoose = require('mongoose')

// const orderItemSchema = new mongoose.Schema(
//   {
//     menuItemId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'MenuItem',
//       required: true,
//     },
//     quantity: {
//       type: Number,
//       required: true,
//       min: 1,
//     },
//     price: {
//       type: Number,
//       required: true,
//     },
//   },
//   { _id: false }
// )

// const orderSchema = new mongoose.Schema(
//   {
//     customer: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Customer',
//       required: true,
//     },
//     stallId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Stall',
//       required: true,
//     },
//     orderItems: [orderItemSchema],
//     totalAmount: {
//       type: Number,
//       required: true,
//     },
//     vat: Number,
//     orderServedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     orderDate: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   { timestamps: true }
// )

// module.exports = mongoose.model('Order', orderSchema)

const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema(
  {
    foodName: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    stall: { type: mongoose.Schema.Types.ObjectId, ref: 'Stall', required: true },
    orderItems: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    vat: Number,
    orderServedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Order', orderSchema)
