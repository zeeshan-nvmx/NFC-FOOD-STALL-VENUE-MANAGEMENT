const axios = require('axios')
const Joi = require('joi')
const User = require('../models/auth.model')
const Stall = require('../models/stall.model')
const { createJWT } = require('../utils/jwt')
const { hashPassword, comparePassword } = require('../utils/password')

async function register(req, res) {

  const schema = Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().length(11).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().required(),
    motherStall: Joi.string(),
    stallId: Joi.string(),
    creatorsRole: Joi.string().required(),
  })

  try {

    await schema.validateAsync(req.body, { abortEarly: false })

    const { name, phone, password, role, motherStall, stallId, creatorsRole } = req.body
    
    const userExists = await User.findOne({ phone })
    
    if (userExists) {
      return res.status(400).json({ message: 'User with this phone already exists, please use a new phone number.' })
    }
    
    const allowedCreations = {
      masterAdmin: ['recharger', 'stallAdmin', 'rechargerAdmin'],
      rechargerAdmin: ['recharger'],
      stallAdmin: ['stallCashier'],
    }
    
    if (!allowedCreations[creatorsRole] || !allowedCreations[creatorsRole].includes(role)) {
      return res.status(400).json({ message: `You are not allowed to create a user with role: ${role}` })
    }
    
    if ((role === 'stallAdmin' || role === 'stallCashier') && (!stallId || !motherStall)) {
      return res.status(400).json({ message: 'stallId and motherStall are required for this role' })
    }
    
    const hashedPassword = await hashPassword(password)
    
    const user = new User({
      name,
      phone,
      role,
      password: hashedPassword,
      motherStall: role === 'stallAdmin' || role === 'stallCashier' ? motherStall : undefined,
      stallId: role === 'stallAdmin' || role === 'stallCashier' ? stallId : undefined,
    })
    
    const savedUser = await user.save()

    if (role === 'stallAdmin') {
      await Stall.findByIdAndUpdate(stallId, { $set: { stallAdmin: savedUser._id } })
    } else if (role === 'stallCashier') {
      await Stall.findByIdAndUpdate(stallId, { $push: { stallCashiers: savedUser._id } })
    }
    
    const token = await createJWT({ userId: savedUser._id, name: savedUser.name, phone: savedUser.phone, role: savedUser.role, stallId: savedUser.stallId, motherStall: savedUser.motherStall})

    return res.status(201).json({
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
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'User registration wasn\'t successful', error: error.message})
  }
}

async function login(req, res) {

  const schema = Joi.object({
    phone: Joi.string().length(11).required(),
    password: Joi.string().required()
  })

  try {

    await schema.validateAsync(req.body, { abortEarly: false })

    const { phone, password } = req.body
    
    const storedUser = await User.findOne({ phone })
    if (!storedUser) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }
    
    const isPasswordCorrect = await comparePassword(password, storedUser.password)
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }
    
    // const tokenUser = { userId: storedUser._id, name: storedUser.name, phone: storedUser.phone, role: storedUser.role }
  
    const token = await createJWT({ userId: storedUser._id, name: storedUser.name, phone: storedUser.phone, role: storedUser.role, stallId: storedUser.stallId, motherStall: storedUser.motherStall })
    
    return res.status(200).json({
      token,
      message: `User: ${storedUser.name} successfully logged in`,
      user: {
        id: storedUser._id,
        name: storedUser.name,
        phone: storedUser.phone,
        role: storedUser.role,
        motherStall: storedUser.motherStall,
        stallId: storedUser.stallId,
      },
    })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "user login unsuccessful", error: error.message })
  }
}

async function getAllUsers(req, res) {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 10
  const skip = (page - 1) * limit

  try {
    const users = await User.find().select('-password -otp -otpExpires').skip(skip).limit(limit)
    const total = await User.countDocuments({})
    return res.status(200).json({
      message: 'Users fetched successfully',
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Failed to retrieve users', error: error.message })
  }
}

async function logout(req, res) {
  return res.status(200).json({ message: 'Successfully logged out' })
}

async function requestPasswordReset(req, res) {

  const schema = Joi.object({

    phone: Joi.string().length(11).required()

  })

  try {

    await schema.validateAsync(req.body)
    const { phone } = req.body
    const user = await User.findOne({ phone })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    const otp = Math.floor(1000 + Math.random() * 9000)
    const otpExpires = new Date(Date.now() + 10 * 60000)
    await User.findOneAndUpdate({ phone }, { otp, otpExpires })
    const greenwebsms = new URLSearchParams()
    greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
    greenwebsms.append('to', phone)
    greenwebsms.append('message', `Your OTP for password reset is ${otp}`)
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)
    return res.status(200).json({ message: 'OTP sent to your phone' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'otp didn\'t match, or otp is invalid', error: error.message })
  }
}

async function validateOTPAndResetPassword(req, res) {

  const schema = Joi.object({
    phone: Joi.string().length(11).required(),
    otp: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),   
  })

  try {

    await schema.validateAsync(req.body, { abortEarly: false })

    const { phone, otp, newPassword } = req.body

    const user = await User.findOne({ phone, otp, otpExpires: { $gt: Date.now() } })
    if (!user) {
      return res.status(400).json({ message: 'Invalid OTP or user does not exist' })
    }
    const hashedPassword = await hashPassword(newPassword)
    await User.findOneAndUpdate({ phone }, { password: hashedPassword, otp: null, otpExpires: null })
    return res.status(200).json({ message: 'Password has been reset successfully' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'user password reset was unsuccessful', error: error.message })
  }
}

module.exports = { register, login, logout, requestPasswordReset, validateOTPAndResetPassword, getAllUsers }
