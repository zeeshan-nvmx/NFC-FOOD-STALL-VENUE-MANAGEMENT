const express = require('express')
const router = express.Router()
const stallController = require('../controllers/stall.controller')
const { authenticateUser, authorizeUser } = require('../utils/authorize-authenticate')

// Route to create a new stall
router.post('/stall', authenticateUser, authorizeUser('masterAdmin'), stallController.createStall)

router.get('/stall/menu', stallController.getStallMenu)
router.get('/stall/:stallId', authenticateUser, authorizeUser('masterAdmin', 'rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier'), stallController.getStall)
router.get('/stall', authenticateUser, authorizeUser('masterAdmin', 'rechargerAdmin', 'recharger'), stallController.getAllStalls)

// Route to edit an existing stall
router.put('/stall/:stallId', authenticateUser, authorizeUser('masterAdmin', 'stallAdmin'), stallController.editStall)

// Route to add a new menu item to a stall's menu
router.post('/stall/:stallId/menu', authenticateUser, authorizeUser('stallAdmin'), stallController.addMenuItem)

// Route to update an existing menu item within a stall's menu
router.put('/stall/:stallId/menu/:menuId', authenticateUser, authorizeUser('stallAdmin'), stallController.updateMenuItem)

// Route to remove a menu item from a stall's menu
router.delete('/stall/:stallId/menu/:menuId', authenticateUser, authorizeUser('stallAdmin'), stallController.removeMenuItem)

// Route to retrieve the menu for a specific stall
router.get('/stall/:stallId/menu', authenticateUser, authorizeUser('masterAdmin', 'rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier'), stallController.getMenu)

module.exports = router
