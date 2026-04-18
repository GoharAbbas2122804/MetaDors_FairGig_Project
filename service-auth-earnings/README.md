# service-auth-earnings

Microservice for authentication and earnings processing.

## Environment

Create a `.env` file (or copy `.env.example`) and set:

```bash
PORT=5001
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
MONGODB_URI_FALLBACK=mongodb://<username>:<password>@<shard-00-00-host>:27017,<shard-00-01-host>:27017,<shard-00-02-host>:27017/<database>?authSource=admin&replicaSet=<replica-set-name>&tls=true&retryWrites=true&w=majority
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
```

If signup still fails on another machine, verify Atlas Network Access includes that machine's public IP.
