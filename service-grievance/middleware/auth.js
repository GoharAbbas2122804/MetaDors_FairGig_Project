const jwt = require("jsonwebtoken");
const { extractAccessToken } = require("../../shared/auth");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error(
    "[AUTH] Missing JWT_SECRET. Set JWT_SECRET in service-grievance/.env or environment."
  );
  process.exit(1);
}

function verifyToken(req, res, next) {
  const token = extractAccessToken(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      _id: decoded._id,
      role: decoded.role,
    };
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired." });
    }
    return res.status(401).json({ message: "Invalid token." });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(403).json({ message: "Forbidden." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions." });
    }

    return next();
  };
}

module.exports = {
  verifyToken,
  requireRole,
};
