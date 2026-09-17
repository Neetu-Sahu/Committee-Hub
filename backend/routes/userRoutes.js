const express = require("express");
const User = require("../models/User");
const Committee = require("../models/Committee");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// @route  GET /api/users/me
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("assignedCommittee", "name category logoUrl")
    .populate("headOf", "name category logoUrl")
    .populate("committees", "name category logoUrl")
    .select("-password");
  res.json(user);
});

// @route  GET /api/users
// @desc   Admin retrieves all users to manage roles and assignments
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { search, role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .populate("assignedCommittee", "name category")
      .populate("headOf", "name category")
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

// @route  PUT /api/users/:id/role
// @desc   Admin assigns or changes a user's role and committee
router.put("/:id/role", protect, authorize("admin"), async (req, res) => {
  try {
    const { role, committeeId } = req.body;
    const validRoles = ["admin", "chairperson", "coordinator", "member", "student"];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(", ")}` });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role;

    if (["chairperson", "coordinator", "member"].includes(role)) {
      if (!committeeId) {
        return res.status(400).json({ message: "committeeId is required for this role" });
      }

      const committee = await Committee.findById(committeeId);
      if (!committee) return res.status(404).json({ message: "Committee not found" });

      user.assignedCommittee = committee._id;
      user.headOf = role === "chairperson" ? committee._id : null;
      if (!user.committees.includes(committee._id)) {
        user.committees.push(committee._id);
      }

      if (role === "chairperson") {
        committee.chairperson = user._id;
        committee.head = user._id;
        if (!committee.members.includes(user._id)) committee.members.push(user._id);
        await committee.save();
      } else if (role === "coordinator") {
        if (!committee.coordinators.includes(user._id)) committee.coordinators.push(user._id);
        if (!committee.members.includes(user._id)) committee.members.push(user._id);
        await committee.save();
      } else if (role === "member") {
        if (!committee.members.includes(user._id)) committee.members.push(user._id);
        await committee.save();
      }
    } else {
      user.assignedCommittee = null;
      user.headOf = null;
    }

    await user.save();

    const updated = await User.findById(user._id)
      .populate("assignedCommittee", "name category")
      .select("-password");

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update role", error: err.message });
  }
});

// @route  PUT /api/users/onboarding
// @desc   Fresher / Student submits interests/skills
router.put("/onboarding", protect, async (req, res) => {
  try {
    const { interests = [], skills = [] } = req.body;

    if (!Array.isArray(interests) || !Array.isArray(skills)) {
      return res.status(400).json({ message: "interests and skills must be arrays" });
    }

    const user = await User.findById(req.user._id);
    user.interests = interests.map((t) => t.toLowerCase().trim()).filter(Boolean);
    user.skills = skills.map((t) => t.toLowerCase().trim()).filter(Boolean);
    user.onboardingComplete = true;
    if (user.role === "fresher") user.role = "student";
    await user.save();

    res.json(user.toSafeObject());
  } catch (err) {
    res.status(500).json({ message: "Failed to save onboarding data", error: err.message });
  }
});

// @route  PUT /api/users/me
// @desc   Update basic profile fields
router.put("/me", protect, async (req, res) => {
  try {
    const allowed = ["name", "branch", "year", "avatarUrl", "interests", "skills"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile", error: err.message });
  }
});

// @route  GET /api/users/me/committees
router.get("/me/committees", protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate("committees");
  res.json(user.committees);
});

// @route  GET /api/users/authorized-chairpersons
// @desc   Admin views list of pre-authorized chairperson emails
router.get("/authorized-chairpersons", protect, authorize("admin"), async (req, res) => {
  try {
    const AuthorizedEmail = require("../models/AuthorizedEmail");
    const list = await AuthorizedEmail.find()
      .populate("committee", "name category")
      .populate("authorizedBy", "name email")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch authorized emails", error: err.message });
  }
});

// @route  POST /api/users/authorized-chairpersons
// @desc   Admin authorizes an email ID to sign up / log in as Chairperson for a committee
router.post("/authorized-chairpersons", protect, authorize("admin"), async (req, res) => {
  try {
    const AuthorizedEmail = require("../models/AuthorizedEmail");
    const { email, committeeId } = req.body;

    if (!email || !committeeId) {
      return res.status(400).json({ message: "Email and committeeId are required" });
    }

    const committee = await Committee.findById(committeeId);
    if (!committee) return res.status(404).json({ message: "Committee not found" });

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await AuthorizedEmail.findOne({ email: normalizedEmail });
    if (existing) {
      existing.committee = committee._id;
      existing.authorizedBy = req.user._id;
      existing.status = "pending";
      await existing.save();
      const populated = await AuthorizedEmail.findById(existing._id).populate("committee", "name category");
      return res.json(populated);
    }

    const authorized = await AuthorizedEmail.create({
      email: normalizedEmail,
      role: "chairperson",
      committee: committee._id,
      authorizedBy: req.user._id,
      status: "pending",
    });

    const populated = await AuthorizedEmail.findById(authorized._id).populate("committee", "name category");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to authorize chairperson email", error: err.message });
  }
});

// @route  DELETE /api/users/authorized-chairpersons/:id
// @desc   Admin revokes chairperson pre-authorization
router.delete("/authorized-chairpersons/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const AuthorizedEmail = require("../models/AuthorizedEmail");
    await AuthorizedEmail.findByIdAndDelete(req.params.id);
    res.json({ message: "Authorization removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to revoke authorization", error: err.message });
  }
});

module.exports = router;

