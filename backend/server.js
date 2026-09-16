require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const committeeRoutes = require("./routes/committeeRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const eventRoutes = require("./routes/eventRoutes");
const winnerRoutes = require("./routes/winnerRoutes");
const joinRequestRoutes = require("./routes/joinRequestRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const taskRoutes = require("./routes/taskRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const facilityIssueRoutes = require("./routes/facilityIssueRoutes");
const suggestionRoutes = require("./routes/suggestionRoutes");

const app = express();

connectDB();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/committees", committeeRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/winners", winnerRoutes);
app.use("/api/join-requests", joinRequestRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/facility-issues", facilityIssueRoutes);
app.use("/api/suggestions", suggestionRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error", error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`CampusHub API running on port ${PORT}`));
