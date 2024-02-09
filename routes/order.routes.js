const express = require('express')
const router = express.Router()
const orderController = require('../controllers/order.controller')

// Route to create a new order
router.post('/orders', orderController.createOrder)

// Route to retrieve all orders for a specific stall with pagination
router.get('/stalls/:stallId/orders', orderController.getOrdersByStall)

// Route to get a single order detail
router.get('/orders/:orderId', orderController.getOrder)

// Route to update an order
router.put('/orders/:orderId', orderController.updateOrder)

// Route to delete an order
router.delete('/orders/:orderId', orderController.deleteOrder)

// Route to get orders summary by stall with pagination
router.get('/stalls/:stallId/ordersSummary', orderController.getOrdersSummaryByStall)

module.exports = router
