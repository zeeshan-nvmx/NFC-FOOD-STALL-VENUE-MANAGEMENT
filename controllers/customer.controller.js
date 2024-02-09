const Customer = require('../models/customer.model')
const User = require('../models/auth.model')
const Joi = require('joi')

// Create a new customer with a card UID
exports.createCustomer = async (req, res) => {

  const schema = Joi.object({
    name: Joi.string(),
    phone: Joi.string().length(11).required(),
    cardUid: Joi.string().required(),
    moneyLeft: Joi.number().min(0),
    createdBy: Joi.string().required(),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    const { name, phone, cardUid, moneyLeft, createdBy } = req.body
    // Ensure createdBy (recharger or recharger admin) exists and has the right role
    const creator = await User.findById(createdBy)
    if (!creator || (creator.role !== 'recharger' && creator.role !== 'rechargerAdmin')) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const newCustomer = await Customer.create({ name, phone, cardUid, moneyLeft, createdBy })
    res.status(201).json(newCustomer)
  } catch (error) {
    res.status(400).json({ message: error.message })
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
    const { cardUid, amount, rechargerId } = req.body
    const customer = await Customer.findOne({ cardUid })
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    // Prevent negative moneyLeft
    const updatedMoneyLeft = Math.max(0, customer.moneyLeft + amount)
    const rechargerName = (await User.findById(rechargerId)).name

    // Update customer
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customer._id,
      {
        $set: { moneyLeft: updatedMoneyLeft },
        $push: { rechargeHistory: { rechargerName, rechargerId, amount, date: new Date() } },
      },
      { new: true }
    )

    res.json(updatedCustomer)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Delete a customer
exports.deleteCustomer = async (req, res) => {
  try {
    const { customerId } = req.params
    await Customer.findByIdAndDelete(customerId)
    res.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
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
      return res.status(404).json({ message: 'Customer not found' })
    }

    res.json(updatedCustomer)
  } catch (error) {
    res.status(500).json({ message: error.message })
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
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.addCardToCustomerByPhone = async (req, res) => {
  const { phone, newCardUid } = req.body
  try {
    const customer = await Customer.findOneAndUpdate({ phone: phone }, { cardUid: newCardUid }, { new: true })
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }
    res.json(customer)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}