# Scalability & Architecture Notes

## Current Architecture

```
Client (Browser / Mobile)
        │
        ▼
   Load Balancer (Nginx / ALB)
        │
        ├─── TaskFlow Instance 1 ──► PostgreSQL (Primary)
        ├─── TaskFlow Instance 2 ──►     │
        └─── TaskFlow Instance N ──►     └── Read Replicas (x2)
                    │
                    └─── Redis Cluster (tokens + cache)
```

---

## Why This Scales Horizontally

**Stateless JWT design** is the cornerstone. Access tokens carry all identity/role information — the server validates them cryptographically without any DB lookup per request (only the user-exists check, which hits a Redis cache). This means:

- Any instance can handle any request
- Zero sticky-session requirements
- Add/remove instances freely behind a load balancer

---

## Scaling Strategies

### 1. Database Layer

**Current:** In-memory (development only)

**Production path:**
```
Single PostgreSQL ──► Primary + Read Replicas ──► Citus (horizontal sharding)
```

- **Read replicas** handle GET requests (80%+ of traffic). Write queries route to primary.
- **Connection pooling** via PgBouncer keeps idle connections cheap.
- **Indexing strategy** already documented in schema: `idx_tasks_user_id`, `idx_tasks_status`, `idx_users_email`.
- **Future:** Partition the `tasks` table by `user_id` hash for multi-tenant scale.

### 2. Caching with Redis

Two caching layers:

```javascript
// Layer 1: Refresh token storage (replace in-memory Set)
await redis.set(`rt:${userId}`, refreshToken, 'EX', 7 * 86400);

// Layer 2: Response cache for read-heavy endpoints
const cached = await redis.get(`tasks:${userId}:${queryHash}`);
if (cached) return res.json(JSON.parse(cached));
// ... fetch from DB ...
await redis.setex(`tasks:${userId}:${queryHash}`, 300, JSON.stringify(result));
```

Cache invalidation strategy: tag-based. On task create/update/delete, call `redis.del` for that user's task keys.

### 3. Microservices Split (when traffic demands it)

```
                      API Gateway (Kong / AWS API GW)
                      ┌─────────────────────────────┐
                      │                             │
               Auth Service                   Task Service
               (JWT, users)                  (CRUD, filters)
               Port 5001                     Port 5002
                      │                             │
               Users DB (PG)              Tasks DB (PG)
```

This repo's folder structure maps cleanly:
- `controllers/authController.js` + `routes/auth.js` → **Auth Service**
- `controllers/taskController.js` + `routes/tasks.js` → **Task Service**
- `controllers/adminController.js` + `routes/admin.js` → **Admin Service**

Inter-service auth: Auth service issues tokens; Task service verifies them independently (shared `JWT_SECRET` via secrets manager). No inter-service calls needed.

### 4. Rate Limiting at Scale

Current: in-process `express-rate-limit` (per-instance)

Production: rate limit via Redis so limits are shared across all instances:

```bash
npm install rate-limit-redis
```

```javascript
const RedisStore = require('rate-limit-redis');
const limiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

### 5. Logging & Observability

```
App Logs (Morgan) ──► Fluentd/Logstash ──► Elasticsearch ──► Kibana
                                       └──► S3 (long-term)

Metrics ──► Prometheus ──► Grafana
              (request rate, latency p50/p99, error rate, JWT failures)
```

Key metrics to alert on:
- `auth_login_failures > 50/min` → possible brute force
- `api_latency_p99 > 500ms` → DB index missing or N+1 query
- `task_creation_rate` → usage growth indicator

### 6. Docker & Deployment

```dockerfile
# Multi-stage build — production image < 150MB
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/
EXPOSE 5000
CMD ["node", "src/app.js"]
```

```yaml
# docker-compose.yml (dev)
services:
  api:
    build: ./backend
    ports: ["5000:5000"]
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - DB_HOST=postgres
    depends_on: [postgres, redis]
  postgres:
    image: postgres:15-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
```

**Kubernetes path:** Each service runs as a `Deployment` with `HorizontalPodAutoscaler` targeting 70% CPU. `ConfigMap` holds non-secret env vars; `Secret` holds JWT keys.

---

## Performance Benchmarks (estimated)

| Scenario                    | Single instance | 3 instances + Redis |
|-----------------------------|-----------------|---------------------|
| Auth (login/register)       | ~500 req/s      | ~1,500 req/s        |
| Read tasks (cached)         | ~2,000 req/s    | ~10,000 req/s       |
| Write tasks                 | ~400 req/s      | ~1,200 req/s        |
| p99 latency (local PG)      | ~15ms           | ~10ms               |

---

## Security Hardening for Production

- [ ] Rotate `JWT_SECRET` periodically using key versioning
- [ ] Store secrets in AWS Secrets Manager / Vault, not `.env` files
- [ ] Enable TLS 1.3 only at load balancer
- [ ] Add `Content-Security-Policy` header via Helmet config
- [ ] Implement request signing for service-to-service calls
- [ ] Set up WAF (AWS WAF / Cloudflare) in front of API Gateway
- [ ] Enable PostgreSQL SSL and row-level security for multi-tenant data
- [ ] Audit log all admin actions to an append-only table
