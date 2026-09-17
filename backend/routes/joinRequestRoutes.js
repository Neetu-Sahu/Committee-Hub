const express = require("express");
const JoinRequest = require("../models/JoinRequest");
const Committee = require("../models/Committee");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route  POST /api/join-requests
// @desc   A student/fresher requests to join a committee (self-service)
router.post("/", protect, async (req, res) => {
  try {
    if (req.user.role === "admin" || req.user.role === "faculty_advisor") {
      return res.status(403).json({
        message: "Administrators do not request to join committees. Administrators oversee institutional governance.",
      });
    }

    const { committeeId, message } = req.body;
    if (!committeeId) return res.status(400).json({ message: "committeeId is required" });

    const committee = await Committee.findById(committeeId);
    if (!committee) return res.status(404).json({ message: "Committee not found" });

    if (committee.members.some((m) => String(m) === String(req.user._id))) {
      return res.status(409).json({ message: "You are already a member of this committee" });
    }

    const request = await JoinRequest.create({
      student: req.user._id,
      committee: committeeId,
      message: message || "",
    });

    res.status(201).json(request);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "You already have a pending/approved request for this committee" });
    }
    res.status(500).json({ message: "Failed to submit join request", error: err.message });
  }
});

// @route  GET /api/join-requests/my
// @desc   Student tracks their own committee join application status
router.get("/my", protect, async (req, res) => {
  try {
    const requests = await JoinRequest.find({ student: req.user._id })
      .populate("committee", "name category logoUrl description")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch your applications", error: err.message });
  }
});

// @route  GET /api/join-requests/all
// @desc   System Admin views all join requests platform-wide
router.get("/all", protect, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only administrators can view all requests" });
  }
  try {
    const requests = await JoinRequest.find({})
      .populate("student", "name email branch year interests skills")
      .populate("committee", "name category")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch requests", error: err.message });
  }
});

// @route  GET /api/join-requests/committee/:committeeId
// @desc   Committee chairperson views pending requests for their committee
router.get("/committee/:committeeId", protect, async (req, res) => {
  const committee = await Committee.findById(req.params.committeeId);
  if (!committee) return res.status(404).json({ message: "Committee not found" });

  const isAllowed =
    ["admin", "faculty_advisor"].includes(req.user.role) ||
    String(req.user.headOf) === String(committee._id) ||
    String(req.user.assignedCommittee) === String(committee._id) ||
    String(committee.chairperson) === String(req.user._id) ||
    String(committee.head) === String(req.user._id);
  if (!isAllowed) return res.status(403).json({ message: "Forbidden" });

  const requests = await JoinRequest.find({ committee: req.params.committeeId })
    .populate("student", "name email branch year interests skills")
    .sort({ createdAt: -1 });
  res.json(requests);
});

// @route  PUT /api/join-requests/:id/approve
router.put("/:id/approve", protect, async (req, res) => {
  const request = await JoinRequest.findById(req.params.id).populate("committee");
  if (!request) return res.status(404).json({ message: "Request not found" });

  const committee = request.committee;
  const isAllowed =
    ["admin", "faculty_advisor"].includes(req.user.role) ||
    String(req.user.headOf) === String(committee._id) ||
    String(req.user.assignedCommittee) === String(committee._id) ||
    String(committee.chairperson) === String(req.user._id) ||
    String(committee.head) === String(req.user._id);
  if (!isAllowed) return res.status(403).json({ message: "Forbidden" });

  request.status = "approved";
  request.reviewedBy = req.user._id;
  await request.save();

  await Committee.findByIdAndUpdate(committee._id, {
    $addToSet: { members: request.student },
  });

  // Promote student to member role and set their assignedCommittee
  await User.findByIdAndUpdate(request.student, {
    $addToSet: { committees: committee._id },
    role: "member",
    assignedCommittee: committee._id,
  });

  res.json(request);
});

// @route  PUT /api/join-requests/:id/reject
router.put("/:id/reject", protect, async (req, res) => {
  const request = await JoinRequest.findById(req.params.id).populate("committee");
  if (!request) return res.status(404).json({ message: "Request not found" });

  const committee = request.committee;
  const isAllowed =
    ["admin", "faculty_advisor"].includes(req.user.role) ||
    String(req.user.headOf) === String(committee._id) ||
    String(req.user.assignedCommittee) === String(committee._id) ||
    String(committee.chairperson) === String(req.user._id) ||
    String(committee.head) === String(req.user._id);
  if (!isAllowed) return res.status(403).json({ message: "Forbidden" });

  request.status = "rejected";
  request.reviewedBy = req.user._id;
  await request.save();
  res.json(request);
});

module.exports = router;
