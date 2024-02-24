const Customer = require('../models/customer.model')
const User = require('../models/auth.model')
const axios = require('axios')
const Joi = require('joi')

// Create a new customer with a card UID
exports.createCustomer = async (req, res) => {

  const schema = Joi.object({
    name: Joi.string(),
    phone: Joi.string().length(11).required(),
    cardUid: Joi.string().required(), 
    createdBy: Joi.string().required(),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    
    const { name, phone, cardUid, createdBy } = req.body
    // Ensure createdBy (recharger or recharger admin) exists and has the right role
    const creator = await User.findById(createdBy)
    if (!creator || (creator.role !== 'recharger' && creator.role !== 'rechargerAdmin')) {
      return res.status(403).json({ message: 'Unauthorized to create customers' })
    }
    const newCustomer = await Customer.create({ name, phone, cardUid, createdBy })

    const message = `Hello, ${newCustomer.name}. Your customer account has been successfully created and you have a current balance of ${newCustomer.moneyLeft} taka`
    const greenwebsms = new URLSearchParams()
    greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
    greenwebsms.append('to', newCustomer.phone)
    greenwebsms.append('message', message)
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

    return res.status(201).json({ message: 'Customer created successfully', data: newCustomer })
  } catch (error) {
    return res.status(400).json({ message: "There was an error while creating the customer, please try again", error: error.message })
  }
}

exports.getAllCustomersWithDetails = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 10
  const skip = (page - 1) * limit

  try {
    const customers = await Customer.find({}, 'name phone moneyLeft createdBy').populate({ path: 'createdBy', select: 'name' }).skip(skip).limit(limit)

    const total = await Customer.countDocuments({})
    return res.status(200).json({
      message: 'Customers fetched successfully',
      data: customers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}

exports.getCustomerByPhoneNumber = async (req, res) => {
  const { phone } = req.params

  try {
    const customer = await Customer.findOne({ phone }).populate({ path: 'createdBy', select: 'name' }) // Assuming you want to populate this as well

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    return res.status(200).json({ message: 'Customer retrieved successfully', data: customer })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// Recharge a card
exports.rechargeCard = async (req, res) => {

  const schema = Joi.object({
    cardUid: Joi.string().required(),
    amount: Joi.number().min(0),
    rechargerId: Joi.string().required(),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    const money = req.body.amount
    const convertedMoney = Number(money)
    const { cardUid, rechargerId } = req.body
    const customer = await Customer.findOne({ cardUid })
    if (!customer) {
      return res.status(404).json({ message: 'This card doesnt belong to a customer' })
    }

    const prevMoneyLeft = customer.moneyLeft

    // Prevent negative moneyLeft
    const updatedMoneyLeft = Math.max(0, customer.moneyLeft + convertedMoney)
    const rechargerName = (await User.findById(rechargerId)).name

    // Update customer
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customer._id,
      {
        $set: { moneyLeft: updatedMoneyLeft },
        $push: { rechargeHistory: { rechargerName, rechargerId, amount: convertedMoney, balanceBeforeRecharge: prevMoneyLeft, date: new Date() } },
      },
      { new: true }
    )

    const message = `Your card recharge was successful, you had a balance of ${prevMoneyLeft} taka previously. Your new balance is ${updatedCustomer.moneyLeft} taka`

    const greenwebsms = new URLSearchParams()
    greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
    greenwebsms.append('to', updatedCustomer.phone)
    greenwebsms.append('message', message)
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

    return res.json({ message: 'customer created successfully', data: updatedCustomer })
  } catch (error) {
    return res.status(500).json({ message: 'customer created successfully', error: error.message })
  }
}

// Delete a customer
exports.deleteCustomer = async (req, res) => {
  try {
    const { customerId } = req.params
    await Customer.findByIdAndDelete(customerId)
    return res.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    return res.status(500).json({ message: 'There was an error deleting this customer successfully', error: error.message })
  }
}

// Remove a card UID from a customer
exports.removeCardUid = async (req, res) => {
  try {
    const { cardUid } = req.body
    const updatedCustomer = await Customer.findOneAndUpdate(
      { cardUid },
      {
        $unset: { cardUid: '' },
        $set: { moneyLeft: 0 },
      },
      { new: true }
    )

    if (!updatedCustomer) {
      return res.status(404).json({ message: 'This card doesnt belong to a customer' })
    }

    return res.json({ message: 'customer Card removed successfully', data: updatedCustomer })
  } catch (error) {
    return res.status(500).json({ message: 'There was an error while removing the card, please try again', error: error.message })
  }
}

// Get a single customer by card UID or phone number
exports.getCustomerByCardUidOrPhone = async (req, res) => {
    const { identifier } = req.params; // `identifier` can be either card UID or phone number
    try {
        const customer = await Customer.findOne({
            $or: [{ cardUid: identifier }, { phone: identifier }]
        });
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        return res.json({ message: 'customer fetched successfully', data: customer })
    } catch (error) {
        return res.status(500).json({ message: 'Couldnt find customer with this phone or card', error: error.message })
    }
}

exports.addCardToCustomerByPhone = async (req, res) => {
  const { phone, newCardUid } = req.body
  try {
    const customer = await Customer.findOneAndUpdate({ phone: phone }, { cardUid: newCardUid }, { new: true })
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }
    return res.json({ message: 'New card added to customer successfully', data: customer })
  } catch (error) {
    return res.status(500).json({ message: 'There was an error while adding the new card, please try again', error: error.message })
  }
}