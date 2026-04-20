const mongoose = require("mongoose");

const demographicsSchema = new mongoose.Schema(
  {
    cityZone: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ["worker", "verifier", "advocate"],
      required: true,
    },
    demographics: {
      type: demographicsSchema,
      default: {},
    },
  },
  { timestamps: true, collection: "users" }
);

module.exports = mongoose.model("User", userSchema);
