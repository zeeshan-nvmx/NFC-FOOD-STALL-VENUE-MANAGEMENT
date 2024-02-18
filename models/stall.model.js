const mongoose = require('mongoose')

// Define the schema for the stall
const stallSchema = new mongoose.Schema(
  {
    motherStall: {
      type: String,
      required: true, // This field is mandatory
    },
    stallAdmin: {
      type: mongoose.Schema.Types.ObjectId, // Reference to User model
      ref: 'User',
    },
    stallCashiers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of references to User model
      default: [],
    },
    menu: [
      {
        foodName: {
          type: String,
          required: true, // Each menu item must have a name
        },
        foodPrice: {
          type: Number,
          required: true, // Each menu item must have a price
        },
        isAvailable: {
          type: Boolean,
          default: true, // By default, menu items are available
        },
        currentStock: {
          type: Number,
          default: 0,
        }
      },
    ],
  },
  { timestamps: true }
) // Add createdAt and updatedAt timestamps automatically

// Create the model from the schema
const Stall = mongoose.model('Stall', stallSchema)

module.exports = Stall
