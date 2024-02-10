const express = require('express')
const router = express.Router()
const orderController = require('../controllers/order.controller')
const { authenticateUser, authorizeUser } = require('../utils/authorize-authenticate')

// Route to create a new order
router.post('/orders', authenticateUser, authorizeUser('stallAdmin', 'stallCashier'), orderController.createOrder)

// Route to retrieve all orders for a specific stall with pagination
router.get('/stalls/:stallId/orders', authenticateUser, authorizeUser('stallAdmin', 'stallCashier', 'masterAdmin'), orderController.getOrdersByStall)

// Route to get a single order detail
router.get('/orders/:orderId', authenticateUser, authorizeUser('stallAdmin', 'stallCashier', 'masterAdmin'), orderController.getOrder)

// Route to update an order
router.put('/orders/:orderId', authenticateUser, authorizeUser('stallAdmin', 'stallCashier'), orderController.updateOrder)

// Route to delete an order
router.delete('/orders/:orderId', authenticateUser, authorizeUser('stallAdmin', 'stallCashier'), orderController.deleteOrder)

// Route to get orders summary by stall with pagination
router.get('/stalls/:stallId/ordersSummary', authenticateUser, authorizeUser('stallAdmin', 'stallCashier', 'masterAdmin'), orderController.getOrdersSummaryByStall)

module.exports = router
