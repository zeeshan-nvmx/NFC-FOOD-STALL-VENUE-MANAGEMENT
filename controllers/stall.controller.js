const Stall = require('../models/stall.model')
const Order = require('../models/order.model')
const Joi = require('joi')
const mongoose = require('mongoose')

// Create a new stall
exports.createStall = async (req, res) => {

  const menuItemSchema = Joi.object({
    foodName: Joi.string().required(),
    foodPrice: Joi.number().required(),
    isAvailable: Joi.boolean().required(),
    currentStock: Joi.number().required()
  })

  
  const stallValidationSchema = Joi.object({
    motherStall: Joi.string().required(),
    stallAdmin: Joi.string().pattern(new RegExp('^[0-9a-fA-F]{24}$')),
    stallCashiers: Joi.array()
      .items(
        Joi.string().pattern(new RegExp('^[0-9a-fA-F]{24}$'))
      )
      .default([]),
    menu: Joi.array().items(menuItemSchema),
  })


  try {

    await stallValidationSchema.validateAsync(req.body, { abortEarly: false })
    const { motherStall, stallAdmin, stallCashiers, menu } = req.body

    const newStall = await Stall.create({ motherStall, stallAdmin, stallCashiers, menu })
    return res.status(201).json({ message: 'Stall created successfully', data: newStall })
  } catch (error) {
    console.log(error)
    return res.status(400).json({ message: 'Error creating stall', error: error.message })
  }
}

exports.getStallMenu = async (req, res) => {
  try {
    const stalls = await Stall.find({}, 'motherStall menu -_id').sort('motherStall')
    return res.status(200).json({ message: 'Mother stalls and menus retrieved successfully', data: stalls })
  } catch (error) {
    return res.status(400).json({ message: 'Error retrieving mother stalls and menus', error: error.message })
  }
}


exports.getAllStalls = async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set time to start of the day

    const stalls = await Stall.aggregate([
      {
        $sort: { motherStall: 1 },
      },
      {
        $lookup: {
          from: 'users', // Assuming the stallAdmin references a collection named "users"
          localField: 'stallAdmin',
          foreignField: '_id',
          as: 'stallAdminDetails',
        },
      },
      {
        $unwind: {
          path: '$stallAdminDetails',
          preserveNullAndEmptyArrays: true, // This change ensures that stalls without a stallAdmin are still included
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { stallId: '$_id', today: today },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$stallId', '$$stallId'] }, { $gte: ['$orderDate', '$$today'] }],
                },
              },
            },
            {
              $group: {
                _id: null,
                todayTotalOrderValue: { $sum: '$totalAmount' },
                todayOrderCount: { $sum: 1 },
              },
            },
          ],
          as: 'todayOrders',
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { stallId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$stallId', '$$stallId'],
                },
              },
            },
            {
              $group: {
                _id: null,
                lifetimeTotalOrderValue: { $sum: '$totalAmount' },
                lifetimeOrderCount: { $sum: 1 },
              },
            },
          ],
          as: 'lifetimeOrders',
        },
      },
      {
        $addFields: {
          todayTotalOrderValue: { $ifNull: [{ $arrayElemAt: ['$todayOrders.todayTotalOrderValue', 0] }, 0] },
          todayOrderCount: { $ifNull: [{ $arrayElemAt: ['$todayOrders.todayOrderCount', 0] }, 0] },
          lifetimeTotalOrderValue: { $ifNull: [{ $arrayElemAt: ['$lifetimeOrders.lifetimeTotalOrderValue', 0] }, 0] },
          lifetimeOrderCount: { $ifNull: [{ $arrayElemAt: ['$lifetimeOrders.lifetimeOrderCount', 0] }, 0] },
        },
      },
      {
        $project: {
          motherStall: 1,
          'stallAdminDetails._id': 1,
          'stallAdminDetails.name': 1,
          'stallAdminDetails.phone': 1,
          todayTotalOrderValue: 1,
          todayOrderCount: 1,
          lifetimeTotalOrderValue: 1,
          lifetimeOrderCount: 1,
        },
      },
    ])

    return res.status(200).json({ message: 'Stalls retrieved successfully', data: stalls })
  } catch (error) {
    return res.status(400).json({ message: 'Error retrieving stalls', error: error.message })
  }
}

// Edit a stall
exports.editStall = async (req, res) => {
  const { stallId } = req.params
  const updates = req.body
  try {
    const updatedStall = await Stall.findOneAndUpdate({ _id: stallId }, updates, { new: true })
    if (!updatedStall) {
      return res.status(404).json({ message: 'Stall not found' })
    }
    return res.status(200).json({ message: 'Stall updated successfully', data: updatedStall })
  } catch (error) {
    return res.status(400).json({ message: 'Error updating stall', error: error.message })
  }
}

// Delete a stall
exports.deleteStall = async (req, res) => {
  const { stallId } = req.params;

  try {
    const deletedStall = await Stall.findByIdAndDelete(stallId);

    if (!deletedStall) {
      return res.status(404).json({ message: 'Stall not found' });
    }

    return res.status(200).json({ message: 'Stall deleted successfully', deletedStall });
  } catch (error) {
    return res.status(400).json({ message: 'Error deleting stall', error: error.message });
  }
}

// Add a new menu item to a stall
exports.addMenuItem = async (req, res) => {
  const { stallId } = req.params
  const { foodName, foodPrice, isAvailable, currentStock } = req.body
  try {
    const updatedStall = await Stall.findOneAndUpdate({ _id: stallId }, { $push: { menu: { foodName, foodPrice, isAvailable, currentStock } } }, { new: true })
    return res.status(201).json({ message: 'Menu item added successfully', data: updatedStall })
  } catch (error) {
    return res.status(400).json({ message: 'Error adding menu item', error: error.message })
  }
}

// Update an existing menu item
exports.updateMenuItem = async (req, res) => {
  const { stallId, menuId } = req.params
  const { foodName, foodPrice, isAvailable, currentStock } = req.body

  try {
    const stall = await Stall.findById(stallId)
    const menuItem = stall.menu.id(menuId)
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' })
    }
    menuItem.foodName = foodName
    menuItem.foodPrice = foodPrice
    menuItem.isAvailable = isAvailable
    menuItem.currentStock = currentStock
    await stall.save()
    return res.status(200).json({ message: 'Menu item updated successfully', data: stall })
  } catch (error) {
    return res.status(400).json({ message: 'Error updating menu item', error: error.message })
  }
}

// Remove a menu item
exports.removeMenuItem = async (req, res) => {
  const { stallId, menuId } = req.params
  try {
    // Find the stall document
    const stall = await Stall.findById(stallId)

    // Check if the menu item exists
    if (!stall.menu.id(menuId)) {
      return res.status(404).json({ message: 'Menu item not found' })
    }

    // Filter out the menu item to be removed
    stall.menu = stall.menu.filter((item) => item.id !== menuId)

    await stall.save()

    return res.status(200).json({ message: 'Menu item removed successfully', data: stall })
  } catch (error) {
    return res.status(400).json({ message: 'Error removing menu item', error: error.message })
  }
}


// Retrieve the menu for a stall
exports.getMenu = async (req, res) => {
  const { stallId } = req.params
  try {
    const stall = await Stall.findById(stallId)
    return res.status(200).json({ message: 'Menu retrieved successfully', data: stall.menu })
  } catch (error) {
    return res.status(404).json({ message: 'Stall not found', error: error.message })
  }
}

exports.getStall = async (req, res) => {
  const { stallId } = req.params
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const aggregation = await Stall.aggregate([
      // Match the specific stall
      { $match: { _id: new mongoose.Types.ObjectId(stallId) } },

      // Lookup today's orders
      {
        $lookup: {
          from: 'orders',
          let: { stallId: '$_id', today: today },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$stallId', '$$stallId'] }, { $gte: ['$orderDate', '$$today'] }],
                },
              },
            },
            {
              $group: {
                _id: null,
                todayTotalOrderValue: { $sum: '$totalAmount' },
                todayOrderCount: { $sum: 1 },
              },
            },
          ],
          as: 'todayOrdersInfo',
        },
      },

      // Lookup lifetime orders
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'stallId',
          as: 'lifetimeOrdersInfo',
        },
      },
      {
        $unwind: { path: '$todayOrdersInfo', preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          todayTotalOrderValue: { $ifNull: ['$todayOrdersInfo.todayTotalOrderValue', 0] },
          todayOrderCount: { $ifNull: ['$todayOrdersInfo.todayOrderCount', 0] },
          lifetimeTotalOrderValue: { $sum: '$lifetimeOrdersInfo.totalAmount' },
          lifetimeOrderCount: { $size: '$lifetimeOrdersInfo' },
        },
      },
      {
        $project: {
          todayOrdersInfo: 0,
          lifetimeOrdersInfo: 0,
        },
      },
    ])

    if (aggregation.length === 0) {
      return res.status(404).json({ message: 'Stall not found' })
    }

    return res.status(200).json({
      message: 'Stall retrieved successfully',
      data: aggregation[0], // As aggregation returns an array
    })
  } catch (error) {
    return res.status(400).json({ message: 'Error retrieving stall', error: error.message })
  }
}




/*

// getAllStalls implemented with mongodb aggregation pipeline
exports.getAllStalls = async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set time to start of the day

    const stalls = await Stall.aggregate([
      {
        $sort: { motherStall: 1 },
      },
      {
        $lookup: {
          from: 'users', // Assuming the stallAdmin references a collection named "users"
          localField: 'stallAdmin',
          foreignField: '_id',
          as: 'stallAdminDetails',
        },
      },
      {
        $unwind: '$stallAdminDetails',
      },
      {
        $lookup: {
          from: 'orders',
          let: { stallId: '$_id', today: today },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$stallId', '$$stallId'] }, { $gte: ['$orderDate', '$$today'] }],
                },
              },
            },
            {
              $group: {
                _id: null,
                todayTotalOrderValue: { $sum: '$totalAmount' },
                todayOrderCount: { $sum: 1 },
              },
            },
          ],
          as: 'todayOrders',
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'stallId',
          pipeline: [
            {
              $group: {
                _id: null,
                lifetimeTotalOrderValue: { $sum: '$totalAmount' },
                lifetimeOrderCount: { $sum: 1 },
              },
            },
          ],
          as: 'lifetimeOrders',
        },
      },
      {
        $addFields: {
          todayTotalOrderValue: { $ifNull: [{ $arrayElemAt: ['$todayOrders.todayTotalOrderValue', 0] }, 0] },
          todayOrderCount: { $ifNull: [{ $arrayElemAt: ['$todayOrders.todayOrderCount', 0] }, 0] },
          lifetimeTotalOrderValue: { $ifNull: [{ $arrayElemAt: ['$lifetimeOrders.lifetimeTotalOrderValue', 0] }, 0] },
          lifetimeOrderCount: { $ifNull: [{ $arrayElemAt: ['$lifetimeOrders.lifetimeOrderCount', 0] }, 0] },
        },
      },
      {
        $project: {
          motherStall: 1,
          'stallAdminDetails._id': 1,
          'stallAdminDetails.name': 1,
          'stallAdminDetails.phone': 1,
          todayTotalOrderValue: 1,
          todayOrderCount: 1,
          lifetimeTotalOrderValue: 1,
          lifetimeOrderCount: 1,
        },
      },
    ])

    return res.status(200).json({ message: 'Stalls retrieved successfully', data: stalls })
  } catch (error) {
    return res.status(400).json({ message: 'Error retrieving stalls', error: error.message })
  }
}

*/