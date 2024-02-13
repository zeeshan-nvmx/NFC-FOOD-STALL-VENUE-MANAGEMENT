const express = require('express')
const app = express()
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { xss } = require('express-xss-sanitizer')
const mongoSanitize = require('express-mongo-sanitize')

const port = process.env.PORT || 3000

require('dotenv').config()

const authRouter = require('./routes/auth.routes')
const stallRouter = require('./routes/stall.routes')
const customerRouter = require('./routes/customer.routes')
const orderRouter = require('./routes/order.routes')

const connectDB = require('./utils/db')
// const errorHandler = require('./utils/error-handler')
const { authenticateUser } = require('./utils/authorize-authenticate')
// const notFoundError = require('./utils/not-found-404')

app.use(helmet())
app.use(cors())
app.use(xss())
app.use(mongoSanitize())
app.use(morgan('short'))
app.use(express.json())

app.get('/api/v1/showme', authenticateUser, (req, res) => {
  res.json(req.user)
})

app.use('/api/v1', authRouter)
app.use('/api/v1', stallRouter)
app.use('/api/v1', customerRouter)
app.use('/api/v1', orderRouter)


// app.use(notFoundError)
// app.use(errorHandler)

const startServer = () => {
  app.listen(port, () => {
    connectDB(process.env.MONGO_URL)
    console.log(`server started on port ${port}`)
  })
}

startServer()
