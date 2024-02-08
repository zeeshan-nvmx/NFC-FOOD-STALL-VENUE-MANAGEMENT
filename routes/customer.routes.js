const express = require('express')
const router = express.Router()
const customerController = require('../controllers/customer.controller')

router.post('/customers/create', customerController.createCustomer)
router.post('/customers/recharge', customerController.rechargeCard)
router.delete('/customers/delete/:customerId', customerController.deleteCustomer)
router.post('/customers/removeCard', customerController.removeCardUid)
// Route to get a single customer by card UID or phone number
router.get('/customers/getCustomer/:identifier', customerController.getCustomerByCardUidOrPhone)

// Route to add a new card to an existing customer by phone number
router.post('/customers/addCard', customerController.addCardToCustomerByPhone)

module.exports = router
