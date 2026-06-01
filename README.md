# TaskFlow API 🚀

> Scalable REST API with JWT Authentication, Role-Based Access Control, and CRUD operations — built with Node.js + Express.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org) [![Express](https://img.shields.io/badge/Express-4.18-blue)](https://expressjs.com) [![JWT](https://img.shields.io/badge/JWT-Auth-orange)](https://jwt.io)

---

## Features

- ✅ **JWT Authentication** — Access token (15m) + Refresh token rotation (7d)
- ✅ **Role-Based Access Control** — `user` and `admin` roles with route-level guards
- ✅ **CRUD API** — Full task management with filtering & pagination
- ✅ **API Versioning** — All routes under `/api/v1/`
- ✅ **Input Validation** — `express-validator` with sanitisation on every route
- ✅ **Security** — Helmet, CORS, rate limiting, bcrypt (12 rounds), payload size limits
- ✅ **Swagger Docs** — Interactive API documentation at `/api-docs`
- ✅ **Structured Logging** — Morgan HTTP logger
- ✅ **Standardised Responses** — Consistent `{ success, message, data, timestamp }` envelope

---

## Project Structure

```
taskflow/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app entry point
│   │   ├── config/
│   │   │   ├── db.js               # In-memory DB (PostgreSQL schema documented)
│   │   │   └── swagger.js          # OpenAPI 3.0 spec
│   │   ├── controllers/
│   │   │   ├── authController.js   # register, login, refresh, logout, me
│   │   │   ├── taskController.js   # CRUD for tasks
│   │   │   └── adminController.js  # User management, stats
│   │   ├── middleware/
│   │   │   ├── auth.js             # authenticate + authorize (RBAC)
│   │   │   ├── validate.js         # express-validator error formatter
│   │   │   └── errorHandler.js     # 404 + global error handler
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── tasks.js
│   │   │   └── admin.js
│   │   ├── validators/
│   │   │   └── index.js            # All validator chains
│   │   └── utils/
│   │       ├── jwt.js              # Token generation & verification
│   │       └── response.js         # Standardised response helpers
│   ├── .env.example
│   └── package.json
└── frontend/
    └── index.html                  # Single-file UI (Vanilla JS + Fetch API)
```

---

## Quick Start

### 1. Install & Run Backend

```bash
cd backend
cp .env.example .env          # Edit secrets before production
npm install
npm run dev                   # nodemon auto-reload
# or: npm start
```

Server starts at **http://localhost:5000**

### 2. Open Frontend

```bash
# Simply open in browser:
open frontend/index.html
# or serve with any static server:
npx serve frontend
```

### Demo Accounts (auto-seeded on startup)

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@taskflow.dev     | Admin123   |
| User  | jane@taskflow.dev      | User1234   |

---

## API Reference

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication

All protected routes require:
```
Authorization: Bearer <accessToken>
```

### Endpoints

#### Auth
| Method | Path              | Auth | Description               |
|--------|-------------------|------|---------------------------|
| POST   | /auth/register    | –    | Register new user         |
| POST   | /auth/login       | –    | Login, get tokens         |
| GET    | /auth/me          | ✅   | Get current user profile  |
| POST   | /auth/refresh     | –    | Rotate tokens             |
| POST   | /auth/logout      | –    | Revoke refresh token      |

#### Tasks
| Method | Path          | Auth | Role       | Description         |
|--------|---------------|------|------------|---------------------|
| GET    | /tasks        | ✅   | user/admin | List tasks (paginated, filtered) |
| POST   | /tasks        | ✅   | user/admin | Create task         |
| GET    | /tasks/:id    | ✅   | user/admin | Get task by ID      |
| PATCH  | /tasks/:id    | ✅   | user/admin | Update task         |
| DELETE | /tasks/:id    | ✅   | user/admin | Delete task         |

#### Admin (admin role only)
| Method | Path               | Description          |
|--------|--------------------|----------------------|
| GET    | /admin/stats       | Platform statistics  |
| GET    | /admin/users       | List all users       |
| GET    | /admin/users/:id   | Get user by ID       |
| PATCH  | /admin/users/:id   | Update user          |
| DELETE | /admin/users/:id   | Delete user          |

### Query Parameters (GET /tasks)

| Param    | Values                                        | Default |
|----------|-----------------------------------------------|---------|
| status   | pending, in_progress, completed, cancelled    | –       |
| priority | low, medium, high                             | –       |
| page     | integer                                       | 1       |
| limit    | 1–100                                         | 10      |

### Response Format

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Database Schema (PostgreSQL)

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  DEFAULT 'user' CHECK (role IN ('user','admin')),
  is_active     BOOLEAN      DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255)  NOT NULL,
  description TEXT,
  status      VARCHAR(20)   DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','completed','cancelled')),
  priority    VARCHAR(10)   DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high')),
  due_date    TIMESTAMPTZ,
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ   DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status  ON tasks(status);
CREATE INDEX idx_users_email   ON users(email);
```

**Switching to real PostgreSQL:**
```bash
npm install pg
```
Replace `src/config/db.js` methods with `pg` pool queries (each method maps 1:1 to a prepared statement).

---

## Security

| Measure              | Implementation                                 |
|----------------------|------------------------------------------------|
| Password hashing     | bcryptjs, 12 salt rounds                       |
| JWT access tokens    | 15-minute expiry, HS256, issuer+audience check |
| Refresh token        | 7-day expiry, rotation on every use, revocable |
| Rate limiting        | 100 req/15min global; 20 req/15min on auth     |
| Input validation     | express-validator on every route               |
| CORS                 | Allowlist-based, credentials supported         |
| Helmet               | Secure HTTP headers                            |
| Payload limit        | 10kb max body size                             |
| RBAC                 | Role verified on every protected route         |

---

## Scalability Notes

See [SCALABILITY.md](./SCALABILITY.md) for the full writeup.

**TL;DR:** This monolith is production-ready as-is for moderate scale. The architecture supports:
- Horizontal scaling behind a load balancer (stateless JWT)
- Swapping in-memory DB for PostgreSQL (zero controller changes)
- Redis for token storage and response caching
- Splitting into microservices (Auth Service, Task Service) independently

---

## API Documentation

Interactive Swagger UI available at:
```
http://localhost:5000/api-docs
```

---

## Environment Variables

| Variable               | Default              | Description                    |
|------------------------|----------------------|--------------------------------|
| PORT                   | 5000                 | Server port                    |
| JWT_SECRET             | (required)           | Access token signing key       |
| JWT_REFRESH_SECRET     | (required)           | Refresh token signing key      |
| JWT_EXPIRES_IN         | 15m                  | Access token TTL               |
| JWT_REFRESH_EXPIRES_IN | 7d                   | Refresh token TTL              |
| ALLOWED_ORIGINS        | localhost:3000,5173  | CORS allowlist (comma-sep)     |
| RATE_LIMIT_MAX         | 100                  | Requests per window            |
| RATE_LIMIT_WINDOW_MS   | 900000               | Window in ms (15 min)          |
