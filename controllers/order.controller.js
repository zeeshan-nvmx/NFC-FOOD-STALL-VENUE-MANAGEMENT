const Order = require('../models/order.model')
const Customer = require('../models/customer.model')
const Joi = require('joi')


// Create a new order
exports.createOrder = async (req, res) => {

  const orderItemSchema = Joi.object({
    menuItemId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
    price: Joi.number().min(0).required(),
  })

  const orderSchema = Joi.object({
    customer: Joi.string().required(),
    stallId: Joi.string().required(),
    orderItems: Joi.array().items(orderItemSchema).required(),
    totalAmount: Joi.number().required(),
    vat: Joi.number().required(),
    orderServedBy: Joi.string().required(),
  })

  
  try {

    await orderSchema.validateAsync(req.body, { abortEarly: false })
    const { customer, stall, orderItems, totalAmount, vat, orderServedBy } = req.body

    const newOrder = await Order.create({
      customer,
      stall,
      orderItems,
      totalAmount,
      vat,
      orderServedBy,
    })
    res.status(201).json({ message: 'Order created successfully', order: newOrder })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Retrieve all orders for a specific stall with pagination
exports.getOrdersByStall = async (req, res) => {
  const { stallId } = req.params
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit

  try {
    const orders = await Order.find({ stallId }).skip(skip).limit(limit).sort('-orderDate')
    const total = await Order.countDocuments({ stallId })
    res.json({ orders, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Get a single order detail
// exports.getOrder = async (req, res) => {
//   const { orderId } = req.params
//   try {
//     const order = await Order.findById(orderId).populate('customer', '-rechargeHistory').populate('orderServedBy', 'name')
//     if (!order) {
//       return res.status(404).json({ message: 'Order not found' })
//     }
//     res.json(order)
//   } catch (error) {
//     res.status(400).json({ message: 'Error retrieving order', error: error.message })
//   }
// }

// Update an order

exports.getOrder = async (req, res) => {
  const { orderId } = req.params
  try {
    const order = await Order.findById(orderId).populate('orderServedBy', 'name')
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    // Retrieve the customer's _id and name directly
    const customer = await Customer.findById(order.customer).select('_id name')
    const response = order.toObject()
    // Include the customer's _id and name in the response
    response.customer = customer
    res.json(response)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}



exports.updateOrder = async (req, res) => {
  const { orderId } = req.params
  const updates = req.body

  try {
    const order = await Order.findByIdAndUpdate(orderId, updates, { new: true })
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    res.json({ message: 'Order updated successfully', order })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Delete an order
exports.deleteOrder = async (req, res) => {
  const { orderId } = req.params

  try {
    const order = await Order.findByIdAndDelete(orderId)
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    res.json({ message: 'Order deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getOrdersSummaryByStall = async (req, res) => {
  const { stallId } = req.params
  const page = parseInt(req.query.page) || 1 // Default to page 1 if not specified
  const limit = parseInt(req.query.limit) || 10 // Default limit to 10 items per page
  const skip = (page - 1) * limit

  try {
    const ordersSummary = await Order.aggregate([
      { $match: { stall: mongoose.Types.ObjectId(stallId) } },
      {
        $lookup: {
          from: 'users', // Assuming 'users' is the collection name for User model
          localField: 'orderServedBy',
          foreignField: '_id',
          as: 'orderServedByDetails',
        },
      },
      { $unwind: '$orderServedByDetails' },
      {
        $project: {
          _id: 0, // Exclude the _id field
          orderServedBy: '$orderServedByDetails.name',
          orderDate: 1,
          totalAmount: 1,
        },
      },
      { $sort: { orderDate: -1 } }, // Sort by orderDate in descending order
      { $skip: skip }, // Skip documents for pagination
      { $limit: limit }, // Limit the number of documents for pagination
    ])

    res.status(200).json({
      message: 'Orders summary retrieved successfully',
      data: ordersSummary,
      page,
      limit,
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}
