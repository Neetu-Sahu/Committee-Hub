const mongoose = require("mongoose");

const facilityIssueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    facility: {
      type: String,
      enum: [
        "Auditorium",
        "Computer Labs",
        "Sports Complex & Grounds",
        "Library",
        "Classrooms & Projectors",
        "Hostel & Mess",
        "Campus Wi-Fi / Network",
        "Other",
      ],
      default: "Other",
    },
    location: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    urgency: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
    assignedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    resolutionNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FacilityIssue", facilityIssueSchema);
