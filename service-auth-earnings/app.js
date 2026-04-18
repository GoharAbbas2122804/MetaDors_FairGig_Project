const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const earningsRoutes = require("./routes/earnings");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();

const PRIMARY_MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/fairgig";
const FALLBACK_MONGODB_URI = process.env.MONGODB_URI_FALLBACK;

async function connectMongoWithFallback() {
  try {
    await mongoose.connect(PRIMARY_MONGODB_URI);
    console.log(`Connected to MongoDB (primary URI): ${PRIMARY_MONGODB_URI}`);
    return;
  } catch (primaryError) {
    if (!FALLBACK_MONGODB_URI) {
      throw primaryError;
    }

    console.warn(
      `Primary MongoDB connection failed (${primaryError.message}). Trying fallback URI...`
    );
    await mongoose.connect(FALLBACK_MONGODB_URI);
    console.log(`Connected to MongoDB (fallback URI): ${FALLBACK_MONGODB_URI}`);
  }
}

connectMongoWithFallback().catch((error) => {
  console.error("MongoDB connection error:", error.message);
  process.exit(1);
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "auth-earnings" });
});

app.use("/api/auth", authRoutes);
app.use("/api/earnings", earningsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({
    message: error.message || "Internal server error.",
  });
});

module.exports = app;
