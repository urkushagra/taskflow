const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { success, created, error, unauthorized, notFound } = require('../utils/response');

const SALT_ROUNDS = 12;

/**
 * POST /api/v1/auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check duplicate email
    if (db.findUserByEmail(email)) {
      return error(res, 'Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = db.createUser({ name, email, passwordHash, role });

    const { accessToken, refreshToken } = generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    db.storeRefreshToken(refreshToken);

    const { passwordHash: _, ...safeUser } = user;
    return created(res, { user: safeUser, accessToken, refreshToken }, 'Registration successful');
  } catch (err) {
    console.error('[register]', err);
    return error(res, 'Registration failed');
  }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.findUserByEmail(email);
    if (!user) {
      return unauthorized(res, 'Invalid email or password');
    }

    if (!user.isActive) {
      return unauthorized(res, 'Account has been deactivated');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return unauthorized(res, 'Invalid email or password');
    }

    const { accessToken, refreshToken } = generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    db.storeRefreshToken(refreshToken);

    const { passwordHash: _, ...safeUser } = user;
    return success(res, { user: safeUser, accessToken, refreshToken }, 'Login successful');
  } catch (err) {
    console.error('[login]', err);
    return error(res, 'Login failed');
  }
};

/**
 * POST /api/v1/auth/refresh
 * Exchange a valid refresh token for a new access token
 */
const refresh = (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!db.hasRefreshToken(refreshToken)) {
      return unauthorized(res, 'Refresh token is invalid or revoked');
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = db.findUserById(decoded.sub);
    if (!user || !user.isActive) {
      return unauthorized(res, 'User not found');
    }

    // Rotate refresh token
    db.revokeRefreshToken(refreshToken);
    const tokens = generateTokens({ sub: user.id, email: user.email, role: user.role });
    db.storeRefreshToken(tokens.refreshToken);

    return success(res, tokens, 'Token refreshed');
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Refresh token expired, please login again');
    }
    return unauthorized(res, 'Invalid refresh token');
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) db.revokeRefreshToken(refreshToken);
  return success(res, {}, 'Logged out successfully');
};

/**
 * GET /api/v1/auth/me
 */
const getMe = (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return notFound(res, 'User');
  const { passwordHash: _, ...safeUser } = user;
  return success(res, { user: safeUser }, 'Profile retrieved');
};

module.exports = { register, login, refresh, logout, getMe };
