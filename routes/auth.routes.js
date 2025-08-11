const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth.controller')
const { authenticateUser, authorizeUser } = require('../utils/authorize-authenticate')

router.post('/auth/register', authController.register)
router.post('/auth/login', authController.login)
router.get('/auth/users', authenticateUser, authorizeUser('masterAdmin'), authController.getAllUsers)
router.post('/auth/request-password-reset', authController.requestPasswordReset)
router.post('/auth/validate-otp-and-reset-password', authController.validateOTPAndResetPassword)

module.exports = router
