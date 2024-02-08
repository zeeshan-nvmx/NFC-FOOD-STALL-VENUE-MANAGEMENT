const BadRequestError = require('../errors/bad-request')

function validateRequestFields(reqBody, requiredFields) {
  const missingFields = requiredFields.filter((field) => !reqBody[field])
  if (missingFields.length > 0) {
    
  }
}

// Helper function to generate default error message
const generateDefaultErrorMessage = (errors) => {
  return errors.map((error) => error.message).join(', ')
}

module.exports = { validateRequestFields, generateDefaultErrorMessage }
