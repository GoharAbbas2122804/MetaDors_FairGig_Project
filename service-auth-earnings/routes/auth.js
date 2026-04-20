const express = require("express");
const {
  register,
  login,
  refreshToken,
  getCurrentUser,
  logout,
} = require("../controllers/auth");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.get("/me", verifyToken, getCurrentUser);

module.exports = router;
