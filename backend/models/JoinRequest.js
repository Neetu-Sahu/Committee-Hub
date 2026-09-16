const mongoose = require("mongoose");

const joinRequestSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    committee: { type: mongoose.Schema.Types.ObjectId, ref: "Committee", required: true },
    message: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// A student can only have one active (pending/approved) request per committee
joinRequestSchema.index({ student: 1, committee: 1 }, { unique: true });

module.exports = mongoose.model("JoinRequest", joinRequestSchema);
