# LeanStock Endterm Backend

Production-style Express.js backend for **LeanStock**, a smart inventory micro-SaaS for small retail chains and bazaar shops. The system manages multi-location stock, prevents overselling, reserves inventory during checkout, detects dead stock, recommends reorder points, and sends asynchronous email notifications.

## Tech Stack

- Node.js + Express.js
- JavaScript CommonJS
- PostgreSQL + Prisma ORM + Prisma Migrate
- Redis for reservation locks and background email queue
- JWT access tokens + rotating refresh tokens
- bcrypt password hashing
- Zod validation
- Swagger UI / OpenAPI
- Vitest + Supertest
- Docker Compose for local PostgreSQL and Redis

## Architecture

The backend follows layered architecture:

```text
HTTP request → routes → middleware → controllers → services → Prisma → PostgreSQL/Redis → response
```

- **routes/** define HTTP endpoints.
- **middleware/** handles authentication, RBAC, rate limiting, validation, and errors.
- **controllers/** translate HTTP input/output.
- **services/** contain business logic.
- **Prisma** handles all relational database operations.
- **Redis** handles short-lived reservation locks and background email jobs.

No application code uses raw SQL. Inventory consistency is protected with Prisma transactions, Serializable isolation, Redis locks, and conditional `updateMany` checks.

## Environment Setup

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Required variables:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://leanstock:leanstock@localhost:5433/leanstock?schema=public"
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=replace-with-at-least-32-characters-access-secret
JWT_REFRESH_SECRET=replace-with-at-least-32-characters-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=30
BCRYPT_ROUNDS=12
CORS_ORIGINS=http://localhost:5173,http://localhost:3001
RUN_JOBS=true
RESERVATION_TTL_SECONDS=900
APP_BASE_URL=http://localhost:3001
EMAIL_FROM="LeanStock <onboarding@resend.dev>"
RESEND_API_KEY=
EMAIL_DRY_RUN=true
EMAIL_WORKER_ENABLED=true
EMAIL_WORKER_INTERVAL_MS=2000
```

For real email delivery, create a Resend API key, set `RESEND_API_KEY`, set `EMAIL_FROM`, and set `EMAIL_DRY_RUN=false`. In development, dry-run mode logs/records email jobs in Redis and returns demo tokens for live defense.

## Local Run Commands

```powershell
npm install
docker compose -f docker/docker-compose.yml up -d postgres redis
npx prisma migrate dev
npx prisma generate
npm run dev
```

Open:

```text
http://localhost:3001/docs
```

## Test Commands

```powershell
npm test
npm run lint
```

CI workflow is located in `.github/workflows/ci.yml` and runs install, generate, lint, test, and Docker build checks.

## Main API Workflows

### Auth Flow

1. `POST /api/v1/auth/register` creates a tenant and first `TENANT_ADMIN` user, queues verification email, and returns a verification token in development mode.
2. `POST /api/v1/auth/verify-email` verifies the account.
3. `POST /api/v1/auth/login` returns access token and refresh token.
4. `GET /api/v1/auth/me` proves Bearer token authentication.
5. `POST /api/v1/auth/refresh` rotates refresh token: old token is revoked, new token pair is issued.
6. `POST /api/v1/auth/logout` revokes refresh token.
7. `POST /api/v1/auth/forgot-password` queues reset email.
8. `POST /api/v1/auth/reset-password` changes password and revokes active refresh tokens.

Unverified users cannot log in or access protected routes.

### RBAC

Roles:

- `TENANT_ADMIN` — full tenant administration.
- `WAREHOUSE_MANAGER` — stock operations, transfers, reservations, forecasting.
- `STAFF_MEMBER` — operational inventory/reservation workflows.
- `AUDITOR` — read audit logs.
- `API_CLIENT` — integration role.
- `SUPER_ADMIN` — platform role reserved for future expansion.

Unauthorized authenticated roles receive `403 Forbidden`. Missing/invalid tokens receive `401 Unauthorized`.

### Tenant User Management

`POST /api/v1/users` lets `TENANT_ADMIN` create users inside the same tenant, including a warehouse manager:

```json
{
  "email": "manager@demo.kz",
  "password": "Password123!",
  "role": "WAREHOUSE_MANAGER"
}
```

### Inventory Workflow

1. `POST /api/v1/locations` create warehouses.
2. `POST /api/v1/skus` create product/SKU.
3. `POST /api/v1/inventory/receive` receive stock.
4. `POST /api/v1/transfers` atomically move stock between locations.
5. `GET /api/v1/inventory` verify source decreased and destination increased.

### Reservation Workflow

- `POST /api/v1/reservations` reserves inventory with Redis lock and TTL.
- `POST /api/v1/reservations/:id/confirm` confirms checkout and decrements inventory.
- `POST /api/v1/reservations/:id/release` releases reservation.
- `POST /api/v1/reservations/expire` marks expired reservations.

### Forecasting

- `POST /api/v1/sales` records sales history.
- `GET /api/v1/forecast/reorder-point` calculates moving-average reorder point.
- `POST /api/v1/forecast/reorder-point/apply` applies forecast to inventory.

### Dead Stock

- `POST /api/v1/inventory/decay/run` manually runs dead-stock discount logic.
- Cron job runs daily at 02:00 when `RUN_JOBS=true`.

### Background Email Queue

- Email verification, password reset, transfer completed, order confirmed, and low stock alerts are queued to Redis.
- Worker processes email jobs asynchronously so API endpoints do not block on provider response.
- `GET /api/v1/jobs/email` shows queued/completed/failed jobs.
- `POST /api/v1/jobs/email/process-next` manually processes one email job for defense.

## Pagination

List endpoints accept:

```text
?limit=20&offset=0
```

Response format:

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

## Error Handling

Standardized error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "body.email: Invalid email"
  }
}
```

Status codes: `400`, `401`, `403`, `404`, `409`, `422`, `500`.

## Defense Demo Checklist

Open Thunder Client/Postman tabs before defense:

1. Register admin
2. Verify email
3. Login admin
4. Auth me
5. Refresh token
6. Create manager via `/users`
7. Create locations
8. Create SKU
9. Receive inventory
10. Transfer inventory
11. List inventory after transfer
12. Create reservation
13. Confirm reservation
14. Record sales
15. Forecast reorder point
16. Apply forecast
17. Run dead stock decay
18. List audit logs
19. List email jobs
20. Logout

## Troubleshooting

### Docker engine error

Open Docker Desktop first, then run:

```powershell
docker ps
```

### Old `blogdb` appears

Remove global Windows variable:

```powershell
[Environment]::SetEnvironmentVariable("DATABASE_URL", $null, "User")
[Environment]::SetEnvironmentVariable("DATABASE_URL", $null, "Machine")
```

Close and reopen VS Code.

### npm timeout / wrong registry

```powershell
npm config set registry https://registry.npmjs.org/
npm config delete proxy
npm config delete https-proxy
npm cache clean --force
```

Also delete `C:\Users\123\.npmrc` if it contains old registry/proxy values.
