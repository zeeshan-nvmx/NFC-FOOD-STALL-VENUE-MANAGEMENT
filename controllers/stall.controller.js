const Stall = require('../models/stall.model')

// Create a new stall
exports.createStall = async (req, res) => {
  const { motherStall, stallAdmin, stallCashiers, menu } = req.body
  try {
    const newStall = await Stall.create({ motherStall, stallAdmin, stallCashiers, menu })
    res.status(201).json({ message: 'Stall created successfully', data: newStall })
  } catch (error) {
    res.status(400).json({ message: 'Error creating stall', error: error.message })
  }
}

// Get a list of all stalls alphabetically
// exports.getAllStalls = async (req, res) => {
//   try {
//     const stalls = await Stall.find({}, '_id motherStall name stallAdmin').sort('motherStall');
//     res.status(200).json({ message: 'Stalls retrieved successfully', data: stalls });
//   } catch (error) {
//     res.status(400).json({ message: 'Error retrieving stalls', error: error.message });
//   }
// };

// Get a single stall with all its data

exports.getAllStalls = async (req, res) => {
  try {
    const stalls = await Stall.find({}, '_id motherStall stallAdmin').sort('motherStall').populate({
      path: 'stallAdmin',
      select: '_id name phone', // Select only the _id,name and phone of the stallAdmin
    })
    res.status(200).json({ message: 'Stalls retrieved successfully', data: stalls })
  } catch (error) {
    res.status(400).json({ message: 'Error retrieving stalls', error: error.message })
  }
}

exports.getStall = async (req, res) => {
  const { stallId } = req.params;
  try {
    const stall = await Stall.findById(stallId);
    if (!stall) {
      return res.status(404).json({ message: 'Stall not found' });
    }
    res.status(200).json({ message: 'Stall retrieved successfully', data: stall });
  } catch (error) {
    res.status(400).json({ message: 'Error retrieving stall', error: error.message });
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
    res.status(200).json({ message: 'Stall updated successfully', data: updatedStall })
  } catch (error) {
    res.status(400).json({ message: 'Error updating stall', error: error.message })
  }
}

// Add a new menu item to a stall
exports.addMenuItem = async (req, res) => {
  const { stallId } = req.params
  const { foodName, foodPrice, isAvailable } = req.body
  try {
    const updatedStall = await Stall.findOneAndUpdate({ _id: stallId }, { $push: { menu: { foodName, foodPrice, isAvailable } } }, { new: true })
    res.status(201).json({ message: 'Menu item added successfully', data: updatedStall })
  } catch (error) {
    res.status(400).json({ message: 'Error adding menu item', error: error.message })
  }
}

// Update an existing menu item
exports.updateMenuItem = async (req, res) => {
  const { stallId, menuId } = req.params
  const { foodName, foodPrice, isAvailable } = req.body

  try {
    const stall = await Stall.findById(stallId)
    const menuItem = stall.menu.id(menuId)
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' })
    }
    menuItem.foodName = foodName
    menuItem.foodPrice = foodPrice
    menuItem.isAvailable = isAvailable
    await stall.save()
    res.status(200).json({ message: 'Menu item updated successfully', data: stall })
  } catch (error) {
    res.status(400).json({ message: 'Error updating menu item', error: error.message })
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

    // Save the document to persist the changes
    await stall.save()

    res.status(200).json({ message: 'Menu item removed successfully', data: stall })
  } catch (error) {
    res.status(400).json({ message: 'Error removing menu item', error: error.message })
  }
}


// Retrieve the menu for a stall
exports.getMenu = async (req, res) => {
  const { stallId } = req.params
  try {
    const stall = await Stall.findById(stallId)
    res.status(200).json({ message: 'Menu retrieved successfully', data: stall.menu })
  } catch (error) {
    res.status(404).json({ message: 'Stall not found', error: error.message })
  }
}
