const { error } = require('../utils/response');

// 404 handler - must be placed after all routes
const notFoundHandler = (req, res) => {
  return error(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
};

// Global error handler - must have 4 params
// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.stack || err.message}`);

  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return error(res, 'Invalid JSON in request body', 400);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';

  return error(res, message, statusCode);
};

module.exports = { notFoundHandler, globalErrorHandler };
