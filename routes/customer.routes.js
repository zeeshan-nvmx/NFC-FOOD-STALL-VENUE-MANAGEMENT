const express = require('express')
const router = express.Router()
const customerController = require('../controllers/customer.controller')
const { authenticateUser, authorizeUser } = require('../utils/authorize-authenticate')

router.post('/customers/create', authenticateUser, authorizeUser('rechargerAdmin', 'recharger'), customerController.createCustomer)
router.post('/customers/recharge', authenticateUser, authorizeUser('rechargerAdmin', 'recharger'), customerController.rechargeCard)
router.delete('/customers/delete/:customerId', authenticateUser, authorizeUser('rechargerAdmin', 'recharger'), customerController.deleteCustomer)
router.post('/customers/removeCard', authenticateUser, authorizeUser('rechargerAdmin', 'recharger'), customerController.removeCardUid)
// Route to get a single customer by card UID or phone number
router.get('/customers/getCustomer/:identifier', authenticateUser, authorizeUser('rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier'), customerController.getCustomerByCardUidOrPhone)

// Route to add a new card to an existing customer by phone number
router.post('/customers/addCard', authenticateUser, authorizeUser('rechargerAdmin', 'recharger'), customerController.addCardToCustomerByPhone)

router.get('/customers', authenticateUser, authorizeUser('rechargerAdmin', 'recharger', 'masterAdmin'), customerController.getAllCustomersWithDetails)
router.get('/customers/:phone', authenticateUser, authorizeUser('rechargerAdmin', 'recharger', 'masterAdmin'), customerController.getCustomerByPhoneNumber)

module.exports = router
