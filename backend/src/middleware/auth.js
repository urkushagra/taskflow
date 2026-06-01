const { verifyAccessToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/response');
const db = require('../config/db');

/**
 * authenticate - verifies Bearer JWT in Authorization header
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Ensure user still exists and is active
    const user = db.findUserById(decoded.sub);
    if (!user || !user.isActive) {
      return unauthorized(res, 'User account not found or deactivated');
    }

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Access token expired');
    }
    if (err.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Invalid access token');
    }
    return unauthorized(res, 'Authentication failed');
  }
};

/**
 * authorize - RBAC: only allow specified roles
 * Usage: authorize('admin') or authorize('admin', 'user')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Role '${req.user.role}' is not allowed to perform this action`);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
