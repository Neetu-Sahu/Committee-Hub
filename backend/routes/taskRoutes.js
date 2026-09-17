const express = require("express");
const Task = require("../models/Task");
const Committee = require("../models/Committee");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route  GET /api/tasks
// @desc   List tasks/issues (Everyone can view; Chairperson sees raised status; others read-only)
router.get("/", protect, async (req, res) => {
  try {
    const { role, assignedCommittee, headOf } = req.user;
    const filter = {};

    if (role === "admin" || role === "faculty_advisor") {
      if (req.query.committee) filter.committee = req.query.committee;
      if (req.query.status) filter.status = req.query.status;
    } else if (role === "chairperson" || role === "committee_head") {
      // Chairperson can see all tasks, with focus on their committee's raised issues
      if (req.query.committee) filter.committee = req.query.committee;
    } else {
      // Coordinators, members, students have read-only view of tasks/issues
      if (req.query.committee) filter.committee = req.query.committee;
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email branch year avatarUrl role")
      .populate("assignedBy", "name email role")
      .populate("committee", "name category logoUrl")
      .populate("facilityIssue", "title facility location urgency status")
      .populate("resolvedBy", "name role")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks", error: err.message });
  }
});

// @route  POST /api/tasks
// @desc   Raise a task or issue (Only Chairperson and Admin can raise; other roles cannot)
router.post("/", protect, async (req, res) => {
  try {
    const isChairperson = req.user.role === "chairperson" || req.user.role === "committee_head";
    const isAdmin = req.user.role === "admin" || req.user.role === "faculty_advisor";

    if (!isChairperson && !isAdmin) {
      return res.status(403).json({
        message: "Forbidden: Only the Committee Chairperson can raise a task or issue for administration.",
      });
    }

    const { title, description, urgency, dueDate, committeeId, facilityIssueId, assignedTo } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Task/Issue title is required" });
    }

    let targetCommitteeId = committeeId;
    if (isChairperson) {
      targetCommitteeId = req.user.assignedCommittee || req.user.headOf || committeeId;
    }

    const task = await Task.create({
      committee: targetCommitteeId || null,
      facilityIssue: facilityIssueId || null,
      taskType: facilityIssueId ? "facility_resolution" : "committee_task",
      title,
      description: description || "",
      urgency: urgency || "medium",
      assignedTo: assignedTo || null,
      assignedBy: req.user._id,
      dueDate: dueDate || null,
      status: "pending",
    });

    const populated = await Task.findById(task._id)
      .populate("assignedTo", "name email branch year")
      .populate("assignedBy", "name email role")
      .populate("committee", "name category")
      .populate("facilityIssue", "title facility location urgency status");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to raise task", error: err.message });
  }
});

// @route  PUT /api/tasks/:id
// @desc   Mark task as done or pending / resolution (Strictly Admin only)
router.put("/:id", protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin" || req.user.role === "faculty_advisor";

    if (!isAdmin) {
      return res.status(403).json({
        message: "Forbidden: Only System Administrators can mark tasks as done, in-progress, or pending.",
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const { status, resolutionNotes, submission } = req.body;

    if (status) {
      task.status = status;
      if (status === "completed") {
        task.resolvedAt = new Date();
        task.resolvedBy = req.user._id;
      } else {
        task.resolvedAt = null;
        task.resolvedBy = null;
      }
    }

    if (resolutionNotes !== undefined) {
      task.resolutionNotes = resolutionNotes;
    }

    if (submission !== undefined) {
      task.submission = submission;
      task.submissionDate = new Date();
    }

    await task.save();

    const updated = await Task.findById(task._id)
      .populate("assignedTo", "name email branch year")
      .populate("assignedBy", "name email role")
      .populate("committee", "name category")
      .populate("facilityIssue", "title facility location urgency status")
      .populate("resolvedBy", "name role");

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update task status", error: err.message });
  }
});

// @route  DELETE /api/tasks/:id
// @desc   Delete task (Strictly Admin only)
router.delete("/:id", protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin" || req.user.role === "faculty_advisor";
    if (!isAdmin) {
      return res.status(403).json({ message: "Forbidden: Only administrators can delete tasks." });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    await task.deleteOne();
    res.json({ message: "Task removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete task", error: err.message });
  }
});

module.exports = router;
