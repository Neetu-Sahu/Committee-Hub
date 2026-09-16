const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    enrollmentNo: { type: String, trim: true },
    branch: { type: String, trim: true },
    year: { type: Number },

    role: {
      type: String,
      enum: [
        "admin",
        "chairperson",
        "coordinator",
        "member",
        "student",
        "fresher",
        "committee_head",
        "faculty_advisor",
      ],
      default: "student",
    },

    // Interests/skills captured at onboarding (freshers/students) - drives recommendations & admin new committee formation
    interests: [{ type: String, trim: true, lowercase: true }],
    skills: [{ type: String, trim: true, lowercase: true }],
    onboardingComplete: { type: Boolean, default: false },

    // Primary committee assignment for chairperson, coordinator, member
    assignedCommittee: { type: mongoose.Schema.Types.ObjectId, ref: "Committee", default: null },

    // Committees this user is a member of
    committees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Committee" }],

    // Legacy headOf pointer
    headOf: { type: mongoose.Schema.Types.ObjectId, ref: "Committee", default: null },

    avatarUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
