const mongoose = require("mongoose");

const grievanceSchema = new mongoose.Schema(
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
    clusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grievance",
      default: null,
    },
  },
  { timestamps: true }
);

grievanceSchema.statics.findAnonymized = function findAnonymized(filter = {}) {
  return this.find(filter).select("-workerId");
};

module.exports = mongoose.model("Grievance", grievanceSchema);
