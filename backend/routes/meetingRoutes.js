const express = require("express");
const Meeting = require("../models/Meeting");
const Committee = require("../models/Committee");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route  GET /api/meetings
// @desc   List meetings for Admin or Chairperson/Coordinator
router.get("/", protect, async (req, res) => {
  try {
    const { role, assignedCommittee, headOf, _id } = req.user;
    let query = {};

    if (role === "admin" || role === "faculty_advisor") {
      // Admin sees all meetings
      if (req.query.committee) query.targetCommittee = req.query.committee;
    } else if (role === "chairperson" || role === "coordinator" || role === "committee_head") {
      const commId = assignedCommittee || headOf;
      // Chairperson sees institute-wide meetings (targetCommittee: null) OR meetings targeted to their committee
      query = {
        $or: [{ targetCommittee: null }, { targetCommittee: commId }],
      };
    } else {
      // Students/members see institute-wide meetings
      query = { targetCommittee: null };
    }

    const meetings = await Meeting.find(query)
      .populate("targetCommittee", "name category logoUrl chairperson")
      .populate("createdBy", "name email role")
      .sort({ date: 1 });

    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch meetings", error: err.message });
  }
});

// @route  POST /api/meetings
// @desc   Schedule a meeting (Admin only)
router.post("/", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty_advisor") {
      return res.status(403).json({
        message: "Forbidden: Only System Administrators can schedule administrative meetings",
      });
    }

    const { title, agenda, date, time, venue, meetingLink, targetCommitteeId } = req.body;
    if (!title || !agenda || !date) {
      return res.status(400).json({ message: "Title, agenda, and date are required" });
    }

    let committee = null;
    if (targetCommitteeId) {
      committee = await Committee.findById(targetCommitteeId);
      if (!committee) return res.status(404).json({ message: "Selected committee not found" });
    }

    const meeting = await Meeting.create({
      title,
      agenda,
      date,
      time: time || "",
      venue: venue || "Administration Conference Room",
      meetingLink: meetingLink || "",
      targetCommittee: targetCommitteeId || null,
      createdBy: req.user._id,
      status: "scheduled",
    });

    const populated = await Meeting.findById(meeting._id)
      .populate("targetCommittee", "name category logoUrl")
      .populate("createdBy", "name email role");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to schedule meeting", error: err.message });
  }
});

// @route  PUT /api/meetings/:id
// @desc   Update meeting details or status (Admin only)
router.put("/:id", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty_advisor") {
      return res.status(403).json({ message: "Forbidden: Only administrators can modify meetings" });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const allowed = ["title", "agenda", "date", "time", "venue", "meetingLink", "status", "targetCommittee"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        meeting[key] = req.body[key];
      }
    }

    await meeting.save();
    const updated = await Meeting.findById(meeting._id)
      .populate("targetCommittee", "name category logoUrl")
      .populate("createdBy", "name email role");

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update meeting", error: err.message });
  }
});

// @route  DELETE /api/meetings/:id
// @desc   Cancel/delete meeting (Admin only)
router.delete("/:id", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty_advisor") {
      return res.status(403).json({ message: "Forbidden: Only administrators can cancel meetings" });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    await meeting.deleteOne();
    res.json({ message: "Meeting removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete meeting", error: err.message });
  }
});

module.exports = router;
