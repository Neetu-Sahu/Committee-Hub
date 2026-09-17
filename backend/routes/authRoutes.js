const express = require("express");
const User = require("../models/User");
const Committee = require("../models/Committee");
const generateToken = require("../utils/generateToken");

const router = express.Router();

function rolesMatch(selectedRole, accountRole) {
  if (!selectedRole) return true;
  const s = selectedRole.toLowerCase().trim();
  const a = accountRole.toLowerCase().trim();

  if (s === a) return true;
  if (s === "admin" && (a === "admin" || a === "faculty_advisor")) return true;
  if (s === "chairperson" && (a === "chairperson" || a === "committee_head")) return true;
  if ((s === "student" || s === "fresher") && (a === "student" || a === "fresher")) return true;

  return false;
}

// @route  POST /api/auth/register
// @desc   Register a new user with user-selected role (all 5 roles available)
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      enrollmentNo,
      branch,
      year,
      role = "student",
      committeeId,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const validRoles = ["admin", "chairperson", "coordinator", "member", "student", "fresher"];
    const targetRole = validRoles.includes(role) ? role : "student";

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const AuthorizedEmail = require("../models/AuthorizedEmail");
    const authRecord = await AuthorizedEmail.findOne({ email: email.toLowerCase() });

    // Optional future production enforcement toggle
    if (process.env.ENFORCE_ROLE_RESTRICTION === "true") {
      if (targetRole === "admin") {
        const existingAdmin = await User.findOne({ role: "admin" });
        if (existingAdmin) {
          return res.status(403).json({
            message: "System Policy: Only 1 primary System Admin account is permitted on this portal.",
          });
        }
      }
      if (targetRole === "chairperson" && !authRecord) {
        return res.status(403).json({
          message: "Authorization Required: The System Admin must pre-authorize your email ID before you can register as Chairperson.",
        });
      }
    }

    let assignedCommId = null;
    if (["chairperson", "coordinator", "member"].includes(targetRole)) {
      if (committeeId) {
        const committee = await Committee.findById(committeeId);
        if (committee) assignedCommId = committee._id;
      } else if (targetRole === "chairperson" && authRecord?.committee) {
        assignedCommId = authRecord.committee;
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      enrollmentNo,
      branch,
      year: year || 1,
      role: targetRole,
      assignedCommittee: assignedCommId,
      headOf: targetRole === "chairperson" ? assignedCommId : null,
      committees: assignedCommId ? [assignedCommId] : [],
      onboardingComplete: targetRole !== "student" && targetRole !== "fresher",
    });

    if (assignedCommId) {
      if (targetRole === "chairperson") {
        await Committee.findByIdAndUpdate(assignedCommId, {
          chairperson: user._id,
          head: user._id,
          $addToSet: { members: user._id },
        });
      } else if (targetRole === "coordinator") {
        await Committee.findByIdAndUpdate(assignedCommId, {
          $addToSet: { coordinators: user._id, members: user._id },
        });
      } else if (targetRole === "member") {
        await Committee.findByIdAndUpdate(assignedCommId, {
          $addToSet: { members: user._id },
        });
      }
    }

    if (authRecord) {
      authRecord.status = "claimed";
      await authRecord.save();
    }

    const token = generateToken(user._id, user.role);
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// @route  POST /api/auth/login
// @desc   Login verifying email, password, and chosen role
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .populate("assignedCommittee", "name category")
      .populate("headOf", "name category");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Role verification
    if (role && !rolesMatch(role, user.role)) {
      const displayAccountRole = user.role.replace("_", " ").toUpperCase();
      const displaySelectedRole = role.replace("_", " ").toUpperCase();
      return res.status(403).json({
        message: `Role mismatch: This account is registered as ${displayAccountRole}, but you selected ${displaySelectedRole}. Please select your registered role.`,
      });
    }

    const token = generateToken(user._id, user.role);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

module.exports = router;
