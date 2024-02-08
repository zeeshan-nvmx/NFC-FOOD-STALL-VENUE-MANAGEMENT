const mongoose = require('mongoose')

mongoose.set('strictQuery', false) // Prepare for Mongoose 7

const connectDB = async (url) => {
  try {
    await mongoose.connect(url)
    console.log('Connected to MongoDB Serverless Instance')
  } catch (err) {
    console.error('Error connecting to MongoDB:', err)
  }
}

module.exports = connectDB


// const connectDB = (url) => {
//   return mongoose.connect(url)
// }

// module.exports = connectDB