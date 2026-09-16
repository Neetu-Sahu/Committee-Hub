const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    committee: { type: mongoose.Schema.Types.ObjectId, ref: "Committee", default: null },
    facilityIssue: { type: mongoose.Schema.Types.ObjectId, ref: "FacilityIssue", default: null },
    taskType: {
      type: String,
      enum: ["committee_task", "facility_resolution"],
      default: "committee_task",
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    urgency: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    resolutionNotes: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    submission: { type: String, default: "" },
    submissionDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
