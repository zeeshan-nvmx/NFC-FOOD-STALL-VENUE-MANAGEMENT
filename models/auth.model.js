const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'please provide a name'],
  },
  phone: {
    type: String,
    required: [true, 'please provide a phone number'],
    unique: [true, 'phone number needs to be unique'],
    minlength: 11,
  },
  password: {
    type: String,
    required: [true, 'please provide a password'],
    minlength: 6,
  },
  motherStall: {
    type: String,
  },
  role: {
    type: String,
    enum: ['masterAdmin', 'rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier'],
    default: 'user',
  },
  otp: {
    type: Number,
    default: null,
  },
  otpExpires: {
    type: Date,
    default: null,
  },
})

module.exports = mongoose.model('User', UserSchema)
