const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const JWT_SECRET = process.env.JWT_SECRET || "change-me-access-secret";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "change-me-refresh-secret";

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

async function register(req, res, next) {
  try {
    const { email, password, role, demographics } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "email, password, and role are required.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      passwordHash,
      role,
      demographics,
    });

    return res.status(201).json({
      message: "User registered successfully.",
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        demographics: user.demographics,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function refreshToken(req, res, next) {
  try {
    const { refreshToken: tokenFromBody } = req.body;
    if (!tokenFromBody) {
      return res.status(400).json({ message: "refreshToken is required." });
    }

    const payload = jwt.verify(tokenFromBody, JWT_REFRESH_SECRET);
    const user = await User.findById(payload._id);
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token." });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired refresh token." });
    }
    return next(error);
  }
}

module.exports = {
  register,
  login,
  refreshToken,
};
