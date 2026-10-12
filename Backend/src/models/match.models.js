import mongoose from "mongoose";

const scoreBreakdownSchema = new mongoose.Schema({}, {
  _id: false,
  strict: false,
});

const matchSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: [true, "Customer profile is required"],
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: [true, "Candidate profile is required"],
    },
    score: {
      type: Number,
      required: [true, "Match score is required"],
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["Suggested", "Sent", "Interested", "Not Interested", "Declined", "Meeting Scheduled", "Closed"],
      default: "Suggested",
    },
    scoreBreakdown: {
      type: scoreBreakdownSchema,
      default: () => ({}),
    },
    reasons: [{ type: String, trim: true }],
    aiExplanation: { type: String, trim: true, maxlength: 3000 },
    sentAt: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Match creator is required"],
    },
  },
  { timestamps: true },
);

matchSchema.pre("validate", function normalizeProfilePair(next) {
  if (this.customer && this.candidate && this.customer.toString() > this.candidate.toString()) {
    const customer = this.customer;
    this.customer = this.candidate;
    this.candidate = customer;
  }
  next();
});

matchSchema.index({ customer: 1, candidate: 1 }, { unique: true });

const Match = mongoose.model("Match", matchSchema);

export { Match };
export default Match;