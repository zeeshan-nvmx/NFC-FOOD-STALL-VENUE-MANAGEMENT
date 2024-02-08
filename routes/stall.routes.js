const express = require('express')
const router = express.Router()
const stallController = require('../controllers/stall.controller')

// Route to create a new stall
router.post('/stall', stallController.createStall)

router.get('/stall', stallController.getAllStalls)
router.get('/stall/:stallId', stallController.getStall)

// Route to edit an existing stall
router.put('/stall/:stallId', stallController.editStall)

// Route to add a new menu item to a stall's menu
router.post('/stall/:stallId/menu', stallController.addMenuItem)

// Route to update an existing menu item within a stall's menu
router.put('/stall/:stallId/menu/:menuId', stallController.updateMenuItem)

// Route to remove a menu item from a stall's menu
router.delete('/stall/:stallId/menu/:menuId', stallController.removeMenuItem)

// Route to retrieve the menu for a specific stall
router.get('/stall/:stallId/menu', stallController.getMenu)

module.exports = router
