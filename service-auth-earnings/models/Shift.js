const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    hours: {
      type: Number,
      required: true,
      min: 0,
    },
    gross: {
      type: Number,
      required: true,
      min: 0,
    },
    deductions: {
      type: Number,
      required: true,
      min: 0,
    },
    net: {
      type: Number,
      required: true,
      min: 0,
    },
    screenshotUrl: {
      type: String,
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "confirmed", "flagged", "unverifiable"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shift", shiftSchema);
