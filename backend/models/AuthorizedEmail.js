const mongoose = require("mongoose");

const authorizedEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["chairperson", "admin"],
      default: "chairperson",
    },
    committee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Committee",
      required: function () {
        return this.role === "chairperson";
      },
    },
    authorizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["pending", "claimed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuthorizedEmail", authorizedEmailSchema);
