const express = require("express");
const Suggestion = require("../models/Suggestion");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route  POST /api/suggestions
// @desc   Freshers and students submit ideas/suggestions for new committees or activities
router.post("/", protect, async (req, res) => {
  try {
    const { title, category, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const suggestion = await Suggestion.create({
      student: req.user._id,
      title,
      category: category || "new_committee",
      description,
      status: "pending",
    });

    const populated = await Suggestion.findById(suggestion._id).populate(
      "student",
      "name email branch year role interests skills"
    );

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to submit suggestion", error: err.message });
  }
});

// @route  GET /api/suggestions
// @desc   Admin views all suggestions from freshers and students
router.get("/", protect, async (req, res) => {
  try {
    const { role } = req.user;
    let query = {};
    if (role !== "admin" && role !== "faculty_advisor") {
      query.student = req.user._id;
    }

    const suggestions = await Suggestion.find(query)
      .populate("student", "name email branch year role interests skills")
      .sort({ createdAt: -1 });

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch suggestions", error: err.message });
  }
});

// @route  PUT /api/suggestions/:id
// @desc   Admin updates suggestion status (reviewed, implemented) and notes
router.put("/:id", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "faculty_advisor") {
      return res.status(403).json({ message: "Only administrators can review suggestions" });
    }

    const { status, adminNotes } = req.body;
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ message: "Suggestion not found" });

    if (status) suggestion.status = status;
    if (adminNotes !== undefined) suggestion.adminNotes = adminNotes;

    await suggestion.save();

    const updated = await Suggestion.findById(suggestion._id).populate(
      "student",
      "name email branch year role interests skills"
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update suggestion", error: err.message });
  }
});

module.exports = router;
