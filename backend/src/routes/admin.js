const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, updateUser, deleteUser, getStats } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uuidParamValidator } = require('../validators');

// All admin routes: must be authenticated AND have 'admin' role
router.use(authenticate, authorize('admin'));

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.get('/users/:id', uuidParamValidator, validate, getUserById);
router.patch('/users/:id', uuidParamValidator, validate, updateUser);
router.delete('/users/:id', uuidParamValidator, validate, deleteUser);

module.exports = router;
