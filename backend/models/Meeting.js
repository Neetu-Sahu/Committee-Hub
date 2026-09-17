const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    agenda: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, default: "" },
    venue: { type: String, default: "Administration Conference Room" },
    meetingLink: { type: String, default: "" },
    targetCommittee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Committee",
      default: null, // null means institute-wide / all committee chairpersons
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meeting", meetingSchema);
