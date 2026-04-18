# service-grievance

Microservice for grievance handling.

## Environment

Create a `.env` file (or copy `.env.example`) and set:

```bash
PORT=5002
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
JWT_SECRET=<same JWT_SECRET used in service-auth-earnings>
```

## Running locally

```bash
npm run dev
```
