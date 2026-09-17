const express = require("express");
const User = require("../models/User");
const Committee = require("../models/Committee");
const JoinRequest = require("../models/JoinRequest");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// @route  GET /api/analytics/overview
// @desc   Basic counts for the admin dashboard
router.get("/overview", protect, authorize("admin", "faculty_advisor"), async (req, res) => {
  const [userCount, committeeCount, freshersPendingOnboarding] = await Promise.all([
    User.countDocuments(),
    Committee.countDocuments({ status: "active" }),
    User.countDocuments({ role: "fresher", onboardingComplete: false }),
  ]);
  res.json({ userCount, committeeCount, freshersPendingOnboarding });
});

// @route  GET /api/analytics/interest-gap
// @desc   THE KEY FEATURE: aggregates every student's interest tags, compares
//         against tags already covered by existing active committees, and
//         surfaces interest tags with high student demand but weak/no
//         committee coverage - i.e. candidates for forming a NEW committee.
router.get("/interest-gap", protect, authorize("admin", "faculty_advisor"), async (req, res) => {
  try {
    // 1. Count how many students hold each interest tag
    const interestCounts = await User.aggregate([
      { $match: { interests: { $exists: true, $ne: [] } } },
      { $unwind: "$interests" },
      { $group: { _id: "$interests", studentCount: { $sum: 1 } } },
      { $sort: { studentCount: -1 } },
    ]);

    // 2. Count how many active committees already cover each tag
    const committees = await Committee.find({ status: "active" }).select("tags members");
    const tagCommitteeCoverage = {}; // tag -> { committeeCount, totalMembers }
    for (const c of committees) {
      for (const tag of c.tags || []) {
        if (!tagCommitteeCoverage[tag]) {
          tagCommitteeCoverage[tag] = { committeeCount: 0, totalMembers: 0 };
        }
        tagCommitteeCoverage[tag].committeeCount += 1;
        tagCommitteeCoverage[tag].totalMembers += c.members.length;
      }
    }

    // 3. Build the gap report
    const gapReport = interestCounts.map((row) => {
      const tag = row._id;
      const coverage = tagCommitteeCoverage[tag] || { committeeCount: 0, totalMembers: 0 };
      // Demand-to-coverage ratio: high studentCount with 0-1 committees = strong signal
      const gapScore = row.studentCount / (coverage.committeeCount + 1);
      return {
        tag,
        studentCount: row.studentCount,
        existingCommittees: coverage.committeeCount,
        gapScore: Math.round(gapScore * 10) / 10,
        suggestion:
          coverage.committeeCount === 0
            ? "No committee currently covers this interest - strong candidate for a new committee."
            : coverage.committeeCount === 1 && row.studentCount > coverage.totalMembers * 1.5
            ? "One committee exists but demand far exceeds its membership - consider expanding it or forming a second."
            : "Reasonably covered by existing committees.",
      };
    });

    gapReport.sort((a, b) => b.gapScore - a.gapScore);

    res.json({
      generatedAt: new Date(),
      totalStudentsSurveyed: await User.countDocuments({ interests: { $exists: true, $ne: [] } }),
      gaps: gapReport,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to compute interest gap", error: err.message });
  }
});

// @route  GET /api/analytics/pending-join-requests
router.get(
  "/pending-join-requests",
  protect,
  authorize("admin", "faculty_advisor"),
  async (req, res) => {
    const count = await JoinRequest.countDocuments({ status: "pending" });
    res.json({ pendingCount: count });
  }
);

module.exports = router;
