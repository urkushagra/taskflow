const db = require('../config/db');
const { success, notFound, error } = require('../utils/response');

/**
 * GET /api/v1/admin/users
 */
const getAllUsers = (req, res) => {
  const users = db.getAllUsers();
  return success(res, { users, total: users.length });
};

/**
 * GET /api/v1/admin/users/:id
 */
const getUserById = (req, res) => {
  const user = db.findUserById(req.params.id);
  if (!user) return notFound(res, 'User');
  const { passwordHash: _, ...safeUser } = user;
  return success(res, { user: safeUser });
};

/**
 * PATCH /api/v1/admin/users/:id
 */
const updateUser = (req, res) => {
  try {
    const user = db.findUserById(req.params.id);
    if (!user) return notFound(res, 'User');

    const allowed = ['name', 'role', 'isActive'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = db.updateUser(req.params.id, updates);
    const { passwordHash: _, ...safeUser } = updated;
    return success(res, { user: safeUser }, 'User updated');
  } catch (err) {
    console.error('[updateUser]', err);
    return error(res, 'Failed to update user');
  }
};

/**
 * DELETE /api/v1/admin/users/:id
 */
const deleteUser = (req, res) => {
  const user = db.findUserById(req.params.id);
  if (!user) return notFound(res, 'User');

  // Prevent self-deletion
  if (req.params.id === req.user.id) {
    return error(res, 'Cannot delete your own account', 400);
  }

  db.deleteUser(req.params.id);
  return success(res, {}, 'User deleted successfully');
};

/**
 * GET /api/v1/admin/stats
 */
const getStats = (req, res) => {
  const users = db.getAllUsers();
  const tasks = db.getAllTasks();

  const stats = {
    users: {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      active: users.filter(u => u.isActive).length,
    },
    tasks: {
      total: tasks.length,
      byStatus: {
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length,
      },
      byPriority: {
        low: tasks.filter(t => t.priority === 'low').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        high: tasks.filter(t => t.priority === 'high').length,
      },
    },
  };

  return success(res, { stats });
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser, getStats };
