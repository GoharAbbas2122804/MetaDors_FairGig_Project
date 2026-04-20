const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
process.env.JWT_REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "7d";
process.env.AUTH_COOKIE_SECURE = process.env.AUTH_COOKIE_SECURE || "false";
process.env.AUTH_COOKIE_SAME_SITE = process.env.AUTH_COOKIE_SAME_SITE || "lax";

const authController = require("../controllers/auth");
const { verifyToken, requireRole } = require("../middleware/auth");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const originalFns = {
  findOne: User.findOne,
  create: User.create,
  findById: User.findById,
  hash: bcrypt.hash,
  compare: bcrypt.compare,
  sign: jwt.sign,
  verify: jwt.verify,
};

let issuedTokenCount = 0;

function createMockRes() {
  let statusCode = 200;
  let body;

  return {
    cookies: [],
    clearedCookies: [],
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
    clearCookie(name, options) {
      this.clearedCookies.push({ name, options });
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

function createNextSpy() {
  const calls = [];
  const next = (error) => {
    calls.push(error);
  };

  next.calls = calls;
  return next;
}

function createFindByIdResult(value) {
  return {
    lean: async () => value,
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
    catch(reject) {
      return Promise.resolve(value).catch(reject);
    },
  };
}

function resetDoubles() {
  issuedTokenCount = 0;

  User.findOne = async () => null;
  User.create = async (payload) => ({
    _id: "user-123",
    ...payload,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  User.findById = () => createFindByIdResult(null);

  bcrypt.hash = async () => "hashed-password";
  bcrypt.compare = async () => true;

  jwt.sign = () => `token-${++issuedTokenCount}`;
  jwt.verify = () => ({ _id: "user-123", role: "worker" });
}

test.beforeEach(() => {
  resetDoubles();
});

test.after(() => {
  User.findOne = originalFns.findOne;
  User.create = originalFns.create;
  User.findById = originalFns.findById;
  bcrypt.hash = originalFns.hash;
  bcrypt.compare = originalFns.compare;
  jwt.sign = originalFns.sign;
  jwt.verify = originalFns.verify;
});

test("register creates a normalized user session and omits sensitive fields", async () => {
  let createdPayload;
  User.create = async (payload) => {
    createdPayload = payload;
    return {
      _id: "user-123",
      ...payload,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
  };

  const req = {
    body: {
      email: "  Demo.User@Example.com ",
      password: "StrongPass1",
      role: "WORKER",
      demographics: { cityZone: "  East  " },
    },
  };
  const res = createMockRes();
  const next = createNextSpy();

  await authController.register(req, res, next);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.message, "User registered successfully.");
  assert.equal(res.body.user.email, "demo.user@example.com");
  assert.equal(res.body.user.fullName, "Demo User");
  assert.equal(res.body.user.passwordHash, undefined);
  assert.equal(createdPayload.passwordHash, "hashed-password");
  assert.deepEqual(createdPayload.demographics, { cityZone: "East" });
  assert.equal(createdPayload.role, "worker");
  assert.equal(createdPayload.email, "demo.user@example.com");
  assert.equal(res.cookies.length, 2);
  assert.equal(next.calls.length, 0);
});

test("register rejects weak passwords", async () => {
  const req = {
    body: {
      email: "worker@example.com",
      password: "weakpass",
      role: "worker",
    },
  };
  const res = createMockRes();
  const next = createNextSpy();

  await authController.register(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Password must be at least 8 characters/);
  assert.equal(res.cookies.length, 0);
  assert.equal(next.calls.length, 0);
});

test("register returns conflict when the email already exists", async () => {
  User.findOne = async () => ({ _id: "existing-user" });

  const req = {
    body: {
      email: "worker@example.com",
      password: "StrongPass1",
      role: "worker",
    },
  };
  const res = createMockRes();

  await authController.register(req, res, createNextSpy());

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, "Email already registered.");
});

test("login issues a session when the password is correct", async () => {
  User.findOne = async ({ email }) => ({
    _id: "user-123",
    fullName: "Worker Example",
    email,
    passwordHash: "stored-hash",
    role: "worker",
    demographics: {},
  });

  const req = {
    body: {
      email: " WORKER@example.com ",
      password: "StrongPass1",
    },
  };
  const res = createMockRes();

  await authController.login(req, res, createNextSpy());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "Login successful.");
  assert.equal(res.body.user.email, "worker@example.com");
  assert.equal(res.cookies.length, 2);
});

test("login rejects invalid credentials", async () => {
  User.findOne = async () => ({
    _id: "user-123",
    passwordHash: "stored-hash",
    role: "worker",
  });
  bcrypt.compare = async () => false;

  const req = {
    body: {
      email: "worker@example.com",
      password: "WrongPass1",
    },
  };
  const res = createMockRes();

  await authController.login(req, res, createNextSpy());

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid credentials.");
  assert.equal(res.cookies.length, 0);
});

test("refresh-token clears cookies when the refresh token is missing", async () => {
  const req = { body: {}, headers: {} };
  const res = createMockRes();

  await authController.refreshToken(req, res, createNextSpy());

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Refresh session is missing.");
  assert.equal(res.clearedCookies.length, 2);
});

test("refresh-token returns a new session for a valid refresh token", async () => {
  User.findById = () =>
    createFindByIdResult({
      _id: "user-123",
      fullName: "Worker Example",
      email: "worker@example.com",
      role: "worker",
      demographics: {},
    });

  const req = {
    body: { refreshToken: "refresh-123" },
    headers: {},
  };
  const res = createMockRes();

  await authController.refreshToken(req, res, createNextSpy());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "Session refreshed.");
  assert.equal(res.cookies.length, 2);
});

test("refresh-token clears cookies when the token is expired", async () => {
  jwt.verify = () => {
    const error = new Error("expired");
    error.name = "TokenExpiredError";
    throw error;
  };

  const req = {
    body: { refreshToken: "expired-token" },
    headers: {},
  };
  const res = createMockRes();

  await authController.refreshToken(req, res, createNextSpy());

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid or expired refresh token.");
  assert.equal(res.clearedCookies.length, 2);
});

test("getCurrentUser returns the safe user payload", async () => {
  User.findById = () =>
    createFindByIdResult({
      _id: "user-123",
      fullName: "Worker Example",
      email: "worker@example.com",
      passwordHash: "secret",
      role: "worker",
      demographics: { cityZone: "East" },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

  const req = { user: { _id: "user-123" } };
  const res = createMockRes();

  await authController.getCurrentUser(req, res, createNextSpy());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.passwordHash, undefined);
  assert.equal(res.body.user.email, "worker@example.com");
});

test("getCurrentUser clears cookies when the user no longer exists", async () => {
  const req = { user: { _id: "missing-user" } };
  const res = createMockRes();

  await authController.getCurrentUser(req, res, createNextSpy());

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "User not found.");
  assert.equal(res.clearedCookies.length, 2);
});

test("logout clears the session cookies", async () => {
  const res = createMockRes();

  authController.logout({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "Logged out successfully.");
  assert.equal(res.clearedCookies.length, 2);
});

test("verifyToken accepts a valid bearer token", async () => {
  const req = {
    headers: {
      authorization: "Bearer access-token-123",
    },
  };
  const res = createMockRes();
  const next = createNextSpy();

  verifyToken(req, res, next);

  assert.deepEqual(req.user, { _id: "user-123", role: "worker" });
  assert.equal(next.calls.length, 1);
  assert.equal(next.calls[0], undefined);
});

test("verifyToken rejects expired access tokens", async () => {
  jwt.verify = () => {
    const error = new Error("expired");
    error.name = "TokenExpiredError";
    throw error;
  };

  const req = {
    headers: {
      authorization: "Bearer access-token-123",
    },
  };
  const res = createMockRes();

  verifyToken(req, res, createNextSpy());

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Token expired.");
});

test("requireRole blocks users without the right role", async () => {
  const req = { user: { _id: "user-123", role: "worker" } };
  const res = createMockRes();

  requireRole(["verifier"])(req, res, createNextSpy());

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Insufficient permissions.");
});
