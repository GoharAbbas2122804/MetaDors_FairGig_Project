# service-grievance

Microservice for grievance handling.

This service requires a matching `JWT_SECRET` with the auth service so access tokens issued by `service-auth-earnings` can be validated.

## Setup

Copy `.env.example` to `.env`, then update the values below if needed:

```bash
PORT=5002
MONGODB_URI=mongodb://localhost:27017/fairgig
JWT_SECRET=replace_with_same_secret_as_auth_service
```

## Running locally

```bash
npm run dev
```
