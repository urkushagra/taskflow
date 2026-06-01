const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTaskValidator,
  updateTaskValidator,
  uuidParamValidator,
  taskQueryValidator,
} = require('../validators');

// All task routes require authentication
router.use(authenticate);

router.get('/', taskQueryValidator, validate, getTasks);
router.post('/', createTaskValidator, validate, createTask);
router.get('/:id', uuidParamValidator, validate, getTask);
router.patch('/:id', updateTaskValidator, validate, updateTask);
router.delete('/:id', uuidParamValidator, validate, deleteTask);

module.exports = router;
