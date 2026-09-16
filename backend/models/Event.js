const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    committee: { type: mongoose.Schema.Types.ObjectId, ref: "Committee", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    posterUrl: { type: String, default: "" },
    date: { type: Date, required: true },
    venue: { type: String, default: "" },
    registrationLink: { type: String, default: "" },
    assignedCoordinator: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    notice: { type: mongoose.Schema.Types.ObjectId, ref: "Notice", default: null },
    attendance: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        studentName: { type: String, default: "" },
        attended: { type: Boolean, default: true },
        markedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
