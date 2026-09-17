const express = require("express");
const Event = require("../models/Event");
const Committee = require("../models/Committee");
const Notice = require("../models/Notice");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Helper to check if user can manage events for this committee
function canManageEvent(user, committee) {
  const commId = String(committee._id || committee);
  if (user.role === "chairperson" || user.role === "coordinator" || user.role === "committee_head") {
    return (
      String(user.assignedCommittee) === commId ||
      String(user.headOf) === commId ||
      String(committee.chairperson) === String(user._id) ||
      (committee.coordinators || []).some((c) => String(c) === String(user._id))
    );
  }
  return false;
}

// Helper to check if user is strictly the Chairperson for this committee
function isStrictChairperson(user, committee) {
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

// @route  GET /api/events
// @desc   Upcoming/past events feed with posters, optional ?committee=id&upcoming=true
router.get("/", protect, async (req, res) => {
  try {
    const { committee, upcoming } = req.query;
    const filter = {};
    if (committee) filter.committee = committee;
    if (upcoming === "true") filter.date = { $gte: new Date() };

    const events = await Event.find(filter)
      .populate("committee", "name logoUrl category chairperson")
      .populate("assignedCoordinator", "name email branch year avatarUrl")
      .populate("notice", "title content attachmentUrl")
      .populate("createdBy", "name role")
      .sort({ date: upcoming === "true" ? 1 : -1 })
      .limit(100);
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch events", error: err.message });
  }
});

// @route  GET /api/events/:id
// @desc   Get single event details with full coordinator, committee, and notice information
router.get("/:id", protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: "committee",
        select: "name logoUrl category chairperson coordinators",
        populate: [
          { path: "chairperson", select: "name email branch year avatarUrl" },
          { path: "coordinators", select: "name email branch year avatarUrl" },
        ],
      })
      .populate("assignedCoordinator", "name email branch year avatarUrl")
      .populate("notice", "title content attachmentUrl createdAt")
      .populate("createdBy", "name role");

    if (!event) return res.status(404).json({ message: "Event not found" });

    // Also look for latest committee notice if no specific notice is linked
    let relatedNotice = event.notice;
    if (!relatedNotice && event.committee) {
      relatedNotice = await Notice.findOne({ committee: event.committee._id }).sort({ createdAt: -1 });
    }

    const eventObj = event.toObject();
    eventObj.relatedNotice = relatedNotice;

    res.json(eventObj);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch event details", error: err.message });
  }
});

// @route  POST /api/events
// @desc   Create event (Chairperson, Coordinator, Admin)
router.post("/", protect, async (req, res) => {
  try {
    const {
      committeeId,
      title,
      description,
      posterUrl,
      date,
      venue,
      registrationLink,
      assignedCoordinator,
      noticeId,
    } = req.body;

    if (req.user.role === "admin" || req.user.role === "faculty_advisor") {
      return res.status(403).json({
        message: "Administrators do not organize or schedule committee events. Event creation is handled by committee chairpersons and coordinators.",
      });
    }

    let targetCommitteeId = committeeId || req.user.assignedCommittee || req.user.headOf;

    if (!targetCommitteeId || !title || !description || !date) {
      return res.status(400).json({ message: "Committee, title, description and date are required" });
    }

    const committee = await Committee.findById(targetCommitteeId);
    if (!committee) return res.status(404).json({ message: "Committee not found" });

    if (!canManageEvent(req.user, committee)) {
      return res.status(403).json({ message: "You are not authorized to create events for this committee" });
    }

    const event = await Event.create({
      committee: targetCommitteeId,
      title,
      description,
      posterUrl: posterUrl || "",
      date,
      venue: venue || "",
      registrationLink: registrationLink || "",
      assignedCoordinator: assignedCoordinator || (req.user.role === "coordinator" ? req.user._id : null),
      notice: noticeId || null,
      createdBy: req.user._id,
    });

    const populated = await Event.findById(event._id)
      .populate("committee", "name logoUrl category")
      .populate("assignedCoordinator", "name email branch year")
      .populate("createdBy", "name");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to create event", error: err.message });
  }
});

// @route  PUT /api/events/:id
// @desc   Update event details (EDITABLE TO CHAIRPERSON ONLY)
router.put("/:id", protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const committee = await Committee.findById(event.committee);
    if (!committee) return res.status(404).json({ message: "Associated committee not found" });

    // Strictly editable to the Chairperson (or Admin) only
    if (!isStrictChairperson(req.user, committee)) {
      return res.status(403).json({
        message: "Forbidden: This event is editable by the committee chairperson only.",
      });
    }

    const editable = [
      "title",
      "description",
      "posterUrl",
      "date",
      "venue",
      "registrationLink",
      "assignedCoordinator",
      "notice",
    ];

    for (const key of editable) {
      if (req.body[key] !== undefined) {
        event[key] = req.body[key] === "" ? null : req.body[key];
      }
    }

    await event.save();

    const updated = await Event.findById(event._id)
      .populate("committee", "name logoUrl category")
      .populate("assignedCoordinator", "name email branch year avatarUrl")
      .populate("notice", "title content attachmentUrl")
      .populate("createdBy", "name role");

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update event", error: err.message });
  }
});

// @route  POST /api/events/:id/participate
// @desc   Student or Member registers/marks participation in an event
router.post("/:id/participate", protect, async (req, res) => {
  try {
    if (req.user.role === "admin" || req.user.role === "faculty_advisor") {
      return res.status(400).json({
        message: "Administrators do not participate in committee events.",
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const alreadyMarked = event.attendance.some(
      (a) => String(a.student) === String(req.user._id)
    );

    if (alreadyMarked) {
      return res.status(409).json({ message: "You are already registered for this event" });
    }

    event.attendance.push({
      student: req.user._id,
      studentName: req.user.name,
      attended: true,
      markedAt: new Date(),
    });

    await event.save();
    res.json({ message: "Successfully registered for event!", attendanceCount: event.attendance.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to participate", error: err.message });
  }
});

// @route  POST /api/events/:id/attendance
// @desc   Coordinator or Chairperson marks attendance
router.post("/:id/attendance", protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("committee");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!canManageEvent(req.user, event.committee)) {
      return res.status(403).json({ message: "Not authorized to mark attendance for this event" });
    }

    const { studentId, studentName, attended } = req.body;
    if (!studentId && !studentName) {
      return res.status(400).json({ message: "studentId or studentName is required" });
    }

    const existingIndex = event.attendance.findIndex(
      (a) => String(a.student) === String(studentId)
    );

    if (existingIndex > -1) {
      event.attendance[existingIndex].attended = attended !== false;
    } else {
      event.attendance.push({
        student: studentId || null,
        studentName: studentName || "Student",
        attended: attended !== false,
        markedAt: new Date(),
      });
    }

    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: "Failed to record attendance", error: err.message });
  }
});

// @route  DELETE /api/events/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("committee");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!isStrictChairperson(req.user, event.committee)) {
      return res.status(403).json({ message: "Forbidden: Events can only be deleted by the chairperson" });
    }

    await event.deleteOne();
    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete event", error: err.message });
  }
});

module.exports = router;
