const axios = require('axios')
const User = require('../models/auth.model')
const Stall = require('../models/stall.model')
const { createJWT } = require('../utils/jwt')
const { hashPassword, comparePassword } = require('../utils/password')
// const { validateRequestFields, generateDefaultErrorMessage } = require('../utils/validations')

async function register(req, res) {
  const { name, phone, password, role, motherStall, stallId, creatorsRole } = req.body

  // Check if the user exists
  const userExists = await User.findOne({ phone })
  if (userExists) {
    return res.status(400).json({ message: 'User with this phone already exists' })
  }

  // Role-based creation logic with mandatory stallId and motherStall for certain roles
  const allowedCreations = {
    masterAdmin: ['recharger', 'stallAdmin', 'rechargerAdmin'],
    rechargerAdmin: ['recharger'],
    stallAdmin: ['stallCashier'],
  }

  if (!allowedCreations[creatorsRole] || !allowedCreations[creatorsRole].includes(role)) {
    return res.status(400).json({ message: `You are not allowed to create a user with role: ${role}` })
  }

  // Ensure stallId and motherStall are provided for stallAdmin or stallCashier roles
  if ((role === 'stallAdmin' || role === 'stallCashier') && (!stallId || !motherStall)) {
    return res.status(400).json({ message: 'stallId and motherStall are required for this role' })
  }

  const hashedPassword = await hashPassword(password)
  // Create the user with motherStall and stallId if applicable
  const user = new User({
    name,
    phone,
    role,
    password: hashedPassword,
    motherStall: role === 'stallAdmin' || role === 'stallCashier' ? motherStall : undefined,
    stallId: role === 'stallAdmin' || role === 'stallCashier' ? stallId : undefined,
  })

  const savedUser = await user.save()

  // Add user to Stall model based on role
  if (role === 'stallAdmin') {
    await Stall.findByIdAndUpdate(stallId, { $set: { stallAdmin: savedUser._id } })
  } else if (role === 'stallCashier') {
    await Stall.findByIdAndUpdate(stallId, { $push: { stallCashiers: savedUser._id } })
  }

  const token = await createJWT({ userId: savedUser._id, role: savedUser.role })
  res.status(201).json({
    token,
    message: `New user successfully registered with role: ${role}`,
    user: {
      id: savedUser._id,
      name: savedUser.name,
      role: savedUser.role,
      motherStall: savedUser.motherStall,
      stallId: savedUser.stallId,
    },
  })
}


async function login(req, res) {
  // validateRequestFields(req.body, ['phone', 'password'])

  const { phone, password } = req.body
  const storedUser = await User.findOne({ phone })
  if (!storedUser) {
    return res.status(400).json({ message: 'Invalid credentials' })
  }

  const isPasswordCorrect = await comparePassword(password, storedUser.password)
  if (!isPasswordCorrect) {
    return res.status(400).json({ message: 'Invalid credentials' }) 
  }

  const tokenUser = { userId: storedUser._id, name: storedUser.name, phone: storedUser.phone, role: storedUser.role }
  const token = await createJWT(tokenUser)
  res.status(200).json({ token, msg: `User: ${storedUser.name} successfully logged in`, user: tokenUser })
}

async function logout(req, res) {
  res.status(200).json({ message: 'Successfully logged out' })
}

async function requestPasswordReset(req, res) {
  // validateRequestFields(req.body, ['phone'])

  

  const { phone } = req.body
  const user = await User.findOne({ phone })
  if (!user) {
    res.status(500).json({ msg: 'User not found' })
  }

  const otp = Math.floor(1000 + Math.random() * 9000) // 4 digit OTP
  const otpExpires = new Date(Date.now() + 10 * 60000)

  await User.findOneAndUpdate({ phone }, { otp, otpExpires })

  const greenwebsms = new URLSearchParams()
  greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
  greenwebsms.append('to', phone)
  greenwebsms.append('message', `Your OTP for FoodMaster password reset is ${otp}`)

  try {
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)
    res.status(200).json({ msg: 'OTP sent to your phone' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: 'Failed to send OTP' })
  }
}

async function validateOTPAndResetPassword(req, res) {
  // validateRequestFields(req.body, ['phone', 'otp', 'newPassword'])

  // const validationResult = validateOTPAndResetPasswordSchema.safeParse(req.body)

  const { phone, otp, newPassword } = req.body
  const user = await User.findOne({ phone, otp, otpExpires: { $gt: Date.now() } })
  if (!user) {
    res.status(500).json({ message: 'Invalid OTP or User doesnt exist' })
  }

  const hashedPassword = await hashPassword(newPassword)
  await User.findOneAndUpdate({ phone }, { password: hashedPassword, otp: null, otpExpires: null })

  res.status(200).json({ msg: 'Password has been reset successfully' })
}

module.exports = { register, login, logout, requestPasswordReset, validateOTPAndResetPassword }
