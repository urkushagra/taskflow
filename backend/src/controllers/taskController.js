const db = require('../config/db');
const { success, created, notFound, forbidden, error } = require('../utils/response');

/**
 * GET /api/v1/tasks
 * Users see only their tasks; admins see all
 */
const getTasks = (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    const isAdmin = req.user.role === 'admin';

    let tasks = isAdmin ? db.getAllTasks() : db.getTasksByUser(req.user.id);

    // Filter
    if (status) tasks = tasks.filter(t => t.status === status);
    if (priority) tasks = tasks.filter(t => t.priority === priority);

    // Sort by createdAt desc
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const total = tasks.length;
    const offset = (page - 1) * limit;
    const paginated = tasks.slice(offset, offset + Number(limit));

    return success(res, {
      tasks: paginated,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[getTasks]', err);
    return error(res, 'Failed to fetch tasks');
  }
};

/**
 * GET /api/v1/tasks/:id
 */
const getTask = (req, res) => {
  const task = db.findTaskById(req.params.id);
  if (!task) return notFound(res, 'Task');

  // Users can only view their own tasks
  if (req.user.role !== 'admin' && task.userId !== req.user.id) {
    return forbidden(res);
  }

  return success(res, { task });
};

/**
 * POST /api/v1/tasks
 */
const createTask = (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;
    const task = db.createTask({
      title,
      description,
      status,
      priority,
      dueDate,
      userId: req.user.id,
    });
    return created(res, { task }, 'Task created successfully');
  } catch (err) {
    console.error('[createTask]', err);
    return error(res, 'Failed to create task');
  }
};

/**
 * PATCH /api/v1/tasks/:id
 */
const updateTask = (req, res) => {
  try {
    const task = db.findTaskById(req.params.id);
    if (!task) return notFound(res, 'Task');

    if (req.user.role !== 'admin' && task.userId !== req.user.id) {
      return forbidden(res);
    }

    const allowed = ['title', 'description', 'status', 'priority', 'dueDate'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = db.updateTask(req.params.id, updates);
    return success(res, { task: updated }, 'Task updated successfully');
  } catch (err) {
    console.error('[updateTask]', err);
    return error(res, 'Failed to update task');
  }
};

/**
 * DELETE /api/v1/tasks/:id
 */
const deleteTask = (req, res) => {
  try {
    const task = db.findTaskById(req.params.id);
    if (!task) return notFound(res, 'Task');

    if (req.user.role !== 'admin' && task.userId !== req.user.id) {
      return forbidden(res);
    }

    db.deleteTask(req.params.id);
    return success(res, {}, 'Task deleted successfully');
  } catch (err) {
    console.error('[deleteTask]', err);
    return error(res, 'Failed to delete task');
  }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask };
