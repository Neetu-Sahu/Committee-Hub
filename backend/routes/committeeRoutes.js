const express = require("express");
const Committee = require("../models/Committee");
const User = require("../models/User");
const { protect, authorize, optionalAuth } = require("../middleware/auth");
const { rankCommitteesForUser } = require("../utils/matchScore");

const router = express.Router();

// Helper to check committee leadership access
function isCommitteeLeader(user, committee) {
  if (user.role === "admin") return true;
  const commId = String(committee._id || committee);
  if (user.role === "chairperson" || user.role === "committee_head") {
    return (
      String(user.assignedCommittee) === commId ||
      String(user.headOf) === commId ||
      String(committee.chairperson) === String(user._id) ||
      String(committee.head) === String(user._id)
    );
  }
  return false;
}

// @route  GET /api/committees
// @desc   Directory of all committees. If the logged-in user is a student/fresher,
//         attach a matchScore and sort recommended-first.
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { status: "active" };
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const committees = await Committee.find(filter)
      .populate("chairperson", "name email avatarUrl branch year")
      .populate("coordinators", "name email avatarUrl branch year")
      .populate("head", "name email")
      .populate("facultyAdvisor", "name email")
      .lean();

    const withCounts = committees.map((c) => ({
      ...c,
      memberCount: c.members ? c.members.length : 0,
      coordinatorCount: c.coordinators ? c.coordinators.length : 0,
    }));

    if (req.user) {
      const ranked = rankCommitteesForUser(req.user, withCounts);
      return res.json(
        ranked.map((r) => ({
          ...r.committee,
          matchScore: r.score,
          recommended: r.score > 0,
        }))
      );
    }

    // Public / unauthenticated view (e.g. registration page)
    res.json(
      withCounts.map((c) => ({
        ...c,
        matchScore: 0,
        recommended: false,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch committees", error: err.message });
  }
});

// @route  GET /api/committees/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const committee = await Committee.findById(req.params.id)
      .populate("chairperson", "name email avatarUrl branch year")
      .populate("coordinators", "name email avatarUrl branch year")
      .populate("head", "name email avatarUrl")
      .populate("facultyAdvisor", "name email")
      .populate("members", "name email branch year avatarUrl role");
    if (!committee) return res.status(404).json({ message: "Committee not found" });
    res.json(committee);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch committee", error: err.message });
  }
});

// @route  POST /api/committees
// @desc   Create a new committee (admin only)
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, category, description, logoUrl, tags, chairpersonId, headId } = req.body;
    if (!name || !description) {
      return res.status(400).json({ message: "Name and description are required" });
    }

    const assignedChair = chairpersonId || headId || null;

    const committee = await Committee.create({
      name,
      category,
      description,
      logoUrl: logoUrl || "",
      tags: (tags || []).map((t) => t.toLowerCase().trim()),
      chairperson: assignedChair,
      head: assignedChair,
      members: assignedChair ? [assignedChair] : [],
    });

    if (assignedChair) {
      await User.findByIdAndUpdate(assignedChair, {
        role: "chairperson",
        assignedCommittee: committee._id,
        headOf: committee._id,
        $addToSet: { committees: committee._id },
      });
    }

    res.status(201).json(committee);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A committee with this name already exists" });
    }
    res.status(500).json({ message: "Failed to create committee", error: err.message });
  }
});

// @route  PUT /api/committees/:id
// @desc   Update committee details
router.put("/:id", protect, async (req, res) => {
  try {
    const committee = await Committee.findById(req.params.id);
    if (!committee) return res.status(404).json({ message: "Committee not found" });

    if (!isCommitteeLeader(req.user, committee)) {
      return res.status(403).json({ message: "Forbidden: Not authorized to manage this committee" });
    }

    const editable = ["description", "logoUrl", "tags", "category"];
    if (req.user.role === "admin") {
      editable.push("name", "status");
    }

    for (const key of editable) {
      if (req.body[key] !== undefined) committee[key] = req.body[key];
    }
    await committee.save();
    res.json(committee);
  } catch (err) {
    res.status(500).json({ message: "Failed to update committee", error: err.message });
  }
});

// @route  POST /api/committees/:id/coordinators
// @desc   Appoint a coordinator (Chairperson or Admin)
router.post("/:id/coordinators", protect, async (req, res) => {
  try {
    const committee = await Committee.findById(req.params.id);
    if (!committee) return res.status(404).json({ message: "Committee not found" });

    if (!isCommitteeLeader(req.user, committee)) {
      return res.status(403).json({ message: "Only chairperson or admin can appoint coordinators" });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update committee coordinators and members
    await Committee.findByIdAndUpdate(committee._id, {
      $addToSet: { coordinators: user._id, members: user._id },
    });

    // Update user role to coordinator
    await User.findByIdAndUpdate(user._id, {
      role: "coordinator",
      assignedCommittee: committee._id,
      $addToSet: { committees: committee._id },
    });

    res.json({ message: `Assigned ${user.name} as Coordinator` });
  } catch (err) {
    res.status(500).json({ message: "Failed to add coordinator", error: err.message });
  }
});

// @route  DELETE /api/committees/:id/coordinators/:userId
// @desc   Remove a coordinator (Chairperson or Admin)
router.delete("/:id/coordinators/:userId", protect, async (req, res) => {
  try {
    const committee = await Committee.findById(req.params.id);
    if (!committee) return res.status(404).json({ message: "Committee not found" });

    if (!isCommitteeLeader(req.user, committee)) {
      return res.status(403).json({ message: "Only chairperson or admin can remove coordinators" });
    }

    const targetUserId = req.params.userId;

    await Committee.findByIdAndUpdate(committee._id, {
      $pull: { coordinators: targetUserId },
    });

    // Revert user to member role
    await User.findByIdAndUpdate(targetUserId, {
      role: "member",
    });

    res.json({ message: "Coordinator removed and reverted to member" });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove coordinator", error: err.message });
  }
});

// @route  POST /api/committees/:id/members
// @desc   Directly add member (Chairperson or Admin)
router.post("/:id/members", protect, async (req, res) => {
  try {
    const committee = await Committee.findById(req.params.id);
    if (!committee) return res.status(404).json({ message: "Committee not found" });

    if (!isCommitteeLeader(req.user, committee)) {
      return res.status(403).json({ message: "Only chairperson or admin can add members" });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    await Committee.findByIdAndUpdate(committee._id, {
      $addToSet: { members: userId },
    });

    await User.findByIdAndUpdate(userId, {
      role: "member",
      assignedCommittee: committee._id,
      $addToSet: { committees: committee._id },
    });

    res.json({ message: "Member added successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to add member", error: err.message });
  }
});

// @route  DELETE /api/committees/:id/members/:userId
// @desc   Remove member (Chairperson or Admin)
router.delete("/:id/members/:userId", protect, async (req, res) => {
  try {
    const committee = await Committee.findById(req.params.id);
    if (!committee) return res.status(404).json({ message: "Committee not found" });

    if (!isCommitteeLeader(req.user, committee)) {
      return res.status(403).json({ message: "Only chairperson or admin can remove members" });
    }

    const targetUserId = req.params.userId;

    // Remove from members and coordinators
    await Committee.findByIdAndUpdate(committee._id, {
      $pull: { members: targetUserId, coordinators: targetUserId },
    });

    await User.findByIdAndUpdate(targetUserId, {
      role: "student",
      assignedCommittee: null,
      $pull: { committees: committee._id },
    });

    res.json({ message: "Member removed from committee" });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove member", error: err.message });
  }
});

// @route  DELETE /api/committees/:id
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  await Committee.findByIdAndUpdate(req.params.id, { status: "archived" });
  res.json({ message: "Committee archived" });
});

module.exports = router;
