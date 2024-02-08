const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth.controller')

router.post('/auth/register', authController.register)
router.post('/auth/login', authController.login)
router.post('/auth/request-password-reset', authController.requestPasswordReset)
router.post('/auth/validate-otp-and-reset-password', authController.validateOTPAndResetPassword)

module.exports = router
