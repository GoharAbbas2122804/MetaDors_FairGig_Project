const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  clearSessionCookies,
  extractRefreshToken,
  setSessionCookies,
} = require("../../shared/auth");

const ALLOWED_ROLES = new Set(["worker", "verifier", "advocate"]);
const MIN_PASSWORD_LENGTH = 8;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error(
    "[AUTH] Missing JWT_SECRET or JWT_REFRESH_SECRET. " +
      "Set both environment variables in service-auth-earnings/.env."
  );
  process.exit(1);
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

function normalizeFullName(fullName) {
  return typeof fullName === "string" ? fullName.trim().replace(/\s+/g, " ") : "";
}

function deriveFallbackFullName(email) {
  const localPart = email.split("@")[0] || "User";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function normalizeDemographics(demographics = {}) {
  if (!demographics || typeof demographics !== "object" || Array.isArray(demographics)) {
    return {};
  }

  const cityZone =
    typeof demographics.cityZone === "string" ? demographics.cityZone.trim() : "";

  return cityZone ? { cityZone } : {};
}

function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

function buildSafeUser(user) {
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    demographics: user.demographics || {},
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function buildSessionPayload(user) {
  return {
    user: buildSafeUser(user),
  };
}

function signAccessToken(user) {
  return jwt.sign({ _id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function signRefreshToken(user) {
  return jwt.sign({ _id: user._id, role: user.role }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

function createSessionTokens(user) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

async function register(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password =
      typeof req.body.password === "string" ? req.body.password : "";
    const role = normalizeRole(req.body.role);
    const fullNameInput = normalizeFullName(req.body.fullName);
    const demographics = normalizeDemographics(req.body.demographics);

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "email, password, and role are required.",
      });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({
        message: "role must be one of worker, verifier, advocate.",
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, and a number.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName: fullNameInput || deriveFallbackFullName(email),
      email,
      passwordHash,
      role,
      demographics,
    });
    const sessionTokens = createSessionTokens(user);
    setSessionCookies(res, sessionTokens);

    return res.status(201).json({
      message: "User registered successfully.",
      ...buildSessionPayload(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Email already registered." });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const sessionTokens = createSessionTokens(user);
    setSessionCookies(res, sessionTokens);

    return res.json({
      message: "Login successful.",
      ...buildSessionPayload(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function refreshAccessToken(req, res, next) {
  try {
    const refreshToken = extractRefreshToken(req);
    if (!refreshToken) {
      clearSessionCookies(res);
      return res.status(401).json({ message: "Refresh session is missing." });
    }

    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(payload._id);
    if (!user) {
      clearSessionCookies(res);
      return res.status(401).json({ message: "Invalid refresh token." });
    }

    const sessionTokens = createSessionTokens(user);
    setSessionCookies(res, sessionTokens);

    return res.json({
      message: "Session refreshed.",
      ...buildSessionPayload(user),
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      clearSessionCookies(res);
      return res.status(401).json({ message: "Invalid or expired refresh token." });
    }
    return next(error);
  }
}

async function getCurrentUser(req, res, next) {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      clearSessionCookies(res);
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ user: buildSafeUser(user) });
  } catch (error) {
    return next(error);
  }
}

function logout(req, res) {
  clearSessionCookies(res);
  return res.status(200).json({ message: "Logged out successfully." });
}

module.exports = {
  register,
  login,
  refreshToken: refreshAccessToken,
  getCurrentUser,
  logout,
};
