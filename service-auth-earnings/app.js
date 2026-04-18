require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const earningsRoutes = require("./routes/earnings");
const path = require("path");

const app = express();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/fairgig";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(`Connected to MongoDB at ${MONGODB_URI}`);
  })
  .catch((error) => {
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
