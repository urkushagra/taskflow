require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const adminRoutes = require('./routes/admin');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const { success } = require('./utils/response');
const swaggerSpec = require('./config/swagger');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use(globalLimiter);

// ── Body & Logging ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── API Docs ─────────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'TaskFlow API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
}));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  return success(res, {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }, 'Service is healthy');
});

// ── API Routes (versioned) ───────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/admin', adminRoutes);

// ── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  return success(res, {
    name: 'TaskFlow API',
    version: 'v1',
    docs: '/api-docs',
    health: '/health',
  }, 'Welcome to TaskFlow API');
});

// ── Error Handlers (must be last) ────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Seed demo data ────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const seedData = async () => {
  const adminHash = await bcrypt.hash('Admin123', 12);
  const userHash = await bcrypt.hash('User1234', 12);

  const admin = db.createUser({ name: 'Admin User', email: 'admin@taskflow.dev', passwordHash: adminHash, role: 'admin' });
  const user = db.createUser({ name: 'Jane Doe', email: 'jane@taskflow.dev', passwordHash: userHash, role: 'user' });

  db.createTask({ title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated deployment', status: 'in_progress', priority: 'high', userId: admin.id });
  db.createTask({ title: 'Write unit tests', description: 'Add test coverage for auth module', status: 'pending', priority: 'medium', userId: admin.id });
  db.createTask({ title: 'Buy groceries', description: 'Milk, eggs, bread', status: 'pending', priority: 'low', userId: user.id });
  db.createTask({ title: 'Finish project report', description: 'Q3 summary report for stakeholders', status: 'in_progress', priority: 'high', dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), userId: user.id });
  db.createTask({ title: 'Code review', description: 'Review PR #42', status: 'completed', priority: 'medium', userId: user.id });

  console.log('\n🌱 Seed data loaded:');
  console.log('   Admin → admin@taskflow.dev / Admin123');
  console.log('   User  → jane@taskflow.dev  / User1234\n');
};

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  await seedData();
  console.log(`🚀 TaskFlow API running on http://localhost:${PORT}`);
  console.log(`📚 API Docs:          http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health check:      http://localhost:${PORT}/health`);
});

module.exports = app;
