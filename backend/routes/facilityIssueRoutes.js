const express = require("express");
const FacilityIssue = require("../models/FacilityIssue");
const Task = require("../models/Task");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route  POST /api/facility-issues
// @desc   Anyone (student, member, chairperson, etc.) can report a facility problem
router.post("/", protect, async (req, res) => {
  try {
    const { title, facility, location, description, urgency } = req.body;
    if (!title || !location || !description) {
      return res.status(400).json({ message: "Title, location, and description are required" });
    }

    const issue = await FacilityIssue.create({
      title,
      facility: facility || "Other",
      location,
      description,
      urgency: urgency || "medium",
      reportedBy: req.user._id,
      status: "open",
    });

    const populated = await FacilityIssue.findById(issue._id).populate(
      "reportedBy",
      "name email branch year role"
    );

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to report facility issue", error: err.message });
  }
});

// @route  GET /api/facility-issues
// @desc   Admin views all issues; other users can view their own reported issues
router.get("/", protect, async (req, res) => {
  try {
    const { role } = req.user;
    let query = {};
    if (role !== "admin" && role !== "faculty_advisor") {
      query.reportedBy = req.user._id;
    }

    const issues = await FacilityIssue.find(query)
      .populate("reportedBy", "name email branch year role")
      .populate({
        path: "assignedTask",
        populate: { path: "assignedTo", select: "name email role branch year" },
      })
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch facility issues", error: err.message });
  }
});

// @route  POST /api/facility-issues/:id/assign-task
// @desc   Admin assigns a task to resolve a facility issue
router.post("/:id/assign-task", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty_advisor") {
      return res.status(403).json({ message: "Only administrators can assign facility resolution tasks" });
    }

    const issue = await FacilityIssue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Facility issue not found" });

    const { taskTitle, assignedToUserId, dueDate, taskDescription } = req.body;
    if (!assignedToUserId) {
      return res.status(400).json({ message: "Assignee user ID is required" });
    }

    const assignee = await User.findById(assignedToUserId);
    if (!assignee) return res.status(404).json({ message: "Assigned user not found" });

    const task = await Task.create({
      title: taskTitle || `Resolve Facility Issue: ${issue.title} (${issue.location})`,
      description:
        taskDescription ||
        `Urgency: ${issue.urgency.toUpperCase()}. Facility: ${issue.facility}. Location: ${issue.location}. Issue details: ${issue.description}`,
      assignedTo: assignee._id,
      assignedBy: req.user._id,
      dueDate: dueDate || null,
      taskType: "facility_resolution",
      facilityIssue: issue._id,
      status: "in_progress",
    });

    issue.assignedTask = task._id;
    issue.status = "in_progress";
    await issue.save();

    const updatedIssue = await FacilityIssue.findById(issue._id)
      .populate("reportedBy", "name email branch year role")
      .populate({
        path: "assignedTask",
        populate: { path: "assignedTo", select: "name email role branch year" },
      });

    res.status(201).json({ message: "Resolution task created & assigned", issue: updatedIssue, task });
  } catch (err) {
    res.status(500).json({ message: "Failed to assign facility task", error: err.message });
  }
});

// @route  PUT /api/facility-issues/:id/status
// @desc   Admin updates status and resolution notes
router.put("/:id/status", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty_advisor") {
      return res.status(403).json({ message: "Only administrators can update facility issue status" });
    }

    const { status, resolutionNotes } = req.body;
    const issue = await FacilityIssue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Facility issue not found" });

    if (status) issue.status = status;
    if (resolutionNotes !== undefined) issue.resolutionNotes = resolutionNotes;

    if (status === "resolved" && issue.assignedTask) {
      await Task.findByIdAndUpdate(issue.assignedTask, { status: "completed" });
    }

    await issue.save();

    const updated = await FacilityIssue.findById(issue._id)
      .populate("reportedBy", "name email branch year role")
      .populate({
        path: "assignedTask",
        populate: { path: "assignedTo", select: "name email role branch year" },
      });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update facility issue", error: err.message });
  }
});

module.exports = router;
