const mongoose = require("mongoose");

const winnerSchema = new mongoose.Schema(
  {
    committee: { type: mongoose.Schema.Types.ObjectId, ref: "Committee", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    studentName: { type: String, required: true }, // fallback if not a registered user
    achievement: { type: String, required: true }, // e.g. "1st Prize - Hackfest 2026"
    year: { type: Number, required: true },
    photoUrl: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Winner", winnerSchema);
