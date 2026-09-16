const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    committee: { type: mongoose.Schema.Types.ObjectId, ref: "Committee", default: null },
    isInstituteWide: { type: Boolean, default: false },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    attachmentUrl: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notice", noticeSchema);
