const express = require("express");
const Notice = require("../models/Notice");
const Committee = require("../models/Committee");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route  GET /api/notices
// @desc   Student-facing feed. Optional ?committee=id or ?mine=true
router.get("/", protect, async (req, res) => {
  try {
    const { committee, mine } = req.query;
    let filter = {};

    if (committee) {
      filter.committee = committee;
    } else if (mine === "true") {
      // User's committees + institute-wide notices
      filter = {
        $or: [
          { committee: { $in: req.user.committees || [] } },
          { isInstituteWide: true },
        ],
      };
    }

    const notices = await Notice.find(filter)
      .populate("committee", "name logoUrl category")
      .populate("createdBy", "name role")
      .sort({ pinned: -1, createdAt: -1 })
      .limit(100);
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notices", error: err.message });
  }
});

// @route  POST /api/notices
// @desc   Post a notice (Admin can post institute-wide or committee, Chairperson/Coordinator can post for their committee)
router.post("/", protect, async (req, res) => {
  try {
    const { committeeId, title, content, attachmentUrl, pinned, isInstituteWide } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    if (req.user.role === "admin" || req.user.role === "faculty_advisor") {
      return res.status(403).json({
        message: "Administrators do not post notices. Committee notices are published by committee chairpersons and coordinators.",
      });
    }

    let targetCommitteeId = committeeId || req.user.assignedCommittee || req.user.headOf;
    if (!targetCommitteeId) {
      return res.status(400).json({ message: "Committee ID is required for notices" });
    }

    const committee = await Committee.findById(targetCommitteeId);
    if (!committee) return res.status(404).json({ message: "Committee not found" });

    const isAllowed =
      (req.user.role === "chairperson" || req.user.role === "coordinator" || req.user.role === "committee_head") &&
      (String(req.user.assignedCommittee) === String(committee._id) ||
        String(req.user.headOf) === String(committee._id) ||
        String(committee.chairperson) === String(req.user._id) ||
        (committee.coordinators || []).some((c) => String(c) === String(req.user._id)));

    if (!isAllowed) {
      return res.status(403).json({ message: "You are not authorized to post notices for this committee" });
    }

    const notice = await Notice.create({
      committee: targetCommitteeId,
      isInstituteWide: false,
      title,
      content,
      attachmentUrl: attachmentUrl || "",
      pinned: !!pinned,
      createdBy: req.user._id,
    });

    const populated = await Notice.findById(notice._id)
      .populate("committee", "name logoUrl category")
      .populate("createdBy", "name role");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to create notice", error: err.message });
  }
});

// @route  DELETE /api/notices/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: "Notice not found" });

    const isAllowed =
      req.user.role === "admin" ||
      String(notice.createdBy) === String(req.user._id) ||
      (req.user.role === "chairperson" &&
        (String(req.user.assignedCommittee) === String(notice.committee) ||
          String(req.user.headOf) === String(notice.committee)));

    if (!isAllowed) return res.status(403).json({ message: "Forbidden" });

    await notice.deleteOne();
    res.json({ message: "Notice deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete notice", error: err.message });
  }
});

module.exports = router;
