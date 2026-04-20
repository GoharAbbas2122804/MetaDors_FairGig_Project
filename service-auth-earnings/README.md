# service-auth-earnings

Microservice for authentication and earnings processing.

## Environment

Create a `.env` file (or copy `.env.example`) and set:

```bash
PORT=5001
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
MONGODB_URI_FALLBACK=mongodb://<username>:<password>@<shard-00-00-host>:27017,<shard-00-01-host>:27017,<shard-00-02-host>:27017/<database>?authSource=admin&replicaSet=<replica-set-name>&tls=true&retryWrites=true&w=majority
MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
FRONTEND_ORIGINS=http://localhost:5173,http://192.168.1.100:5173
AUTH_ACCESS_COOKIE_NAME=fairgig_access_token
AUTH_REFRESH_COOKIE_NAME=fairgig_refresh_token
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAME_SITE=lax
AUTH_COOKIE_DOMAIN=
JWT_SECRET=<single-line-secret>
JWT_REFRESH_SECRET=<single-line-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Use `MONGODB_URI_FALLBACK` if your machine fails SRV DNS lookup (`querySrv ECONNREFUSED`).

## Running locally

```bash
npm install
npm run dev
npm test
```

If signup still fails on another machine, verify Atlas Network Access includes that machine's public IP.

`npm run dev` uses `nodemon.json`, so the service restarts automatically when you change `index.js`, `app.js`, files in `controllers/`, `routes/`, `middleware/`, `models/`, `.env`, or `../shared/auth.js`.

## Auth API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Sessions are now stored in `httpOnly` cookies instead of returning tokens to the browser.
`register` accepts `email`, `password`, `role`, optional `fullName`, and optional `demographics.cityZone`.
Passwords must be at least 8 characters long and include uppercase, lowercase, and a number. Roles are limited to `worker`, `verifier`, and `advocate`.
