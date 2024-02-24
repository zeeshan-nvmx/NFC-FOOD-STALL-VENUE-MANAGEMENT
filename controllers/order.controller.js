const Order = require('../models/order.model')
const Customer = require('../models/customer.model')
const User = require('../models/auth.model')
const Stall = require('../models/stall.model')
const mongoose = require('mongoose')
const axios = require('axios')
const Joi = require('joi')


// exports.getOrdersByStall = async (req, res) => {
//   const { stallId } = req.params
//   const page = parseInt(req.query.page) || 1
//   const limit = parseInt(req.query.limit) || 10
//   const skip = (page - 1) * limit

//   try {
//     const orders = await Order.find({ stallId })
//       .populate({
//         path: 'customer',
//         select: 'name phone', // Only fetch the name and phone fields from the Customer document
//       })
//       .skip(skip)
//       .limit(limit)
//       .sort('-orderDate')
//       .exec() // Executing the query

//     const total = await Order.countDocuments({ stallId })

//     return res.json({
//       orders,
//       total,
//       page,
//       pages: Math.ceil(total / limit),
//     })
//   } catch (error) {
//     return res.status(400).json({ message: 'error fetching orders', error: error.message })
//   }
// }

exports.getOrdersByStall = async (req, res) => {
  const { stallId } = req.params
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit
  const { startDate, endDate } = req.query

  // Build the query condition based on startDate and endDate
  let queryCondition = { stallId }
  if (startDate && endDate) {
    queryCondition.orderDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    }
  } else if (startDate) {
    queryCondition.orderDate = {
      $gte: new Date(startDate),
    }
  } else if (endDate) {
    queryCondition.orderDate = {
      $lte: new Date(endDate),
    }
  }

  try {
    const orders = await Order.find(queryCondition)
      .populate({
        path: 'customer',
        select: 'name phone', // Only fetch the name and phone fields from the Customer document
      })
      .skip(skip)
      .limit(limit)
      .sort('-orderDate')
      .exec() // Executing the query

    const total = await Order.countDocuments(queryCondition)

    return res.status(200).json({
      message: 'Orders fetched successfully', data: { orders, total, page, pages: Math.ceil(total / limit) }
    })
  } catch (error) {
    return res.status(400).json({ message: 'error fetching orders', error: error.message })
  }
}


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
    return res.status(200).json({ message: "Order fetched successfully", data: response })
  } catch (error) {
    return res.status(400).json({ message: 'error fetching order', error: error.message })
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
    return res.status(201).json({ message: 'Order updated successfully', order })
  } catch (error) {
    return res.status(400).json({ message: 'error updating order', error: error.message })
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
    return res.status(200).json({ message: 'Order deleted successfully' })
  } catch (error) {
    return res.status(500).json({ message: 'error deleting order', error: error.message })
  }
}

exports.getOrdersSummaryByStall = async (req, res) => {
  const { stallId } = req.params
  const page = parseInt(req.query.page) || 1 // Default to page 1 if not specified
  const limit = parseInt(req.query.limit) || 10 // Default limit to 10 items per page
  const skip = (page - 1) * limit

  try {
    const ordersSummary = await Order.aggregate([
      { $match: { stallId : stallId } },
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

    return res.status(200).json({
      message: 'Orders summary retrieved successfully',
      data: ordersSummary,
      page,
      limit,
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}

exports.createOrder = async (req, res) => {
  const orderItemSchema = Joi.object({
    foodName: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
    foodPrice: Joi.number().min(0).required(),
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
    const { customer, stallId, orderItems, totalAmount, vat, orderServedBy } = req.body

    const servedByUser = await User.findById(orderServedBy)
    if (!servedByUser) {
      return res.status(404).json({ message: 'ServedBy user not found' })
    }

    const customerDetails = await Customer.findById(customer)
    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    const stallDetails = await Stall.findById(stallId)
    if (!stallDetails) {
      return res.status(404).json({ message: 'Stall not found' })
    }

    // Check for sufficient stock
    orderItems.forEach((orderItem) => {
      const menuItem = stallDetails.menu.find((item) => item.foodName === orderItem.foodName)
      if (!menuItem || menuItem.currentStock < orderItem.quantity) {
        return res.status(400).json({ message: `Insufficient stock of ${orderItem.foodName}` })
      }
    })

    const finalPriceWithVAT = totalAmount // Assuming VAT is already included in totalAmount
    if (customerDetails.moneyLeft < finalPriceWithVAT) {
      return res.status(400).json({ message: 'Insufficient funds in customers NFC card' })
    }

    // Deduct stock
    orderItems.forEach((orderItem) => {
      const menuItem = stallDetails.menu.find((item) => item.foodName === orderItem.foodName)
      menuItem.currentStock -= orderItem.quantity
    })

    await stallDetails.save()

    // Deduct the final total amount from the customer's balance
    customerDetails.moneyLeft -= finalPriceWithVAT
    const updatedCustomer = await customerDetails.save()

    const newOrder = await Order.create({
      customer,
      stallId,
      orderItems,
      totalAmount,
      vat,
      orderServedBy,
    })

    const itemsDescription = orderItems.map((item) => `${item.quantity} x ${item.foodName}`).join(', ')
    const message = `Order confirmed. Amount: ${finalPriceWithVAT}, Items: ${itemsDescription}, Balance before order: ${customerDetails.moneyLeft}, Current Balance: ${updatedCustomer.moneyLeft}, Served by: ${servedByUser.name}.`

    const greenwebsms = new URLSearchParams()
    greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
    greenwebsms.append('to', customerDetails.phone)
    greenwebsms.append('message', message)
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

    return res.status(201).json({ message: 'Order was created successfully, SMS sent, and customer balance was updated', order: newOrder })
  } catch (error) {
    console.error(error)
    return res.status(400).json({ message: "There was an error while creating the order, please try again", error: error.message })
  }
}





// exports.createOrder = async (req, res) => {
//   const orderItemSchema = Joi.object({
//     foodName: Joi.string().required(),
//     quantity: Joi.number().integer().min(1).required(),
//     foodPrice: Joi.number().min(0).required(),
//   })

//   const orderSchema = Joi.object({
//     customer: Joi.string().required(),
//     stallId: Joi.string().required(),
//     orderItems: Joi.array().items(orderItemSchema).required(),
//     totalAmount: Joi.number().required(),
//     vat: Joi.number().required(),
//     orderServedBy: Joi.string().required(),
//   })

//   try {
//     await orderSchema.validateAsync(req.body, { abortEarly: false })
//     const { customer, stallId, orderItems, totalAmount, vat, orderServedBy } = req.body

//     const servedByUser = await User.findById(orderServedBy)
//     if (!servedByUser) {
//       return res.status(404).json({ message: 'ServedBy user not found' })
//     }

//     const customerDetails = await Customer.findById(customer)
//     if (!customerDetails) {
//       return res.status(404).json({ message: 'Customer not found' })
//     }

//     const stallDetails = await Stall.findById(stallId)
//     if (!stallDetails) {
//       return res.status(404).json({ message: 'Stall not found' })
//     }

//     // Deduct stock from the stall's menu items
//     orderItems.forEach((orderItem) => {
//       const menuItem = stallDetails.menu.find((item) => item.foodName === orderItem.foodName)
//       if (menuItem && menuItem.currentStock >= orderItem.quantity) {
//         menuItem.currentStock -= orderItem.quantity
//       } else {
//         throw new Error(`Insufficient stock for ${orderItem.foodName}`)
//       }
//     })

//     await stallDetails.save()

//     const prevBalance = customerDetails.moneyLeft

//     // Deduct the final total amount from the customer's balance
//     const finalPriceWithVAT = totalAmount /* + vat */
//     if (customerDetails.moneyLeft < finalPriceWithVAT) {
//       return res.status(400).json({ message: 'Insufficient funds in customer account' })
//     }

//     customerDetails.moneyLeft -= finalPriceWithVAT // Deduct the total cost from the customer's balance
//     const updatedCustomer = await customerDetails.save() // Save the updated customer details

//     const newOrder = await Order.create({
//       customer,
//       stallId,
//       orderItems,
//       totalAmount,
//       vat,
//       orderServedBy,
//     })

//     const itemsDescription = orderItems.map((item) => `${item.quantity} x ${item.foodName}`).join(', ')
//     const message = `Order confirmed. Amount: ${finalPriceWithVAT}, Items: ${itemsDescription}, Balance before order: ${prevBalance}, Current Balance: ${updatedCustomer.moneyLeft} Served by: ${servedByUser.name}.`

//     const greenwebsms = new URLSearchParams()
//     greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
//     greenwebsms.append('to', customerDetails.phone)
//     greenwebsms.append('message', message)
//     await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

//     return res.status(201).json({ message: 'Order created successfully, SMS sent, and customer balance updated', order: newOrder })
//   } catch (error) {
//     console.error(error)
//     return res.status(400).json({ message: error.message })
//   }
// }