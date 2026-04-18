# service-analytics

Microservice for analytics generation.

## Environment

Create a `.env` file (or copy `.env.example`) and set:

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
MONGO_DB_NAME=fairgig
ANON_SALT=change_this_salt_in_production
```

## Running locally

```bash
uvicorn main:app --reload --port 8002
```
