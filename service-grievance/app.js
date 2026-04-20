const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const grievanceRoutes = require("./routes/grievances");
const { buildCorsOptions } = require("../shared/auth");
const {
  applySecurityHeaders,
  redactMongoUri,
  sanitizeErrorForLog,
} = require("../shared/security");

const app = express();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/fairgig";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(`Connected to MongoDB (${redactMongoUri(MONGODB_URI)})`);
  })
  .catch((error) => {
    console.error("MongoDB connection error:", sanitizeErrorForLog(error));
    process.exit(1);
  });

app.disable("x-powered-by");
app.use(cors(buildCorsOptions()));
app.use(applySecurityHeaders);
app.use(express.json({ limit: "100kb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "grievance" });
});

app.use("/grievances", grievanceRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error, req, res, next) => {
  console.error("service-grievance error:", sanitizeErrorForLog(error));
  const status = error.status || 500;
  res.status(status).json({
    message: error.message || "Internal server error.",
  });
});

module.exports = app;
