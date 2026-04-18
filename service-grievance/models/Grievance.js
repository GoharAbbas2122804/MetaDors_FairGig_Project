const mongoose = require("mongoose");

const grievanceSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "escalated", "resolved"],
      default: "open",
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    clusterId: {
      type: String,
      default: null,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Grievance", grievanceSchema);
