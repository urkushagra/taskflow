const { validationResult } = require('express-validator');
const { validationError } = require('../utils/response');

/**
 * Middleware to check express-validator results
 * Place AFTER validator chains in route definitions
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(e => ({
      field: e.path,
      message: e.msg,
    }));
    return validationError(res, formatted);
  }
  next();
};

module.exports = validate;
