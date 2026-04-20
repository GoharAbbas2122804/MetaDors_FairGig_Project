const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
  quiet: true,
});

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const earningsRoutes = require("./routes/earnings");
const { buildCorsOptions } = require("../shared/auth");

const app = express();

const PRIMARY_MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/fairgig";
const FALLBACK_MONGODB_URI = process.env.MONGODB_URI_FALLBACK;
const MONGO_CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: Number(
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000
  ),
};
let activeMongoUriLabel = null;

function getMongoStatus() {
  const statusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return statusMap[mongoose.connection.readyState] || "unknown";
}

async function connectMongoWithFallback() {
  if (mongoose.connection.readyState === 1) {
    return activeMongoUriLabel || "primary";
  }

  try {
    await mongoose.connect(PRIMARY_MONGODB_URI, MONGO_CONNECT_OPTIONS);
    activeMongoUriLabel = "primary";
    console.log("Connected to MongoDB using the primary database URI.");
    return activeMongoUriLabel;
  } catch (primaryError) {
    if (!FALLBACK_MONGODB_URI) {
      throw primaryError;
    }

    console.warn(
      `Primary MongoDB connection failed (${primaryError.message}). Trying fallback database URI...`
    );
    await mongoose.connect(FALLBACK_MONGODB_URI, MONGO_CONNECT_OPTIONS);
    activeMongoUriLabel = "fallback";
    console.log("Connected to MongoDB using the fallback database URI.");
    return activeMongoUriLabel;
  }
}

app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/health", (req, res) => {
  const mongoStatus = getMongoStatus();

  res.json({
    status: mongoStatus === "connected" ? "ok" : "degraded",
    service: "auth-earnings",
    database: {
      status: mongoStatus,
      message:
        mongoStatus === "connected"
          ? "Connected to MongoDB."
          : "MongoDB connection is not ready yet.",
      uriType: activeMongoUriLabel,
    },
  });
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

module.exports = {
  app,
  connectMongoWithFallback,
  getMongoStatus,
};
