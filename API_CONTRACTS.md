# FairGig Inter-Service API Contracts

This document defines the REST integration contracts between FairGig services for local development.

## Base Service URLs

- Auth + Earnings (Node.js): `http://localhost:5001`
- Grievance (Node.js): `http://localhost:5002`
- Certificate (Node.js): `http://localhost:5003`
- Anomaly Detection (Python): `http://localhost:8001`
- Analytics (Python): `http://localhost:8002`

## Common Rules

- **Content type:** `application/json`
- **Auth:** Protected routes require `Authorization: Bearer <jwt>`
- **Resilience requirement:** If a secondary service is unavailable, primary service should return success for the core flow and include a non-fatal warning in logs or response metadata where relevant.

---

## 1) Login

- **Service:** Auth + Earnings
- **Endpoint:** `/auth/login`
- **Method:** `POST`
- **Payload (JSON):**

```json
{
  "email": "worker@example.com",
  "password": "plain-text-or-client-hashed-password"
}
```

- **Expected Response (200):**

```json
{
  "message": "Login successful.",
  "token": "jwt-token",
  "user": {
    "_id": "6800f7b9e21e07c61bead111",
    "name": "Amina Worker",
    "email": "worker@example.com",
    "role": "worker"
  }
}
```

- **Error Response (401/400):**

```json
{
  "message": "Invalid email or password."
}
```

---

## 2) Log Shift

- **Service:** Auth + Earnings
- **Endpoint:** `/log-shift` (alias of `/shift`)
- **Method:** `POST`
- **Payload (JSON):**

```json
{
  "platform": "RideFast",
  "date": "2026-04-18T08:30:00.000Z",
  "hours": 8,
  "gross": 120,
  "deductions": 18,
  "screenshotUrl": "https://example.com/shift-proof.png"
}
```

- **Inter-service behavior:** After validation, this route calls `POST http://localhost:8001/detect-anomalies`. If anomalies are returned, they are written to `shift.anomalyFlags` and shift is marked `verificationStatus: "flagged"`.
- **Offline fallback:** If anomaly service is down or times out, shift is still saved (without anomaly flags) and request succeeds.

- **Expected Response (201):**

```json
{
  "message": "Shift logged successfully.",
  "shift": {
    "_id": "6800fa12e21e07c61bead999",
    "workerId": "6800f7b9e21e07c61bead111",
    "platform": "RideFast",
    "date": "2026-04-18T08:30:00.000Z",
    "hours": 8,
    "gross": 120,
    "deductions": 18,
    "net": 102,
    "verificationStatus": "flagged",
    "anomalyFlags": [
      "hours_outlier",
      "deduction_spike"
    ]
  }
}
```

- **Error Response (400):**

```json
{
  "message": "platform, date, hours, gross, deductions are required."
}
```

---

## 3) Detect Anomaly

- **Service:** Anomaly Detection (Python)
- **Endpoint:** `/detect-anomalies`
- **Method:** `POST`
- **Payload (JSON):**

```json
{
  "shifts": [
    {
      "gross": 120,
      "deductions": 18,
      "net": 102,
      "hours": 8
    }
  ]
}
```

- **Expected Response (200):**

```json
[
  {
    "shift_index": 0,
    "type": "high_deductions",
    "human_readable_explanation": "Shift #1 deductions were 42.3% higher than your recent rolling average.",
    "metrics": {
      "current_deductions": 18,
      "rolling_avg_deductions": 12.65,
      "ratio": 1.423
    }
  }
]
```

- **Error Response (422/500):**

```json
{
  "message": "Unable to process anomaly detection request."
}
```

---

## 4) Add Grievance

- **Service:** Grievance
- **Endpoint:** `/grievances`
- **Method:** `POST`
- **Payload (JSON):**

```json
{
  "title": "Unfair account suspension",
  "description": "Platform suspended account without prior warning.",
  "category": "account",
  "shiftId": "6800fa12e21e07c61bead999"
}
```

- **Expected Response (201):**

```json
{
  "message": "Grievance submitted successfully.",
  "grievance": {
    "_id": "6800fb7de21e07c61beada22",
    "workerId": "6800f7b9e21e07c61bead111",
    "title": "Unfair account suspension",
    "description": "Platform suspended account without prior warning.",
    "category": "account",
    "status": "open"
  }
}
```

- **Error Response (400):**

```json
{
  "message": "title, description, and category are required."
}
```

---

## Service Offline/Error Handling Expectations

- Primary services must treat cross-service calls as **best-effort** unless required by business-critical validation.
- On `ECONNREFUSED`, timeout, or `5xx` from secondary service:
  - Keep core write operation successful where possible.
  - Log the failure with service name and correlation metadata.
  - Return a non-fatal warning field only when the client needs visibility.
- Use bounded timeout values (`3-5s`) for internal HTTP calls to prevent request pile-ups.
