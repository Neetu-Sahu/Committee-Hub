const express = require("express");
const Winner = require("../models/Winner");
const Committee = require("../models/Committee");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route  GET /api/winners
// @desc   Hall of Fame feed, optional ?committee=id&year=2026
router.get("/", protect, async (req, res) => {
  try {
    const { committee, year } = req.query;
    const filter = {};
    if (committee) filter.committee = committee;
    if (year) filter.year = Number(year);

    const winners = await Winner.find(filter)
      .populate("committee", "name logoUrl category")
      .populate("student", "name avatarUrl")
      .sort({ year: -1, createdAt: -1 })
      .limit(200);
    res.json(winners);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch winners", error: err.message });
  }
});

// @route  POST /api/winners
router.post("/", protect, async (req, res) => {
  try {
    const { committeeId, eventId, studentId, studentName, achievement, year, photoUrl } = req.body;
    if (!committeeId || !studentName || !achievement || !year) {
      return res
        .status(400)
        .json({ message: "committeeId, studentName, achievement and year are required" });
    }

    const committee = await Committee.findById(committeeId);
    if (!committee) return res.status(404).json({ message: "Committee not found" });

    const isAllowed =
      ["admin", "faculty_advisor"].includes(req.user.role) ||
      String(req.user.headOf) === String(committee._id);
    if (!isAllowed) return res.status(403).json({ message: "Forbidden" });

    const winner = await Winner.create({
      committee: committeeId,
      event: eventId || null,
      student: studentId || null,
      studentName,
      achievement,
      year,
      photoUrl,
      createdBy: req.user._id,
    });

    res.status(201).json(winner);
  } catch (err) {
    res.status(500).json({ message: "Failed to add winner", error: err.message });
  }
});

module.exports = router;
