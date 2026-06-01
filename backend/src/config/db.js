/**
 * In-Memory Database (simulates PostgreSQL)
 * In production, replace with pg/sequelize/prisma
 *
 * PostgreSQL Schema equivalent:
 *
 * CREATE TABLE users (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name VARCHAR(100) NOT NULL,
 *   email VARCHAR(255) UNIQUE NOT NULL,
 *   password_hash VARCHAR(255) NOT NULL,
 *   role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
 *   is_active BOOLEAN DEFAULT true,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE TABLE tasks (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   title VARCHAR(255) NOT NULL,
 *   description TEXT,
 *   status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
 *   priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
 *   due_date TIMESTAMPTZ,
 *   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_tasks_user_id ON tasks(user_id);
 * CREATE INDEX idx_tasks_status ON tasks(status);
 * CREATE INDEX idx_users_email ON users(email);
 */

const { v4: uuidv4 } = require('uuid');

const db = {
  users: [],
  tasks: [],
  refreshTokens: new Set(), // In prod: Redis or DB table

  // ── Users ────────────────────────────────────────────────
  findUserByEmail(email) {
    return this.users.find(u => u.email === email.toLowerCase());
  },
  findUserById(id) {
    return this.users.find(u => u.id === id);
  },
  createUser({ name, email, passwordHash, role = 'user' }) {
    const user = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  },
  updateUser(id, updates) {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.users[idx];
  },
  deleteUser(id) {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.users.splice(idx, 1);
    this.tasks = this.tasks.filter(t => t.userId !== id);
    return true;
  },
  getAllUsers() {
    return this.users.map(({ passwordHash, ...u }) => u);
  },

  // ── Tasks ────────────────────────────────────────────────
  createTask({ title, description, status, priority, dueDate, userId }) {
    const task = {
      id: uuidv4(),
      title,
      description: description || null,
      status: status || 'pending',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.push(task);
    return task;
  },
  getTasksByUser(userId) {
    return this.tasks.filter(t => t.userId === userId);
  },
  getAllTasks() {
    return this.tasks;
  },
  findTaskById(id) {
    return this.tasks.find(t => t.id === id);
  },
  updateTask(id, updates) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.tasks[idx] = { ...this.tasks[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.tasks[idx];
  },
  deleteTask(id) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.tasks.splice(idx, 1);
    return true;
  },

  // ── Refresh Tokens ───────────────────────────────────────
  storeRefreshToken(token) { this.refreshTokens.add(token); },
  hasRefreshToken(token) { return this.refreshTokens.has(token); },
  revokeRefreshToken(token) { this.refreshTokens.delete(token); },
};

module.exports = db;
