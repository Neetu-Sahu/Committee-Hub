const mongoose = require("mongoose");

const committeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      enum: [
        "technical",
        "cultural",
        "sports",
        "literary",
        "social",
        "research",
        "placement",
        "anti-ragging",
        "other",
      ],
      default: "other",
    },
    description: { type: String, required: true },
    logoUrl: { type: String, default: "" },

    // Tags used for interest-matching against user.interests/skills
    tags: [{ type: String, trim: true, lowercase: true }],

    chairperson: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    coordinators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    head: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    facultyAdvisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    status: { type: String, enum: ["active", "proposed", "archived"], default: "active" },
  },
  { timestamps: true }
);

committeeSchema.index({ name: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Committee", committeeSchema);
